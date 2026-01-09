import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, ClipboardCheck, Calendar, Megaphone, FileText, Settings, LogOut, GraduationCap, Bell, Users, Link2, BookOpen, Layers, Eye, Home, User, Shield, Library, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import svitLogo from "@/assets/svit-logo-official.jpg";
import { clearDevViewRole, setDevViewRole, useUserRole } from "@/hooks/useUserRole";
import { Badge } from "@/components/ui/badge";

interface TopTabsProps {
  userEmail?: string;
  userName?: string;
  userRole?: string;
}

const tabs = [
  { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard, roles: ["ADMIN", "FACULTY", "STUDENT", "PARENT"] },
  { name: "Attendance", path: "/attendance", icon: ClipboardCheck, roles: ["ADMIN", "FACULTY", "STUDENT"] },
  { name: "QR Attendance", path: "/attendance-qr", icon: ClipboardCheck, roles: ["ADMIN", "FACULTY", "STUDENT"] },
  { name: "Leave", path: "/leave", icon: FileText, roles: ["ADMIN", "FACULTY", "STUDENT"] },
  { name: "Timetable", path: "/timetable", icon: Calendar, roles: ["ADMIN", "FACULTY", "STUDENT"] },
  { name: "Results", path: "/results", icon: GraduationCap, roles: ["ADMIN", "FACULTY", "STUDENT", "PARENT"] },
  { name: "Announcements", path: "/announcements", icon: Megaphone, roles: ["ADMIN", "FACULTY", "STUDENT", "PARENT"] },
  { name: "Reports", path: "/reports", icon: FileText, roles: ["ADMIN", "FACULTY"] },
  { name: "Notifications", path: "/notifications", icon: Bell, roles: ["ADMIN", "FACULTY", "STUDENT", "PARENT"] },
  { name: "Library", path: "/library", icon: Library, roles: ["STUDENT", "LIBRARIAN", "ADMIN"] },
  { name: "Book Return", path: "/book-return", icon: ArrowLeftRight, roles: ["STUDENT", "LIBRARIAN", "ADMIN"] },
  { name: "Librarian Dashboard", path: "/librarian-dashboard", icon: LayoutDashboard, roles: ["LIBRARIAN"] },
  { name: "Students", path: "/students", icon: Users, roles: ["ADMIN"] },
  { name: "Parent Links", path: "/parent-links", icon: Link2, roles: ["ADMIN"] },
  { name: "Courses", path: "/courses", icon: BookOpen, roles: ["ADMIN"] },
  { name: "Subjects", path: "/subjects", icon: Layers, roles: ["ADMIN"] },
  { name: "Settings", path: "/settings", icon: Settings, roles: ["ADMIN", "FACULTY", "STUDENT", "PARENT", "LIBRARIAN"] },
];

// Mobile bottom nav tabs - simplified for quick access
const mobileQuickTabs = [
  { name: "Home", path: "/dashboard", icon: Home },
  { name: "Attendance", path: "/attendance", icon: ClipboardCheck },
  { name: "Timetable", path: "/timetable", icon: Calendar },
  { name: "Results", path: "/results", icon: GraduationCap },
  { name: "Settings", path: "/settings", icon: Settings },
];

export function TopTabs({ userEmail, userName, userRole }: TopTabsProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useUserRole();

  const handleLogout = async () => {
    try {
      clearDevViewRole();
      // Clear any local storage
      localStorage.removeItem('sb-eizajitmzuytpaziqdkk-auth-token');
      
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      
      // Always navigate to auth, even if there's an error
      // since we've already cleared local state
      navigate("/auth");
      
      if (error) {
        console.warn("Logout warning:", error.message);
      }
    } catch (err) {
      // Still navigate even on exception
      navigate("/auth");
    }
  };

  const handlePreviewRole = (role: string) => {
    setDevViewRole(role as any);
    toast({
      title: "Preview Mode",
      description: `Now viewing as ${role}. Go to Dashboard to see the preview.`,
    });
    navigate("/dashboard");
  };

  const initials = userName?.split(" ").map(n => n[0]).join("").toUpperCase() || "U";
  
  return (
    <>
      {/* Desktop/Tablet Header */}
      <header className="sticky top-0 z-50 w-full border-b shadow-md bg-primary">
        <div className="container mx-auto flex h-14 sm:h-16 items-center justify-between px-3 sm:px-4">
          {/* Logo and Brand with Menu Popup */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-2 sm:gap-3 cursor-pointer hover:opacity-90 transition-all">
                <img 
                  src={svitLogo} 
                  alt="SVIT Logo" 
                  className="h-10 w-10 sm:h-12 sm:w-12 object-contain rounded-lg shadow-md border-2 border-white/20" 
                />
                <div className="hidden xs:block">
                  <h1 className="font-bold text-primary-foreground text-lg sm:text-xl tracking-tight">SVIT ERP</h1>
                  <p className="text-[10px] sm:text-xs text-primary-foreground/90 font-medium">Attendance System</p>
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 bg-background z-50 max-h-[70vh] overflow-y-auto">
              <DropdownMenuLabel className="text-base">Navigation Menu</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {tabs.filter(tab => !tab.roles || tab.roles.includes(userRole)).map(tab => (
                <DropdownMenuItem key={tab.path} asChild>
                  <NavLink to={tab.path} className="flex items-center gap-3 cursor-pointer py-2">
                    <tab.icon className="h-4 w-4" />
                    <span>{tab.name}</span>
                  </NavLink>
                </DropdownMenuItem>
              ))}
              
              {/* Admin Preview Mode */}
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="cursor-pointer">
                      <Eye className="mr-2 h-4 w-4" />
                      <span>Preview as Role</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem onClick={() => handlePreviewRole("ADMIN")} className="cursor-pointer">
                        <Shield className="mr-2 h-4 w-4" />
                        Admin
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handlePreviewRole("FACULTY")} className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        Faculty
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handlePreviewRole("STUDENT")} className="cursor-pointer">
                        <GraduationCap className="mr-2 h-4 w-4" />
                        Student
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handlePreviewRole("PARENT")} className="cursor-pointer">
                        <Users className="mr-2 h-4 w-4" />
                        Parent
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handlePreviewRole("LIBRARIAN")} className="cursor-pointer">
                        <Library className="mr-2 h-4 w-4" />
                        Librarian
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                </>
              )}
              
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive font-medium">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme Toggle & User Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 sm:h-12 sm:w-12 rounded-full hover:bg-white/10 p-0">
                  <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border-2 border-white/30 shadow-lg">
                    <AvatarImage src="" alt={userName} />
                    <AvatarFallback className="bg-white text-primary font-bold text-base sm:text-lg">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-semibold">{userName}</p>
                    <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {userRole}
                      </Badge>
                      {isAdmin && (
                        <Badge variant="outline" className="text-xs text-amber-600 border-amber-600">
                          Admin
                        </Badge>
                      )}
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/settings")} className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive font-medium">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t shadow-lg sm:hidden">
        <div className="flex items-center justify-around h-16 px-2">
          {mobileQuickTabs.map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all ${
                  isActive
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`
              }
            >
              <tab.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{tab.name}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}
