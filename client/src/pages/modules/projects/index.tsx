import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { useActivityScope } from "@/hooks/useActivityScope";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ProjectTimeline } from "@/components/projects/ProjectTimeline";
import { ProjectsList } from "@/components/projects/ProjectsList";
import { BarChart3, FolderOpen, CheckCircle2, Clock, AlertTriangle, TrendingUp, DollarSign, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectsAnalytics {
  kpis: {
    total: number; active: number; planning: number; completed: number;
    delayed: number; onHold: number; totalBudget: number; totalSpent: number;
    avgProgress: number; totalTasks: number; doneTasks: number; overdueTasks: number;
  };
  byStatus: { status: string; count: number; label: string }[];
  topByBudget: { id: number; name: string; budget: number; spent: number; progress: number; status: string }[];
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500", planning: "bg-blue-500", completed: "bg-slate-400",
  delayed: "bg-red-500", on_hold: "bg-amber-500",
};

function formatCurrency(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

function ProjectsDashboard({ isRtl }: { isRtl: boolean }) {
  const [data, setData] = useState<ProjectsAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const { activeActivity } = useActivityScope();

  useEffect(() => {
    setLoading(true);
    fetch("/api/projects/analytics")
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [activeActivity?.id]);

  if (loading) return <div className="text-center py-20 text-muted-foreground text-sm">{isRtl ? "جارٍ التحميل..." : "Loading..."}</div>;
  if (!data) return <div className="text-center py-20 text-muted-foreground text-sm">{isRtl ? "لا توجد بيانات" : "No data"}</div>;

  const { kpis, byStatus, topByBudget } = data;
  const budgetUsed = kpis.totalBudget > 0 ? Math.round((kpis.totalSpent / kpis.totalBudget) * 100) : 0;
  const taskDone = kpis.totalTasks > 0 ? Math.round((kpis.doneTasks / kpis.totalTasks) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: isRtl ? "إجمالي المشاريع" : "Total Projects", value: kpis.total, icon: FolderOpen, color: "text-blue-500 bg-blue-500/10" },
          { label: isRtl ? "نشطة" : "Active", value: kpis.active, icon: TrendingUp, color: "text-emerald-500 bg-emerald-500/10" },
          { label: isRtl ? "مكتملة" : "Completed", value: kpis.completed, icon: CheckCircle2, color: "text-slate-500 bg-slate-500/10" },
          { label: isRtl ? "متأخرة" : "Delayed", value: kpis.delayed, icon: AlertTriangle, color: "text-red-500 bg-red-500/10" },
        ].map((k, i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", k.color.split(" ").slice(1).join(" "))}>
                <k.icon className={cn("w-5 h-5", k.color.split(" ")[0])} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className="text-2xl font-bold tabular-nums">{k.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Budget & Progress */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              {isRtl ? "الميزانية والإنجاز" : "Budget & Progress"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">{isRtl ? "الميزانية المُستهلكة" : "Budget Used"}</span>
                <span className="font-semibold">{budgetUsed}%</span>
              </div>
              <Progress value={budgetUsed} className="h-2" />
              <div className="flex justify-between text-xs mt-1 text-muted-foreground">
                <span>{isRtl ? "مُنفق" : "Spent"}: {formatCurrency(kpis.totalSpent)} {isRtl ? "ر.س" : "SAR"}</span>
                <span>{isRtl ? "إجمالي" : "Total"}: {formatCurrency(kpis.totalBudget)} {isRtl ? "ر.س" : "SAR"}</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">{isRtl ? "متوسط الإنجاز" : "Avg Progress"}</span>
                <span className="font-semibold">{kpis.avgProgress}%</span>
              </div>
              <Progress value={kpis.avgProgress} className="h-2" />
            </div>
            <div className="pt-2 border-t border-border/40 grid grid-cols-2 gap-2">
              <div className="text-center p-2 rounded-lg bg-secondary/50">
                <p className="text-xl font-bold text-emerald-500">{kpis.doneTasks}</p>
                <p className="text-xs text-muted-foreground">{isRtl ? "مهام مكتملة" : "Tasks Done"}</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-secondary/50">
                <p className="text-xl font-bold text-red-500">{kpis.overdueTasks}</p>
                <p className="text-xs text-muted-foreground">{isRtl ? "مهام متأخرة" : "Overdue Tasks"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* By Status */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-500" />
              {isRtl ? "توزيع الحالات" : "Status Breakdown"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {byStatus.filter(s => s.count > 0).map(s => (
              <div key={s.status}>
                <div className="flex justify-between text-xs mb-1">
                  <span>{s.label}</span>
                  <span className="font-semibold">{s.count}</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all", STATUS_COLORS[s.status] || "bg-slate-500")}
                    style={{ width: kpis.total ? `${Math.round((s.count / kpis.total) * 100)}%` : "0%" }} />
                </div>
              </div>
            ))}
            {byStatus.every(s => s.count === 0) && (
              <p className="text-xs text-muted-foreground text-center py-4">{isRtl ? "لا توجد مشاريع بعد" : "No projects yet"}</p>
            )}
          </CardContent>
        </Card>

        {/* Top Projects by Budget */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-purple-500" />
              {isRtl ? "أكبر المشاريع (ميزانية)" : "Top Projects (Budget)"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topByBudget.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">{isRtl ? "لا توجد مشاريع بميزانية" : "No budgeted projects"}</p>
            ) : topByBudget.map(p => (
              <div key={p.id} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium truncate max-w-[60%]">{p.name}</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 h-4">{formatCurrency(p.budget)} {isRtl ? "ر.س" : "SAR"}</Badge>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${p.progress}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>{isRtl ? "الإنجاز" : "Progress"}: {p.progress}%</span>
                  <span className={cn("font-medium", STATUS_COLORS[p.status] ? "" : "")}
                    style={{ color: p.status === "delayed" ? "#ef4444" : p.status === "active" ? "#10b981" : undefined }}>
                    {p.status}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ProjectsModule() {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";

  return (
    <MainLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{isRtl ? "إدارة المشاريع" : "Project Management"}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {isRtl ? "إدارة دورة حياة المشاريع، المهام، الجداول الزمنية والمعالم." : "Manage project lifecycles, tasks, timelines, and milestones."}
          </p>
        </div>

        <Tabs defaultValue="list" className="flex flex-col min-h-0">
          <TabsList className="w-full sm:w-auto self-start border-border/50 bg-secondary/50">
            <TabsTrigger value="dashboard" className="flex-1 sm:flex-none data-[state=active]:bg-background">
              <BarChart3 className="w-3.5 h-3.5 mr-1.5 rtl:ml-1.5 rtl:mr-0" />
              {isRtl ? "لوحة التحكم" : "Dashboard"}
            </TabsTrigger>
            <TabsTrigger value="list" className="flex-1 sm:flex-none data-[state=active]:bg-background">
              <FolderOpen className="w-3.5 h-3.5 mr-1.5 rtl:ml-1.5 rtl:mr-0" />
              {isRtl ? "قائمة المشاريع" : "Projects List"}
            </TabsTrigger>
            <TabsTrigger value="timeline" className="flex-1 sm:flex-none data-[state=active]:bg-background">
              <Clock className="w-3.5 h-3.5 mr-1.5 rtl:ml-1.5 rtl:mr-0" />
              {isRtl ? "المخطط الزمني (Gantt)" : "Gantt Timeline"}
            </TabsTrigger>
          </TabsList>

          <div className="mt-4">
            <TabsContent value="dashboard" className="m-0">
              <ProjectsDashboard isRtl={isRtl} />
            </TabsContent>

            <TabsContent value="list" className="m-0">
              <ProjectsList />
            </TabsContent>

            <TabsContent value="timeline" className="m-0">
              <ProjectTimeline />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </MainLayout>
  );
}
