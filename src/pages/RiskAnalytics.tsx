import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RiskBadge } from "@/components/risk/RiskBadge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, RefreshCw, ShieldAlert, TrendingDown, AlertTriangle, Users, Search, FileDown, FileText } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { useToast } from "@/hooks/use-toast";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Heatmap, HeatmapCell } from "@/components/risk/Heatmap";
import { SemesterDeepDive } from "@/components/risk/SemesterDeepDive";
import { FilterPresets, RiskPreset } from "@/components/risk/FilterPresets";
import { toCsv } from "@/lib/exportCsv";
import { exportTablePdf } from "@/lib/exportPdf";

type RiskRow = {
  id: string;
  student_id: string;
  score: number;
  level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  reasons: string[];
  factors: any;
  computed_at: string;
  student?: { roll_number?: string; course?: string; year?: number; section?: string; user_id?: string };
  profile?: { name?: string; email?: string };
};

const LEVEL_COLORS: Record<string, string> = {
  LOW: "hsl(142 76% 40%)",
  MEDIUM: "hsl(45 93% 50%)",
  HIGH: "hsl(25 95% 53%)",
  CRITICAL: "hsl(0 84% 60%)",
};

export default function RiskAnalytics() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [computing, setComputing] = useState(false);
  const [rows, setRows] = useState<RiskRow[]>([]);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("ALL");
  const [courseFilter, setCourseFilter] = useState<string>("ALL");
  const [yearFilter, setYearFilter] = useState<string>("ALL");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const fetchAll = async () => {
    setLoading(true);
    const { data: scores } = await supabase
      .from("risk_scores")
      .select("*")
      .order("score", { ascending: false });

    if (!scores || scores.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }

    const studentIds = scores.map((s: any) => s.student_id);
    const { data: students } = await supabase
      .from("students")
      .select("id, user_id, roll_number, course, year, section")
      .in("id", studentIds);

    const userIds = (students || []).map((s: any) => s.user_id).filter(Boolean);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name, email")
      .in("id", userIds);

    const sMap = new Map((students || []).map((s: any) => [s.id, s]));
    const pMap = new Map((profiles || []).map((p: any) => [p.id, p]));

    const merged: RiskRow[] = (scores as any[]).map((sc) => {
      const stu = sMap.get(sc.student_id) as any;
      const prof = stu ? pMap.get(stu.user_id) : null;
      return {
        ...sc,
        reasons: Array.isArray(sc.reasons) ? sc.reasons : [],
        student: stu,
        profile: prof as any,
      };
    });
    setRows(merged);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleCompute = async () => {
    setComputing(true);
    try {
      const { error } = await supabase.functions.invoke("compute-risk-scores", { body: {} });
      if (error) throw error;
      toast({ title: "Risk scores updated", description: "Recomputed for all students." });
      await fetchAll();
    } catch (e: any) {
      toast({ title: "Failed to compute risk", description: e.message, variant: "destructive" });
    } finally {
      setComputing(false);
    }
  };

  const courses = useMemo(() => Array.from(new Set(rows.map((r) => r.student?.course).filter(Boolean))).sort() as string[], [rows]);
  const years = useMemo(() => Array.from(new Set(rows.map((r) => r.student?.year).filter(Boolean))).sort() as number[], [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (levelFilter !== "ALL" && r.level !== levelFilter) return false;
      if (courseFilter !== "ALL" && r.student?.course !== courseFilter) return false;
      if (yearFilter !== "ALL" && String(r.student?.year) !== yearFilter) return false;
      if (dateFrom && r.computed_at < dateFrom) return false;
      if (dateTo && r.computed_at > dateTo + "T23:59:59") return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = `${r.profile?.name || ""} ${r.profile?.email || ""} ${r.student?.roll_number || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, levelFilter, courseFilter, yearFilter, dateFrom, dateTo, search]);

  const counts = useMemo(() => {
    const c = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    filtered.forEach((r) => { c[r.level]++; });
    return c;
  }, [filtered]);

  const atRisk = counts.HIGH + counts.CRITICAL;

  const distribution = [
    { name: "Low", value: counts.LOW, color: LEVEL_COLORS.LOW },
    { name: "Medium", value: counts.MEDIUM, color: LEVEL_COLORS.MEDIUM },
    { name: "High", value: counts.HIGH, color: LEVEL_COLORS.HIGH },
    { name: "Critical", value: counts.CRITICAL, color: LEVEL_COLORS.CRITICAL },
  ].filter((d) => d.value > 0);

  const factorAvg = useMemo(() => {
    if (filtered.length === 0) return [];
    const keys = ["attendance", "marks", "assignments", "trend", "lateSubs", "leaveFreq"];
    return keys.map((k) => {
      const vals = filtered.map((r) => (r.factors?.[k] ?? 0) as number);
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      return { factor: k, risk: Math.round((1 - avg) * 100) };
    });
  }, [filtered]);

  const heatmap = useMemo(() => {
    const map = new Map<string, { sum: number; n: number }>();
    filtered.forEach((r) => {
      const c = r.student?.course || "—";
      const y = r.student?.year ? `Y${r.student.year}` : "—";
      const k = `${c}|${y}`;
      const prev = map.get(k) || { sum: 0, n: 0 };
      prev.sum += Number(r.score); prev.n += 1;
      map.set(k, prev);
    });
    const cs = Array.from(new Set(filtered.map((r) => r.student?.course || "—"))).sort();
    const ys = Array.from(new Set(filtered.map((r) => r.student?.year ? `Y${r.student.year}` : "—"))).sort();
    const cells: HeatmapCell[] = [];
    map.forEach((v, k) => {
      const [row, col] = k.split("|");
      cells.push({ row, col, value: Math.round(v.sum / v.n) });
    });
    return { cells, rows: cs, cols: ys };
  }, [filtered]);

  const filterSummary = [
    dateFrom || dateTo ? `${dateFrom || "…"} → ${dateTo || "…"}` : null,
    courseFilter !== "ALL" ? `Course: ${courseFilter}` : null,
    yearFilter !== "ALL" ? `Year: ${yearFilter}` : null,
    levelFilter !== "ALL" ? `Level: ${levelFilter}` : null,
  ].filter(Boolean).join(" · ") || "All students";

  const handleExportCsv = () => {
    if (!filtered.length) {
      toast({ title: "Nothing to export", variant: "destructive" });
      return;
    }
    const rowsOut = filtered.map((r) => ({
      name: r.profile?.name || "",
      email: r.profile?.email || "",
      roll: r.student?.roll_number || "",
      course: r.student?.course || "",
      year: r.student?.year || "",
      section: r.student?.section || "",
      level: r.level,
      score: r.score,
      reasons: r.reasons.join(" | "),
      computed_at: r.computed_at,
    }));
    toCsv(rowsOut, `risk-analytics-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handleExportPdf = () => {
    if (!filtered.length) {
      toast({ title: "Nothing to export", variant: "destructive" });
      return;
    }
    const heatRows = heatmap.rows.map((course) => [
      course,
      ...heatmap.cols.map((yr) => {
        const cell = heatmap.cells.find((c) => c.row === course && c.col === yr);
        return cell ? cell.value : "—";
      }),
    ]);
    exportTablePdf({
      title: "Risk Heatmap · Course × Year",
      subtitle: filterSummary,
      columns: ["Course", ...heatmap.cols],
      rows: heatRows as any,
      filename: `risk-heatmap-${new Date().toISOString().slice(0, 10)}.pdf`,
    });
    setTimeout(() => {
      exportTablePdf({
        title: "At-Risk Students (Filtered)",
        subtitle: `${filterSummary} · ${filtered.length} students`,
        columns: ["Name", "Email", "Roll", "Course", "Year", "Section", "Level", "Score", "Top Reasons", "Computed"],
        rows: filtered.map((r) => [
          r.profile?.name || "—",
          r.profile?.email || "—",
          r.student?.roll_number || "—",
          r.student?.course || "—",
          r.student?.year ?? "—",
          r.student?.section || "—",
          r.level,
          r.score,
          r.reasons.slice(0, 3).join("; "),
          r.computed_at?.slice(0, 10) || "—",
        ]),
        filename: `risk-students-${new Date().toISOString().slice(0, 10)}.pdf`,
      });
    }, 300);
  };

  const applyPreset = (p: RiskPreset) => {
    setDateFrom(p.dateFrom); setDateTo(p.dateTo);
    setCourseFilter(p.course); setYearFilter(p.year); setLevelFilter(p.level);
    toast({ title: "Preset applied", description: p.name });
  };

  const handleHeatmapDrill = (cell: { row: string; col: string }) => {
    setCourseFilter(cell.row);
    setYearFilter(cell.col.replace(/^Y/, ""));
    toast({ title: "Drill-down applied", description: `${cell.row} · ${cell.col} — scroll to table` });
    setTimeout(() => {
      document.getElementById("risk-students-table")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };


  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-primary" />
            Risk Analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            Identify at-risk students early using attendance, marks, assignments, and trends.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <FilterPresets
            current={{ dateFrom, dateTo, course: courseFilter, year: yearFilter, level: levelFilter }}
            onApply={applyPreset}
          />
          <Button variant="outline" onClick={handleExportCsv} className="gap-2">
            <FileDown className="h-4 w-4" /> CSV
          </Button>
          <Button variant="outline" onClick={handleExportPdf} className="gap-2">
            <FileText className="h-4 w-4" /> PDF
          </Button>
          <Button variant="outline" onClick={async () => {
            try {
              const { error } = await supabase.functions.invoke("risk-alerts-engine", { body: {} });
              if (error) throw error;
              toast({ title: "Alerts engine run", description: "Notifications sent to mentors, students and parents." });
            } catch (e: any) {
              toast({ title: "Alerts failed", description: e.message, variant: "destructive" });
            }
          }} className="gap-2">
            <AlertTriangle className="h-4 w-4" /> Run Alerts
          </Button>
          <Button onClick={handleCompute} disabled={computing} className="gap-2">
            {computing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Recompute Now
          </Button>
        </div>
      </div>

      {/* Drill-down filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
            <div className="col-span-2 md:col-span-1">
              <label className="text-xs text-muted-foreground">From</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="text-xs text-muted-foreground">To</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Course</label>
              <Select value={courseFilter} onValueChange={setCourseFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  {courses.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Year</label>
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  {years.map((y) => <SelectItem key={y} value={String(y)}>Year {y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Level</label>
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="ghost" onClick={() => { setDateFrom(""); setDateTo(""); setCourseFilter("ALL"); setYearFilter("ALL"); setLevelFilter("ALL"); }}>
              Reset
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">Showing <span className="font-semibold text-foreground">{filtered.length}</span> of {rows.length} students · {filterSummary}</p>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Students (filtered)</p>
                <p className="text-2xl font-bold text-foreground">{filtered.length}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground/40" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">At Risk</p>
                <p className="text-2xl font-bold text-orange-600">{atRisk}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500/40" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Critical</p>
                <p className="text-2xl font-bold text-red-600">{counts.CRITICAL}</p>
              </div>
              <ShieldAlert className="h-8 w-8 text-red-500/40" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Declining Trend</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {filtered.filter((r) => (r.factors?.trend ?? 1) < 0.5).length}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-yellow-500/40" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-foreground">Risk Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {distribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={distribution} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value"
                       label={({ name, value }) => `${name}: ${value}`}>
                    {distribution.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-8">No data yet — click Recompute.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base text-foreground">Average Risk Contribution by Factor</CardTitle>
            <CardDescription>Higher = factor is dragging students down</CardDescription>
          </CardHeader>
          <CardContent>
            {factorAvg.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={factorAvg}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="factor" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="risk" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-8">No data yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {heatmap.cells.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base text-foreground">Risk Heatmap · Course × Year</CardTitle>
            <CardDescription>Average risk score across courses and years</CardDescription>
          </CardHeader>
          <CardContent>
            <Heatmap cells={heatmap.cells} rows={heatmap.rows} cols={heatmap.cols} />
          </CardContent>
        </Card>
      )}

      <div className="mb-6">
        <SemesterDeepDive />
      </div>



      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-foreground">At-Risk Students</CardTitle>
          <div className="flex flex-col sm:flex-row gap-2 mt-2">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, roll number…"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-10 text-muted-foreground">
              No risk data. Click <span className="font-medium">Recompute Now</span> to generate.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Roll</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Top Reasons</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="font-medium text-foreground">{r.profile?.name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{r.profile?.email}</div>
                      </TableCell>
                      <TableCell>{r.student?.roll_number || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{r.student?.course} · Y{r.student?.year}</Badge>
                      </TableCell>
                      <TableCell><RiskBadge level={r.level} /></TableCell>
                      <TableCell className="font-semibold">{r.score}</TableCell>
                      <TableCell className="max-w-xs">
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          {r.reasons.slice(0, 2).map((reason, i) => (
                            <div key={i}>• {reason}</div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate(`/risk/student?id=${r.student_id}`)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
