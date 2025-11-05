import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TopTabs } from "@/components/layout/TopTabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, FileText, Bell, Link as LinkIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAnnouncementNotifications } from "@/hooks/useAnnouncementNotifications";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function ParentDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Enable announcement notifications
  useAnnouncementNotifications(user?.id);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [studentEmail, setStudentEmail] = useState("");

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

      if (profileData?.role !== "PARENT") {
        navigate("/dashboard");
        return;
      }

      await fetchChildren(session.user.id);
    } catch (error: any) {
      console.error("Auth error:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchChildren = async (parentId: string) => {
    const { data: relations } = await supabase
      .from("parent_student_relation")
      .select(`
        *,
        students:student_id (
          *,
          profiles:user_id (name, email)
        )
      `)
      .eq("parent_id", parentId);

    if (relations) {
      const childrenData = await Promise.all(
        relations.map(async (rel: any) => {
          const student = rel.students;
          
          // Fetch attendance stats
          const { data: attendance, count } = await supabase
            .from("attendance")
            .select("*", { count: "exact" })
            .eq("student_id", student.id);

          const presentCount = attendance?.filter(a => a.status === "PRESENT").length || 0;
          const attendancePercentage = count ? Math.round((presentCount / count) * 100) : 0;

          // Fetch leave requests
          const { count: leaveCount } = await supabase
            .from("leave_requests")
            .select("*", { count: "exact", head: true })
            .eq("student_id", student.id)
            .eq("status", "PENDING");

          return {
            ...student,
            attendancePercentage,
            presentDays: presentCount,
            totalDays: count || 0,
            pendingLeaves: leaveCount || 0,
          };
        })
      );

      setChildren(childrenData);
    }
  };

  const handleLinkStudent = async () => {
    if (!studentEmail) {
      toast({
        title: "Error",
        description: "Please enter student email",
        variant: "destructive",
      });
      return;
    }

    try {
      // Find student by email
      const { data: studentProfile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", studentEmail)
        .eq("role", "STUDENT")
        .maybeSingle();

      if (profileError || !studentProfile) {
        toast({
          title: "Error",
          description: "Student not found with this email",
          variant: "destructive",
        });
        return;
      }

      // Get student record
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("id")
        .eq("user_id", studentProfile.id)
        .maybeSingle();

      if (studentError || !studentData) {
        toast({
          title: "Error",
          description: "Student record not found",
          variant: "destructive",
        });
        return;
      }

      // Create parent-student relation
      const { error: relationError } = await supabase
        .from("parent_student_relation")
        .insert({
          parent_id: user.id,
          student_id: studentData.id,
          relation_type: "PARENT",
        });

      if (relationError) throw relationError;

      toast({
        title: "Success",
        description: "Student linked successfully",
      });

      setStudentEmail("");
      setDialogOpen(false);
      fetchChildren(user.id);
    } catch (error: any) {
      console.error("Error linking student:", error);
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
    <div className="min-h-screen bg-gradient-to-br from-background to-purple-50/30 dark:to-purple-950/10">
      <TopTabs
        userEmail={user?.email}
        userName={profile?.name}
        userRole={profile?.role}
      />
      <main className="container mx-auto p-4 md:p-6">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              Parent Dashboard
            </h1>
            <p className="text-muted-foreground">
              Monitor your child's academic progress
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <LinkIcon className="mr-2 h-4 w-4" />
                Link Student
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Link Student Account</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Student Email</Label>
                  <Input
                    type="email"
                    value={studentEmail}
                    onChange={(e) => setStudentEmail(e.target.value)}
                    placeholder="student@example.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the registered email address of your child's student account
                  </p>
                </div>
                <Button onClick={handleLinkStudent} className="w-full">
                  Link Student
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {children.length === 0 ? (
          <Card className="shadow-lg">
            <CardContent className="py-12 text-center">
              <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Children Linked</h3>
              <p className="text-muted-foreground mb-6">
                Please contact the administrator to link your child's account
              </p>
              <Button onClick={() => navigate("/settings")}>Go to Settings</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {children.map((child) => {
              const attendanceColor = child.attendancePercentage >= 75 ? "text-green-600" : "text-destructive";
              
              return (
                <Card key={child.id} className="shadow-lg border-l-4 border-l-purple-500">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{child.profiles?.name}</span>
                      <span className="text-sm font-normal text-muted-foreground">
                        Roll No: {child.roll_number}
                      </span>
                    </CardTitle>
                    <CardDescription>
                      {child.course} - Year {child.year} | Section {child.section}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-3 mb-4">
                      <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Attendance</span>
                          <TrendingUp className={`h-4 w-4 ${attendanceColor}`} />
                        </div>
                        <div className={`text-2xl font-bold ${attendanceColor}`}>
                          {child.attendancePercentage}%
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {child.presentDays} / {child.totalDays} days
                        </p>
                      </div>

                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Leave Requests</span>
                          <FileText className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="text-2xl font-bold text-blue-600">
                          {child.pendingLeaves}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Pending approval</p>
                      </div>

                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Notifications</span>
                          <Bell className="h-4 w-4 text-purple-600" />
                        </div>
                        <div className="text-2xl font-bold text-purple-600">0</div>
                        <p className="text-xs text-muted-foreground mt-1">New updates</p>
                      </div>
                    </div>

                    <div className="flex gap-3 flex-wrap">
                      <Button size="sm" variant="outline">View Attendance</Button>
                      <Button size="sm" variant="outline">View Timetable</Button>
                      <Button size="sm" variant="outline">View Announcements</Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
