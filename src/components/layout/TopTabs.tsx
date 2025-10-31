import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, ClipboardCheck, Calendar, Megaphone, FileText, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import svitLogo from "@/assets/svit-logo.png";

interface TopTabsProps {
  userEmail?: string;
  userName?: string;
  userRole?: string;
}

const tabs = [
  { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { name: "Attendance", path: "/attendance", icon: ClipboardCheck },
  { name: "Timetable", path: "/timetable", icon: Calendar },
  { name: "Announcements", path: "/announcements", icon: Megaphone },
  { name: "Reports", path: "/reports", icon: FileText },
  { name: "Settings", path: "/settings", icon: Settings },
];

export function TopTabs({ userEmail, userName, userRole }: TopTabsProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
    } else {
      navigate("/auth");
    }
  };

  const initials = userName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "U";

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-primary shadow-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3">
          <img src={svitLogo} alt="SVIT Logo" className="h-10 w-10 object-contain" />
          <div className="hidden md:block">
            <h1 className="text-xl font-bold text-primary-foreground">SVIT ERP</h1>
            <p className="text-xs text-primary-foreground/80">Attendance System</p>
          </div>
        </div>

        {/* Desktop Tabs */}
        <nav className="hidden lg:flex items-center gap-1">
          {tabs.map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary-foreground/10 text-primary-foreground border-b-2 border-primary-foreground"
                    : "text-primary-foreground/70 hover:bg-primary-foreground/5 hover:text-primary-foreground"
                }`
              }
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.name}</span>
            </NavLink>
          ))}
        </nav>

        {/* Mobile Tabs Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild className="lg:hidden">
            <Button variant="outline" size="sm" className="text-primary-foreground border-primary-foreground/20">
              Menu
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {tabs.map((tab) => (
              <DropdownMenuItem key={tab.path} asChild>
                <NavLink to={tab.path} className="flex items-center gap-2 cursor-pointer">
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.name}</span>
                </NavLink>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-10 w-10 border-2 border-primary-foreground/20">
                <AvatarImage src="" alt={userName} />
                <AvatarFallback className="bg-primary-foreground text-primary font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{userName}</p>
                <p className="text-xs text-muted-foreground">{userEmail}</p>
                <p className="text-xs font-semibold text-primary">{userRole}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
