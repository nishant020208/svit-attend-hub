import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get all parent-student relations
    const { data: relations, error: relError } = await supabase
      .from("parent_student_relation")
      .select("parent_id, student_id, students:student_id(id, user_id, course, section, year)");

    if (relError) throw relError;

    const alerts: any[] = [];

    for (const rel of relations || []) {
      const student = (rel as any).students;
      if (!student) continue;

      // Check attendance (below 75%)
      const { data: attendance } = await supabase
        .from("attendance")
        .select("status")
        .eq("student_id", student.id);

      if (attendance && attendance.length > 0) {
        const present = attendance.filter(a => a.status === "PRESENT" || a.status === "LATE").length;
        const percentage = Math.round((present / attendance.length) * 100);
        if (percentage < 75) {
          alerts.push({
            parent_id: rel.parent_id,
            student_id: student.id,
            alert_type: "attendance_drop",
            message: `Your child's attendance has dropped to ${percentage}%. Please ensure regular attendance.`,
          });
        }
      }

      // Check recent low exam scores
      const { data: results } = await supabase
        .from("results")
        .select("marks_obtained, max_marks, percentage, exams:exam_id(name)")
        .eq("student_id", student.id)
        .order("created_at", { ascending: false })
        .limit(5);

      for (const result of results || []) {
        if (result.percentage !== null && result.percentage < 35) {
          alerts.push({
            parent_id: rel.parent_id,
            student_id: student.id,
            alert_type: "low_score",
            message: `Your child scored ${result.marks_obtained}/${result.max_marks} (${result.percentage}%) in ${(result as any).exams?.name || "an exam"}. Additional support may be needed.`,
          });
        }
      }

      // Check achievements (high scores)
      for (const result of results || []) {
        if (result.percentage !== null && result.percentage >= 90) {
          alerts.push({
            parent_id: rel.parent_id,
            student_id: student.id,
            alert_type: "achievement",
            message: `Congratulations! Your child scored ${result.marks_obtained}/${result.max_marks} (${result.percentage}%) in ${(result as any).exams?.name || "an exam"}. Great achievement!`,
          });
        }
      }
    }

    // Insert alerts and create notifications
    if (alerts.length > 0) {
      await supabase.from("parent_alerts").insert(alerts);

      // Also create notifications for parents
      const notifications = alerts.map(a => ({
        user_id: a.parent_id,
        title: a.alert_type === "achievement" ? "🏆 Student Achievement" :
               a.alert_type === "attendance_drop" ? "⚠️ Attendance Alert" : "📉 Performance Alert",
        message: a.message,
        type: a.alert_type === "achievement" ? "success" : "warning",
        priority: a.alert_type === "achievement" ? "normal" : "high",
      }));

      await supabase.from("notifications").insert(notifications);
    }

    return new Response(JSON.stringify({ success: true, alertsSent: alerts.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Parent notifications error:", error);
    const msg = error instanceof Error ? error.message : "An error occurred";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
