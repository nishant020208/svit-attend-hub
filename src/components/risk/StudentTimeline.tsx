import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar, ShieldAlert, AlertTriangle, MessageSquare, TrendingDown, TrendingUp,
} from "lucide-react";
import { format } from "date-fns";

interface Props {
  studentId: string;
  refreshKey?: number;
}

type Event = {
  id: string;
  ts: string;
  kind: "intervention" | "risk_snapshot" | "alert";
  title: string;
  detail?: string;
  badge?: string;
  tone: "primary" | "warning" | "danger" | "success" | "muted";
};

const toneClass: Record<Event["tone"], string> = {
  primary: "bg-primary",
  warning: "bg-yellow-500",
  danger: "bg-red-500",
  success: "bg-green-500",
  muted: "bg-muted-foreground",
};

export function StudentTimeline({ studentId, refreshKey }: Props) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: ints }, { data: hist }, { data: alerts }] = await Promise.all([
        supabase.from("interventions").select("*").eq("student_id", studentId).order("created_at", { ascending: false }),
        supabase.from("risk_factors_history").select("id, score, level, snapshot_date").eq("student_id", studentId).order("snapshot_date", { ascending: false }).limit(20),
        supabase.from("risk_alerts").select("id, alert_type, severity, message, created_at").eq("student_id", studentId).order("created_at", { ascending: false }).limit(20),
      ]);

      const list: Event[] = [];

      (ints || []).forEach((i: any) => list.push({
        id: `i-${i.id}`,
        ts: i.created_at,
        kind: "intervention",
        title: i.intervention_type.replace(/_/g, " "),
        detail: i.action_taken || i.notes || "",
        badge: i.status,
        tone: i.status === "COMPLETED" ? "success" : "primary",
      }));

      // Diff between consecutive snapshots (newest first)
      (hist || []).forEach((h: any, idx: number) => {
        const prev = (hist || [])[idx + 1];
        const delta = prev ? Number(h.score) - Number(prev.score) : 0;
        if (idx === 0 || Math.abs(delta) >= 5) {
          list.push({
            id: `r-${h.id}`,
            ts: h.snapshot_date,
            kind: "risk_snapshot",
            title: idx === 0 ? `Risk snapshot · score ${h.score}` :
                   delta > 0 ? `Risk rose by ${delta} → ${h.score}` :
                               `Risk fell by ${Math.abs(delta)} → ${h.score}`,
            badge: h.level,
            tone: delta > 5 ? "danger" : delta < -5 ? "success" : "muted",
          });
        }
      });

      (alerts || []).forEach((a: any) => list.push({
        id: `a-${a.id}`,
        ts: a.created_at,
        kind: "alert",
        title: a.alert_type.replace(/_/g, " "),
        detail: a.message,
        badge: a.severity,
        tone: a.severity === "CRITICAL" ? "danger" : a.severity === "HIGH" ? "warning" : "muted",
      }));

      list.sort((a, b) => +new Date(b.ts) - +new Date(a.ts));
      setEvents(list);
      setLoading(false);
    })();
  }, [studentId, refreshKey]);

  const iconFor = (k: Event["kind"], tone: Event["tone"]) => {
    if (k === "intervention") return <MessageSquare className="h-3 w-3 text-white" />;
    if (k === "alert") return <AlertTriangle className="h-3 w-3 text-white" />;
    return tone === "success" ? <TrendingDown className="h-3 w-3 text-white" /> :
           tone === "danger"  ? <TrendingUp className="h-3 w-3 text-white" /> :
                                <ShieldAlert className="h-3 w-3 text-white" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base text-foreground flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" /> Student Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading timeline…</p>
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No timeline events yet.</p>
        ) : (
          <ol className="relative border-l border-border ml-3 space-y-4">
            {events.map((e) => (
              <li key={e.id} className="ml-5">
                <span className={`absolute -left-[9px] w-5 h-5 rounded-full flex items-center justify-center ${toneClass[e.tone]}`}>
                  {iconFor(e.kind, e.tone)}
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="capitalize">{e.kind.replace("_", " ")}</Badge>
                  {e.badge && <Badge variant="secondary">{e.badge}</Badge>}
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(e.ts), "dd MMM yyyy")}
                  </span>
                </div>
                <p className="text-sm mt-1 text-foreground">{e.title}</p>
                {e.detail && <p className="text-xs text-muted-foreground mt-0.5">{e.detail}</p>}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
