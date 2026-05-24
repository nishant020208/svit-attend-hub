import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, TrendingUp, Minus, Gauge } from "lucide-react";

interface Props {
  outlookDirection: "improving" | "stable" | "declining";
  projectedScore: number;
  confidence: number;
  samples: number;
  currentScore?: number;
}

export function PredictionConfidence({
  outlookDirection,
  projectedScore,
  confidence,
  samples,
  currentScore,
}: Props) {
  const Icon =
    outlookDirection === "improving" ? TrendingDown :
    outlookDirection === "declining" ? TrendingUp : Minus;

  const tone =
    outlookDirection === "improving" ? "text-green-600 bg-green-500/10 border-green-500/30" :
    outlookDirection === "declining" ? "text-red-600 bg-red-500/10 border-red-500/30" :
    "text-yellow-600 bg-yellow-500/10 border-yellow-500/30";

  const confLabel = confidence >= 75 ? "High" : confidence >= 50 ? "Medium" : "Low";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-foreground flex items-center gap-2">
          <Gauge className="h-4 w-4 text-primary" /> 2-Week Risk Forecast
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className={`flex items-center gap-3 rounded-lg border p-3 ${tone}`}>
          <Icon className="h-6 w-6" />
          <div>
            <p className="text-sm font-semibold capitalize">{outlookDirection}</p>
            <p className="text-xs opacity-80">
              Projected risk score: <span className="font-mono font-semibold">{projectedScore}</span>
              {currentScore !== undefined && (
                <span className="ml-1 opacity-70">
                  (now {currentScore}, Δ {projectedScore - currentScore > 0 ? "+" : ""}{projectedScore - currentScore})
                </span>
              )}
            </p>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Prediction confidence</span>
            <Badge variant="secondary" className="text-xs">{confLabel} · {confidence}%</Badge>
          </div>
          <Progress value={confidence} className="h-2" />
          <p className="text-[11px] text-muted-foreground mt-1">
            Based on {samples} historical snapshot{samples === 1 ? "" : "s"}.
            {samples < 5 && " More data will sharpen the forecast."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
