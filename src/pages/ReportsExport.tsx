import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Download, FileSpreadsheet, ShieldAlert, Activity, Bell } from "lucide-react";
import { toCsv } from "@/lib/exportCsv";
import { useToast } from "@/hooks/use-toast";

export default function ReportsExport() {
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  const exportRisk = async () => {
    setBusy("risk");
    const { data: scores } = await supabase.from("risk_scores").select("*").order("score", { ascending: false });
    if (!scores?.length) { toast({ title: "No risk data" }); setBusy(null); return; }
    const ids = scores.map((s: any) => s.student_id);
    const { data: students } = await supabase.from("students").select("id, user_id, roll_number, course, year, section").in("id", ids);
    const sMap = new Map((students || []).map((s: any) => [s.id, s]));
    const uids = (students || []).map((s: any) => s.user_id);
    const { data: profs } = await supabase.from("profiles").select("id, name, email").in("id", uids);
    const pMap = new Map((profs || []).map((p: any) => [p.id, p]));
    toCsv(scores.map((sc: any) => {
      const stu = sMap.get(sc.student_id) as any;
      const prof = stu ? pMap.get(stu.user_id) : null;
      return {
        name: (prof as any)?.name, email: (prof as any)?.email, roll: stu?.roll_number,
        course: stu?.course, year: stu?.year, section: stu?.section,
        level: sc.level, score: sc.score, reasons: (sc.reasons || []).join(" | "),
        computed_at: sc.computed_at,
      };
    }), `risk-report-${new Date().toISOString().slice(0, 10)}.csv`);
    setBusy(null);
  };

  const exportInterventions = async () => {
    setBusy("int");
    const { data } = await supabase.from("interventions").select("*").order("created_at", { ascending: false });
    if (!data?.length) { toast({ title: "No interventions" }); setBusy(null); return; }
    toCsv(data.map((d: any) => ({
      id: d.id, student_id: d.student_id, faculty_id: d.faculty_id,
      type: d.intervention_type, status: d.status,
      action: d.action_taken, notes: d.notes, follow_up: d.follow_up_date,
      created_at: d.created_at,
    })), `interventions-${new Date().toISOString().slice(0, 10)}.csv`);
    setBusy(null);
  };

  const exportAlerts = async () => {
    setBusy("al");
    const { data } = await supabase.from("risk_alerts").select("*").order("created_at", { ascending: false });
    if (!data?.length) { toast({ title: "No alerts" }); setBusy(null); return; }
    toCsv(data.map((a: any) => ({
      id: a.id, student_id: a.student_id, severity: a.severity, type: a.alert_type,
      message: a.message, created_at: a.created_at, ack: a.acknowledged_at,
    })), `alerts-${new Date().toISOString().slice(0, 10)}.csv`);
    setBusy(null);
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><FileSpreadsheet className="h-6 w-6 text-primary" />Reports Export</h1>
        <p className="text-sm text-muted-foreground">Download CSVs of risk, intervention, and alert data.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-primary" />Risk Report</CardTitle>
            <CardDescription>Latest score per student.</CardDescription></CardHeader>
          <CardContent><Button onClick={exportRisk} disabled={busy === "risk"} className="gap-2 w-full"><Download className="h-4 w-4" />Export CSV</Button></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4 text-primary" />Interventions</CardTitle>
            <CardDescription>Full intervention history.</CardDescription></CardHeader>
          <CardContent><Button onClick={exportInterventions} disabled={busy === "int"} className="gap-2 w-full"><Download className="h-4 w-4" />Export CSV</Button></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4 text-primary" />Alerts</CardTitle>
            <CardDescription>Risk alert log.</CardDescription></CardHeader>
          <CardContent><Button onClick={exportAlerts} disabled={busy === "al"} className="gap-2 w-full"><Download className="h-4 w-4" />Export CSV</Button></CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
