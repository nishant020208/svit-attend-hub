// AI mentor recommendations + 2-week risk prediction (plain text)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
      supa.from("risk_factors_history").select("score, level, snapshot_date").eq("student_id", studentId).order("snapshot_date", { ascending: false }).limit(14),
      supa.from("interventions").select("intervention_type, action_taken, status, created_at").eq("student_id", studentId).order("created_at", { ascending: false }).limit(5),
      supa.from("students").select("id, roll_number, course, year, section, user_id").eq("id", studentId).single(),
    ]);

    const current = rs?.[0];
    const prompt = `You are an academic mentor advisor. Provide a short plain-text recommendation (no JSON, no markdown headings). 

Student: ${stu?.roll_number || "—"} (${stu?.course} Y${stu?.year} ${stu?.section})
Current risk: ${current?.level || "UNKNOWN"} (score ${current?.score ?? "—"}/100)
Top reasons: ${(current?.reasons || []).join("; ")}
Recent risk trend (newest first): ${(hist || []).map((h: any) => `${h.snapshot_date}:${h.score}`).join(", ") || "no history"}
Recent interventions: ${(ints || []).map((i: any) => `${i.intervention_type}(${i.status})`).join(", ") || "none"}

Write:
1) A 3-4 sentence diagnosis in plain language.
2) Three concrete intervention suggestions as a short numbered list (one short sentence each).
3) A one-line 2-week prediction starting with "Outlook:" describing likely direction (improving / stable / declining) and rough reason.

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

    return new Response(JSON.stringify({ ok: true, recommendation: text, current, history: hist || [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as any)?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
