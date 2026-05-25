import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, TrendingDown, Users, Target } from "lucide-react";

export function SuccessKPIs() {
  const [kpis, setKpis] = useState({ total: 0, closed: 0, improved: 0, avgDelta: 0, students: 0 });

  useEffect(() => { (async () => {
    const { data: ints } = await supabase.from("interventions").select("id, status, student_id");
    const { data: outs } = await supabase.from("intervention_outcomes").select("intervention_id, risk_score_delta");
    const total = ints?.length || 0;
    const closed = (ints || []).filter((i: any) => i.status !== "OPEN").length;
    const deltas = (outs || []).map((o: any) => Number(o.risk_score_delta)).filter((n) => !isNaN(n));
    const improved = deltas.filter((d) => d < 0).length;
    const avgDelta = deltas.length ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 0;
    const students = new Set((ints || []).map((i: any) => i.student_id)).size;
    setKpis({ total, closed, improved, avgDelta: Math.round(-avgDelta), students });
  })(); }, []);

  const successRate = kpis.total ? Math.round((kpis.improved / kpis.total) * 100) : 0;

  const items = [
    { label: "Students Helped", value: kpis.students, icon: Users, color: "text-blue-500" },
    { label: "Total Interventions", value: kpis.total, icon: Target, color: "text-primary" },
    { label: "Success Rate", value: `${successRate}%`, icon: CheckCircle2, color: "text-green-500" },
    { label: "Avg Risk Drop", value: `${kpis.avgDelta > 0 ? "-" : ""}${Math.abs(kpis.avgDelta)} pts`, icon: TrendingDown, color: "text-emerald-500" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((it) => (
        <Card key={it.label}>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground flex items-center gap-2"><it.icon className={`h-4 w-4 ${it.color}`} />{it.label}</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-foreground">{it.value}</div></CardContent>
        </Card>
      ))}
    </div>
  );
}
