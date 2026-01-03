import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TopTabs } from "@/components/layout/TopTabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, FileText, Bell, Calendar as CalendarIcon, GraduationCap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useAnnouncementNotifications } from "@/hooks/useAnnouncementNotifications";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { FloatingGeometry } from "@/components/ui/FloatingGeometry";
import { useUserRole } from "@/hooks/useUserRole";
import { Badge } from "@/components/ui/badge";

type RecentResult = {
  id: string;
  marks_obtained: number;
  max_marks: number;
  percentage: number | null;
  grade: string | null;
  created_at: string;
  exams?: { name: string; subject: string; exam_type: string } | null;
};

type TodayClass = {
  id: string;
  start_time: string;
  end_time: string;
  subject: string;
  room: string | null;
};

type ChildCard = {
  id: string;
  roll_number: string;
  course: string;
  year: number;
  section: string;
  profiles?: { name: string; email: string } | null;
  attendancePercentage: number;
  presentDays: number;
  totalDays: number;
  pendingLeaves: number;
  recentResults: RecentResult[];
  todayTimetable: TodayClass[];
};

export default function ParentDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const { role, loading: roleLoading, userId } = useUserRole();

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [children, setChildren] = useState<ChildCard[]>([]);
  const [latestAnnouncements, setLatestAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Enable announcement notifications
  useAnnouncementNotifications(user?.id);

  const todayLabel = useMemo(() => {
    const today = new Date();
    return today.toLocaleDateString(undefined, { weekday: "long" });
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

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
      } catch (error: any) {
        console.error("Auth error:", error);
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        navigate("/auth");
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate, toast]);

  useEffect(() => {
    if (roleLoading) return;

    if (!role) return;

    if (role !== "PARENT") {
      navigate("/dashboard");
      return;
    }

    if (userId) {
      void Promise.all([fetchChildren(userId), fetchLatestAnnouncements()]);
    }
  }, [role, roleLoading, userId, navigate]);

  const fetchLatestAnnouncements = async () => {
    const { data } = await supabase
      .from("announcements")
      .select("id, title, created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    setLatestAnnouncements(data ?? []);
  };

  const fetchChildren = async (parentId: string) => {
    try {
      const { data: relations, error } = await supabase
        .from("parent_student_relation")
        .select(
          `
          id,
          students:student_id (
            id,
            roll_number,
            course,
            year,
            section,
            profiles:user_id (name, email)
          )
        `
        )
        .eq("parent_id", parentId);

      if (error) throw error;

      const rels = (relations as any[]) ?? [];
      const today = new Date().getDay();

      const childrenData = await Promise.all(
        rels.map(async (rel) => {
          const student = rel.students;
          if (!student?.id) return null;

          const [totalAttendanceRes, presentAttendanceRes, pendingLeavesRes, resultsRes, timetableRes] = await Promise.all([
            supabase.from("attendance").select("id", { count: "exact", head: true }).eq("student_id", student.id),
            supabase.from("attendance").select("id", { count: "exact", head: true }).eq("student_id", student.id).eq("status", "PRESENT"),
            supabase
              .from("leave_requests")
              .select("id", { count: "exact", head: true })
              .eq("student_id", student.id)
              .eq("status", "PENDING"),
            supabase
              .from("results")
              .select(
                `
                id,
                marks_obtained,
                max_marks,
                percentage,
                grade,
                created_at,
                exams:exam_id ( name, subject, exam_type )
              `
              )
              .eq("student_id", student.id)
              .order("created_at", { ascending: false })
              .limit(3),
            supabase
              .from("timetable")
              .select("id, start_time, end_time, subject, room")
              .eq("course", student.course)
              .eq("year", student.year)
              .eq("section", student.section)
              .eq("day_of_week", today)
              .order("start_time", { ascending: true }),
          ]);

          const totalDays = totalAttendanceRes.count || 0;
          const presentDays = presentAttendanceRes.count || 0;
          const attendancePercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

          return {
            ...student,
            attendancePercentage,
            presentDays,
            totalDays,
            pendingLeaves: pendingLeavesRes.count || 0,
            recentResults: (resultsRes.data as any) ?? [],
            todayTimetable: (timetableRes.data as any) ?? [],
          } as ChildCard;
        })
      );

      setChildren(childrenData.filter(Boolean) as ChildCard[]);
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "Failed to load children data",
        variant: "destructive",
      });
    }
  };

  if (loading || roleLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <FloatingGeometry variant="colorful" />
      <TopTabs userEmail={user?.email} userName={profile?.name} userRole={role || undefined} />

      <main className="container mx-auto p-4 md:p-6 space-y-6">
        <header>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">Parent Dashboard</h1>
          <p className="text-muted-foreground">Attendance, results, timetable and announcements for all linked children.</p>
        </header>

        {/* Announcements */}
        {latestAnnouncements.length > 0 && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Latest Announcements
              </CardTitle>
              <CardDescription>Recent updates from the institution</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {latestAnnouncements.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => navigate("/announcements")}>
                    View
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {children.length === 0 ? (
          <Card className="shadow-lg">
            <CardContent className="py-12 text-center">
              <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Children Linked</h3>
              <p className="text-muted-foreground mb-6">Please contact the administrator to link your child's account.</p>
              <Button onClick={() => navigate("/settings")}>Go to Settings</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {children.map((child) => {
              const attendanceVariant = child.attendancePercentage >= 75 ? "secondary" : "destructive";

              return (
                <Card key={child.id} className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex flex-wrap items-center justify-between gap-2">
                      <span className="min-w-0 truncate">{child.profiles?.name}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant={attendanceVariant as any}>{child.attendancePercentage}% Attendance</Badge>
                        <span className="text-sm font-normal text-muted-foreground">Roll: {child.roll_number}</span>
                      </div>
                    </CardTitle>
                    <CardDescription>
                      {child.course} - Year {child.year} | Section {child.section}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="rounded-lg border bg-card p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Attendance</span>
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="text-2xl font-bold">{child.attendancePercentage}%</div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {child.presentDays} / {child.totalDays} days present
                        </p>
                      </div>

                      <div className="rounded-lg border bg-card p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Pending Leaves</span>
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="text-2xl font-bold">{child.pendingLeaves}</div>
                        <p className="text-xs text-muted-foreground mt-1">Awaiting approval</p>
                      </div>

                      <div className="rounded-lg border bg-card p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Today's Classes</span>
                          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="text-2xl font-bold">{child.todayTimetable.length}</div>
                        <p className="text-xs text-muted-foreground mt-1">{todayLabel}</p>
                      </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-lg border bg-card p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <GraduationCap className="h-4 w-4 text-muted-foreground" />
                          <h3 className="text-sm font-semibold">Recent Results</h3>
                        </div>
                        {child.recentResults.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No results published yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {child.recentResults.map((r) => {
                              const pct = r.percentage ?? Math.round((r.marks_obtained / r.max_marks) * 100);
                              const label = r.exams?.name || r.exams?.subject || "Exam";
                              return (
                                <div key={r.id} className="flex items-center justify-between gap-3 rounded-md bg-muted/40 px-3 py-2">
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium truncate">{label}</p>
                                    <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-semibold">{pct}%</p>
                                    {r.grade && <p className="text-xs text-muted-foreground">Grade: {r.grade}</p>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        <div className="mt-3">
                          <Button size="sm" variant="outline" onClick={() => navigate("/results")}>
                            View all results
                          </Button>
                        </div>
                      </div>

                      <div className="rounded-lg border bg-card p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                          <h3 className="text-sm font-semibold">Today's Timetable</h3>
                        </div>
                        {child.todayTimetable.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No classes scheduled for {todayLabel}.</p>
                        ) : (
                          <div className="space-y-2">
                            {child.todayTimetable.slice(0, 6).map((c) => (
                              <div key={c.id} className="flex items-center justify-between gap-3 rounded-md bg-muted/40 px-3 py-2">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{c.subject}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {String(c.start_time).slice(0, 5)} - {String(c.end_time).slice(0, 5)}
                                    {c.room ? ` • Room ${c.room}` : ""}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="mt-3">
                          <Button size="sm" variant="outline" onClick={() => navigate("/timetable")}>
                            View timetable
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => navigate("/announcements")}>
                        Announcements
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => navigate("/results")}>
                        Results
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => navigate("/timetable")}>
                        Timetable
                      </Button>
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
