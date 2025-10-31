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
import { CheckCircle, XCircle, Clock, Save } from "lucide-react";

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
        .single();

      if (studentData) {
        const { data: attendanceRecords } = await supabase
          .from("attendance")
          .select("*")
          .eq("student_id", studentData.id)
          .order("date", { ascending: false });

        // Process and display student's attendance
        console.log("Student attendance:", attendanceRecords);
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
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
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
            <Card className="mb-6">
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

            {students.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Mark Attendance</CardTitle>
                    <CardDescription>{students.length} students</CardDescription>
                  </div>
                  <Button onClick={handleSaveAttendance}>
                    <Save className="mr-2 h-4 w-4" />
                    Save Attendance
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {students.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{student.profiles?.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Roll: {student.roll_number}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant={attendanceData[student.id] === "PRESENT" ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleAttendanceChange(student.id, "PRESENT")}
                          >
                            <CheckCircle className="mr-1 h-4 w-4" />
                            Present
                          </Button>
                          <Button
                            variant={attendanceData[student.id] === "ABSENT" ? "destructive" : "outline"}
                            size="sm"
                            onClick={() => handleAttendanceChange(student.id, "ABSENT")}
                          >
                            <XCircle className="mr-1 h-4 w-4" />
                            Absent
                          </Button>
                          <Button
                            variant={attendanceData[student.id] === "LATE" ? "secondary" : "outline"}
                            size="sm"
                            onClick={() => handleAttendanceChange(student.id, "LATE")}
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
          </>
        )}

        {profile?.role === "STUDENT" && (
          <Card>
            <CardHeader>
              <CardTitle>My Attendance</CardTitle>
              <CardDescription>View your attendance records</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                Your attendance records will appear here
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
