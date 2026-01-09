import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { TopTabs } from "@/components/layout/TopTabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Upload, FileText, Clock, CheckCircle, XCircle, Download, User } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { FloatingGeometry } from "@/components/ui/FloatingGeometry";
import { format } from "date-fns";

interface Homework {
  id: string;
  teacher_id: string;
  title: string;
  description: string | null;
  subject: string;
  course: string;
  section: string;
  year: number;
  homework_type: string;
  due_date: string;
  created_at: string;
  profiles?: { name: string };
}

interface HomeworkSubmission {
  id: string;
  homework_id: string;
  student_id: string;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  submitted_at: string;
  status: string;
  grade: string | null;
  teacher_remarks: string | null;
  students?: {
    roll_number: string;
    user_id: string;
    profiles?: { name: string; email: string };
  };
}

const HOMEWORK_TYPES = [
  { value: "assignment", label: "Assignment" },
  { value: "project", label: "Project" },
  { value: "presentation", label: "Presentation" },
  { value: "lab_work", label: "Lab Work" },
  { value: "quiz", label: "Quiz" },
  { value: "essay", label: "Essay" },
];

export default function Homework() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { role, loading: roleLoading, userId } = useUserRole();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [homeworkList, setHomeworkList] = useState<Homework[]>([]);
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>([]);
  const [studentId, setStudentId] = useState<string>("");
  const [studentData, setStudentData] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedHomework, setSelectedHomework] = useState<Homework | null>(null);
  const [submissionDialogOpen, setSubmissionDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Dropdown data
  const [courses, setCourses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [sections, setSections] = useState<string[]>([]);

  // New homework form
  const [newHomework, setNewHomework] = useState({
    title: "",
    description: "",
    subject: "",
    course: "",
    section: "",
    year: "1",
    homework_type: "assignment",
    due_date: "",
  });

  useEffect(() => {
    checkAuth();
    fetchDropdownData();
  }, []);

  useEffect(() => {
    if (!roleLoading && role) {
      if (role === "STUDENT" && userId) {
        fetchStudentData(userId);
      } else if (role === "FACULTY" || role === "ADMIN") {
        fetchTeacherHomework();
      }
    }
  }, [role, roleLoading, userId]);

  const fetchDropdownData = async () => {
    const [coursesRes, subjectsRes, sectionsRes] = await Promise.all([
      supabase.from("courses").select("name, code").order("name"),
      supabase.from("subjects").select("name, code").order("name"),
      supabase.from("students").select("section").order("section"),
    ]);

    setCourses(coursesRes.data || []);
    setSubjects(subjectsRes.data || []);

    const uniqueSections = [...new Set((sectionsRes.data || []).map((s) => s.section))].filter(Boolean);
    setSections(uniqueSections as string[]);
  };

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
    } catch (error) {
      console.error("Auth error:", error);
      navigate("/auth");
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentData = async (userIdParam: string) => {
    const { data: student } = await supabase
      .from("students")
      .select("*")
      .eq("user_id", userIdParam)
      .single();

    if (student) {
      setStudentId(student.id);
      setStudentData(student);
      await fetchStudentHomework(student);
    }
  };

  const fetchStudentHomework = async (student: any) => {
    const { data: homework, error } = await supabase
      .from("homework")
      .select("*, profiles:teacher_id (name)")
      .eq("course", student.course)
      .eq("section", student.section)
      .eq("year", student.year)
      .order("due_date", { ascending: true });

    if (!error && homework) {
      setHomeworkList(homework);

      // Fetch submissions for this student
      const homeworkIds = homework.map((h) => h.id);
      if (homeworkIds.length > 0) {
        const { data: subs } = await supabase
          .from("homework_submissions")
          .select("*")
          .eq("student_id", student.id)
          .in("homework_id", homeworkIds);

        setSubmissions(subs || []);
      }
    }
  };

  const fetchTeacherHomework = async () => {
    const { data: homework, error } = await supabase
      .from("homework")
      .select("*, profiles:teacher_id (name)")
      .order("created_at", { ascending: false });

    if (!error && homework) {
      setHomeworkList(homework);
    }
  };

  const fetchSubmissionsForHomework = async (homeworkId: string) => {
    const { data, error } = await supabase
      .from("homework_submissions")
      .select(`
        *,
        students (
          roll_number,
          user_id,
          profiles:user_id (name, email)
        )
      `)
      .eq("homework_id", homeworkId);

    if (!error) {
      setSubmissions(data || []);
    }
  };

  const handleCreateHomework = async () => {
    if (!newHomework.title || !newHomework.subject || !newHomework.course || !newHomework.section || !newHomework.due_date) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from("homework").insert({
        teacher_id: user.id,
        title: newHomework.title,
        description: newHomework.description,
        subject: newHomework.subject,
        course: newHomework.course,
        section: newHomework.section,
        year: parseInt(newHomework.year),
        homework_type: newHomework.homework_type,
        due_date: newHomework.due_date,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Homework created successfully",
      });

      setDialogOpen(false);
      setNewHomework({
        title: "",
        description: "",
        subject: "",
        course: "",
        section: "",
        year: "1",
        homework_type: "assignment",
        due_date: "",
      });
      fetchTeacherHomework();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = async (file: File, homeworkId: string) => {
    if (!studentId) {
      toast({
        title: "Error",
        description: "Student ID not found",
        variant: "destructive",
      });
      return;
    }

    setUploadingFile(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${studentId}/${homeworkId}/${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("homework")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("homework")
        .getPublicUrl(fileName);

      // Check if submission exists
      const { data: existing } = await supabase
        .from("homework_submissions")
        .select("id")
        .eq("homework_id", homeworkId)
        .eq("student_id", studentId)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from("homework_submissions")
          .update({
            file_url: urlData.publicUrl,
            file_name: file.name,
            file_type: file.type,
            submitted_at: new Date().toISOString(),
            status: "submitted",
          })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase.from("homework_submissions").insert({
          homework_id: homeworkId,
          student_id: studentId,
          file_url: urlData.publicUrl,
          file_name: file.name,
          file_type: file.type,
          status: "submitted",
        });

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Homework submitted successfully",
      });

      setSubmissionDialogOpen(false);
      if (studentData) {
        fetchStudentHomework(studentData);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingFile(false);
    }
  };

  const handleGradeSubmission = async (submissionId: string, grade: string, remarks: string) => {
    try {
      const { error } = await supabase
        .from("homework_submissions")
        .update({
          grade,
          teacher_remarks: remarks,
          status: "graded",
        })
        .eq("id", submissionId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Submission graded",
      });

      if (selectedHomework) {
        fetchSubmissionsForHomework(selectedHomework.id);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getSubmissionStatus = (homeworkId: string) => {
    const submission = submissions.find((s) => s.homework_id === homeworkId);
    if (!submission) return { status: "pending", submission: null };
    return { status: submission.status, submission };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "submitted":
        return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="h-3 w-3" /> Submitted</Badge>;
      case "graded":
        return <Badge variant="default" className="flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Graded</Badge>;
      case "pending":
        return <Badge variant="outline" className="flex items-center gap-1"><XCircle className="h-3 w-3" /> Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  if (loading || roleLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-20 sm:pb-0">
      <FloatingGeometry variant="colorful" />
      <TopTabs userEmail={user?.email} userName={profile?.name} userRole={role || undefined} />
      <main className="container mx-auto p-4 md:p-6">
        <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              Homework
            </h1>
            <p className="text-muted-foreground">
              {role === "STUDENT" ? "View and submit your assignments" : "Manage homework and review submissions"}
            </p>
            {role === "STUDENT" && studentData && (
              <p className="text-sm text-primary font-medium mt-1">
                Student ID: {studentData.roll_number} | {studentData.course} - Year {studentData.year} - Section {studentData.section}
              </p>
            )}
          </div>

          {(role === "FACULTY" || role === "ADMIN") && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gradient-primary hover-scale">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Homework
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Homework</DialogTitle>
                  <DialogDescription>Assign homework to students</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Title *</Label>
                    <Input
                      placeholder="Homework title"
                      value={newHomework.title}
                      onChange={(e) => setNewHomework({ ...newHomework, title: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      placeholder="Describe the homework..."
                      value={newHomework.description}
                      onChange={(e) => setNewHomework({ ...newHomework, description: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Type *</Label>
                      <Select value={newHomework.homework_type} onValueChange={(v) => setNewHomework({ ...newHomework, homework_type: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {HOMEWORK_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Subject *</Label>
                      <Select value={newHomework.subject} onValueChange={(v) => setNewHomework({ ...newHomework, subject: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select subject" />
                        </SelectTrigger>
                        <SelectContent>
                          {subjects.map((s) => (
                            <SelectItem key={s.code} value={s.name}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Course *</Label>
                      <Select value={newHomework.course} onValueChange={(v) => setNewHomework({ ...newHomework, course: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {courses.map((c) => (
                            <SelectItem key={c.code} value={c.name}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Year *</Label>
                      <Select value={newHomework.year} onValueChange={(v) => setNewHomework({ ...newHomework, year: v })}>
                        <SelectTrigger>
                          <SelectValue />
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
                      <Label>Section *</Label>
                      <Select value={newHomework.section} onValueChange={(v) => setNewHomework({ ...newHomework, section: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {sections.length > 0 ? sections.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          )) : (
                            <>
                              <SelectItem value="A">A</SelectItem>
                              <SelectItem value="B">B</SelectItem>
                              <SelectItem value="C">C</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Due Date *</Label>
                    <Input
                      type="datetime-local"
                      value={newHomework.due_date}
                      onChange={(e) => setNewHomework({ ...newHomework, due_date: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleCreateHomework} className="w-full gradient-primary">
                    Create Homework
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Student View */}
        {role === "STUDENT" && (
          <div className="space-y-4">
            {homeworkList.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No homework assigned yet</p>
                </CardContent>
              </Card>
            ) : (
              homeworkList.map((hw) => {
                const { status, submission } = getSubmissionStatus(hw.id);
                const overdue = isOverdue(hw.due_date) && status === "pending";

                return (
                  <Card key={hw.id} className={`shadow-lg hover:shadow-xl transition-all ${overdue ? "border-destructive/50" : ""}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline">{HOMEWORK_TYPES.find((t) => t.value === hw.homework_type)?.label || hw.homework_type}</Badge>
                            {getStatusBadge(status)}
                            {overdue && <Badge variant="destructive">Overdue</Badge>}
                          </div>
                          <CardTitle className="text-lg">{hw.title}</CardTitle>
                          <CardDescription>
                            {hw.subject} | Due: {format(new Date(hw.due_date), "PPp")}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {hw.description && (
                        <p className="text-sm text-muted-foreground mb-4">{hw.description}</p>
                      )}

                      {submission?.grade && (
                        <div className="p-3 bg-muted rounded-lg mb-4">
                          <p className="font-medium">Grade: {submission.grade}</p>
                          {submission.teacher_remarks && (
                            <p className="text-sm text-muted-foreground mt-1">Remarks: {submission.teacher_remarks}</p>
                          )}
                        </div>
                      )}

                      {submission?.file_url && (
                        <div className="flex items-center gap-2 mb-4">
                          <FileText className="h-4 w-4" />
                          <a href={submission.file_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm">
                            {submission.file_name || "View Submission"}
                          </a>
                        </div>
                      )}

                      {status !== "graded" && (
                        <Dialog open={submissionDialogOpen && selectedHomework?.id === hw.id} onOpenChange={(open) => {
                          setSubmissionDialogOpen(open);
                          if (open) setSelectedHomework(hw);
                        }}>
                          <DialogTrigger asChild>
                            <Button variant={status === "pending" ? "default" : "outline"} className={status === "pending" ? "gradient-primary" : ""}>
                              <Upload className="mr-2 h-4 w-4" />
                              {status === "pending" ? "Submit Homework" : "Update Submission"}
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Submit Homework</DialogTitle>
                              <DialogDescription>Upload your homework file (PDF, PPT, DOC, JPEG, etc.)</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <Input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.gif"
                                disabled={uploadingFile}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handleFileUpload(file, hw.id);
                                  }
                                }}
                              />
                              <p className="text-xs text-muted-foreground">
                                Supported formats: PDF, PPT, PPTX, DOC, DOCX, XLS, XLSX, CSV, JPG, JPEG, PNG, GIF
                              </p>
                              {uploadingFile && (
                                <div className="flex items-center gap-2">
                                  <LoadingSpinner />
                                  <span className="text-sm">Uploading...</span>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        )}

        {/* Teacher/Admin View */}
        {(role === "FACULTY" || role === "ADMIN") && (
          <Tabs defaultValue="homework" className="space-y-4">
            <TabsList>
              <TabsTrigger value="homework">Homework List</TabsTrigger>
              <TabsTrigger value="submissions">Submissions</TabsTrigger>
            </TabsList>

            <TabsContent value="homework" className="space-y-4">
              {homeworkList.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No homework created yet</p>
                  </CardContent>
                </Card>
              ) : (
                homeworkList.map((hw) => (
                  <Card key={hw.id} className="shadow-lg hover:shadow-xl transition-all">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline">{HOMEWORK_TYPES.find((t) => t.value === hw.homework_type)?.label}</Badge>
                            <Badge variant="secondary">{hw.course} - Y{hw.year} - {hw.section}</Badge>
                          </div>
                          <CardTitle className="text-lg">{hw.title}</CardTitle>
                          <CardDescription>
                            {hw.subject} | Due: {format(new Date(hw.due_date), "PPp")}
                          </CardDescription>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedHomework(hw);
                            fetchSubmissionsForHomework(hw.id);
                          }}
                        >
                          View Submissions
                        </Button>
                      </div>
                    </CardHeader>
                    {hw.description && (
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{hw.description}</p>
                      </CardContent>
                    )}
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="submissions" className="space-y-4">
              {selectedHomework ? (
                <>
                  <Card className="bg-muted/50">
                    <CardContent className="py-4">
                      <h3 className="font-semibold">{selectedHomework.title}</h3>
                      <p className="text-sm text-muted-foreground">{selectedHomework.subject} | Due: {format(new Date(selectedHomework.due_date), "PPp")}</p>
                    </CardContent>
                  </Card>

                  {submissions.length === 0 ? (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <p className="text-muted-foreground">No submissions yet</p>
                      </CardContent>
                    </Card>
                  ) : (
                    submissions.map((sub) => (
                      <Card key={sub.id} className="shadow-lg">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <User className="h-4 w-4" />
                                <span className="font-medium">{sub.students?.profiles?.name}</span>
                                <span className="text-sm text-muted-foreground">({sub.students?.roll_number})</span>
                              </div>
                              <CardDescription>
                                User ID: {sub.students?.user_id?.slice(0, 8)}... | Submitted: {format(new Date(sub.submitted_at), "PPp")}
                              </CardDescription>
                            </div>
                            {getStatusBadge(sub.status)}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {sub.file_url && (
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              <a href={sub.file_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                {sub.file_name || "View File"} ({sub.file_type})
                              </a>
                              <a href={sub.file_url} download className="ml-2">
                                <Download className="h-4 w-4 text-muted-foreground hover:text-primary" />
                              </a>
                            </div>
                          )}

                          {sub.status !== "graded" && (
                            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                              <div>
                                <Label>Grade</Label>
                                <Select onValueChange={(grade) => handleGradeSubmission(sub.id, grade, "")}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select grade" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="AA">AA (Excellent)</SelectItem>
                                    <SelectItem value="AB">AB (Very Good)</SelectItem>
                                    <SelectItem value="BB">BB (Good)</SelectItem>
                                    <SelectItem value="BC">BC (Above Average)</SelectItem>
                                    <SelectItem value="CC">CC (Average)</SelectItem>
                                    <SelectItem value="CD">CD (Below Average)</SelectItem>
                                    <SelectItem value="DD">DD (Pass)</SelectItem>
                                    <SelectItem value="FF">FF (Fail)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          )}

                          {sub.grade && (
                            <div className="p-3 bg-muted rounded-lg">
                              <p className="font-medium">Grade: {sub.grade}</p>
                              {sub.teacher_remarks && (
                                <p className="text-sm text-muted-foreground mt-1">Remarks: {sub.teacher_remarks}</p>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">Select a homework to view submissions</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
