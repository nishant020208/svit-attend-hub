import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TopTabs } from "@/components/layout/TopTabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { 
  GraduationCap, Plus, Upload, Download, FileText, 
  Trophy, Calculator, Search, Filter, Printer
} from "lucide-react";
import Papa from "papaparse";
import { FloatingGeometry } from "@/components/ui/FloatingGeometry";

interface GradeConfig {
  id: string;
  grade: string;
  min_percentage: number;
  max_percentage: number;
  grade_points: number;
  description: string;
}

interface Exam {
  id: string;
  name: string;
  exam_type: string;
  course: string;
  section: string;
  year: number;
  subject: string;
  max_marks: number;
  passing_marks: number;
  exam_date: string | null;
}

interface Result {
  id: string;
  exam_id: string;
  student_id: string;
  marks_obtained: number;
  max_marks: number;
  percentage: number;
  grade: string;
  remarks: string | null;
  students?: {
    roll_number: string;
    profiles?: { name: string; email: string };
  };
}

export default function Results() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { role, loading: roleLoading } = useUserRole();
  
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [exams, setExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [gradeConfig, setGradeConfig] = useState<GradeConfig[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  
  const [selectedExam, setSelectedExam] = useState<string>("");
  const [showCreateExam, setShowCreateExam] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  
  // New exam form
  const [newExam, setNewExam] = useState({
    name: "",
    exam_type: "INTERNAL",
    course: "",
    section: "",
    year: 1,
    subject: "",
    max_marks: 100,
    passing_marks: 35,
    exam_date: "",
  });
  
  // Manual marks entry
  const [marksEntry, setMarksEntry] = useState<Record<string, number>>({});
  
  // Filters
  const [filterCourse, setFilterCourse] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

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
      
      await Promise.all([
        fetchExams(),
        fetchGradeConfig(),
        fetchCourses(),
        fetchSubjects(),
      ]);
    } catch (error) {
      console.error("Auth error:", error);
      navigate("/auth");
    } finally {
      setLoading(false);
    }
  };

  const fetchExams = async () => {
    const { data, error } = await supabase
      .from("exams")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (!error && data) setExams(data);
  };

  const fetchGradeConfig = async () => {
    const { data, error } = await supabase
      .from("grade_config")
      .select("*")
      .order("min_percentage", { ascending: false });
    
    if (!error && data) setGradeConfig(data);
  };

  const fetchCourses = async () => {
    const { data, error } = await supabase.from("courses").select("*");
    if (!error && data) setCourses(data);
  };

  const fetchSubjects = async () => {
    const { data, error } = await supabase.from("subjects").select("*");
    if (!error && data) setSubjects(data);
  };

  const fetchStudentsForExam = async (examId: string) => {
    const exam = exams.find(e => e.id === examId);
    if (!exam) return;

    const { data, error } = await supabase
      .from("students")
      .select(`*, profiles:user_id (name, email)`)
      .eq("course", exam.course)
      .eq("section", exam.section)
      .eq("year", exam.year);
    
    if (!error && data) setStudents(data);
  };

  const fetchResultsForExam = async (examId: string) => {
    const { data, error } = await supabase
      .from("results")
      .select(`*, students (roll_number, profiles:user_id (name, email))`)
      .eq("exam_id", examId);
    
    if (!error && data) setResults(data);
  };

  const calculateGrade = (percentage: number): string => {
    for (const config of gradeConfig) {
      if (percentage >= config.min_percentage && percentage <= config.max_percentage) {
        return config.grade;
      }
    }
    return "FF";
  };

  const handleCreateExam = async () => {
    if (!newExam.name || !newExam.course || !newExam.section || !newExam.subject) {
      toast({
        title: "Error",
        description: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("exams").insert({
      ...newExam,
      created_by: user.id,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Success", description: "Exam created successfully" });
    setShowCreateExam(false);
    setNewExam({
      name: "",
      exam_type: "INTERNAL",
      course: "",
      section: "",
      year: 1,
      subject: "",
      max_marks: 100,
      passing_marks: 35,
      exam_date: "",
    });
    fetchExams();
  };

  const handleExamSelect = async (examId: string) => {
    setSelectedExam(examId);
    await Promise.all([
      fetchStudentsForExam(examId),
      fetchResultsForExam(examId),
    ]);
  };

  const handleSaveMarks = async () => {
    if (!selectedExam) return;
    
    const exam = exams.find(e => e.id === selectedExam);
    if (!exam) return;

    const entries = Object.entries(marksEntry).filter(([_, marks]) => marks !== undefined);
    
    if (entries.length === 0) {
      toast({ title: "Error", description: "No marks to save", variant: "destructive" });
      return;
    }

    const resultsToInsert = entries.map(([studentId, marks]) => {
      const percentage = (marks / exam.max_marks) * 100;
      const grade = calculateGrade(percentage);
      
      return {
        exam_id: selectedExam,
        student_id: studentId,
        marks_obtained: marks,
        max_marks: exam.max_marks,
        percentage: Math.round(percentage * 100) / 100,
        grade,
        entered_by: user.id,
      };
    });

    const { error } = await supabase
      .from("results")
      .upsert(resultsToInsert, { onConflict: "exam_id,student_id" });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Success", description: `${entries.length} results saved` });
    setMarksEntry({});
    fetchResultsForExam(selectedExam);
  };

  const handleBulkUpload = (file: File) => {
    if (!selectedExam) return;
    const exam = exams.find(e => e.id === selectedExam);
    if (!exam) return;

    Papa.parse(file, {
      header: true,
      complete: async (parseResults) => {
        const data = parseResults.data as any[];
        const validEntries: any[] = [];

        for (const row of data) {
          if (!row.roll_number || row.marks === undefined) continue;
          
          const student = students.find(s => s.roll_number === row.roll_number);
          if (!student) continue;
          
          const marks = parseFloat(row.marks);
          if (isNaN(marks) || marks < 0 || marks > exam.max_marks) continue;
          
          const percentage = (marks / exam.max_marks) * 100;
          const grade = calculateGrade(percentage);
          
          validEntries.push({
            exam_id: selectedExam,
            student_id: student.id,
            marks_obtained: marks,
            max_marks: exam.max_marks,
            percentage: Math.round(percentage * 100) / 100,
            grade,
            entered_by: user.id,
          });
        }

        if (validEntries.length === 0) {
          toast({ title: "Error", description: "No valid entries found in CSV", variant: "destructive" });
          return;
        }

        const { error } = await supabase
          .from("results")
          .upsert(validEntries, { onConflict: "exam_id,student_id" });

        if (error) {
          toast({ title: "Error", description: error.message, variant: "destructive" });
          return;
        }

        toast({ title: "Success", description: `${validEntries.length} results uploaded` });
        setShowBulkUpload(false);
        fetchResultsForExam(selectedExam);
      },
      error: () => {
        toast({ title: "Error", description: "Failed to parse CSV", variant: "destructive" });
      },
    });
  };

  const exportToCSV = () => {
    if (results.length === 0) return;
    
    const exam = exams.find(e => e.id === selectedExam);
    const csvData = results.map(r => ({
      "Roll Number": r.students?.roll_number || "",
      "Student Name": r.students?.profiles?.name || "",
      "Marks Obtained": r.marks_obtained,
      "Max Marks": r.max_marks,
      "Percentage": r.percentage,
      "Grade": r.grade,
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exam?.name || "results"}_results.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    if (results.length === 0) return;
    
    const exam = exams.find(e => e.id === selectedExam);
    
    // Create a printable HTML document
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Result Sheet - ${exam?.name || "Exam"}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .logo { font-size: 24px; font-weight: bold; color: #6366f1; }
          .college-name { font-size: 20px; margin: 10px 0; }
          .exam-info { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
          .exam-info p { margin: 5px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 12px 8px; text-align: left; }
          th { background: #6366f1; color: white; }
          tr:nth-child(even) { background: #f8f9fa; }
          .grade-AA, .grade-AB { color: #16a34a; font-weight: bold; }
          .grade-BB, .grade-BC { color: #2563eb; }
          .grade-CC, .grade-CD { color: #ca8a04; }
          .grade-DD { color: #ea580c; }
          .grade-FF { color: #dc2626; font-weight: bold; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
          .stats { display: flex; justify-content: space-around; margin: 20px 0; padding: 15px; background: #f0f9ff; border-radius: 8px; }
          .stat-item { text-align: center; }
          .stat-value { font-size: 24px; font-weight: bold; color: #6366f1; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">SVIT ERP</div>
          <div class="college-name">Sarvajanik Vidhyalaya of Information Technology</div>
          <p>Affiliated to Gujarat Technological University</p>
        </div>
        
        <div class="exam-info">
          <h2 style="margin: 0 0 15px 0;">📋 ${exam?.name || "Examination"}</h2>
          <p><strong>Exam Type:</strong> ${exam?.exam_type || "-"}</p>
          <p><strong>Course:</strong> ${exam?.course || "-"} | <strong>Section:</strong> ${exam?.section || "-"} | <strong>Year:</strong> ${exam?.year || "-"}</p>
          <p><strong>Subject:</strong> ${exam?.subject || "-"}</p>
          <p><strong>Max Marks:</strong> ${exam?.max_marks || 100} | <strong>Passing Marks:</strong> ${exam?.passing_marks || 35}</p>
          ${exam?.exam_date ? `<p><strong>Date:</strong> ${new Date(exam.exam_date).toLocaleDateString()}</p>` : ""}
        </div>

        <div class="stats">
          <div class="stat-item">
            <div class="stat-value">${results.length}</div>
            <div>Total Students</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${results.filter(r => r.grade !== "FF").length}</div>
            <div>Passed</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${results.filter(r => r.grade === "FF").length}</div>
            <div>Failed</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${results.length > 0 ? (results.reduce((sum, r) => sum + r.percentage, 0) / results.length).toFixed(1) : 0}%</div>
            <div>Class Average</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Roll Number</th>
              <th>Student Name</th>
              <th>Marks Obtained</th>
              <th>Max Marks</th>
              <th>Percentage</th>
              <th>Grade</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${results.map((r, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${r.students?.roll_number || "-"}</td>
                <td>${r.students?.profiles?.name || "-"}</td>
                <td>${r.marks_obtained}</td>
                <td>${r.max_marks}</td>
                <td>${r.percentage}%</td>
                <td class="grade-${r.grade}">${r.grade}</td>
                <td>${r.grade === "FF" ? "❌ FAIL" : "✅ PASS"}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>

        <div class="footer">
          <p>Generated on: ${new Date().toLocaleString()}</p>
          <p>SVIT ERP - Result Management System | Gujarat Technological University</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  const filteredResults = results.filter(r => {
    if (searchTerm) {
      const name = r.students?.profiles?.name?.toLowerCase() || "";
      const roll = r.students?.roll_number?.toLowerCase() || "";
      if (!name.includes(searchTerm.toLowerCase()) && !roll.includes(searchTerm.toLowerCase())) {
        return false;
      }
    }
    return true;
  });

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case "AA": case "AB": return "text-green-600";
      case "BB": case "BC": return "text-blue-600";
      case "CC": case "CD": return "text-yellow-600";
      case "DD": return "text-orange-600";
      case "FF": return "text-red-600";
      default: return "";
    }
  };

  const isAdminOrFaculty = role === "ADMIN" || role === "FACULTY";

  if (loading || roleLoading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <FloatingGeometry variant="colorful" />
      <TopTabs userEmail={user?.email} userName={profile?.name} userRole={role} />
      
      <main className="container mx-auto p-4 md:p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 rounded-lg gradient-primary">
                <GraduationCap className="h-5 w-5 text-primary-foreground" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                Result & Grading System
              </h1>
            </div>
            <p className="text-muted-foreground text-sm">SVIT ERP • GTU Grading Pattern</p>
          </div>
          
          {isAdminOrFaculty && (
            <div className="flex gap-2">
              <Dialog open={showCreateExam} onOpenChange={setShowCreateExam}>
                <DialogTrigger asChild>
                  <Button className="gradient-primary text-primary-foreground">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Exam
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create New Examination</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="col-span-2">
                      <Label>Exam Name *</Label>
                      <Input
                        value={newExam.name}
                        onChange={(e) => setNewExam({ ...newExam, name: e.target.value })}
                        placeholder="e.g., Mid Semester Exam - 2024"
                      />
                    </div>
                    <div>
                      <Label>Exam Type</Label>
                      <Select value={newExam.exam_type} onValueChange={(v) => setNewExam({ ...newExam, exam_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="INTERNAL">Internal</SelectItem>
                          <SelectItem value="MID_SEM">Mid Semester</SelectItem>
                          <SelectItem value="END_SEM">End Semester</SelectItem>
                          <SelectItem value="PRACTICAL">Practical</SelectItem>
                          <SelectItem value="VIVA">Viva</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Course *</Label>
                      <Select value={newExam.course} onValueChange={(v) => setNewExam({ ...newExam, course: v })}>
                        <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                        <SelectContent>
                          {courses.map(c => (
                            <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Section *</Label>
                      <Input
                        value={newExam.section}
                        onChange={(e) => setNewExam({ ...newExam, section: e.target.value })}
                        placeholder="e.g., A"
                      />
                    </div>
                    <div>
                      <Label>Year *</Label>
                      <Select value={newExam.year.toString()} onValueChange={(v) => setNewExam({ ...newExam, year: parseInt(v) })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4].map(y => (
                            <SelectItem key={y} value={y.toString()}>Year {y}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Subject *</Label>
                      <Select value={newExam.subject} onValueChange={(v) => setNewExam({ ...newExam, subject: v })}>
                        <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                        <SelectContent>
                          {subjects.map(s => (
                            <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Max Marks</Label>
                      <Input
                        type="number"
                        value={newExam.max_marks}
                        onChange={(e) => setNewExam({ ...newExam, max_marks: parseInt(e.target.value) || 100 })}
                      />
                    </div>
                    <div>
                      <Label>Passing Marks</Label>
                      <Input
                        type="number"
                        value={newExam.passing_marks}
                        onChange={(e) => setNewExam({ ...newExam, passing_marks: parseInt(e.target.value) || 35 })}
                      />
                    </div>
                    <div>
                      <Label>Exam Date</Label>
                      <Input
                        type="date"
                        value={newExam.exam_date}
                        onChange={(e) => setNewExam({ ...newExam, exam_date: e.target.value })}
                      />
                    </div>
                    <div className="col-span-2 flex justify-end gap-2 mt-4">
                      <Button variant="outline" onClick={() => setShowCreateExam(false)}>Cancel</Button>
                      <Button onClick={handleCreateExam} className="gradient-primary text-primary-foreground">
                        Create Exam
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>

        {/* Main Content */}
        <Tabs defaultValue="results" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-secondary/50">
            <TabsTrigger value="results" className="data-[state=active]:gradient-primary data-[state=active]:text-primary-foreground">
              <Trophy className="h-4 w-4 mr-2" />
              Results
            </TabsTrigger>
            {isAdminOrFaculty && (
              <TabsTrigger value="entry" className="data-[state=active]:gradient-primary data-[state=active]:text-primary-foreground">
                <Calculator className="h-4 w-4 mr-2" />
                Marks Entry
              </TabsTrigger>
            )}
            <TabsTrigger value="grades" className="data-[state=active]:gradient-primary data-[state=active]:text-primary-foreground">
              <FileText className="h-4 w-4 mr-2" />
              Grade Config
            </TabsTrigger>
          </TabsList>

          {/* Results Tab */}
          <TabsContent value="results">
            <Card className="border-0 shadow-premium">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  Examination Results
                </CardTitle>
                <CardDescription>View and export examination results</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <Label>Select Examination</Label>
                    <Select value={selectedExam} onValueChange={handleExamSelect}>
                      <SelectTrigger><SelectValue placeholder="Select an exam" /></SelectTrigger>
                      <SelectContent>
                        {exams.map(e => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.name} - {e.subject} ({e.course} {e.section})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedExam && results.length > 0 && (
                    <>
                      <div className="flex-1">
                        <Label>Search</Label>
                        <div className="relative">
                          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by name or roll number"
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <div className="flex items-end gap-2">
                        <Button variant="outline" onClick={exportToCSV}>
                          <Download className="h-4 w-4 mr-2" />
                          CSV
                        </Button>
                        <Button variant="outline" onClick={exportToPDF}>
                          <Printer className="h-4 w-4 mr-2" />
                          PDF
                        </Button>
                      </div>
                    </>
                  )}
                </div>

                {selectedExam && results.length > 0 && (
                  <>
                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <Card className="bg-primary/10 border-primary/20">
                        <CardContent className="p-4 text-center">
                          <p className="text-2xl font-bold text-primary">{results.length}</p>
                          <p className="text-sm text-muted-foreground">Total Students</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-green-500/10 border-green-500/20">
                        <CardContent className="p-4 text-center">
                          <p className="text-2xl font-bold text-green-600">{results.filter(r => r.grade !== "FF").length}</p>
                          <p className="text-sm text-muted-foreground">Passed</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-red-500/10 border-red-500/20">
                        <CardContent className="p-4 text-center">
                          <p className="text-2xl font-bold text-red-600">{results.filter(r => r.grade === "FF").length}</p>
                          <p className="text-sm text-muted-foreground">Failed</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-blue-500/10 border-blue-500/20">
                        <CardContent className="p-4 text-center">
                          <p className="text-2xl font-bold text-blue-600">
                            {results.length > 0 ? (results.reduce((sum, r) => sum + r.percentage, 0) / results.length).toFixed(1) : 0}%
                          </p>
                          <p className="text-sm text-muted-foreground">Class Average</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Results Table */}
                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-secondary/50">
                            <TableHead>#</TableHead>
                            <TableHead>Roll Number</TableHead>
                            <TableHead>Student Name</TableHead>
                            <TableHead className="text-right">Marks</TableHead>
                            <TableHead className="text-right">Percentage</TableHead>
                            <TableHead className="text-center">Grade</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredResults.map((r, i) => (
                            <TableRow key={r.id} className="hover:bg-secondary/30">
                              <TableCell>{i + 1}</TableCell>
                              <TableCell className="font-mono">{r.students?.roll_number}</TableCell>
                              <TableCell className="font-medium">{r.students?.profiles?.name}</TableCell>
                              <TableCell className="text-right">{r.marks_obtained}/{r.max_marks}</TableCell>
                              <TableCell className="text-right">{r.percentage}%</TableCell>
                              <TableCell className={`text-center font-bold ${getGradeColor(r.grade)}`}>
                                {r.grade}
                              </TableCell>
                              <TableCell className="text-center">
                                {r.grade === "FF" ? (
                                  <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs">FAIL</span>
                                ) : (
                                  <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs">PASS</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}

                {selectedExam && results.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Trophy className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>No results found for this examination</p>
                  </div>
                )}

                {!selectedExam && (
                  <div className="text-center py-12 text-muted-foreground">
                    <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>Select an examination to view results</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Marks Entry Tab */}
          {isAdminOrFaculty && (
            <TabsContent value="entry">
              <Card className="border-0 shadow-premium">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Calculator className="h-5 w-5 text-primary" />
                        Marks Entry
                      </CardTitle>
                      <CardDescription>Enter marks manually or upload via CSV</CardDescription>
                    </div>
                    {selectedExam && (
                      <Dialog open={showBulkUpload} onOpenChange={setShowBulkUpload}>
                        <DialogTrigger asChild>
                          <Button variant="outline">
                            <Upload className="h-4 w-4 mr-2" />
                            Bulk Upload
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Bulk Upload Marks</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 mt-4">
                            <p className="text-sm text-muted-foreground">
                              Upload a CSV file with columns: <code>roll_number, marks</code>
                            </p>
                            <Input
                              type="file"
                              accept=".csv"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleBulkUpload(file);
                              }}
                            />
                            <div className="text-sm bg-secondary/50 p-3 rounded-lg">
                              <p className="font-medium mb-2">Sample CSV Format:</p>
                              <code className="text-xs">
                                roll_number,marks<br />
                                21IT001,85<br />
                                21IT002,72
                              </code>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <Label>Select Examination *</Label>
                    <Select value={selectedExam} onValueChange={handleExamSelect}>
                      <SelectTrigger><SelectValue placeholder="Select an exam" /></SelectTrigger>
                      <SelectContent>
                        {exams.map(e => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.name} - {e.subject} ({e.course} {e.section})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedExam && students.length > 0 && (
                    <>
                      <div className="rounded-lg border overflow-hidden mb-4">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-secondary/50">
                              <TableHead>Roll Number</TableHead>
                              <TableHead>Student Name</TableHead>
                              <TableHead className="w-32">Marks</TableHead>
                              <TableHead>Existing</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {students.map(s => {
                              const existingResult = results.find(r => r.student_id === s.id);
                              return (
                                <TableRow key={s.id}>
                                  <TableCell className="font-mono">{s.roll_number}</TableCell>
                                  <TableCell>{s.profiles?.name}</TableCell>
                                  <TableCell>
                                    <Input
                                      type="number"
                                      min="0"
                                      max={exams.find(e => e.id === selectedExam)?.max_marks || 100}
                                      value={marksEntry[s.id] ?? ""}
                                      onChange={(e) => setMarksEntry({
                                        ...marksEntry,
                                        [s.id]: parseFloat(e.target.value) || 0
                                      })}
                                      placeholder={existingResult ? existingResult.marks_obtained.toString() : "Enter marks"}
                                      className="w-24"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    {existingResult && (
                                      <span className={`font-medium ${getGradeColor(existingResult.grade)}`}>
                                        {existingResult.marks_obtained} ({existingResult.grade})
                                      </span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                      <Button onClick={handleSaveMarks} className="gradient-primary text-primary-foreground">
                        Save Marks
                      </Button>
                    </>
                  )}

                  {selectedExam && students.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <p>No students found for this exam's course/section/year</p>
                    </div>
                  )}

                  {!selectedExam && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Calculator className="h-12 w-12 mx-auto mb-4 opacity-30" />
                      <p>Select an examination to enter marks</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Grade Config Tab */}
          <TabsContent value="grades">
            <Card className="border-0 shadow-premium">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  GTU Grade Configuration
                </CardTitle>
                <CardDescription>Percentage-based grading system as per GTU norms</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-secondary/50">
                        <TableHead>Grade</TableHead>
                        <TableHead>Percentage Range</TableHead>
                        <TableHead>Grade Points</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gradeConfig.map(g => (
                        <TableRow key={g.id}>
                          <TableCell className={`font-bold ${getGradeColor(g.grade)}`}>{g.grade}</TableCell>
                          <TableCell>{g.min_percentage}% - {g.max_percentage}%</TableCell>
                          <TableCell>{g.grade_points}</TableCell>
                          <TableCell>{g.description}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
