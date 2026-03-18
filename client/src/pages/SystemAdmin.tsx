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
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Settings2, Plus, Pencil, Trash2, Shield, Users, Layers, Upload, X, UserCheck,
  ChevronDown, Check, Image,
  HardHat, Leaf, ShieldAlert, Flame, Building2, RefreshCcw, Globe,
  Factory, TreePine, Zap, Wind, Droplets, Mountain, Wrench, Cpu,
  FlaskConical, Anchor, Warehouse, Hammer, Recycle, Sprout, Fish,
  Cog, Home, Star, Package, Truck, Sun, Landmark, BrainCircuit,
  Microscope, Car, Ship, Train, Stethoscope, BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type BusinessActivity, type ActivityColor, ACTIVITY_COLOR_MAP,
} from "@/lib/activities";
import { useBusinessActivity } from "@/contexts/BusinessActivityContext";
import { ALL_MODULES, ROLE_LABELS, getUsers, type SystemUser } from "@/lib/permissions";
import { readFileAsDataUrl } from "@/lib/settings";
import { useToast } from "@/hooks/use-toast";

// ─── Constants ────────────────────────────────────────────────────────────────
const MODULE_CATEGORIES: Record<string, string> = {
  core: "النظام الأساسي", business: "الأعمال والمالية",
  operations: "العمليات", engineering: "الهندسة",
  hr: "الموارد البشرية", system: "النظام",
};

const ICON_OPTIONS: { key: string; Icon: React.ComponentType<{ className?: string }>; ar: string }[] = [
  { key: "HardHat",     Icon: HardHat,      ar: "خوذة" },
  { key: "Leaf",        Icon: Leaf,          ar: "ورقة" },
  { key: "ShieldAlert", Icon: ShieldAlert,   ar: "درع" },
  { key: "Flame",       Icon: Flame,         ar: "لهب" },
  { key: "Building2",   Icon: Building2,     ar: "مبنى" },
  { key: "RefreshCcw",  Icon: RefreshCcw,    ar: "تدوير" },
  { key: "Globe",       Icon: Globe,         ar: "كرة أرضية" },
  { key: "Layers",      Icon: Layers,        ar: "طبقات" },
  { key: "Factory",     Icon: Factory,       ar: "مصنع" },
  { key: "TreePine",    Icon: TreePine,      ar: "شجرة" },
  { key: "Zap",         Icon: Zap,           ar: "طاقة" },
  { key: "Wind",        Icon: Wind,          ar: "رياح" },
  { key: "Droplets",    Icon: Droplets,      ar: "مياه" },
  { key: "Mountain",    Icon: Mountain,      ar: "جبل" },
  { key: "Wrench",      Icon: Wrench,        ar: "مفتاح" },
  { key: "Cpu",         Icon: Cpu,           ar: "معالج" },
  { key: "FlaskConical",Icon: FlaskConical,  ar: "كيمياء" },
  { key: "Anchor",      Icon: Anchor,        ar: "مرساة" },
  { key: "Warehouse",   Icon: Warehouse,     ar: "مستودع" },
  { key: "Hammer",      Icon: Hammer,        ar: "مطرقة" },
  { key: "Recycle",     Icon: Recycle,       ar: "إعادة تدوير" },
  { key: "Sprout",      Icon: Sprout,        ar: "نبات" },
  { key: "Fish",        Icon: Fish,          ar: "سمكة" },
  { key: "Cog",         Icon: Cog,           ar: "تروس" },
  { key: "Home",        Icon: Home,          ar: "منزل" },
  { key: "Star",        Icon: Star,          ar: "نجمة" },
  { key: "Package",     Icon: Package,       ar: "طرد" },
  { key: "Truck",       Icon: Truck,         ar: "شاحنة" },
  { key: "Sun",         Icon: Sun,           ar: "شمس" },
  { key: "Landmark",    Icon: Landmark,      ar: "حكومي" },
  { key: "BrainCircuit",Icon: BrainCircuit,  ar: "ذكاء اصطناعي" },
  { key: "Microscope",  Icon: Microscope,    ar: "مجهر" },
  { key: "Car",         Icon: Car,           ar: "سيارة" },
  { key: "Ship",        Icon: Ship,          ar: "سفينة" },
  { key: "Train",       Icon: Train,         ar: "قطار" },
  { key: "Stethoscope", Icon: Stethoscope,   ar: "طب" },
  { key: "BarChart3",   Icon: BarChart3,     ar: "إحصاء" },
];

const ICON_MAP = Object.fromEntries(ICON_OPTIONS.map(({ key, Icon }) => [key, Icon]));
function ActivityIcon({ name, className }: { name: string; className?: string }) {
  const Icon = (ICON_MAP[name] as React.ComponentType<{ className?: string }>) ?? Globe;
  return <Icon className={className} />;
}

const COLOR_OPTIONS: { key: ActivityColor; ar: string }[] = [
  { key: "blue",    ar: "أزرق" },    { key: "sky",     ar: "سماوي" },
  { key: "indigo",  ar: "نيلي" },    { key: "violet",  ar: "بنفسجي" },
  { key: "purple",  ar: "أرجواني" }, { key: "fuchsia", ar: "فوشيا" },
  { key: "pink",    ar: "وردي" },    { key: "rose",    ar: "ورد" },
  { key: "red",     ar: "أحمر" },    { key: "orange",  ar: "برتقالي" },
  { key: "amber",   ar: "عنبري" },   { key: "yellow",  ar: "أصفر" },
  { key: "lime",    ar: "ليموني" },  { key: "green",   ar: "أخضر" },
  { key: "emerald", ar: "زمردي" },   { key: "teal",    ar: "فيروزي" },
  { key: "cyan",    ar: "سيان" },    { key: "slate",   ar: "رصاصي" },
];

function generateId() { return `act_${Date.now().toString(36)}`; }
const emptyActivity = (): Partial<BusinessActivity> => ({
  nameAr: "", nameEn: "", color: "blue", icon: "HardHat", active: true,
  modules: ["dashboard"], companyNameAr: "", companyNameEn: "", companyLogoUrl: null,
});

const groupedModules = ALL_MODULES.reduce<Record<string, typeof ALL_MODULES>>((acc, m) => {
  if (!acc[m.category]) acc[m.category] = [];
  acc[m.category].push(m); return acc;
}, {});

// ─── Color Picker Dropdown ─────────────────────────────────────────────────────
function ColorPicker({ value, onChange }: { value: ActivityColor; onChange: (c: ActivityColor) => void }) {
  const c = ACTIVITY_COLOR_MAP[value];
  const label = COLOR_OPTIONS.find((o) => o.key === value)?.ar ?? "لون";
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2 h-9 justify-between min-w-[120px]" type="button">
          <span className="flex items-center gap-1.5">
            <span className={cn("w-3 h-3 rounded-full shrink-0", c.dot)} />
            <span className="text-xs">{label}</span>
          </span>
          <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2.5" dir="rtl" align="start">
        <p className="text-xs font-semibold text-muted-foreground mb-2 px-1">اختر اللون</p>
        <div className="flex flex-wrap gap-1.5">
          {COLOR_OPTIONS.map(({ key, ar }) => {
            const cl = ACTIVITY_COLOR_MAP[key];
            const sel = value === key;
            return (
              <button key={key} onClick={() => onChange(key)} type="button"
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-medium transition-all",
                  sel ? cn(cl.border, cl.bg, cl.text) : "border-border/40 text-muted-foreground hover:bg-secondary/40"
                )}>
                <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", cl.dot)} />
                {ar}
                {sel && <Check className="w-3 h-3 ms-0.5" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Icon Picker Dropdown ──────────────────────────────────────────────────────
function IconPicker({ value, onChange }: { value: string; onChange: (k: string) => void }) {
  const current = ICON_OPTIONS.find((o) => o.key === value) ?? ICON_OPTIONS[0];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2 h-9 justify-between min-w-[120px]" type="button">
          <span className="flex items-center gap-1.5">
            <current.Icon className="w-4 h-4 shrink-0" />
            <span className="text-xs">{current.ar}</span>
          </span>
          <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2.5" dir="rtl" align="start">
        <p className="text-xs font-semibold text-muted-foreground mb-2 px-1">اختر الأيقونة</p>
        <div className="max-h-52 overflow-y-auto">
          <div className="flex flex-wrap gap-1.5">
            {ICON_OPTIONS.map(({ key, Icon, ar }) => {
              const sel = value === key;
              return (
                <button key={key} onClick={() => onChange(key)} type="button"
                  className={cn(
                    "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg border text-[10px] transition-all min-w-[50px]",
                    sel ? "border-primary bg-primary/10 text-primary font-semibold" : "border-border/40 text-muted-foreground hover:bg-secondary/30"
                  )}>
                  <Icon className="w-4 h-4" />
                  {ar}
                </button>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Logo Upload mini (inside activity form) ───────────────────────────────────
function LogoUploadMini({
  value, onChange,
}: { value: string | null | undefined; onChange: (v: string | null) => void }) {
  const { toast } = useToast();
  const ref = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "الملف كبير جداً", description: "بحد أقصى 2MB", variant: "destructive" }); return;
    }
    try { onChange(await readFileAsDataUrl(file)); }
    catch { toast({ title: "خطأ", description: "تعذّر قراءة الملف", variant: "destructive" }); }
  };

  return (
    <div className="flex items-center gap-3">
      {value ? (
        <div className="relative">
          <img src={value} alt="logo" className="h-12 max-w-[100px] object-contain rounded border border-border/50 p-1 bg-secondary/20" />
          <button onClick={() => { onChange(null); if (ref.current) ref.current.value = ""; }}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center"
            type="button">
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <button onClick={() => ref.current?.click()} type="button"
          className="flex flex-col items-center justify-center w-24 h-12 border-2 border-dashed border-border/60 rounded-lg text-muted-foreground hover:bg-secondary/20 transition-colors gap-1">
          <Upload className="w-4 h-4" />
          <span className="text-[10px]">رفع شعار</span>
        </button>
      )}
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

// ─── Activity Form ────────────────────────────────────────────────────────────
function ActivityForm({ form, setForm }: {
  form: Partial<BusinessActivity>; setForm: (f: Partial<BusinessActivity>) => void;
}) {
  const toggleModule = (id: string) => {
    const cur = form.modules || [];
    setForm({ ...form, modules: cur.includes(id) ? cur.filter((m) => m !== id) : [...cur, id] });
  };

  return (
    <div className="space-y-5" dir="rtl">

      {/* ── Company Branding Section ── */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-primary/20 flex items-center justify-center">
            <Image className="w-3.5 h-3.5 text-primary" />
          </div>
          <h3 className="text-sm font-bold text-primary">هوية الشركة لهذا النشاط</h3>
          <span className="text-xs text-muted-foreground">(تظهر في الشريط العلوي)</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">اسم الشركة بالعربي</Label>
            <Input
              dir="rtl"
              value={form.companyNameAr ?? ""}
              onChange={(e) => setForm({ ...form, companyNameAr: e.target.value })}
              placeholder="شركة ريادة التعمير للمقاولات"
              data-testid="input-activity-company-name-ar"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">اسم الشركة بالإنجليزي</Label>
            <Input
              dir="ltr"
              value={form.companyNameEn ?? ""}
              onChange={(e) => setForm({ ...form, companyNameEn: e.target.value })}
              placeholder="Riyada Construction Co."
              data-testid="input-activity-company-name-en"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">شعار الشركة</Label>
          <LogoUploadMini
            value={form.companyLogoUrl}
            onChange={(v) => setForm({ ...form, companyLogoUrl: v })}
          />
        </div>
      </div>

      {/* ── Activity Names ── */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>اسم النشاط (عربي) *</Label>
          <Input dir="rtl" placeholder="استشارات هندسية" value={form.nameAr || ""}
            onChange={(e) => setForm({ ...form, nameAr: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Activity Name (EN) *</Label>
          <Input dir="ltr" placeholder="Engineering Consultancy" value={form.nameEn || ""}
            onChange={(e) => setForm({ ...form, nameEn: e.target.value })} />
        </div>
      </div>

      {/* ── Color + Icon (dropdowns) ── */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <Label>اللون</Label>
          <ColorPicker
            value={(form.color as ActivityColor) || "blue"}
            onChange={(c) => setForm({ ...form, color: c })}
          />
        </div>
        <div className="space-y-2">
          <Label>الأيقونة</Label>
          <IconPicker
            value={form.icon || "HardHat"}
            onChange={(k) => setForm({ ...form, icon: k })}
          />
        </div>

        {/* Live mini-preview */}
        {(form.color || form.icon) && (() => {
          const c = ACTIVITY_COLOR_MAP[(form.color as ActivityColor) || "blue"];
          return (
            <div className="flex items-center gap-2 ms-auto">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", c.badge)}>
                <ActivityIcon name={form.icon || "HardHat"} className={cn("w-5 h-5", c.text)} />
              </div>
              <div>
                <p className={cn("text-xs font-bold", c.text)}>{form.nameAr || "اسم النشاط"}</p>
                <p className="text-[10px] text-muted-foreground">{form.nameEn || "Activity Name"}</p>
              </div>
            </div>
          );
        })()}
      </div>

      {/* ── Modules ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>الوحدات المفعّلة</Label>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-7 text-xs" type="button"
              onClick={() => setForm({ ...form, modules: ALL_MODULES.map((m) => m.id) })}>تحديد الكل</Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" type="button"
              onClick={() => setForm({ ...form, modules: ["dashboard"] })}>إلغاء الكل</Button>
          </div>
        </div>
        <div className="border rounded-xl overflow-hidden max-h-56 overflow-y-auto">
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
                      className={cn(
                        "flex items-center gap-2 px-2.5 py-2 rounded-lg border cursor-pointer text-xs transition-colors",
                        checked ? "bg-primary/5 border-primary/30 font-medium" : "border-border/40 text-muted-foreground hover:bg-secondary/30"
                      )}>
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

// ─── Inner Content ────────────────────────────────────────────────────────────
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
      color: (form.color as ActivityColor) ?? "blue", icon: form.icon ?? "HardHat",
      modules: form.modules ?? ["dashboard"], active: form.active ?? true,
      createdAt: new Date().toISOString(),
      companyNameAr: form.companyNameAr, companyNameEn: form.companyNameEn,
      companyLogoUrl: form.companyLogoUrl,
    };
    setActivities([...activities, a]); setAddOpen(false); setForm(emptyActivity());
    toast({ title: "تم بنجاح", description: `تمت إضافة "${a.nameAr}"` });
  };

  const handleEdit = () => {
    if (!editActivity || !form.nameAr || !form.nameEn) {
      toast({ title: "خطأ", description: "اسم النشاط مطلوب", variant: "destructive" }); return;
    }
    setActivities(activities.map((a) =>
      a.id === editActivity.id ? {
        ...a,
        nameAr: form.nameAr!, nameEn: form.nameEn!,
        color: (form.color as ActivityColor) ?? a.color, icon: form.icon ?? a.icon,
        modules: form.modules ?? a.modules, active: form.active ?? a.active,
        companyNameAr: form.companyNameAr, companyNameEn: form.companyNameEn,
        companyLogoUrl: form.companyLogoUrl,
      } : a
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
    setForm({
      nameAr: a.nameAr, nameEn: a.nameEn, color: a.color, icon: a.icon,
      modules: [...a.modules], active: a.active,
      companyNameAr: a.companyNameAr ?? "", companyNameEn: a.companyNameEn ?? "",
      companyLogoUrl: a.companyLogoUrl,
    });
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Settings2 className="w-6 h-6 text-primary" />
            لوحة تحكم النظام
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            إدارة أنشطة الشركة وتخصيص الوحدات والمستخدمين
          </p>
        </div>
        <Badge variant="outline" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-transparent gap-1.5 shrink-0">
          <Shield className="w-3.5 h-3.5" /> مدير النظام
        </Badge>
      </div>

      <Tabs defaultValue="activities" dir="rtl">
        <TabsList className="grid grid-cols-2 w-full max-w-sm">
          <TabsTrigger value="activities" className="gap-2 text-xs sm:text-sm">
            <Layers className="w-4 h-4" /> الأنشطة
          </TabsTrigger>
          <TabsTrigger value="assignments" className="gap-2 text-xs sm:text-sm">
            <UserCheck className="w-4 h-4" /> المستخدمون
          </TabsTrigger>
        </TabsList>

        {/* ── Activities ───────────────────────────────── */}
        <TabsContent value="activities" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{activities.length} نشاط مُعرَّف</p>
            <Button onClick={() => { setForm(emptyActivity()); setAddOpen(true); }}
              className="gap-2" data-testid="button-add-activity">
              <Plus className="w-4 h-4" /> إضافة نشاط
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {activities.map((act) => {
              const c = ACTIVITY_COLOR_MAP[(act.color as ActivityColor)] ?? ACTIVITY_COLOR_MAP.blue;
              const assignedCount = getActivityUserIds(act.id).length;
              const hasCompany = act.companyNameAr || act.companyNameEn || act.companyLogoUrl;
              return (
                <Card key={act.id} data-testid={`activity-card-${act.id}`}
                  className={cn("border-2 transition-all", act.active ? c.border : "border-border/40 opacity-60")}>
                  <CardContent className="p-4">
                    {/* Company branding preview inside card */}
                    {hasCompany && (
                      <div className={cn("flex items-center gap-2 mb-3 p-2 rounded-lg", c.bg)}>
                        {act.companyLogoUrl && (
                          <img src={act.companyLogoUrl} alt="" className="w-6 h-6 rounded-full object-cover shrink-0 border border-border/30" />
                        )}
                        <div className="min-w-0">
                          {act.companyNameAr && <p className={cn("text-[11px] font-bold truncate", c.text)}>{act.companyNameAr}</p>}
                          {act.companyNameEn && <p className="text-[10px] text-muted-foreground truncate">{act.companyNameEn}</p>}
                        </div>
                      </div>
                    )}

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
                      <Button size="sm" variant="outline"
                        className="gap-1 text-xs h-8 text-destructive border-destructive/30 hover:bg-destructive/10"
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

        {/* ── User Assignments ─────────────────────────── */}
        <TabsContent value="assignments" className="mt-6 space-y-4">
          <p className="text-sm text-muted-foreground">حدّد المستخدمين المسموح لهم بالوصول لكل نشاط.</p>
          <div className="grid gap-4">
            {activities.filter((a) => a.active).map((act) => {
              const c = ACTIVITY_COLOR_MAP[(act.color as ActivityColor)] ?? ACTIVITY_COLOR_MAP.blue;
              const assignedIds = getActivityUserIds(act.id);
              return (
                <Card key={act.id} className={cn("border", c.border)}>
                  <CardHeader className={cn("pb-2 pt-4 px-4 rounded-t-xl", c.bg)}>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", c.badge)}>
                        <ActivityIcon name={act.icon} className={cn("w-4 h-4", c.text)} />
                      </div>
                      <span className={c.text}>{act.nameAr}</span>
                      {(act.companyNameAr || act.companyNameEn) && (
                        <span className="text-xs text-muted-foreground">— {act.companyNameAr || act.companyNameEn}</span>
                      )}
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
                          <div key={user.id} onClick={() => toggleUserAssignment(act.id, user.id)}
                            data-testid={`assign-${act.id}-${user.id}`}
                            className={cn(
                              "flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all text-xs",
                              assigned ? cn("border-current font-medium", c.bg, c.text) : "border-border/50 text-muted-foreground hover:bg-secondary/30"
                            )}>
                            <Checkbox checked={assigned} onCheckedChange={() => toggleUserAssignment(act.id, user.id)} className="pointer-events-none h-3.5 w-3.5" />
                            <div className="min-w-0">
                              <p className="truncate font-medium">{user.name}</p>
                              <p className="truncate opacity-70">{ROLE_LABELS[user.role].ar}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Dialogs ────────────────────────────────────── */}
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

// ─── Page Shell ───────────────────────────────────────────────────────────────
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
