// Generate risk alerts + notifications based on current risk_scores
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: scores } = await supa
      .from("risk_scores")
      .select("student_id, score, level, reasons, factors")
      .in("level", ["HIGH", "CRITICAL"]);

    let alertsCreated = 0;
    let notifsCreated = 0;

    for (const s of scores || []) {
      const { data: stu } = await supa
        .from("students")
        .select("id, user_id, roll_number, course")
        .eq("id", s.student_id)
        .single();
      if (!stu) continue;

      const { data: parents } = await supa
        .from("parent_student_relation")
        .select("parent_id")
        .eq("student_id", s.student_id);

      const recipients = [
        stu.user_id,
        ...(parents || []).map((p: any) => p.parent_id),
      ].filter(Boolean);

      const severity = s.level === "CRITICAL" ? "CRITICAL" : "HIGH";
      const message = `${stu.roll_number}: ${s.level} risk (score ${s.score}). ${(s.reasons || []).slice(0, 2).join("; ")}`;

      // Skip if a recent alert (24h) for same student & level exists
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: recent } = await supa
        .from("risk_alerts")
        .select("id")
        .eq("student_id", s.student_id)
        .eq("severity", severity)
        .gte("created_at", since)
        .limit(1);
      if (recent && recent.length > 0) continue;

      await supa.from("risk_alerts").insert({
        student_id: s.student_id,
        alert_type: "RISK_LEVEL",
        severity,
        message,
        recipients,
        triggered_by: "rule:risk-engine",
      });
      alertsCreated++;

      // Push notifications to student + parents
      for (const uid of recipients) {
        await supa.from("notifications").insert({
          user_id: uid,
          title: `Academic Risk Alert: ${s.level}`,
          message,
          type: "warning",
          priority: severity === "CRITICAL" ? "high" : "normal",
          action_url: `/risk/student?id=${s.student_id}`,
        });
        notifsCreated++;
      }
    }

    return new Response(
      JSON.stringify({ ok: true, alertsCreated, notifsCreated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as any)?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
