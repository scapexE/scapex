import { useState, useRef } from "react";
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
  Settings2, Plus, Pencil, Trash2, Shield, Users, Layers,
  HardHat, Leaf, ShieldAlert, Flame, Building2, RefreshCcw,
  Globe, Image, Upload, X, UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type BusinessActivity, type ActivityColor,
  ACTIVITY_COLOR_MAP,
} from "@/lib/activities";
import { useBusinessActivity } from "@/contexts/BusinessActivityContext";
import { useSettings } from "@/contexts/SettingsContext";
import { ALL_MODULES, ROLE_LABELS, getUsers, type SystemUser } from "@/lib/permissions";
import { readFileAsDataUrl } from "@/lib/settings";
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
  { key: "HardHat",    Icon: HardHat,    ar: "خوذة هندسية" },
  { key: "Leaf",       Icon: Leaf,       ar: "ورقة" },
  { key: "ShieldAlert",Icon: ShieldAlert,ar: "درع تحذير" },
  { key: "Flame",      Icon: Flame,      ar: "لهب" },
  { key: "Building2",  Icon: Building2,  ar: "مبنى" },
  { key: "RefreshCcw", Icon: RefreshCcw, ar: "إعادة تدوير" },
  { key: "Globe",      Icon: Globe,      ar: "كرة أرضية" },
  { key: "Layers",     Icon: Layers,     ar: "طبقات" },
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

function generateId() { return `act_${Date.now().toString(36)}`; }
const emptyActivity = (): Partial<BusinessActivity> => ({
  nameAr: "", nameEn: "", color: "blue", icon: "HardHat", active: true, modules: ["dashboard"],
});

const groupedModules = ALL_MODULES.reduce<Record<string, typeof ALL_MODULES>>((acc, m) => {
  if (!acc[m.category]) acc[m.category] = [];
  acc[m.category].push(m); return acc;
}, {});

// ─── Activity Form ────────────────────────────────────────────────────────────
function ActivityForm({ form, setForm }: {
  form: Partial<BusinessActivity>; setForm: (f: Partial<BusinessActivity>) => void;
}) {
  const toggleModule = (id: string) => {
    const current = form.modules || [];
    setForm({ ...form, modules: current.includes(id) ? current.filter((m) => m !== id) : [...current, id] });
  };

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

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>الوحدات المفعّلة</Label>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-7 text-xs"
              onClick={() => setForm({ ...form, modules: ALL_MODULES.map((m) => m.id) })}>تحديد الكل</Button>
            <Button size="sm" variant="outline" className="h-7 text-xs"
              onClick={() => setForm({ ...form, modules: ["dashboard"] })}>إلغاء الكل</Button>
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
        <p className="text-xs text-muted-foreground">{(form.modules || []).length} وحدة من {ALL_MODULES.length}</p>
      </div>
    </div>
  );
}

// ─── Logo & Settings Tab ──────────────────────────────────────────────────────
function LogoSettingsTab() {
  const { settings, updateSettings } = useSettings();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(settings.companyLogoUrl);
  const [companyName, setCompanyName] = useState(settings.companyName);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "الملف كبير جداً", description: "يجب أن لا يتجاوز حجم الصورة 2 ميغابايت", variant: "destructive" });
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setPreview(dataUrl);
    } catch {
      toast({ title: "خطأ", description: "تعذّر قراءة الملف", variant: "destructive" });
    }
  };

  const handleSave = () => {
    updateSettings({ companyLogoUrl: preview, companyName });
    toast({ title: "تم الحفظ", description: "تم تحديث إعدادات الشركة بنجاح" });
  };

  const handleRemoveLogo = () => {
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-6 max-w-lg" dir="rtl">
      {/* Company Name */}
      <Card className="border-border/50">
        <CardContent className="p-5 space-y-3">
          <Label className="text-sm font-semibold">اسم الشركة</Label>
          <Input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Scapex"
            data-testid="input-company-name"
          />
          <p className="text-xs text-muted-foreground">يظهر في الشريط الجانبي عند عدم وجود لوقو</p>
        </CardContent>
      </Card>

      {/* Logo Upload */}
      <Card className="border-border/50">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Image className="w-4 h-4 text-primary" />
            <Label className="text-sm font-semibold">لوقو الشركة</Label>
          </div>

          {/* Preview */}
          {preview ? (
            <div className="relative inline-block">
              <div className="p-3 border-2 border-dashed border-border/60 rounded-xl bg-secondary/20">
                <img src={preview} alt="Logo preview" className="h-16 max-w-[200px] object-contain" />
              </div>
              <button
                onClick={handleRemoveLogo}
                className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-destructive text-white flex items-center justify-center shadow hover:bg-destructive/80 transition-colors"
                data-testid="button-remove-logo"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border/60 rounded-xl p-8 text-center cursor-pointer hover:bg-secondary/20 transition-colors"
              data-testid="logo-upload-area"
            >
              <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium text-muted-foreground">انقر لرفع الصورة</p>
              <p className="text-xs text-muted-foreground/60 mt-1">PNG، JPG، SVG · بحد أقصى 2MB</p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
            className="hidden"
            onChange={handleFileChange}
            data-testid="input-logo-file"
          />

          {!preview && (
            <Button variant="outline" size="sm" className="w-full gap-2"
              onClick={() => fileInputRef.current?.click()}
              data-testid="button-upload-logo">
              <Upload className="w-4 h-4" /> اختيار ملف
            </Button>
          )}

          <p className="text-xs text-muted-foreground">
            يظهر اللوقو في: القائمة الجانبية · شريط الهيدر بجانب اللغة والثيم
          </p>
        </CardContent>
      </Card>

      {/* Preview in context */}
      {preview && (
        <Card className="border-border/50">
          <CardContent className="p-4 space-y-3">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">معاينة</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-sidebar border border-border/50">
                <img src={preview} alt="sidebar preview" className="h-8 max-w-[140px] object-contain" />
                <span className="text-xs text-muted-foreground">← القائمة الجانبية</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-card border border-border/50">
                <div className="flex-1 h-2 bg-secondary/80 rounded" />
                <img src={preview} alt="header preview" className="h-7 max-w-[100px] object-contain" />
                <div className="flex gap-1">
                  <div className="w-6 h-6 rounded bg-secondary/80" />
                  <div className="w-6 h-6 rounded bg-secondary/80" />
                </div>
                <span className="text-xs text-muted-foreground">← الهيدر</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Button onClick={handleSave} className="w-full gap-2" data-testid="button-save-settings">
        حفظ الإعدادات
      </Button>
    </div>
  );
}

// ─── Inner Content (uses context hooks safely) ────────────────────────────────
function SystemAdminContent() {
  const { toast } = useToast();
  const { activities, setActivities, assignments, setAssignments, getActivityUserIds } = useBusinessActivity();
  const allUsers = getUsers().filter((u) => u.active && !u.pendingApproval);

  const [addOpen, setAddOpen] = useState(false);
  const [editActivity, setEditActivity] = useState<BusinessActivity | null>(null);
  const [deleteActivity, setDeleteActivity] = useState<BusinessActivity | null>(null);
  const [form, setForm] = useState<Partial<BusinessActivity>>(emptyActivity());

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

  const isUserAssigned = (activityId: string, userId: string) =>
    assignments.find((a) => a.activityId === activityId)?.userIds.includes(userId) ?? false;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Settings2 className="w-6 h-6 text-primary" />
            لوحة تحكم النظام
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            إدارة أنشطة الشركة، اللوقو، وتخصيص الوحدات والمستخدمين
          </p>
        </div>
        <Badge variant="outline" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-transparent gap-1.5 shrink-0">
          <Shield className="w-3.5 h-3.5" />
          مدير النظام
        </Badge>
      </div>

      <Tabs defaultValue="activities" dir="rtl">
        <TabsList className="grid grid-cols-3 w-full max-w-lg">
          <TabsTrigger value="activities" className="gap-2 text-xs sm:text-sm">
            <Layers className="w-4 h-4" /> الأنشطة
          </TabsTrigger>
          <TabsTrigger value="assignments" className="gap-2 text-xs sm:text-sm">
            <UserCheck className="w-4 h-4" /> المستخدمون
          </TabsTrigger>
          <TabsTrigger value="branding" className="gap-2 text-xs sm:text-sm">
            <Image className="w-4 h-4" /> الهوية
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Activities ─────────────────────────────────────────── */}
        <TabsContent value="activities" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{activities.length} نشاط مُعرَّف</p>
            <Button onClick={() => { setForm(emptyActivity()); setAddOpen(true); }}
              className="gap-2 bg-primary hover:bg-primary/90" data-testid="button-add-activity">
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
                            <Users className="w-3 h-3 mr-1" />{assignedCount} مستخدم
                          </Badge>
                        </div>
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
                        <Pencil className="w-3.5 h-3.5" /> تعديل
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

        {/* ── Tab 2: User Assignments ───────────────────────────────────── */}
        <TabsContent value="assignments" className="mt-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            حدّد المستخدمين المسموح لهم بالوصول لكل نشاط. مدير النظام يرى جميع الأنشطة تلقائياً.
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

        {/* ── Tab 3: Branding / Logo ────────────────────────────────────── */}
        <TabsContent value="branding" className="mt-6">
          <LogoSettingsTab />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" /> إضافة نشاط جديد
            </DialogTitle>
          </DialogHeader>
          <ActivityForm form={form} setForm={setForm} />
          <DialogFooter className="flex-row-reverse gap-2">
            <Button onClick={handleAdd} data-testid="button-confirm-add-activity">حفظ النشاط</Button>
            <Button variant="outline" onClick={() => setAddOpen(false)}>إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      <AlertDialog open={!!deleteActivity} onOpenChange={(o) => !o && setDeleteActivity(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              هل أنت متأكد من حذف <strong>{deleteActivity?.nameAr}</strong>؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">حذف</AlertDialogAction>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Page Shell (access guard only — no context hooks here) ──────────────────
export default function SystemAdmin() {
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

  return (
    <MainLayout>
      <SystemAdminContent />
    </MainLayout>
  );
}
