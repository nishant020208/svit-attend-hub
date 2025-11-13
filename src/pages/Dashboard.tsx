import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import StudentDashboard from "./StudentDashboard";
import TeacherDashboard from "./TeacherDashboard";
import ParentDashboard from "./ParentDashboard";
import AdminDashboard from "./AdminDashboard";

export default function Dashboard() {
  const navigate = useNavigate();
  const { role, loading } = useUserRole();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }
    };

    checkAuth();
  }, [navigate]);

  if (loading) {
    return null; // Will show LoadingSpinner from individual dashboards
  }

  // Route to role-specific dashboard
  switch (role) {
    case "STUDENT":
      return <StudentDashboard />;
    case "FACULTY":
      return <TeacherDashboard />;
    case "PARENT":
      return <ParentDashboard />;
    case "ADMIN":
      return <AdminDashboard />;
    default:
      navigate("/auth");
      return null;
  }
}
