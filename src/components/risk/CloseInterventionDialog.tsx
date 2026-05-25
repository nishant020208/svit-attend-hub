import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, TrendingDown, TrendingUp } from "lucide-react";

interface Props {
  intervention: { id: string; student_id: string; created_at: string };
  onSaved?: () => void;
  trigger?: React.ReactNode;
}

export function CloseInterventionDialog({ intervention, onSaved, trigger }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [computing, setComputing] = useState(false);
  const [before, setBefore] = useState({ attendance: "", marks: "", riskScore: "" });
  const [after, setAfter] = useState({ attendance: "", marks: "", riskScore: "" });
  const [response, setResponse] = useState("");

  useEffect(() => {
    if (!open) return;
    (async () => {
      setComputing(true);
      // Fetch baseline (closest snapshot before intervention created_at)
      const { data: priorRisk } = await supabase
        .from("risk_factors_history")
        .select("score, factors")
        .eq("student_id", intervention.student_id)
        .lte("snapshot_date", intervention.created_at.slice(0, 10))
        .order("snapshot_date", { ascending: false })
        .limit(1);

      // Latest risk
      const { data: currentRisk } = await supabase
        .from("risk_scores")
        .select("score, factors")
        .eq("student_id", intervention.student_id)
        .limit(1);

      const beforeRow = priorRisk?.[0] as any;
      const afterRow = currentRisk?.[0] as any;
      setBefore({
        attendance: beforeRow?.factors?.attendance ? Math.round(beforeRow.factors.attendance * 100).toString() : "",
        marks: beforeRow?.factors?.marks ? Math.round(beforeRow.factors.marks * 100).toString() : "",
        riskScore: beforeRow?.score?.toString() || "",
      });
      setAfter({
        attendance: afterRow?.factors?.attendance ? Math.round(afterRow.factors.attendance * 100).toString() : "",
        marks: afterRow?.factors?.marks ? Math.round(afterRow.factors.marks * 100).toString() : "",
        riskScore: afterRow?.score?.toString() || "",
      });
      setComputing(false);
    })();
  }, [open, intervention]);

  const delta = (() => {
    const b = Number(before.riskScore);
    const a = Number(after.riskScore);
    if (isNaN(b) || isNaN(a)) return null;
    return a - b;
  })();

  const save = async () => {
    setSaving(true);
    const numOrNull = (v: string) => (v === "" || isNaN(Number(v)) ? null : Number(v));
    const beforeRisk = numOrNull(before.riskScore);
    const afterRisk = numOrNull(after.riskScore);

    const { error: outErr } = await supabase.from("intervention_outcomes").insert({
      intervention_id: intervention.id,
      before_attendance: numOrNull(before.attendance),
      after_attendance: numOrNull(after.attendance),
      before_avg_marks: numOrNull(before.marks),
      after_avg_marks: numOrNull(after.marks),
      risk_score_delta: beforeRisk !== null && afterRisk !== null ? afterRisk - beforeRisk : null,
    });

    if (outErr) {
      setSaving(false);
      toast({ title: "Failed to log outcome", description: outErr.message, variant: "destructive" });
      return;
    }

    const { error: updErr } = await supabase
      .from("interventions")
      .update({ status: "CLOSED", student_response: response || null })
      .eq("id", intervention.id);

    setSaving(false);
    if (updErr) {
      toast({ title: "Outcome saved but close failed", description: updErr.message, variant: "destructive" });
      return;
    }
    toast({ title: "Intervention closed", description: "Before/after outcomes recorded." });
    setOpen(false);
    onSaved?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button size="sm" variant="outline" className="gap-2"><CheckCircle2 className="h-4 w-4" /> Close</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Close Intervention & Record Outcome</DialogTitle>
          <DialogDescription>Capture before/after metrics to measure impact.</DialogDescription>
        </DialogHeader>

        {computing ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-4">
            {delta !== null && (
              <div className={`rounded-lg p-3 flex items-center gap-3 ${delta < 0 ? "bg-green-500/10 text-green-700 dark:text-green-400" : delta > 0 ? "bg-red-500/10 text-red-700 dark:text-red-400" : "bg-muted text-muted-foreground"}`}>
                {delta < 0 ? <TrendingDown className="h-5 w-5" /> : <TrendingUp className="h-5 w-5" />}
                <div>
                  <div className="font-semibold text-sm">
                    Risk score {delta < 0 ? "improved" : delta > 0 ? "worsened" : "unchanged"} by {Math.abs(delta)} pts
                  </div>
                  <div className="text-xs opacity-80">Calculated automatically from baseline snapshot.</div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs uppercase text-muted-foreground">Before</Label>
                <Input type="number" placeholder="Attendance %" value={before.attendance} onChange={(e) => setBefore({ ...before, attendance: e.target.value })} />
                <Input type="number" placeholder="Avg marks %" value={before.marks} onChange={(e) => setBefore({ ...before, marks: e.target.value })} />
                <Input type="number" placeholder="Risk score (0-100)" value={before.riskScore} onChange={(e) => setBefore({ ...before, riskScore: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase text-muted-foreground">After</Label>
                <Input type="number" placeholder="Attendance %" value={after.attendance} onChange={(e) => setAfter({ ...after, attendance: e.target.value })} />
                <Input type="number" placeholder="Avg marks %" value={after.marks} onChange={(e) => setAfter({ ...after, marks: e.target.value })} />
                <Input type="number" placeholder="Risk score (0-100)" value={after.riskScore} onChange={(e) => setAfter({ ...after, riskScore: e.target.value })} />
              </div>
            </div>

            <div>
              <Label>Student Response / Notes</Label>
              <Textarea value={response} onChange={(e) => setResponse(e.target.value)} placeholder="How did the student respond?" />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving || computing}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Save & Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
