import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

// Eager load critical pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";

// Lazy load other pages for faster initial load
const StudentDashboard = lazy(() => import("./pages/StudentDashboard"));
const TeacherDashboard = lazy(() => import("./pages/TeacherDashboard"));
const ParentDashboard = lazy(() => import("./pages/ParentDashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Attendance = lazy(() => import("./pages/Attendance"));
const AttendanceQR = lazy(() => import("./pages/AttendanceQR"));
const LeaveManagement = lazy(() => import("./pages/LeaveManagement"));
const Timetable = lazy(() => import("./pages/Timetable"));
const Announcements = lazy(() => import("./pages/Announcements"));
const Reports = lazy(() => import("./pages/Reports"));
const Results = lazy(() => import("./pages/Results"));
const Settings = lazy(() => import("./pages/Settings"));
const CourseManagement = lazy(() => import("./pages/CourseManagement"));
const SubjectManagement = lazy(() => import("./pages/SubjectManagement"));
const Notifications = lazy(() => import("./pages/Notifications"));
const StudentManagement = lazy(() => import("./pages/StudentManagement"));
const AboutUs = lazy(() => import("./pages/AboutUs"));
const Install = lazy(() => import("./pages/Install"));
const ParentLinks = lazy(() => import("./pages/ParentLinks"));
const LibraryQR = lazy(() => import("./pages/LibraryQR"));
const LibrarianDashboard = lazy(() => import("./pages/LibrarianDashboard"));
const BookReturn = lazy(() => import("./pages/BookReturn"));
const Homework = lazy(() => import("./pages/Homework"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (previously cacheTime)
      refetchOnWindowFocus: false,
    },
  },
});

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <LoadingSpinner />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="app-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/attendance" element={<Attendance />} />
              <Route path="/attendance-qr" element={<AttendanceQR />} />
              <Route path="/leave" element={<LeaveManagement />} />
              <Route path="/timetable" element={<Timetable />} />
              <Route path="/announcements" element={<Announcements />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/results" element={<Results />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/courses" element={<CourseManagement />} />
              <Route path="/subjects" element={<SubjectManagement />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/students" element={<StudentManagement />} />
              <Route path="/parent-links" element={<ParentLinks />} />
              <Route path="/about" element={<AboutUs />} />
              <Route path="/install" element={<Install />} />
              <Route path="/library" element={<LibraryQR />} />
              <Route path="/librarian-dashboard" element={<LibrarianDashboard />} />
              <Route path="/book-return" element={<BookReturn />} />
              <Route path="/homework" element={<Homework />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
