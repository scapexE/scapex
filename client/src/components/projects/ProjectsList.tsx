import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { useActivityScope, ActivityRequiredAlert } from "@/hooks/useActivityScope";
import { Search, Filter, MapPin, Building, Clock, AlertTriangle, Plus, ArrowRight } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  listProjects, createProject, type ApiProject, type ProjectStatus,
  PROJECT_STATUS_LABELS_AR, PROJECT_STATUS_LABELS_EN, DEFAULT_PROJECT_STAGES,
  createStage,
} from "@/lib/projectsApi";
import { scopedFetch } from "@/lib/queryClient";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  planning: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  delayed: "bg-destructive/10 text-destructive dark:bg-destructive/20",
  on_hold: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  completed: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

interface SimpleCustomer { id: number; nameAr?: string | null; nameEn?: string | null; }
interface SimpleUser { id: string; name?: string | null; firstName?: string | null; lastName?: string | null; }

export function ProjectsList() {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { activeActivity, isPrivileged, canQuery } = useActivityScope();

  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [customers, setCustomers] = useState<SimpleCustomer[]>([]);
  const [users, setUsers] = useState<SimpleUser[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    if (!canQuery) { setProjects([]); return; }
    try {
      setLoading(true);
      const [p, c, u] = await Promise.all([
        listProjects(statusFilter === "all" ? undefined : { status: statusFilter }),
        scopedFetch(activeActivity?.id ? `/api/customers?activityId=${activeActivity.id}` : "/api/customers").then(r => r.ok ? r.json() : []),
        scopedFetch("/api/users").then(r => r.ok ? r.json() : []),
      ]);
      setProjects(p);
      setCustomers(Array.isArray(c) ? c : []);
      setUsers(Array.isArray(u) ? u : []);
    } catch (err) {
      console.error("Failed to load projects:", err);
      toast({ title: isRtl ? "تعذّر تحميل المشاريع" : "Failed to load projects", variant: "destructive" });
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [activeActivity?.id, isPrivileged, statusFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter(p => {
      if (clientFilter !== "all" && String(p.contactId ?? "") !== clientFilter) return false;
      if (assigneeFilter !== "all" && (p.managerId ?? "") !== assigneeFilter) return false;
      if (!q) return true;
      return (
        (p.nameAr || "").toLowerCase().includes(q) ||
        (p.nameEn || "").toLowerCase().includes(q) ||
        (p.clientName || "").toLowerCase().includes(q) ||
        (p.projectCode || "").toLowerCase().includes(q)
      );
    });
  }, [projects, search, clientFilter, assigneeFilter]);

  const activeCount = projects.filter(p => p.status === "active" || p.status === "planning").length;

  return (
    <Card className="flex-1 border-border/50 shadow-sm overflow-hidden flex flex-col h-full">
      <CardHeader className="p-4 border-b border-border/50 bg-card space-y-3">
        {!canQuery && <ActivityRequiredAlert blocking />}
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-36" data-testid="select-status-filter">
                <Filter className="h-4 w-4 mr-1 rtl:ml-1 rtl:mr-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRtl ? "كل الحالات" : "All statuses"}</SelectItem>
                {Object.keys(PROJECT_STATUS_LABELS_AR).map(s => (
                  <SelectItem key={s} value={s}>
                    {isRtl ? PROJECT_STATUS_LABELS_AR[s] : PROJECT_STATUS_LABELS_EN[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="h-9 w-44" data-testid="select-client-filter">
                <SelectValue placeholder={isRtl ? "العميل" : "Client"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRtl ? "كل العملاء" : "All clients"}</SelectItem>
                {customers.map(c => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {isRtl ? (c.nameAr || c.nameEn || `#${c.id}`) : (c.nameEn || c.nameAr || `#${c.id}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
              <SelectTrigger className="h-9 w-44" data-testid="select-assignee-filter">
                <SelectValue placeholder={isRtl ? "الموظف المسؤول" : "Manager"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRtl ? "كل الموظفين" : "All managers"}</SelectItem>
                {users.map(u => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-muted-foreground font-medium">
              {activeCount} {isRtl ? "مشروع نشط" : "Active Projects"}
            </div>
            <CreateProjectDialog
              open={showCreate}
              onOpenChange={setShowCreate}
              customers={customers}
              users={users}
              activityId={activeActivity?.id || null}
              isPrivileged={isPrivileged}
              onCreated={(p) => { setProjects(prev => [p, ...prev]); navigate(`/projects/${p.id}`); }}
              triggerLabel={isRtl ? "مشروع جديد" : "New project"}
            />
          </div>
        </div>
      </CardHeader>

      <div className="overflow-auto flex-1 bg-card">
        <Table>
          <TableHeader className="bg-secondary/50 sticky top-0 z-10">
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className={isRtl ? 'text-right' : 'text-left'}>{isRtl ? "المشروع" : "Project"}</TableHead>
              <TableHead className={isRtl ? 'text-right' : 'text-left'}>{isRtl ? "العميل والموقع" : "Client & Location"}</TableHead>
              <TableHead className={isRtl ? 'text-right' : 'text-left'}>{isRtl ? "التقدم" : "Progress"}</TableHead>
              <TableHead className={isRtl ? 'text-right' : 'text-left'}>{isRtl ? "الحالة" : "Status"}</TableHead>
              <TableHead className={isRtl ? 'text-left' : 'text-right'}>{isRtl ? "إجراءات" : "Actions"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">{isRtl ? "جارِ التحميل..." : "Loading..."}</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-16 text-muted-foreground">
                  {isRtl ? "لا توجد مشاريع. ابدأ بإضافة مشروع جديد." : "No projects yet. Add a new project to get started."}
                </TableCell>
              </TableRow>
            ) : filtered.map(p => (
              <TableRow
                key={p.id}
                data-testid={`row-project-${p.id}`}
                className="border-border/50 hover:bg-muted/30 transition-colors group cursor-pointer"
                onClick={() => navigate(`/projects/${p.id}`)}
              >
                <TableCell className={isRtl ? 'text-right' : 'text-left'}>
                  <div>
                    <div className="font-semibold text-foreground">{isRtl ? (p.nameAr || p.nameEn) : (p.nameEn || p.nameAr)}</div>
                    {p.projectCode && <div className="text-xs text-muted-foreground mt-0.5 font-mono">{p.projectCode}</div>}
                  </div>
                </TableCell>
                <TableCell className={isRtl ? 'text-right' : 'text-left'}>
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <Building className="w-3.5 h-3.5 text-muted-foreground" />
                    {p.clientName || (isRtl ? "—" : "—")}
                  </div>
                  {p.location && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                      <MapPin className="w-3.5 h-3.5" />{p.location}
                    </div>
                  )}
                </TableCell>
                <TableCell className={isRtl ? 'text-right' : 'text-left'}>
                  <div className="flex flex-col gap-1.5 w-32">
                    <div className="flex items-center justify-between text-xs">
                      <span>{p.progress ?? 0}%</span>
                      {p.endDate && (
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {new Date(p.endDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <Progress
                      value={p.progress ?? 0}
                      className={cn("h-1.5",
                        p.status === 'delayed' ? "[&>div]:bg-destructive" :
                        p.status === 'completed' ? "[&>div]:bg-emerald-500" : "")}
                    />
                  </div>
                </TableCell>
                <TableCell className={isRtl ? 'text-right' : 'text-left'}>
                  <Badge variant="outline" className={cn("font-normal border-transparent gap-1", STATUS_COLORS[p.status] ?? STATUS_COLORS.planning)}>
                    {p.status === 'delayed' && <AlertTriangle className="w-3 h-3" />}
                    {isRtl ? (PROJECT_STATUS_LABELS_AR[p.status] ?? p.status) : (PROJECT_STATUS_LABELS_EN[p.status] ?? p.status)}
                  </Badge>
                </TableCell>
                <TableCell className={isRtl ? 'text-left' : 'text-right'}>
                  <div className={cn("flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity", isRtl ? "justify-start" : "justify-end")}>
                    <Button variant="ghost" size="sm" data-testid={`button-open-project-${p.id}`}
                      onClick={(e) => { e.stopPropagation(); navigate(`/projects/${p.id}`); }}>
                      {isRtl ? "تفاصيل" : "Open"}
                      <ArrowRight className={cn("h-4 w-4", isRtl ? "rotate-180 mr-1" : "ml-1")} />
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

export function CreateProjectDialog({
  open, onOpenChange, customers, users, activityId, isPrivileged,
  defaultContactId, defaultClientName, onCreated, triggerLabel,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  customers: SimpleCustomer[];
  users: SimpleUser[];
  activityId: string | null;
  isPrivileged: boolean;
  defaultContactId?: number | null;
  defaultClientName?: string | null;
  onCreated: (p: ApiProject) => void;
  triggerLabel?: string;
}) {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nameAr: "", nameEn: "", description: "",
    contactId: defaultContactId ? String(defaultContactId) : "",
    clientName: defaultClientName || "",
    managerId: "", startDate: "", endDate: "", budget: "", location: "",
  });

  useEffect(() => {
    if (open) {
      setForm(f => ({
        ...f,
        contactId: defaultContactId ? String(defaultContactId) : f.contactId,
        clientName: defaultClientName || f.clientName,
      }));
    }
  }, [open, defaultContactId, defaultClientName]);

  const canCreate = !!activityId || isPrivileged;

  const handleCreate = async () => {
    if (!form.nameAr && !form.nameEn) {
      toast({ title: isRtl ? "العنوان مطلوب" : "Name is required", variant: "destructive" });
      return;
    }
    if (!form.contactId && !form.clientName) {
      toast({ title: isRtl ? "اختر عميلاً" : "Pick a customer", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const matched = customers.find(c => String(c.id) === form.contactId);
      const inferredClientName: string | null = form.clientName
        || (matched ? (isRtl ? (matched.nameAr || matched.nameEn || null) : (matched.nameEn || matched.nameAr || null)) : null);
      const payload: Partial<ApiProject> = {
        nameAr: form.nameAr || form.nameEn,
        nameEn: form.nameEn || form.nameAr,
        description: form.description || null,
        contactId: form.contactId ? Number(form.contactId) : null,
        clientName: inferredClientName,
        managerId: form.managerId || null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        budget: form.budget ? String(form.budget) : null,
        location: form.location || null,
        status: "planning" as ProjectStatus,
      };
      const created = await createProject(payload);
      // Seed default stages so users immediately see the lifecycle.
      try {
        await Promise.all(
          DEFAULT_PROJECT_STAGES.map((s, i) =>
            createStage(created.id, { titleAr: s.titleAr, titleEn: s.titleEn, sortOrder: i, status: "pending", progress: 0 })
          )
        );
      } catch (e) {
        console.warn("Could not seed default stages:", e);
      }
      toast({ title: isRtl ? "تم إنشاء المشروع" : "Project created" });
      onCreated(created);
      onOpenChange(false);
      setForm({ nameAr: "", nameEn: "", description: "", contactId: "", clientName: "", managerId: "", startDate: "", endDate: "", budget: "", location: "" });
    } catch (err: any) {
      console.error(err);
      toast({ title: isRtl ? "تعذّر إنشاء المشروع" : "Failed to create project", description: err?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-primary hover:bg-primary/90" disabled={!canCreate} data-testid="button-create-project">
          <Plus className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
          {triggerLabel || (isRtl ? "مشروع جديد" : "New project")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{isRtl ? "مشروع جديد" : "New project"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>{isRtl ? "العنوان (عربي)" : "Title (Arabic)"} *</Label>
            <Input data-testid="input-project-nameAr" value={form.nameAr} onChange={e => setForm({ ...form, nameAr: e.target.value })} />
          </div>
          <div className="col-span-2">
            <Label>{isRtl ? "العنوان (إنجليزي)" : "Title (English)"}</Label>
            <Input data-testid="input-project-nameEn" value={form.nameEn} onChange={e => setForm({ ...form, nameEn: e.target.value })} />
          </div>
          <div className="col-span-2">
            <Label>{isRtl ? "العميل" : "Customer"} *</Label>
            <Select value={form.contactId || "__manual__"} onValueChange={(v) => setForm({ ...form, contactId: v === "__manual__" ? "" : v })}>
              <SelectTrigger data-testid="select-project-customer"><SelectValue placeholder={isRtl ? "اختر عميلاً" : "Pick a customer"} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__manual__">{isRtl ? "كتابة اسم العميل يدوياً" : "Type client name manually"}</SelectItem>
                {customers.map(c => (
                  <SelectItem key={c.id} value={String(c.id)}>{isRtl ? (c.nameAr || c.nameEn || `#${c.id}`) : (c.nameEn || c.nameAr || `#${c.id}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!form.contactId && (
              <Input className="mt-2" placeholder={isRtl ? "اسم العميل" : "Client name"} value={form.clientName} onChange={e => setForm({ ...form, clientName: e.target.value })} data-testid="input-project-clientName" />
            )}
          </div>
          <div>
            <Label>{isRtl ? "المسؤول" : "Manager"}</Label>
            <Select value={form.managerId || "__none__"} onValueChange={(v) => setForm({ ...form, managerId: v === "__none__" ? "" : v })}>
              <SelectTrigger data-testid="select-project-manager"><SelectValue placeholder={isRtl ? "اختر" : "Pick"} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{isRtl ? "بدون" : "None"}</SelectItem>
                {users.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.id}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{isRtl ? "الميزانية" : "Budget"}</Label>
            <Input type="number" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} data-testid="input-project-budget" />
          </div>
          <div>
            <Label>{isRtl ? "تاريخ البدء" : "Start date"}</Label>
            <Input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} data-testid="input-project-startDate" />
          </div>
          <div>
            <Label>{isRtl ? "تاريخ الانتهاء" : "End date"}</Label>
            <Input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} data-testid="input-project-endDate" />
          </div>
          <div className="col-span-2">
            <Label>{isRtl ? "الموقع" : "Location"}</Label>
            <Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} data-testid="input-project-location" />
          </div>
          <div className="col-span-2">
            <Label>{isRtl ? "الوصف" : "Description"}</Label>
            <Textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} data-testid="input-project-description" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>{isRtl ? "إلغاء" : "Cancel"}</Button>
          <Button onClick={handleCreate} disabled={saving} data-testid="button-submit-project">
            {saving ? (isRtl ? "جارٍ الحفظ..." : "Saving...") : (isRtl ? "حفظ" : "Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
