import { Metadata } from "next";
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";
import { BarChart3 } from "lucide-react";

export const metadata: Metadata = {
  title: "Analytics | TeamFlow",
  description: "Real-time insights and productivity visualization",
};

export default function AnalyticsPage() {
  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500 text-white">
              <BarChart3 size={24} />
            </div>
            Real-time Analytics
          </h2>
          <p className="text-muted-foreground font-medium">
            Visualize your team's productivity and task velocity.
          </p>
        </div>
      </div>

      <AnalyticsDashboard />
    </div>
  );
}
