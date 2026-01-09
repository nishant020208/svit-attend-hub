import { Menu, Settings, LogOut, LayoutDashboard, Calendar, FileText, Users, Bell, BookOpen, ClipboardList, Library, ArrowLeftRight, PenSquare } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { clearDevViewRole } from "@/hooks/useUserRole";

interface AppMenuProps {
  userRole?: string;
}

export function AppMenu({ userRole }: AppMenuProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignOut = async () => {
    // Clear any dev view role
    clearDevViewRole();
    
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You have been signed out successfully",
    });
    navigate("/auth");
  };

  const getMenuItems = () => {
    const items = [
      { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
      { icon: Calendar, label: "Timetable", path: "/timetable" },
      { icon: FileText, label: "Leave Management", path: "/leave" },
      { icon: Bell, label: "Announcements", path: "/announcements" },
      { icon: BookOpen, label: "Reports", path: "/reports" },
    ];

    // Teachers/Faculty and Admin get attendance access
    if (userRole === "FACULTY" || userRole === "ADMIN") {
      items.splice(2, 0, { icon: ClipboardList, label: "Attendance", path: "/attendance" });
    }

    // Students and Librarians get library access
    if (userRole === "STUDENT" || userRole === "LIBRARIAN" || userRole === "ADMIN") {
      items.push({ icon: Library, label: "Library", path: "/library" });
      items.push({ icon: ArrowLeftRight, label: "Book Return", path: "/book-return" });
    }

    // Librarian gets their dashboard link
    if (userRole === "LIBRARIAN") {
      items.unshift({ icon: LayoutDashboard, label: "Librarian Dashboard", path: "/librarian-dashboard" });
    }

    // Homework for Faculty and Students
    if (userRole === "FACULTY" || userRole === "STUDENT") {
      items.push({ icon: PenSquare, label: "Homework", path: "/homework" });
    }

    // Only Admin gets student management
    if (userRole === "ADMIN") {
      items.push({ icon: Users, label: "Student Management", path: "/students" });
    }

    if (userRole === "ADMIN") {
      items.push({ icon: Users, label: "Course Management", path: "/courses" });
    }

    return items;
  };

  const menuItems = getMenuItems();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Menu className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Navigation</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {menuItems.map((item) => (
          <DropdownMenuItem key={item.path} onClick={() => navigate(item.path)}>
            <item.icon className="mr-2 h-4 w-4" />
            {item.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/settings")}>
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
