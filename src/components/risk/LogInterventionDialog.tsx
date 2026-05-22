import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const TYPES = ["counselling", "parent_meeting", "remedial", "extension", "warning", "mentoring"];

interface Props {
  studentId: string;
  onSaved?: () => void;
  trigger?: React.ReactNode;
}

export function LogInterventionDialog({ studentId, onSaved, trigger }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    intervention_type: "counselling",
    notes: "",
    action_taken: "",
    follow_up_date: "",
  });

  const save = async () => {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("interventions").insert({
      student_id: studentId,
      faculty_id: u.user!.id,
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
    setForm({ intervention_type: "counselling", notes: "", action_taken: "", follow_up_date: "" });
    onSaved?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Log Intervention</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Intervention</DialogTitle>
          <DialogDescription>Record a mentor action for this student.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
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
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
