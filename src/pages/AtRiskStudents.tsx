import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RiskBadge } from "@/components/risk/RiskBadge";
import { RiskFilters, RiskFilterState } from "@/components/risk/RiskFilters";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Users, Download } from "lucide-react";
import { toCsv } from "@/lib/exportCsv";

export default function AtRiskStudents() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);
  const [f, setF] = useState<RiskFilterState>({ search: "", level: "ALL", course: "ALL", year: "ALL" });

  useEffect(() => { (async () => {
    setLoading(true);
    const { data: scores } = await supabase.from("risk_scores").select("*").in("level", ["HIGH", "CRITICAL", "MEDIUM"]).order("score", { ascending: false });
    if (!scores?.length) { setRows([]); setLoading(false); return; }
    const ids = scores.map((s: any) => s.student_id);
    const { data: students } = await supabase.from("students").select("id, user_id, roll_number, course, year, section").in("id", ids);
    const uids = (students || []).map((s: any) => s.user_id);
    const { data: profiles } = await supabase.from("profiles").select("id, name, email").in("id", uids);
    const sMap = new Map((students || []).map((s: any) => [s.id, s]));
    const pMap = new Map((profiles || []).map((p: any) => [p.id, p]));
    setRows(scores.map((sc: any) => {
      const stu = sMap.get(sc.student_id) as any;
      const prof = stu ? pMap.get(stu.user_id) : null;
      return { ...sc, student: stu, profile: prof, reasons: Array.isArray(sc.reasons) ? sc.reasons : [] };
    }));
    setLoading(false);
  })(); }, []);

  const courses = useMemo(() => Array.from(new Set(rows.map((r: any) => r.student?.course).filter(Boolean))), [rows]);
  const filtered = useMemo(() => rows.filter((r: any) => {
    if (f.level !== "ALL" && r.level !== f.level) return false;
    if (f.course !== "ALL" && r.student?.course !== f.course) return false;
    if (f.year !== "ALL" && String(r.student?.year) !== f.year) return false;
    if (f.search) {
      const q = f.search.toLowerCase();
      const hay = `${r.profile?.name || ""} ${r.profile?.email || ""} ${r.student?.roll_number || ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }), [rows, f]);

  const exportCsv = () => {
    toCsv(filtered.map((r: any) => ({
      name: r.profile?.name, email: r.profile?.email, roll: r.student?.roll_number,
      course: r.student?.course, year: r.student?.year, section: r.student?.section,
      level: r.level, score: r.score, reasons: (r.reasons || []).join(" | "),
    })), `at-risk-students-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Users className="h-6 w-6 text-primary" />At-Risk Students</h1>
          <p className="text-sm text-muted-foreground">All students flagged Medium / High / Critical.</p>
        </div>
        <Button variant="outline" onClick={exportCsv} className="gap-2" disabled={!filtered.length}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <Card className="mb-4"><CardContent className="pt-4"><RiskFilters value={f} onChange={setF} courses={courses} /></CardContent></Card>

      <Card>
        <CardHeader><CardTitle className="text-base">{filtered.length} students</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            : filtered.length === 0 ? <p className="text-center text-muted-foreground py-10">No matching students.</p>
            : <div className="overflow-x-auto"><Table>
              <TableHeader><TableRow>
                <TableHead>Student</TableHead><TableHead>Roll</TableHead><TableHead>Course</TableHead>
                <TableHead>Level</TableHead><TableHead>Score</TableHead><TableHead>Reasons</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>{filtered.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell><div className="font-medium">{r.profile?.name || "—"}</div><div className="text-xs text-muted-foreground">{r.profile?.email}</div></TableCell>
                  <TableCell>{r.student?.roll_number || "—"}</TableCell>
                  <TableCell><Badge variant="outline">{r.student?.course} · Y{r.student?.year}</Badge></TableCell>
                  <TableCell><RiskBadge level={r.level} /></TableCell>
                  <TableCell className="font-semibold">{r.score}</TableCell>
                  <TableCell className="max-w-xs text-xs text-muted-foreground">{(r.reasons || []).slice(0, 2).join(" · ")}</TableCell>
                  <TableCell><Button size="sm" variant="ghost" onClick={() => navigate(`/risk/student?id=${r.student_id}`)}>View</Button></TableCell>
                </TableRow>
              ))}</TableBody>
            </Table></div>}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
