import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, ClipboardCheck, Calendar, Megaphone, FileText, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import svitLogo from "@/assets/svit-logo-official.jpg";
interface TopTabsProps {
  userEmail?: string;
  userName?: string;
  userRole?: string;
}
const tabs = [{
  name: "Dashboard",
  path: "/dashboard",
  icon: LayoutDashboard,
  roles: ["ADMIN", "FACULTY", "STUDENT", "PARENT"]
}, {
  name: "Attendance",
  path: "/attendance",
  icon: ClipboardCheck,
  roles: ["ADMIN", "FACULTY", "STUDENT"]
}, {
  name: "QR Attendance",
  path: "/attendance-qr",
  icon: ClipboardCheck,
  roles: ["ADMIN", "FACULTY", "STUDENT"]
}, {
  name: "Leave",
  path: "/leave",
  icon: FileText,
  roles: ["ADMIN", "FACULTY", "STUDENT"]
}, {
  name: "Timetable",
  path: "/timetable",
  icon: Calendar,
  roles: ["ADMIN", "FACULTY", "STUDENT"]
}, {
  name: "Announcements",
  path: "/announcements",
  icon: Megaphone,
  roles: ["ADMIN", "FACULTY", "STUDENT", "PARENT"]
}, {
  name: "Reports",
  path: "/reports",
  icon: FileText,
  roles: ["ADMIN", "FACULTY", "STUDENT"]
}, {
  name: "Courses",
  path: "/courses",
  icon: Settings,
  roles: ["ADMIN"]
}, {
  name: "Settings",
  path: "/settings",
  icon: Settings,
  roles: ["ADMIN", "FACULTY", "STUDENT", "PARENT"]
}];
export function TopTabs({
  userEmail,
  userName,
  userRole
}: TopTabsProps) {
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const handleLogout = async () => {
    const {
      error
    } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive"
      });
    } else {
      navigate("/auth");
    }
  };
  const initials = userName?.split(" ").map(n => n[0]).join("").toUpperCase() || "U";
  return <header className="sticky top-0 z-50 w-full border-b shadow-lg bg-gradient-primary">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 bg-blue-700">
        {/* Logo and Brand with Menu Popup */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-3 cursor-pointer hover:opacity-90 transition-all">
              <img src={svitLogo} alt="SVIT Logo" className="h-12 w-12 object-contain rounded-lg shadow-md border-2 border-white/20" />
              <div>
                <h1 className="font-bold text-primary-foreground text-xl tracking-tight">SVIT ERP</h1>
                <p className="text-xs text-primary-foreground/90 font-medium">Attendance System</p>
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64 bg-background z-50">
            <DropdownMenuLabel className="text-base">Navigation Menu</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {tabs.filter(tab => !tab.roles || tab.roles.includes(userRole)).map(tab => <DropdownMenuItem key={tab.path} asChild>
                <NavLink to={tab.path} className="flex items-center gap-3 cursor-pointer py-2">
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.name}</span>
                </NavLink>
              </DropdownMenuItem>)}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive font-medium">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-12 w-12 rounded-full hover:bg-white/10">
              <Avatar className="h-12 w-12 border-2 border-white/30 shadow-lg">
                <AvatarImage src="" alt={userName} />
                <AvatarFallback className="bg-white text-primary font-bold text-lg">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold">{userName}</p>
                <p className="text-xs text-muted-foreground">{userEmail}</p>
                <p className="text-xs font-bold text-primary mt-1">{userRole}</p>
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
    </header>;
}