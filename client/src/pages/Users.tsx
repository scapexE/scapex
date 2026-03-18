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
import { useLanguage } from "@/contexts/LanguageContext";

const MODULE_CATEGORIES: Record<string, { ar: string; en: string }> = {
  core:        { ar: "النظام الأساسي",   en: "Core" },
  business:    { ar: "الأعمال والمالية", en: "Business & Finance" },
  operations:  { ar: "العمليات",         en: "Operations" },
  engineering: { ar: "الهندسة",          en: "Engineering" },
  hr:          { ar: "الموارد البشرية",  en: "HR" },
  system:      { ar: "النظام",           en: "System" },
};

// Roles available for assignment (admin is system-only)
const ASSIGNABLE_ROLES: { role: Role; ar: string; en: string; descAr: string; descEn: string }[] = [
  { role: "manager",    ar: "مشرف / مدير",          en: "Manager / Supervisor", descAr: "صلاحيات إدارية وإشرافية",        descEn: "Administrative and supervisory access" },
  { role: "accountant", ar: "محاسب",                 en: "Accountant",           descAr: "المحاسبة والمالية",               descEn: "Accounting and finance" },
  { role: "engineer",   ar: "مهندس",                 en: "Engineer",             descAr: "المشاريع والهندسة والميدان",      descEn: "Projects, engineering and field work" },
  { role: "hr_manager", ar: "مدير موارد بشرية",      en: "HR Manager",           descAr: "الموارد البشرية والرواتب",        descEn: "Human resources and payroll" },
  { role: "client",     ar: "عميل",                  en: "Client",               descAr: "بوابة العملاء فقط",               descEn: "Client portal access only" },
  { role: "viewer",     ar: "مشاهد",                 en: "Viewer",               descAr: "قراءة فقط بدون تعديل",            descEn: "Read-only, no editing" },
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
  const { t, dir } = useLanguage();
  const isRtl = dir === 'rtl';
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir={dir}>
        <DialogHeader>
          <DialogTitle className="text-right flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-600" />
            {t("users.pending.title")} — {user.name}
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
                {isRtl ? ROLE_LABELS[primaryRole].ar : ROLE_LABELS[primaryRole].en}
                {selectedRoles.length > 1 && ` +${selectedRoles.length - 1}`}
              </Badge>
            )}
          </div>

          {/* Role Selection (multi-check) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">{t("users.form.roles")}</Label>
              <span className="text-xs text-muted-foreground">{t("users.form.roles_hint")}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ASSIGNABLE_ROLES.map(({ role, ar, en, descAr, descEn }) => {
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
                        <p className="font-semibold text-sm">{isRtl ? ar : en}</p>
                        {selected && (
                          <Badge variant="outline" className={cn("border-transparent text-[10px] px-1.5", ROLE_LABELS[role].color)}>
                            {ROLE_LABELS[role].en}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{isRtl ? descAr : descEn}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedRoles.length > 1 && (
              <div className="flex flex-wrap gap-1.5 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                <span className="text-xs text-blue-600 font-medium w-full mb-1">
                  {isRtl ? "الأدوار المدمجة:" : "Combined roles:"}
                </span>
                {selectedRoles.map((r) => (
                  <Badge key={r} variant="outline" className={cn("border-transparent text-xs", ROLE_LABELS[r].color)}>
                    {isRtl ? ROLE_LABELS[r].ar : ROLE_LABELS[r].en}
                  </Badge>
                ))}
                <span className="text-xs text-muted-foreground w-full mt-0.5">
                  {t("users.form.primary_role")} <strong>{isRtl ? ROLE_LABELS[getPrimaryRole(selectedRoles)].ar : ROLE_LABELS[getPrimaryRole(selectedRoles)].en}</strong> {isRtl ? "— سيحصل على صلاحيات جميع الأدوار مجمّعة" : "— permissions merged from all roles"}
                </span>
              </div>
            )}
          </div>

          {/* Permissions */}
          {selectedRoles.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">{t("users.col.permissions")}</Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{permissions.length} / {ALL_MODULES.length}</span>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={resetPermissions}>
                    <RefreshCw className="w-3 h-3" /> {t("users.perms.reset")}
                  </Button>
                </div>
              </div>
              {customPerm && (
                <p className="text-xs text-amber-600 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
                  {isRtl
                    ? '✏️ تم تعديل الصلاحيات يدوياً — اضغط "إعادة ضبط" للرجوع للصلاحيات الافتراضية'
                    : '✏️ Permissions manually modified — click "Reset" to restore defaults'}
                </p>
              )}
              <div className="border rounded-xl overflow-hidden">
                {Object.entries(groupedModules).map(([cat, mods], catIdx) => (
                  <div key={cat} className={cn("p-3", catIdx > 0 && "border-t border-border/50")}>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      {isRtl ? MODULE_CATEGORIES[cat]?.ar : MODULE_CATEGORIES[cat]?.en}
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
                              {isRtl ? mod.labelAr : mod.labelEn}
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
            {t("users.btn.confirm_activate")}
          </Button>
          <Button variant="outline" onClick={onClose}>{t("users.btn.cancel")}</Button>
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
  const { t, dir } = useLanguage();
  const isRtl = dir === 'rtl';
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
            <h3 className="font-semibold text-sm">{t("users.pending.title")}</h3>
            <p className="text-xs text-muted-foreground">{t("users.pending.desc")}</p>
          </div>
          {pending.length > 0 && (
            <Badge className="bg-amber-500 text-white border-0">{pending.length} {t("users.pending.request")}</Badge>
          )}
        </div>

        {pending.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">{t("users.pending.empty")}</div>
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
                    {t("users.pending.reg_date")} {new Date(user.createdAt).toLocaleDateString(isRtl ? "ar-SA" : "en-GB")}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button data-testid={`button-activate-${user.id}`}
                    size="sm" className="h-8 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                    onClick={() => onActivateClick(user)}>
                    <UserCheck className="w-3.5 h-3.5" /> {t("users.btn.activate")}
                  </Button>
                  <Button data-testid={`button-reject-${user.id}`}
                    size="sm" variant="outline"
                    className="h-8 gap-1 text-destructive border-destructive/30 hover:bg-destructive/10 text-xs"
                    onClick={() => onReject(user)}>
                    <UserX className="w-3.5 h-3.5" /> {t("users.btn.reject")}
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
  const { dir } = useLanguage();
  const isRtl = dir === 'rtl';
  const allRoles = user.roles && user.roles.length > 0 ? user.roles : [user.role];
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? allRoles : allRoles.slice(0, 2);
  const extra = allRoles.length - 2;

  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((r) => (
        <Badge key={r} variant="outline" className={cn("border-transparent text-xs", ROLE_LABELS[r].color)}>
          {isRtl ? ROLE_LABELS[r].ar : ROLE_LABELS[r].en}
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
  const { t, dir } = useLanguage();
  const isRtl = dir === 'rtl';
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
            <p className="text-lg font-semibold text-muted-foreground">{t("users.no_access")}</p>
            <p className="text-sm text-muted-foreground">{t("users.no_access_desc")}</p>
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
    const roleNames = roles.map((r) => isRtl ? ROLE_LABELS[r].ar : ROLE_LABELS[r].en).join(" + ");
    toast({
      title: isRtl ? "تم التفعيل" : "Activated",
      description: isRtl ? `تم تفعيل "${user.name}" بأدوار: ${roleNames}` : `"${user.name}" activated with roles: ${roleNames}`
    });
  };

  const handleReject = (user: SystemUser) => {
    persist(users.filter((u) => u.id !== user.id));
    toast({
      title: isRtl ? "تم الرفض" : "Rejected",
      description: isRtl ? `تم حذف طلب "${user.name}"` : `Request from "${user.name}" has been rejected`,
      variant: "destructive"
    });
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
      toast({ title: isRtl ? "خطأ" : "Error", description: isRtl ? "يرجى ملء جميع الحقول المطلوبة (الهوية، الاسم، البريد، كلمة المرور)" : "Please fill all required fields (ID, name, email, password)", variant: "destructive" }); return;
    }
    if (!validateNationalId(form.nationalId)) {
      toast({ title: isRtl ? "رقم الهوية غير صحيح" : "Invalid National ID", description: isRtl ? "يجب أن يكون رقم الهوية 10 أرقام ويبدأ بـ 1 أو 2" : "ID must be 10 digits starting with 1 or 2", variant: "destructive" }); return;
    }
    if (users.find((u) => u.nationalId === form.nationalId)) {
      toast({ title: isRtl ? "خطأ" : "Error", description: isRtl ? "رقم الهوية مسجّل مسبقاً" : "National ID already exists", variant: "destructive" }); return;
    }
    if (users.find((u) => u.email === form.email)) {
      toast({ title: isRtl ? "خطأ" : "Error", description: isRtl ? "البريد مستخدم مسبقاً" : "Email already in use", variant: "destructive" }); return;
    }
    const roles = form.roles && form.roles.length > 0 ? form.roles : [form.role as Role];
    const primary = getPrimaryRole(roles);
    const newUser: SystemUser = {
      id: generateId(), nationalId: form.nationalId!, name: form.name!, email: form.email!, password: form.password!,
      role: primary, roles, permissions: form.permissions || mergePermissions(roles),
      createdAt: new Date().toISOString(), active: form.active ?? true,
    };
    persist([...users, newUser]); setAddOpen(false); setForm(emptyForm());
    toast({ title: isRtl ? "تم بنجاح" : "Success", description: isRtl ? `تمت إضافة "${newUser.name}"` : `"${newUser.name}" has been added` });
  };

  const handleEditSubmit = () => {
    if (!editUser || !form.nationalId || !form.name || !form.email) {
      toast({ title: isRtl ? "خطأ" : "Error", description: isRtl ? "يرجى ملء الحقول المطلوبة" : "Please fill all required fields", variant: "destructive" }); return;
    }
    if (!validateNationalId(form.nationalId)) {
      toast({ title: isRtl ? "رقم الهوية غير صحيح" : "Invalid National ID", description: isRtl ? "يجب أن يكون رقم الهوية 10 أرقام ويبدأ بـ 1 أو 2" : "ID must be 10 digits starting with 1 or 2", variant: "destructive" }); return;
    }
    const dupId = users.find((u) => u.nationalId === form.nationalId && u.id !== editUser.id);
    if (dupId) { toast({ title: isRtl ? "خطأ" : "Error", description: isRtl ? "رقم الهوية مسجّل لمستخدم آخر" : "National ID belongs to another user", variant: "destructive" }); return; }
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
    toast({ title: isRtl ? "تم بنجاح" : "Success", description: isRtl ? "تم تحديث بيانات المستخدم" : "User data updated successfully" });
  };

  const handleDelete = () => {
    if (!deleteUser) return;
    if (deleteUser.email === currentUser?.email) {
      toast({ title: isRtl ? "خطأ" : "Error", description: isRtl ? "لا يمكنك حذف حسابك الحالي" : "You cannot delete your own account", variant: "destructive" });
      setDeleteUser(null); return;
    }
    persist(users.filter((u) => u.id !== deleteUser.id)); setDeleteUser(null);
    toast({ title: isRtl ? "تم الحذف" : "Deleted", description: isRtl ? `تم حذف "${deleteUser.name}"` : `"${deleteUser.name}" has been deleted` });
  };

  const handleToggleActive = (user: SystemUser) => {
    if (user.email === currentUser?.email) return;
    persist(users.map((u) => u.id === user.id ? { ...u, active: !u.active } : u));
  };

  const handlePermSave = () => {
    if (!permUser) return;
    persist(users.map((u) => u.id === permUser.id ? { ...u, permissions: permUser.permissions } : u));
    setPermUser(null);
    toast({ title: isRtl ? "تم بنجاح" : "Success", description: isRtl ? "تم حفظ الصلاحيات" : "Permissions saved successfully" });
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
            <h1 className="text-2xl font-bold tracking-tight">{t("users.pending.title")}</h1>
            <p className="text-muted-foreground mt-1 text-sm">{t("users.pending.desc")}</p>
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
            <h1 className="text-2xl font-bold tracking-tight">{t("users.title")}</h1>
            <p className="text-muted-foreground mt-1 text-sm">{t("users.desc")}</p>
          </div>
          <Button data-testid="button-add-user"
            className="bg-primary hover:bg-primary/90 self-start sm:self-auto"
            onClick={() => { setForm(emptyForm()); setAddOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> {t("users.add")}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { Icon: UsersIcon, color: "text-primary",          bg: "bg-primary/10",       val: users.filter(u => !(u.pendingApproval && !u.active)).length, labelKey: "users.stat.total" },
            { Icon: ShieldCheck, color: "text-emerald-600",    bg: "bg-emerald-500/10",   val: users.filter(u => u.active).length, labelKey: "users.stat.active" },
            { Icon: Shield,     color: "text-red-600",          bg: "bg-red-500/10",       val: users.filter(u => u.role === "admin").length, labelKey: "users.stat.admins" },
            { Icon: Clock,      color: pendingCnt > 0 ? "text-amber-500" : "text-muted-foreground", bg: pendingCnt > 0 ? "bg-amber-500/20" : "bg-secondary", val: pendingCnt, labelKey: "users.stat.pending" },
          ].map(({ Icon, color, bg, val, labelKey }) => (
            <Card key={labelKey} className={cn("border-border/50", labelKey === "users.stat.pending" && pendingCnt > 0 && "border-amber-500/40 bg-amber-500/5")}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", bg)}>
                  <Icon className={cn("w-5 h-5", color)} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{val}</p>
                  <p className="text-xs text-muted-foreground">{t(labelKey)}</p>
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
              <Input data-testid="input-search-users" placeholder={t("users.search")}
                value={search} onChange={(e) => setSearch(e.target.value)}
                className="pr-9 h-9 bg-secondary/50 border-0" />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="h-9 w-44 bg-secondary/50 border-0" data-testid="select-role-filter">
                  <SelectValue placeholder={t("users.all_roles")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("users.all_roles")}</SelectItem>
                  {ALL_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{isRtl ? ROLE_LABELS[r].ar : ROLE_LABELS[r].en}</SelectItem>
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
                  <TableHead className="text-right">{t("users.col.user")}</TableHead>
                  <TableHead className="text-right hidden lg:table-cell">{t("users.col.national_id")}</TableHead>
                  <TableHead className="text-right">{t("users.col.roles")}</TableHead>
                  <TableHead className="text-right hidden md:table-cell">{t("users.col.permissions")}</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">{t("users.col.created")}</TableHead>
                  <TableHead className="text-right">{t("users.col.status")}</TableHead>
                  <TableHead className="text-left">{t("users.col.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      {t("users.no_results")}
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
                          {t("users.edit")}
                        </button>
                      </div>
                    </TableCell>
                    <TableCell className="text-right hidden sm:table-cell">
                      <span className="text-xs text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString(isRtl ? "ar-SA" : "en-GB")}
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
            {t("users.showing")} {filtered.length} {t("users.of")} {users.filter(u => !(u.pendingApproval && !u.active)).length} {t("users.user")}
          </div>
        </Card>
      </div>

      {/* Activation Dialog */}
      {activatingUser && (
        <ActivationDialog user={activatingUser} onActivate={handleActivate} onClose={() => setActivatingUser(null)} />
      )}

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir={dir}>
          <DialogHeader>
            <DialogTitle className="text-right">{t("users.dialog.add")}</DialogTitle>
          </DialogHeader>
          <UserForm form={form} setForm={setForm} showPass={showPass} setShowPass={setShowPass} isNew />
          <DialogFooter className="flex-row-reverse gap-2">
            <Button onClick={handleAddSubmit} data-testid="button-confirm-add">{t("users.btn.save")}</Button>
            <Button variant="outline" onClick={() => setAddOpen(false)}>{t("users.btn.cancel")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir={dir}>
          <DialogHeader>
            <DialogTitle className="text-right">{t("users.dialog.edit")}</DialogTitle>
          </DialogHeader>
          <UserForm form={form} setForm={setForm} showPass={showPass} setShowPass={setShowPass} />
          <DialogFooter className="flex-row-reverse gap-2">
            <Button onClick={handleEditSubmit} data-testid="button-confirm-edit">{t("users.btn.save_edit")}</Button>
            <Button variant="outline" onClick={() => setEditUser(null)}>{t("users.btn.cancel")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUser} onOpenChange={(o) => !o && setDeleteUser(null)}>
        <AlertDialogContent dir={dir}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">{t("users.dialog.delete")}</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              {t("users.dialog.delete_desc")} <strong>{deleteUser?.name}</strong>؟ {t("users.dialog.delete_warn")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">{t("users.btn.delete")}</AlertDialogAction>
            <AlertDialogCancel>{t("users.btn.cancel")}</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permissions Dialog */}
      <Dialog open={!!permUser} onOpenChange={(o) => !o && setPermUser(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" dir={dir}>
          <DialogHeader>
            <DialogTitle className="text-right flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              {t("users.perms.title")}: {permUser?.name}
            </DialogTitle>
          </DialogHeader>
          {permUser && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <div className="flex flex-wrap gap-1">
                  {(permUser.roles || [permUser.role]).map((r) => (
                    <Badge key={r} variant="outline" className={cn("border-transparent text-xs", ROLE_LABELS[r].color)}>
                      {isRtl ? ROLE_LABELS[r].ar : ROLE_LABELS[r].en}
                    </Badge>
                  ))}
                </div>
                <Button size="sm" variant="outline" className="gap-1 shrink-0"
                  onClick={() => setPermUser({ ...permUser, permissions: mergePermissions(permUser.roles || [permUser.role]) })}>
                  <RefreshCw className="w-3 h-3" /> {t("users.perms.reset")}
                </Button>
              </div>
              {Object.entries(groupedModules).map(([cat, mods]) => (
                <div key={cat}>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    {isRtl ? MODULE_CATEGORIES[cat]?.ar : MODULE_CATEGORIES[cat]?.en}
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
                            <p className="text-sm font-medium">{isRtl ? mod.labelAr : mod.labelEn}</p>
                            <p className="text-xs text-muted-foreground">{isRtl ? mod.labelEn : mod.labelAr}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              <p className="text-sm text-muted-foreground text-right">
                {permUser.permissions.length} {isRtl ? "صلاحية من أصل" : "permissions out of"} {ALL_MODULES.length}
              </p>
            </div>
          )}
          <DialogFooter className="flex-row-reverse gap-2">
            <Button onClick={handlePermSave} data-testid="button-save-permissions">{t("users.btn.save_perms")}</Button>
            <Button variant="outline" onClick={() => setPermUser(null)}>{t("users.btn.cancel")}</Button>
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
  const { t, dir } = useLanguage();
  const isRtl = dir === 'rtl';
  const currentRoles: Role[] = form.roles && form.roles.length > 0 ? form.roles : (form.role ? [form.role] : ["viewer"]);

  const toggleRole = (role: Role) => {
    let updated: Role[];
    if (currentRoles.includes(role)) {
      if (currentRoles.length === 1) return;
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
    <div className="space-y-4" dir={dir}>
      {/* National ID */}
      <div className="space-y-1.5">
        <Label htmlFor="nationalId" className="flex items-center gap-1.5">
          {t("users.form.national_id")}
          <span className="text-[10px] font-normal text-muted-foreground">({t("users.form.national_id_hint")})</span>
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
          <p className="text-xs text-destructive">{t("users.form.national_id_err")}</p>
        )}
        {idOk && nationalIdVal.length === 10 && (
          <p className="text-xs text-emerald-600">{t("users.form.national_id_ok")}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">{t("users.form.name")}</Label>
        <Input id="name" data-testid="input-user-name" placeholder="Ahmed Al-..."
          value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">{t("users.form.email")}</Label>
        <Input id="email" data-testid="input-user-email" type="email" placeholder="user@scapex.sa"
          value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{isNew ? t("users.form.password_new") : t("users.form.password_edit")}</Label>
        <div className="relative">
          <Input id="password" data-testid="input-user-password"
            type={showPass ? "text" : "password"}
            placeholder={isNew ? t("users.form.password_ph_new") : t("users.form.password_ph_edit")}
            value={form.password || ""} onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="pl-10" />
          <button type="button" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setShowPass(!showPass)}>
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Multi-role selection */}
      <div className="space-y-2">
        <Label>{t("users.form.roles")} <span className="text-muted-foreground font-normal text-xs">{t("users.form.roles_hint")}</span></Label>
        <div className="grid grid-cols-2 gap-1.5">
          {ASSIGNABLE_ROLES.map(({ role, ar, en }) => {
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
                <span className={selected ? "font-medium" : "text-muted-foreground"}>{isRtl ? ar : en}</span>
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
            <span className={currentRoles.includes("admin") ? "font-medium text-red-600" : "text-muted-foreground"}>{t("users.form.admin_role")}</span>
            <span className="text-xs text-muted-foreground mr-auto">{t("users.form.admin_full")}</span>
          </div>
        </div>
        {currentRoles.length > 1 && (
          <p className="text-xs text-blue-600">
            {t("users.form.primary_role")} <strong>{isRtl ? ROLE_LABELS[getPrimaryRole(currentRoles)].ar : ROLE_LABELS[getPrimaryRole(currentRoles)].en}</strong> {t("users.form.merged_perms")}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
        <Switch data-testid="switch-user-active" id="active"
          checked={form.active ?? true} onCheckedChange={(v) => setForm({ ...form, active: v })} />
        <Label htmlFor="active" className="cursor-pointer">
          {form.active ? t("users.form.active") : t("users.form.inactive")}
        </Label>
      </div>
    </div>
  );
}
