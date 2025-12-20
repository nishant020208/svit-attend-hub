import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TopTabs } from "@/components/layout/TopTabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ClipboardCheck, FileText, Calendar, Clock, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { FloatingGeometry } from "@/components/ui/FloatingGeometry";

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({
    totalClasses: 0,
    todayClasses: 0,
    pendingLeaves: 0,
    studentsCount: 0,
  });
  const [todaySchedule, setTodaySchedule] = useState<any[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<any[]>([]);
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

      if (profileData?.role !== "FACULTY") {
        navigate("/dashboard");
        return;
      }

      await Promise.all([
        fetchTeacherStats(session.user.id),
        fetchTodaySchedule(session.user.id),
        fetchPendingLeaves(),
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

  const fetchTeacherStats = async (facultyId: string) => {
    const { data: classes, count } = await supabase
      .from("timetable")
      .select("*", { count: "exact" })
      .eq("faculty_id", facultyId);

    const today = new Date().getDay();
    const todayCount = classes?.filter(c => c.day_of_week === today).length || 0;

    const { count: studentCount } = await supabase
      .from("students")
      .select("*", { count: "exact", head: true });

    setStats({
      totalClasses: count || 0,
      todayClasses: todayCount,
      pendingLeaves: 0,
      studentsCount: studentCount || 0,
    });
  };

  const fetchTodaySchedule = async (facultyId: string) => {
    const today = new Date().getDay();
    const { data } = await supabase
      .from("timetable")
      .select("*")
      .eq("faculty_id", facultyId)
      .eq("day_of_week", today)
      .order("start_time");

    setTodaySchedule(data || []);
  };

  const fetchPendingLeaves = async () => {
    const { data, count } = await supabase
      .from("leave_requests")
      .select(`
        *,
        students:student_id (
          roll_number,
          course,
          section,
          profiles:user_id (name)
        )
      `)
      .eq("status", "PENDING")
      .order("created_at", { ascending: false })
      .limit(5);

    setPendingLeaves(data || []);
    setStats(prev => ({ ...prev, pendingLeaves: count || 0 }));
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background">
      <FloatingGeometry variant="minimal" />
      <TopTabs
        userEmail={user?.email}
        userName={profile?.name}
        userRole={profile?.role}
      />
      <main className="container mx-auto p-4 md:p-6">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Faculty Dashboard
          </h1>
          <p className="text-muted-foreground">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {profile?.first_name || profile?.name}!
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20 hover:shadow-xl transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
              <BookOpen className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalClasses}</div>
              <p className="text-xs text-muted-foreground mt-1">Weekly schedule</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20 hover:shadow-xl transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Classes</CardTitle>
              <Clock className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.todayClasses}</div>
              <p className="text-xs text-muted-foreground mt-1">Scheduled for today</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 border-orange-500/20 hover:shadow-xl transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
              <FileText className="h-5 w-5 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.pendingLeaves}</div>
              <p className="text-xs text-muted-foreground mt-1">Leave requests</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20 hover:shadow-xl transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <Users className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.studentsCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Active enrollment</p>
            </CardContent>
          </Card>
        </div>

        {/* Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2 mb-8">
          <Card className="shadow-lg border-t-4 border-t-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Today's Schedule
              </CardTitle>
              <CardDescription>Your classes for today</CardDescription>
            </CardHeader>
            <CardContent>
              {todaySchedule.length > 0 ? (
                <div className="space-y-3">
                  {todaySchedule.map((schedule) => (
                    <div key={schedule.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <div>
                        <p className="font-semibold">{schedule.subject}</p>
                        <p className="text-sm text-muted-foreground">
                          {schedule.course} - Yr {schedule.year} | Sec {schedule.section} | Room {schedule.room}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{schedule.start_time.substring(0, 5)}</p>
                        <p className="text-xs text-muted-foreground">{schedule.end_time.substring(0, 5)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No classes scheduled for today</p>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-lg border-t-4 border-t-orange-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Pending Leave Requests
              </CardTitle>
              <CardDescription>Students awaiting your approval</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingLeaves.length > 0 ? (
                <div className="space-y-3">
                  {pendingLeaves.slice(0, 3).map((leave: any) => (
                    <div key={leave.id} className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold">{leave.students?.profiles?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {leave.students?.course} | Roll: {leave.students?.roll_number}
                          </p>
                        </div>
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">Pending</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{leave.reason.substring(0, 60)}...</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                  <Button onClick={() => navigate("/leave")} variant="outline" className="w-full">
                    View All Requests
                  </Button>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No pending requests</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <Button onClick={() => navigate("/attendance")} className="h-auto py-4">
              Mark Attendance
            </Button>
            <Button onClick={() => navigate("/timetable")} variant="outline" className="h-auto py-4">
              View Timetable
            </Button>
            <Button onClick={() => navigate("/reports")} variant="outline" className="h-auto py-4">
              Generate Reports
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
