import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useLanguage } from "../../contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronRight, Calendar, CheckCircle2, Clock, AlertCircle, RefreshCw } from "lucide-react";
import { useActivityScope } from "@/hooks/useActivityScope";
import {
  listProjects, listStages, type ApiProject, type ApiStage,
  PROJECT_STATUS_LABELS_AR, PROJECT_STATUS_LABELS_EN,
  STAGE_STATUS_LABELS_AR, STAGE_STATUS_LABELS_EN,
} from "@/lib/projectsApi";

const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

interface MonthCol { year: number; month: number; }

function monthIndex(cols: MonthCol[], d: Date) {
  return (d.getFullYear() - cols[0].year) * 12 + (d.getMonth() - cols[0].month);
}

/** % position of a date across the month columns (clamped 0..100) */
function pct(cols: MonthCol[], d: Date) {
  const idx = monthIndex(cols, d) + (d.getDate() - 1) / 31;
  return Math.min(100, Math.max(0, (idx / cols.length) * 100));
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  planning: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  delayed: "bg-destructive/10 text-destructive dark:bg-destructive/20",
  on_hold: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  completed: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export function ProjectTimeline() {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";
  const [, navigate] = useLocation();
  const { activeActivity, canQuery } = useActivityScope();

  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [stagesByProject, setStagesByProject] = useState<Record<number, ApiStage[]>>({});
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!canQuery) { setProjects([]); setLoading(false); return; }
    try {
      setLoading(true);
      const p = await listProjects();
      const visible = p.filter(pr => pr.status !== "cancelled");
      setProjects(visible);
      if (visible.length && selectedProject == null) setSelectedProject(visible[0].id);
      const stageEntries = await Promise.all(
        visible.map(async pr => {
          try { return [pr.id, await listStages(pr.id)] as const; }
          catch { return [pr.id, []] as const; }
        })
      );
      setStagesByProject(Object.fromEntries(stageEntries));
    } catch (e) {
      console.error("Timeline load failed:", e);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [activeActivity?.id, canQuery]);

  // Safety net: if a project's stages were never fetched (e.g. fetch failed),
  // retry on expand so every displayed project can show its real stages.
  useEffect(() => {
    if (selectedProject == null || stagesByProject[selectedProject] !== undefined) return;
    listStages(selectedProject)
      .then(ss => setStagesByProject(prev => ({ ...prev, [selectedProject]: ss })))
      .catch(() => setStagesByProject(prev => ({ ...prev, [selectedProject]: [] })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject]);

  // ── Build month columns from real project/stage date range ────────────────
  const cols: MonthCol[] = useMemo(() => {
    const dates: Date[] = [];
    for (const p of projects) {
      if (p.startDate) dates.push(new Date(p.startDate));
      if (p.endDate) dates.push(new Date(p.endDate));
      for (const s of stagesByProject[p.id] || []) {
        if (s.expectedStart) dates.push(new Date(s.expectedStart));
        if (s.expectedEnd) dates.push(new Date(s.expectedEnd));
        if (s.dueDate) dates.push(new Date(s.dueDate));
      }
    }
    const valid = dates.filter(d => !isNaN(d.getTime()));
    let min: Date, max: Date;
    if (valid.length === 0) {
      const now = new Date();
      min = new Date(now.getFullYear(), 0, 1);
      max = new Date(now.getFullYear(), 11, 1);
    } else {
      min = new Date(Math.min(...valid.map(d => d.getTime())));
      max = new Date(Math.max(...valid.map(d => d.getTime())));
    }
    // pad one month each side, cap at 24 columns
    min = new Date(min.getFullYear(), min.getMonth() - 1, 1);
    max = new Date(max.getFullYear(), max.getMonth() + 1, 1);
    const out: MonthCol[] = [];
    const cur = new Date(min);
    while (cur <= max && out.length < 24) {
      out.push({ year: cur.getFullYear(), month: cur.getMonth() });
      cur.setMonth(cur.getMonth() + 1);
    }
    return out;
  }, [projects, stagesByProject]);

  const gridBg = "bg-[repeating-linear-gradient(to_right,transparent,transparent_calc(var(--colw)-1px),hsl(var(--border)/0.5)_calc(var(--colw)-1px),hsl(var(--border)/0.5)_var(--colw))]";
  const colw = `${100 / cols.length}%`;

  const getStageColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-emerald-500 border-emerald-600 text-white";
      case "in_progress": return "bg-primary border-primary text-white";
      case "blocked": return "bg-destructive border-destructive text-white";
      case "cancelled": return "bg-muted border-border text-muted-foreground line-through";
      default: return "bg-secondary border-border text-muted-foreground";
    }
  };

  const getStageIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle2 className="w-3 h-3" />;
      case "in_progress": return <Clock className="w-3 h-3" />;
      case "blocked": return <AlertCircle className="w-3 h-3" />;
      default: return null;
    }
  };

  /** bar geometry for a project: from startDate to endDate */
  const projectBar = (p: ApiProject) => {
    if (!p.startDate && !p.endDate) return null;
    const start = p.startDate ? pct(cols, new Date(p.startDate)) : 0;
    const end = p.endDate ? pct(cols, new Date(p.endDate)) : Math.min(100, start + 15);
    return { start, width: Math.max(2, end - start) };
  };

  /** bar geometry for a stage: dated → real position; undated → even segment */
  const stageBar = (s: ApiStage, i: number, all: ApiStage[], parent: ApiProject) => {
    const sd = s.expectedStart || s.actualStart;
    const ed = s.expectedEnd || s.actualEnd || s.dueDate;
    if (sd || ed) {
      const start = sd ? pct(cols, new Date(sd)) : (ed ? Math.max(0, pct(cols, new Date(ed)) - 6) : 0);
      const end = ed ? pct(cols, new Date(ed)) : Math.min(100, start + 6);
      return { start, width: Math.max(2, end - start), dated: true };
    }
    // fallback: split the parent project bar evenly
    const pb = projectBar(parent) || { start: 2, width: 96 };
    const w = pb.width / all.length;
    return { start: pb.start + i * w, width: Math.max(2, w - 0.5), dated: false };
  };

  if (loading) {
    return <div className="text-center py-20 text-muted-foreground text-sm">{isRtl ? "جارٍ التحميل..." : "Loading..."}</div>;
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <Card className="flex-1 border-border/50 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
        <CardHeader className="p-4 border-b border-border/50 bg-secondary/20 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              {isRtl ? "المخطط الزمني للمشاريع (Gantt)" : "Project Timeline (Gantt)"}
            </CardTitle>
            <div className="flex items-center gap-4 text-xs sm:text-sm">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500" />{isRtl ? "مكتملة" : "Completed"}</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-primary" />{isRtl ? "قيد التنفيذ" : "In Progress"}</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-secondary border border-border" />{isRtl ? "بانتظار البدء" : "Pending"}</div>
              <Button variant="outline" size="sm" className="h-7 gap-1" onClick={load} data-testid="button-refresh-timeline">
                <RefreshCw className="w-3.5 h-3.5" />{isRtl ? "تحديث" : "Refresh"}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 flex-1 overflow-auto bg-card relative">
          {projects.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground text-sm">
              {isRtl ? "لا توجد مشاريع بعد — أضف مشروعاً من تبويب قائمة المشاريع." : "No projects yet — add one from the Projects List tab."}
            </div>
          ) : (
            <div className="min-w-[800px] h-full flex flex-col" style={{ ["--colw" as any]: colw }}>
              {/* Month header */}
              <div className="flex border-b border-border/50 bg-secondary/10 sticky top-0 z-10">
                <div className="w-64 shrink-0 border-e border-border/50 p-3 font-semibold text-sm">
                  {isRtl ? "المشروع / المرحلة" : "Project / Phase"}
                </div>
                <div className="flex-1 flex relative">
                  {cols.map((c, i) => (
                    <div key={i} className="flex-1 border-e border-border/50 p-2 text-center text-[10px] sm:text-xs font-medium text-muted-foreground whitespace-nowrap">
                      {(isRtl ? MONTHS_AR : MONTHS_EN)[c.month]}
                      {(i === 0 || c.month === 0) && <span className="block text-[9px] opacity-70">{c.year}</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 flex flex-col">
                {projects.map(project => {
                  const stages = stagesByProject[project.id] || [];
                  const pb = projectBar(project);
                  const name = isRtl ? (project.nameAr || project.nameEn) : (project.nameEn || project.nameAr);
                  const expanded = selectedProject === project.id;
                  return (
                    <div key={project.id} className="flex flex-col border-b border-border/50 group" data-testid={`timeline-project-${project.id}`}>
                      {/* Project row */}
                      <div
                        className={cn("flex cursor-pointer transition-colors hover:bg-secondary/20", expanded && "bg-primary/5")}
                        onClick={() => setSelectedProject(expanded ? null : project.id)}
                      >
                        <div className="w-64 shrink-0 border-e border-border/50 p-3 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-medium text-sm truncate" title={name || ""}>{name}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Badge variant="outline" className={cn("text-[10px] px-1.5 h-4 font-normal border-transparent", STATUS_COLORS[project.status] ?? STATUS_COLORS.planning)}>
                                {isRtl ? (PROJECT_STATUS_LABELS_AR[project.status] ?? project.status) : (PROJECT_STATUS_LABELS_EN[project.status] ?? project.status)}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">{project.progress ?? 0}%</span>
                            </div>
                          </div>
                          <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform shrink-0",
                            expanded && "rotate-90", !expanded && isRtl && "rotate-180")} />
                        </div>
                        <div className={cn("flex-1 relative", gridBg)}>
                          {pb ? (
                            <div className="absolute top-1/2 -translate-y-1/2 h-2.5 rounded-full bg-secondary/60"
                              style={{ [isRtl ? "right" : "left"]: `${pb.start}%`, width: `${pb.width}%` }}>
                              <div className={cn("h-full rounded-full", project.status === "delayed" ? "bg-destructive" : project.status === "completed" ? "bg-emerald-500" : "bg-primary/60")}
                                style={{ width: `${Math.min(100, Math.max(0, project.progress ?? 0))}%` }} />
                            </div>
                          ) : (
                            <div className="absolute inset-0 flex items-center px-3 text-[10px] text-muted-foreground">
                              {isRtl ? "لا توجد تواريخ للمشروع" : "No project dates set"}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Stages */}
                      {expanded && (
                        <div className="flex flex-col bg-secondary/5 pb-2">
                          {stages.length === 0 ? (
                            <div className="py-3 px-6 text-xs text-muted-foreground">
                              {isRtl ? "لا توجد مراحل لهذا المشروع." : "No stages for this project."}
                            </div>
                          ) : [...stages].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)).map((stage, i, all) => {
                            const sb = stageBar(stage, i, all, project);
                            const title = isRtl ? (stage.titleAr || stage.titleEn) : (stage.titleEn || stage.titleAr);
                            return (
                              <div key={stage.id} className="flex text-sm hover:bg-secondary/10" data-testid={`timeline-stage-${stage.id}`}>
                                <div className="w-64 shrink-0 border-e border-border/50 py-2 px-6 flex items-center gap-2 text-muted-foreground">
                                  <div className={cn("w-1.5 h-1.5 rounded-full shrink-0",
                                    stage.status === "completed" ? "bg-emerald-500" :
                                    stage.status === "in_progress" ? "bg-primary" :
                                    stage.status === "blocked" ? "bg-destructive" : "bg-muted")} />
                                  <span className="text-xs truncate" title={title || ""}>{title}</span>
                                </div>
                                <div className={cn("flex-1 relative py-1.5", gridBg)}>
                                  <div
                                    className={cn("absolute h-6 rounded-md border shadow-sm flex items-center px-2 text-[10px] font-medium overflow-hidden",
                                      getStageColor(stage.status), !sb.dated && "opacity-70 border-dashed")}
                                    title={`${title} — ${isRtl ? (STAGE_STATUS_LABELS_AR[stage.status] ?? stage.status) : (STAGE_STATUS_LABELS_EN[stage.status] ?? stage.status)}${sb.dated ? "" : (isRtl ? " (بدون تواريخ)" : " (no dates)")}`}
                                    style={{ [isRtl ? "right" : "left"]: `${sb.start}%`, width: `calc(${sb.width}% - 4px)` }}
                                  >
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      {getStageIcon(stage.status)}
                                      <span className="truncate">{stage.progress != null && stage.progress > 0 ? `${stage.progress}%` : ""}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          <div className="px-6 pt-1">
                            <Button variant="ghost" size="sm" className="h-6 text-xs text-primary"
                              onClick={(e) => { e.stopPropagation(); navigate(`/projects/${project.id}`); }}
                              data-testid={`button-timeline-open-${project.id}`}>
                              {isRtl ? "فتح تفاصيل المشروع ←" : "Open project details →"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
