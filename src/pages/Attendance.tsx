import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, Save, AlertTriangle, CalendarDays, Users } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Progress } from "@/components/ui/progress";

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function Attendance() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { role, loading: roleLoading, userId } = useUserRole();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [attendanceData, setAttendanceData] = useState<any>({});
  
  const [courses, setCourses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  // Student view: grouped attendance by day
  const [studentAttendanceRecords, setStudentAttendanceRecords] = useState<any[]>([]);
  const [studentStats, setStudentStats] = useState({ percentage: 0, present: 0, total: 0 });

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!roleLoading && role === "STUDENT" && userId) {
      fetchStudentAttendance(userId);
    }
  }, [role, roleLoading, userId]);

  const fetchDropdownData = async () => {
    const [coursesRes, sectionsRes, subjectsRes] = await Promise.all([
      supabase.from("courses").select("*").order("name"),
      supabase.from("sections").select("*").order("name"),
      supabase.from("subjects").select("*").order("name"),
    ]);
    setCourses(coursesRes.data || []);
    setSections(sectionsRes.data || []);
    setSubjects(subjectsRes.data || []);
  };

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }
      setUser(session.user);
      const { data: profileData, error: profileError } = await supabase
        .from("profiles").select("*").eq("id", session.user.id).single();
      if (profileError) throw profileError;
      setProfile(profileData);
      await fetchDropdownData();
    } catch (error: any) {
      console.error("Auth error:", error);
      navigate("/auth");
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentAttendance = async (userIdParam: string) => {
    try {
      const { data: studentData } = await supabase
        .from("students").select("id").eq("user_id", userIdParam).maybeSingle();
      if (!studentData) return;

      const { data: attendanceRecords, count } = await supabase
        .from("attendance")
        .select("*", { count: "exact" })
        .eq("student_id", studentData.id)
        .order("date", { ascending: false });

      const records = attendanceRecords || [];
      const presentCount = records.filter(a => a.status === "PRESENT").length;
      const lateCount = records.filter(a => a.status === "LATE").length;
      const total = count || 0;
      // Cap percentage at 100%
      const percentage = total > 0 ? Math.min(100, Math.round(((presentCount + lateCount) / total) * 100)) : 0;

      setStudentAttendanceRecords(records);
      setStudentStats({ percentage, present: presentCount + lateCount, total });
    } catch (error: any) {
      console.error("Error fetching student attendance:", error);
    }
  };

  const fetchStudents = async () => {
    if (!selectedCourse || !selectedYear || !selectedSection) return;
    try {
      const { data, error } = await supabase
        .from("students")
        .select(`*, profiles:user_id (name, email)`)
        .eq("course", selectedCourse)
        .eq("year", parseInt(selectedYear))
        .eq("section", selectedSection)
        .order("roll_number");
      if (error) throw error;
      setStudents(data || []);

      if (selectedDate && data && data.length > 0) {
        const { data: existingAttendance } = await supabase
          .from("attendance")
          .select("student_id, status")
          .eq("date", selectedDate)
          .eq("subject", selectedSubject)
          .in("student_id", data.map(s => s.id));

        const initData: any = {};
        data.forEach((student) => {
          const existing = existingAttendance?.find(a => a.student_id === student.id);
          initData[student.id] = existing?.status || "PRESENT";
        });
        setAttendanceData(initData);
      } else {
        const initData: any = {};
        data?.forEach((student) => { initData[student.id] = "PRESENT"; });
        setAttendanceData(initData);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  useEffect(() => {
    if (!roleLoading && (role === "FACULTY" || role === "ADMIN")) {
      fetchStudents();
    }
  }, [selectedCourse, selectedYear, selectedSection, selectedDate, selectedSubject, role, roleLoading]);

  const handleAttendanceChange = (studentId: string, status: string) => {
    setAttendanceData((prev: any) => ({ ...prev, [studentId]: status }));
  };

  const handleSaveAttendance = async () => {
    if (!selectedSubject) {
      toast({ title: "Error", description: "Please select a subject", variant: "destructive" });
      return;
    }
    try {
      const records = Object.entries(attendanceData).map(([studentId, status]) => ({
        student_id: studentId,
        subject: selectedSubject,
        date: selectedDate,
        status: status as "PRESENT" | "ABSENT" | "LATE",
        marked_by: user.id,
      }));
      const { error } = await supabase
        .from("attendance")
        .upsert(records, { onConflict: "student_id,subject,date" });
      if (error) throw error;
      toast({ title: "Success", description: "Attendance saved successfully" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Group student records by date for day-wise view
  const groupedByDate = studentAttendanceRecords.reduce((acc: any, record: any) => {
    const dateKey = record.date;
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(record);
    return acc;
  }, {});

  const today = new Date();
  const todayDayName = DAYS_OF_WEEK[today.getDay()];
  const selectedDateObj = new Date(selectedDate + "T00:00:00");
  const selectedDayName = DAYS_OF_WEEK[selectedDateObj.getDay()];

  // Count present/absent/late for teacher view
  const presentCount = Object.values(attendanceData).filter(s => s === "PRESENT").length;
  const absentCount = Object.values(attendanceData).filter(s => s === "ABSENT").length;
  const lateCount = Object.values(attendanceData).filter(s => s === "LATE").length;

  if (loading || roleLoading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-background">
      <TopTabs userEmail={user?.email} userName={profile?.name} userRole={role || undefined} />
      <main className="container mx-auto p-4 md:p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Attendance Management</h1>
          <p className="text-muted-foreground">
            {todayDayName}, {today.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>

        {/* ─── FACULTY / ADMIN VIEW ─── */}
        {(role === "FACULTY" || role === "ADMIN") && (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  Select Class & Subject
                </CardTitle>
                <CardDescription>Choose the class details for {selectedDayName}'s attendance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label>Course</Label>
                    <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                      <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                      <SelectContent>
                        {courses.map((c) => (
                          <SelectItem key={c.id} value={c.name}>{c.name} ({c.code})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Year</Label>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1st Year</SelectItem>
                        <SelectItem value="2">2nd Year</SelectItem>
                        <SelectItem value="3">3rd Year</SelectItem>
                        <SelectItem value="4">4th Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Section</Label>
                    <Select value={selectedSection} onValueChange={setSelectedSection}>
                      <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
                      <SelectContent>
                        {sections.map((s) => (
                          <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Subject</Label>
                    <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                      <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                      <SelectContent>
                        {subjects.map((s) => (
                          <SelectItem key={s.id} value={s.name}>{s.name} ({s.code})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Date</Label>
                    <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Summary bar */}
            {selectedCourse && selectedYear && selectedSection && students.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-4">
                <Card className="border-l-4 border-l-green-500">
                  <CardContent className="p-4 flex items-center gap-3">
                    <CheckCircle className="h-8 w-8 text-green-500" />
                    <div>
                      <p className="text-2xl font-bold text-foreground">{presentCount}</p>
                      <p className="text-xs text-muted-foreground">Present</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-red-500">
                  <CardContent className="p-4 flex items-center gap-3">
                    <XCircle className="h-8 w-8 text-red-500" />
                    <div>
                      <p className="text-2xl font-bold text-foreground">{absentCount}</p>
                      <p className="text-xs text-muted-foreground">Absent</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-yellow-500">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Clock className="h-8 w-8 text-yellow-500" />
                    <div>
                      <p className="text-2xl font-bold text-foreground">{lateCount}</p>
                      <p className="text-xs text-muted-foreground">Late</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {selectedCourse && selectedYear && selectedSection && students.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      Mark Attendance — {selectedDayName}
                    </CardTitle>
                    <CardDescription>
                      {students.length} students · {selectedCourse} - {selectedSection} · Year {selectedYear}
                    </CardDescription>
                  </div>
                  <Button onClick={handleSaveAttendance} className="gradient-primary">
                    <Save className="mr-2 h-4 w-4" />
                    Save
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {students.map((student, idx) => {
                      const status = attendanceData[student.id];
                      const borderColor = status === "PRESENT"
                        ? "border-l-green-500 bg-green-50 dark:bg-green-950/20"
                        : status === "ABSENT"
                        ? "border-l-red-500 bg-red-50 dark:bg-red-950/20"
                        : "border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20";

                      return (
                        <div
                          key={student.id}
                          className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border-l-4 rounded-lg transition-all duration-200 ${borderColor}`}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <span className="text-xs font-mono text-muted-foreground w-6 text-center">{idx + 1}</span>
                            <div>
                              <p className="font-medium text-foreground">{student.profiles?.name}</p>
                              <p className="text-xs text-muted-foreground">Roll: {student.roll_number}</p>
                            </div>
                          </div>
                          <div className="flex gap-1.5 mt-2 sm:mt-0">
                            <Button
                              variant={status === "PRESENT" ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleAttendanceChange(student.id, "PRESENT")}
                              className={status === "PRESENT" ? "bg-green-600 hover:bg-green-700 text-white border-0" : ""}
                            >
                              <CheckCircle className="mr-1 h-3.5 w-3.5" />
                              P
                            </Button>
                            <Button
                              variant={status === "ABSENT" ? "destructive" : "outline"}
                              size="sm"
                              onClick={() => handleAttendanceChange(student.id, "ABSENT")}
                            >
                              <XCircle className="mr-1 h-3.5 w-3.5" />
                              A
                            </Button>
                            <Button
                              variant={status === "LATE" ? "secondary" : "outline"}
                              size="sm"
                              onClick={() => handleAttendanceChange(student.id, "LATE")}
                              className={status === "LATE" ? "bg-yellow-500 hover:bg-yellow-600 text-white border-0" : ""}
                            >
                              <Clock className="mr-1 h-3.5 w-3.5" />
                              L
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedCourse && selectedYear && selectedSection && students.length === 0 && (
              <Card>
                <CardContent className="py-12">
                  <p className="text-center text-muted-foreground">No students found in this class.</p>
                </CardContent>
              </Card>
            )}
            
            {(!selectedCourse || !selectedYear || !selectedSection) && (
              <Card>
                <CardContent className="py-12 text-center">
                  <CalendarDays className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-muted-foreground">Select class details above to load students</p>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* ─── STUDENT VIEW ─── */}
        {role === "STUDENT" && (
          <div className="space-y-6">
            {/* Overview Card */}
            <Card>
              <CardHeader>
                <CardTitle>My Attendance Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-4xl font-bold text-foreground">
                      {studentStats.percentage}%
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {studentStats.present} / {studentStats.total} classes attended
                    </p>
                  </div>
                  {studentStats.percentage < 75 ? (
                    <div className="flex flex-col items-center">
                      <AlertTriangle className="h-10 w-10 text-red-500" />
                      <span className="text-xs text-red-500 font-medium mt-1">Low</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <CheckCircle className="h-10 w-10 text-green-500" />
                      <span className="text-xs text-green-500 font-medium mt-1">Good</span>
                    </div>
                  )}
                </div>
                <Progress
                  value={studentStats.percentage}
                  className={`h-3 ${studentStats.percentage < 75 ? "[&>div]:bg-red-500" : "[&>div]:bg-green-500"}`}
                />
                {studentStats.percentage < 75 && (
                  <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
                    <p className="text-sm font-medium text-red-600 dark:text-red-400">
                      ⚠️ Your attendance is below 75%. Improve it to meet the minimum requirement.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Day-wise attendance history */}
            <Card>
              <CardHeader>
                <CardTitle>Attendance History — Day Wise</CardTitle>
                <CardDescription>Your recent records grouped by date</CardDescription>
              </CardHeader>
              <CardContent>
                {Object.keys(groupedByDate).length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No attendance records yet</p>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(groupedByDate).slice(0, 15).map(([date, records]: [string, any]) => {
                      const dateObj = new Date(date + "T00:00:00");
                      const dayName = DAYS_OF_WEEK[dateObj.getDay()];
                      const allPresent = records.every((r: any) => r.status === "PRESENT" || r.status === "LATE");
                      const anyAbsent = records.some((r: any) => r.status === "ABSENT");

                      return (
                        <div
                          key={date}
                          className={`rounded-lg border-l-4 p-4 transition-all ${
                            anyAbsent
                              ? "border-l-red-500 bg-red-50/50 dark:bg-red-950/10"
                              : "border-l-green-500 bg-green-50/50 dark:bg-green-950/10"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="font-semibold text-foreground">{dayName}</p>
                              <p className="text-xs text-muted-foreground">
                                {dateObj.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                              </p>
                            </div>
                            {allPresent ? (
                              <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border-0">
                                All Present
                              </Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 border-0">
                                Absent
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {records.map((record: any) => (
                              <div
                                key={record.id}
                                className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                                  record.status === "PRESENT"
                                    ? "bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200"
                                    : record.status === "LATE"
                                    ? "bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200"
                                    : "bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200"
                                }`}
                              >
                                {record.subject}: {record.status}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
