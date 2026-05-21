// Compute risk scores for all students (or a single student)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Factors = {
  attendance: number;       // 0..1 (1 = perfect, 0 = none)
  marks: number;            // 0..1
  assignments: number;      // 0..1
  trend: number;            // 0..1 (1 = improving, 0 = sharp decline)
  lateSubs: number;         // 0..1
  leaveFreq: number;        // 0..1
};

const WEIGHTS = {
  attendance: 0.35,
  marks: 0.25,
  assignments: 0.20,
  trend: 0.10,
  lateSubs: 0.05,
  leaveFreq: 0.05,
};

function levelFor(score: number): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
  if (score >= 75) return "CRITICAL";
  if (score >= 55) return "HIGH";
  if (score >= 30) return "MEDIUM";
  return "LOW";
}

function buildReasons(f: Factors, ctx: any): string[] {
  const r: string[] = [];
  if (ctx.attPct < 60) r.push(`Attendance below 60% (currently ${ctx.attPct}%)`);
  else if (ctx.attPct < 75) r.push(`Attendance below 75% (currently ${ctx.attPct}%)`);
  if (ctx.avgMarks !== null && ctx.avgMarks < 40) r.push(`Average marks below 40% (${ctx.avgMarks}%)`);
  else if (ctx.avgMarks !== null && ctx.avgMarks < 55) r.push(`Below-average marks (${ctx.avgMarks}%)`);
  if (ctx.missingHw > 0) r.push(`${ctx.missingHw} missing assignment${ctx.missingHw > 1 ? "s" : ""}`);
  if (ctx.declining) r.push(`Declining performance trend across recent exams`);
  if (ctx.weakSubjects?.length) r.push(`Weak in: ${ctx.weakSubjects.slice(0, 3).join(", ")}`);
  if (ctx.leaveCount > 5) r.push(`High leave frequency (${ctx.leaveCount} requests)`);
  if (r.length === 0) r.push("Performing within expected range");
  return r;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(url, serviceKey);

    let studentIds: string[] | null = null;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body?.studentId) studentIds = [body.studentId];
        else if (Array.isArray(body?.studentIds)) studentIds = body.studentIds;
      } catch { /* ignore */ }
    }

    let studentsQuery = supabase.from("students").select("id, course, section, year");
    if (studentIds) studentsQuery = studentsQuery.in("id", studentIds);
    const { data: students, error: stuErr } = await studentsQuery;
    if (stuErr) throw stuErr;

    const results: any[] = [];
    const today = new Date().toISOString().split("T")[0];

    for (const stu of students || []) {
      // Attendance (last 90 days)
      const since = new Date();
      since.setDate(since.getDate() - 90);
      const { data: att } = await supabase
        .from("attendance")
        .select("status, subject, date")
        .eq("student_id", stu.id)
        .gte("date", since.toISOString().split("T")[0]);

      const totalAtt = att?.length || 0;
      const presentAtt = att?.filter(a => a.status === "PRESENT").length || 0;
      const attPct = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : 100;

      // Results (last 10)
      const { data: results_ } = await supabase
        .from("results")
        .select("percentage, exams:exam_id(subject, exam_date)")
        .eq("student_id", stu.id)
        .order("created_at", { ascending: false })
        .limit(10);

      const pcts = (results_ || []).map((r: any) => Number(r.percentage)).filter(n => !isNaN(n));
      const avgMarks = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null;
      const declining = pcts.length >= 3 && pcts[0] < pcts[pcts.length - 1] - 10;

      // Subject weakness
      const subjAvg: Record<string, number[]> = {};
      (results_ || []).forEach((r: any) => {
        const s = r.exams?.subject;
        if (s && r.percentage != null) {
          subjAvg[s] = subjAvg[s] || [];
          subjAvg[s].push(Number(r.percentage));
        }
      });
      const weakSubjects = Object.entries(subjAvg)
        .map(([s, arr]) => ({ s, avg: arr.reduce((a, b) => a + b, 0) / arr.length }))
        .filter(x => x.avg < 50)
        .sort((a, b) => a.avg - b.avg)
        .map(x => x.s);

      // Homework
      const { data: hw } = await supabase
        .from("homework")
        .select("id")
        .eq("course", stu.course)
        .eq("section", stu.section)
        .eq("year", stu.year);
      const { data: subs } = await supabase
        .from("homework_submissions")
        .select("homework_id, status")
        .eq("student_id", stu.id);
      const totalHw = hw?.length || 0;
      const submittedHw = subs?.length || 0;
      const missingHw = Math.max(0, totalHw - submittedHw);
      const completionRate = totalHw > 0 ? submittedHw / totalHw : 1;

      // Leaves
      const { data: leaves } = await supabase
        .from("leave_requests")
        .select("id")
        .eq("student_id", stu.id);
      const leaveCount = leaves?.length || 0;

      // Build factors (0..1, where higher = better)
      const factors: Factors = {
        attendance: Math.min(1, attPct / 100),
        marks: avgMarks !== null ? Math.min(1, avgMarks / 100) : 0.7,
        assignments: completionRate,
        trend: declining ? 0.2 : 0.8,
        lateSubs: 0.8, // placeholder until late tracking exists
        leaveFreq: Math.max(0, 1 - leaveCount / 10),
      };

      // Risk score: higher = more risk. Invert positive factors.
      const score = Math.round(
        ((1 - factors.attendance) * WEIGHTS.attendance +
          (1 - factors.marks) * WEIGHTS.marks +
          (1 - factors.assignments) * WEIGHTS.assignments +
          (1 - factors.trend) * WEIGHTS.trend +
          (1 - factors.lateSubs) * WEIGHTS.lateSubs +
          (1 - factors.leaveFreq) * WEIGHTS.leaveFreq) * 100
      );
      const level = levelFor(score);
      const reasons = buildReasons(factors, { attPct, avgMarks, missingHw, declining, weakSubjects, leaveCount });

      // Upsert current
      await supabase
        .from("risk_scores")
        .upsert(
          {
            student_id: stu.id,
            score,
            level,
            factors,
            reasons,
            computed_at: new Date().toISOString(),
          },
          { onConflict: "student_id" }
        );

      // Append history (one per day per student)
      await supabase.from("risk_factors_history").insert({
        student_id: stu.id,
        score,
        level,
        factors,
        snapshot_date: today,
      });

      // Subject snapshots
      for (const [s, arr] of Object.entries(subjAvg)) {
        const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
        const trend = avg < 40 ? "declining" : avg > 70 ? "improving" : "flat";
        await supabase.from("subject_performance_snapshots").insert({
          student_id: stu.id,
          subject: s,
          avg_marks: Math.round(avg),
          completion_rate: completionRate,
          trend,
        });
      }

      results.push({ student_id: stu.id, score, level, reasons });
    }

    return new Response(
      JSON.stringify({ ok: true, count: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("compute-risk-scores error", e);
    return new Response(
      JSON.stringify({ error: String((e as any)?.message ?? e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
