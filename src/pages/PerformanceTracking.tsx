import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Activity, Loader2 } from "lucide-react";
import { SuccessKPIs } from "@/components/risk/SuccessKPIs";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, ScatterChart, Scatter, ZAxis, Legend } from "recharts";

export default function PerformanceTracking() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any[]>([]);

  useEffect(() => { (async () => {
    setLoading(true);
    const { data: ints } = await supabase.from("interventions").select("id, faculty_id, status, student_id, created_at");
    const facultyIds = Array.from(new Set((ints || []).map((i: any) => i.faculty_id).filter(Boolean)));
    const { data: profs } = await supabase.from("profiles").select("id, name, email").in("id", facultyIds);
    const pMap = new Map((profs || []).map((p: any) => [p.id, p]));
    const { data: outcomes } = await supabase.from("intervention_outcomes").select("intervention_id, risk_score_delta");
    const oMap = new Map<string, number[]>();
    (outcomes || []).forEach((o: any) => {
      const arr = oMap.get(o.intervention_id) || [];
      if (o.risk_score_delta !== null) arr.push(Number(o.risk_score_delta));
      oMap.set(o.intervention_id, arr);
    });
    const grouped = new Map<string, any>();
    (ints || []).forEach((i: any) => {
      if (!i.faculty_id) return;
      if (!grouped.has(i.faculty_id)) grouped.set(i.faculty_id, { faculty_id: i.faculty_id, total: 0, open: 0, closed: 0, students: new Set(), improvements: [] });
      const g = grouped.get(i.faculty_id);
      g.total++;
      if (i.status === "OPEN") g.open++; else g.closed++;
      g.students.add(i.student_id);
      const deltas = oMap.get(i.id) || [];
      g.improvements.push(...deltas);
    });
    const rows = Array.from(grouped.values()).map((g) => {
      const avgDelta = g.improvements.length ? g.improvements.reduce((a: number, b: number) => a + b, 0) / g.improvements.length : 0;
      const improvedCount = g.improvements.filter((d: number) => d < 0).length;
      const successRate = g.improvements.length ? Math.round((improvedCount / g.improvements.length) * 100) : 0;
      return {
        faculty: pMap.get(g.faculty_id),
        name: (pMap.get(g.faculty_id) as any)?.name?.split(" ")[0] || "Unknown",
        total: g.total, open: g.open, closed: g.closed,
        students: g.students.size,
        improvement: Math.round(-avgDelta),
        successRate,
      };
    }).sort((a, b) => b.total - a.total);
    setStats(rows);
    setLoading(false);
  })(); }, []);

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Activity className="h-6 w-6 text-primary" />Performance Tracking</h1>
        <p className="text-sm text-muted-foreground">Faculty workload and intervention effectiveness.</p>
      </div>

      <div className="mb-4"><SuccessKPIs /></div>

      {loading ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        : !stats.length ? <Card><CardContent className="py-10 text-center text-muted-foreground">No interventions logged yet.</CardContent></Card>
        : (<div className="grid lg:grid-cols-2 gap-4 mb-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Interventions per Faculty</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={stats.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="open" stackId="a" fill="hsl(45 93% 50%)" name="Open" />
                    <Bar dataKey="closed" stackId="a" fill="hsl(142 76% 40%)" name="Closed" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Workload vs Success</CardTitle><CardDescription>X: interventions, Y: success rate %</CardDescription></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis type="number" dataKey="total" name="Interventions" tick={{ fontSize: 11 }} />
                    <YAxis type="number" dataKey="successRate" name="Success %" domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <ZAxis dataKey="name" />
                    <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                    <Scatter data={stats} fill="hsl(var(--primary))" />
                  </ScatterChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>)}

      <Card><CardHeader><CardTitle className="text-base">Faculty Workload Detail</CardTitle></CardHeader>
        <CardContent>
          {loading ? null : !stats.length ? null
            : <div className="overflow-x-auto"><Table>
              <TableHeader><TableRow>
                <TableHead>Faculty</TableHead><TableHead>Students</TableHead><TableHead>Interventions</TableHead>
                <TableHead>Open</TableHead><TableHead>Closed</TableHead><TableHead>Success %</TableHead><TableHead>Avg Improvement</TableHead>
              </TableRow></TableHeader>
              <TableBody>{stats.map((r) => (
                <TableRow key={r.faculty?.id}>
                  <TableCell><div className="font-medium">{r.faculty?.name || "Unknown"}</div><div className="text-xs text-muted-foreground">{r.faculty?.email}</div></TableCell>
                  <TableCell>{r.students}</TableCell>
                  <TableCell className="font-semibold">{r.total}</TableCell>
                  <TableCell><Badge variant="secondary">{r.open}</Badge></TableCell>
                  <TableCell><Badge variant="outline">{r.closed}</Badge></TableCell>
                  <TableCell><Badge variant={r.successRate >= 50 ? "default" : "secondary"}>{r.successRate}%</Badge></TableCell>
                  <TableCell><Badge variant={r.improvement > 0 ? "default" : "secondary"}>{r.improvement > 0 ? "+" : ""}{r.improvement} pts</Badge></TableCell>
                </TableRow>
              ))}</TableBody>
            </Table></div>}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
