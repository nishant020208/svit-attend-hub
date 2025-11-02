import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TopTabs } from "@/components/layout/TopTabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, FileText, TrendingUp, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useAnnouncementNotifications } from "@/hooks/useAnnouncementNotifications";

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [student, setStudent] = useState<any>(null);
  
  // Enable announcement notifications
  useAnnouncementNotifications(user?.id);
  
  const [stats, setStats] = useState({
    attendancePercentage: 0,
    presentDays: 0,
    totalDays: 0,
    pendingLeaves: 0,
    upcomingClasses: 0,
  });
  const [recentAnnouncements, setRecentAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

      if (profileData?.role !== "STUDENT") {
        navigate("/dashboard");
        return;
      }

      const { data: studentData } = await supabase
        .from("students")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      setStudent(studentData);
      
      await Promise.all([
        fetchAttendanceStats(studentData?.id),
        fetchLeaveStats(studentData?.id),
        fetchAnnouncements(),
      ]);
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

  const fetchAttendanceStats = async (studentId: string) => {
    if (!studentId) return;
    
    const { data, count } = await supabase
      .from("attendance")
      .select("*", { count: "exact" })
      .eq("student_id", studentId);

    const presentCount = data?.filter(a => a.status === "PRESENT").length || 0;
    const percentage = count ? Math.round((presentCount / count) * 100) : 0;

    setStats(prev => ({
      ...prev,
      attendancePercentage: percentage,
      presentDays: presentCount,
      totalDays: count || 0,
    }));
  };

  const fetchLeaveStats = async (studentId: string) => {
    if (!studentId) return;
    
    const { count } = await supabase
      .from("leave_requests")
      .select("*", { count: "exact", head: true })
      .eq("student_id", studentId)
      .eq("status", "PENDING");

    setStats(prev => ({ ...prev, pendingLeaves: count || 0 }));
  };

  const fetchAnnouncements = async () => {
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(3);

    setRecentAnnouncements(data || []);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const attendanceColor = stats.attendancePercentage >= 75 ? "text-green-600" : "text-destructive";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <TopTabs
        userEmail={user?.email}
        userName={profile?.name}
        userRole={profile?.role}
      />
      <main className="container mx-auto p-4 md:p-6">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Welcome back, {profile?.first_name || profile?.name}!
          </h1>
          <p className="text-muted-foreground">
            {student?.course} - Year {student?.year} | Section {student?.section} | Roll No: {student?.roll_number}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="bg-card/50 backdrop-blur hover:shadow-lg transition-all border-l-4 border-l-primary">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Attendance</CardTitle>
              <TrendingUp className={`h-5 w-5 ${attendanceColor}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${attendanceColor}`}>{stats.attendancePercentage}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.presentDays} / {stats.totalDays} days present
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur hover:shadow-lg transition-all border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Leaves</CardTitle>
              <FileText className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.pendingLeaves}</div>
              <p className="text-xs text-muted-foreground mt-1">Awaiting approval</p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur hover:shadow-lg transition-all border-l-4 border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Classes</CardTitle>
              <Clock className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">-</div>
              <p className="text-xs text-muted-foreground mt-1">Check timetable</p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur hover:shadow-lg transition-all border-l-4 border-l-orange-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Announcements</CardTitle>
              <AlertCircle className="h-5 w-5 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{recentAnnouncements.length}</div>
              <p className="text-xs text-muted-foreground mt-1">New updates</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions & Announcements */}
        <div className="grid gap-6 lg:grid-cols-2 mb-8">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Quick Actions
              </CardTitle>
              <CardDescription>Access your frequently used features</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Button onClick={() => navigate("/attendance")} className="w-full justify-start">
                View Attendance
              </Button>
              <Button onClick={() => navigate("/leave")} variant="outline" className="w-full justify-start">
                Request Leave
              </Button>
              <Button onClick={() => navigate("/timetable")} variant="outline" className="w-full justify-start">
                View Timetable
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Recent Announcements</CardTitle>
              <CardDescription>Latest updates from faculty</CardDescription>
            </CardHeader>
            <CardContent>
              {recentAnnouncements.length > 0 ? (
                <div className="space-y-4">
                  {recentAnnouncements.map((announcement) => (
                    <div key={announcement.id} className="border-l-2 border-primary pl-4 py-2">
                      <h4 className="font-semibold text-sm">{announcement.title}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-2">{announcement.content}</p>
                    </div>
                  ))}
                  <Button onClick={() => navigate("/announcements")} variant="link" className="w-full">
                    View All Announcements
                  </Button>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No announcements yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
