import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TopTabs } from "@/components/layout/TopTabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Book, BookOpen, Clock, AlertTriangle, Library, IndianRupee } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FloatingGeometry } from "@/components/ui/FloatingGeometry";
import { DashboardMotivation } from "@/components/dashboard/DashboardMotivation";
import { TeacherDashboardSkeleton } from "@/components/ui/DashboardSkeleton";
import { useStudentProfile } from "@/hooks/useDashboardQueries";
import { differenceInDays, format } from "date-fns";

export default function LibrarianDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | undefined>();
  const [authChecked, setAuthChecked] = useState(false);
  const [stats, setStats] = useState({
    totalBooks: 0,
    activeBorrowings: 0,
    overdueBooks: 0,
    totalFeesDue: 0,
  });
  const [overdueBorrowings, setOverdueBorrowings] = useState<any[]>([]);
  const [recentBorrowings, setRecentBorrowings] = useState<any[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  const { data: profile, isLoading: profileLoading } = useStudentProfile(userId);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchStats();
    }
  }, [userId]);

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

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      // Total books
      const { count: bookCount } = await supabase
        .from("books")
        .select("*", { count: "exact", head: true });

      // Active borrowings
      const { data: activeBorrowingsData, count: activeCount } = await supabase
        .from("book_borrowings")
        .select("*, books(*)", { count: "exact" })
        .eq("status", "BORROWED");

      // Calculate overdue and fees
      const now = new Date();
      let overdueCount = 0;
      let totalFees = 0;
      const overdueList: any[] = [];

      activeBorrowingsData?.forEach((borrowing) => {
        const dueDate = new Date(borrowing.due_date);
        const daysOverdue = differenceInDays(now, dueDate);
        if (daysOverdue > 0) {
          overdueCount++;
          const fee = daysOverdue * 3; // ₹3 per day
          totalFees += fee;
          overdueList.push({ ...borrowing, daysOverdue, fee });
        }
      });

      // Recent borrowings
      const { data: recentData } = await supabase
        .from("book_borrowings")
        .select("*, books(*)")
        .order("borrowed_at", { ascending: false })
        .limit(5);

      setStats({
        totalBooks: bookCount || 0,
        activeBorrowings: activeCount || 0,
        overdueBooks: overdueCount,
        totalFeesDue: totalFees,
      });
      setOverdueBorrowings(overdueList);
      setRecentBorrowings(recentData || []);
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    if (profile && profile.role !== "LIBRARIAN" && profile.role !== "ADMIN") {
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
        <DashboardMotivation />

        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Librarian Dashboard
          </h1>
          <p className="text-muted-foreground">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {profile?.first_name || profile?.name}!
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20 hover:shadow-xl transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Books</CardTitle>
              <Book className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {statsLoading ? "..." : stats.totalBooks}
              </div>
              <p className="text-xs text-muted-foreground mt-1">In library collection</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20 hover:shadow-xl transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Borrowings</CardTitle>
              <BookOpen className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {statsLoading ? "..." : stats.activeBorrowings}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Books currently borrowed</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500/10 to-red-600/10 border-red-500/20 hover:shadow-xl transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue Books</CardTitle>
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                {statsLoading ? "..." : stats.overdueBooks}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Past due date</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 border-orange-500/20 hover:shadow-xl transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fees Due</CardTitle>
              <IndianRupee className="h-5 w-5 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                {statsLoading ? "..." : `₹${stats.totalFeesDue}`}
              </div>
              <p className="text-xs text-muted-foreground mt-1">₹3 per day overdue</p>
            </CardContent>
          </Card>
        </div>

        {/* Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2 mb-8">
          <Card className="shadow-lg border-t-4 border-t-red-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Overdue Books
              </CardTitle>
              <CardDescription>Books that need immediate attention</CardDescription>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-3 rounded-lg bg-muted/50 animate-pulse">
                      <div className="h-4 bg-muted rounded w-32 mb-2" />
                      <div className="h-3 bg-muted rounded w-48" />
                    </div>
                  ))}
                </div>
              ) : overdueBorrowings.length > 0 ? (
                <div className="space-y-3">
                  {overdueBorrowings.slice(0, 5).map((borrowing) => (
                    <div key={borrowing.id} className="p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold">{borrowing.books?.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Due: {format(new Date(borrowing.due_date), "PPP")}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant="destructive">{borrowing.daysOverdue} days late</Badge>
                          <p className="text-sm font-bold text-orange-600 mt-1">₹{borrowing.fee} fee</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No overdue books 🎉</p>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-lg border-t-4 border-t-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>Latest borrowing transactions</CardDescription>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-3 rounded-lg bg-muted/50 animate-pulse">
                      <div className="h-4 bg-muted rounded w-32 mb-2" />
                      <div className="h-3 bg-muted rounded w-48" />
                    </div>
                  ))}
                </div>
              ) : recentBorrowings.length > 0 ? (
                <div className="space-y-3">
                  {recentBorrowings.map((borrowing) => (
                    <div key={borrowing.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <div>
                        <p className="font-semibold">{borrowing.books?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(borrowing.borrowed_at), "PPp")}
                        </p>
                      </div>
                      <Badge variant={borrowing.status === "BORROWED" ? "secondary" : "default"}>
                        {borrowing.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No recent activity</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Library className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <Button onClick={() => navigate("/library")} className="h-auto py-4">
              Manage Library
            </Button>
            <Button onClick={() => navigate("/library")} variant="outline" className="h-auto py-4">
              Generate Book QR
            </Button>
            <Button onClick={() => navigate("/announcements")} variant="outline" className="h-auto py-4">
              View Announcements
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
