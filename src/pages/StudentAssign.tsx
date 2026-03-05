import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { TopTabs } from "@/components/layout/TopTabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function StudentAssign() {
  const navigate = useNavigate();
  const { role, loading: roleLoading } = useUserRole();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [students, setStudents] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [subsections, setSubsections] = useState<any[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ student_id: "", class_id: "", batch_id: "", section_id: "", subsection_id: "" });

  // Filtered dropdowns
  const filteredBatches = batches.filter(b => b.class_id === form.class_id);
  const filteredSections = sections.filter(s => s.batch_id === form.batch_id);
  const filteredSubsections = subsections.filter(ss => ss.section_id === form.section_id);

  // Filter states for view
  const [filterClass, setFilterClass] = useState("");
  const [filterBatch, setFilterBatch] = useState("");
  const [filterSection, setFilterSection] = useState("");

  useEffect(() => { checkAuth(); }, []);
  useEffect(() => { if (!roleLoading && role !== "ADMIN") navigate("/dashboard"); }, [role, roleLoading]);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }
      setUser(session.user);
      const { data: p } = await supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle();
      setProfile(p);
      await fetchAll();
    } catch { navigate("/auth"); } finally { setLoading(false); }
  };

  const fetchAll = async () => {
    const [studentsRes, assignRes, classRes, batchRes, secRes, subRes] = await Promise.all([
      supabase.from("students").select("*, profiles:user_id(name, email)"),
      supabase.from("student_assignments" as any).select("*, classes:class_id(name), batches:batch_id(name), academic_sections:section_id(name), subsections:subsection_id(name), students:student_id(roll_number, profiles:user_id(name))"),
      supabase.from("classes" as any).select("*").order("name"),
      supabase.from("batches" as any).select("*").order("name"),
      supabase.from("academic_sections" as any).select("*").order("name"),
      supabase.from("subsections" as any).select("*").order("name"),
    ]);
    setStudents(studentsRes.data || []);
    setAssignments(assignRes.data || []);
    setClasses(classRes.data || []);
    setBatches(batchRes.data || []);
    setSections(secRes.data || []);
    setSubsections(subRes.data || []);
  };

  const handleAssign = async () => {
    if (!form.student_id || !form.class_id || !form.batch_id || !form.section_id) {
      toast.error("Please select student, class, batch, and section");
      return;
    }
    try {
      const payload: any = {
        student_id: form.student_id,
        class_id: form.class_id,
        batch_id: form.batch_id,
        section_id: form.section_id,
      };
      if (form.subsection_id) payload.subsection_id = form.subsection_id;

      // Upsert to handle re-assignment
      const { error } = await supabase.from("student_assignments" as any).upsert(payload, { onConflict: "student_id" });
      if (error) throw error;
      toast.success("Student assigned successfully");
      setDialogOpen(false);
      setForm({ student_id: "", class_id: "", batch_id: "", section_id: "", subsection_id: "" });
      await fetchAll();
    } catch (e: any) { toast.error(e.message); }
  };

  const filteredAssignments = assignments.filter((a: any) => {
    if (filterClass && a.class_id !== filterClass) return false;
    if (filterBatch && a.batch_id !== filterBatch) return false;
    if (filterSection && a.section_id !== filterSection) return false;
    return true;
  });

  if (loading || roleLoading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-background">
      <TopTabs userEmail={user?.email} userName={profile?.name} userRole={role || undefined} />
      <main className="container mx-auto p-4 md:p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Student Assignment</h1>
            <p className="text-muted-foreground">Assign students to Class → Batch → Section → Subsection</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><UserPlus className="h-4 w-4 mr-2" />Assign Student</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Assign Student</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Student</Label>
                  <Select value={form.student_id} onValueChange={v => setForm(p => ({...p, student_id: v}))}>
                    <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                    <SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id}>{s.profiles?.name} ({s.roll_number})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Class</Label>
                  <Select value={form.class_id} onValueChange={v => setForm(p => ({...p, class_id: v, batch_id: "", section_id: "", subsection_id: ""}))}>
                    <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                    <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Batch</Label>
                  <Select value={form.batch_id} onValueChange={v => setForm(p => ({...p, batch_id: v, section_id: "", subsection_id: ""}))} disabled={!form.class_id}>
                    <SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger>
                    <SelectContent>{filteredBatches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Section</Label>
                  <Select value={form.section_id} onValueChange={v => setForm(p => ({...p, section_id: v, subsection_id: ""}))} disabled={!form.batch_id}>
                    <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
                    <SelectContent>{filteredSections.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Subsection (optional)</Label>
                  <Select value={form.subsection_id} onValueChange={v => setForm(p => ({...p, subsection_id: v}))} disabled={!form.section_id}>
                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {filteredSubsections.map(ss => <SelectItem key={ss.id} value={ss.id}>{ss.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" onClick={handleAssign}>Assign</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card className="mb-4">
          <CardContent className="py-4">
            <div className="flex flex-wrap gap-4">
              <div className="min-w-[150px]"><Label className="text-xs">Filter by Class</Label>
                <Select value={filterClass} onValueChange={v => { setFilterClass(v === "all" ? "" : v); setFilterBatch(""); setFilterSection(""); }}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All</SelectItem>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="min-w-[150px]"><Label className="text-xs">Filter by Batch</Label>
                <Select value={filterBatch} onValueChange={v => { setFilterBatch(v === "all" ? "" : v); setFilterSection(""); }} disabled={!filterClass}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All</SelectItem>{batches.filter(b => b.class_id === filterClass).map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="min-w-[150px]"><Label className="text-xs">Filter by Section</Label>
                <Select value={filterSection} onValueChange={v => setFilterSection(v === "all" ? "" : v)} disabled={!filterBatch}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All</SelectItem>{sections.filter(s => s.batch_id === filterBatch).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Assigned Students ({filteredAssignments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Roll No</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Subsection</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssignments.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium text-foreground">{a.students?.profiles?.name}</TableCell>
                    <TableCell className="text-foreground">{a.students?.roll_number}</TableCell>
                    <TableCell className="text-foreground">{a.classes?.name}</TableCell>
                    <TableCell className="text-foreground">{a.batches?.name}</TableCell>
                    <TableCell className="text-foreground">{a.academic_sections?.name}</TableCell>
                    <TableCell className="text-foreground">{a.subsections?.name || <Badge variant="outline">None</Badge>}</TableCell>
                  </TableRow>
                ))}
                {filteredAssignments.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No assignments found</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
