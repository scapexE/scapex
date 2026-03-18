import { useState, useEffect } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "../../contexts/LanguageContext";
import {
  Search, Filter, MapPin, Building, MoreVertical, Clock, AlertTriangle,
  FileText, FileCheck, TrendingUp, Plus,
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { getProjects, type Project } from "@/lib/projects";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  planning: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  delayed: "bg-destructive/10 text-destructive dark:bg-destructive/20",
  on_hold: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  completed: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const STATUS_LABEL_AR: Record<string, string> = {
  active: "نشط", planning: "تخطيط", delayed: "متأخر",
  on_hold: "متوقف", completed: "مكتمل", cancelled: "ملغى",
};

export function ProjectsList() {
  const { t, dir } = useLanguage();
  const isRtl = dir === "rtl";
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setProjects(getProjects());
  }, []);

  const filtered = search.trim()
    ? projects.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.clientName.toLowerCase().includes(search.toLowerCase()) ||
        p.code.toLowerCase().includes(search.toLowerCase())
      )
    : projects;

  const activeCount = projects.filter(p => p.status === "active" || p.status === "planning").length;

  return (
    <Card className="flex-1 border-border/50 shadow-sm overflow-hidden flex flex-col h-full">
      <CardHeader className="p-4 border-b border-border/50 bg-card">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className={cn("absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground", isRtl ? "right-3" : "left-3")} />
              <Input
                placeholder={isRtl ? "بحث في المشاريع..." : "Search projects..."}
                className={cn("h-9 bg-secondary/50 border-0", isRtl ? "pr-9" : "pl-9")}
                value={search}
                onChange={e => setSearch(e.target.value)}
                data-testid="input-search-projects"
              />
            </div>
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-sm text-muted-foreground font-medium">
            {activeCount} {isRtl ? "مشروع نشط" : "Active Projects"}
          </div>
        </div>
      </CardHeader>

      <div className="overflow-auto flex-1 bg-card">
        <Table>
          <TableHeader className="bg-secondary/50 sticky top-0 z-10">
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className={isRtl ? 'text-right' : 'text-left'}>{isRtl ? "المشروع" : "Project"}</TableHead>
              <TableHead className={isRtl ? 'text-right' : 'text-left'}>{isRtl ? "العميل والموقع" : "Client & Location"}</TableHead>
              <TableHead className={isRtl ? 'text-right' : 'text-left'}>{isRtl ? "المرحلة" : "Phase"}</TableHead>
              <TableHead className={isRtl ? 'text-right' : 'text-left'}>{isRtl ? "التقدم" : "Progress"}</TableHead>
              <TableHead className={isRtl ? 'text-right' : 'text-left'}>{isRtl ? "الروابط" : "Links"}</TableHead>
              <TableHead className={isRtl ? 'text-right' : 'text-left'}>{isRtl ? "الحالة" : "Status"}</TableHead>
              <TableHead className={isRtl ? 'text-left' : 'text-right'}>{isRtl ? "إجراءات" : "Actions"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16 text-muted-foreground">
                  {isRtl ? "لا توجد مشاريع. سيُنشأ المشروع تلقائياً عند تحويل عرض السعر إلى عقد." : "No projects yet. Projects are auto-created when a proposal is converted to a contract."}
                </TableCell>
              </TableRow>
            ) : filtered.map((project) => (
              <TableRow
                key={project.id}
                data-testid={`row-project-${project.id}`}
                className="border-border/50 hover:bg-muted/30 transition-colors group cursor-pointer"
              >
                <TableCell className={isRtl ? 'text-right' : 'text-left'}>
                  <div>
                    <div className="font-semibold text-foreground">{project.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 font-mono">{project.code} • {isRtl ? "م:" : "PM:"} {project.manager}</div>
                  </div>
                </TableCell>
                <TableCell className={isRtl ? 'text-right' : 'text-left'}>
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <Building className="w-3.5 h-3.5 text-muted-foreground" />
                    {project.clientName}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {project.location}
                  </div>
                </TableCell>
                <TableCell className={isRtl ? 'text-right' : 'text-left'}>
                  <Badge variant="outline" className="font-medium bg-secondary/50">{project.phase}</Badge>
                </TableCell>
                <TableCell className={isRtl ? 'text-right' : 'text-left'}>
                  <div className="flex flex-col gap-1.5 w-32">
                    <div className="flex items-center justify-between text-xs">
                      <span>{project.progress}%</span>
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {new Date(project.deadline).toLocaleDateString()}
                      </span>
                    </div>
                    <Progress
                      value={project.progress}
                      className={cn("h-1.5",
                        project.status === 'delayed' ? "[&>div]:bg-destructive" :
                        project.status === 'completed' ? "[&>div]:bg-emerald-500" : ""
                      )}
                    />
                  </div>
                </TableCell>
                <TableCell className={isRtl ? 'text-right' : 'text-left'}>
                  <div className="flex flex-wrap gap-1">
                    {project.proposalNumber && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 font-mono">
                        <FileText className="w-2.5 h-2.5" /> {project.proposalNumber}
                      </span>
                    )}
                    {project.contractNumber && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400 font-mono">
                        <FileCheck className="w-2.5 h-2.5" /> {project.contractNumber}
                      </span>
                    )}
                    {project.contractValue > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400">
                        <TrendingUp className="w-2.5 h-2.5" /> {project.contractValue.toLocaleString()}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className={isRtl ? 'text-right' : 'text-left'}>
                  <Badge variant="outline" className={cn("font-normal border-transparent gap-1", STATUS_COLORS[project.status] ?? STATUS_COLORS.planning)}>
                    {project.status === 'delayed' && <AlertTriangle className="w-3 h-3" />}
                    {isRtl ? (STATUS_LABEL_AR[project.status] ?? project.status) : (project.status.charAt(0).toUpperCase() + project.status.slice(1))}
                  </Badge>
                </TableCell>
                <TableCell className={isRtl ? 'text-left' : 'text-right'}>
                  <div className={cn("flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity", isRtl ? "justify-start" : "justify-end")}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
