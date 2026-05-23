import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Heart, Calendar } from "lucide-react";

export default function CounsellingSessions() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => { (async () => {
    setLoading(true);
    const { data } = await supabase.from("interventions")
      .select("*").eq("intervention_type", "COUNSELLING").order("created_at", { ascending: false });
    if (data?.length) {
      const sids = data.map((d: any) => d.student_id);
      const { data: stu } = await supabase.from("students").select("id, user_id, roll_number, course, year").in("id", sids);
      const sMap = new Map((stu || []).map((s: any) => [s.id, s]));
      const uids = (stu || []).map((s: any) => s.user_id);
      const { data: profs } = await supabase.from("profiles").select("id, name").in("id", uids);
      const pMap = new Map((profs || []).map((p: any) => [p.id, p]));
      setRows(data.map((d: any) => {
        const s = sMap.get(d.student_id) as any;
        return { ...d, student: s, profile: s ? pMap.get(s.user_id) : null };
      }));
    } else setRows([]);
    setLoading(false);
  })(); }, []);

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Heart className="h-6 w-6 text-primary" />Counselling Sessions</h1>
        <p className="text-sm text-muted-foreground">All COUNSELLING-type interventions and follow-ups.</p>
      </div>

      <Card><CardHeader><CardTitle className="text-base">{rows.length} sessions</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            : !rows.length ? <p className="text-center text-muted-foreground py-10">No counselling sessions yet. Log one from a student profile.</p>
            : <div className="overflow-x-auto"><Table>
              <TableHeader><TableRow>
                <TableHead>Student</TableHead><TableHead>Action</TableHead><TableHead>Status</TableHead>
                <TableHead>Follow-up</TableHead><TableHead>Created</TableHead>
              </TableRow></TableHeader>
              <TableBody>{rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell><div className="font-medium">{r.profile?.name || "—"}</div><div className="text-xs text-muted-foreground">{r.student?.roll_number}</div></TableCell>
                  <TableCell className="max-w-sm text-sm">{r.action_taken || r.notes || "—"}</TableCell>
                  <TableCell><Badge variant={r.status === "OPEN" ? "secondary" : "outline"}>{r.status}</Badge></TableCell>
                  <TableCell className="text-xs"><Calendar className="h-3 w-3 inline mr-1" />{r.follow_up_date || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}</TableBody>
            </Table></div>}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
