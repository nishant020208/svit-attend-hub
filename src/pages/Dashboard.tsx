import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole, getDevViewRole, setDevViewRole, clearDevViewRole } from "@/hooks/useUserRole";
import StudentDashboard from "./StudentDashboard";
import TeacherDashboard from "./TeacherDashboard";
import ParentDashboard from "./ParentDashboard";
import AdminDashboard from "./AdminDashboard";
import LibrarianDashboard from "./LibrarianDashboard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GraduationCap, User, Users, Shield, Eye, X, Library } from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const { role, loading, isAdmin } = useUserRole();
  const [devViewRole, setDevViewRoleState] = useState<string | null>(getDevViewRole());

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

  // If a user can authenticate but has no assigned role, force sign-out.
  // This is what makes "removed from whitelist" actually block access after removal.
  useEffect(() => {
    if (loading) return;
    if (!role) {
      supabase.auth.signOut().finally(() => {
        navigate("/auth", { replace: true });
      });
    }
  }, [loading, role, navigate]);

  const handleDevViewChange = (newRole: string) => {
    setDevViewRole(newRole as any);
    setDevViewRoleState(newRole);
  };

  const exitDevView = () => {
    clearDevViewRole();
    setDevViewRoleState(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Admin with developer view mode active
  if (isAdmin && devViewRole) {
    return (
      <div className="min-h-screen bg-background">
        {/* Developer View Banner */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-amber-500 to-orange-600 text-white py-2 px-4">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              <span className="text-sm font-medium">Admin Preview Mode</span>
              <Badge variant="secondary" className="bg-white/20 text-white text-xs">
                Viewing as {devViewRole}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Tabs value={devViewRole} onValueChange={handleDevViewChange} className="bg-transparent">
                <TabsList className="bg-white/10 border-none h-8">
                  <TabsTrigger 
                    value="ADMIN" 
                    className="text-xs data-[state=active]:bg-white data-[state=active]:text-orange-600 text-white/80 h-6 px-2 sm:px-3"
                  >
                    <Shield className="h-3 w-3 sm:mr-1" />
                    <span className="hidden sm:inline">Admin</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="FACULTY" 
                    className="text-xs data-[state=active]:bg-white data-[state=active]:text-orange-600 text-white/80 h-6 px-2 sm:px-3"
                  >
                    <User className="h-3 w-3 sm:mr-1" />
                    <span className="hidden sm:inline">Faculty</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="STUDENT" 
                    className="text-xs data-[state=active]:bg-white data-[state=active]:text-orange-600 text-white/80 h-6 px-2 sm:px-3"
                  >
                    <GraduationCap className="h-3 w-3 sm:mr-1" />
                    <span className="hidden sm:inline">Student</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="PARENT" 
                    className="text-xs data-[state=active]:bg-white data-[state=active]:text-orange-600 text-white/80 h-6 px-2 sm:px-3"
                  >
                    <Users className="h-3 w-3 sm:mr-1" />
                    <span className="hidden sm:inline">Parent</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="LIBRARIAN" 
                    className="text-xs data-[state=active]:bg-white data-[state=active]:text-orange-600 text-white/80 h-6 px-2 sm:px-3"
                  >
                    <Library className="h-3 w-3 sm:mr-1" />
                    <span className="hidden sm:inline">Librarian</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={exitDevView}
                className="h-6 px-2 text-white hover:bg-white/20"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
        
        {/* Add padding for the banner */}
        <div className="pt-12">
          {devViewRole === "STUDENT" && <StudentDashboard />}
          {devViewRole === "FACULTY" && <TeacherDashboard />}
          {devViewRole === "PARENT" && <ParentDashboard />}
          {devViewRole === "ADMIN" && <AdminDashboard />}
          {devViewRole === "LIBRARIAN" && <LibrarianDashboard />}
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
    case "LIBRARIAN":
      return <LibrarianDashboard />;
    default:
      navigate("/auth");
      return null;
  }
}
