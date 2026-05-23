import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AIInsightsPanel } from "@/components/dashboard/AIInsightsPanel";
import { Brain } from "lucide-react";

export default function RiskAIInsights() {
  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Brain className="h-6 w-6 text-primary" />AI Insights</h1>
        <p className="text-sm text-muted-foreground">AI-generated analysis of student attendance, performance, and recommendations.</p>
      </div>
      <AIInsightsPanel />
    </DashboardLayout>
  );
}
