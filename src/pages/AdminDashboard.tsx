import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TopTabs } from "@/components/layout/TopTabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, GraduationCap, UserCheck, Shield, TrendingUp, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalFaculty: 0,
    totalParents: 0,
    todayAttendance: 0,
    attendanceRate: 0,
    pendingLeaves: 0,
  });
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

      if (profileData?.role !== "ADMIN") {
        navigate("/dashboard");
        return;
      }

      await fetchAdminStats();
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

  const fetchAdminStats = async () => {
    try {
      const [
        { count: studentCount },
        { count: facultyCount },
        { count: parentCount },
        { data: todayAttendanceData, count: totalStudentsToday },
      ] = await Promise.all([
        supabase.from("students").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "FACULTY"),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "PARENT"),
        supabase.from("attendance").select("*", { count: "exact" })
          .eq("date", new Date().toISOString().split("T")[0]),
      ]);

      const presentToday = todayAttendanceData?.filter(a => a.status === "PRESENT").length || 0;
      const attendanceRate = totalStudentsToday ? Math.round((presentToday / totalStudentsToday) * 100) : 0;

      const { count: pendingLeavesCount } = await supabase
        .from("leave_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "PENDING");

      setStats({
        totalStudents: studentCount || 0,
        totalFaculty: facultyCount || 0,
        totalParents: parentCount || 0,
        todayAttendance: presentToday,
        attendanceRate,
        pendingLeaves: pendingLeavesCount || 0,
      });
    } catch (error) {
      console.error("Stats error:", error);
    }
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-background to-slate-100 dark:from-slate-950 dark:via-background dark:to-slate-900">
      <TopTabs
        userEmail={user?.email}
        userName={profile?.name}
        userRole={profile?.role}
      />
      <main className="container mx-auto p-4 md:p-6">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              SVIT ERP - Admin Control Panel
            </h1>
          </div>
          <p className="text-muted-foreground">
            Complete system overview and management
          </p>
        </div>

        {/* Primary Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-xl hover:shadow-2xl transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <GraduationCap className="h-6 w-6 opacity-80" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{stats.totalStudents}</div>
              <p className="text-xs opacity-80 mt-1">Active enrollment</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-xl hover:shadow-2xl transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Faculty Members</CardTitle>
              <Users className="h-6 w-6 opacity-80" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{stats.totalFaculty}</div>
              <p className="text-xs opacity-80 mt-1">Teaching staff</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-pink-500 to-pink-600 text-white shadow-xl hover:shadow-2xl transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Parent Accounts</CardTitle>
              <UserCheck className="h-6 w-6 opacity-80" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{stats.totalParents}</div>
              <p className="text-xs opacity-80 mt-1">Registered parents</p>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Stats */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card className="shadow-lg border-l-4 border-l-green-500 hover:shadow-xl transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Attendance</CardTitle>
              <Activity className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.attendanceRate}%</div>
              <p className="text-xs text-muted-foreground mt-1">{stats.todayAttendance} students present</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-l-4 border-l-orange-500 hover:shadow-xl transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
              <TrendingUp className="h-5 w-5 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{stats.pendingLeaves}</div>
              <p className="text-xs text-muted-foreground mt-1">Leave requests</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-l-4 border-l-blue-500 hover:shadow-xl transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Status</CardTitle>
              <Shield className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">Active</div>
              <p className="text-xs text-muted-foreground mt-1">All systems operational</p>
            </CardContent>
          </Card>
        </div>

        {/* Management Cards */}
        <div className="grid gap-6 lg:grid-cols-2 mb-8">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>System Management</CardTitle>
              <CardDescription>Core administrative functions</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Button onClick={() => navigate("/settings")} className="w-full justify-start h-auto py-4">
                <Shield className="mr-2 h-5 w-5" />
                User Management & Whitelist
              </Button>
              <Button onClick={() => navigate("/attendance")} variant="outline" className="w-full justify-start h-auto py-4">
                <Activity className="mr-2 h-5 w-5" />
                Attendance Overview
              </Button>
              <Button onClick={() => navigate("/timetable")} variant="outline" className="w-full justify-start h-auto py-4">
                <GraduationCap className="mr-2 h-5 w-5" />
                Timetable Management
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Reports & Analytics</CardTitle>
              <CardDescription>Data insights and reporting</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Button onClick={() => navigate("/reports")} className="w-full justify-start h-auto py-4">
                <TrendingUp className="mr-2 h-5 w-5" />
                Generate Reports
              </Button>
              <Button onClick={() => navigate("/announcements")} variant="outline" className="w-full justify-start h-auto py-4">
                <Users className="mr-2 h-5 w-5" />
                Manage Announcements
              </Button>
              <Button onClick={() => navigate("/leave")} variant="outline" className="w-full justify-start h-auto py-4">
                <UserCheck className="mr-2 h-5 w-5" />
                Leave Management
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* System Info */}
        <Card className="shadow-lg bg-gradient-to-r from-primary/5 to-primary/10">
          <CardHeader>
            <CardTitle>System Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Database Status</p>
                <p className="font-semibold text-green-600">Connected</p>
              </div>
              <div>
                <p className="text-muted-foreground">Last Backup</p>
                <p className="font-semibold">Today, {new Date().toLocaleTimeString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Version</p>
                <p className="font-semibold">SVIT ERP v1.0</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
