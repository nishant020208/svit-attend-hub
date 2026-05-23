import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heatmap } from "@/components/risk/Heatmap";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Grid3x3 } from "lucide-react";

export default function SubjectAnalytics() {
  const [loading, setLoading] = useState(true);
  const [snaps, setSnaps] = useState<any[]>([]);
  const [students, setStudents] = useState<Map<string, any>>(new Map());

  useEffect(() => { (async () => {
    setLoading(true);
    const { data } = await supabase.from("subject_performance_snapshots").select("*").order("computed_at", { ascending: false });
    setSnaps(data || []);
    const ids = Array.from(new Set((data || []).map((s: any) => s.student_id)));
    if (ids.length) {
      const { data: stu } = await supabase.from("students").select("id, roll_number, course, year, section").in("id", ids);
      setStudents(new Map((stu || []).map((s: any) => [s.id, s])));
    }
    setLoading(false);
  })(); }, []);

  const { cells, rows, cols } = useMemo(() => {
    // newest per (student, subject)
    const latest = new Map<string, any>();
    snaps.forEach((s) => {
      const k = `${s.student_id}|${s.subject}`;
      if (!latest.has(k)) latest.set(k, s);
    });
    const subjectsSet = new Set<string>();
    const rowSet = new Set<string>();
    const cells: any[] = [];
    latest.forEach((s) => {
      const stu = students.get(s.student_id);
      if (!stu) return;
      const rowLabel = stu.roll_number || s.student_id.slice(0, 6);
      subjectsSet.add(s.subject);
      rowSet.add(rowLabel);
      const marks = Number(s.avg_marks ?? 0);
      // convert marks → risk (lower marks = higher risk)
      const risk = Math.max(0, Math.min(100, Math.round(100 - marks)));
      cells.push({ row: rowLabel, col: s.subject, value: risk });
    });
    return { cells, rows: Array.from(rowSet).sort().slice(0, 40), cols: Array.from(subjectsSet).sort() };
  }, [snaps, students]);

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Grid3x3 className="h-6 w-6 text-primary" />Subject Analytics</h1>
        <p className="text-sm text-muted-foreground">Risk heatmap by student × subject (risk = 100 − avg marks).</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Subject Risk Heatmap</CardTitle><CardDescription>Showing up to 40 students. Darker = more risk.</CardDescription></CardHeader>
        <CardContent>
          {loading ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            : !cells.length ? <p className="text-center text-muted-foreground py-10">No subject snapshots yet. Run Recompute on Risk Analytics.</p>
            : <Heatmap cells={cells} rows={rows} cols={cols} />}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
