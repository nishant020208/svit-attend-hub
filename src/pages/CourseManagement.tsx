import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TopTabs } from "@/components/layout/TopTabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function CourseManagement() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [newCourse, setNewCourse] = useState({ name: "", code: "" });
  const [newSection, setNewSection] = useState({ name: "", course_id: "", year: "" });

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

      setUser(session.user);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (profileData?.role !== "ADMIN") {
        navigate("/");
        return;
      }

      setProfile(profileData);
      fetchCourses();
      fetchSections();
    } catch (error) {
      console.error("Auth error:", error);
      navigate("/auth");
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .order("name");

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error("Error fetching courses:", error);
    }
  };

  const fetchSections = async () => {
    try {
      const { data, error } = await supabase
        .from("sections")
        .select(`
          *,
          courses (name, code)
        `)
        .order("name");

      if (error) throw error;
      setSections(data || []);
    } catch (error) {
      console.error("Error fetching sections:", error);
    }
  };

  const handleCreateCourse = async () => {
    if (!newCourse.name || !newCourse.code) {
      toast.error("Please fill all fields");
      return;
    }

    try {
      const { error } = await supabase.from("courses").insert({
        name: newCourse.name,
        code: newCourse.code,
      });

      if (error) throw error;

      toast.success("Course created successfully");
      setNewCourse({ name: "", code: "" });
      setCourseDialogOpen(false);
      fetchCourses();
    } catch (error: any) {
      console.error("Error creating course:", error);
      toast.error(error.message || "Failed to create course");
    }
  };

  const handleCreateSection = async () => {
    if (!newSection.name || !newSection.course_id || !newSection.year) {
      toast.error("Please fill all fields");
      return;
    }

    try {
      const { error } = await supabase.from("sections").insert({
        name: newSection.name,
        course_id: newSection.course_id,
        year: parseInt(newSection.year),
      });

      if (error) throw error;

      toast.success("Section created successfully");
      setNewSection({ name: "", course_id: "", year: "" });
      setSectionDialogOpen(false);
      fetchSections();
    } catch (error: any) {
      console.error("Error creating section:", error);
      toast.error(error.message || "Failed to create section");
    }
  };

  const handleDeleteCourse = async (id: string) => {
    try {
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) throw error;
      toast.success("Course deleted");
      fetchCourses();
      fetchSections();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete course");
    }
  };

  const handleDeleteSection = async (id: string) => {
    try {
      const { error } = await supabase.from("sections").delete().eq("id", id);
      if (error) throw error;
      toast.success("Section deleted");
      fetchSections();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete section");
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <TopTabs userEmail={user?.email} userName={profile?.name} userRole={profile?.role} />
      <main className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Course & Section Management</h1>
          <p className="text-muted-foreground">Manage courses and sections</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Courses</CardTitle>
              <Dialog open={courseDialogOpen} onOpenChange={setCourseDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Course
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Course</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label>Course Name</Label>
                      <Input
                        value={newCourse.name}
                        onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                        placeholder="e.g., Bachelor of Technology"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Course Code</Label>
                      <Input
                        value={newCourse.code}
                        onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })}
                        placeholder="e.g., B.Tech"
                      />
                    </div>
                    <Button onClick={handleCreateCourse} className="w-full">
                      Create Course
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courses.map((course) => (
                    <TableRow key={course.id}>
                      <TableCell className="font-medium">{course.code}</TableCell>
                      <TableCell>{course.name}</TableCell>
                      <TableCell>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteCourse(course.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Sections</CardTitle>
              <Dialog open={sectionDialogOpen} onOpenChange={setSectionDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Section
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Section</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label>Section Name</Label>
                      <Input
                        value={newSection.name}
                        onChange={(e) => setNewSection({ ...newSection, name: e.target.value })}
                        placeholder="e.g., A"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Course</Label>
                      <select
                        className="w-full rounded-md border border-input bg-background px-3 py-2"
                        value={newSection.course_id}
                        onChange={(e) => setNewSection({ ...newSection, course_id: e.target.value })}
                      >
                        <option value="">Select course</option>
                        {courses.map((course) => (
                          <option key={course.id} value={course.id}>
                            {course.code} - {course.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Year</Label>
                      <Input
                        type="number"
                        value={newSection.year}
                        onChange={(e) => setNewSection({ ...newSection, year: e.target.value })}
                        placeholder="e.g., 1"
                      />
                    </div>
                    <Button onClick={handleCreateSection} className="w-full">
                      Create Section
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Section</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sections.map((section) => (
                    <TableRow key={section.id}>
                      <TableCell className="font-medium">{section.name}</TableCell>
                      <TableCell>{section.courses?.code}</TableCell>
                      <TableCell>{section.year}</TableCell>
                      <TableCell>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteSection(section.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
