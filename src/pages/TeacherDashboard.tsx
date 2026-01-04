import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TopTabs } from "@/components/layout/TopTabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ClipboardCheck, FileText, Calendar, Clock, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { FloatingGeometry } from "@/components/ui/FloatingGeometry";
import { DashboardMotivation } from "@/components/dashboard/DashboardMotivation";
import { TeacherDashboardSkeleton } from "@/components/ui/DashboardSkeleton";
import {
  useStudentProfile,
  useTeacherStats,
  useTodaySchedule,
  useTeacherPendingLeaves,
} from "@/hooks/useDashboardQueries";

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | undefined>();
  const [authChecked, setAuthChecked] = useState(false);

  // React Query hooks for caching
  const { data: profile, isLoading: profileLoading } = useStudentProfile(userId);
  const { data: stats, isLoading: statsLoading } = useTeacherStats(userId);
  const { data: todaySchedule, isLoading: scheduleLoading } = useTodaySchedule(userId);
  const { data: pendingLeavesData, isLoading: leavesLoading } = useTeacherPendingLeaves();

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

      setUserId(session.user.id);
    } catch (error: any) {
      console.error("Auth error:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setAuthChecked(true);
    }
  };

  useEffect(() => {
    if (profile && profile.role !== "FACULTY") {
      navigate("/dashboard");
    }
  }, [profile, navigate]);

  const isLoading = !authChecked || profileLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background">
        <FloatingGeometry variant="minimal" />
        <TeacherDashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background">
      <FloatingGeometry variant="minimal" />
      <TopTabs
        userEmail={undefined}
        userName={profile?.name}
        userRole={profile?.role}
      />
      <main className="container mx-auto p-4 md:p-6">
        {/* Motivation Quote */}
        <DashboardMotivation />

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
              <div className="text-3xl font-bold">
                {statsLoading ? "..." : stats?.totalClasses || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Weekly schedule</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20 hover:shadow-xl transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Classes</CardTitle>
              <Clock className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {statsLoading ? "..." : stats?.todayClasses || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Scheduled for today</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 border-orange-500/20 hover:shadow-xl transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
              <FileText className="h-5 w-5 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {leavesLoading ? "..." : pendingLeavesData?.count || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Leave requests</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20 hover:shadow-xl transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <Users className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {statsLoading ? "..." : stats?.studentsCount || 0}
              </div>
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
              {scheduleLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 animate-pulse">
                      <div>
                        <div className="h-4 bg-muted rounded w-32 mb-2" />
                        <div className="h-3 bg-muted rounded w-48" />
                      </div>
                      <div className="text-right">
                        <div className="h-4 bg-muted rounded w-12 mb-1" />
                        <div className="h-3 bg-muted rounded w-10" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (todaySchedule?.length || 0) > 0 ? (
                <div className="space-y-3">
                  {todaySchedule?.map((schedule) => (
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
              {leavesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-3 rounded-lg bg-muted/50 animate-pulse">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="h-4 bg-muted rounded w-32 mb-2" />
                          <div className="h-3 bg-muted rounded w-24" />
                        </div>
                        <div className="h-5 bg-muted rounded w-16" />
                      </div>
                      <div className="h-3 bg-muted rounded w-48" />
                    </div>
                  ))}
                </div>
              ) : (pendingLeavesData?.leaves?.length || 0) > 0 ? (
                <div className="space-y-3">
                  {pendingLeavesData?.leaves?.slice(0, 3).map((leave: any) => (
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
