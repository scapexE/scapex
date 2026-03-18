import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Plus, Search, Pencil, Trash2, Shield, ShieldCheck,
  Users as UsersIcon, Filter, Eye, EyeOff, RefreshCw,
  UserCheck, UserX, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type SystemUser, type Role,
  ALL_MODULES, ROLE_DEFAULTS, ROLE_LABELS,
  getUsers, saveUsers, canApproveRegistrations,
  getPrimaryRole, mergePermissions, validateNationalId,
} from "@/lib/permissions";
import { useToast } from "@/hooks/use-toast";

const MODULE_CATEGORIES: Record<string, { ar: string; en: string }> = {
  core:        { ar: "النظام الأساسي",   en: "Core" },
  business:    { ar: "الأعمال والمالية", en: "Business & Finance" },
  operations:  { ar: "العمليات",         en: "Operations" },
  engineering: { ar: "الهندسة",          en: "Engineering" },
  hr:          { ar: "الموارد البشرية",  en: "HR" },
  system:      { ar: "النظام",           en: "System" },
};

// Roles available for assignment (admin is system-only)
const ASSIGNABLE_ROLES: { role: Role; ar: string; desc: string }[] = [
  { role: "manager",    ar: "مشرف / مدير",          desc: "صلاحيات إدارية وإشرافية" },
  { role: "accountant", ar: "محاسب",                 desc: "المحاسبة والمالية" },
  { role: "engineer",   ar: "مهندس",                 desc: "المشاريع والهندسة والميدان" },
  { role: "hr_manager", ar: "مدير موارد بشرية",      desc: "الموارد البشرية والرواتب" },
  { role: "client",     ar: "عميل",                  desc: "بوابة العملاء فقط" },
  { role: "viewer",     ar: "مشاهد",                 desc: "قراءة فقط بدون تعديل" },
];

const ALL_ROLES: Role[] = ["admin", "manager", "accountant", "engineer", "hr_manager", "client", "viewer"];

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
const emptyForm = (): Partial<SystemUser> => ({
  nationalId: "", name: "", email: "", password: "", role: "viewer",
  roles: ["viewer"], permissions: ROLE_DEFAULTS.viewer, active: true,
});

// ─────────────────────────────────────────────────────────────────────────────
// Multi-Role Activation Dialog
// ─────────────────────────────────────────────────────────────────────────────
function ActivationDialog({
  user,
  onActivate,
  onClose,
}: {
  user: SystemUser;
  onActivate: (user: SystemUser, roles: Role[], permissions: string[]) => void;
  onClose: () => void;
}) {
  const [selectedRoles, setSelectedRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [customPerm, setCustomPerm] = useState(false);

  const toggleRole = (role: Role) => {
    let updated: Role[];
    if (selectedRoles.includes(role)) {
      updated = selectedRoles.filter((r) => r !== role);
    } else {
      updated = [...selectedRoles, role];
    }
    setSelectedRoles(updated);
    if (!customPerm) {
      setPermissions(updated.length > 0 ? mergePermissions(updated) : []);
    }
  };

  const resetPermissions = () => {
    setPermissions(mergePermissions(selectedRoles));
    setCustomPerm(false);
  };

  const togglePerm = (id: string) => {
    setCustomPerm(true);
    setPermissions((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const primaryRole = selectedRoles.length > 0 ? getPrimaryRole(selectedRoles) : null;

  const groupedModules = ALL_MODULES.reduce<Record<string, typeof ALL_MODULES>>((acc, mod) => {
    if (!acc[mod.category]) acc[mod.category] = [];
    acc[mod.category].push(mod); return acc;
  }, {});

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-600" />
            تفعيل الحساب — {user.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* User Info */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            {primaryRole && (
              <Badge variant="outline" className={cn("border-transparent text-xs", ROLE_LABELS[primaryRole].color)}>
                {ROLE_LABELS[primaryRole].ar}
                {selectedRoles.length > 1 && ` +${selectedRoles.length - 1}`}
              </Badge>
            )}
          </div>

          {/* Role Selection (multi-check) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">الأدوار الوظيفية</Label>
              <span className="text-xs text-muted-foreground">يمكن اختيار أكثر من دور</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ASSIGNABLE_ROLES.map(({ role, ar, desc }) => {
                const selected = selectedRoles.includes(role);
                return (
                  <div
                    key={role}
                    data-testid={`role-option-${role}`}
                    onClick={() => toggleRole(role)}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all",
                      selected
                        ? "border-primary bg-primary/5"
                        : "border-border/50 hover:border-border hover:bg-secondary/30"
                    )}
                  >
                    <Checkbox
                      checked={selected}
                      onCheckedChange={() => toggleRole(role)}
                      className="mt-0.5 pointer-events-none"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">{ar}</p>
                        {selected && (
                          <Badge variant="outline" className={cn("border-transparent text-[10px] px-1.5", ROLE_LABELS[role].color)}>
                            {ROLE_LABELS[role].en}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedRoles.length > 1 && (
              <div className="flex flex-wrap gap-1.5 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                <span className="text-xs text-blue-600 font-medium w-full mb-1">الأدوار المدمجة:</span>
                {selectedRoles.map((r) => (
                  <Badge key={r} variant="outline" className={cn("border-transparent text-xs", ROLE_LABELS[r].color)}>
                    {ROLE_LABELS[r].ar}
                  </Badge>
                ))}
                <span className="text-xs text-muted-foreground w-full mt-0.5">
                  الدور الأساسي: <strong>{ROLE_LABELS[getPrimaryRole(selectedRoles)].ar}</strong> — سيحصل على صلاحيات جميع الأدوار مجمّعة
                </span>
              </div>
            )}
          </div>

          {/* Permissions */}
          {selectedRoles.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">الصلاحيات</Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{permissions.length} / {ALL_MODULES.length}</span>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={resetPermissions}>
                    <RefreshCw className="w-3 h-3" /> إعادة ضبط
                  </Button>
                </div>
              </div>
              {customPerm && (
                <p className="text-xs text-amber-600 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
                  ✏️ تم تعديل الصلاحيات يدوياً — اضغط "إعادة ضبط" للرجوع للصلاحيات الافتراضية
                </p>
              )}
              <div className="border rounded-xl overflow-hidden">
                {Object.entries(groupedModules).map(([cat, mods], catIdx) => (
                  <div key={cat} className={cn("p-3", catIdx > 0 && "border-t border-border/50")}>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      {MODULE_CATEGORIES[cat]?.ar}
                    </h4>
                    <div className="grid grid-cols-2 gap-1.5">
                      {mods.map((mod) => {
                        const checked = permissions.includes(mod.id);
                        return (
                          <div key={mod.id}
                            onClick={() => togglePerm(mod.id)}
                            className={cn(
                              "flex items-center gap-2 px-2.5 py-2 rounded-lg border cursor-pointer transition-colors text-sm",
                              checked ? "bg-primary/5 border-primary/30" : "bg-card border-border/40 hover:bg-secondary/30"
                            )}
                          >
                            <Checkbox checked={checked} onCheckedChange={() => togglePerm(mod.id)} className="pointer-events-none shrink-0" />
                            <span className={cn("text-xs truncate", checked ? "font-medium" : "text-muted-foreground")}>
                              {mod.labelAr}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-row-reverse gap-2 mt-4">
          <Button
            disabled={selectedRoles.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            onClick={() => onActivate(user, selectedRoles, permissions)}
            data-testid="button-confirm-activate"
          >
            <UserCheck className="w-4 h-4" />
            تفعيل الحساب
          </Button>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pending Section
// ─────────────────────────────────────────────────────────────────────────────
function PendingSection({
  users,
  onActivateClick,
  onReject,
}: {
  users: SystemUser[];
  onActivateClick: (user: SystemUser) => void;
  onReject: (user: SystemUser) => void;
}) {
  const pending = users.filter((u) => u.pendingApproval && !u.active);

  return (
    <Card className={cn("border-2", pending.length > 0 ? "border-amber-500/40 bg-amber-500/5" : "border-border/50")}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center",
            pending.length > 0 ? "bg-amber-500/20" : "bg-secondary")}>
            <Clock className={cn("w-4 h-4", pending.length > 0 ? "text-amber-500" : "text-muted-foreground")} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm">تفعيل الحساب</h3>
            <p className="text-xs text-muted-foreground">طلبات تسجيل تنتظر تحديد الأدوار وتفعيل الوصول</p>
          </div>
          {pending.length > 0 && (
            <Badge className="bg-amber-500 text-white border-0">{pending.length} طلب</Badge>
          )}
        </div>

        {pending.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">لا توجد حسابات تنتظر التفعيل</div>
        ) : (
          <div className="space-y-2">
            {pending.map((user) => (
              <div key={user.id} data-testid={`pending-row-${user.id}`}
                className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border/60">
                <div className="w-9 h-9 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 font-bold text-amber-600 text-sm">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  <p className="text-xs text-muted-foreground">
                    التسجيل: {new Date(user.createdAt).toLocaleDateString("ar-SA")}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button data-testid={`button-activate-${user.id}`}
                    size="sm" className="h-8 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                    onClick={() => onActivateClick(user)}>
                    <UserCheck className="w-3.5 h-3.5" /> تفعيل
                  </Button>
                  <Button data-testid={`button-reject-${user.id}`}
                    size="sm" variant="outline"
                    className="h-8 gap-1 text-destructive border-destructive/30 hover:bg-destructive/10 text-xs"
                    onClick={() => onReject(user)}>
                    <UserX className="w-3.5 h-3.5" /> رفض
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Role badges for multi-role users
// ─────────────────────────────────────────────────────────────────────────────
function RoleBadges({ user }: { user: SystemUser }) {
  const allRoles = user.roles && user.roles.length > 0 ? user.roles : [user.role];
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? allRoles : allRoles.slice(0, 2);
  const extra = allRoles.length - 2;

  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((r) => (
        <Badge key={r} variant="outline" className={cn("border-transparent text-xs", ROLE_LABELS[r].color)}>
          {ROLE_LABELS[r].ar}
        </Badge>
      ))}
      {!showAll && extra > 0 && (
        <button onClick={(e) => { e.stopPropagation(); setShowAll(true); }}
          className="text-xs text-primary hover:underline font-medium">
          +{extra}
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export default function Users() {
  const { toast } = useToast();
  const currentUser: SystemUser | null = JSON.parse(localStorage.getItem("user") || "null");
  const isAdmin = currentUser?.role === "admin";
  const canApprove = canApproveRegistrations(currentUser);

  const [users, setUsers] = useState<SystemUser[]>(() => getUsers());
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const [addOpen, setAddOpen] = useState(false);
  const [editUser, setEditUser] = useState<SystemUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<SystemUser | null>(null);
  const [permUser, setPermUser] = useState<SystemUser | null>(null);
  const [activatingUser, setActivatingUser] = useState<SystemUser | null>(null);
  const [form, setForm] = useState<Partial<SystemUser>>(emptyForm());
  const [showPass, setShowPass] = useState(false);

  if (!isAdmin && !canApprove) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-2">
            <Shield className="w-12 h-12 mx-auto text-destructive/50" />
            <p className="text-lg font-semibold text-muted-foreground">لا تملك صلاحية الوصول</p>
            <p className="text-sm text-muted-foreground">فقط مدير النظام أو المفوّضون يمكنهم إدارة المستخدمين</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  const persist = (updated: SystemUser[]) => { setUsers(updated); saveUsers(updated); };

  // ── Activation ────────────────────────────────────────────────────────────
  const handleActivate = (user: SystemUser, roles: Role[], permissions: string[]) => {
    const primary = getPrimaryRole(roles);
    const updated = users.map((u) =>
      u.id === user.id
        ? { ...u, role: primary, roles, permissions, active: true, pendingApproval: false }
        : u
    );
    persist(updated);
    setActivatingUser(null);
    const roleNames = roles.map((r) => ROLE_LABELS[r].ar).join(" + ");
    toast({ title: "تم التفعيل", description: `تم تفعيل "${user.name}" بأدوار: ${roleNames}` });
  };

  const handleReject = (user: SystemUser) => {
    persist(users.filter((u) => u.id !== user.id));
    toast({ title: "تم الرفض", description: `تم حذف طلب "${user.name}"`, variant: "destructive" });
  };

  // ── Filter ────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (u.pendingApproval && !u.active) return false;
      const matchSearch =
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase());
      const matchRole = roleFilter === "all"
        || u.role === roleFilter
        || (u.roles || []).includes(roleFilter as Role);
      return matchSearch && matchRole;
    });
  }, [users, search, roleFilter]);

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const handleAddSubmit = () => {
    if (!form.nationalId || !form.name || !form.email || !form.password) {
      toast({ title: "خطأ", description: "يرجى ملء جميع الحقول المطلوبة (الهوية، الاسم، البريد، كلمة المرور)", variant: "destructive" }); return;
    }
    if (!validateNationalId(form.nationalId)) {
      toast({ title: "رقم الهوية غير صحيح", description: "يجب أن يكون رقم الهوية 10 أرقام ويبدأ بـ 1 أو 2", variant: "destructive" }); return;
    }
    if (users.find((u) => u.nationalId === form.nationalId)) {
      toast({ title: "خطأ", description: "رقم الهوية مسجّل مسبقاً", variant: "destructive" }); return;
    }
    if (users.find((u) => u.email === form.email)) {
      toast({ title: "خطأ", description: "البريد مستخدم مسبقاً", variant: "destructive" }); return;
    }
    const roles = form.roles && form.roles.length > 0 ? form.roles : [form.role as Role];
    const primary = getPrimaryRole(roles);
    const newUser: SystemUser = {
      id: generateId(), nationalId: form.nationalId!, name: form.name!, email: form.email!, password: form.password!,
      role: primary, roles, permissions: form.permissions || mergePermissions(roles),
      createdAt: new Date().toISOString(), active: form.active ?? true,
    };
    persist([...users, newUser]); setAddOpen(false); setForm(emptyForm());
    toast({ title: "تم بنجاح", description: `تمت إضافة "${newUser.name}"` });
  };

  const handleEditSubmit = () => {
    if (!editUser || !form.nationalId || !form.name || !form.email) {
      toast({ title: "خطأ", description: "يرجى ملء الحقول المطلوبة", variant: "destructive" }); return;
    }
    if (!validateNationalId(form.nationalId)) {
      toast({ title: "رقم الهوية غير صحيح", description: "يجب أن يكون رقم الهوية 10 أرقام ويبدأ بـ 1 أو 2", variant: "destructive" }); return;
    }
    const dupId = users.find((u) => u.nationalId === form.nationalId && u.id !== editUser.id);
    if (dupId) { toast({ title: "خطأ", description: "رقم الهوية مسجّل لمستخدم آخر", variant: "destructive" }); return; }
    const roles = form.roles && form.roles.length > 0 ? form.roles : [form.role as Role];
    const primary = getPrimaryRole(roles);
    const updated = users.map((u) =>
      u.id === editUser.id
        ? { ...u, nationalId: form.nationalId!, name: form.name!, email: form.email!, role: primary, roles, permissions: form.permissions || [], active: form.active ?? true, ...(form.password ? { password: form.password } : {}) }
        : u
    );
    persist(updated);
    if (currentUser?.email === editUser.email) {
      const nc = updated.find((u) => u.id === editUser.id);
      if (nc) localStorage.setItem("user", JSON.stringify(nc));
    }
    setEditUser(null); setForm(emptyForm());
    toast({ title: "تم بنجاح", description: "تم تحديث بيانات المستخدم" });
  };

  const handleDelete = () => {
    if (!deleteUser) return;
    if (deleteUser.email === currentUser?.email) {
      toast({ title: "خطأ", description: "لا يمكنك حذف حسابك الحالي", variant: "destructive" });
      setDeleteUser(null); return;
    }
    persist(users.filter((u) => u.id !== deleteUser.id)); setDeleteUser(null);
    toast({ title: "تم الحذف", description: `تم حذف "${deleteUser.name}"` });
  };

  const handleToggleActive = (user: SystemUser) => {
    if (user.email === currentUser?.email) return;
    persist(users.map((u) => u.id === user.id ? { ...u, active: !u.active } : u));
  };

  const handlePermSave = () => {
    if (!permUser) return;
    persist(users.map((u) => u.id === permUser.id ? { ...u, permissions: permUser.permissions } : u));
    setPermUser(null);
    toast({ title: "تم بنجاح", description: "تم حفظ الصلاحيات" });
  };

  const togglePermEdit = (modId: string) => {
    if (!permUser) return;
    const has = permUser.permissions.includes(modId);
    setPermUser({ ...permUser, permissions: has ? permUser.permissions.filter((p) => p !== modId) : [...permUser.permissions, modId] });
  };

  const groupedModules = ALL_MODULES.reduce<Record<string, typeof ALL_MODULES>>((acc, mod) => {
    if (!acc[mod.category]) acc[mod.category] = [];
    acc[mod.category].push(mod); return acc;
  }, {});

  const openEdit = (user: SystemUser) => {
    const roles = user.roles && user.roles.length > 0 ? user.roles : [user.role];
    setForm({ nationalId: user.nationalId ?? "", name: user.name, email: user.email, password: "", role: user.role, roles, permissions: [...user.permissions], active: user.active });
    setEditUser(user);
  };

  const pendingCnt = users.filter((u) => u.pendingApproval && !u.active).length;

  // ── Approver-only view ────────────────────────────────────────────────────
  if (!isAdmin && canApprove) {
    return (
      <MainLayout>
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">تفعيل الحساب</h1>
            <p className="text-muted-foreground mt-1 text-sm">مراجعة طلبات التسجيل وتحديد الأدوار قبل التفعيل</p>
          </div>
          <PendingSection users={users} onActivateClick={setActivatingUser} onReject={handleReject} />
        </div>
        {activatingUser && (
          <ActivationDialog user={activatingUser} onActivate={handleActivate} onClose={() => setActivatingUser(null)} />
        )}
      </MainLayout>
    );
  }

  // ── Admin full view ───────────────────────────────────────────────────────
  return (
    <MainLayout>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">إدارة المستخدمين</h1>
            <p className="text-muted-foreground mt-1 text-sm">إضافة وتعديل وضبط أدوار وصلاحيات مستخدمي النظام</p>
          </div>
          <Button data-testid="button-add-user"
            className="bg-primary hover:bg-primary/90 self-start sm:self-auto"
            onClick={() => { setForm(emptyForm()); setAddOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> إضافة مستخدم
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { Icon: UsersIcon, color: "text-primary",          bg: "bg-primary/10",       val: users.filter(u => !(u.pendingApproval && !u.active)).length, label: "الإجمالي" },
            { Icon: ShieldCheck, color: "text-emerald-600",    bg: "bg-emerald-500/10",   val: users.filter(u => u.active).length, label: "نشط" },
            { Icon: Shield,     color: "text-red-600",          bg: "bg-red-500/10",       val: users.filter(u => u.role === "admin").length, label: "مديرو النظام" },
            { Icon: Clock,      color: pendingCnt > 0 ? "text-amber-500" : "text-muted-foreground", bg: pendingCnt > 0 ? "bg-amber-500/20" : "bg-secondary", val: pendingCnt, label: "تفعيل الحساب" },
          ].map(({ Icon, color, bg, val, label }) => (
            <Card key={label} className={cn("border-border/50", label === "تفعيل الحساب" && pendingCnt > 0 && "border-amber-500/40 bg-amber-500/5")}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", bg)}>
                  <Icon className={cn("w-5 h-5", color)} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{val}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pending */}
        <PendingSection users={users} onActivateClick={setActivatingUser} onReject={handleReject} />

        {/* Search & Filter */}
        <Card className="border-border/50">
          <CardContent className="p-3 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input data-testid="input-search-users" placeholder="بحث بالاسم أو البريد..."
                value={search} onChange={(e) => setSearch(e.target.value)}
                className="pr-9 h-9 bg-secondary/50 border-0" />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="h-9 w-44 bg-secondary/50 border-0" data-testid="select-role-filter">
                  <SelectValue placeholder="كل الأدوار" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الأدوار</SelectItem>
                  {ALL_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{ROLE_LABELS[r].ar}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border-border/50 overflow-hidden">
          <div className="overflow-auto">
            <Table>
              <TableHeader className="bg-secondary/50">
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="text-right">المستخدم</TableHead>
                  <TableHead className="text-right hidden lg:table-cell">رقم الهوية</TableHead>
                  <TableHead className="text-right">الأدوار</TableHead>
                  <TableHead className="text-right hidden md:table-cell">الصلاحيات</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">تاريخ الإضافة</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-left">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      لا يوجد مستخدمون مطابقون
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((user) => (
                  <TableRow key={user.id} data-testid={`row-user-${user.id}`}
                    className="border-border/50 hover:bg-muted/30 transition-colors">
                    <TableCell className="text-right">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 font-bold text-primary text-sm">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right hidden lg:table-cell">
                      <span className="text-xs font-mono bg-secondary px-2 py-0.5 rounded text-muted-foreground">
                        {user.nationalId || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <RoleBadges user={user} />
                    </TableCell>
                    <TableCell className="text-right hidden md:table-cell">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium">{user.permissions.length}</span>
                        <span className="text-xs text-muted-foreground">/ {ALL_MODULES.length}</span>
                        <button onClick={() => setPermUser({ ...user, permissions: [...user.permissions] })}
                          className="ml-2 text-xs text-primary hover:underline" data-testid={`button-permissions-${user.id}`}>
                          تعديل
                        </button>
                      </div>
                    </TableCell>
                    <TableCell className="text-right hidden sm:table-cell">
                      <span className="text-xs text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString("ar-SA")}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Switch data-testid={`switch-active-${user.id}`}
                        checked={user.active} onCheckedChange={() => handleToggleActive(user)}
                        disabled={user.email === currentUser?.email} />
                    </TableCell>
                    <TableCell className="text-left">
                      <div className="flex items-center gap-1">
                        <Button data-testid={`button-edit-${user.id}`} variant="ghost" size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEdit(user)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button data-testid={`button-delete-${user.id}`} variant="ghost" size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteUser(user)} disabled={user.email === currentUser?.email}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="border-t border-border/50 p-3 text-xs text-muted-foreground bg-secondary/20">
            عرض {filtered.length} من {users.filter(u => !(u.pendingApproval && !u.active)).length} مستخدم
          </div>
        </Card>
      </div>

      {/* Activation Dialog */}
      {activatingUser && (
        <ActivationDialog user={activatingUser} onActivate={handleActivate} onClose={() => setActivatingUser(null)} />
      )}

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">إضافة مستخدم جديد</DialogTitle>
          </DialogHeader>
          <UserForm form={form} setForm={setForm} showPass={showPass} setShowPass={setShowPass} isNew />
          <DialogFooter className="flex-row-reverse gap-2">
            <Button onClick={handleAddSubmit} data-testid="button-confirm-add">حفظ المستخدم</Button>
            <Button variant="outline" onClick={() => setAddOpen(false)}>إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">تعديل المستخدم</DialogTitle>
          </DialogHeader>
          <UserForm form={form} setForm={setForm} showPass={showPass} setShowPass={setShowPass} />
          <DialogFooter className="flex-row-reverse gap-2">
            <Button onClick={handleEditSubmit} data-testid="button-confirm-edit">حفظ التعديلات</Button>
            <Button variant="outline" onClick={() => setEditUser(null)}>إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUser} onOpenChange={(o) => !o && setDeleteUser(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              هل أنت متأكد من حذف <strong>{deleteUser?.name}</strong>؟ لا يمكن التراجع.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">حذف</AlertDialogAction>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permissions Dialog */}
      <Dialog open={!!permUser} onOpenChange={(o) => !o && setPermUser(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              صلاحيات: {permUser?.name}
            </DialogTitle>
          </DialogHeader>
          {permUser && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <div className="flex flex-wrap gap-1">
                  {(permUser.roles || [permUser.role]).map((r) => (
                    <Badge key={r} variant="outline" className={cn("border-transparent text-xs", ROLE_LABELS[r].color)}>
                      {ROLE_LABELS[r].ar}
                    </Badge>
                  ))}
                </div>
                <Button size="sm" variant="outline" className="gap-1 shrink-0"
                  onClick={() => setPermUser({ ...permUser, permissions: mergePermissions(permUser.roles || [permUser.role]) })}>
                  <RefreshCw className="w-3 h-3" /> إعادة ضبط
                </Button>
              </div>
              {Object.entries(groupedModules).map(([cat, mods]) => (
                <div key={cat}>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    {MODULE_CATEGORIES[cat]?.ar}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {mods.map((mod) => {
                      const checked = permUser.permissions.includes(mod.id);
                      return (
                        <div key={mod.id}
                          className={cn("flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                            checked ? "bg-primary/5 border-primary/30" : "bg-card border-border/50 hover:bg-secondary/30")}
                          onClick={() => togglePermEdit(mod.id)} data-testid={`perm-${mod.id}`}>
                          <Checkbox checked={checked} onCheckedChange={() => togglePermEdit(mod.id)} className="pointer-events-none" />
                          <div>
                            <p className="text-sm font-medium">{mod.labelAr}</p>
                            <p className="text-xs text-muted-foreground">{mod.labelEn}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              <p className="text-sm text-muted-foreground text-right">
                {permUser.permissions.length} صلاحية من أصل {ALL_MODULES.length}
              </p>
            </div>
          )}
          <DialogFooter className="flex-row-reverse gap-2">
            <Button onClick={handlePermSave} data-testid="button-save-permissions">حفظ الصلاحيات</Button>
            <Button variant="outline" onClick={() => setPermUser(null)}>إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UserForm — supports multi-role selection
// ─────────────────────────────────────────────────────────────────────────────
function UserForm({ form, setForm, showPass, setShowPass, isNew = false }: {
  form: Partial<SystemUser>; setForm: (f: Partial<SystemUser>) => void;
  showPass: boolean; setShowPass: (v: boolean) => void; isNew?: boolean;
}) {
  const currentRoles: Role[] = form.roles && form.roles.length > 0 ? form.roles : (form.role ? [form.role] : ["viewer"]);

  const toggleRole = (role: Role) => {
    let updated: Role[];
    if (currentRoles.includes(role)) {
      if (currentRoles.length === 1) return; // keep at least one
      updated = currentRoles.filter((r) => r !== role);
    } else {
      updated = [...currentRoles, role];
    }
    const primary = getPrimaryRole(updated);
    setForm({ ...form, roles: updated, role: primary, permissions: mergePermissions(updated) });
  };

  const nationalIdVal = form.nationalId ?? "";
  const idOk = nationalIdVal.length === 0 || validateNationalId(nationalIdVal);

  return (
    <div className="space-y-4" dir="rtl">
      {/* National ID — Primary key */}
      <div className="space-y-1.5">
        <Label htmlFor="nationalId" className="flex items-center gap-1.5">
          رقم الهوية الوطنية *
          <span className="text-[10px] font-normal text-muted-foreground">(10 أرقام — يبدأ بـ 1 أو 2)</span>
        </Label>
        <div className="relative">
          <Input
            id="nationalId"
            data-testid="input-user-national-id"
            placeholder="1xxxxxxxxx"
            maxLength={10}
            style={{ direction: "ltr", textAlign: "left", letterSpacing: "0.08em" }}
            value={nationalIdVal}
            onChange={(e) => setForm({ ...form, nationalId: e.target.value.replace(/\D/g, "").slice(0, 10) })}
            className={cn(!idOk && nationalIdVal.length > 0 ? "border-destructive focus-visible:ring-destructive" : "")}
          />
        </div>
        {!idOk && nationalIdVal.length > 0 && (
          <p className="text-xs text-destructive">رقم الهوية غير صحيح — 10 أرقام يبدأ بـ 1 أو 2</p>
        )}
        {idOk && nationalIdVal.length === 10 && (
          <p className="text-xs text-emerald-600">✓ رقم الهوية صحيح</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">الاسم الكامل *</Label>
        <Input id="name" data-testid="input-user-name" placeholder="Ahmed Al-..."
          value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">البريد الإلكتروني *</Label>
        <Input id="email" data-testid="input-user-email" type="email" placeholder="user@scapex.sa"
          value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{isNew ? "كلمة المرور *" : "كلمة المرور الجديدة (اتركها فارغة للإبقاء)"}</Label>
        <div className="relative">
          <Input id="password" data-testid="input-user-password"
            type={showPass ? "text" : "password"}
            placeholder={isNew ? "كلمة المرور" : "اتركها فارغة لعدم التغيير"}
            value={form.password || ""} onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="pl-10" />
          <button type="button" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setShowPass(!showPass)}>
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Multi-role selection in form */}
      <div className="space-y-2">
        <Label>الأدوار الوظيفية * <span className="text-muted-foreground font-normal text-xs">(يمكن اختيار أكثر من دور)</span></Label>
        <div className="grid grid-cols-2 gap-1.5">
          {ASSIGNABLE_ROLES.map(({ role, ar }) => {
            const selected = currentRoles.includes(role);
            return (
              <div key={role}
                onClick={() => toggleRole(role)}
                className={cn(
                  "flex items-center gap-2 p-2.5 rounded-lg border-2 cursor-pointer transition-all text-sm",
                  selected ? "border-primary bg-primary/5" : "border-border/50 hover:border-border hover:bg-secondary/20"
                )}
                data-testid={`form-role-${role}`}
              >
                <Checkbox checked={selected} onCheckedChange={() => toggleRole(role)} className="pointer-events-none" />
                <span className={selected ? "font-medium" : "text-muted-foreground"}>{ar}</span>
              </div>
            );
          })}
          {/* Admin is special */}
          <div
            onClick={() => toggleRole("admin")}
            className={cn(
              "flex items-center gap-2 p-2.5 rounded-lg border-2 cursor-pointer transition-all text-sm col-span-2",
              currentRoles.includes("admin") ? "border-red-500 bg-red-500/5" : "border-border/50 hover:border-border hover:bg-secondary/20"
            )}
          >
            <Checkbox checked={currentRoles.includes("admin")} onCheckedChange={() => toggleRole("admin")} className="pointer-events-none" />
            <span className={currentRoles.includes("admin") ? "font-medium text-red-600" : "text-muted-foreground"}>مدير النظام</span>
            <span className="text-xs text-muted-foreground mr-auto">(صلاحيات كاملة)</span>
          </div>
        </div>
        {currentRoles.length > 1 && (
          <p className="text-xs text-blue-600">
            الدور الأساسي: <strong>{ROLE_LABELS[getPrimaryRole(currentRoles)].ar}</strong> — الصلاحيات مدمجة من جميع الأدوار
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
        <Switch data-testid="switch-user-active" id="active"
          checked={form.active ?? true} onCheckedChange={(v) => setForm({ ...form, active: v })} />
        <Label htmlFor="active" className="cursor-pointer">
          {form.active ? "الحساب نشط (مفعّل)" : "الحساب معطّل"}
        </Label>
      </div>
    </div>
  );
}
