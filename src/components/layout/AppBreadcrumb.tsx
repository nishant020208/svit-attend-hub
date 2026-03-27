import { useLocation } from "react-router-dom";
import { Link } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const routeLabels: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/attendance": "Attendance",
  "/attendance-qr": "QR Attendance",
  "/leave": "Leave Management",
  "/timetable": "Timetable",
  "/results": "Results",
  "/announcements": "Announcements",
  "/reports": "Reports",
  "/notifications": "Notifications",
  "/settings": "Settings",
  "/courses": "Courses",
  "/subjects": "Subjects",
  "/students": "Students",
  "/parent-links": "Parent Links",
  "/library": "Library",
  "/librarian-dashboard": "Librarian Dashboard",
  "/book-return": "Book Return",
  "/homework": "Homework",
  "/course-structure": "Course Structure",
  "/student-assign": "Student Assign",
  "/feedback": "Feedback",
  "/student-profile": "Student Profile",
  "/about": "About Us",
  "/install": "Install",
};

export function AppBreadcrumb() {
  const location = useLocation();
  const pathname = location.pathname;

  // Don't show breadcrumb on dashboard
  if (pathname === "/dashboard") return null;

  const currentLabel = routeLabels[pathname] || pathname.replace("/", "").replace(/-/g, " ");

  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/dashboard" className="text-muted-foreground hover:text-foreground">
              Dashboard
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage className="capitalize">{currentLabel}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
