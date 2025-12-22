import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "STUDENT" | "FACULTY" | "PARENT" | "ADMIN";

/**
 * Check if developer mode is active
 */
export function isDevMode(): boolean {
  return sessionStorage.getItem("devMode") === "true";
}

/**
 * Clear developer mode
 */
export function clearDevMode(): void {
  sessionStorage.removeItem("devMode");
}

/**
 * Secure hook to check user roles from the user_roles table
 * This avoids client-side authorization vulnerabilities by querying
 * the secure user_roles table with proper RLS policies
 * 
 * Developer mode grants ADMIN access to all features
 */
export function useUserRole() {
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [isDeveloper, setIsDeveloper] = useState(false);

  useEffect(() => {
    // Check for developer mode first
    if (isDevMode()) {
      setIsDeveloper(true);
      setRole("ADMIN"); // Developers get full admin access
      setUserId("dev-user");
      setLoading(false);
      return;
    }

    const fetchUserRole = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          setRole(null);
          setLoading(false);
          return;
        }

        setUserId(session.user.id);

        // Query the secure user_roles table instead of profiles
        // Using any type assertion since user_roles table is newly created
        const { data, error } = await (supabase as any)
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .single();

        if (error) {
          console.error("Error fetching user role:", error);
          setRole(null);
        } else {
          setRole(data?.role as AppRole);
        }
      } catch (error) {
        console.error("Error in useUserRole:", error);
        setRole(null);
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
    // Developer mode has access to all roles
    if (isDeveloper) return true;
    return role === requiredRole;
  };

  // Check if user can access a feature (developer has access to everything)
  const canAccess = (allowedRoles: AppRole[]) => {
    if (isDeveloper) return true;
    return role ? allowedRoles.includes(role) : false;
  };

  return { role, loading, userId, hasRole, isDeveloper, canAccess };
}
