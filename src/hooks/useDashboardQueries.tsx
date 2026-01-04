import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Student Dashboard Queries
export function useStudentProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["student-profile", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      return data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useStudentData(userId: string | undefined) {
  return useQuery({
    queryKey: ["student-data", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await supabase
        .from("students")
        .select("*")
        .eq("user_id", userId)
        .single();
      return data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAttendanceStats(studentId: string | undefined) {
  return useQuery({
    queryKey: ["attendance-stats", studentId],
    queryFn: async () => {
      if (!studentId) return { percentage: 0, presentDays: 0, totalDays: 0 };
      const { data, count } = await supabase
        .from("attendance")
        .select("*", { count: "exact" })
        .eq("student_id", studentId);

      const presentCount = data?.filter(a => a.status === "PRESENT").length || 0;
      const percentage = count ? Math.round((presentCount / count) * 100) : 0;

      return { percentage, presentDays: presentCount, totalDays: count || 0 };
    },
    enabled: !!studentId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function usePendingLeaves(studentId: string | undefined) {
  return useQuery({
    queryKey: ["pending-leaves", studentId],
    queryFn: async () => {
      if (!studentId) return 0;
      const { count } = await supabase
        .from("leave_requests")
        .select("*", { count: "exact", head: true })
        .eq("student_id", studentId)
        .eq("status", "PENDING");
      return count || 0;
    },
    enabled: !!studentId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useRecentAnnouncements(limit: number = 3) {
  return useQuery({
    queryKey: ["recent-announcements", limit],
    queryFn: async () => {
      const { data } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      return data || [];
    },
    staleTime: 2 * 60 * 1000,
  });
}

// Teacher Dashboard Queries
export function useTeacherStats(facultyId: string | undefined) {
  return useQuery({
    queryKey: ["teacher-stats", facultyId],
    queryFn: async () => {
      if (!facultyId) return { totalClasses: 0, todayClasses: 0, studentsCount: 0 };
      
      const { data: classes, count } = await supabase
        .from("timetable")
        .select("*", { count: "exact" })
        .eq("faculty_id", facultyId);

      const today = new Date().getDay();
      const todayCount = classes?.filter(c => c.day_of_week === today).length || 0;

      const { count: studentCount } = await supabase
        .from("students")
        .select("*", { count: "exact", head: true });

      return {
        totalClasses: count || 0,
        todayClasses: todayCount,
        studentsCount: studentCount || 0,
      };
    },
    enabled: !!facultyId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useTodaySchedule(facultyId: string | undefined) {
  return useQuery({
    queryKey: ["today-schedule", facultyId],
    queryFn: async () => {
      if (!facultyId) return [];
      const today = new Date().getDay();
      const { data } = await supabase
        .from("timetable")
        .select("*")
        .eq("faculty_id", facultyId)
        .eq("day_of_week", today)
        .order("start_time");
      return data || [];
    },
    enabled: !!facultyId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useTeacherPendingLeaves() {
  return useQuery({
    queryKey: ["teacher-pending-leaves"],
    queryFn: async () => {
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
      return { leaves: data || [], count: count || 0 };
    },
    staleTime: 2 * 60 * 1000,
  });
}

// Admin Dashboard Queries
export function useAdminStats() {
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [studentsRes, facultyRes, parentsRes, attendanceRes, leavesRes] = await Promise.all([
        supabase.from("students").select("*"),
        supabase.from("profiles").select("*").eq("role", "FACULTY"),
        supabase.from("profiles").select("*").eq("role", "PARENT"),
        supabase.from("attendance").select("*").eq("date", new Date().toISOString().split("T")[0]),
        supabase.from("leave_requests").select("*").eq("status", "PENDING"),
      ]);

      const presentToday = attendanceRes.data?.filter(a => a.status === "PRESENT").length || 0;
      const totalStudentsToday = attendanceRes.data?.length || 0;
      const attendanceRate = totalStudentsToday > 0 ? Math.round((presentToday / totalStudentsToday) * 100) : 0;

      return {
        totalStudents: studentsRes.data?.length || 0,
        totalFaculty: facultyRes.data?.length || 0,
        totalParents: parentsRes.data?.length || 0,
        todayAttendance: presentToday,
        attendanceRate,
        pendingLeaves: leavesRes.data?.length || 0,
      };
    },
    staleTime: 2 * 60 * 1000,
  });
}
