import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Users, ClipboardList, Loader2, FileDown, FileText } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import { toCsv } from "@/lib/exportCsv";
import { exportTablePdf } from "@/lib/exportPdf";

interface Props {
  facultyId?: string;
  capacity?: number;
}

export function MentorWorkloadCard({ facultyId, capacity = 15 }: Props) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ open: 0, closed: 0, total: 0, byType: [] as { type: string; count: number }[], mentees: 0 });

  useEffect(() => {
    if (!facultyId) return;
    (async () => {
      setLoading(true);
      const { data: ints } = await supabase
        .from("interventions")
        .select("id, intervention_type, status, student_id")
        .eq("faculty_id", facultyId);
      const open = (ints || []).filter((i) => i.status === "OPEN").length;
      const closed = (ints || []).filter((i) => i.status !== "OPEN").length;
      const byTypeMap = new Map<string, number>();
      (ints || []).forEach((i) => byTypeMap.set(i.intervention_type, (byTypeMap.get(i.intervention_type) || 0) + 1));
      const byType = Array.from(byTypeMap.entries()).map(([type, count]) => ({ type: type.replace("_", " "), count }));
      const { data: mentees } = await supabase.from("mentor_assignments").select("id").eq("faculty_id", facultyId);
      setData({ open, closed, total: ints?.length || 0, byType, mentees: mentees?.length || 0 });
      setLoading(false);
    })();
  }, [facultyId]);

  const usage = Math.min(100, Math.round((data.open / capacity) * 100));
  const status = usage >= 100 ? "Overloaded" : usage >= 75 ? "Near capacity" : usage >= 40 ? "Healthy" : "Light";
  const statusColor = usage >= 100 ? "text-red-600" : usage >= 75 ? "text-orange-600" : usage >= 40 ? "text-green-600" : "text-blue-600";

  const exportCsv = () => {
    const summary = [
      { metric: "Open interventions", value: data.open },
      { metric: "Capacity limit", value: capacity },
      { metric: "Utilisation %", value: usage },
      { metric: "Status", value: status },
      { metric: "Mentees", value: data.mentees },
      { metric: "Closed", value: data.closed },
      { metric: "Lifetime total", value: data.total },
      ...data.byType.map((t) => ({ metric: `Type: ${t.type}`, value: t.count })),
    ];
    toCsv(summary, `mentor-workload-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const exportPdf = () => {
    exportTablePdf({
      title: "Mentor Workload & Counselling Capacity",
      subtitle: `Open ${data.open} / ${capacity} · ${status} · ${data.mentees} mentees`,
      columns: ["Metric", "Value"],
      rows: [
        ["Open interventions", String(data.open)],
        ["Capacity limit", String(capacity)],
        ["Utilisation %", `${usage}%`],
        ["Status", status],
        ["Mentees", String(data.mentees)],
        ["Closed cases", String(data.closed)],
        ["Lifetime total", String(data.total)],
        ...data.byType.map((t) => [`Type: ${t.type}`, String(t.count)]),
      ],
      filename: `mentor-workload-${new Date().toISOString().slice(0, 10)}.pdf`,
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={exportCsv} disabled={loading}>
          <FileDown className="h-3.5 w-3.5" /> CSV
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={exportPdf} disabled={loading}>
          <FileText className="h-3.5 w-3.5" /> PDF
        </Button>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
      <Card className="shadow-lg border-t-4 border-t-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-5 w-5" /> Intervention Capacity
          </CardTitle>
          <CardDescription>Active workload vs counselling capacity</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-3xl font-bold text-foreground">{data.open}<span className="text-base text-muted-foreground"> / {capacity}</span></div>
                  <p className="text-xs text-muted-foreground">Open interventions</p>
                </div>
                <span className={`text-sm font-semibold ${statusColor}`}>{status}</span>
              </div>
              <Progress value={usage} className="h-2" />
              <div className="grid grid-cols-3 gap-3 pt-2">
                <Stat label="Mentees" value={data.mentees} />
                <Stat label="Closed" value={data.closed} />
                <Stat label="Lifetime" value={data.total} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg border-t-4 border-t-purple-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5" /> Workload by Type
          </CardTitle>
          <CardDescription>Counselling vs remedial vs warnings</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : data.byType.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">No interventions logged yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.byType}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="type" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-muted/50 p-2 text-center">
      <div className="text-lg font-bold text-foreground">{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
    </div>
  );
}
