import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAbsentStudentsToday() {
  return useQuery({
    queryKey: ["absent-students-today"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      
      // Get today's attendance marked as ABSENT
      const { data: absentRecords } = await supabase
        .from("attendance")
        .select(`
          student_id,
          subject,
          students:student_id (
            roll_number,
            course,
            section,
            profiles:user_id (name, email)
          )
        `)
        .eq("date", today)
        .eq("status", "ABSENT")
        .limit(20);
      
      return absentRecords || [];
    },
    staleTime: 60 * 1000,
  });
}

export function usePendingLeaveRequests() {
  return useQuery({
    queryKey: ["admin-pending-leaves-detailed"],
    queryFn: async () => {
      const { data } = await supabase
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
        .limit(10);
      
      return data || [];
    },
    staleTime: 60 * 1000,
  });
}

export function useRecentActivityLogs() {
  return useQuery({
    queryKey: ["recent-activity-logs"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(15);
      
      return data || [];
    },
    staleTime: 30 * 1000,
  });
}

export function useUnreadNotifications(userId: string | undefined) {
  return useQuery({
    queryKey: ["unread-notifications", userId],
    queryFn: async () => {
      if (!userId) return { count: 0, notifications: [] };
      
      const { data, count } = await supabase
        .from("notifications")
        .select("*", { count: "exact" })
        .eq("user_id", userId)
        .eq("read", false)
        .order("created_at", { ascending: false })
        .limit(5);
      
      return { count: count || 0, notifications: data || [] };
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
  });
}

export function useLiveAttendanceStats() {
  return useQuery({
    queryKey: ["live-attendance-stats"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      
      const { data } = await supabase
        .from("attendance")
        .select("status")
        .eq("date", today);
      
      const total = data?.length || 0;
      const present = data?.filter(a => a.status === "PRESENT").length || 0;
      const absent = data?.filter(a => a.status === "ABSENT").length || 0;
      const late = data?.filter(a => a.status === "LATE").length || 0;
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
      
      return { total, present, absent, late, percentage };
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000, // Auto-refresh every minute
  });
}

// Helper to log activity
export async function logActivity(
  userId: string,
  action: string,
  details?: {
    userName?: string;
    userRole?: string;
    entityType?: string;
    entityId?: string;
    extra?: Record<string, any>;
  }
) {
  try {
    await (supabase as any).from("activity_logs").insert({
      user_id: userId,
      user_name: details?.userName,
      user_role: details?.userRole,
      action,
      entity_type: details?.entityType,
      entity_id: details?.entityId,
      details: details?.extra || {},
    });
  } catch (err) {
    console.error("Failed to log activity:", err);
  }
}
