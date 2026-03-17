import { useState } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronRight, Calendar, CheckCircle2, Clock, AlertCircle } from "lucide-react";

// Mock Project Data
const PROJECTS = [
  {
    id: 1,
    name: "Riyadh Metro Station Upgrade",
    manager: "Ahmed Engineer",
    progress: 65,
    status: "active",
    start: "2026-01-10",
    end: "2026-11-20",
    phases: [
      { id: "p1", name: "Planning", start: 0, width: 15, status: "completed" },
      { id: "p2", name: "Design", start: 15, width: 25, status: "completed" },
      { id: "p3", name: "Submission", start: 40, width: 10, status: "completed" },
      { id: "p4", name: "Approval", start: 50, width: 15, status: "in-progress" },
      { id: "p5", name: "Construction", start: 65, width: 35, status: "pending" },
    ]
  },
  {
    id: 2,
    name: "Jeddah Corniche Development",
    manager: "Sarah Smith",
    progress: 35,
    status: "active",
    start: "2026-02-01",
    end: "2026-12-30",
    phases: [
      { id: "p1", name: "Planning", start: 0, width: 20, status: "completed" },
      { id: "p2", name: "Design", start: 20, width: 30, status: "in-progress" },
      { id: "p3", name: "Submission", start: 50, width: 10, status: "pending" },
      { id: "p4", name: "Approval", start: 60, width: 10, status: "pending" },
      { id: "p5", name: "Construction", start: 70, width: 30, status: "pending" },
    ]
  },
  {
    id: 3,
    name: "NEOM District 4 Infrastructure",
    manager: "Mohammed Khalid",
    progress: 10,
    status: "delayed",
    start: "2026-03-15",
    end: "2027-05-10",
    phases: [
      { id: "p1", name: "Planning", start: 0, width: 15, status: "in-progress" },
      { id: "p2", name: "Design", start: 15, width: 35, status: "pending" },
      { id: "p3", name: "Submission", start: 50, width: 5, status: "pending" },
      { id: "p4", name: "Approval", start: 55, width: 15, status: "pending" },
      { id: "p5", name: "Construction", start: 70, width: 30, status: "pending" },
    ]
  }
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function ProjectTimeline() {
  const { t, dir } = useLanguage();
  const [selectedProject, setSelectedProject] = useState(PROJECTS[0].id);

  const getPhaseColor = (status: string) => {
    switch(status) {
      case 'completed': return 'bg-emerald-500 border-emerald-600';
      case 'in-progress': return 'bg-primary border-primary';
      case 'pending': return 'bg-secondary border-border text-muted-foreground';
      case 'delayed': return 'bg-destructive border-destructive text-white';
      default: return 'bg-secondary';
    }
  };

  const getPhaseIcon = (status: string) => {
    switch(status) {
      case 'completed': return <CheckCircle2 className="w-3 h-3 text-white" />;
      case 'in-progress': return <Clock className="w-3 h-3 text-white" />;
      case 'delayed': return <AlertCircle className="w-3 h-3 text-white" />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Gantt Chart Area */}
      <Card className="flex-1 border-border/50 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
        <CardHeader className="p-4 border-b border-border/50 bg-secondary/20 shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              {t('proj.timeline.title') || 'Project Timeline (Gantt)'}
            </CardTitle>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500"></div>{t('proj.status.completed') || 'Completed'}</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-primary"></div>{t('proj.status.in_progress') || 'In Progress'}</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-secondary border border-border"></div>{t('proj.status.pending') || 'Pending'}</div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0 flex-1 overflow-auto bg-card relative">
          <div className="min-w-[800px] h-full flex flex-col">
            {/* Timeline Header (Months) */}
            <div className="flex border-b border-border/50 bg-secondary/10 sticky top-0 z-10">
              <div className="w-64 shrink-0 border-e border-border/50 p-3 font-semibold text-sm">
                {t('proj.timeline.project_name') || 'Project / Phase'}
              </div>
              <div className="flex-1 flex relative">
                {MONTHS.map((month, i) => (
                  <div key={month} className="flex-1 border-e border-border/50 p-2 text-center text-xs font-medium text-muted-foreground">
                    {month}
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline Body */}
            <div className="flex-1 flex flex-col">
              {PROJECTS.map(project => (
                <div key={project.id} className="flex flex-col border-b border-border/50 group">
                  {/* Project Row */}
                  <div 
                    className={cn(
                      "flex cursor-pointer transition-colors hover:bg-secondary/20",
                      selectedProject === project.id ? "bg-primary/5" : ""
                    )}
                    onClick={() => setSelectedProject(project.id)}
                  >
                    <div className="w-64 shrink-0 border-e border-border/50 p-3 flex items-center justify-between">
                      <div className="font-medium text-sm truncate pr-2" title={project.name}>
                        {project.name}
                      </div>
                      <ChevronRight className={cn(
                        "w-4 h-4 text-muted-foreground transition-transform", 
                        selectedProject === project.id ? "rotate-90" : "",
                        dir === 'rtl' ? "rotate-180" : ""
                      )} />
                    </div>
                    <div className="flex-1 relative bg-[repeating-linear-gradient(to_right,transparent,transparent_calc(8.33%-1px),hsl(var(--border)/0.5)_calc(8.33%-1px),hsl(var(--border)/0.5)_8.33%)]">
                      {/* Overall Progress Bar */}
                      <div className="absolute top-1/2 -translate-y-1/2 h-2 rounded-full bg-secondary/50" style={{ left: '5%', right: '10%' }}>
                        <div className={cn(
                          "h-full rounded-full",
                          project.status === 'delayed' ? 'bg-destructive' : 'bg-primary/50'
                        )} style={{ width: `${project.progress}%` }}></div>
                      </div>
                    </div>
                  </div>

                  {/* Phases (Expanded View) */}
                  {selectedProject === project.id && (
                    <div className="flex flex-col bg-secondary/5 pb-2">
                      {project.phases.map(phase => (
                        <div key={phase.id} className="flex text-sm hover:bg-secondary/10">
                          <div className="w-64 shrink-0 border-e border-border/50 py-2 px-6 flex items-center gap-2 text-muted-foreground">
                            <div className={cn(
                              "w-1.5 h-1.5 rounded-full shrink-0",
                              phase.status === 'completed' ? 'bg-emerald-500' :
                              phase.status === 'in-progress' ? 'bg-primary' : 'bg-muted'
                            )}></div>
                            <span className="text-xs truncate">{t(`proj.phase.${phase.name.toLowerCase()}`) || phase.name}</span>
                          </div>
                          <div className="flex-1 relative py-1.5 bg-[repeating-linear-gradient(to_right,transparent,transparent_calc(8.33%-1px),hsl(var(--border)/0.5)_calc(8.33%-1px),hsl(var(--border)/0.5)_8.33%)]">
                            <div 
                              className={cn(
                                "absolute h-6 rounded-md border shadow-sm flex items-center px-2 text-[10px] font-medium transition-all group-hover:brightness-110 overflow-hidden",
                                getPhaseColor(phase.status)
                              )}
                              style={{ 
                                [dir === 'rtl' ? 'right' : 'left']: `${phase.start}%`, 
                                width: `calc(${phase.width}% - 4px)` 
                              }}
                            >
                              <div className="flex items-center gap-1.5 min-w-0 truncate">
                                {getPhaseIcon(phase.status)}
                                <span className={cn("truncate", phase.status === 'pending' ? '' : 'text-white')}>
                                  {''} 
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
