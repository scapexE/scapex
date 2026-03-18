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
  UserCheck, UserX, Clock, Building, Hammer, UserCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type SystemUser, type Role,
  ALL_MODULES, ROLE_DEFAULTS, ROLE_LABELS,
  getUsers, saveUsers, canApproveRegistrations,
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

const ROLES: Role[] = ["admin", "manager", "accountant", "engineer", "hr_manager", "client", "viewer"];

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
const emptyForm = (): Partial<SystemUser> => ({
  name: "", email: "", password: "", role: "viewer",
  permissions: ROLE_DEFAULTS.viewer, active: true,
});

// ─────────────────────────────────────────────────────────────────────────────
// Activation Dialog — picks role category then specific role + permissions
// ─────────────────────────────────────────────────────────────────────────────
type RoleCategory = "client" | "employee" | "supervisor";

const EMPLOYEE_ROLES: { role: Role; ar: string; en: string }[] = [
  { role: "accountant",  ar: "محاسب",              en: "Accountant" },
  { role: "engineer",    ar: "مهندس",               en: "Engineer" },
  { role: "hr_manager",  ar: "مدير موارد بشرية",   en: "HR Manager" },
  { role: "viewer",      ar: "مشاهد (للقراءة فقط)", en: "Viewer" },
];

function ActivationDialog({
  user,
  onActivate,
  onClose,
}: {
  user: SystemUser;
  onActivate: (user: SystemUser, role: Role, permissions: string[]) => void;
  onClose: () => void;
}) {
  const [category, setCategory] = useState<RoleCategory | "">("");
  const [employeeRole, setEmployeeRole] = useState<Role>("accountant");
  const [permissions, setPermissions] = useState<string[]>([]);

  const resolvedRole = (): Role => {
    if (category === "client")     return "client";
    if (category === "supervisor") return "manager";
    if (category === "employee")   return employeeRole;
    return "viewer";
  };

  const handleCategoryChange = (cat: RoleCategory) => {
    setCategory(cat);
    const role: Role = cat === "client" ? "client" : cat === "supervisor" ? "manager" : "accountant";
    setEmployeeRole(role);
    setPermissions(ROLE_DEFAULTS[role]);
  };

  const handleEmployeeRoleChange = (role: Role) => {
    setEmployeeRole(role);
    setPermissions(ROLE_DEFAULTS[role]);
  };

  const togglePerm = (id: string) => {
    setPermissions((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const groupedModules = ALL_MODULES.reduce<Record<string, typeof ALL_MODULES>>((acc, mod) => {
    if (!acc[mod.category]) acc[mod.category] = [];
    acc[mod.category].push(mod); return acc;
  }, {});

  const finalRole = resolvedRole();

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
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-sm">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>

          {/* Step 1: Category */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">نوع الحساب</Label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: "client" as RoleCategory,     icon: Building,      ar: "عميل",   desc: "وصول لبوابة العملاء" },
                { key: "employee" as RoleCategory,    icon: Hammer,        ar: "موظف",   desc: "وصول لوحدات العمل" },
                { key: "supervisor" as RoleCategory,  icon: UserCircle2,   ar: "مشرف",   desc: "صلاحيات إدارية" },
              ].map(({ key, icon: Icon, ar, desc }) => (
                <button
                  key={key}
                  onClick={() => handleCategoryChange(key)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all cursor-pointer",
                    category === key
                      ? "border-primary bg-primary/10"
                      : "border-border/50 hover:border-border hover:bg-secondary/30"
                  )}
                >
                  <Icon className={cn("w-6 h-6", category === key ? "text-primary" : "text-muted-foreground")} />
                  <span className="font-semibold text-sm">{ar}</span>
                  <span className="text-[11px] text-muted-foreground text-center">{desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Employee sub-role */}
          {category === "employee" && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">تخصص الموظف</Label>
              <Select value={employeeRole} onValueChange={(v) => handleEmployeeRoleChange(v as Role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYEE_ROLES.map((er) => (
                    <SelectItem key={er.role} value={er.role}>
                      {er.ar} <span className="text-muted-foreground text-xs">({er.en})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Step 3: Permissions (shown after category is selected) */}
          {category && (
            <>
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">الصلاحيات</Label>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={cn("border-transparent text-xs", ROLE_LABELS[finalRole].color)}>
                    {ROLE_LABELS[finalRole].ar}
                  </Badge>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                    onClick={() => setPermissions(ROLE_DEFAULTS[finalRole])}>
                    <RefreshCw className="w-3 h-3" /> إعادة ضبط
                  </Button>
                </div>
              </div>

              <div className="space-y-4 border rounded-lg p-4 bg-secondary/20">
                {Object.entries(groupedModules).map(([cat, mods]) => (
                  <div key={cat}>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      {MODULE_CATEGORIES[cat]?.ar}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {mods.map((mod) => {
                        const checked = permissions.includes(mod.id);
                        return (
                          <div key={mod.id}
                            className={cn(
                              "flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors text-sm",
                              checked ? "bg-primary/5 border-primary/30" : "bg-card border-border/40 hover:bg-secondary/40"
                            )}
                            onClick={() => togglePerm(mod.id)}
                          >
                            <Checkbox checked={checked} onCheckedChange={() => togglePerm(mod.id)} className="pointer-events-none" />
                            <span className={checked ? "font-medium" : "text-muted-foreground"}>{mod.labelAr}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground text-left mt-2">
                  {permissions.length} صلاحية من {ALL_MODULES.length}
                </p>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex-row-reverse gap-2 mt-4">
          <Button
            disabled={!category}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            onClick={() => onActivate(user, finalRole, permissions)}
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
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center",
            pending.length > 0 ? "bg-amber-500/20" : "bg-secondary"
          )}>
            <Clock className={cn("w-4 h-4", pending.length > 0 ? "text-amber-500" : "text-muted-foreground")} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm">تفعيل الحساب</h3>
            <p className="text-xs text-muted-foreground">طلبات تسجيل تنتظر تحديد الدور وتفعيل الوصول</p>
          </div>
          {pending.length > 0 && (
            <Badge className="bg-amber-500 text-white border-0">{pending.length} طلب</Badge>
          )}
        </div>

        {pending.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            لا توجد حسابات تنتظر التفعيل
          </div>
        ) : (
          <div className="space-y-2">
            {pending.map((user) => (
              <div
                key={user.id}
                data-testid={`pending-row-${user.id}`}
                className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border/60"
              >
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
                  <Button
                    data-testid={`button-activate-${user.id}`}
                    size="sm"
                    className="h-8 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                    onClick={() => onActivateClick(user)}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    تفعيل
                  </Button>
                  <Button
                    data-testid={`button-reject-${user.id}`}
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1 text-destructive border-destructive/30 hover:bg-destructive/10 text-xs"
                    onClick={() => onReject(user)}
                  >
                    <UserX className="w-3.5 h-3.5" />
                    رفض
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
  const handleActivate = (user: SystemUser, role: Role, permissions: string[]) => {
    const updated = users.map((u) =>
      u.id === user.id ? { ...u, role, permissions, active: true, pendingApproval: false } : u
    );
    persist(updated);
    setActivatingUser(null);
    toast({ title: "تم التفعيل", description: `تم تفعيل حساب "${user.name}" كـ ${ROLE_LABELS[role].ar}` });
  };

  const handleReject = (user: SystemUser) => {
    persist(users.filter((u) => u.id !== user.id));
    toast({ title: "تم الرفض", description: `تم حذف طلب تسجيل "${user.name}"`, variant: "destructive" });
  };

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (u.pendingApproval && !u.active) return false;
      const matchSearch =
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase());
      const matchRole = roleFilter === "all" || u.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [users, search, roleFilter]);

  const handleAddSubmit = () => {
    if (!form.name || !form.email || !form.password) {
      toast({ title: "خطأ", description: "يرجى ملء جميع الحقول المطلوبة", variant: "destructive" }); return;
    }
    if (users.find((u) => u.email === form.email)) {
      toast({ title: "خطأ", description: "البريد الإلكتروني مستخدم مسبقاً", variant: "destructive" }); return;
    }
    const newUser: SystemUser = {
      id: generateId(), name: form.name!, email: form.email!, password: form.password!,
      role: form.role as Role, permissions: form.permissions || ROLE_DEFAULTS[form.role as Role],
      createdAt: new Date().toISOString(), active: form.active ?? true,
    };
    persist([...users, newUser]); setAddOpen(false); setForm(emptyForm());
    toast({ title: "تم بنجاح", description: `تمت إضافة "${newUser.name}"` });
  };

  const handleEditSubmit = () => {
    if (!editUser || !form.name || !form.email) {
      toast({ title: "خطأ", description: "يرجى ملء الحقول المطلوبة", variant: "destructive" }); return;
    }
    const updated = users.map((u) =>
      u.id === editUser.id
        ? { ...u, name: form.name!, email: form.email!, role: form.role as Role, permissions: form.permissions || [], active: form.active ?? true, ...(form.password ? { password: form.password } : {}) }
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

  const togglePerm = (modId: string) => {
    if (!permUser) return;
    const has = permUser.permissions.includes(modId);
    setPermUser({ ...permUser, permissions: has ? permUser.permissions.filter((p) => p !== modId) : [...permUser.permissions, modId] });
  };

  const groupedModules = ALL_MODULES.reduce<Record<string, typeof ALL_MODULES>>((acc, mod) => {
    if (!acc[mod.category]) acc[mod.category] = [];
    acc[mod.category].push(mod); return acc;
  }, {});

  const openEdit = (user: SystemUser) => {
    setForm({ name: user.name, email: user.email, password: "", role: user.role, permissions: [...user.permissions], active: user.active });
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
            <p className="text-muted-foreground mt-1 text-sm">مراجعة طلبات التسجيل وتحديد الدور قبل التفعيل</p>
          </div>
          <PendingSection users={users} onActivateClick={setActivatingUser} onReject={handleReject} />
        </div>
        {activatingUser && (
          <ActivationDialog
            user={activatingUser}
            onActivate={handleActivate}
            onClose={() => setActivatingUser(null)}
          />
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
            <p className="text-muted-foreground mt-1 text-sm">إضافة وتعديل وضبط صلاحيات مستخدمي النظام</p>
          </div>
          <Button
            data-testid="button-add-user"
            className="bg-primary hover:bg-primary/90 self-start sm:self-auto"
            onClick={() => { setForm(emptyForm()); setAddOpen(true); }}
          >
            <Plus className="w-4 h-4 mr-2" />
            إضافة مستخدم
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: UsersIcon, color: "text-primary", bg: "bg-primary/10",      val: users.filter(u => !(u.pendingApproval && !u.active)).length, label: "الإجمالي" },
            { icon: ShieldCheck, color: "text-emerald-600", bg: "bg-emerald-500/10", val: users.filter(u => u.active).length, label: "نشط" },
            { icon: Shield, color: "text-red-600", bg: "bg-red-500/10",         val: users.filter(u => u.role === "admin").length, label: "مديرو النظام" },
            { icon: Clock, color: pendingCnt > 0 ? "text-amber-500" : "text-muted-foreground", bg: pendingCnt > 0 ? "bg-amber-500/20" : "bg-secondary", val: pendingCnt, label: "تفعيل الحساب" },
          ].map(({ icon: Icon, color, bg, val, label }) => (
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

        {/* Pending Section */}
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
                  {ROLES.map((r) => (
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
                  <TableHead className="text-right">الدور</TableHead>
                  <TableHead className="text-right hidden md:table-cell">الصلاحيات</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">تاريخ الإضافة</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-left">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      لا يوجد مستخدمون مطابقون
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((user) => (
                  <TableRow key={user.id} data-testid={`row-user-${user.id}`} className="border-border/50 hover:bg-muted/30 transition-colors">
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
                    <TableCell className="text-right">
                      <Badge variant="outline" className={cn("border-transparent text-xs", ROLE_LABELS[user.role].color)}>
                        {ROLE_LABELS[user.role].ar}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right hidden md:table-cell">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium">{user.permissions.length}</span>
                        <span className="text-xs text-muted-foreground">/ {ALL_MODULES.length} وحدة</span>
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
        <ActivationDialog
          user={activatingUser}
          onActivate={handleActivate}
          onClose={() => setActivatingUser(null)}
        />
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
              <Badge variant="outline" className={cn("border-transparent text-xs mr-2", permUser ? ROLE_LABELS[permUser.role].color : "")}>
                {permUser ? ROLE_LABELS[permUser.role].ar : ""}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          {permUser && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <span className="text-sm text-muted-foreground">إعادة ضبط حسب الدور</span>
                <Button size="sm" variant="outline" className="gap-1"
                  onClick={() => setPermUser({ ...permUser, permissions: ROLE_DEFAULTS[permUser.role] })}>
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
                          onClick={() => togglePerm(mod.id)} data-testid={`perm-${mod.id}`}
                        >
                          <Checkbox checked={checked} onCheckedChange={() => togglePerm(mod.id)} className="pointer-events-none" />
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
// UserForm
// ─────────────────────────────────────────────────────────────────────────────
function UserForm({ form, setForm, showPass, setShowPass, isNew = false }: {
  form: Partial<SystemUser>; setForm: (f: Partial<SystemUser>) => void;
  showPass: boolean; setShowPass: (v: boolean) => void; isNew?: boolean;
}) {
  return (
    <div className="space-y-4" dir="rtl">
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
      <div className="space-y-2">
        <Label>الدور *</Label>
        <Select value={form.role} onValueChange={(v: Role) => setForm({ ...form, role: v, permissions: ROLE_DEFAULTS[v] })}>
          <SelectTrigger data-testid="select-user-role"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(["admin", "manager", "accountant", "engineer", "hr_manager", "client", "viewer"] as Role[]).map((r) => (
              <SelectItem key={r} value={r}>
                {ROLE_LABELS[r].ar} <span className="text-xs text-muted-foreground">({ROLE_LABELS[r].en})</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">الصلاحيات تُضبط تلقائياً حسب الدور.</p>
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
