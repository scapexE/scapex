import { useState, useEffect } from "react";
import { BrainCircuit, AlertTriangle, Info, TrendingUp, ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocation } from "wouter";
import { scopedFetch } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface AIInsight {
  id: string;
  type: string;
  severity: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  module: string;
  link?: string;
}

interface AIInsightsResponse {
  enabled: boolean;
  insights: AIInsight[];
}

function severityStyle(severity: string) {
  switch (severity) {
    case "high":
      return { icon: AlertTriangle, color: "text-red-600 dark:text-red-400", bg: "bg-red-500/10" };
    case "medium":
      return { icon: TrendingUp, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" };
    default:
      return { icon: Info, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10" };
  }
}

interface AIInsightsPanelProps {
  /** Only show insights whose `module` is in this list. Omit to show all. */
  modules?: string[];
  /** Optional heading override. */
  title?: string;
  className?: string;
}

export function AIInsightsPanel({ modules, title, className }: AIInsightsPanelProps) {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";
  const [, navigate] = useLocation();
  const [enabled, setEnabled] = useState(false);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    scopedFetch("/api/ai/insights")
      .then(r => (r.ok ? r.json() : { enabled: false, insights: [] }))
      .then((d: AIInsightsResponse) => {
        if (!active) return;
        setEnabled(!!d.enabled);
        setInsights(Array.isArray(d.insights) ? d.insights : []);
      })
      .catch(() => {})
      .finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, []);

  if (!loaded || !enabled) return null;

  const filtered = modules && modules.length
    ? insights.filter(i => modules.includes(i.module))
    : insights;

  if (filtered.length === 0) return null;

  return (
    <Card className={cn("border-accent/30 shadow-sm bg-accent/5 overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <BrainCircuit className="w-5 h-5 text-accent" />
          {title || (isRtl ? "رؤى الذكاء الاصطناعي" : "AI Insights")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {filtered.map(insight => {
          const s = severityStyle(insight.severity);
          const Icon = s.icon;
          return (
            <div
              key={insight.id}
              data-testid={`ai-insight-${insight.id}`}
              className={cn(
                "group relative rounded-xl border border-border/50 bg-card/50 p-3 transition-all",
                insight.link ? "cursor-pointer hover:bg-card hover:shadow-sm" : ""
              )}
              onClick={() => { if (insight.link) navigate(insight.link); }}
            >
              <div className="flex gap-3">
                <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", s.bg)}>
                  <Icon className={cn("h-4 w-4", s.color)} />
                </div>
                <div className="flex flex-col gap-1 min-w-0">
                  <h4 className="text-sm font-semibold tracking-tight">
                    {isRtl ? insight.titleAr : insight.titleEn}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {isRtl ? insight.descriptionAr : insight.descriptionEn}
                  </p>
                </div>
                {insight.link && (
                  <ArrowRight className={cn("w-4 h-4 text-muted-foreground shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity", isRtl && "rotate-180")} />
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
