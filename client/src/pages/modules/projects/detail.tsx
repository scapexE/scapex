import { useEffect, useMemo, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { MainLayout } from "@/components/layout/MainLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { useActivityScope } from "@/hooks/useActivityScope";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Trash2, Calendar, User as UserIcon, Building, MapPin, Save, CheckSquare, Clock, AlertCircle, ChevronDown, ChevronRight, LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { scopedFetch } from "@/lib/queryClient";
import {
  getProject, updateProject, listStages, createStage, updateStage, deleteStage,
  listProjectDocuments, createProjectDocument, deleteProjectDocument,
  listProjectInvoices,
  createProjectInvoice,
  listTasks, createTask, updateTask, deleteTask,
  type ApiProject, type ApiStage, type ApiProjectDocument, type ApiProjectInvoice,
  type ApiTask, type TaskStatus, type TaskPriority,
  type ProjectStatus, type StageStatus,
  PROJECT_STATUS_LABELS_AR, PROJECT_STATUS_LABELS_EN,
  STAGE_STATUS_LABELS_AR, STAGE_STATUS_LABELS_EN,
  TASK_STATUS_AR, TASK_STATUS_EN, TASK_PRIORITY_AR, TASK_PRIORITY_EN,
} from "@/lib/projectsApi";
import { FileText, CreditCard, History as HistoryIcon } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  planning: "bg-blue-100 text-blue-700",
  delayed: "bg-destructive/10 text-destructive",
  on_hold: "bg-amber-100 text-amber-700",
  completed: "bg-slate-100 text-slate-700",
  cancelled: "bg-red-100 text-red-700",
};

const STAGE_STATUS_COLORS: Record<string, string> = {
  pending: "bg-slate-100 text-slate-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  blocked: "bg-amber-100 text-amber-700",
  cancelled: "bg-red-100 text-red-700",
};

interface SimpleUser { id: string; name?: string; firstName?: string; lastName?: string; }

export default function ProjectDetailPage() {
  const [match, params] = useRoute("/projects/:id");
  const [, navigate] = useLocation();
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";
  const { toast } = useToast();
  const { isPrivileged } = useActivityScope();

  const projectId = match && params?.id ? Number(params.id) : NaN;
  const [project, setProject] = useState<ApiProject | null>(null);
  const [stages, setStages] = useState<ApiStage[]>([]);
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [users, setUsers] = useState<SimpleUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddStage, setShowAddStage] = useState(false);
  const [editStage, setEditStage] = useState<ApiStage | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [editTask, setEditTask] = useState<ApiTask | null>(null);
  const [taskView, setTaskView] = useState<"list" | "kanban">("list");

  const userName = (id: string | null | undefined) => {
    if (!id) return null;
    const u = users.find(u => u.id === id);
    return u?.name || `${u?.firstName || ""} ${u?.lastName || ""}`.trim() || id;
  };

  const reload = async () => {
    if (!Number.isFinite(projectId)) return;
    try {
      setLoading(true);
      const [p, s, t, u] = await Promise.all([
        getProject(projectId),
        listStages(projectId),
        listTasks(projectId).catch(() => []),
        scopedFetch("/api/users").then(r => r.ok ? r.json() : []),
      ]);
      setProject(p);
      setStages(s);
      setTasks(Array.isArray(t) ? t : []);
      setUsers(Array.isArray(u) ? u : []);
    } catch (err: any) {
      toast({ title: isRtl ? "تعذّر تحميل المشروع" : "Failed to load project", description: err?.message, variant: "destructive" });
      setProject(null);
    } finally { setLoading(false); }
  };

  const handleTaskChange = async (taskId: number, patch: Partial<ApiTask>) => {
    try {
      const upd = await updateTask(taskId, patch);
      setTasks(prev => prev.map(t => t.id === taskId ? upd : t));
      // Recalculate project progress from tasks
      const updatedTasks = tasks.map(t => t.id === taskId ? upd : t);
      const avg = updatedTasks.length
        ? Math.round(updatedTasks.reduce((s, t) => s + (t.progress ?? 0), 0) / updatedTasks.length)
        : 0;
      setProject(p => p ? { ...p, progress: avg } : p);
    } catch (err: any) {
      toast({ title: isRtl ? "تعذّر تحديث المهمة" : "Failed to update task", description: err?.message, variant: "destructive" });
    }
  };

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [projectId]);

  const computedProgress = useMemo(() => {
    if (!stages.length) return project?.progress ?? 0;
    const total = stages.reduce((s, x) => s + (x.progress ?? 0), 0);
    return Math.round(total / stages.length);
  }, [stages, project?.progress]);

  if (!Number.isFinite(projectId)) {
    return <MainLayout><div className="p-8">{isRtl ? "مشروع غير صالح" : "Invalid project"}</div></MainLayout>;
  }

  if (loading) {
    return <MainLayout><div className="p-8 text-muted-foreground">{isRtl ? "جارٍ التحميل..." : "Loading..."}</div></MainLayout>;
  }

  if (!project) {
    return (
      <MainLayout>
        <div className="p-8 space-y-4">
          <p>{isRtl ? "المشروع غير موجود أو لا تملك صلاحية الوصول إليه." : "Project not found or you don't have access."}</p>
          <Button variant="outline" onClick={() => navigate("/projects")}>{isRtl ? "العودة للمشاريع" : "Back to projects"}</Button>
        </div>
      </MainLayout>
    );
  }

  const handleSaveProject = async (patch: Partial<ApiProject>) => {
    try {
      setSaving(true);
      const upd = await updateProject(project.id, patch);
      setProject(upd);
      toast({ title: isRtl ? "تم الحفظ" : "Saved" });
    } catch (err: any) {
      toast({ title: isRtl ? "تعذّر الحفظ" : "Failed to save", description: err?.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleStageChange = async (stageId: number, patch: Partial<ApiStage>) => {
    try {
      const upd = await updateStage(stageId, patch);
      setStages(s => s.map(x => x.id === stageId ? upd : x));
    } catch (err: any) {
      toast({ title: isRtl ? "تعذّر تحديث المرحلة" : "Failed to update stage", description: err?.message, variant: "destructive" });
    }
  };

  return (
    <MainLayout>
      <div className="flex flex-col h-[calc(100vh-6rem)] gap-4 overflow-y-auto pb-8">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/projects")} data-testid="button-back-projects">
            <ArrowLeft className={cn("w-4 h-4", isRtl ? "rotate-180 ml-2" : "mr-2")} />
            {isRtl ? "كل المشاريع" : "All projects"}
          </Button>
        </div>

        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle data-testid="text-project-name" className="text-2xl">
                    {isRtl ? (project.nameAr || project.nameEn) : (project.nameEn || project.nameAr)}
                  </CardTitle>
                  <Badge variant="outline" className={cn("font-normal border-transparent", STATUS_COLORS[project.status] ?? STATUS_COLORS.planning)}>
                    {isRtl ? (PROJECT_STATUS_LABELS_AR[project.status] ?? project.status) : (PROJECT_STATUS_LABELS_EN[project.status] ?? project.status)}
                  </Badge>
                </div>
                {project.projectCode && <div className="text-xs font-mono text-muted-foreground">{project.projectCode}</div>}
              </div>
              <div className="flex items-center gap-2 flex-wrap text-sm text-muted-foreground">
                {project.clientName && <span className="flex items-center gap-1"><Building className="w-3.5 h-3.5" /> {project.clientName}</span>}
                {project.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {project.location}</span>}
                {project.endDate && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(project.endDate).toLocaleDateString()}</span>}
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs mb-1">
                <span>{isRtl ? "نسبة الإنجاز (محتسبة من المراحل)" : "Progress (computed from stages)"}</span>
                <span data-testid="text-project-progress">{computedProgress}%</span>
              </div>
              <Progress value={computedProgress} className="h-2" />
            </div>
          </CardHeader>
        </Card>

        <Tabs defaultValue="tasks" className="flex flex-col gap-4">
          <TabsList className="self-start flex-wrap h-auto">
            <TabsTrigger value="tasks" data-testid="tab-tasks">
              <CheckSquare className="w-3.5 h-3.5 mr-1.5 rtl:ml-1.5 rtl:mr-0" />
              {isRtl ? "المهام" : "Tasks"}
              {tasks.length > 0 && <Badge variant="secondary" className="ms-1.5 h-4 px-1 text-[10px]">{tasks.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="stages" data-testid="tab-stages">{isRtl ? "المراحل" : "Stages"}</TabsTrigger>
            <TabsTrigger value="info" data-testid="tab-info">{isRtl ? "المعلومات" : "Information"}</TabsTrigger>
            <TabsTrigger value="documents" data-testid="tab-documents">{isRtl ? "المستندات" : "Documents"}</TabsTrigger>
            <TabsTrigger value="payments" data-testid="tab-payments">{isRtl ? "المدفوعات" : "Payments"}</TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history">{isRtl ? "السجل" : "History"}</TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="m-0">
            <ProjectTasksTab
              projectId={project.id}
              tasks={tasks}
              users={users}
              isRtl={isRtl}
              view={taskView}
              onViewChange={setTaskView}
              showAddTask={showAddTask}
              onShowAddTask={setShowAddTask}
              editTask={editTask}
              onEditTask={setEditTask}
              onTaskChange={handleTaskChange}
              onTaskCreated={(t) => setTasks(prev => [...prev, t])}
              onTaskDeleted={(id) => setTasks(prev => prev.filter(x => x.id !== id))}
              onTaskUpdated={(t) => setTasks(prev => prev.map(x => x.id === t.id ? t : x))}
              userName={userName}
            />
          </TabsContent>

          <TabsContent value="stages" className="m-0">
            <Card className="border-border/50">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{isRtl ? "مراحل المشروع" : "Project stages"}</CardTitle>
                <Button size="sm" onClick={() => setShowAddStage(true)} data-testid="button-add-stage">
                  <Plus className="w-4 h-4 mr-1 rtl:ml-1 rtl:mr-0" />{isRtl ? "إضافة مرحلة" : "Add stage"}
                </Button>
              </CardHeader>
              <CardContent>
                {stages.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    {isRtl ? "لا توجد مراحل بعد. أضف أول مرحلة لتتبع التقدم." : "No stages yet. Add the first stage to track progress."}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stages.map((s, idx) => (
                      <div key={s.id} className="border border-border/50 rounded-lg p-4 hover-elevate" data-testid={`row-stage-${s.id}`}>
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="flex-1 min-w-[200px]">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-mono text-muted-foreground">#{idx + 1}</span>
                              <span className="font-semibold">{isRtl ? (s.titleAr || s.titleEn) : (s.titleEn || s.titleAr)}</span>
                              <Badge variant="outline" className={cn("font-normal border-transparent text-xs", STAGE_STATUS_COLORS[s.status] ?? STAGE_STATUS_COLORS.pending)}>
                                {isRtl ? (STAGE_STATUS_LABELS_AR[s.status] ?? s.status) : (STAGE_STATUS_LABELS_EN[s.status] ?? s.status)}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5 flex-wrap">
                              {s.assignedTo && <span className="flex items-center gap-1"><UserIcon className="w-3 h-3" /> {userName(s.assignedTo)}</span>}
                              {s.expectedEnd && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(s.expectedEnd).toLocaleDateString()}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Select value={s.status} onValueChange={(v) => handleStageChange(s.id, { status: v as StageStatus })}>
                              <SelectTrigger className="h-8 w-36" data-testid={`select-stage-status-${s.id}`}><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {Object.keys(STAGE_STATUS_LABELS_AR).map(k => (
                                  <SelectItem key={k} value={k}>{isRtl ? STAGE_STATUS_LABELS_AR[k] : STAGE_STATUS_LABELS_EN[k]}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select value={s.assignedTo || "__none__"} onValueChange={(v) => handleStageChange(s.id, { assignedTo: v === "__none__" ? null : v })}>
                              <SelectTrigger className="h-8 w-44" data-testid={`select-stage-assignee-${s.id}`}><SelectValue placeholder={isRtl ? "المسؤول" : "Assignee"} /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">{isRtl ? "بدون" : "Unassigned"}</SelectItem>
                                {users.map(u => (<SelectItem key={u.id} value={u.id}>{u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.id}</SelectItem>))}
                              </SelectContent>
                            </Select>
                            <Button variant="ghost" size="sm" onClick={() => setEditStage(s)} data-testid={`button-edit-stage-${s.id}`}>{isRtl ? "تفاصيل" : "Edit"}</Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                              onClick={async () => {
                                if (!confirm(isRtl ? "حذف هذه المرحلة؟" : "Delete this stage?")) return;
                                await deleteStage(s.id);
                                setStages(prev => prev.filter(x => x.id !== s.id));
                              }} data-testid={`button-delete-stage-${s.id}`}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span>{isRtl ? "نسبة الإنجاز" : "Progress"}</span>
                            <span>{s.progress ?? 0}%</span>
                          </div>
                          <input
                            type="range" min={0} max={100} step={5}
                            value={s.progress ?? 0}
                            onChange={e => setStages(prev => prev.map(x => x.id === s.id ? { ...x, progress: Number(e.target.value) } : x))}
                            onMouseUp={e => handleStageChange(s.id, { progress: Number((e.target as HTMLInputElement).value) })}
                            onTouchEnd={e => handleStageChange(s.id, { progress: Number((e.target as HTMLInputElement).value) })}
                            className="w-full"
                            data-testid={`input-stage-progress-${s.id}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="info" className="m-0">
            <ProjectInfoEditor project={project} users={users} isPrivileged={isPrivileged} onSave={handleSaveProject} saving={saving} />
          </TabsContent>

          <TabsContent value="documents" className="m-0">
            <ProjectDocumentsTab projectId={project.id} isRtl={isRtl} userName={userName} />
          </TabsContent>

          <TabsContent value="payments" className="m-0">
            <ProjectPaymentsTab project={project} isRtl={isRtl} />
          </TabsContent>

          <TabsContent value="history" className="m-0">
            <Card className="border-border/50">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><HistoryIcon className="w-4 h-4" />{isRtl ? "سجل المشروع" : "Project history"}</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm" data-testid="list-history">
                  <HistoryRow label={isRtl ? "تم إنشاء المشروع" : "Project created"} when={project.createdAt} who={userName(project.createdBy)} />
                  {project.updatedAt && project.updatedAt !== project.createdAt && (
                    <HistoryRow label={isRtl ? "آخر تحديث" : "Last updated"} when={project.updatedAt} who={null} />
                  )}
                  {stages.filter(s => s.completedAt).map(s => (
                    <HistoryRow
                      key={`done-${s.id}`}
                      label={`${isRtl ? "اكتملت المرحلة" : "Stage completed"}: ${isRtl ? (s.titleAr || s.titleEn) : (s.titleEn || s.titleAr)}`}
                      when={s.completedAt!}
                      who={userName(s.assignedTo)}
                    />
                  ))}
                </div>
                <div className="mt-4 text-xs text-muted-foreground">
                  {isRtl ? "سجل تدقيق تفصيلي لكل التغييرات سيتوفر لاحقاً." : "A detailed audit log of every change is planned for a future update."}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <StageDialog
        open={showAddStage}
        onOpenChange={setShowAddStage}
        users={users}
        onSubmit={async (data) => {
          const created = await createStage(project.id, { ...data, sortOrder: stages.length });
          setStages(prev => [...prev, created]);
        }}
      />
      {editStage && (
        <StageDialog
          open
          onOpenChange={(v) => { if (!v) setEditStage(null); }}
          users={users}
          initial={editStage}
          onSubmit={async (data) => {
            const upd = await updateStage(editStage.id, data);
            setStages(prev => prev.map(x => x.id === upd.id ? upd : x));
            setEditStage(null);
          }}
        />
      )}
    </MainLayout>
  );
}

function ProjectDocumentsTab({ projectId, isRtl, userName }: {
  projectId: number; isRtl: boolean; userName: (id: string | null | undefined) => string | null;
}) {
  const { toast } = useToast();
  const [docs, setDocs] = useState<ApiProjectDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ titleAr: "", titleEn: "", fileUrl: "", description: "", type: "" });
  const [saving, setSaving] = useState(false);

  const reload = async () => {
    setLoading(true);
    try { setDocs(await listProjectDocuments(projectId)); }
    catch (e) { setDocs([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [projectId]);

  const submit = async () => {
    if (!form.titleAr && !form.titleEn) {
      toast({ title: isRtl ? "العنوان مطلوب" : "Title is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await createProjectDocument(projectId, {
        titleAr: form.titleAr || form.titleEn,
        titleEn: form.titleEn || form.titleAr,
        type: form.type || null,
        fileUrl: form.fileUrl || null,
        description: form.description || null,
      });
      setForm({ titleAr: "", titleEn: "", fileUrl: "", description: "", type: "" });
      setShowAdd(false);
      reload();
    } catch (err) {
      toast({ title: isRtl ? "تعذّر الحفظ" : "Failed", description: (err as Error).message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4" />{isRtl ? "مستندات المشروع" : "Project documents"}</CardTitle>
        <Button size="sm" onClick={() => setShowAdd(true)} data-testid="button-add-document">
          <Plus className="w-4 h-4 mr-1 rtl:ml-1 rtl:mr-0" />{isRtl ? "ربط مستند" : "Link document"}
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">{isRtl ? "جارٍ التحميل..." : "Loading..."}</div>
        ) : docs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm" data-testid="text-documents-empty">
            {isRtl ? "لا توجد مستندات. أضف مستنداً للبدء." : "No documents yet. Add one to get started."}
          </div>
        ) : (
          <div className="space-y-2" data-testid="list-documents">
            {docs.map(d => (
              <div key={d.id} className="flex items-center justify-between border border-border/50 rounded-lg p-3 hover-elevate" data-testid={`row-document-${d.id}`}>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm truncate">{isRtl ? (d.titleAr || d.titleEn) : (d.titleEn || d.titleAr)}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                    {d.type && <span className="uppercase tracking-wide">{d.type}</span>}
                    {d.uploadedBy && <span>· {userName(d.uploadedBy)}</span>}
                    {d.createdAt && <span>· {new Date(d.createdAt).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {d.fileUrl && (
                    <a href={d.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline" data-testid={`link-document-${d.id}`}>
                      {isRtl ? "فتح" : "Open"}
                    </a>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                    onClick={async () => {
                      if (!confirm(isRtl ? "حذف؟" : "Delete?")) return;
                      await deleteProjectDocument(d.id);
                      setDocs(prev => prev.filter(x => x.id !== d.id));
                    }} data-testid={`button-delete-document-${d.id}`}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>{isRtl ? "ربط مستند" : "Link document"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>{isRtl ? "العنوان (عربي)" : "Title (Arabic)"}</Label>
              <Input value={form.titleAr} onChange={e => setForm({ ...form, titleAr: e.target.value })} data-testid="input-doc-titleAr" /></div>
            <div className="col-span-2"><Label>{isRtl ? "العنوان (إنجليزي)" : "Title (English)"}</Label>
              <Input value={form.titleEn} onChange={e => setForm({ ...form, titleEn: e.target.value })} data-testid="input-doc-titleEn" /></div>
            <div><Label>{isRtl ? "النوع" : "Type"}</Label>
              <Input value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} placeholder="contract / drawing / report" data-testid="input-doc-type" /></div>
            <div><Label>{isRtl ? "الرابط" : "URL"}</Label>
              <Input value={form.fileUrl} onChange={e => setForm({ ...form, fileUrl: e.target.value })} placeholder="https://..." data-testid="input-doc-url" /></div>
            <div className="col-span-2"><Label>{isRtl ? "وصف" : "Description"}</Label>
              <Textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} data-testid="input-doc-desc" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>{isRtl ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={submit} disabled={saving} data-testid="button-save-document">
              {saving ? (isRtl ? "جارٍ الحفظ..." : "Saving...") : (isRtl ? "حفظ" : "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

interface ContractSchedRow {
  id: number; contractRef: string; contractName: string | null;
  installmentNumber: number; descriptionAr: string | null; descriptionEn: string | null;
  percentage: string | null; amount: string | null; paidAmount: string | null;
  dueDate: string | null; paidDate: string | null; status: string | null;
}

interface ReceiptRow {
  id: number; paymentNumber: string | null; amount: string; currency: string | null;
  method: string | null; date: string | null; contractRef: string | null;
  scheduleId: number | null; contactId: number | null; type: string | null;
}

const SCHED_STATUS_AR: Record<string, string> = { pending: "قيد الانتظار", partial: "مدفوعة جزئياً", paid: "مدفوعة", overdue: "متأخرة" };
const SCHED_STATUS_EN: Record<string, string> = { pending: "Pending", partial: "Partial", paid: "Paid", overdue: "Overdue" };
const SCHED_STATUS_COLORS: Record<string, string> = {
  pending: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  partial: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  overdue: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

function ProjectPaymentsTab({ project, isRtl }: { project: ApiProject; isRtl: boolean }) {
  const [invoices, setInvoices] = useState<ApiProjectInvoice[]>([]);
  const [schedule, setSchedule] = useState<ContractSchedRow[]>([]);
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [contractRef, setContractRef] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newTotal, setNewTotal] = useState("");
  const [newPaid, setNewPaid] = useState("");
  const [newDue, setNewDue] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const [inv, sched, recs] = await Promise.all([
        listProjectInvoices(project.id).catch(() => [] as ApiProjectInvoice[]),
        (async () => {
          if (!project.contractId) return { ref: null as string | null, rows: [] as ContractSchedRow[] };
          try {
            const ctr = await scopedFetch(`/api/contracts/${project.contractId}`).then(r => r.ok ? r.json() : null);
            const ref: string | null = ctr?.contractNumber || null;
            if (!ref) return { ref: null, rows: [] };
            const rows = await scopedFetch(`/api/contract-payment-schedules?contractRef=${encodeURIComponent(ref)}`).then(r => r.ok ? r.json() : []);
            return { ref, rows: Array.isArray(rows) ? rows : [] };
          } catch { return { ref: null, rows: [] }; }
        })(),
        scopedFetch("/api/payments?type=received").then(r => r.ok ? r.json() : []).catch(() => []),
      ]);
      if (cancelled) return;
      setInvoices(inv);
      setContractRef(sched.ref);
      setSchedule(sched.rows);
      const all: ReceiptRow[] = Array.isArray(recs) ? recs : [];
      setReceipts(all.filter(p =>
        (sched.ref && p.contractRef === sched.ref) ||
        (project.contactId != null && p.contactId === project.contactId)
      ));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [project.id, project.contractId, project.contactId]);

  async function handleCreate() {
    const total = Number(newTotal);
    if (!Number.isFinite(total) || total <= 0) return;
    setSubmitting(true);
    try {
      const created = await createProjectInvoice(project.id, {
        total,
        paidAmount: Number(newPaid) || 0,
        dueDate: newDue || undefined,
        notes: newNotes || undefined,
      });
      setInvoices(prev => [created, ...prev]);
      setShowAdd(false);
      setNewTotal(""); setNewPaid(""); setNewDue(""); setNewNotes("");
    } catch (e) {
      console.error(e);
    } finally { setSubmitting(false); }
  }

  const totals = useMemo(() => {
    const billed = invoices.reduce((s, i) => s + Number(i.total ?? 0), 0);
    const paid = invoices.reduce((s, i) => s + Number(i.paidAmount ?? 0), 0);
    return { billed, paid, outstanding: billed - paid };
  }, [invoices]);

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2"><CreditCard className="w-4 h-4" />{isRtl ? "المدفوعات والفواتير" : "Payments & invoices"}</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setShowAdd(true)} data-testid="button-add-invoice">
          <Plus className="w-4 h-4 me-1" />{isRtl ? "إضافة فاتورة" : "Add invoice"}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm mb-4">
          <Stat label={isRtl ? "الميزانية" : "Budget"} value={project.budget ?? "—"} testid="text-budget" />
          <Stat label={isRtl ? "المصروف" : "Spent"} value={project.spent ?? "0.00"} testid="text-spent" />
          <Stat label={isRtl ? "المُفوتر" : "Billed"} value={totals.billed.toFixed(2)} testid="text-billed" />
          <Stat label={isRtl ? "المسدد" : "Paid"} value={totals.paid.toFixed(2)} testid="text-paid" />
        </div>
        {loading ? (
          <div className="text-center py-6 text-muted-foreground text-sm">{isRtl ? "جارٍ التحميل..." : "Loading..."}</div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm" data-testid="text-payments-empty">
            {isRtl
              ? "لا توجد فواتير مرتبطة بهذا العميل/العقد بعد."
              : "No invoices linked to this client/contract yet."}
          </div>
        ) : (
          <div className="space-y-2" data-testid="list-invoices">
            {invoices.map(i => (
              <div key={i.id} className="flex items-center justify-between border border-border/50 rounded-lg p-3" data-testid={`row-invoice-${i.id}`}>
                <div>
                  <div className="font-medium text-sm">{i.invoiceNumber}</div>
                  <div className="text-xs text-muted-foreground">
                    {i.issueDate && <span>{new Date(i.issueDate).toLocaleDateString()}</span>}
                    {i.status && <Badge variant="outline" className="ml-2 rtl:mr-2 rtl:ml-0 text-[10px]">{i.status}</Badge>}
                  </div>
                </div>
                <div className="text-end">
                  <div className="font-semibold text-sm tabular-nums">{Number(i.total ?? 0).toFixed(2)} {i.currency || ""}</div>
                  <div className="text-xs text-muted-foreground">
                    {isRtl ? "مدفوع" : "Paid"}: <span className="tabular-nums">{Number(i.paidAmount ?? 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && schedule.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold">{isRtl ? "جدول دفعات العقد" : "Contract payment schedule"}{contractRef ? ` — ${contractRef}` : ""}</h4>
              <div className="text-xs text-muted-foreground tabular-nums">
                {isRtl ? "المسدد" : "Paid"}: {schedule.reduce((s, r) => s + Number(r.paidAmount ?? 0), 0).toLocaleString()} / {schedule.reduce((s, r) => s + Number(r.amount ?? 0), 0).toLocaleString()}
              </div>
            </div>
            <div className="border border-border/50 rounded-lg overflow-hidden" data-testid="list-contract-schedule">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 text-xs text-muted-foreground">
                    <th className="p-2 text-start">{isRtl ? "القسط" : "#"}</th>
                    <th className="p-2 text-start">{isRtl ? "الوصف" : "Description"}</th>
                    <th className="p-2 text-start">{isRtl ? "الاستحقاق" : "Due"}</th>
                    <th className="p-2 text-end">{isRtl ? "المبلغ" : "Amount"}</th>
                    <th className="p-2 text-end">{isRtl ? "المسدد" : "Paid"}</th>
                    <th className="p-2 text-center">{isRtl ? "الحالة" : "Status"}</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.map(s => {
                    const st = s.status || "pending";
                    const overdueNow = st !== "paid" && s.dueDate && new Date(s.dueDate) < new Date();
                    const shown = overdueNow && st === "pending" ? "overdue" : st;
                    return (
                      <tr key={s.id} className="border-t border-border/40" data-testid={`row-schedule-${s.id}`}>
                        <td className="p-2 tabular-nums">{s.installmentNumber}</td>
                        <td className="p-2">{(isRtl ? s.descriptionAr : s.descriptionEn) || s.descriptionAr || s.descriptionEn || "—"}</td>
                        <td className="p-2 tabular-nums text-xs">{s.dueDate ? String(s.dueDate).slice(0, 10) : "—"}</td>
                        <td className="p-2 text-end tabular-nums">{Number(s.amount ?? 0).toLocaleString()}</td>
                        <td className="p-2 text-end tabular-nums">{Number(s.paidAmount ?? 0).toLocaleString()}</td>
                        <td className="p-2 text-center">
                          <Badge variant="outline" className={cn("border-transparent text-[10px]", SCHED_STATUS_COLORS[shown] || SCHED_STATUS_COLORS.pending)}>
                            {(isRtl ? SCHED_STATUS_AR : SCHED_STATUS_EN)[shown] || shown}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && receipts.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-semibold mb-2">{isRtl ? "سندات القبض" : "Payment receipts"}</h4>
            <div className="space-y-2" data-testid="list-receipts">
              {receipts.map(p => (
                <div key={p.id} className="flex items-center justify-between border border-border/50 rounded-lg p-3" data-testid={`row-receipt-${p.id}`}>
                  <div>
                    <div className="font-medium text-sm">{p.paymentNumber || `#${p.id}`}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      {p.date && <span className="tabular-nums">{String(p.date).slice(0, 10)}</span>}
                      {p.method && <Badge variant="outline" className="text-[10px]">{p.method}</Badge>}
                      {p.contractRef && <span className="font-mono text-[10px]">{p.contractRef}</span>}
                    </div>
                  </div>
                  <div className="font-semibold text-sm tabular-nums text-emerald-600 dark:text-emerald-400">
                    +{Number(p.amount ?? 0).toLocaleString()} {p.currency || "SAR"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>{isRtl ? "إضافة فاتورة جديدة" : "Add a new invoice"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{isRtl ? "المبلغ الإجمالي" : "Total amount"}</Label>
              <Input type="number" min="0" step="0.01" value={newTotal} onChange={e => setNewTotal(e.target.value)} data-testid="input-invoice-total" />
            </div>
            <div>
              <Label>{isRtl ? "المسدد" : "Paid amount"}</Label>
              <Input type="number" min="0" step="0.01" value={newPaid} onChange={e => setNewPaid(e.target.value)} data-testid="input-invoice-paid" />
            </div>
            <div>
              <Label>{isRtl ? "تاريخ الاستحقاق" : "Due date"}</Label>
              <Input type="date" value={newDue} onChange={e => setNewDue(e.target.value)} data-testid="input-invoice-due" />
            </div>
            <div>
              <Label>{isRtl ? "ملاحظات" : "Notes"}</Label>
              <Textarea value={newNotes} onChange={e => setNewNotes(e.target.value)} data-testid="input-invoice-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>{isRtl ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={handleCreate} disabled={submitting || !newTotal} data-testid="button-submit-invoice">
              {submitting ? (isRtl ? "جارٍ الحفظ..." : "Saving...") : (isRtl ? "حفظ" : "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function Stat({ label, value, testid }: { label: string; value: string | number; testid?: string }) {
  return (
    <div className="border border-border/50 rounded-lg p-3">
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="font-semibold text-lg tabular-nums" data-testid={testid}>{value}</div>
    </div>
  );
}

function HistoryRow({ label, when, who }: { label: string; when: string; who: string | null }) {
  return (
    <div className="flex items-center justify-between border-b border-border/30 pb-2 text-xs">
      <div>
        <div className="font-medium text-foreground">{label}</div>
        {who && <div className="text-muted-foreground mt-0.5">{who}</div>}
      </div>
      <div className="text-muted-foreground tabular-nums">{new Date(when).toLocaleString()}</div>
    </div>
  );
}

function ProjectInfoEditor({
  project, users, isPrivileged, onSave, saving,
}: {
  project: ApiProject; users: SimpleUser[]; isPrivileged: boolean;
  onSave: (patch: Partial<ApiProject>) => void; saving: boolean;
}) {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";
  const [form, setForm] = useState({
    nameAr: project.nameAr || "",
    nameEn: project.nameEn || "",
    description: project.description || "",
    clientName: project.clientName || "",
    location: project.location || "",
    managerId: project.managerId || "",
    status: project.status,
    startDate: project.startDate || "",
    endDate: project.endDate || "",
    budget: project.budget || "",
    notes: project.notes || "",
  });
  return (
    <Card className="border-border/50">
      <CardHeader><CardTitle className="text-base">{isRtl ? "معلومات المشروع" : "Project information"}</CardTitle></CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label>{isRtl ? "العنوان (عربي)" : "Title (Arabic)"}</Label>
          <Input value={form.nameAr} onChange={e => setForm({ ...form, nameAr: e.target.value })} data-testid="input-edit-nameAr" />
        </div>
        <div className="col-span-2">
          <Label>{isRtl ? "العنوان (إنجليزي)" : "Title (English)"}</Label>
          <Input value={form.nameEn} onChange={e => setForm({ ...form, nameEn: e.target.value })} data-testid="input-edit-nameEn" />
        </div>
        <div>
          <Label>{isRtl ? "العميل (اسم نصي)" : "Client name (free text)"}</Label>
          <Input value={form.clientName} onChange={e => setForm({ ...form, clientName: e.target.value })} data-testid="input-edit-clientName" />
        </div>
        <div>
          <Label>{isRtl ? "الموقع" : "Location"}</Label>
          <Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} data-testid="input-edit-location" />
        </div>
        <div>
          <Label>{isRtl ? "المسؤول" : "Manager"}</Label>
          <Select value={form.managerId || "__none__"} onValueChange={v => setForm({ ...form, managerId: v === "__none__" ? "" : v })}>
            <SelectTrigger data-testid="select-edit-manager"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">{isRtl ? "بدون" : "None"}</SelectItem>
              {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.id}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>{isRtl ? "الحالة" : "Status"}</Label>
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as ProjectStatus })}>
            <SelectTrigger data-testid="select-edit-status"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.keys(PROJECT_STATUS_LABELS_AR).map(k => (
                <SelectItem key={k} value={k}>{isRtl ? PROJECT_STATUS_LABELS_AR[k] : PROJECT_STATUS_LABELS_EN[k]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>{isRtl ? "تاريخ البدء" : "Start date"}</Label>
          <Input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} data-testid="input-edit-startDate" />
        </div>
        <div>
          <Label>{isRtl ? "تاريخ الانتهاء" : "End date"}</Label>
          <Input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} data-testid="input-edit-endDate" />
        </div>
        <div>
          <Label>{isRtl ? "الميزانية" : "Budget"}</Label>
          <Input type="number" value={form.budget || ""} onChange={e => setForm({ ...form, budget: e.target.value })} data-testid="input-edit-budget" />
        </div>
        <div className="col-span-2">
          <Label>{isRtl ? "الوصف" : "Description"}</Label>
          <Textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} data-testid="input-edit-description" />
        </div>
        <div className="col-span-2">
          <Label>{isRtl ? "ملاحظات" : "Notes"}</Label>
          <Textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} data-testid="input-edit-notes" />
        </div>
        <div className="col-span-2 flex justify-end">
          <Button onClick={() => {
            const patch: Partial<ApiProject> = {
              nameAr: form.nameAr,
              nameEn: form.nameEn,
              description: form.description || null,
              clientName: form.clientName || null,
              location: form.location || null,
              managerId: form.managerId || null,
              status: form.status,
              startDate: form.startDate || null,
              endDate: form.endDate || null,
              budget: form.budget ? String(form.budget) : null,
              notes: form.notes || null,
            };
            onSave(patch);
          }} disabled={saving} data-testid="button-save-project">
            <Save className="w-4 h-4 mr-1 rtl:ml-1 rtl:mr-0" />{saving ? (isRtl ? "جارٍ الحفظ..." : "Saving...") : (isRtl ? "حفظ" : "Save")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Task Status colors ───────────────────────────────────────────────────────
const TASK_STATUS_COLORS: Record<string, string> = {
  todo: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  review: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  done: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  blocked: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};
const TASK_PRIORITY_COLORS: Record<string, string> = {
  low: "text-slate-500", medium: "text-blue-500", high: "text-amber-500", urgent: "text-red-500",
};

function ProjectTasksTab({
  projectId, tasks, users, isRtl, view, onViewChange,
  showAddTask, onShowAddTask, editTask, onEditTask,
  onTaskChange, onTaskCreated, onTaskDeleted, onTaskUpdated, userName,
}: {
  projectId: number;
  tasks: ApiTask[];
  users: SimpleUser[];
  isRtl: boolean;
  view: "list" | "kanban";
  onViewChange: (v: "list" | "kanban") => void;
  showAddTask: boolean;
  onShowAddTask: (v: boolean) => void;
  editTask: ApiTask | null;
  onEditTask: (t: ApiTask | null) => void;
  onTaskChange: (id: number, patch: Partial<ApiTask>) => void;
  onTaskCreated: (t: ApiTask) => void;
  onTaskDeleted: (id: number) => void;
  onTaskUpdated: (t: ApiTask) => void;
  userName: (id: string | null | undefined) => string | null;
}) {
  const { toast } = useToast();
  const taskStatuses: TaskStatus[] = ["todo", "in_progress", "review", "done", "blocked"];

  const doneTasks = tasks.filter(t => t.status === "done").length;
  const overdue = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "done").length;
  const totalHrs = tasks.reduce((s, t) => s + parseFloat(t.estimatedHours ?? "0"), 0);
  const doneHrs = tasks.reduce((s, t) => s + parseFloat(t.actualHours ?? "0"), 0);

  const handleDelete = async (id: number) => {
    if (!confirm(isRtl ? "حذف هذه المهمة؟" : "Delete this task?")) return;
    try { await deleteTask(id); onTaskDeleted(id); }
    catch { toast({ title: isRtl ? "خطأ في الحذف" : "Delete error", variant: "destructive" }); }
  };

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: isRtl ? "إجمالي المهام" : "Total Tasks", value: tasks.length, icon: CheckSquare, color: "text-blue-500" },
          { label: isRtl ? "مكتملة" : "Done", value: `${doneTasks} / ${tasks.length}`, icon: CheckSquare, color: "text-emerald-500" },
          { label: isRtl ? "متأخرة" : "Overdue", value: overdue, icon: AlertCircle, color: "text-red-500" },
          { label: isRtl ? "ساعات (متوقع/فعلي)" : "Hours (est/actual)", value: `${totalHrs.toFixed(0)}h / ${doneHrs.toFixed(0)}h`, icon: Clock, color: "text-amber-500" },
        ].map((s, i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-3 flex items-center gap-2.5">
              <s.icon className={cn("w-4 h-4 flex-shrink-0", s.color)} />
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="font-semibold text-sm">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Header */}
      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">{isRtl ? "مهام المشروع" : "Project Tasks"}</CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex border border-border rounded-md overflow-hidden">
              <button onClick={() => onViewChange("list")} className={cn("px-2.5 py-1.5", view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")} title="List">
                <List className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => onViewChange("kanban")} className={cn("px-2.5 py-1.5", view === "kanban" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")} title="Kanban">
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>
            <Button size="sm" onClick={() => onShowAddTask(true)} data-testid="button-add-task">
              <Plus className="w-4 h-4 mr-1 rtl:ml-1 rtl:mr-0" />{isRtl ? "مهمة جديدة" : "Add Task"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {tasks.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">
              <CheckSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
              {isRtl ? "لا توجد مهام بعد. أضف أول مهمة لبدء التتبع." : "No tasks yet. Add the first task to start tracking progress."}
            </div>
          ) : view === "kanban" ? (
            // Kanban View
            <div className="flex gap-3 overflow-x-auto pb-2">
              {taskStatuses.map(status => {
                const cols = tasks.filter(t => t.status === status);
                return (
                  <div key={status} className="flex-shrink-0 w-64">
                    <div className={cn("rounded-t-lg px-3 py-2 flex items-center justify-between", TASK_STATUS_COLORS[status])}>
                      <span className="text-xs font-semibold">{isRtl ? TASK_STATUS_AR[status] : TASK_STATUS_EN[status]}</span>
                      <span className="text-xs font-bold bg-white/30 rounded-full px-1.5">{cols.length}</span>
                    </div>
                    <div className="border border-t-0 border-border/50 rounded-b-lg min-h-32 p-2 space-y-2 bg-secondary/20">
                      {cols.map(task => (
                        <div key={task.id} className="bg-background border border-border/50 rounded-lg p-2.5 cursor-pointer hover:shadow-sm transition-shadow"
                          onClick={() => onEditTask(task)} data-testid={`kanban-task-${task.id}`}>
                          <p className="text-xs font-medium leading-tight">{isRtl ? task.titleAr : (task.titleEn || task.titleAr)}</p>
                          {task.assignedTo && (
                            <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                              <UserIcon className="w-3 h-3" />{userName(task.assignedTo)}
                            </p>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <span className={cn("text-xs", TASK_PRIORITY_COLORS[task.priority])}>{isRtl ? TASK_PRIORITY_AR[task.priority] : TASK_PRIORITY_EN[task.priority]}</span>
                            {task.dueDate && (
                              <span className={cn("text-xs", new Date(task.dueDate) < new Date() && task.status !== "done" ? "text-red-500 font-medium" : "text-muted-foreground")}>
                                {new Date(task.dueDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          {(task.progress ?? 0) > 0 && (
                            <div className="mt-2">
                              <div className="h-1 bg-secondary rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full" style={{ width: `${task.progress}%` }} />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // List View
            <div className="space-y-2">
              {tasks.map(task => {
                const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done";
                return (
                  <div key={task.id} className={cn("border border-border/50 rounded-lg p-3 hover:bg-muted/30 transition-colors", isOverdue && "border-red-200 dark:border-red-900/40")} data-testid={`row-task-${task.id}`}>
                    <div className="flex items-start gap-3">
                      {/* Status quick toggle */}
                      <button
                        className={cn("mt-0.5 w-4 h-4 rounded border-2 flex-shrink-0 transition-colors", task.status === "done" ? "bg-emerald-500 border-emerald-500" : "border-border")}
                        onClick={() => onTaskChange(task.id, { status: task.status === "done" ? "todo" : "done", progress: task.status === "done" ? 0 : 100 })}
                        data-testid={`checkbox-task-${task.id}`}
                        title={task.status === "done" ? (isRtl ? "إلغاء الإكمال" : "Mark incomplete") : (isRtl ? "تمييز كمكتمل" : "Mark complete")}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn("font-medium text-sm", task.status === "done" && "line-through text-muted-foreground")}>
                            {isRtl ? task.titleAr : (task.titleEn || task.titleAr)}
                          </span>
                          <Badge variant="outline" className={cn("text-[10px] border-transparent px-1.5", TASK_STATUS_COLORS[task.status])}>
                            {isRtl ? TASK_STATUS_AR[task.status] : TASK_STATUS_EN[task.status]}
                          </Badge>
                          <span className={cn("text-xs font-medium", TASK_PRIORITY_COLORS[task.priority])}>
                            {isRtl ? TASK_PRIORITY_AR[task.priority] : TASK_PRIORITY_EN[task.priority]}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {task.assignedTo && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <UserIcon className="w-3 h-3" />{userName(task.assignedTo)}
                            </span>
                          )}
                          {task.dueDate && (
                            <span className={cn("flex items-center gap-1 text-xs", isOverdue ? "text-red-500 font-medium" : "text-muted-foreground")}>
                              <Calendar className="w-3 h-3" />{new Date(task.dueDate).toLocaleDateString()}
                              {isOverdue && (isRtl ? " (متأخر)" : " (overdue)")}
                            </span>
                          )}
                          {(parseFloat(task.estimatedHours ?? "0") > 0) && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />{task.estimatedHours}h
                            </span>
                          )}
                        </div>
                        {/* Progress slider inline */}
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1">
                            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${task.progress ?? 0}%` }} />
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground w-8 text-right">{task.progress ?? 0}%</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Select value={task.status} onValueChange={(v) => onTaskChange(task.id, { status: v as TaskStatus })}>
                          <SelectTrigger className="h-7 w-32 text-xs" data-testid={`select-task-status-${task.id}`}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {(["todo","in_progress","review","done","blocked"] as TaskStatus[]).map(s => (
                              <SelectItem key={s} value={s}>{isRtl ? TASK_STATUS_AR[s] : TASK_STATUS_EN[s]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onEditTask(task)} data-testid={`button-edit-task-${task.id}`}>
                          {isRtl ? "تفاصيل" : "Edit"}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(task.id)} data-testid={`button-delete-task-${task.id}`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Task Dialog — Add */}
      <TaskDialog
        open={showAddTask}
        onOpenChange={onShowAddTask}
        users={users}
        isRtl={isRtl}
        onSubmit={async (data) => {
          const t = await createTask(projectId, { ...data, sortOrder: tasks.length });
          onTaskCreated(t);
        }}
      />
      {/* Task Dialog — Edit */}
      {editTask && (
        <TaskDialog
          open
          onOpenChange={(v) => { if (!v) onEditTask(null); }}
          users={users}
          isRtl={isRtl}
          initial={editTask}
          onSubmit={async (data) => {
            const upd = await updateTask(editTask.id, data);
            onTaskUpdated(upd);
            onEditTask(null);
          }}
        />
      )}
    </div>
  );
}

function TaskDialog({
  open, onOpenChange, users, isRtl, initial, onSubmit,
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  users: SimpleUser[]; isRtl: boolean;
  initial?: ApiTask;
  onSubmit: (data: Partial<ApiTask>) => Promise<void>;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const blank = { titleAr: "", titleEn: "", description: "", assignedTo: "", status: "todo" as TaskStatus, priority: "medium" as TaskPriority, startDate: "", dueDate: "", estimatedHours: "", actualHours: "", progress: 0 };
  const [form, setForm] = useState(blank);

  useEffect(() => {
    if (open) {
      setForm(initial ? {
        titleAr: initial.titleAr || "", titleEn: initial.titleEn || "",
        description: initial.description || "", assignedTo: initial.assignedTo || "",
        status: initial.status || "todo", priority: initial.priority || "medium",
        startDate: initial.startDate || "", dueDate: initial.dueDate || "",
        estimatedHours: initial.estimatedHours || "", actualHours: initial.actualHours || "",
        progress: initial.progress ?? 0,
      } : blank);
    }
  }, [open, initial]);

  const submit = async () => {
    if (!form.titleAr && !form.titleEn) {
      toast({ title: isRtl ? "العنوان مطلوب" : "Title is required", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      await onSubmit({
        titleAr: form.titleAr || form.titleEn,
        titleEn: form.titleEn || form.titleAr || null,
        description: form.description || null,
        assignedTo: form.assignedTo || null,
        status: form.status,
        priority: form.priority,
        startDate: form.startDate || null,
        dueDate: form.dueDate || null,
        estimatedHours: form.estimatedHours ? String(form.estimatedHours) : null,
        actualHours: form.actualHours ? String(form.actualHours) : null,
        progress: form.progress,
      });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: isRtl ? "خطأ" : "Error", description: err?.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? (isRtl ? "تعديل المهمة" : "Edit Task") : (isRtl ? "مهمة جديدة" : "New Task")}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 max-h-[65vh] overflow-y-auto px-1">
          <div className="col-span-2">
            <Label>{isRtl ? "العنوان (عربي)" : "Title (Arabic)"} *</Label>
            <Input value={form.titleAr} onChange={e => setForm({ ...form, titleAr: e.target.value })} data-testid="input-task-titleAr" />
          </div>
          <div className="col-span-2">
            <Label>{isRtl ? "العنوان (إنجليزي)" : "Title (English)"}</Label>
            <Input value={form.titleEn} onChange={e => setForm({ ...form, titleEn: e.target.value })} data-testid="input-task-titleEn" />
          </div>
          <div>
            <Label>{isRtl ? "المعيّن" : "Assigned To"}</Label>
            <Select value={form.assignedTo || "__none__"} onValueChange={v => setForm({ ...form, assignedTo: v === "__none__" ? "" : v })}>
              <SelectTrigger data-testid="select-task-assignee"><SelectValue placeholder={isRtl ? "اختر" : "Pick"} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{isRtl ? "غير معيّن" : "Unassigned"}</SelectItem>
                {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.id}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{isRtl ? "الأولوية" : "Priority"}</Label>
            <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v as TaskPriority })}>
              <SelectTrigger data-testid="select-task-priority"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["low","medium","high","urgent"] as TaskPriority[]).map(p => (
                  <SelectItem key={p} value={p}>{isRtl ? TASK_PRIORITY_AR[p] : TASK_PRIORITY_EN[p]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{isRtl ? "الحالة" : "Status"}</Label>
            <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as TaskStatus })}>
              <SelectTrigger data-testid="select-task-status"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["todo","in_progress","review","done","blocked"] as TaskStatus[]).map(s => (
                  <SelectItem key={s} value={s}>{isRtl ? TASK_STATUS_AR[s] : TASK_STATUS_EN[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{isRtl ? "نسبة الإنجاز" : "Progress"}: {form.progress}%</Label>
            <input type="range" min={0} max={100} step={5} value={form.progress}
              onChange={e => setForm({ ...form, progress: Number(e.target.value) })}
              className="w-full mt-1" data-testid="input-task-progress" />
          </div>
          <div>
            <Label>{isRtl ? "تاريخ البدء" : "Start Date"}</Label>
            <Input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} data-testid="input-task-startDate" />
          </div>
          <div>
            <Label>{isRtl ? "تاريخ الانتهاء" : "Due Date"}</Label>
            <Input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} data-testid="input-task-dueDate" />
          </div>
          <div>
            <Label>{isRtl ? "ساعات متوقعة" : "Est. Hours"}</Label>
            <Input type="number" min={0} step={0.5} value={form.estimatedHours} onChange={e => setForm({ ...form, estimatedHours: e.target.value })} data-testid="input-task-estimatedHours" />
          </div>
          <div>
            <Label>{isRtl ? "ساعات فعلية" : "Actual Hours"}</Label>
            <Input type="number" min={0} step={0.5} value={form.actualHours} onChange={e => setForm({ ...form, actualHours: e.target.value })} data-testid="input-task-actualHours" />
          </div>
          <div className="col-span-2">
            <Label>{isRtl ? "الوصف" : "Description"}</Label>
            <Textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} data-testid="input-task-description" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>{isRtl ? "إلغاء" : "Cancel"}</Button>
          <Button onClick={submit} disabled={saving} data-testid="button-submit-task">
            {saving ? (isRtl ? "جارٍ الحفظ..." : "Saving...") : (isRtl ? "حفظ" : "Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function StageDialog({
  open, onOpenChange, users, initial, onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  users: SimpleUser[];
  initial?: ApiStage;
  onSubmit: (data: Partial<ApiStage>) => Promise<void>;
}) {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    titleAr: initial?.titleAr || "",
    titleEn: initial?.titleEn || "",
    descriptionAr: initial?.descriptionAr || "",
    assignedTo: initial?.assignedTo || "",
    expectedStart: initial?.expectedStart || "",
    expectedEnd: initial?.expectedEnd || "",
    actualStart: initial?.actualStart || "",
    actualEnd: initial?.actualEnd || "",
    status: initial?.status || "pending",
    progress: initial?.progress ?? 0,
    notes: initial?.notes || "",
  });
  useEffect(() => {
    if (open && initial) {
      setForm({
        titleAr: initial.titleAr || "", titleEn: initial.titleEn || "",
        descriptionAr: initial.descriptionAr || "",
        assignedTo: initial.assignedTo || "",
        expectedStart: initial.expectedStart || "",
        expectedEnd: initial.expectedEnd || "",
        actualStart: initial.actualStart || "",
        actualEnd: initial.actualEnd || "",
        status: initial.status || "pending",
        progress: initial.progress ?? 0,
        notes: initial.notes || "",
      });
    }
  }, [open, initial]);

  const submit = async () => {
    if (!form.titleAr && !form.titleEn) {
      toast({ title: isRtl ? "العنوان مطلوب" : "Title is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        titleAr: form.titleAr || form.titleEn,
        titleEn: form.titleEn || form.titleAr,
        descriptionAr: form.descriptionAr || null,
        assignedTo: form.assignedTo || null,
        expectedStart: form.expectedStart || null,
        expectedEnd: form.expectedEnd || null,
        actualStart: form.actualStart || null,
        actualEnd: form.actualEnd || null,
        status: form.status as StageStatus,
        progress: form.progress,
        notes: form.notes || null,
      });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: isRtl ? "خطأ" : "Error", description: err?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{initial ? (isRtl ? "تعديل المرحلة" : "Edit stage") : (isRtl ? "مرحلة جديدة" : "New stage")}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>{isRtl ? "العنوان (عربي)" : "Title (Arabic)"} *</Label>
            <Input value={form.titleAr} onChange={e => setForm({ ...form, titleAr: e.target.value })} data-testid="input-stage-titleAr" />
          </div>
          <div className="col-span-2">
            <Label>{isRtl ? "العنوان (إنجليزي)" : "Title (English)"}</Label>
            <Input value={form.titleEn} onChange={e => setForm({ ...form, titleEn: e.target.value })} data-testid="input-stage-titleEn" />
          </div>
          <div>
            <Label>{isRtl ? "المسؤول" : "Assignee"}</Label>
            <Select value={form.assignedTo || "__none__"} onValueChange={(v) => setForm({ ...form, assignedTo: v === "__none__" ? "" : v })}>
              <SelectTrigger data-testid="select-stage-dialog-assignee"><SelectValue placeholder={isRtl ? "اختر" : "Pick"} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{isRtl ? "بدون" : "None"}</SelectItem>
                {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.id}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{isRtl ? "الحالة" : "Status"}</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as StageStatus })}>
              <SelectTrigger data-testid="select-stage-dialog-status"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.keys(STAGE_STATUS_LABELS_AR).map(k => (
                  <SelectItem key={k} value={k}>{isRtl ? STAGE_STATUS_LABELS_AR[k] : STAGE_STATUS_LABELS_EN[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{isRtl ? "بدء متوقع" : "Expected start"}</Label>
            <Input type="date" value={form.expectedStart} onChange={e => setForm({ ...form, expectedStart: e.target.value })} data-testid="input-stage-expectedStart" />
          </div>
          <div>
            <Label>{isRtl ? "انتهاء متوقع" : "Expected end"}</Label>
            <Input type="date" value={form.expectedEnd} onChange={e => setForm({ ...form, expectedEnd: e.target.value })} data-testid="input-stage-expectedEnd" />
          </div>
          <div>
            <Label>{isRtl ? "بدء فعلي" : "Actual start"}</Label>
            <Input type="date" value={form.actualStart} onChange={e => setForm({ ...form, actualStart: e.target.value })} data-testid="input-stage-actualStart" />
          </div>
          <div>
            <Label>{isRtl ? "انتهاء فعلي" : "Actual end"}</Label>
            <Input type="date" value={form.actualEnd} onChange={e => setForm({ ...form, actualEnd: e.target.value })} data-testid="input-stage-actualEnd" />
          </div>
          <div className="col-span-2">
            <Label>{isRtl ? "نسبة الإنجاز" : "Progress"}: {form.progress}%</Label>
            <input type="range" min={0} max={100} step={5} value={form.progress}
              onChange={e => setForm({ ...form, progress: Number(e.target.value) })}
              className="w-full" data-testid="input-stage-dialog-progress" />
          </div>
          <div className="col-span-2">
            <Label>{isRtl ? "ملاحظات" : "Notes"}</Label>
            <Textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} data-testid="input-stage-notes" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>{isRtl ? "إلغاء" : "Cancel"}</Button>
          <Button onClick={submit} disabled={saving} data-testid="button-submit-stage">{saving ? (isRtl ? "جارٍ الحفظ..." : "Saving...") : (isRtl ? "حفظ" : "Save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
