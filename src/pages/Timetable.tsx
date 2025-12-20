import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { TopTabs } from "@/components/layout/TopTabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Upload, Clock, MapPin } from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { FloatingGeometry } from "@/components/ui/FloatingGeometry";

export default function Timetable() {
  const navigate = useNavigate();
  const { role, loading: roleLoading, userId } = useUserRole();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [studentData, setStudentData] = useState<any>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [newEntry, setNewEntry] = useState({
    day_of_week: "",
    start_time: "",
    end_time: "",
    subject: "",
    room: "",
    course: "",
    section: "",
    year: "",
  });

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!roleLoading && role && userId) {
      fetchDataByRole();
    }
  }, [role, roleLoading, userId]);

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

      // Fetch subjects, courses, and sections
      await Promise.all([
        fetchSubjects(),
        fetchCourses(),
        fetchSections()
      ]);
    } catch (error) {
      console.error("Auth error:", error);
      navigate("/auth");
    } finally {
      setLoading(false);
    }
  };

  const fetchDataByRole = async () => {
    if (role === "STUDENT" && userId) {
      const { data: studentDataResult } = await supabase
        .from("students")
        .select("*")
        .eq("user_id", userId)
        .single();
      
      setStudentData(studentDataResult);
      await fetchTimetable(studentDataResult);
    } else {
      await fetchTimetable();
    }
  };

  const fetchSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .order("name");
      if (error) throw error;
      setSubjects(data || []);
    } catch (error) {
      console.error("Error fetching subjects:", error);
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
        .select("*")
        .order("name");
      if (error) throw error;
      setSections(data || []);
    } catch (error) {
      console.error("Error fetching sections:", error);
    }
  };

  const fetchTimetable = async (studentDataParam?: any) => {
    try {
      let query = supabase.from("timetable").select("*");

      // Students see only their timetable
      if (role === "STUDENT" && studentDataParam) {
        query = query
          .eq("course", studentDataParam.course)
          .eq("section", studentDataParam.section)
          .eq("year", studentDataParam.year);
      }

      const { data, error } = await query.order("day_of_week").order("start_time");

      if (error) throw error;
      setTimetable(data || []);
    } catch (error) {
      console.error("Error fetching timetable:", error);
    }
  };

  const handleCreateEntry = async () => {
    if (!newEntry.day_of_week || !newEntry.start_time || !newEntry.end_time || !newEntry.subject || !newEntry.course || !newEntry.section || !newEntry.year) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      const { error } = await supabase.from("timetable").insert({
        day_of_week: parseInt(newEntry.day_of_week),
        start_time: newEntry.start_time,
        end_time: newEntry.end_time,
        subject: newEntry.subject,
        room: newEntry.room || null,
        course: newEntry.course,
        section: newEntry.section,
        year: parseInt(newEntry.year),
        faculty_id: userId,
      });

      if (error) throw error;

      toast.success("Timetable entry created successfully");
      setNewEntry({
        day_of_week: "",
        start_time: "",
        end_time: "",
        subject: "",
        room: "",
        course: "",
        section: "",
        year: "",
      });
      setDialogOpen(false);
      fetchTimetable(studentData);
    } catch (error: any) {
      console.error("Error creating timetable entry:", error);
      toast.error(error.message || "Failed to create timetable entry");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this entry?")) return;

    try {
      const { error } = await supabase
        .from("timetable")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Entry deleted successfully");
      fetchTimetable(studentData);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete entry");
    }
  };

  const handleCSVUpload = async () => {
    if (!csvFile) {
      toast.error("Please select a CSV file");
      return;
    }

    Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const entries = results.data
          .filter((row: any) => row.day_of_week && row.start_time && row.end_time && row.subject)
          .map((row: any) => ({
            day_of_week: parseInt(row.day_of_week),
            start_time: row.start_time,
            end_time: row.end_time,
            subject: row.subject,
            room: row.room || null,
            course: row.course,
            section: row.section,
            year: parseInt(row.year),
            faculty_id: userId,
          }));

        if (entries.length === 0) {
          toast.error("No valid entries found in CSV");
          return;
        }

        try {
          const { error } = await supabase.from("timetable").insert(entries);

          if (error) throw error;

          toast.success(`Successfully uploaded ${entries.length} entries`);
          setCsvFile(null);
          fetchTimetable(studentData);
        } catch (error: any) {
          console.error("Error uploading CSV:", error);
          toast.error(error.message || "Failed to upload CSV");
        }
      },
      error: () => {
        toast.error("Failed to parse CSV file");
      },
    });
  };

  const getDayName = (day: number) => {
    const days = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[day] || "";
  };

  const getTimetableByDay = () => {
    const byDay: { [key: number]: any[] } = {};
    timetable.forEach((entry) => {
      if (!byDay[entry.day_of_week]) {
        byDay[entry.day_of_week] = [];
      }
      byDay[entry.day_of_week].push(entry);
    });
    return byDay;
  };

  if (loading || roleLoading) {
    return <LoadingSpinner />;
  }

  const timetableByDay = getTimetableByDay();
  const isStudent = role === "STUDENT";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <FloatingGeometry variant="default" />
      <TopTabs userEmail={user?.email} userName={profile?.name} userRole={role || undefined} />
      <main className="container mx-auto p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">Timetable</h1>
              <p className="text-muted-foreground">View and manage class schedules</p>
              {studentData && (
                <p className="text-sm text-muted-foreground mt-1">
                  {studentData.course} - {studentData.section} - Year {studentData.year}
                </p>
              )}
            </div>
            {role === "ADMIN" && (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gradient-primary">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Entry
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Timetable Entry</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Day of Week</Label>
                      <Select
                        value={newEntry.day_of_week}
                        onValueChange={(value) => setNewEntry({ ...newEntry, day_of_week: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select day" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Monday</SelectItem>
                          <SelectItem value="2">Tuesday</SelectItem>
                          <SelectItem value="3">Wednesday</SelectItem>
                          <SelectItem value="4">Thursday</SelectItem>
                          <SelectItem value="5">Friday</SelectItem>
                          <SelectItem value="6">Saturday</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Subject</Label>
                      <Select
                        value={newEntry.subject}
                        onValueChange={(value) => setNewEntry({ ...newEntry, subject: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select subject" />
                        </SelectTrigger>
                        <SelectContent>
                          {subjects.map((subject) => (
                            <SelectItem key={subject.id} value={subject.name}>
                              {subject.name} ({subject.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Time</Label>
                      <Input
                        type="time"
                        value={newEntry.start_time}
                        onChange={(e) => setNewEntry({ ...newEntry, start_time: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Time</Label>
                      <Input
                        type="time"
                        value={newEntry.end_time}
                        onChange={(e) => setNewEntry({ ...newEntry, end_time: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Course</Label>
                      <Select
                        value={newEntry.course}
                        onValueChange={(value) => setNewEntry({ ...newEntry, course: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select course" />
                        </SelectTrigger>
                        <SelectContent>
                          {courses.map((course) => (
                            <SelectItem key={course.id} value={course.name}>
                              {course.name} ({course.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Section</Label>
                      <Select
                        value={newEntry.section}
                        onValueChange={(value) => setNewEntry({ ...newEntry, section: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select section" />
                        </SelectTrigger>
                        <SelectContent>
                          {sections.map((section) => (
                            <SelectItem key={section.id} value={section.name}>
                              {section.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Year</Label>
                      <Select
                        value={newEntry.year}
                        onValueChange={(value) => setNewEntry({ ...newEntry, year: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select year" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Year 1</SelectItem>
                          <SelectItem value="2">Year 2</SelectItem>
                          <SelectItem value="3">Year 3</SelectItem>
                          <SelectItem value="4">Year 4</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Room (Optional)</Label>
                    <Input
                      value={newEntry.room}
                      onChange={(e) => setNewEntry({ ...newEntry, room: e.target.value })}
                      placeholder="e.g., Room 101"
                    />
                  </div>
                  <Button onClick={handleCreateEntry} className="w-full">
                    Add Entry
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          
          </div>
          
          {role === "ADMIN" && (
            <Card className="glass-effect mb-6">
              <CardHeader>
                <CardTitle>Bulk Upload</CardTitle>
                <CardDescription>Upload multiple timetable entries via CSV file</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                    className="flex-1"
                  />
                  <Button onClick={handleCSVUpload} disabled={!csvFile} className="gradient-accent">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload CSV
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  CSV format: day_of_week,start_time,end_time,subject,room,course,section,year
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {isStudent ? (
          // Student View - Fancy Day-by-Day Cards
          <div className="space-y-6">
            {timetable.length === 0 ? (
              <Card className="glass-effect">
                <CardContent className="py-12">
                  <p className="text-muted-foreground text-center">No timetable entries found</p>
                </CardContent>
              </Card>
            ) : (
              <Tabs defaultValue="1" className="w-full">
                <TabsList className="grid w-full grid-cols-6 lg:w-auto">
                  {[1, 2, 3, 4, 5, 6].map((day) => (
                    <TabsTrigger key={day} value={day.toString()}>
                      {getDayName(day).substring(0, 3)}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {[1, 2, 3, 4, 5, 6].map((day) => (
                  <TabsContent key={day} value={day.toString()} className="mt-6">
                    <Card className="glass-effect shadow-xl">
                      <CardHeader>
                        <CardTitle className="text-2xl">{getDayName(day)}</CardTitle>
                        <CardDescription>
                          {timetableByDay[day]?.length || 0} {(timetableByDay[day]?.length || 0) === 1 ? 'class' : 'classes'} scheduled
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {timetableByDay[day] && timetableByDay[day].length > 0 ? (
                          timetableByDay[day].map((entry, idx) => (
                            <Card key={idx} className="border-l-4 border-l-primary bg-gradient-to-r from-primary/5 to-transparent hover:shadow-lg transition-all">
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1">
                                    <h3 className="font-bold text-lg text-foreground mb-2">{entry.subject}</h3>
                                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                      <div className="flex items-center gap-1">
                                        <Clock className="h-4 w-4" />
                                        <span>{entry.start_time} - {entry.end_time}</span>
                                      </div>
                                      {entry.room && (
                                        <div className="flex items-center gap-1">
                                          <MapPin className="h-4 w-4" />
                                          <span>{entry.room}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))
                        ) : (
                          <p className="text-muted-foreground text-center py-8">No classes scheduled for this day</p>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </div>
        ) : (
          // Admin/Faculty View - Table
          <Card>
            <CardHeader>
              <CardTitle>Weekly Schedule</CardTitle>
              <CardDescription>Class timetable</CardDescription>
            </CardHeader>
            <CardContent>
              {timetable.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No timetable entries found</p>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Day</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead>Room</TableHead>
                          <TableHead>Course</TableHead>
                          <TableHead>Section</TableHead>
                          <TableHead>Year</TableHead>
                          {role === "ADMIN" && <TableHead>Actions</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {timetable.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell className="font-medium">{getDayName(entry.day_of_week)}</TableCell>
                            <TableCell>{entry.start_time} - {entry.end_time}</TableCell>
                            <TableCell>{entry.subject}</TableCell>
                            <TableCell>{entry.room || "-"}</TableCell>
                            <TableCell>{entry.course}</TableCell>
                            <TableCell>{entry.section}</TableCell>
                            <TableCell>{entry.year}</TableCell>
                            {role === "ADMIN" && (
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(entry.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="md:hidden space-y-4">
                    {timetable.map((entry) => (
                      <Card key={entry.id} className="border-l-4 border-l-primary">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-bold text-lg">{entry.subject}</p>
                              <p className="text-sm text-muted-foreground">{getDayName(entry.day_of_week)}</p>
                            </div>
                            {role === "ADMIN" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(entry.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          <div className="space-y-1 text-sm">
                            <p><span className="font-medium">Time:</span> {entry.start_time} - {entry.end_time}</p>
                            {entry.room && <p><span className="font-medium">Room:</span> {entry.room}</p>}
                            <p><span className="font-medium">Course:</span> {entry.course}</p>
                            <p><span className="font-medium">Section:</span> {entry.section}</p>
                            <p><span className="font-medium">Year:</span> {entry.year}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}