import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TopTabs } from "@/components/layout/TopTabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, FileText, TrendingUp, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useAnnouncementNotifications } from "@/hooks/useAnnouncementNotifications";
import { FloatingGeometry } from "@/components/ui/FloatingGeometry";
import { DashboardMotivation } from "@/components/dashboard/DashboardMotivation";
import { StudentDashboardSkeleton } from "@/components/ui/DashboardSkeleton";
import {
  useStudentProfile,
  useStudentData,
  useAttendanceStats,
  usePendingLeaves,
  useRecentAnnouncements,
} from "@/hooks/useDashboardQueries";

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | undefined>();
  const [authChecked, setAuthChecked] = useState(false);

  // Enable announcement notifications
  useAnnouncementNotifications(userId);

  // React Query hooks for caching
  const { data: profile, isLoading: profileLoading } = useStudentProfile(userId);
  const { data: student, isLoading: studentLoading } = useStudentData(userId);
  const { data: attendanceStats, isLoading: attendanceLoading } = useAttendanceStats(student?.id);
  const { data: pendingLeaves, isLoading: leavesLoading } = usePendingLeaves(student?.id);
  const { data: recentAnnouncements, isLoading: announcementsLoading } = useRecentAnnouncements(3);

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
    if (profile && profile.role !== "STUDENT") {
      navigate("/dashboard");
    }
  }, [profile, navigate]);

  const isLoading = !authChecked || profileLoading || studentLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <FloatingGeometry variant="default" />
        <StudentDashboardSkeleton />
      </div>
    );
  }

  const attendanceColor = (attendanceStats?.percentage || 0) >= 75 ? "text-green-600" : "text-destructive";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <FloatingGeometry variant="default" />
      <TopTabs
        userEmail={userId ? undefined : undefined}
        userName={profile?.name}
        userRole={profile?.role}
      />
      <main className="container mx-auto p-4 md:p-6">
        {/* Motivation Quote */}
        <DashboardMotivation />

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
              <div className={`text-3xl font-bold ${attendanceColor}`}>
                {attendanceLoading ? "..." : `${attendanceStats?.percentage || 0}%`}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {attendanceStats?.presentDays || 0} / {attendanceStats?.totalDays || 0} days present
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur hover:shadow-lg transition-all border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Leaves</CardTitle>
              <FileText className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {leavesLoading ? "..." : pendingLeaves || 0}
              </div>
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
              <div className="text-3xl font-bold">
                {announcementsLoading ? "..." : recentAnnouncements?.length || 0}
              </div>
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
              {announcementsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="border-l-2 border-muted pl-4 py-2 animate-pulse">
                      <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                      <div className="h-3 bg-muted rounded w-full" />
                    </div>
                  ))}
                </div>
              ) : (recentAnnouncements?.length || 0) > 0 ? (
                <div className="space-y-4">
                  {recentAnnouncements?.map((announcement) => (
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
