import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Brain, AlertTriangle, TrendingDown, RefreshCw, Sparkles, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Markdown } from "@/components/ui/markdown";

export function AIInsightsPanel() {
  const { toast } = useToast();
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("admin-insights");
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setInsights(data);
    } catch (err: any) {
      const msg = err?.message || "Failed to load insights";
      setError(msg);
      toast({ title: "AI Insights Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!insights && !loading) {
    return (
      <Card className="mb-6 border-dashed border-2 border-primary/20">
        <CardContent className="py-8 text-center">
          <Brain className="h-10 w-10 mx-auto text-primary/50 mb-3" />
          <h3 className="font-semibold text-foreground mb-1">AI Smart Insights</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Get AI-powered analysis of student attendance, performance, and actionable recommendations.
          </p>
          <Button onClick={fetchInsights} className="gap-2">
            <Sparkles className="h-4 w-4" /> Generate Insights
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="mb-6">
        <CardContent className="py-8 text-center">
          <RefreshCw className="h-8 w-8 mx-auto text-primary animate-spin mb-3" />
          <p className="text-sm text-muted-foreground">Analyzing student data with AI...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mb-6 border-destructive/30">
        <CardContent className="py-6 text-center">
          <AlertTriangle className="h-8 w-8 mx-auto text-destructive mb-2" />
          <p className="text-sm text-destructive mb-3">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchInsights}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 mb-6">
      {/* Summary */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <CardTitle className="text-base text-foreground">AI Insights Summary</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchInsights} className="h-7 text-xs gap-1">
              <RefreshCw className="h-3 w-3" /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm dark:prose-invert max-w-none text-foreground whitespace-pre-wrap text-sm leading-relaxed">
            {insights.summary}
          </div>
        </CardContent>
      </Card>

      {/* Alert cards row */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Low Attendance */}
        {insights.lowAttendanceStudents?.length > 0 && (
          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <CardTitle className="text-sm text-foreground">Low Attendance Alert</CardTitle>
                <Badge variant="secondary" className="text-xs">{insights.stats?.lowAttendanceCount}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {insights.lowAttendanceStudents.map((s: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{s.name} <span className="text-muted-foreground">({s.roll})</span></span>
                    <Badge variant="destructive" className="text-xs">{s.pct}%</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Weak Performers */}
        {insights.weakPerformers?.length > 0 && (
          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-500" />
                <CardTitle className="text-sm text-foreground">Weak Performers</CardTitle>
                <Badge variant="secondary" className="text-xs">{insights.stats?.weakPerformerCount}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {insights.weakPerformers.map((s: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{s.name} <span className="text-muted-foreground">({s.roll})</span></span>
                    <Badge variant="destructive" className="text-xs">Avg: {s.avgScore}%</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
