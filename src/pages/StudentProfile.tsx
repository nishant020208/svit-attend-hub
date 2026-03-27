import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ArrowLeft, User, Calendar, GraduationCap, FileText, Building2, TrendingUp, TrendingDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { format } from "date-fns";

export default function StudentProfile() {
  const [searchParams] = useSearchParams();
  const studentId = searchParams.get("id");
  const navigate = useNavigate();

  const [student, setStudent] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [assignment, setAssignment] = useState<any>(null);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) return;
    const fetchAll = async () => {
      setLoading(true);
      // Student + profile
      const { data: stu } = await supabase
        .from("students")
        .select("*, profiles:user_id(name, email, phone, gender, avatar_url, date_of_birth, address)")
        .eq("id", studentId)
        .single();

      if (stu) {
        setStudent(stu);
        setProfile((stu as any).profiles);
      }

      // Assignment (class/batch/section)
      const { data: assign } = await supabase
        .from("student_assignments")
        .select("*, classes:class_id(name), batches:batch_id(name), academic_sections:section_id(name), subsections:subsection_id(name)")
        .eq("student_id", studentId)
        .maybeSingle();
      setAssignment(assign);

      // Attendance
      const { data: att } = await supabase
        .from("attendance")
        .select("*")
        .eq("student_id", studentId)
        .order("date", { ascending: false })
        .limit(200);
      setAttendance(att || []);

      // Results
      const { data: res } = await supabase
        .from("results")
        .select("*, exams:exam_id(name, subject, exam_type, max_marks)")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false });
      setResults(res || []);

      // Leaves
      const { data: lv } = await supabase
        .from("leave_requests")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false });
      setLeaves(lv || []);

      setLoading(false);
    };
    fetchAll();
  }, [studentId]);

  if (!studentId) {
    return (
      <DashboardLayout>
        <div className="text-center py-20 text-muted-foreground">No student selected.</div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  // Attendance stats
  const totalAtt = attendance.length;
  const present = attendance.filter(a => a.status === "PRESENT").length;
  const absent = attendance.filter(a => a.status === "ABSENT").length;
  const late = attendance.filter(a => a.status === "LATE").length;
  const attPercentage = totalAtt > 0 ? Math.round((present / totalAtt) * 100) : 0;

  // Attendance by month for chart
  const monthMap: Record<string, { present: number; absent: number; late: number }> = {};
  attendance.forEach(a => {
    const month = format(new Date(a.date), "MMM yyyy");
    if (!monthMap[month]) monthMap[month] = { present: 0, absent: 0, late: 0 };
    if (a.status === "PRESENT") monthMap[month].present++;
    else if (a.status === "ABSENT") monthMap[month].absent++;
    else monthMap[month].late++;
  });
  const attendanceChartData = Object.entries(monthMap).reverse().slice(-6).map(([month, d]) => ({
    month, ...d,
  }));

  // Results chart
  const resultsChartData = results.slice(0, 10).reverse().map(r => ({
    name: (r.exams as any)?.name?.substring(0, 15) || "Exam",
    percentage: r.percentage ?? Math.round((r.marks_obtained / r.max_marks) * 100),
    subject: (r.exams as any)?.subject || "",
  }));

  const pieData = [
    { name: "Present", value: present, color: "hsl(var(--chart-2))" },
    { name: "Absent", value: absent, color: "hsl(var(--destructive))" },
    { name: "Late", value: late, color: "hsl(var(--chart-3))" },
  ].filter(d => d.value > 0);

  return (
    <DashboardLayout>
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 gap-2">
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      {/* Profile Header */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-foreground">{profile?.name || "Student"}</h1>
              <p className="text-muted-foreground">{profile?.email}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge>{student?.course}</Badge>
                <Badge variant="secondary">Year {student?.year}</Badge>
                <Badge variant="outline">{student?.section}</Badge>
                <Badge variant="outline">Roll: {student?.roll_number}</Badge>
              </div>
            </div>
            <div className="text-right space-y-1">
              {profile?.phone && <p className="text-sm text-muted-foreground">{profile.phone}</p>}
              {profile?.gender && <p className="text-sm text-muted-foreground capitalize">{profile.gender}</p>}
              {profile?.date_of_birth && (
                <p className="text-sm text-muted-foreground">{format(new Date(profile.date_of_birth), "dd MMM yyyy")}</p>
              )}
            </div>
          </div>

          {/* Assignment info */}
          {assignment && (
            <div className="mt-4 pt-4 border-t flex flex-wrap gap-3">
              <div className="flex items-center gap-1.5 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Class:</span>
                <span className="font-medium text-foreground">{(assignment.classes as any)?.name || "-"}</span>
              </div>
              <span className="text-muted-foreground">›</span>
              <div className="flex items-center gap-1.5 text-sm">
                <span className="text-muted-foreground">Batch:</span>
                <span className="font-medium text-foreground">{(assignment.batches as any)?.name || "-"}</span>
              </div>
              <span className="text-muted-foreground">›</span>
              <div className="flex items-center gap-1.5 text-sm">
                <span className="text-muted-foreground">Section:</span>
                <span className="font-medium text-foreground">{(assignment.academic_sections as any)?.name || "-"}</span>
              </div>
              {(assignment.subsections as any)?.name && (
                <>
                  <span className="text-muted-foreground">›</span>
                  <div className="flex items-center gap-1.5 text-sm">
                    <span className="text-muted-foreground">Subsection:</span>
                    <span className="font-medium text-foreground">{(assignment.subsections as any).name}</span>
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <div className={`text-3xl font-bold ${attPercentage >= 75 ? "text-green-600" : "text-destructive"}`}>
              {attPercentage}%
            </div>
            <p className="text-sm text-muted-foreground mt-1">Attendance</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-foreground">{results.length}</div>
            <p className="text-sm text-muted-foreground mt-1">Exams</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-foreground">{leaves.filter(l => l.status === "APPROVED").length}</div>
            <p className="text-sm text-muted-foreground mt-1">Leaves Approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-foreground">
              {results.length > 0
                ? Math.round(results.reduce((s, r) => s + (r.percentage || 0), 0) / results.length)
                : "-"}
              {results.length > 0 && <span className="text-lg">%</span>}
            </div>
            <p className="text-sm text-muted-foreground mt-1">Avg Score</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="attendance" className="space-y-4">
        <TabsList className="w-full justify-start flex-wrap h-auto gap-1">
          <TabsTrigger value="attendance" className="gap-1.5">
            <Calendar className="h-4 w-4" /> Attendance
          </TabsTrigger>
          <TabsTrigger value="results" className="gap-1.5">
            <GraduationCap className="h-4 w-4" /> Results
          </TabsTrigger>
          <TabsTrigger value="leaves" className="gap-1.5">
            <FileText className="h-4 w-4" /> Leave History
          </TabsTrigger>
        </TabsList>

        {/* Attendance Tab */}
        <TabsContent value="attendance">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Monthly Attendance</CardTitle>
              </CardHeader>
              <CardContent>
                {attendanceChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={attendanceChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="present" fill="hsl(var(--chart-2))" name="Present" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="absent" fill="hsl(var(--destructive))" name="Absent" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="late" fill="hsl(var(--chart-3))" name="Late" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No attendance data yet.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Attendance Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No data available.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results">
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-lg text-foreground">Performance Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {resultsChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={resultsChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="percentage" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-center py-8">No results yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-foreground">All Results</CardTitle>
            </CardHeader>
            <CardContent>
              {results.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 text-muted-foreground font-medium">Exam</th>
                        <th className="text-left py-2 text-muted-foreground font-medium">Subject</th>
                        <th className="text-right py-2 text-muted-foreground font-medium">Marks</th>
                        <th className="text-right py-2 text-muted-foreground font-medium">%</th>
                        <th className="text-right py-2 text-muted-foreground font-medium">Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map(r => (
                        <tr key={r.id} className="border-b last:border-0">
                          <td className="py-2 text-foreground">{(r.exams as any)?.name}</td>
                          <td className="py-2 text-foreground">{(r.exams as any)?.subject}</td>
                          <td className="py-2 text-right text-foreground">{r.marks_obtained}/{r.max_marks}</td>
                          <td className="py-2 text-right">
                            <span className={`font-medium ${(r.percentage || 0) >= 40 ? "text-green-600" : "text-destructive"}`}>
                              {r.percentage ?? "-"}%
                            </span>
                          </td>
                          <td className="py-2 text-right">
                            <Badge variant="outline">{r.grade || "-"}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No results recorded.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leaves Tab */}
        <TabsContent value="leaves">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-foreground">Leave History</CardTitle>
              <CardDescription>All leave requests for this student</CardDescription>
            </CardHeader>
            <CardContent>
              {leaves.length > 0 ? (
                <div className="space-y-3">
                  {leaves.map(l => (
                    <div key={l.id} className="flex items-start justify-between p-3 rounded-lg border bg-muted/30">
                      <div>
                        <p className="font-medium text-foreground">{l.subject}</p>
                        <p className="text-sm text-muted-foreground">{l.reason}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(l.start_date), "dd MMM")} – {format(new Date(l.end_date), "dd MMM yyyy")}
                        </p>
                      </div>
                      <Badge
                        variant={l.status === "APPROVED" ? "default" : l.status === "REJECTED" ? "destructive" : "secondary"}
                      >
                        {l.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No leave requests found.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
