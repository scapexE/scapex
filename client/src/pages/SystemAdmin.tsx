import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Settings2, Plus, Pencil, Trash2, Shield, Users, Layers,
  HardHat, Leaf, ShieldAlert, Flame, Building2, RefreshCcw,
  Globe, LayoutGrid, CheckSquare, UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type BusinessActivity, type ActivityColor,
  ACTIVITY_COLOR_MAP, DEFAULT_ACTIVITIES,
} from "@/lib/activities";
import { useBusinessActivity } from "@/contexts/BusinessActivityContext";
import { ALL_MODULES, ROLE_LABELS, getUsers, type SystemUser } from "@/lib/permissions";
import { useToast } from "@/hooks/use-toast";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const MODULE_CATEGORIES: Record<string, string> = {
  core:        "النظام الأساسي",
  business:    "الأعمال والمالية",
  operations:  "العمليات",
  engineering: "الهندسة",
  hr:          "الموارد البشرية",
  system:      "النظام",
};

const ICON_OPTIONS = [
  { key: "HardHat",   Icon: HardHat,   ar: "خوذة هندسية" },
  { key: "Leaf",      Icon: Leaf,      ar: "ورقة" },
  { key: "ShieldAlert", Icon: ShieldAlert, ar: "درع تحذير" },
  { key: "Flame",     Icon: Flame,     ar: "لهب" },
  { key: "Building2", Icon: Building2, ar: "مبنى" },
  { key: "RefreshCcw", Icon: RefreshCcw, ar: "إعادة تدوير" },
  { key: "Globe",     Icon: Globe,     ar: "كرة أرضية" },
  { key: "Layers",    Icon: Layers,    ar: "طبقات" },
];
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = Object.fromEntries(
  ICON_OPTIONS.map(({ key, Icon }) => [key, Icon])
);
function ActivityIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name] ?? Globe;
  return <Icon className={className} />;
}

const COLOR_OPTIONS: ActivityColor[] = ["blue", "emerald", "amber", "violet", "cyan", "rose", "orange", "teal"];
const COLOR_LABELS: Record<ActivityColor, string> = {
  blue: "أزرق", emerald: "زمردي", amber: "عنبري", violet: "بنفسجي",
  cyan: "سماوي", rose: "وردي", orange: "برتقالي", teal: "فيروزي",
};

function generateId() {
  return `act_${Date.now().toString(36)}`;
}

const emptyActivity = (): Partial<BusinessActivity> => ({
  nameAr: "", nameEn: "", color: "blue", icon: "HardHat", active: true, modules: ["dashboard"],
});

const groupedModules = ALL_MODULES.reduce<Record<string, typeof ALL_MODULES>>((acc, m) => {
  if (!acc[m.category]) acc[m.category] = [];
  acc[m.category].push(m); return acc;
}, {});

// ─── Activity Form ────────────────────────────────────────────────────────────
function ActivityForm({
  form, setForm,
}: { form: Partial<BusinessActivity>; setForm: (f: Partial<BusinessActivity>) => void }) {
  const toggleModule = (id: string) => {
    const current = form.modules || [];
    setForm({
      ...form,
      modules: current.includes(id) ? current.filter((m) => m !== id) : [...current, id],
    });
  };
  const selectAll = () => setForm({ ...form, modules: ALL_MODULES.map((m) => m.id) });
  const clearAll  = () => setForm({ ...form, modules: ["dashboard"] });

  return (
    <div className="space-y-5" dir="rtl">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>اسم النشاط (عربي) *</Label>
          <Input placeholder="استشارات هندسية" value={form.nameAr || ""}
            onChange={(e) => setForm({ ...form, nameAr: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Activity Name (EN) *</Label>
          <Input placeholder="Engineering Consultancy" value={form.nameEn || ""}
            onChange={(e) => setForm({ ...form, nameEn: e.target.value })} />
        </div>
      </div>

      {/* Color */}
      <div className="space-y-2">
        <Label>اللون</Label>
        <div className="flex flex-wrap gap-2">
          {COLOR_OPTIONS.map((c) => {
            const cl = ACTIVITY_COLOR_MAP[c];
            return (
              <button key={c} onClick={() => setForm({ ...form, color: c })}
                className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 text-xs font-medium transition-all",
                  form.color === c ? `${cl.border} ${cl.bg} ${cl.text}` : "border-border/50 text-muted-foreground hover:bg-secondary/50")}>
                <span className={cn("w-2.5 h-2.5 rounded-full", cl.dot)} />{COLOR_LABELS[c]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Icon */}
      <div className="space-y-2">
        <Label>الأيقونة</Label>
        <div className="flex flex-wrap gap-2">
          {ICON_OPTIONS.map(({ key, Icon, ar }) => (
            <button key={key} onClick={() => setForm({ ...form, icon: key })}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 text-xs transition-all",
                form.icon === key ? "border-primary bg-primary/10 text-primary" : "border-border/50 text-muted-foreground hover:bg-secondary/50")}>
              <Icon className="w-3.5 h-3.5" />{ar}
            </button>
          ))}
        </div>
      </div>

      {/* Modules */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>الوحدات المفعّلة لهذا النشاط</Label>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={selectAll}>تحديد الكل</Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={clearAll}>إلغاء الكل</Button>
          </div>
        </div>
        <div className="border rounded-xl overflow-hidden max-h-72 overflow-y-auto">
          {Object.entries(groupedModules).map(([cat, mods], idx) => (
            <div key={cat} className={cn("p-3", idx > 0 && "border-t border-border/50")}>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {MODULE_CATEGORIES[cat]}
              </h4>
              <div className="grid grid-cols-2 gap-1.5">
                {mods.map((mod) => {
                  const checked = (form.modules || []).includes(mod.id);
                  return (
                    <div key={mod.id} onClick={() => toggleModule(mod.id)}
                      className={cn("flex items-center gap-2 px-2.5 py-2 rounded-lg border cursor-pointer text-xs transition-colors",
                        checked ? "bg-primary/5 border-primary/30 font-medium" : "border-border/40 text-muted-foreground hover:bg-secondary/30")}>
                      <Checkbox checked={checked} onCheckedChange={() => toggleModule(mod.id)} className="pointer-events-none h-3.5 w-3.5" />
                      {mod.labelAr}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {(form.modules || []).length} وحدة من أصل {ALL_MODULES.length}
        </p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SystemAdmin() {
  const { toast } = useToast();
  const currentUser: SystemUser | null = JSON.parse(localStorage.getItem("user") || "null");

  if (currentUser?.role !== "admin") {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-2">
            <Shield className="w-12 h-12 mx-auto text-destructive/50" />
            <p className="text-lg font-semibold">لا تملك صلاحية الوصول</p>
            <p className="text-sm text-muted-foreground">هذه الصفحة خاصة بمدير النظام فقط</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  const { activities, setActivities, assignments, setAssignments, getActivityUserIds } = useBusinessActivity();
  const allUsers = getUsers().filter((u) => u.active && !u.pendingApproval);

  const [addOpen, setAddOpen]     = useState(false);
  const [editActivity, setEditActivity] = useState<BusinessActivity | null>(null);
  const [deleteActivity, setDeleteActivity] = useState<BusinessActivity | null>(null);
  const [form, setForm]           = useState<Partial<BusinessActivity>>(emptyActivity());
  const [assignOpen, setAssignOpen] = useState<BusinessActivity | null>(null);

  // ── Activities CRUD ────────────────────────────────────────────────────────
  const handleAdd = () => {
    if (!form.nameAr || !form.nameEn) {
      toast({ title: "خطأ", description: "اسم النشاط مطلوب", variant: "destructive" }); return;
    }
    const a: BusinessActivity = {
      id: generateId(), nameAr: form.nameAr!, nameEn: form.nameEn!,
      color: form.color as ActivityColor ?? "blue", icon: form.icon ?? "HardHat",
      modules: form.modules ?? ["dashboard"], active: form.active ?? true,
      createdAt: new Date().toISOString(),
    };
    setActivities([...activities, a]); setAddOpen(false); setForm(emptyActivity());
    toast({ title: "تم بنجاح", description: `تمت إضافة "${a.nameAr}"` });
  };

  const handleEdit = () => {
    if (!editActivity || !form.nameAr || !form.nameEn) {
      toast({ title: "خطأ", description: "اسم النشاط مطلوب", variant: "destructive" }); return;
    }
    setActivities(activities.map((a) =>
      a.id === editActivity.id
        ? { ...a, nameAr: form.nameAr!, nameEn: form.nameEn!, color: form.color as ActivityColor ?? a.color, icon: form.icon ?? a.icon, modules: form.modules ?? a.modules, active: form.active ?? a.active }
        : a
    ));
    setEditActivity(null); setForm(emptyActivity());
    toast({ title: "تم بنجاح", description: "تم تحديث النشاط" });
  };

  const handleDelete = () => {
    if (!deleteActivity) return;
    setActivities(activities.filter((a) => a.id !== deleteActivity.id));
    setDeleteActivity(null);
    toast({ title: "تم الحذف", variant: "destructive" });
  };

  const handleToggleActive = (activity: BusinessActivity) => {
    setActivities(activities.map((a) => a.id === activity.id ? { ...a, active: !a.active } : a));
  };

  const openEdit = (a: BusinessActivity) => {
    setForm({ nameAr: a.nameAr, nameEn: a.nameEn, color: a.color, icon: a.icon, modules: [...a.modules], active: a.active });
    setEditActivity(a);
  };

  // ── User Assignment ────────────────────────────────────────────────────────
  const toggleUserAssignment = (activityId: string, userId: string) => {
    const existing = assignments.find((a) => a.activityId === activityId);
    if (existing) {
      const newIds = existing.userIds.includes(userId)
        ? existing.userIds.filter((id) => id !== userId)
        : [...existing.userIds, userId];
      setAssignments(assignments.map((a) => a.activityId === activityId ? { ...a, userIds: newIds } : a));
    } else {
      setAssignments([...assignments, { activityId, userIds: [userId] }]);
    }
  };

  const isUserAssigned = (activityId: string, userId: string) => {
    return assignments.find((a) => a.activityId === activityId)?.userIds.includes(userId) ?? false;
  };

  return (
    <MainLayout>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Settings2 className="w-6 h-6 text-primary" />
              لوحة تحكم النظام
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              إدارة أنشطة الشركة وتخصيص الوحدات والمستخدمين لكل نشاط
            </p>
          </div>
          <Badge variant="outline" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-transparent gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            مدير النظام
          </Badge>
        </div>

        <Tabs defaultValue="activities" dir="rtl">
          <TabsList className="grid grid-cols-2 w-full max-w-md">
            <TabsTrigger value="activities" className="gap-2">
              <Layers className="w-4 h-4" /> الأنشطة التجارية
            </TabsTrigger>
            <TabsTrigger value="assignments" className="gap-2">
              <UserCheck className="w-4 h-4" /> تخصيص المستخدمين
            </TabsTrigger>
          </TabsList>

          {/* ── Tab 1: Activities ─────────────────────────────────────────────── */}
          <TabsContent value="activities" className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{activities.length} نشاط مُعرَّف</p>
              <Button data-testid="button-add-activity" onClick={() => { setForm(emptyActivity()); setAddOpen(true); }}
                className="gap-2 bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4" /> إضافة نشاط
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {activities.map((act) => {
                const c = ACTIVITY_COLOR_MAP[act.color];
                const assignedCount = getActivityUserIds(act.id).length;
                return (
                  <Card key={act.id} data-testid={`activity-card-${act.id}`}
                    className={cn("border-2 transition-all", act.active ? c.border : "border-border/40 opacity-60")}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", c.badge)}>
                          <ActivityIcon name={act.icon} className={cn("w-6 h-6", c.text)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-bold text-sm">{act.nameAr}</h3>
                              <p className="text-xs text-muted-foreground">{act.nameEn}</p>
                            </div>
                            <Switch checked={act.active} onCheckedChange={() => handleToggleActive(act)} />
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <Badge variant="outline" className={cn("border-transparent text-xs", c.badge, c.text)}>
                              {act.modules.length} وحدة
                            </Badge>
                            <Badge variant="outline" className="border-transparent text-xs bg-secondary text-muted-foreground">
                              <Users className="w-3 h-3 mr-1" />
                              {assignedCount} مستخدم
                            </Badge>
                          </div>

                          {/* Module preview tags */}
                          <div className="flex flex-wrap gap-1 mt-2">
                            {act.modules.slice(0, 5).map((mid) => {
                              const mod = ALL_MODULES.find((m) => m.id === mid);
                              return mod ? (
                                <span key={mid} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                                  {mod.labelAr}
                                </span>
                              ) : null;
                            })}
                            {act.modules.length > 5 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                                +{act.modules.length - 5}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
                        <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs h-8"
                          onClick={() => openEdit(act)} data-testid={`button-edit-activity-${act.id}`}>
                          <Pencil className="w-3.5 h-3.5" /> تعديل الوحدات
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1 text-xs h-8 text-destructive border-destructive/30 hover:bg-destructive/10"
                          onClick={() => setDeleteActivity(act)} data-testid={`button-delete-activity-${act.id}`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* ── Tab 2: User Assignments ───────────────────────────────────────── */}
          <TabsContent value="assignments" className="mt-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              حدّد المستخدمين المسموح لهم بالوصول لكل نشاط. المدير العام يرى جميع الأنشطة تلقائياً.
            </p>

            <div className="grid gap-4">
              {activities.filter((a) => a.active).map((act) => {
                const c = ACTIVITY_COLOR_MAP[act.color];
                const assignedIds = getActivityUserIds(act.id);
                return (
                  <Card key={act.id} className={cn("border", c.border)}>
                    <CardHeader className={cn("pb-2 pt-4 px-4 rounded-t-xl", c.bg)}>
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", c.badge)}>
                          <ActivityIcon name={act.icon} className={cn("w-4 h-4", c.text)} />
                        </div>
                        <span className={c.text}>{act.nameAr}</span>
                        <Badge variant="outline" className={cn("border-transparent text-xs ms-auto", c.badge, c.text)}>
                          {assignedIds.length} مستخدم
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-3">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {allUsers.map((user) => {
                          const assigned = isUserAssigned(act.id, user.id);
                          return (
                            <div key={user.id}
                              onClick={() => toggleUserAssignment(act.id, user.id)}
                              data-testid={`assign-${act.id}-${user.id}`}
                              className={cn(
                                "flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all text-xs",
                                assigned ? `border-current ${c.bg} ${c.text} font-medium` : "border-border/50 text-muted-foreground hover:bg-secondary/30"
                              )}>
                              <Checkbox checked={assigned} onCheckedChange={() => toggleUserAssignment(act.id, user.id)} className="pointer-events-none h-3.5 w-3.5" />
                              <div className="min-w-0">
                                <p className="truncate font-medium">{user.name}</p>
                                <p className="truncate opacity-70">{ROLE_LABELS[user.role].ar}</p>
                              </div>
                            </div>
                          );
                        })}
                        {allUsers.length === 0 && (
                          <p className="text-xs text-muted-foreground col-span-3 py-2">لا يوجد مستخدمون نشطون</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" /> إضافة نشاط تجاري جديد
            </DialogTitle>
          </DialogHeader>
          <ActivityForm form={form} setForm={setForm} />
          <DialogFooter className="flex-row-reverse gap-2">
            <Button onClick={handleAdd} data-testid="button-confirm-add-activity">حفظ النشاط</Button>
            <Button variant="outline" onClick={() => setAddOpen(false)}>إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editActivity} onOpenChange={(o) => !o && setEditActivity(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" /> تعديل: {editActivity?.nameAr}
            </DialogTitle>
          </DialogHeader>
          <ActivityForm form={form} setForm={setForm} />
          <DialogFooter className="flex-row-reverse gap-2">
            <Button onClick={handleEdit} data-testid="button-confirm-edit-activity">حفظ التعديلات</Button>
            <Button variant="outline" onClick={() => setEditActivity(null)}>إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteActivity} onOpenChange={(o) => !o && setDeleteActivity(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              هل أنت متأكد من حذف نشاط <strong>{deleteActivity?.nameAr}</strong>؟ سيتم إزالة جميع التخصيصات المرتبطة به.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">حذف</AlertDialogAction>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
