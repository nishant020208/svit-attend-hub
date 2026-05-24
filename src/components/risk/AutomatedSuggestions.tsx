import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ChevronRight, Loader2 } from "lucide-react";
import { RiskBadge } from "./RiskBadge";

type Row = {
  student_id: string;
  score: number;
  level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  reasons: string[];
  factors: any;
  name?: string;
  roll?: string;
};

function suggestAction(r: Row): string {
  const f = r.factors || {};
  const drops = [
    { k: "attendance", t: "Schedule a 1:1 attendance counselling and call parent" },
    { k: "marks",      t: "Assign remedial problem set in weakest subject" },
    { k: "assignments",t: "Set submission reminder and shorter deadlines" },
    { k: "trend",      t: "Run weekly check-ins for the next 2 weeks" },
    { k: "lateSubs",   t: "Enforce hard deadlines and pair with study buddy" },
    { k: "leaveFreq",  t: "Verify medical/leave reasons and align make-up plan" },
  ];
  const sorted = drops
    .map((d) => ({ ...d, v: 1 - (f[d.k] ?? 1) }))
    .sort((a, b) => b.v - a.v);
  return sorted[0]?.t || "Log a mentor check-in";
}

export function AutomatedSuggestions({ limit = 5 }: { limit?: number }) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: scores } = await supabase
        .from("risk_scores")
        .select("student_id, score, level, reasons, factors")
        .in("level", ["HIGH", "CRITICAL"])
        .order("score", { ascending: false })
        .limit(limit);

      if (!scores?.length) { setRows([]); setLoading(false); return; }

      const ids = scores.map((s: any) => s.student_id);
      const { data: students } = await supabase
        .from("students").select("id, user_id, roll_number").in("id", ids);
      const userIds = (students || []).map((s: any) => s.user_id).filter(Boolean);
      const { data: profiles } = await supabase
        .from("profiles").select("id, name").in("id", userIds);

      const sMap = new Map((students || []).map((s: any) => [s.id, s]));
      const pMap = new Map((profiles || []).map((p: any) => [p.id, p]));

      setRows((scores as any[]).map((s) => {
        const stu = sMap.get(s.student_id) as any;
        const prof = stu ? (pMap.get(stu.user_id) as any) : null;
        return {
          ...s,
          reasons: Array.isArray(s.reasons) ? s.reasons : [],
          name: prof?.name,
          roll: stu?.roll_number,
        };
      }));
      setLoading(false);
    })();
  }, [limit]);

  return (
    <Card className="border-t-4 border-t-primary">
      <CardHeader>
        <CardTitle className="text-base text-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Automated Suggestions
        </CardTitle>
        <CardDescription>Top at-risk students with a recommended next action.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading suggestions…
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No high-risk students right now. 🎉
          </p>
        ) : (
          <ul className="divide-y">
            {rows.map((r) => (
              <li key={r.student_id} className="py-3 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-foreground truncate">{r.name || "Student"}</p>
                    {r.roll && <Badge variant="outline" className="text-xs">{r.roll}</Badge>}
                    <RiskBadge level={r.level} score={Number(r.score)} />
                  </div>
                  <p className="text-sm text-foreground mt-1">→ {suggestAction(r)}</p>
                  {r.reasons[0] && (
                    <p className="text-xs text-muted-foreground mt-0.5">Why: {r.reasons[0]}</p>
                  )}
                </div>
                <Button
                  variant="ghost" size="sm" className="gap-1 shrink-0"
                  onClick={() => navigate(`/risk/student?id=${r.student_id}`)}
                >
                  Open <ChevronRight className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
