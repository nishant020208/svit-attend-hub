import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  
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

      setProfile(profileData);

      if (profileData?.role !== "ADMIN") {
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
        .order("created_at", { ascending: false });

      if (error) throw error;
      setStudents(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.name || !formData.rollNumber || !formData.course || !formData.year || !formData.section) {
      toast({
        title: "Error",
        description: "Please fill all fields",
        variant: "destructive",
      });
      return;
    }

    try {
      // Check if email already exists in profiles
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("email", formData.email)
        .maybeSingle();

      if (existingProfile && existingProfile.role === "STUDENT") {
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
            roll_number: formData.rollNumber,
            course: formData.course,
            year: parseInt(formData.year),
            section: formData.section,
          });

        if (studentError) throw studentError;

        toast({
          title: "Success",
          description: "Student added to class list successfully",
        });
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
            email: formData.email,
            name: formData.name,
            role: "STUDENT",
            added_by: user.id,
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
      <TopTabs userEmail={user?.email} userName={profile?.name} userRole={profile?.role} />
      <main className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Student Management</h1>
          <p className="text-muted-foreground">Add students to class lists</p>
        </div>

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
                  />
                </div>
                <div>
                  <Label>Student Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <Label>Roll Number</Label>
                  <Input
                    value={formData.rollNumber}
                    onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                    placeholder="2024001"
                  />
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
              <CardTitle>Enrolled Students ({students.length})</CardTitle>
              <CardDescription>All students in the system</CardDescription>
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
                    {students.map((student) => (
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
                {students.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No students added yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
