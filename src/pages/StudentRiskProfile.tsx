import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RiskBadge } from "@/components/risk/RiskBadge";
import { LogInterventionDialog } from "@/components/risk/LogInterventionDialog";
import { Markdown } from "@/components/ui/markdown";
import {
  Loader2, ShieldAlert, RefreshCw, Sparkles, TrendingDown, BookOpen, Calendar, ArrowLeft,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar,
} from "recharts";
import { format } from "date-fns";

export default function StudentRiskProfile() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const studentId = params.get("id") || "";
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [risk, setRisk] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [interventions, setInterventions] = useState<any[]>([]);
  const [aiText, setAiText] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);
  const [recomputing, setRecomputing] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: stu } = await supabase.from("students")
      .select("id, user_id, roll_number, course, year, section")
      .eq("id", studentId).single();
    setStudent(stu);

    if (stu?.user_id) {
      const { data: prof } = await supabase.from("profiles")
        .select("name, email, avatar_url, phone").eq("id", stu.user_id).single();
      setProfile(prof);
    }

    const { data: rs } = await supabase.from("risk_scores")
      .select("*").eq("student_id", studentId)
      .order("computed_at", { ascending: false }).limit(1);
    setRisk(rs?.[0] || null);

    const { data: hist } = await supabase.from("risk_factors_history")
      .select("score, level, snapshot_date")
      .eq("student_id", studentId)
      .order("snapshot_date", { ascending: true }).limit(30);
    setHistory(hist || []);

    const { data: subs } = await supabase.from("subject_performance_snapshots")
      .select("subject, avg_marks, completion_rate, trend, computed_at")
      .eq("student_id", studentId)
      .order("computed_at", { ascending: false }).limit(20);
    
    const seen = new Set<string>();
    const dedup = (subs || []).filter((s: any) => {
      if (seen.has(s.subject)) return false;
      seen.add(s.subject); return true;
    });
    setSubjects(dedup);

    const { data: ints } = await supabase.from("interventions")
      .select("*").eq("student_id", studentId)
      .order("created_at", { ascending: false });
    setInterventions(ints || []);

    setLoading(false);
  };

  useEffect(() => { if (studentId) load(); }, [studentId]);

  const recompute = async () => {
    setRecomputing(true);
    try {
      const { error } = await supabase.functions.invoke("compute-risk-scores", { body: { studentId } });
      if (error) throw error;
      toast({ title: "Risk recomputed" });
      await load();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally { setRecomputing(false); }
  };

  const getAI = async () => {
    setAiLoading(true);
    setAiText("");
    try {
      const { data, error } = await supabase.functions.invoke("ai-mentor-recommendations", { body: { studentId } });
      if (error) throw error;
      setAiText(data?.recommendation || "No recommendation returned.");
    } catch (e: any) {
      toast({ title: "AI failed", description: e.message, variant: "destructive" });
    } finally { setAiLoading(false); }
  };

  if (!studentId) {
    return <DashboardLayout><p className="text-muted-foreground">Missing student id.</p></DashboardLayout>;
  }

  if (loading) {
    return <DashboardLayout><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></DashboardLayout>;
  }

  const factors = risk?.factors || {};
  const factorChart = [
    { name: "Attendance", risk: Math.round((1 - (factors.attendance ?? 1)) * 100) },
    { name: "Marks", risk: Math.round((1 - (factors.marks ?? 1)) * 100) },
    { name: "Assignments", risk: Math.round((1 - (factors.assignments ?? 1)) * 100) },
    { name: "Trend", risk: Math.round((1 - (factors.trend ?? 1)) * 100) },
    { name: "Late Subs", risk: Math.round((1 - (factors.lateSubs ?? 1)) * 100) },
    { name: "Leaves", risk: Math.round((1 - (factors.leaveFreq ?? 1)) * 100) },
  ];

  return (
    <DashboardLayout>
      <Button variant="ghost" size="sm" className="mb-4 gap-2" onClick={() => navigate("/risk")}>
        <ArrowLeft className="h-4 w-4" /> Back to Risk Analytics
      </Button>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-primary" />
            {profile?.name || "Student"} · Risk Profile
          </h1>
          <p className="text-sm text-muted-foreground">
            {student?.roll_number} · {student?.course} Y{student?.year} {student?.section}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={recompute} disabled={recomputing} className="gap-2">
            {recomputing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Recompute
          </Button>
          <LogInterventionDialog studentId={studentId} onSaved={load} />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-foreground">Current Risk</CardTitle>
          </CardHeader>
          <CardContent>
            {risk ? (
              <div className="space-y-3">
                <div className="flex items-baseline gap-3">
                  <span className="text-5xl font-bold text-foreground">{risk.score}</span>
                  <span className="text-sm text-muted-foreground">/100</span>
                </div>
                <RiskBadge level={risk.level} />
                <p className="text-xs text-muted-foreground">
                  Computed {format(new Date(risk.computed_at), "dd MMM yyyy HH:mm")}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No score yet. Click Recompute.</p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-foreground">Top Contributing Reasons</CardTitle>
            <CardDescription>What is driving this risk level?</CardDescription>
          </CardHeader>
          <CardContent>
            {risk?.reasons?.length ? (
              <ul className="space-y-2">
                {risk.reasons.map((r: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <TrendingDown className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">No reasons available.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader><CardTitle className="text-base text-foreground">Risk Trend</CardTitle></CardHeader>
          <CardContent>
            {history.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="snapshot_date" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-8 text-sm">No history yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base text-foreground">Risk by Factor</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={factorChart}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="risk" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Mentor Recommendations
            </CardTitle>
            <CardDescription>Diagnosis, suggestions and 2-week outlook</CardDescription>
          </div>
          <Button size="sm" onClick={getAI} disabled={aiLoading} className="gap-2">
            {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate
          </Button>
        </CardHeader>
        <CardContent>
          {aiText ? (
            <Markdown>{aiText}</Markdown>
          ) : (
            <p className="text-sm text-muted-foreground">Click Generate to get an AI-powered analysis for this student.</p>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base text-foreground flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" /> Subject Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {subjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No subject snapshots yet.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {subjects.map((s) => (
                <div key={s.subject} className="rounded-lg border bg-card p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm text-foreground">{s.subject}</p>
                    <Badge variant={s.trend === "declining" ? "destructive" : s.trend === "improving" ? "default" : "secondary"}>
                      {s.trend}
                    </Badge>
                  </div>
                  <p className="text-2xl font-bold mt-1 text-foreground">{s.avg_marks}%</p>
                  <p className="text-xs text-muted-foreground">
                    Completion: {Math.round((s.completion_rate || 0) * 100)}%
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" /> Intervention Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          {interventions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No interventions logged yet.</p>
          ) : (
            <ol className="relative border-l border-border ml-2 space-y-4">
              {interventions.map((i) => (
                <li key={i.id} className="ml-4">
                  <div className="absolute -left-1.5 w-3 h-3 rounded-full bg-primary mt-1.5" />
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{i.intervention_type.replace("_", " ")}</Badge>
                    <Badge>{i.status}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(i.created_at), "dd MMM yyyy")}
                    </span>
                  </div>
                  {i.action_taken && <p className="text-sm mt-1 text-foreground">{i.action_taken}</p>}
                  {i.notes && <p className="text-xs text-muted-foreground mt-1">{i.notes}</p>}
                  {i.follow_up_date && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Follow-up: {format(new Date(i.follow_up_date), "dd MMM yyyy")}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
