import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RiskBadge } from "./RiskBadge";

interface Props {
  studentId: string;
  studentName?: string;
  compact?: boolean;
}

export function RiskWidget({ studentId, studentName, compact }: Props) {
  const navigate = useNavigate();
  const [risk, setRisk] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("risk_scores")
        .select("score, level, reasons, computed_at")
        .eq("student_id", studentId)
        .order("computed_at", { ascending: false })
        .limit(1);
      setRisk(data?.[0] || null);
      setLoading(false);
    })();
  }, [studentId]);

  if (loading) {
    return (
      <Card><CardContent className="py-6 text-sm text-muted-foreground">Loading risk…</CardContent></Card>
    );
  }

  if (!risk) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2 text-foreground"><ShieldAlert className="h-4 w-4 text-primary" />Academic Risk</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No risk assessment yet. Faculty must run risk analysis.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between text-foreground">
          <span className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-primary" />Academic Risk{studentName ? ` · ${studentName}` : ""}</span>
          <RiskBadge level={risk.level} score={Number(risk.score)} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="text-sm space-y-1 list-disc list-inside text-foreground">
          {(risk.reasons || []).slice(0, compact ? 2 : 4).map((r: string, i: number) => (
            <li key={i} className="text-muted-foreground">{r}</li>
          ))}
        </ul>
        <Button variant="ghost" size="sm" className="gap-1 px-0" onClick={() => navigate(`/risk/student?id=${studentId}`)}>
          View full profile <ChevronRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
