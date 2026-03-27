import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users, GraduationCap, UserCheck, Shield, TrendingUp, Activity,
  BookOpen, Calendar, Bell, Building2, UserPlus, MessageSquare,
  Plus, Megaphone, ClipboardList, FileText, Clock, AlertTriangle,
  ChevronRight, Zap, BarChart3, Library, UserX
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FloatingGeometry } from "@/components/ui/FloatingGeometry";
import { DashboardMotivation } from "@/components/dashboard/DashboardMotivation";
import { AdminDashboardSkeleton } from "@/components/ui/DashboardSkeleton";
import { useStudentProfile, useAdminStats } from "@/hooks/useDashboardQueries";
import { useUserRole } from "@/hooks/useUserRole";
import {
  useAbsentStudentsToday,
  usePendingLeaveRequests,
  useRecentActivityLogs,
  useLiveAttendanceStats,
  logActivity,
} from "@/hooks/useAdminDashboardData";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { formatDistanceToNow } from "date-fns";
import { AIInsightsPanel } from "@/components/dashboard/AIInsightsPanel";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { role, loading: roleLoading } = useUserRole();
  const [userId, setUserId] = useState<string | undefined>();
  const [authChecked, setAuthChecked] = useState(false);

  const { data: profile, isLoading: profileLoading } = useStudentProfile(userId);
  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const { data: absentStudents } = useAbsentStudentsToday();
  const { data: pendingLeaves } = usePendingLeaveRequests();
  const { data: activityLogs } = useRecentActivityLogs();
  const { data: liveAttendance } = useLiveAttendanceStats();

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { navigate("/auth"); return; }
        setUserId(session.user.id);
        // Log dashboard visit
        logActivity(session.user.id, "viewed_dashboard", {
          userName: session.user.email,
          userRole: "ADMIN",
          entityType: "dashboard",
        });
      } catch (error: any) {
        console.error("Auth error:", error);
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } finally {
        setAuthChecked(true);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!roleLoading && role !== "ADMIN") navigate("/dashboard");
  }, [role, roleLoading, navigate]);

  const isLoading = !authChecked || profileLoading || roleLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-background to-slate-100 dark:from-slate-950 dark:via-background dark:to-slate-900">
        <FloatingGeometry variant="dark" />
        <AdminDashboardSkeleton />
      </div>
    );
  }

  const quickActions = [
    { icon: UserPlus, label: "Add Student", path: "/settings", color: "bg-blue-500" },
    { icon: Megaphone, label: "Create Announcement", path: "/announcements", color: "bg-purple-500" },
    { icon: ClipboardList, label: "Mark Attendance", path: "/attendance", color: "bg-green-500" },
    { icon: FileText, label: "Generate Report", path: "/reports", color: "bg-orange-500" },
  ];

  const getActivityIcon = (action: string) => {
    if (action.includes("login")) return <UserCheck className="h-4 w-4 text-green-500" />;
    if (action.includes("attendance")) return <ClipboardList className="h-4 w-4 text-blue-500" />;
    if (action.includes("announcement")) return <Megaphone className="h-4 w-4 text-purple-500" />;
    if (action.includes("leave")) return <FileText className="h-4 w-4 text-orange-500" />;
    if (action.includes("dashboard")) return <BarChart3 className="h-4 w-4 text-primary" />;
    return <Activity className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <DashboardLayout>
      <div className="relative">
        {/* Header with Notification Bell */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Shield className="h-7 w-7 text-primary" />
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                Admin Dashboard
              </h1>
            </div>
            <p className="text-muted-foreground text-sm">
              Welcome back, {profile?.name || "Admin"}. Here's what's happening today.
            </p>
          </div>
          {userId && (
            <div className="flex items-center gap-2 bg-primary rounded-full px-1">
              <NotificationBell userId={userId} />
            </div>
          )}
        </div>

        {/* Quick Actions Bar */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickActions.map((action) => (
              <Button
                key={action.label}
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2 hover:shadow-md transition-all hover:border-primary/50 group"
                onClick={() => navigate(action.path)}
              >
                <div className={`${action.color} rounded-xl p-2.5 text-white group-hover:scale-110 transition-transform`}>
                  <action.icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium text-foreground">{action.label}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Motivation */}
        <DashboardMotivation />

        {/* Live Stats Row */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-6">
          <Card
            className="cursor-pointer hover:shadow-lg transition-all border-l-4 border-l-blue-500 group"
            onClick={() => navigate("/students")}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Total Students</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {statsLoading ? "..." : stats?.totalStudents || 0}
                  </p>
                </div>
                <div className="bg-blue-500/10 rounded-xl p-2.5">
                  <GraduationCap className="h-5 w-5 text-blue-500" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground group-hover:text-primary transition-colors">
                <span>View details</span>
                <ChevronRight className="h-3 w-3" />
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-lg transition-all border-l-4 border-l-purple-500 group"
            onClick={() => navigate("/settings")}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Faculty Members</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {statsLoading ? "..." : stats?.totalFaculty || 0}
                  </p>
                </div>
                <div className="bg-purple-500/10 rounded-xl p-2.5">
                  <Users className="h-5 w-5 text-purple-500" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground group-hover:text-primary transition-colors">
                <span>Manage</span>
                <ChevronRight className="h-3 w-3" />
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-lg transition-all border-l-4 border-l-green-500 group"
            onClick={() => navigate("/attendance")}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Today's Attendance</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {liveAttendance?.percentage ?? stats?.attendanceRate ?? 0}%
                  </p>
                </div>
                <div className="bg-green-500/10 rounded-xl p-2.5">
                  <Activity className="h-5 w-5 text-green-500" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <span className="text-green-600">{liveAttendance?.present || 0} present</span>
                <span>·</span>
                <span className="text-red-500">{liveAttendance?.absent || 0} absent</span>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-lg transition-all border-l-4 border-l-orange-500 group"
            onClick={() => navigate("/leave")}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Pending Leaves</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {statsLoading ? "..." : stats?.pendingLeaves || 0}
                  </p>
                </div>
                <div className="bg-orange-500/10 rounded-xl p-2.5">
                  <Clock className="h-5 w-5 text-orange-500" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground group-hover:text-primary transition-colors">
                <span>Review requests</span>
                <ChevronRight className="h-3 w-3" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Middle Row: Absent Students + Pending Leaves */}
        <div className="grid gap-4 lg:grid-cols-2 mb-6">
          {/* Absent Students Today */}
          <Card className="shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserX className="h-5 w-5 text-red-500" />
                  <CardTitle className="text-base">Absent Students Today</CardTitle>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {absentStudents?.length || 0}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {absentStudents && absentStudents.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {absentStudents.slice(0, 8).map((record: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30 cursor-pointer transition-colors"
                      onClick={() => navigate(`/student-profile?id=${record.student_id}`)}
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                          <UserX className="h-4 w-4 text-red-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {record.students?.profiles?.name || "Unknown"}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {record.students?.roll_number} · {record.subject}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] text-red-600 border-red-200">
                        Absent
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <UserCheck className="h-10 w-10 mx-auto text-green-400 mb-2" />
                  <p className="text-sm text-muted-foreground">No absences recorded today</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Leave Requests */}
          <Card className="shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-500" />
                  <CardTitle className="text-base">Pending Leave Requests</CardTitle>
                </div>
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/leave")}>
                  View all <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {pendingLeaves && pendingLeaves.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {pendingLeaves.slice(0, 5).map((leave: any) => (
                    <div
                      key={leave.id}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-orange-50 dark:bg-orange-950/20 hover:bg-orange-100 dark:hover:bg-orange-950/30 cursor-pointer transition-colors"
                      onClick={() => navigate("/leave")}
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {leave.students?.profiles?.name || "Unknown"}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {leave.reason?.substring(0, 40)}{leave.reason?.length > 40 ? "..." : ""} · {leave.subject}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-[10px] text-orange-600 border-orange-200">
                          Pending
                        </Badge>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {formatDistanceToNow(new Date(leave.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <FileText className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">No pending leave requests</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row: Activity Feed + Management Navigation */}
        <div className="grid gap-4 lg:grid-cols-5 mb-6">
          {/* Activity Feed */}
          <Card className="shadow-md lg:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Recent Activity</CardTitle>
              </div>
              <CardDescription className="text-xs">Latest system events</CardDescription>
            </CardHeader>
            <CardContent>
              {activityLogs && activityLogs.length > 0 ? (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {activityLogs.map((log: any) => (
                    <div key={log.id} className="flex items-start gap-3">
                      <div className="mt-0.5">{getActivityIcon(log.action)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">
                          <span className="font-medium">{log.user_name || "User"}</span>
                          {" "}
                          <span className="text-muted-foreground">
                            {log.action.replace(/_/g, " ")}
                          </span>
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Activity className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">No recent activity</p>
                  <p className="text-xs text-muted-foreground mt-1">Activity will appear here as users interact with the system</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Management Quick Nav */}
          <Card className="shadow-md lg:col-span-3">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">System Management</CardTitle>
              <CardDescription className="text-xs">Quick access to all modules</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { icon: Building2, label: "Course Structure", path: "/course-structure", color: "text-blue-500" },
                  { icon: UserPlus, label: "Student Assign", path: "/student-assign", color: "text-indigo-500" },
                  { icon: Users, label: "Parent Links", path: "/parent-links", color: "text-pink-500" },
                  { icon: Shield, label: "User Whitelist", path: "/settings", color: "text-amber-500" },
                  { icon: BookOpen, label: "Courses", path: "/courses", color: "text-teal-500" },
                  { icon: Calendar, label: "Timetable", path: "/timetable", color: "text-cyan-500" },
                  { icon: Megaphone, label: "Announcements", path: "/announcements", color: "text-purple-500" },
                  { icon: MessageSquare, label: "Feedback", path: "/feedback", color: "text-rose-500" },
                  { icon: TrendingUp, label: "Results", path: "/results", color: "text-emerald-500" },
                  { icon: Library, label: "Library", path: "/library", color: "text-violet-500" },
                  { icon: Bell, label: "Notifications", path: "/notifications", color: "text-sky-500" },
                  { icon: BarChart3, label: "Reports", path: "/reports", color: "text-orange-500" },
                ].map((item) => (
                  <Button
                    key={item.path}
                    variant="ghost"
                    className="h-auto py-3 flex flex-col items-center gap-1.5 hover:bg-muted/80 transition-all"
                    onClick={() => navigate(item.path)}
                  >
                    <item.icon className={`h-5 w-5 ${item.color}`} />
                    <span className="text-[11px] font-medium text-foreground">{item.label}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Info Footer */}
        <Card className="shadow-sm bg-muted/30">
          <CardContent className="py-3 px-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-green-500"></span>
                  System Active
                </span>
                <span>SVIT ERP v2.0</span>
              </div>
              <span>Last updated: {new Date().toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
