import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "../../contexts/LanguageContext";
import { 
  Search, Filter, MapPin, Building,
  MoreVertical, Clock, AlertTriangle
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const PROJECTS = [
  { id: '1', code: 'PRJ-26-001', name: 'Riyadh Metro Station Upgrade', client: 'BACS Consortium', location: 'Riyadh', manager: 'Ahmed E.', status: 'active', progress: 65, deadline: '2026-11-20', phase: 'Construction' },
  { id: '2', code: 'PRJ-26-002', name: 'Jeddah Corniche Development', client: 'Jeddah Municipality', location: 'Jeddah', manager: 'Sarah S.', status: 'active', progress: 35, deadline: '2026-12-30', phase: 'Design' },
  { id: '3', code: 'PRJ-26-003', name: 'NEOM District 4 Infrastructure', client: 'NEOM Co.', location: 'Tabuk', manager: 'Mohammed K.', status: 'delayed', progress: 10, deadline: '2027-05-10', phase: 'Planning' },
  { id: '4', code: 'PRJ-26-004', name: 'Al-Faisaliyah HVAC Upgrade', client: 'SBG', location: 'Riyadh', manager: 'Faisal R.', status: 'planning', progress: 0, deadline: '2026-08-15', phase: 'Approval' },
  { id: '5', code: 'PRJ-25-089', name: 'King Abdullah Park Expansion', client: 'Riyadh Mun.', location: 'Riyadh', manager: 'Omar T.', status: 'completed', progress: 100, deadline: '2026-01-30', phase: 'Handover' },
];

export function ProjectsList() {
  const { t, dir } = useLanguage();

  return (
    <Card className="flex-1 border-border/50 shadow-sm overflow-hidden flex flex-col h-full">
      <CardHeader className="p-4 border-b border-border/50 bg-card">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className={cn("absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground", dir === 'rtl' ? "right-3" : "left-3")} />
              <Input placeholder={t('action.search') + " Projects..."} className={cn("h-9 bg-secondary/50 border-0", dir === 'rtl' ? "pr-9" : "pl-9")} />
            </div>
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-sm text-muted-foreground font-medium">
            24 Active Projects
          </div>
        </div>
      </CardHeader>
      
      <div className="overflow-auto flex-1 bg-card">
        <Table>
          <TableHeader className="bg-secondary/50 sticky top-0 z-10">
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className={dir === 'rtl' ? 'text-right' : 'text-left'}>Project</TableHead>
              <TableHead className={dir === 'rtl' ? 'text-right' : 'text-left'}>Client & Location</TableHead>
              <TableHead className={dir === 'rtl' ? 'text-right' : 'text-left'}>Phase</TableHead>
              <TableHead className={dir === 'rtl' ? 'text-right' : 'text-left'}>Progress</TableHead>
              <TableHead className={dir === 'rtl' ? 'text-right' : 'text-left'}>Status</TableHead>
              <TableHead className={dir === 'rtl' ? 'text-left' : 'text-right'}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {PROJECTS.map((project) => (
              <TableRow key={project.id} className="border-border/50 hover:bg-muted/30 transition-colors group cursor-pointer">
                <TableCell className={dir === 'rtl' ? 'text-right' : 'text-left'}>
                  <div>
                    <div className="font-semibold text-foreground">{project.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 font-mono">{project.code} • PM: {project.manager}</div>
                  </div>
                </TableCell>
                <TableCell className={dir === 'rtl' ? 'text-right' : 'text-left'}>
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <Building className="w-3.5 h-3.5 text-muted-foreground" />
                    {project.client}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {project.location}
                  </div>
                </TableCell>
                <TableCell className={dir === 'rtl' ? 'text-right' : 'text-left'}>
                  <Badge variant="outline" className="font-medium bg-secondary/50">
                    {t(`proj.phase.${project.phase.toLowerCase()}`) || project.phase}
                  </Badge>
                </TableCell>
                <TableCell className={dir === 'rtl' ? 'text-right' : 'text-left'}>
                  <div className="flex flex-col gap-1.5 w-32">
                    <div className="flex items-center justify-between text-xs">
                      <span>{project.progress}%</span>
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {new Date(project.deadline).toLocaleDateString()}
                      </span>
                    </div>
                    <Progress 
                      value={project.progress} 
                      className={cn(
                        "h-1.5",
                        project.status === 'delayed' ? "[&>div]:bg-destructive" :
                        project.status === 'completed' ? "[&>div]:bg-emerald-500" : ""
                      )} 
                    />
                  </div>
                </TableCell>
                <TableCell className={dir === 'rtl' ? 'text-right' : 'text-left'}>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "font-normal border-transparent gap-1",
                      project.status === 'active' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                      project.status === 'delayed' ? "bg-destructive/10 text-destructive dark:bg-destructive/20" :
                      project.status === 'completed' ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                    )}
                  >
                    {project.status === 'delayed' && <AlertTriangle className="w-3 h-3" />}
                    {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell className={dir === 'rtl' ? 'text-left' : 'text-right'}>
                  <div className={cn("flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity", dir === 'rtl' ? "justify-start" : "justify-end")}>
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
