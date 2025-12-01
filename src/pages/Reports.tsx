import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { TopTabs } from "@/components/layout/TopTabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Download, TrendingDown, TrendingUp, AlertTriangle, Brain, Users, Calendar, Target } from "lucide-react";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function Reports() {
  const navigate = useNavigate();
  const { role, loading: roleLoading, userId } = useUserRole();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [studentsData, setStudentsData] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [aiPrediction, setAiPrediction] = useState<any>(null);
  const [predictingStudent, setPredictingStudent] = useState<string | null>(null);
  const [attendanceTrends, setAttendanceTrends] = useState<any[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null);

  useEffect(() => {
    checkAuth();
  }, [role]);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setUser(session.user);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      setProfile(profileData);

      if (role === "ADMIN" || role === "FACULTY") {
        await fetchAnalyticsData();
      } else if (role === "STUDENT") {
        await fetchStudentData(session.user.id);
      } else if (role === "PARENT") {
        await fetchParentData(session.user.id);
      }
    } catch (error) {
      console.error("Auth error:", error);
      navigate("/auth");
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalyticsData = async () => {
    try {
      // Fetch all students with their attendance
      const { data: students, error: studentsError } = await supabase
        .from("students")
        .select(`
          *,
          profiles!students_user_id_fkey (name, email)
        `);

      if (studentsError) throw studentsError;

      // Fetch all attendance records
      const { data: attendance, error: attendanceError } = await supabase
        .from("attendance")
        .select("*");

      if (attendanceError) throw attendanceError;

      // Calculate metrics for each student
      const studentsWithMetrics = students?.map(student => {
        const studentAttendance = attendance?.filter(a => a.student_id === student.id) || [];
        const totalClasses = studentAttendance.length;
        const presentCount = studentAttendance.filter(a => a.status === "PRESENT").length;
        const attendancePercentage = totalClasses > 0 ? (presentCount / totalClasses) * 100 : 0;

        return {
          ...student,
          totalClasses,
          presentCount,
          attendancePercentage: attendancePercentage.toFixed(2),
          riskLevel: attendancePercentage < 75 ? "HIGH" : attendancePercentage < 85 ? "MEDIUM" : "LOW"
        };
      }) || [];

      setStudentsData(studentsWithMetrics);

      // Calculate overall metrics
      const avgAttendance = studentsWithMetrics.reduce((acc, s) => acc + parseFloat(s.attendancePercentage), 0) / (studentsWithMetrics.length || 1);
      const highRiskCount = studentsWithMetrics.filter(s => s.riskLevel === "HIGH").length;
      const mediumRiskCount = studentsWithMetrics.filter(s => s.riskLevel === "MEDIUM").length;

      setPerformanceMetrics({
        totalStudents: studentsWithMetrics.length,
        averageAttendance: avgAttendance.toFixed(2),
        highRiskStudents: highRiskCount,
        mediumRiskStudents: mediumRiskCount,
        lowRiskStudents: studentsWithMetrics.length - highRiskCount - mediumRiskCount
      });

      // Prepare trend data (last 30 days)
      const last30Days = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        return date.toISOString().split('T')[0];
      });

      const trendData = last30Days.map(date => {
        const dayAttendance = attendance?.filter(a => a.date === date) || [];
        const present = dayAttendance.filter(a => a.status === "PRESENT").length;
        const total = dayAttendance.length;
        const percentage = total > 0 ? (present / total) * 100 : 0;

        return {
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          attendance: percentage.toFixed(1),
          classes: total
        };
      });

      setAttendanceTrends(trendData);

    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Failed to load analytics data");
    }
  };

  const fetchStudentData = async (userId: string) => {
    try {
      const { data: studentData } = await supabase
        .from("students")
        .select(`
          *,
          profiles!students_user_id_fkey (name, email)
        `)
        .eq("user_id", userId)
        .single();

      if (!studentData) return;

      const { data: attendance } = await supabase
        .from("attendance")
        .select("*")
        .eq("student_id", studentData.id)
        .order("date", { ascending: false });

      const totalClasses = attendance?.length || 0;
      const presentCount = attendance?.filter(a => a.status === "PRESENT").length || 0;
      const attendancePercentage = totalClasses > 0 ? (presentCount / totalClasses) * 100 : 0;

      setStudentsData([{
        ...studentData,
        totalClasses,
        presentCount,
        attendancePercentage: attendancePercentage.toFixed(2),
        riskLevel: attendancePercentage < 75 ? "HIGH" : attendancePercentage < 85 ? "MEDIUM" : "LOW",
        attendance
      }]);

    } catch (error) {
      console.error("Error fetching student data:", error);
    }
  };

  const fetchParentData = async (parentUserId: string) => {
    try {
      // Get children from parent_student_relation
      const { data: relations } = await supabase
        .from("parent_student_relation")
        .select(`
          student_id,
          students (
            *,
            profiles!students_user_id_fkey (name, email)
          )
        `)
        .eq("parent_id", parentUserId);

      if (!relations || relations.length === 0) {
        toast.info("No student records linked to your account");
        return;
      }

      const childrenData = await Promise.all(
        relations.map(async (rel: any) => {
          const student = rel.students;
          const { data: attendance } = await supabase
            .from("attendance")
            .select("*")
            .eq("student_id", student.id);

          const totalClasses = attendance?.length || 0;
          const presentCount = attendance?.filter(a => a.status === "PRESENT").length || 0;
          const attendancePercentage = totalClasses > 0 ? (presentCount / totalClasses) * 100 : 0;

          return {
            ...student,
            totalClasses,
            presentCount,
            attendancePercentage: attendancePercentage.toFixed(2),
            riskLevel: attendancePercentage < 75 ? "HIGH" : attendancePercentage < 85 ? "MEDIUM" : "LOW",
            attendance
          };
        })
      );

      setStudentsData(childrenData);
    } catch (error) {
      console.error("Error fetching parent data:", error);
    }
  };

  const predictStudentPerformance = async (studentId: string) => {
    setPredictingStudent(studentId);
    setAiPrediction(null);

    try {
      const student = studentsData.find(s => s.id === studentId);
      if (!student) return;

      const { data: attendance } = await supabase
        .from("attendance")
        .select("*")
        .eq("student_id", studentId)
        .order("date", { ascending: false });

      const response = await supabase.functions.invoke('predict-student-performance', {
        body: {
          studentData: {
            name: student.profiles?.name || "Unknown",
            course: student.course,
            year: student.year,
            section: student.section
          },
          attendanceData: attendance || []
        }
      });

      if (response.error) throw response.error;

      setAiPrediction(response.data);
      toast.success("AI analysis completed");
    } catch (error: any) {
      console.error("Prediction error:", error);
      toast.error(error.message || "Failed to generate prediction");
    } finally {
      setPredictingStudent(null);
    }
  };

  const exportToCSV = (data: any[], filename: string) => {
    const headers = ["Roll No", "Name", "Course", "Year", "Section", "Total Classes", "Present", "Attendance %", "Risk Level"];
    const csvContent = [
      headers.join(","),
      ...data.map(s => [
        s.roll_number,
        s.profiles?.name || "",
        s.course,
        s.year,
        s.section,
        s.totalClasses,
        s.presentCount,
        s.attendancePercentage,
        s.riskLevel
      ].map(v => `"${v}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Report exported successfully");
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "HIGH": return "destructive";
      case "MEDIUM": return "default";
      case "LOW": return "secondary";
      default: return "default";
    }
  };

  if (roleLoading || loading) {
    return <LoadingSpinner />;
  }

  const pieData = performanceMetrics ? [
    { name: "Low Risk", value: performanceMetrics.lowRiskStudents, color: "hsl(var(--chart-2))" },
    { name: "Medium Risk", value: performanceMetrics.mediumRiskStudents, color: "hsl(var(--chart-3))" },
    { name: "High Risk", value: performanceMetrics.highRiskStudents, color: "hsl(var(--destructive))" }
  ] : [];

  return (
    <div className="min-h-screen bg-background">
      <TopTabs userEmail={user?.email} userName={profile?.name} userRole={role} />
      <main className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold gradient-primary bg-clip-text text-transparent">Analytics Dashboard</h1>
            <p className="text-muted-foreground mt-2">AI-powered performance insights and predictions</p>
          </div>
          {(role === "ADMIN" || role === "FACULTY") && (
            <Button onClick={() => exportToCSV(studentsData, "analytics_report.csv")} className="gap-2">
              <Download className="h-4 w-4" />
              Export Report
            </Button>
          )}
        </div>

        {/* Admin/Faculty View */}
        {(role === "ADMIN" || role === "FACULTY") && performanceMetrics && (
          <>
            {/* Overview Cards */}
            <div className="grid gap-6 md:grid-cols-4">
              <Card className="hover-lift">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{performanceMetrics.totalStudents}</div>
                </CardContent>
              </Card>

              <Card className="hover-lift">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Avg Attendance</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{performanceMetrics.averageAttendance}%</div>
                  <p className="text-xs text-muted-foreground mt-1">Overall average</p>
                </CardContent>
              </Card>

              <Card className="hover-lift border-destructive/50">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">High Risk</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-destructive">{performanceMetrics.highRiskStudents}</div>
                  <p className="text-xs text-muted-foreground mt-1">Below 75% attendance</p>
                </CardContent>
              </Card>

              <Card className="hover-lift border-yellow-500/50">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Medium Risk</CardTitle>
                  <TrendingDown className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-yellow-600">{performanceMetrics.mediumRiskStudents}</div>
                  <p className="text-xs text-muted-foreground mt-1">75-85% attendance</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="hover-lift">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Attendance Trends (30 Days)
                  </CardTitle>
                  <CardDescription>Daily attendance percentage</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={attendanceTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--foreground))" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px"
                        }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="attendance" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        name="Attendance %"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="hover-lift">
                <CardHeader>
                  <CardTitle>Risk Distribution</CardTitle>
                  <CardDescription>Students by risk category</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Student List with AI Predictions */}
            <Card className="hover-lift">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  AI Performance Analysis
                </CardTitle>
                <CardDescription>Select a student to generate AI-powered predictions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={selectedStudent} onValueChange={(value) => {
                  setSelectedStudent(value);
                  setAiPrediction(null);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select student..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {studentsData.map(student => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.profiles?.name} - {student.roll_number} ({student.attendancePercentage}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedStudent && (
                  <div className="space-y-4">
                    {studentsData.filter(s => s.id === selectedStudent).map(student => (
                      <div key={student.id} className="p-4 rounded-lg bg-muted/50 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-lg">{student.profiles?.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {student.course} • Year {student.year} • Section {student.section}
                            </p>
                          </div>
                          <Badge variant={getRiskColor(student.riskLevel) as any}>
                            {student.riskLevel} RISK
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Total Classes</p>
                            <p className="font-bold">{student.totalClasses}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Present</p>
                            <p className="font-bold text-green-600">{student.presentCount}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Attendance</p>
                            <p className="font-bold">{student.attendancePercentage}%</p>
                          </div>
                        </div>
                        <Button 
                          onClick={() => predictStudentPerformance(student.id)}
                          disabled={predictingStudent === student.id}
                          className="w-full gap-2"
                        >
                          <Brain className="h-4 w-4" />
                          {predictingStudent === student.id ? "Analyzing..." : "Generate AI Prediction"}
                        </Button>
                      </div>
                    ))}

                    {aiPrediction && (
                      <Alert className="border-primary">
                        <Brain className="h-4 w-4" />
                        <AlertDescription className="space-y-3 mt-2">
                          <div>
                            <h4 className="font-semibold mb-2">AI Analysis Results</h4>
                            <div className="space-y-2">
                              <div>
                                <Badge variant={getRiskColor(aiPrediction.riskLevel) as any}>
                                  {aiPrediction.riskLevel} RISK
                                </Badge>
                              </div>
                              
                              {aiPrediction.issues && (
                                <div>
                                  <p className="font-medium text-sm">Key Issues:</p>
                                  <ul className="list-disc list-inside text-sm text-muted-foreground">
                                    {Array.isArray(aiPrediction.issues) ? 
                                      aiPrediction.issues.map((issue: string, i: number) => (
                                        <li key={i}>{issue}</li>
                                      )) : <li>{aiPrediction.issues}</li>
                                    }
                                  </ul>
                                </div>
                              )}
                              
                              {aiPrediction.recommendations && (
                                <div>
                                  <p className="font-medium text-sm">Recommendations:</p>
                                  <ul className="list-disc list-inside text-sm text-muted-foreground">
                                    {Array.isArray(aiPrediction.recommendations) ? 
                                      aiPrediction.recommendations.map((rec: string, i: number) => (
                                        <li key={i}>{rec}</li>
                                      )) : <li>{aiPrediction.recommendations}</li>
                                    }
                                  </ul>
                                </div>
                              )}
                              
                              {aiPrediction.mentorFeedback && (
                                <div className="mt-3 p-3 bg-muted rounded-lg">
                                  <p className="font-medium text-sm mb-1">Mentor Feedback:</p>
                                  <p className="text-sm">{aiPrediction.mentorFeedback}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Student/Parent View */}
        {(role === "STUDENT" || role === "PARENT") && studentsData.length > 0 && (
          <div className="space-y-6">
            {studentsData.map(student => (
              <Card key={student.id} className="hover-lift">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{student.profiles?.name}</CardTitle>
                      <CardDescription>
                        {student.course} • Year {student.year} • Section {student.section}
                      </CardDescription>
                    </div>
                    <Badge variant={getRiskColor(student.riskLevel) as any}>
                      {student.riskLevel} RISK
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 rounded-lg bg-muted">
                      <p className="text-2xl font-bold">{student.totalClasses}</p>
                      <p className="text-sm text-muted-foreground">Total Classes</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-green-100 dark:bg-green-900/20">
                      <p className="text-2xl font-bold text-green-700 dark:text-green-400">{student.presentCount}</p>
                      <p className="text-sm text-muted-foreground">Present</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-primary/10">
                      <p className="text-2xl font-bold text-primary">{student.attendancePercentage}%</p>
                      <p className="text-sm text-muted-foreground">Attendance</p>
                    </div>
                  </div>

                  {student.riskLevel !== "LOW" && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        {student.riskLevel === "HIGH" 
                          ? "Warning: Attendance below 75%. Please attend classes regularly to avoid academic issues."
                          : "Caution: Attendance between 75-85%. Try to improve attendance to stay on track."
                        }
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {studentsData.length === 0 && !loading && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No data available</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}