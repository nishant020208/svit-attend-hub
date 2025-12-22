import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole, isDevMode } from "@/hooks/useUserRole";
import StudentDashboard from "./StudentDashboard";
import TeacherDashboard from "./TeacherDashboard";
import ParentDashboard from "./ParentDashboard";
import AdminDashboard from "./AdminDashboard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, User, Users, Shield, Code } from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const { role, loading, isDeveloper } = useUserRole();
  const [devViewRole, setDevViewRole] = useState<string>("ADMIN");

  useEffect(() => {
    const checkAuth = async () => {
      // Developer mode bypasses auth check
      if (isDevMode()) {
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }
    };

    checkAuth();
  }, [navigate]);

  if (loading) {
    return null;
  }

  // Developer mode - show role switcher to access all dashboards
  if (isDeveloper) {
    return (
      <div className="min-h-screen bg-background">
        {/* Developer Mode Banner */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-2 px-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              <span className="text-sm font-medium">Developer Mode Active</span>
              <Badge variant="secondary" className="bg-white/20 text-white text-xs">
                Full Access
              </Badge>
            </div>
            <Tabs value={devViewRole} onValueChange={setDevViewRole} className="bg-transparent">
              <TabsList className="bg-white/10 border-none h-8">
                <TabsTrigger 
                  value="ADMIN" 
                  className="text-xs data-[state=active]:bg-white data-[state=active]:text-blue-600 text-white/80 h-6 px-3"
                >
                  <Shield className="h-3 w-3 mr-1" />
                  Admin
                </TabsTrigger>
                <TabsTrigger 
                  value="FACULTY" 
                  className="text-xs data-[state=active]:bg-white data-[state=active]:text-blue-600 text-white/80 h-6 px-3"
                >
                  <User className="h-3 w-3 mr-1" />
                  Faculty
                </TabsTrigger>
                <TabsTrigger 
                  value="STUDENT" 
                  className="text-xs data-[state=active]:bg-white data-[state=active]:text-blue-600 text-white/80 h-6 px-3"
                >
                  <GraduationCap className="h-3 w-3 mr-1" />
                  Student
                </TabsTrigger>
                <TabsTrigger 
                  value="PARENT" 
                  className="text-xs data-[state=active]:bg-white data-[state=active]:text-blue-600 text-white/80 h-6 px-3"
                >
                  <Users className="h-3 w-3 mr-1" />
                  Parent
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
        
        {/* Add padding for the banner */}
        <div className="pt-10">
          {devViewRole === "STUDENT" && <StudentDashboard />}
          {devViewRole === "FACULTY" && <TeacherDashboard />}
          {devViewRole === "PARENT" && <ParentDashboard />}
          {devViewRole === "ADMIN" && <AdminDashboard />}
        </div>
      </div>
    );
  }

  // Normal user - route to role-specific dashboard
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
