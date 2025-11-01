import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TopTabs } from "@/components/layout/TopTabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";

export default function Reports() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

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

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      setProfile(profileData);
      
      // Fetch data for reports
      if (profileData?.role === "ADMIN" || profileData?.role === "FACULTY") {
        fetchAttendance();
        fetchStudents();
      } else if (profileData?.role === "STUDENT") {
        fetchStudentAttendance(session.user.id);
      }
    } catch (error) {
      console.error("Auth error:", error);
      navigate("/auth");
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async () => {
    try {
      const { data, error } = await supabase
        .from("attendance")
        .select(`
          *,
          students (
            roll_number,
            course,
            section,
            year,
            profiles (name)
          )
        `)
        .order("date", { ascending: false });

      if (error) throw error;
      setAttendance(data || []);
    } catch (error) {
      console.error("Error fetching attendance:", error);
    }
  };

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from("students")
        .select(`
          *,
          profiles (name, email)
        `)
        .order("roll_number");

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  };

  const fetchStudentAttendance = async (userId: string) => {
    try {
      const { data: studentData } = await supabase
        .from("students")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (!studentData) return;

      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("student_id", studentData.id)
        .order("date", { ascending: false });

      if (error) throw error;
      setAttendance(data || []);
    } catch (error) {
      console.error("Error fetching student attendance:", error);
    }
  };

  const exportToCSV = (data: any[], filename: string, headers: string[]) => {
    const csvContent = [
      headers.join(","),
      ...data.map(row => headers.map(h => {
        const value = h.split(".").reduce((obj, key) => obj?.[key], row);
        return `"${value || ""}"`;
      }).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("CSV exported successfully");
  };

  const exportAttendanceCSV = () => {
    if (profile?.role === "STUDENT") {
      exportToCSV(
        attendance,
        "my_attendance.csv",
        ["date", "subject", "status"]
      );
    } else {
      exportToCSV(
        attendance,
        "attendance_report.csv",
        ["date", "subject", "status", "students.roll_number", "students.profiles.name", "students.course", "students.section"]
      );
    }
  };

  const exportStudentCSV = () => {
    exportToCSV(
      students,
      "students_report.csv",
      ["roll_number", "profiles.name", "profiles.email", "course", "section", "year"]
    );
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <TopTabs userEmail={user?.email} userName={profile?.name} userRole={profile?.role} />
      <main className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground">Generate and download reports</p>
        </div>

        {(profile?.role === "ADMIN" || profile?.role === "FACULTY") && (
          <div className="grid gap-6 md:grid-cols-2 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Attendance Report</CardTitle>
                <CardDescription>Download attendance data as CSV</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={exportAttendanceCSV}>
                  <Download className="mr-2 h-4 w-4" />
                  Export Attendance CSV
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Student Report</CardTitle>
                <CardDescription>Download student data as CSV</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={exportStudentCSV}>
                  <Download className="mr-2 h-4 w-4" />
                  Export Student CSV
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {profile?.role === "STUDENT" && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>My Attendance</CardTitle>
              <CardDescription>View and export your attendance records</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Button onClick={exportAttendanceCSV}>
                  <Download className="mr-2 h-4 w-4" />
                  Export My Attendance
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendance.slice(0, 10).map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                      <TableCell>{record.subject}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            record.status === "PRESENT"
                              ? "bg-green-100 text-green-800"
                              : record.status === "ABSENT"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {record.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {attendance.length > 10 && (
                <p className="text-sm text-muted-foreground mt-4 text-center">
                  Showing recent 10 records. Export CSV for full data.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {(profile?.role === "ADMIN" || profile?.role === "FACULTY") && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Attendance Records</CardTitle>
              <CardDescription>Latest attendance entries</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Roll No</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendance.slice(0, 10).map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                      <TableCell>{record.students?.roll_number}</TableCell>
                      <TableCell>{record.students?.profiles?.name}</TableCell>
                      <TableCell>{record.subject}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            record.status === "PRESENT"
                              ? "bg-green-100 text-green-800"
                              : record.status === "ABSENT"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {record.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
