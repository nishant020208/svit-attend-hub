import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "STUDENT" | "FACULTY" | "PARENT" | "ADMIN" | "LIBRARIAN";

// Developer mode allows authenticated admins to view different role dashboards
const DEV_VIEW_KEY = "devViewRole";

/**
 * Check if developer view mode is active (requires authenticated ADMIN)
 */
export function getDevViewRole(): AppRole | null {
  const role = sessionStorage.getItem(DEV_VIEW_KEY);
  if (role && ["STUDENT", "FACULTY", "PARENT", "ADMIN", "LIBRARIAN"].includes(role)) {
    return role as AppRole;
  }
  return null;
}

/**
 * Set developer view role (only works for authenticated admins)
 */
export function setDevViewRole(role: AppRole): void {
  sessionStorage.setItem(DEV_VIEW_KEY, role);
}

/**
 * Clear developer view mode
 */
export function clearDevViewRole(): void {
  sessionStorage.removeItem(DEV_VIEW_KEY);
}

/**
 * Secure hook to check user roles from the user_roles table
 * This avoids client-side authorization vulnerabilities by querying
 * the secure user_roles table with proper RLS policies
 */
export function useUserRole() {
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          setRole(null);
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        setUserId(session.user.id);

        // Query the secure user_roles table
        const { data, error } = await (supabase as any)
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .single();

        if (error) {
          console.error("Error fetching user role:", error);
          setRole(null);
          setIsAdmin(false);
        } else {
          const userRole = data?.role as AppRole;
          setRole(userRole);
          setIsAdmin(userRole === "ADMIN");
        }
      } catch (error) {
        console.error("Error in useUserRole:", error);
        setRole(null);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchUserRole();
    });

    return () => subscription.unsubscribe();
  }, []);

  const hasRole = (requiredRole: AppRole) => {
    // Admins have access to all roles for viewing
    if (isAdmin) return true;
    return role === requiredRole;
  };

  // Check if user can access a feature
  const canAccess = (allowedRoles: AppRole[]) => {
    if (isAdmin) return true;
    return role ? allowedRoles.includes(role) : false;
  };

  // Get the effective role (for developer view mode)
  const getEffectiveRole = (): AppRole | null => {
    if (isAdmin) {
      const devViewRole = getDevViewRole();
      if (devViewRole) return devViewRole;
    }
    return role;
  };

  return { 
    role, 
    loading, 
    userId, 
    hasRole, 
    isAdmin, 
    canAccess,
    getEffectiveRole,
  };
}
