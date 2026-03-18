import {
  useState, useRef, useEffect, useImperativeHandle, forwardRef,
} from "react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Settings2, Plus, Pencil, Trash2, Shield, Users, Layers, Upload, X, UserCheck,
  ChevronDown, Check, Image, Link as LinkIcon, Ban,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type BusinessActivity, type ActivityColor, ACTIVITY_COLOR_MAP,
} from "@/lib/activities";
import { ICON_OPTIONS } from "@/lib/icons";
import { ActivityIcon } from "@/components/ActivityIcon";
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


const COLOR_OPTIONS: { key: ActivityColor; ar: string }[] = [
  { key: "blue", ar: "أزرق" }, { key: "sky", ar: "سماوي" },
  { key: "indigo", ar: "نيلي" }, { key: "violet", ar: "بنفسجي" },
  { key: "purple", ar: "أرجواني" }, { key: "fuchsia", ar: "فوشيا" },
  { key: "pink", ar: "وردي" }, { key: "rose", ar: "ورد" },
  { key: "red", ar: "أحمر" }, { key: "orange", ar: "برتقالي" },
  { key: "amber", ar: "عنبري" }, { key: "yellow", ar: "أصفر" },
  { key: "lime", ar: "ليموني" }, { key: "green", ar: "أخضر" },
  { key: "emerald", ar: "زمردي" }, { key: "teal", ar: "فيروزي" },
  { key: "cyan", ar: "سيان" }, { key: "slate", ar: "رصاصي" },
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

// ─── Color Picker ─────────────────────────────────────────────────────────────
function ColorPicker({ value, onChange }: { value: ActivityColor; onChange: (c: ActivityColor) => void }) {
  const c = ACTIVITY_COLOR_MAP[value];
  const label = COLOR_OPTIONS.find((o) => o.key === value)?.ar ?? "لون";
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2 h-9 justify-between min-w-[110px]" type="button">
          <span className="flex items-center gap-1.5">
            <span className={cn("w-3 h-3 rounded-full shrink-0", c.dot)} />
            <span className="text-xs">{label}</span>
          </span>
          <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-2.5" dir="rtl" align="start">
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

// ─── Icon Picker ──────────────────────────────────────────────────────────────
function IconPicker({ value, onChange }: { value: string; onChange: (k: string) => void }) {
  const { toast } = useToast();
  const imgInputRef = useRef<HTMLInputElement>(null);
  const [urlInput, setUrlInput] = useState("");
  const [showUrl, setShowUrl] = useState(false);

  const isCustom = value.startsWith("data:") || value.startsWith("http");
  const isNone = !value || value === "none";
  const current = !isCustom && !isNone ? ICON_OPTIONS.find((o) => o.key === value) : null;
  const label = isNone ? "بلا أيقونة" : isCustom ? "أيقونة مخصصة" : current?.ar ?? "اختر";

  const handleImgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 512 * 1024) {
      toast({ title: "الملف كبير", description: "بحد أقصى 512KB للأيقونة", variant: "destructive" }); return;
    }
    try { onChange(await readFileAsDataUrl(file)); }
    catch { toast({ title: "خطأ", description: "تعذّر قراءة الملف", variant: "destructive" }); }
  };

  const handleUrlSave = () => {
    if (urlInput.trim()) { onChange(urlInput.trim()); setShowUrl(false); setUrlInput(""); }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2 h-9 justify-between min-w-[130px]" type="button">
          <span className="flex items-center gap-1.5">
            {isNone ? <Ban className="w-4 h-4 text-muted-foreground" /> :
             isCustom ? <img src={value} alt="" className="w-4 h-4 object-contain rounded" /> :
             current?.Icon ? <current.Icon className="w-4 h-4" /> : null}
            <span className="text-xs">{label}</span>
          </span>
          <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" dir="rtl" align="start">
        <div className="p-3 border-b border-border/50">
          {/* Special options row */}
          <div className="flex gap-2 mb-3">
            {/* No icon */}
            <button type="button" onClick={() => onChange("none")}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-2 rounded-lg border text-[11px] transition-all",
                isNone ? "border-primary bg-primary/10 text-primary font-semibold" : "border-border/40 text-muted-foreground hover:bg-secondary/30"
              )}>
              <Ban className="w-4 h-4" />
              بلا أيقونة
            </button>
            {/* Upload image */}
            <button type="button" onClick={() => imgInputRef.current?.click()}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-2 rounded-lg border text-[11px] transition-all",
                isCustom && value.startsWith("data:") ? "border-primary bg-primary/10 text-primary font-semibold" : "border-border/40 text-muted-foreground hover:bg-secondary/30"
              )}>
              <Upload className="w-4 h-4" />
              رفع صورة
            </button>
            {/* URL */}
            <button type="button" onClick={() => setShowUrl((v) => !v)}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-2 rounded-lg border text-[11px] transition-all",
                isCustom && value.startsWith("http") ? "border-primary bg-primary/10 text-primary font-semibold" : "border-border/40 text-muted-foreground hover:bg-secondary/30"
              )}>
              <LinkIcon className="w-4 h-4" />
              رابط URL
            </button>
          </div>

          {/* URL input */}
          {showUrl && (
            <div className="flex gap-2 mb-2">
              <Input
                placeholder="https://..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                style={{ direction: "ltr", textAlign: "left" }}
                className="h-8 text-xs flex-1"
              />
              <Button size="sm" className="h-8 text-xs px-3" type="button" onClick={handleUrlSave}>تطبيق</Button>
            </div>
          )}

          {/* Current custom preview */}
          {isCustom && (
            <div className="flex items-center gap-2 p-2 bg-secondary/30 rounded-lg text-xs">
              <img src={value} alt="" className="w-6 h-6 object-contain rounded" />
              <span className="truncate text-muted-foreground flex-1">أيقونة مخصصة مفعّلة</span>
              <button type="button" onClick={() => onChange("HardHat")}
                className="text-destructive hover:text-destructive/70">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Lucide icons grid */}
        <div className="p-2.5 max-h-48 overflow-y-auto">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">أيقونات متاحة</p>
          <div className="flex flex-wrap gap-1.5">
            {ICON_OPTIONS.map(({ key, Icon, ar }) => {
              if (!Icon) return null;
              const sel = value === key;
              return (
                <button key={key} onClick={() => onChange(key)} type="button"
                  className={cn(
                    "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg border text-[10px] transition-all min-w-[48px]",
                    sel ? "border-primary bg-primary/10 text-primary font-semibold" : "border-border/40 text-muted-foreground hover:bg-secondary/30"
                  )}>
                  <Icon className="w-4 h-4" />
                  {ar}
                </button>
              );
            })}
          </div>
        </div>
        <input ref={imgInputRef} type="file" accept="image/png,image/svg+xml,image/jpeg,image/webp" className="hidden" onChange={handleImgUpload} />
      </PopoverContent>
    </Popover>
  );
}

// ─── Logo Upload mini ─────────────────────────────────────────────────────────
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

// ─── Activity Form (fully local state — fixes typing-in-Dialog issue) ─────────
export interface ActivityFormHandle {
  getValues: () => Partial<BusinessActivity>;
}

const ActivityForm = forwardRef<ActivityFormHandle, { initialForm: Partial<BusinessActivity> }>(
  ({ initialForm }, ref) => {
    // All text / complex state is LOCAL — never causes parent re-renders while typing
    const [nameAr, setNameAr] = useState(initialForm.nameAr ?? "");
    const [nameEn, setNameEn] = useState(initialForm.nameEn ?? "");
    const [companyNameAr, setCompanyNameAr] = useState(initialForm.companyNameAr ?? "");
    const [companyNameEn, setCompanyNameEn] = useState(initialForm.companyNameEn ?? "");
    const [companyLogoUrl, setCompanyLogoUrl] = useState(initialForm.companyLogoUrl ?? null);
    const [color, setColor] = useState<ActivityColor>((initialForm.color as ActivityColor) ?? "blue");
    const [icon, setIcon] = useState(initialForm.icon ?? "HardHat");
    const [modules, setModules] = useState<string[]>(initialForm.modules ?? ["dashboard"]);

    // Expose values to parent via ref
    useImperativeHandle(ref, () => ({
      getValues: () => ({
        nameAr, nameEn, companyNameAr, companyNameEn, companyLogoUrl,
        color, icon, modules,
      }),
    }));

    const toggleModule = (id: string) =>
      setModules((cur) => cur.includes(id) ? cur.filter((m) => m !== id) : [...cur, id]);

    const c = ACTIVITY_COLOR_MAP[color];

    return (
      <div className="space-y-5" dir="rtl">

        {/* Company Branding */}
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
              <input
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={companyNameAr}
                onChange={(e) => setCompanyNameAr(e.target.value)}
                placeholder="شركة ريادة التعمير للمقاولات"
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
                data-testid="input-activity-company-name-ar"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">اسم الشركة بالإنجليزي</Label>
              <input
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                style={{ direction: "ltr", textAlign: "left" }}
                value={companyNameEn}
                onChange={(e) => setCompanyNameEn(e.target.value)}
                placeholder="Riyada Construction Co."
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
                data-testid="input-activity-company-name-en"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">شعار الشركة</Label>
            <LogoUploadMini value={companyLogoUrl} onChange={setCompanyLogoUrl} />
          </div>
        </div>

        {/* Activity Names */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>اسم النشاط (عربي) *</Label>
            <input
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="استشارات هندسية"
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Activity Name (EN) *</Label>
            <input
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              style={{ direction: "ltr", textAlign: "left" }}
              placeholder="Engineering Consultancy"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
            />
          </div>
        </div>

        {/* Color + Icon + Live preview */}
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <Label>اللون</Label>
            <ColorPicker value={color} onChange={setColor} />
          </div>
          <div className="space-y-2">
            <Label>الأيقونة</Label>
            <IconPicker value={icon} onChange={setIcon} />
          </div>

          {/* Live preview */}
          <div className="flex items-center gap-2 ms-auto">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", c.badge)}>
              <ActivityIcon name={icon} className={cn("w-5 h-5", c.text)} />
            </div>
            <div>
              <p className={cn("text-xs font-bold", c.text)}>{nameAr || "اسم النشاط"}</p>
              <p className="text-[10px] text-muted-foreground">{nameEn || "Activity Name"}</p>
            </div>
          </div>
        </div>

        {/* Modules */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>الوحدات المفعّلة</Label>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="h-7 text-xs" type="button"
                onClick={() => setModules(ALL_MODULES.map((m) => m.id))}>تحديد الكل</Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" type="button"
                onClick={() => setModules(["dashboard"])}>إلغاء الكل</Button>
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
                    const checked = modules.includes(mod.id);
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
          <p className="text-xs text-muted-foreground">{modules.length} وحدة من {ALL_MODULES.length}</p>
        </div>
      </div>
    );
  }
);
ActivityForm.displayName = "ActivityForm";

// ─── Activity Assignment Card (with searchable user dropdown) ─────────────────
function ActivityAssignmentCard({
  act,
  allUsers,
  getActivityUserIds,
  isUserAssigned,
  toggleUserAssignment,
}: {
  act: BusinessActivity;
  allUsers: SystemUser[];
  getActivityUserIds: (id: string) => string[];
  isUserAssigned: (actId: string, userId: string) => boolean;
  toggleUserAssignment: (actId: string, userId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const c = ACTIVITY_COLOR_MAP[(act.color as ActivityColor)] ?? ACTIVITY_COLOR_MAP.blue;
  const assignedIds = getActivityUserIds(act.id);
  const assignedUsers = allUsers.filter((u) => assignedIds.includes(u.id));
  const unassigned = allUsers.filter((u) => !assignedIds.includes(u.id));

  const filtered = unassigned.filter((u) =>
    !search ||
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    (u.nationalId && u.nationalId.includes(search)) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <Card className={cn("border", c.border)}>
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
      <CardContent className="p-4 pt-3 space-y-3">
        {/* Assigned users as removable chips */}
        {assignedUsers.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {assignedUsers.map((user) => (
              <div key={user.id}
                className={cn("flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-full text-xs font-medium border", c.bg, c.border, c.text)}>
                <div className="w-4 h-4 rounded-full bg-current/20 flex items-center justify-center text-[9px] font-bold shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="max-w-[100px] truncate">{user.name}</span>
                {user.nationalId && (
                  <span className="opacity-60 font-mono text-[9px]">{user.nationalId.slice(-4)}</span>
                )}
                <button
                  onClick={() => toggleUserAssignment(act.id, user.id)}
                  className="w-4 h-4 rounded-full hover:bg-current/20 flex items-center justify-center transition-colors"
                  data-testid={`remove-assign-${act.id}-${user.id}`}
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">لم يُعيَّن أي مستخدم بعد</p>
        )}

        {/* Searchable user dropdown */}
        {unassigned.length > 0 && (
          <div ref={dropRef} className="relative">
            <div className="relative">
              <input
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="ابحث باسم أو رقم هوية للإضافة..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setDropOpen(true); }}
                onFocus={() => setDropOpen(true)}
              />
              <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            </div>

            {dropOpen && filtered.length > 0 && (
              <div className="absolute z-50 w-full mt-1 rounded-lg border border-border shadow-xl bg-popover overflow-hidden">
                <div className="max-h-44 overflow-y-auto">
                  {filtered.slice(0, 15).map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      data-testid={`assign-${act.id}-${user.id}`}
                      onClick={() => {
                        toggleUserAssignment(act.id, user.id);
                        setSearch("");
                        setDropOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-right hover:bg-secondary/50 transition-colors"
                    >
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 font-bold text-primary text-xs">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{user.name}</p>
                        <div className="flex items-center gap-1.5">
                          {user.nationalId && (
                            <span className="text-[10px] text-muted-foreground font-mono">{user.nationalId}</span>
                          )}
                          <span className="text-[10px] text-muted-foreground">·</span>
                          <Badge variant="outline" className={cn("border-transparent text-[9px] px-1 h-4", ROLE_LABELS[user.role].color)}>
                            {ROLE_LABELS[user.role].ar}
                          </Badge>
                        </div>
                      </div>
                      <Plus className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
                {filtered.length > 15 && (
                  <p className="px-3 py-1.5 text-[10px] text-muted-foreground bg-secondary/30 border-t border-border">
                    +{filtered.length - 15} نتيجة — دقّق البحث
                  </p>
                )}
              </div>
            )}

            {dropOpen && search && filtered.length === 0 && (
              <div className="absolute z-50 w-full mt-1 rounded-lg border border-border shadow-xl bg-popover p-3 text-center text-xs text-muted-foreground">
                لا يوجد مستخدم مطابق
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
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
  const [initialForm, setInitialForm] = useState<Partial<BusinessActivity>>(emptyActivity());

  // Refs to get form values from the forwardRef'd ActivityForm
  const addFormRef = useRef<ActivityFormHandle>(null);
  const editFormRef = useRef<ActivityFormHandle>(null);

  const handleAdd = () => {
    const values = addFormRef.current?.getValues();
    if (!values?.nameAr || !values?.nameEn) {
      toast({ title: "خطأ", description: "اسم النشاط مطلوب", variant: "destructive" }); return;
    }
    const a: BusinessActivity = {
      id: generateId(), nameAr: values.nameAr, nameEn: values.nameEn,
      color: (values.color as ActivityColor) ?? "blue", icon: values.icon ?? "HardHat",
      modules: values.modules ?? ["dashboard"], active: true,
      createdAt: new Date().toISOString(),
      companyNameAr: values.companyNameAr, companyNameEn: values.companyNameEn,
      companyLogoUrl: values.companyLogoUrl,
    };
    setActivities([...activities, a]);
    setAddOpen(false);
    toast({ title: "تم بنجاح", description: `تمت إضافة "${a.nameAr}"` });
  };

  const handleEdit = () => {
    if (!editActivity) return;
    const values = editFormRef.current?.getValues();
    if (!values?.nameAr || !values?.nameEn) {
      toast({ title: "خطأ", description: "اسم النشاط مطلوب", variant: "destructive" }); return;
    }
    setActivities(activities.map((a) =>
      a.id === editActivity.id ? {
        ...a,
        nameAr: values.nameAr!, nameEn: values.nameEn!,
        color: (values.color as ActivityColor) ?? a.color, icon: values.icon ?? a.icon,
        modules: values.modules ?? a.modules,
        companyNameAr: values.companyNameAr, companyNameEn: values.companyNameEn,
        companyLogoUrl: values.companyLogoUrl,
      } : a
    ));
    setEditActivity(null);
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
    setInitialForm({
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

        {/* ── Activities ─────────────────────── */}
        <TabsContent value="activities" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{activities.length} نشاط مُعرَّف</p>
            <Button onClick={() => setAddOpen(true)} className="gap-2" data-testid="button-add-activity">
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

        {/* ── User Assignments ───────────────── */}
        <TabsContent value="assignments" className="mt-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            ابحث باسم المستخدم أو رقم هويته لتعيينه على نشاط. المعيّنون يظهرون كعلامات قابلة للإزالة.
          </p>
          <div className="grid gap-4">
            {activities.filter((a) => a.active).map((act) => (
              <ActivityAssignmentCard
                key={act.id}
                act={act}
                allUsers={allUsers}
                getActivityUserIds={getActivityUserIds}
                isUserAssigned={isUserAssigned}
                toggleUserAssignment={toggleUserAssignment}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Add Dialog ─────────────────────── */}
      <Dialog open={addOpen} onOpenChange={(o) => { if (!o) setAddOpen(false); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl"
          onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-right flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" /> إضافة نشاط جديد
            </DialogTitle>
          </DialogHeader>
          {/* key forces remount when dialog opens fresh */}
          <ActivityForm key={addOpen ? "add-open" : "add-closed"} ref={addFormRef} initialForm={emptyActivity()} />
          <DialogFooter className="flex-row-reverse gap-2">
            <Button onClick={handleAdd} data-testid="button-confirm-add-activity">حفظ النشاط</Button>
            <Button variant="outline" onClick={() => setAddOpen(false)}>إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ────────────────────── */}
      <Dialog open={!!editActivity} onOpenChange={(o) => { if (!o) setEditActivity(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl"
          onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-right flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" /> تعديل: {editActivity?.nameAr}
            </DialogTitle>
          </DialogHeader>
          {/* key = editActivity.id ensures fresh mount per activity */}
          {editActivity && (
            <ActivityForm key={editActivity.id} ref={editFormRef} initialForm={initialForm} />
          )}
          <DialogFooter className="flex-row-reverse gap-2">
            <Button onClick={handleEdit} data-testid="button-confirm-edit-activity">حفظ التعديلات</Button>
            <Button variant="outline" onClick={() => setEditActivity(null)}>إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ─────────────────── */}
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
