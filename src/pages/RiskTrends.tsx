import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { TrendingUp, Loader2 } from "lucide-react";
import { SuccessKPIs } from "@/components/risk/SuccessKPIs";

export default function RiskTrends() {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [factorAvgs, setFactorAvgs] = useState<any[]>([]);

  useEffect(() => { (async () => {
    setLoading(true);
    const { data } = await supabase.from("risk_factors_history")
      .select("snapshot_date, level, score, factors")
      .gte("snapshot_date", new Date(Date.now() - 180 * 24 * 3600 * 1000).toISOString().slice(0, 10))
      .order("snapshot_date");
    setHistory(data || []);
    const recent = (data || []).slice(-200);
    const sums: Record<string, { sum: number; n: number }> = {};
    recent.forEach((h: any) => {
      const f = h.factors || {};
      Object.keys(f).forEach((k) => {
        const v = Number(f[k]);
        if (isNaN(v)) return;
        if (!sums[k]) sums[k] = { sum: 0, n: 0 };
        sums[k].sum += v; sums[k].n++;
      });
    });
    setFactorAvgs(Object.entries(sums).map(([factor, s]) => ({ factor, value: Math.round(s.sum / s.n) })));
    setLoading(false);
  })(); }, []);

  const byDate = useMemo(() => {
    const map = new Map<string, any>();
    history.forEach((h: any) => {
      const d = h.snapshot_date;
      if (!map.has(d)) map.set(d, { date: d, LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0, avg: 0, n: 0 });
      const o = map.get(d);
      o[h.level]++;
      o.avg += Number(h.score);
      o.n++;
    });
    return Array.from(map.values()).map((o) => ({ ...o, avg: o.n ? Math.round(o.avg / o.n) : 0 })).sort((a, b) => a.date.localeCompare(b.date));
  }, [history]);

  // week-over-week
  const weekly = useMemo(() => {
    const buckets = new Map<string, { week: string; avg: number; n: number; high: number }>();
    history.forEach((h: any) => {
      const d = new Date(h.snapshot_date);
      const y = d.getUTCFullYear();
      const w = Math.ceil(((d.getTime() - Date.UTC(y, 0, 1)) / 86400000 + new Date(Date.UTC(y, 0, 1)).getUTCDay() + 1) / 7);
      const key = `W${w}`;
      if (!buckets.has(key)) buckets.set(key, { week: key, avg: 0, n: 0, high: 0 });
      const b = buckets.get(key)!;
      b.avg += Number(h.score); b.n++;
      if (h.level === "HIGH" || h.level === "CRITICAL") b.high++;
    });
    return Array.from(buckets.values()).map((b) => ({ ...b, avg: b.n ? Math.round(b.avg / b.n) : 0 })).slice(-8);
  }, [history]);

  const semester = useMemo(() => {
    const map = new Map<string, { period: string; avg: number; n: number; high: number }>();
    history.forEach((h: any) => {
      const d = new Date(h.snapshot_date);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      if (!map.has(key)) map.set(key, { period: key, avg: 0, n: 0, high: 0 });
      const b = map.get(key)!;
      b.avg += Number(h.score); b.n++;
      if (h.level === "HIGH" || h.level === "CRITICAL") b.high++;
    });
    return Array.from(map.values()).map((b) => ({ ...b, avg: b.n ? Math.round(b.avg / b.n) : 0 })).sort((a, b) => a.period.localeCompare(b.period));
  }, [history]);

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><TrendingUp className="h-6 w-6 text-primary" />Risk Trends</h1>
        <p className="text-sm text-muted-foreground">Cohort risk evolution over time.</p>
      </div>

      <div className="mb-4"><SuccessKPIs /></div>

      {loading ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      : !history.length ? <Card><CardContent className="py-10 text-center text-muted-foreground">No history yet. Run Recompute on Risk Analytics.</CardContent></Card>
      : <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Average Risk Score (last 60d)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={byDate}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                <Tooltip />
                <Line dataKey="avg" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Severity Mix by Day</CardTitle><CardDescription>Count of students per level per day</CardDescription></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byDate}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="LOW" stackId="a" fill="hsl(142 76% 40%)" />
                <Bar dataKey="MEDIUM" stackId="a" fill="hsl(45 93% 50%)" />
                <Bar dataKey="HIGH" stackId="a" fill="hsl(25 95% 53%)" />
                <Bar dataKey="CRITICAL" stackId="a" fill="hsl(0 84% 60%)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Week over Week</CardTitle><CardDescription>Average score and high-risk count</CardDescription></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={weekly}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="avg" fill="hsl(var(--primary))" name="Avg Score" />
                <Bar dataKey="high" fill="hsl(25 95% 53%)" name="High/Critical Count" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Semester Deep-Dive</CardTitle><CardDescription>Monthly average risk score</CardDescription></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={semester}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line dataKey="avg" stroke="hsl(var(--primary))" strokeWidth={2} name="Avg Score" />
                <Line dataKey="high" stroke="hsl(0 84% 60%)" strokeWidth={2} name="High/Critical" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Risk Factor Breakdown</CardTitle><CardDescription>Average contribution per factor</CardDescription></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={factorAvgs}>
                <PolarGrid />
                <PolarAngleAxis dataKey="factor" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis tick={{ fontSize: 10 }} />
                <Radar dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.4} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>}
    </DashboardLayout>
  );
}
