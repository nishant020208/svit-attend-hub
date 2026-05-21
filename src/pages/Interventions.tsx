import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Activity, Plus, Loader2 } from "lucide-react";
import { format } from "date-fns";

const TYPES = ["counselling", "parent_meeting", "remedial", "extension", "warning", "mentoring"];

export default function Interventions() {
  const { toast } = useToast();
  const [list, setList] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    student_id: "",
    intervention_type: "counselling",
    notes: "",
    action_taken: "",
    follow_up_date: "",
  });

  const fetchData = async () => {
    setLoading(true);
    const { data: ints } = await supabase
      .from("interventions")
      .select("*")
      .order("created_at", { ascending: false });

    const studentIds = [...new Set((ints || []).map((i: any) => i.student_id))];
    const { data: stu } = await supabase
      .from("students")
      .select("id, user_id, roll_number, course")
      .in("id", studentIds.length ? studentIds : ["00000000-0000-0000-0000-000000000000"]);

    const userIds = (stu || []).map((s: any) => s.user_id).filter(Boolean);
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, name")
      .in("id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);

    const sMap = new Map((stu || []).map((s: any) => [s.id, s]));
    const pMap = new Map((profs || []).map((p: any) => [p.id, p]));

    setList(
      (ints || []).map((i: any) => {
        const s = sMap.get(i.student_id) as any;
        const p = s ? pMap.get(s.user_id) : null;
        return { ...i, student: s, profile: p };
      })
    );

    // For the dialog, load all students
    const { data: allStu } = await supabase
      .from("students")
      .select("id, user_id, roll_number, course")
      .limit(500);
    const allUserIds = (allStu || []).map((s: any) => s.user_id).filter(Boolean);
    const { data: allProfs } = await supabase
      .from("profiles")
      .select("id, name")
      .in("id", allUserIds.length ? allUserIds : ["00000000-0000-0000-0000-000000000000"]);
    const allPMap = new Map((allProfs || []).map((p: any) => [p.id, p]));
    setStudents(
      (allStu || []).map((s: any) => ({ ...s, profile: allPMap.get(s.user_id) }))
    );

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    if (!form.student_id) {
      toast({ title: "Select a student", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("interventions").insert({
      student_id: form.student_id,
      faculty_id: userData.user!.id,
      intervention_type: form.intervention_type,
      notes: form.notes || null,
      action_taken: form.action_taken || null,
      follow_up_date: form.follow_up_date || null,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Intervention logged" });
    setOpen(false);
    setForm({ student_id: "", intervention_type: "counselling", notes: "", action_taken: "", follow_up_date: "" });
    fetchData();
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            Interventions
          </h1>
          <p className="text-sm text-muted-foreground">
            Log and track mentor interventions for at-risk students.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Log Intervention</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log New Intervention</DialogTitle>
              <DialogDescription>Record mentor action for an at-risk student.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Student</Label>
                <Select value={form.student_id} onValueChange={(v) => setForm({ ...form, student_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                  <SelectContent>
                    {students.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.profile?.name || s.roll_number} — {s.course}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type</Label>
                <Select value={form.intervention_type} onValueChange={(v) => setForm({ ...form, intervention_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div>
                <Label>Action Taken</Label>
                <Input value={form.action_taken} onChange={(e) => setForm({ ...form, action_taken: e.target.value })} />
              </div>
              <div>
                <Label>Follow-up Date</Label>
                <Input type="date" value={form.follow_up_date} onChange={(e) => setForm({ ...form, follow_up_date: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base text-foreground">All Interventions</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : list.length === 0 ? (
            <p className="text-center py-10 text-muted-foreground">No interventions logged yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Follow-up</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell>{format(new Date(i.created_at), "dd MMM yyyy")}</TableCell>
                      <TableCell className="font-medium text-foreground">
                        {i.profile?.name || i.student?.roll_number || "—"}
                      </TableCell>
                      <TableCell><Badge variant="outline">{i.intervention_type.replace("_", " ")}</Badge></TableCell>
                      <TableCell className="max-w-xs truncate">{i.action_taken || "—"}</TableCell>
                      <TableCell>{i.follow_up_date ? format(new Date(i.follow_up_date), "dd MMM") : "—"}</TableCell>
                      <TableCell><Badge>{i.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
