import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import StudentDashboard from "./StudentDashboard";
import TeacherDashboard from "./TeacherDashboard";
import ParentDashboard from "./ParentDashboard";
import AdminDashboard from "./AdminDashboard";

export default function Dashboard() {
  const navigate = useNavigate();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

      const { data: profileData } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      setRole(profileData?.role || null);
    } catch (error) {
      console.error("Auth error:", error);
      navigate("/auth");
    } finally {
      setLoading(false);
    }
  };

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
