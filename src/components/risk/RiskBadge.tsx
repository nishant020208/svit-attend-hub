import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Level = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

const styles: Record<Level, string> = {
  LOW: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30",
  MEDIUM: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
  HIGH: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30",
  CRITICAL: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
};

export function RiskBadge({ level, score, className }: { level: Level; score?: number; className?: string }) {
  return (
    <Badge variant="outline" className={cn("font-semibold border", styles[level], className)}>
      {level}{score != null ? ` · ${score}` : ""}
    </Badge>
  );
}
