import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { RoleBasedAuthForm } from "@/components/auth/RoleBasedAuthForm";
import { isDevMode } from "@/hooks/useUserRole";

export default function Auth() {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already in developer mode
    if (isDevMode()) {
      navigate("/dashboard");
      return;
    }

    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
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
