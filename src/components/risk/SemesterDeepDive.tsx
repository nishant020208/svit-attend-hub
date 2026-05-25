import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from "recharts";
import { Loader2, CalendarRange } from "lucide-react";

const PALETTE = [
  "hsl(var(--primary))",
  "hsl(0 84% 60%)",
  "hsl(45 93% 50%)",
  "hsl(142 76% 40%)",
  "hsl(217 91% 60%)",
  "hsl(280 65% 60%)",
  "hsl(25 95% 53%)",
  "hsl(180 65% 45%)",
];

export function SemesterDeepDive() {
  const [loading, setLoading] = useState(true);
  const [riskHistory, setRiskHistory] = useState<any[]>([]);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [studentsMap, setStudentsMap] = useState<Map<string, any>>(new Map());
  const [view, setView] = useState<"course" | "subject">("course");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - 180 * 24 * 3600 * 1000).toISOString().slice(0, 10);
      const [{ data: rfh }, { data: sps }] = await Promise.all([
        supabase.from("risk_factors_history").select("snapshot_date, score, student_id").gte("snapshot_date", since).order("snapshot_date"),
        supabase.from("subject_performance_snapshots").select("subject, avg_marks, computed_at, student_id").gte("computed_at", new Date(Date.now() - 180 * 24 * 3600 * 1000).toISOString()),
      ]);
      const ids = Array.from(new Set([...(rfh || []).map((r: any) => r.student_id), ...(sps || []).map((r: any) => r.student_id)]));
      const { data: stu } = await supabase.from("students").select("id, course, year").in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
      setStudentsMap(new Map((stu || []).map((s: any) => [s.id, s])));
      setRiskHistory(rfh || []);
      setSnapshots(sps || []);
      setLoading(false);
    })();
  }, []);

  // Course time-series: per month avg risk score per course
  const byCourse = useMemo(() => {
    const series = new Map<string, Map<string, { sum: number; n: number }>>();
    const months = new Set<string>();
    riskHistory.forEach((r: any) => {
      const stu = studentsMap.get(r.student_id);
      if (!stu) return;
      const course = stu.course || "—";
      const m = (r.snapshot_date as string).slice(0, 7);
      months.add(m);
      if (!series.has(course)) series.set(course, new Map());
      const cur = series.get(course)!.get(m) || { sum: 0, n: 0 };
      cur.sum += Number(r.score); cur.n++;
      series.get(course)!.set(m, cur);
    });
    const sortedMonths = Array.from(months).sort();
    const data = sortedMonths.map((m) => {
      const row: any = { period: m };
      series.forEach((monMap, course) => {
        const v = monMap.get(m);
        row[course] = v ? Math.round(v.sum / v.n) : null;
      });
      return row;
    });
    return { data, keys: Array.from(series.keys()) };
  }, [riskHistory, studentsMap]);

  // Subject time-series: 100 - avg_marks per month per subject
  const bySubject = useMemo(() => {
    const series = new Map<string, Map<string, { sum: number; n: number }>>();
    const months = new Set<string>();
    snapshots.forEach((r: any) => {
      const subj = r.subject || "—";
      const m = (r.computed_at as string).slice(0, 7);
      months.add(m);
      if (!series.has(subj)) series.set(subj, new Map());
      const cur = series.get(subj)!.get(m) || { sum: 0, n: 0 };
      cur.sum += Math.max(0, 100 - Number(r.avg_marks || 0)); cur.n++;
      series.get(subj)!.set(m, cur);
    });
    const sortedMonths = Array.from(months).sort();
    const data = sortedMonths.map((m) => {
      const row: any = { period: m };
      series.forEach((monMap, subj) => {
        const v = monMap.get(m);
        row[subj] = v ? Math.round(v.sum / v.n) : null;
      });
      return row;
    });
    return { data, keys: Array.from(series.keys()).slice(0, 8) };
  }, [snapshots]);

  const active = view === "course" ? byCourse : bySubject;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base text-foreground flex items-center gap-2">
              <CalendarRange className="h-5 w-5 text-primary" />
              Semester Deep-Dive
            </CardTitle>
            <CardDescription>Monthly risk trajectory by {view}</CardDescription>
          </div>
          <Select value={view} onValueChange={(v) => setView(v as any)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="course">By Course</SelectItem>
              <SelectItem value="subject">By Subject (risk)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : active.data.length === 0 || active.keys.length === 0 ? (
          <p className="text-center py-10 text-muted-foreground text-sm">No historical data yet — recompute risk scores to start tracking trends.</p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={active.data}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              {active.keys.map((k, i) => (
                <Line key={k} dataKey={k} stroke={PALETTE[i % PALETTE.length]} strokeWidth={2} dot={false} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
