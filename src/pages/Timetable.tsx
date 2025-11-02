import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TopTabs } from "@/components/layout/TopTabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";

export default function Timetable() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [studentData, setStudentData] = useState<any>(null);
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

      // If student, get their course/section/year
      if (profileData?.role === "STUDENT") {
        const { data: studentData } = await supabase
          .from("students")
          .select("*")
          .eq("user_id", session.user.id)
          .single();
        
        setStudentData(studentData);
      }

      fetchTimetable(profileData, session.user.id);
    } catch (error) {
      console.error("Auth error:", error);
      navigate("/auth");
    } finally {
      setLoading(false);
    }
  };

  const fetchTimetable = async (profileData: any, userId: string) => {
    try {
      let query = supabase.from("timetable").select("*");

      // Students see only their timetable
      if (profileData?.role === "STUDENT") {
        const { data: studentData } = await supabase
          .from("students")
          .select("*")
          .eq("user_id", userId)
          .single();

        if (studentData) {
          query = query
            .eq("course", studentData.course)
            .eq("section", studentData.section)
            .eq("year", studentData.year);
        }
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
        room: newEntry.room,
        course: newEntry.course,
        section: newEntry.section,
        year: parseInt(newEntry.year),
        faculty_id: user.id,
      });

      if (error) throw error;

      toast.success("Timetable entry added successfully");
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
      fetchTimetable(profile, user.id);
    } catch (error: any) {
      console.error("Error creating timetable entry:", error);
      toast.error(error.message || "Failed to add timetable entry");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("timetable").delete().eq("id", id);
      if (error) throw error;
      toast.success("Timetable entry deleted");
      fetchTimetable(profile, user.id);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete entry");
    }
  };

  const getDayName = (day: number) => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[day];
  };

  const handleCSVUpload = async () => {
    if (!csvFile) {
      toast.error("Please select a CSV file");
      return;
    }

    Papa.parse(csvFile, {
      header: true,
      complete: async (results) => {
        try {
          const records = results.data.map((row: any) => ({
            day_of_week: parseInt(row.day_of_week),
            start_time: row.start_time,
            end_time: row.end_time,
            subject: row.subject,
            room: row.room,
            course: row.course,
            section: row.section,
            year: parseInt(row.year),
            faculty_id: user.id,
          })).filter(r => r.day_of_week && r.start_time && r.end_time && r.subject && r.course && r.section && r.year);

          const { error } = await supabase
            .from("timetable")
            .insert(records);

          if (error) throw error;

          toast.success(`${records.length} timetable entries added`);
          setCsvFile(null);
          fetchTimetable(profile, user.id);
        } catch (error: any) {
          toast.error(error.message || "Failed to upload CSV");
        }
      },
      error: (error) => {
        toast.error("Failed to parse CSV file");
      },
    });
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <TopTabs userEmail={user?.email} userName={profile?.name} userRole={profile?.role} />
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
            {profile?.role === "ADMIN" && (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gradient-primary">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Entry
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
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
                      <Input
                        value={newEntry.subject}
                        onChange={(e) => setNewEntry({ ...newEntry, subject: e.target.value })}
                        placeholder="e.g., Mathematics"
                      />
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
                      <Input
                        value={newEntry.course}
                        onChange={(e) => setNewEntry({ ...newEntry, course: e.target.value })}
                        placeholder="e.g., B.Tech"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Section</Label>
                      <Input
                        value={newEntry.section}
                        onChange={(e) => setNewEntry({ ...newEntry, section: e.target.value })}
                        placeholder="e.g., A"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Year</Label>
                      <Input
                        type="number"
                        value={newEntry.year}
                        onChange={(e) => setNewEntry({ ...newEntry, year: e.target.value })}
                        placeholder="e.g., 1"
                      />
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
          
          {profile?.role === "ADMIN" && (
            <div className="flex gap-2 mt-4">
              <Input
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                className="max-w-xs"
              />
              <Button onClick={handleCSVUpload} disabled={!csvFile} className="gradient-accent">
                <Upload className="mr-2 h-4 w-4" />
                Upload CSV
              </Button>
            </div>
          )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Weekly Schedule</CardTitle>
            <CardDescription>Class timetable</CardDescription>
          </CardHeader>
          <CardContent>
            {timetable.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No timetable entries found</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Day</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Room</TableHead>
                    {profile?.role === "ADMIN" && <TableHead>Course/Section</TableHead>}
                    {profile?.role === "ADMIN" && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timetable.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{getDayName(entry.day_of_week)}</TableCell>
                      <TableCell>
                        {entry.start_time} - {entry.end_time}
                      </TableCell>
                      <TableCell>{entry.subject}</TableCell>
                      <TableCell>{entry.room || "—"}</TableCell>
                      {profile?.role === "ADMIN" && (
                        <TableCell>
                          {entry.course} - {entry.section} (Year {entry.year})
                        </TableCell>
                      )}
                      {profile?.role === "ADMIN" && (
                        <TableCell>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(entry.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
