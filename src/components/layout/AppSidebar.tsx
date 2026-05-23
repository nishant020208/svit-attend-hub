import { useLocation } from "react-router-dom";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, ClipboardCheck, Calendar, GraduationCap,
  Users, BookOpen, Layers, Library, ArrowLeftRight,
  FileText, Bell, Settings, Megaphone, Link2,
  Building2, UserPlus, PenSquare, User, MessageSquare,
  ShieldAlert, Activity, Brain, TrendingUp, Grid3x3, Heart, FileSpreadsheet
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import svitLogo from "@/assets/svit-logo-official.jpg";

interface AppSidebarProps {
  userRole?: string;
}

const sidebarGroups = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, roles: ["ADMIN", "FACULTY", "STUDENT", "PARENT", "LIBRARIAN"] },
    ],
  },
  {
    label: "Academic",
    items: [
      { title: "Attendance", url: "/attendance", icon: ClipboardCheck, roles: ["ADMIN", "FACULTY", "STUDENT"] },
      { title: "QR Attendance", url: "/attendance-qr", icon: ClipboardCheck, roles: ["ADMIN", "FACULTY", "STUDENT"] },
      { title: "Results", url: "/results", icon: GraduationCap, roles: ["ADMIN", "FACULTY", "STUDENT", "PARENT"] },
      { title: "Timetable", url: "/timetable", icon: Calendar, roles: ["ADMIN", "FACULTY", "STUDENT"] },
      { title: "Homework", url: "/homework", icon: PenSquare, roles: ["FACULTY", "STUDENT"] },
      { title: "Leave", url: "/leave", icon: FileText, roles: ["ADMIN", "FACULTY", "STUDENT"] },
    ],
  },
  {
    label: "Users",
    items: [
      { title: "Students", url: "/students", icon: Users, roles: ["ADMIN"] },
      { title: "Parent Links", url: "/parent-links", icon: Link2, roles: ["ADMIN"] },
      { title: "Student Assign", url: "/student-assign", icon: UserPlus, roles: ["ADMIN"] },
    ],
  },
  {
    label: "Management",
    items: [
      { title: "Courses", url: "/courses", icon: BookOpen, roles: ["ADMIN"] },
      { title: "Subjects", url: "/subjects", icon: Layers, roles: ["ADMIN"] },
      { title: "Course Structure", url: "/course-structure", icon: Building2, roles: ["ADMIN"] },
      { title: "Library", url: "/library", icon: Library, roles: ["STUDENT", "LIBRARIAN", "ADMIN"] },
      { title: "Book Return", url: "/book-return", icon: ArrowLeftRight, roles: ["STUDENT", "LIBRARIAN", "ADMIN"] },
      { title: "Librarian Dashboard", url: "/librarian-dashboard", icon: LayoutDashboard, roles: ["LIBRARIAN"] },
    ],
  },
  {
    label: "Risk & Intervention",
    items: [
      { title: "Risk Analytics", url: "/risk", icon: ShieldAlert, roles: ["ADMIN", "FACULTY"] },
      { title: "Interventions", url: "/risk/interventions", icon: Activity, roles: ["ADMIN", "FACULTY"] },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Announcements", url: "/announcements", icon: Megaphone, roles: ["ADMIN", "FACULTY", "STUDENT", "PARENT"] },
      { title: "Reports", url: "/reports", icon: FileText, roles: ["ADMIN", "FACULTY"] },
      { title: "Notifications", url: "/notifications", icon: Bell, roles: ["ADMIN", "FACULTY", "STUDENT", "PARENT"] },
      { title: "Feedback", url: "/feedback", icon: MessageSquare, roles: ["ADMIN", "FACULTY", "STUDENT", "PARENT"] },
      { title: "Settings", url: "/settings", icon: Settings, roles: ["ADMIN", "FACULTY", "STUDENT", "PARENT", "LIBRARIAN"] },
    ],
  },
];

export function AppSidebar({ userRole }: AppSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-3">
        <div className="flex items-center gap-2">
          <img
            src={svitLogo}
            alt="SVIT Logo"
            className="h-9 w-9 rounded-lg object-contain shadow-sm border border-sidebar-border"
          />
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-sidebar-foreground truncate">SVIT ERP</p>
              <p className="text-[10px] text-muted-foreground truncate">College Management</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {sidebarGroups.map((group) => {
          const visibleItems = group.items.filter(
            (item) => !userRole || item.roles.includes(userRole)
          );
          if (visibleItems.length === 0) return null;

          const hasActive = visibleItems.some((i) => location.pathname === i.url);

          return (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleItems.map((item) => {
                    const isActive = location.pathname === item.url;
                    return (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={item.title}
                        >
                          <NavLink
                            to={item.url}
                            className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                              isActive
                                ? "bg-primary/10 text-primary font-medium"
                                : "text-sidebar-foreground hover:bg-sidebar-accent"
                            }`}
                          >
                            <item.icon className="h-4 w-4 shrink-0" />
                            {!collapsed && <span className="truncate">{item.title}</span>}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="p-2">
        {!collapsed && (
          <p className="text-[10px] text-muted-foreground text-center">
            © 2026 SVIT ERP
          </p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
