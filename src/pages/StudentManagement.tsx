import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { studentSchema, type StudentFormData } from "@/lib/validationSchemas";
import { TopTabs } from "@/components/layout/TopTabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { UserPlus, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function StudentManagement() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { role, loading: roleLoading, userId } = useUserRole();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  // Filter states
  const [filterCourse, setFilterCourse] = useState<string>("all");
  const [filterYear, setFilterYear] = useState<string>("all");
  const [filterSection, setFilterSection] = useState<string>("all");
  
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    rollNumber: "",
    course: "",
    year: "",
    section: "",
  });

  useEffect(() => {
    checkAuth();
  }, [role, roleLoading]);

  const checkAuth = async () => {
    if (roleLoading) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setUser(session.user);

      if (role !== "ADMIN") {
        navigate("/dashboard");
        return;
      }

      await fetchStudents();
    } catch (error: any) {
      console.error("Auth error:", error);
      navigate("/auth");
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from("students")
        .select(`
          *,
          profiles:user_id (name, email)
        `)
        .order("course", { ascending: true })
        .order("year", { ascending: true })
        .order("section", { ascending: true })
        .order("roll_number", { ascending: true });

      if (error) throw error;
      setStudents(data || []);
      setFilteredStudents(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Apply filters whenever filter values or students change
  useEffect(() => {
    let filtered = [...students];

    if (filterCourse !== "all") {
      filtered = filtered.filter(s => s.course === filterCourse);
    }
    if (filterYear !== "all") {
      filtered = filtered.filter(s => s.year.toString() === filterYear);
    }
    if (filterSection !== "all") {
      filtered = filtered.filter(s => s.section === filterSection);
    }

    setFilteredStudents(filtered);
  }, [students, filterCourse, filterYear, filterSection]);

  // Get unique values for filters
  const uniqueCourses = Array.from(new Set(students.map(s => s.course))).sort();
  const uniqueYears = Array.from(new Set(students.map(s => s.year.toString()))).sort();
  const uniqueSections = Array.from(new Set(students.map(s => s.section))).sort();

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    
    // Validate form data with zod
    try {
      const validatedData = studentSchema.parse({
        ...formData,
        year: parseInt(formData.year, 10),
      });
      
      await addStudentToDatabase(validatedData);
    } catch (error: any) {
      if (error.errors) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err: any) => {
          if (err.path[0]) {
            errors[err.path[0]] = err.message;
          }
        });
        setValidationErrors(errors);
        toast({
          title: "Validation Error",
          description: "Please check the form for errors",
          variant: "destructive",
        });
      }
      return;
    }
  };

  const addStudentToDatabase = async (validatedData: StudentFormData) => {
    try {
      // Check if email already exists in profiles
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", validatedData.email)
        .maybeSingle();

      if (existingProfile) {
        // Check if user has STUDENT role in user_roles table
        const { data: existingRole } = await (supabase as any)
          .from("user_roles")
          .select("role")
          .eq("user_id", existingProfile.id)
          .eq("role", "STUDENT")
          .maybeSingle();

        if (existingRole) {
        // Profile exists, check if student record exists
        const { data: existingStudent } = await supabase
          .from("students")
          .select("id")
          .eq("user_id", existingProfile.id)
          .maybeSingle();

        if (existingStudent) {
          toast({
            title: "Error",
            description: "This student already exists in the system",
            variant: "destructive",
          });
          return;
        }

        // Create student record for existing profile
        const { error: studentError } = await supabase
          .from("students")
          .insert({
            user_id: existingProfile.id,
            roll_number: validatedData.rollNumber,
            course: validatedData.course,
            year: validatedData.year,
            section: validatedData.section,
          });

        if (studentError) throw studentError;

        toast({
          title: "Success",
          description: "Student added to class list successfully",
        });
        } else {
          toast({
            title: "Info",
            description: "Profile exists but user is not a student. Cannot add to class list.",
            variant: "default",
          });
        }
      } else {
        toast({
          title: "Info",
          description: "Student must first register with this email. Add them to whitelist and ask them to sign up.",
          variant: "default",
        });

        // Add to whitelist
        const { error: whitelistError } = await supabase
          .from("whitelist")
          .insert({
            email: validatedData.email,
            name: validatedData.name,
            role: "STUDENT",
            added_by: userId,
          });

        if (whitelistError && !whitelistError.message.includes("duplicate")) {
          throw whitelistError;
        }
      }

      setFormData({
        email: "",
        name: "",
        rollNumber: "",
        course: "",
        year: "",
        section: "",
      });

      await fetchStudents();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    try {
      const { error } = await supabase
        .from("students")
        .delete()
        .eq("id", studentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Student removed from class list",
      });

      await fetchStudents();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-background">
      <TopTabs userEmail={user?.email} userName={user?.user_metadata?.name} userRole={role || undefined} />
      <main className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Student Management</h1>
          <p className="text-muted-foreground">Add and manage students by class</p>
        </div>

        {/* Filter Section */}
        <Card className="glass-effect mb-6">
          <CardHeader>
            <CardTitle>Filter Students</CardTitle>
            <CardDescription>Filter students by course, year, and section</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Course</Label>
                <Select value={filterCourse} onValueChange={setFilterCourse}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Courses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Courses</SelectItem>
                    {uniqueCourses.map(course => (
                      <SelectItem key={course} value={course}>{course}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Year</Label>
                <Select value={filterYear} onValueChange={setFilterYear}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Years" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {uniqueYears.map(year => (
                      <SelectItem key={year} value={year}>Year {year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Section</Label>
                <Select value={filterSection} onValueChange={setFilterSection}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Sections" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    {uniqueSections.map(section => (
                      <SelectItem key={section} value={section}>Section {section}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="glass-effect">
            <CardHeader>
              <CardTitle>Add Student to Class</CardTitle>
              <CardDescription>Enter student details to add them to a class list</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddStudent} className="space-y-4">
                <div>
                  <Label>Student Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="student@example.com"
                    className={validationErrors.email ? "border-red-500" : ""}
                  />
                  {validationErrors.email && (
                    <p className="text-sm text-red-500 mt-1">{validationErrors.email}</p>
                  )}
                </div>
                <div>
                  <Label>Student Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="John Doe"
                    className={validationErrors.name ? "border-red-500" : ""}
                  />
                  {validationErrors.name && (
                    <p className="text-sm text-red-500 mt-1">{validationErrors.name}</p>
                  )}
                </div>
                <div>
                  <Label>Roll Number</Label>
                  <Input
                    value={formData.rollNumber}
                    onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                    placeholder="2024001"
                    className={validationErrors.rollNumber ? "border-red-500" : ""}
                  />
                  {validationErrors.rollNumber && (
                    <p className="text-sm text-red-500 mt-1">{validationErrors.rollNumber}</p>
                  )}
                </div>
                <div>
                  <Label>Course</Label>
                  <Select value={formData.course} onValueChange={(val) => setFormData({ ...formData, course: val })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select course" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="B.Tech">B.Tech</SelectItem>
                      <SelectItem value="M.Tech">M.Tech</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Year</Label>
                  <Select value={formData.year} onValueChange={(val) => setFormData({ ...formData, year: val })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1st Year</SelectItem>
                      <SelectItem value="2">2nd Year</SelectItem>
                      <SelectItem value="3">3rd Year</SelectItem>
                      <SelectItem value="4">4th Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Section</Label>
                  <Select value={formData.section} onValueChange={(val) => setFormData({ ...formData, section: val })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select section" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">Section A</SelectItem>
                      <SelectItem value="B">Section B</SelectItem>
                      <SelectItem value="C">Section C</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full gradient-primary">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Student
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="glass-effect">
            <CardHeader>
              <CardTitle>Enrolled Students ({filteredStudents.length})</CardTitle>
              <CardDescription>
                {filterCourse !== "all" || filterYear !== "all" || filterSection !== "all" 
                  ? `Showing filtered students` 
                  : `All students in the system`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Roll No</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.profiles?.name}</TableCell>
                        <TableCell>{student.roll_number}</TableCell>
                        <TableCell>
                          {student.course} Y{student.year}-{student.section}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteStudent(student.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filteredStudents.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    {students.length === 0 
                      ? "No students added yet" 
                      : "No students match the selected filters"}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
