import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { RoleBasedAuthForm } from "@/components/auth/RoleBasedAuthForm";

export default function Auth() {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      // If the browser has a stale refresh token, clear it so login can work again.
      if (error?.message?.toLowerCase().includes("refresh token")) {
        await supabase.auth.signOut();
        return;
      }

      if (session) {
        navigate("/dashboard");
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return <RoleBasedAuthForm />;
}
