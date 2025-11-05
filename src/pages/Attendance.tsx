import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TopTabs } from "@/components/layout/TopTabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, Save, AlertTriangle } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Progress } from "@/components/ui/progress";

export default function Attendance() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [attendanceData, setAttendanceData] = useState<any>({});
  
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setUser(session.user);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      if (profileData.role === "STUDENT") {
        fetchStudentAttendance(session.user.id);
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      navigate("/auth");
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentAttendance = async (userId: string) => {
    try {
      const { data: studentData } = await supabase
        .from("students")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (studentData) {
        const { data: attendanceRecords, count } = await supabase
          .from("attendance")
          .select("*", { count: "exact" })
          .eq("student_id", studentData.id)
          .order("date", { ascending: false });

        const presentCount = attendanceRecords?.filter(a => a.status === "PRESENT").length || 0;
        const attendancePercentage = count ? Math.round((presentCount / count) * 100) : 0;
        
        setStudents([{
          id: studentData.id,
          attendanceRecords: attendanceRecords || [],
          attendancePercentage,
          presentCount,
          totalCount: count || 0,
        }]);
      }
    } catch (error: any) {
      console.error("Error fetching student attendance:", error);
    }
  };

  const fetchStudents = async () => {
    if (!selectedCourse || !selectedYear || !selectedSection) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from("students")
        .select(`
          *,
          profiles:user_id (
            name,
            email
          )
        `)
        .eq("course", selectedCourse)
        .eq("year", parseInt(selectedYear))
        .eq("section", selectedSection);

      if (error) throw error;
      setStudents(data || []);

      // Initialize attendance data
      const initData: any = {};
      data?.forEach((student) => {
        initData[student.id] = "PRESENT";
      });
      setAttendanceData(initData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (profile?.role === "FACULTY" || profile?.role === "ADMIN") {
      fetchStudents();
    }
  }, [selectedCourse, selectedYear, selectedSection, profile]);

  const handleAttendanceChange = (studentId: string, status: string) => {
    setAttendanceData((prev: any) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleSaveAttendance = async () => {
    if (!selectedSubject) {
      toast({
        title: "Error",
        description: "Please select a subject",
        variant: "destructive",
      });
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

      toast({
        title: "Success",
        description: "Attendance saved successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-background">
      <TopTabs userEmail={user?.email} userName={profile?.name} userRole={profile?.role} />
      <main className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Attendance Management</h1>
          <p className="text-muted-foreground">Mark and track student attendance</p>
        </div>

        {(profile?.role === "FACULTY" || profile?.role === "ADMIN") && (
          <>
            <Card className="mb-6 glass-effect">
              <CardHeader>
                <CardTitle>Select Class & Subject</CardTitle>
                <CardDescription>Choose the class and subject to mark attendance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label>Course</Label>
                    <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select course" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="B.Tech">B.Tech</SelectItem>
                        <SelectItem value="M.Tech">M.Tech</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Year</Label>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
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
                      <SelectTrigger>
                        <SelectValue placeholder="Select section" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">Section A</SelectItem>
                        <SelectItem value="B">Section B</SelectItem>
                        <SelectItem value="C">Section C</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Subject</Label>
                    <Input
                      placeholder="Enter subject name"
                      value={selectedSubject}
                      onChange={(e) => setSelectedSubject(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {selectedCourse && selectedYear && selectedSection && students.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Mark Attendance</CardTitle>
                    <CardDescription>{students.length} students in {selectedCourse} - {selectedSection} Year {selectedYear}</CardDescription>
                  </div>
                  <Button onClick={handleSaveAttendance} className="gradient-primary">
                    <Save className="mr-2 h-4 w-4" />
                    Save Attendance
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {students.map((student) => (
                      <div
                        key={student.id}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg glass-effect gap-3"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{student.profiles?.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Roll: {student.roll_number}
                          </p>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            variant={attendanceData[student.id] === "PRESENT" ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleAttendanceChange(student.id, "PRESENT")}
                            className="flex-1 sm:flex-none"
                          >
                            <CheckCircle className="mr-1 h-4 w-4" />
                            Present
                          </Button>
                          <Button
                            variant={attendanceData[student.id] === "ABSENT" ? "destructive" : "outline"}
                            size="sm"
                            onClick={() => handleAttendanceChange(student.id, "ABSENT")}
                            className="flex-1 sm:flex-none"
                          >
                            <XCircle className="mr-1 h-4 w-4" />
                            Absent
                          </Button>
                          <Button
                            variant={attendanceData[student.id] === "LATE" ? "secondary" : "outline"}
                            size="sm"
                            onClick={() => handleAttendanceChange(student.id, "LATE")}
                            className="flex-1 sm:flex-none"
                          >
                            <Clock className="mr-1 h-4 w-4" />
                            Late
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {(!selectedCourse || !selectedYear || !selectedSection || students.length === 0) && (
              <Card className="glass-effect">
                <CardContent className="py-12">
                  <p className="text-center text-muted-foreground">
                    Select class details above to load students and mark attendance
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {profile?.role === "STUDENT" && students.length > 0 && (
          <div className="space-y-6">
            <Card className="glass-effect">
              <CardHeader>
                <CardTitle>My Attendance Overview</CardTitle>
                <CardDescription>Track your attendance percentage</CardDescription>
              </CardHeader>
              <CardContent>
                {students[0] && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold">
                          {students[0].attendancePercentage}%
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {students[0].presentCount} / {students[0].totalCount} days present
                        </p>
                      </div>
                      {students[0].attendancePercentage < 75 ? (
                        <AlertTriangle className="h-12 w-12 text-destructive" />
                      ) : (
                        <CheckCircle className="h-12 w-12 text-green-600" />
                      )}
                    </div>
                    <Progress value={students[0].attendancePercentage} className="h-3" />
                    {students[0].attendancePercentage < 75 && (
                      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                        <p className="text-sm font-medium text-destructive">
                          ⚠️ Warning: Your attendance is below 75%
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          You need to improve your attendance to meet the minimum requirement.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="glass-effect">
              <CardHeader>
                <CardTitle>Attendance History</CardTitle>
                <CardDescription>Your recent attendance records</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {students[0]?.attendanceRecords?.slice(0, 10).map((record: any) => (
                    <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{record.subject}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(record.date).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant={
                        record.status === "PRESENT" ? "default" :
                        record.status === "LATE" ? "secondary" : "destructive"
                      }>
                        {record.status}
                      </Badge>
                    </div>
                  ))}
                  {students[0]?.attendanceRecords?.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No attendance records yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
