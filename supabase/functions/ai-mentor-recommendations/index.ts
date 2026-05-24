// AI mentor recommendations + 2-week risk prediction with confidence
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Linear regression slope on score series (oldest → newest)
function trendSlope(scores: number[]): number {
  const n = scores.length;
  if (n < 2) return 0;
  const xs = scores.map((_, i) => i);
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = scores.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (scores[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

function variance(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = arr.reduce((a, b) => a + b, 0) / arr.length;
  return arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { studentId } = await req.json();
    if (!studentId) {
      return new Response(JSON.stringify({ error: "studentId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const [{ data: rs }, { data: hist }, { data: ints }, { data: stu }] = await Promise.all([
      supa.from("risk_scores").select("*").eq("student_id", studentId).order("computed_at", { ascending: false }).limit(1),
      supa.from("risk_factors_history").select("score, level, snapshot_date").eq("student_id", studentId).order("snapshot_date", { ascending: true }).limit(30),
      supa.from("interventions").select("intervention_type, action_taken, status, created_at").eq("student_id", studentId).order("created_at", { ascending: false }).limit(5),
      supa.from("students").select("id, roll_number, course, year, section, user_id").eq("id", studentId).single(),
    ]);

    const current = rs?.[0];
    const series = (hist || []).map((h: any) => Number(h.score));
    const slope = trendSlope(series); // negative = improving (score down), positive = declining
    const projected2w = Math.max(0, Math.min(100, (current?.score ?? 0) + slope * 14));

    // Outlook direction (risk goes down = student improving)
    let outlookDirection: "improving" | "stable" | "declining" = "stable";
    if (slope < -0.5) outlookDirection = "improving";
    else if (slope > 0.5) outlookDirection = "declining";

    // Confidence: more history + lower variance → higher confidence
    const v = variance(series);
    const lengthFactor = Math.min(1, series.length / 14);
    const stabilityFactor = Math.max(0, 1 - Math.min(1, v / 400)); // var 400 → 0
    const confidence = Math.round(40 + 60 * (0.5 * lengthFactor + 0.5 * stabilityFactor));

    const prompt = `You are an academic mentor advisor. Provide a short plain-text recommendation (no JSON, no markdown headings).

Student: ${stu?.roll_number || "—"} (${stu?.course} Y${stu?.year} ${stu?.section})
Current risk: ${current?.level || "UNKNOWN"} (score ${current?.score ?? "—"}/100)
Top reasons: ${(current?.reasons || []).join("; ")}
Risk trend (oldest→newest): ${series.join(", ") || "no history"}
Computed outlook: ${outlookDirection} (projected score in 2 weeks: ${Math.round(projected2w)})
Recent interventions: ${(ints || []).map((i: any) => `${i.intervention_type}(${i.status})`).join(", ") || "none"}

Write:
1) A 3-4 sentence diagnosis in plain language.
2) Three concrete intervention suggestions as a short numbered list (one short sentence each).
3) A one-line 2-week prediction starting with "Outlook:" matching the computed direction (${outlookDirection}), explaining why briefly.

Keep total under 180 words. Plain text only.`;

    const apiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a concise academic mentor. Respond in plain text only." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      return new Response(JSON.stringify({ error: `AI error: ${t}` }), {
        status: aiRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    const text = aiData?.choices?.[0]?.message?.content || "No recommendations available.";

    return new Response(JSON.stringify({
      ok: true,
      recommendation: text,
      current,
      history: hist || [],
      prediction: {
        outlookDirection,
        projectedScore: Math.round(projected2w),
        confidence,
        slopePerDay: Number(slope.toFixed(3)),
        samples: series.length,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as any)?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
