import { Lightbulb, TrendingUp, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const insights = [
  {
    id: 1,
    type: "optimization",
    icon: Lightbulb,
    title: "Resource Reallocation",
    description: "Move 3 excavators from Site A to Site B to accelerate foundation work by 15%.",
    color: "text-accent",
    bg: "bg-accent/10"
  },
  {
    id: 2,
    type: "forecast",
    icon: TrendingUp,
    title: "Budget Forecast",
    description: "Project 'Desert Rose' is projected to finish 5% under budget based on current burn rate.",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10"
  },
  {
    id: 3,
    type: "risk",
    icon: AlertCircle,
    title: "Supply Chain Risk",
    description: "Steel deliveries delayed by 3 days. Recommend sourcing from alternative local supplier.",
    color: "text-amber-500",
    bg: "bg-amber-500/10"
  }
];

export function AIInsights() {
  return (
    <div className="space-y-4 mt-2">
      {insights.map((insight) => {
        const Icon = insight.icon;
        return (
          <div key={insight.id} className="group relative rounded-xl border border-border/50 bg-card/50 p-4 transition-all hover:bg-card hover:shadow-sm">
            <div className="flex gap-4">
              <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", insight.bg)}>
                <Icon className={cn("h-4 w-4", insight.color)} />
              </div>
              <div className="flex flex-col gap-1">
                <h4 className="text-sm font-semibold tracking-tight">{insight.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{insight.description}</p>
              </div>
            </div>
            
            {/* Quick Action Overlay on Hover */}
            <div className="absolute inset-y-0 right-0 hidden items-center pr-4 group-hover:flex">
              <button className="text-xs font-medium text-accent hover:text-accent/80 transition-colors">
                Apply
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}