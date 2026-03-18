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

// ── Pending Approvals Section ──────────────────────────────────────────────
function PendingApprovals({
  users, onApprove, onReject,
}: {
  users: SystemUser[];
  onApprove: (user: SystemUser) => void;
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
            <h3 className="font-semibold text-sm">طلبات تسجيل العملاء المعلّقة</h3>
            <p className="text-xs text-muted-foreground">تحتاج إلى موافقة لتفعيل الوصول لبوابة العملاء</p>
          </div>
          {pending.length > 0 && (
            <Badge className="bg-amber-500 text-white border-0">{pending.length} طلب</Badge>
          )}
        </div>

        {pending.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            لا توجد طلبات تسجيل معلّقة
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
                    سُجِّل في: {new Date(user.createdAt).toLocaleDateString("ar-SA")}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    data-testid={`button-approve-${user.id}`}
                    size="sm"
                    className="h-8 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                    onClick={() => onApprove(user)}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    قبول
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

// ── Main Page ──────────────────────────────────────────────────────────────
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
  const [form, setForm] = useState<Partial<SystemUser>>(emptyForm());
  const [showPass, setShowPass] = useState(false);

  // Access control: admin gets full access; approvers get pending-only view
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

  const persist = (updated: SystemUser[]) => {
    setUsers(updated);
    saveUsers(updated);
  };

  // ── Pending approval handlers ───────────────────────────────────────────
  const handleApprove = (user: SystemUser) => {
    const updated = users.map((u) =>
      u.id === user.id ? { ...u, active: true, pendingApproval: false } : u
    );
    persist(updated);
    toast({ title: "تم الاعتماد", description: `تم تفعيل حساب "${user.name}" بنجاح` });
  };

  const handleReject = (user: SystemUser) => {
    persist(users.filter((u) => u.id !== user.id));
    toast({ title: "تم الرفض", description: `تم حذف طلب تسجيل "${user.name}"`, variant: "destructive" });
  };

  // ── Filtered list (active users only in the main table) ─────────────────
  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (u.pendingApproval && !u.active) return false; // shown separately
      const matchSearch =
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase());
      const matchRole = roleFilter === "all" || u.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [users, search, roleFilter]);

  // ── Admin-only handlers ─────────────────────────────────────────────────
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
    persist([...users, newUser]);
    setAddOpen(false); setForm(emptyForm());
    toast({ title: "تم بنجاح", description: `تمت إضافة المستخدم "${newUser.name}"` });
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
      const newCurrent = updated.find((u) => u.id === editUser.id);
      if (newCurrent) localStorage.setItem("user", JSON.stringify(newCurrent));
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
    persist(users.filter((u) => u.id !== deleteUser.id));
    setDeleteUser(null);
    toast({ title: "تم الحذف", description: `تم حذف المستخدم "${deleteUser.name}"` });
  };

  const handleToggleActive = (user: SystemUser) => {
    if (user.email === currentUser?.email) return;
    const updated = users.map((u) => u.id === user.id ? { ...u, active: !u.active } : u);
    persist(updated);
  };

  const handlePermSave = () => {
    if (!permUser) return;
    const updated = users.map((u) => u.id === permUser.id ? { ...u, permissions: permUser.permissions } : u);
    persist(updated); setPermUser(null);
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

  const activeCnt = users.filter((u) => u.active).length;
  const pendingCnt = users.filter((u) => u.pendingApproval && !u.active).length;

  // ── Approver-only view (not admin) ──────────────────────────────────────
  if (!isAdmin && canApprove) {
    return (
      <MainLayout>
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">اعتماد طلبات التسجيل</h1>
            <p className="text-muted-foreground mt-1 text-sm">مراجعة وقبول أو رفض طلبات تسجيل العملاء الجدد</p>
          </div>
          <PendingApprovals users={users} onApprove={handleApprove} onReject={handleReject} />
        </div>
      </MainLayout>
    );
  }

  // ── Admin full view ──────────────────────────────────────────────────────
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
          <Card className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <UsersIcon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{users.length}</p>
                <p className="text-xs text-muted-foreground">الإجمالي</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeCnt}</p>
                <p className="text-xs text-muted-foreground">نشط</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{users.filter((u) => u.role === "admin").length}</p>
                <p className="text-xs text-muted-foreground">مديرو النظام</p>
              </div>
            </CardContent>
          </Card>
          <Card className={cn("border-border/50", pendingCnt > 0 && "border-amber-500/40 bg-amber-500/5")}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", pendingCnt > 0 ? "bg-amber-500/20" : "bg-secondary")}>
                <Clock className={cn("w-5 h-5", pendingCnt > 0 ? "text-amber-500" : "text-muted-foreground")} />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingCnt}</p>
                <p className="text-xs text-muted-foreground">طلبات معلّقة</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Approvals */}
        <PendingApprovals users={users} onApprove={handleApprove} onReject={handleReject} />

        {/* Search & Filter */}
        <Card className="border-border/50">
          <CardContent className="p-3 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                data-testid="input-search-users"
                placeholder="بحث بالاسم أو البريد..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-9 h-9 bg-secondary/50 border-0"
              />
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

        {/* Users Table */}
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
                        <button
                          onClick={() => setPermUser({ ...user, permissions: [...user.permissions] })}
                          className="ml-2 text-xs text-primary hover:underline"
                          data-testid={`button-permissions-${user.id}`}
                        >
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
                      <Switch
                        data-testid={`switch-active-${user.id}`}
                        checked={user.active}
                        onCheckedChange={() => handleToggleActive(user)}
                        disabled={user.email === currentUser?.email}
                      />
                    </TableCell>
                    <TableCell className="text-left">
                      <div className="flex items-center gap-1">
                        <Button
                          data-testid={`button-edit-${user.id}`}
                          variant="ghost" size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => openEdit(user)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          data-testid={`button-delete-${user.id}`}
                          variant="ghost" size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteUser(user)}
                          disabled={user.email === currentUser?.email}
                        >
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
            عرض {filtered.length} من {users.filter((u) => !(u.pendingApproval && !u.active)).length} مستخدم
          </div>
        </Card>
      </div>

      {/* Add User Dialog */}
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

      {/* Edit User Dialog */}
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
              هل أنت متأكد من حذف المستخدم <strong>{deleteUser?.name}</strong>؟ لا يمكن التراجع عن هذه العملية.
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
                          onClick={() => togglePerm(mod.id)}
                          data-testid={`perm-${mod.id}`}
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
              <div className="text-sm text-muted-foreground text-right">
                {permUser.permissions.length} صلاحية محددة من أصل {ALL_MODULES.length}
              </div>
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

function UserForm({ form, setForm, showPass, setShowPass, isNew = false }: {
  form: Partial<SystemUser>; setForm: (f: Partial<SystemUser>) => void;
  showPass: boolean; setShowPass: (v: boolean) => void; isNew?: boolean;
}) {
  const handleRoleChange = (role: Role) => {
    setForm({ ...form, role, permissions: ROLE_DEFAULTS[role] });
  };
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
        <Select value={form.role} onValueChange={(v) => handleRoleChange(v as Role)}>
          <SelectTrigger data-testid="select-user-role"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(["admin", "manager", "accountant", "engineer", "hr_manager", "client", "viewer"] as Role[]).map((r) => (
              <SelectItem key={r} value={r}>
                <div className="flex items-center gap-2">
                  <span>{ROLE_LABELS[r].ar}</span>
                  <span className="text-xs text-muted-foreground">({ROLE_LABELS[r].en})</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">سيتم ضبط الصلاحيات تلقائياً حسب الدور. يمكنك تعديلها لاحقاً.</p>
      </div>
      <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
        <Switch data-testid="switch-user-active" id="active"
          checked={form.active ?? true} onCheckedChange={(v) => setForm({ ...form, active: v })} />
        <Label htmlFor="active" className="cursor-pointer">
          الحساب نشط {form.active ? "(مفعّل)" : "(معطّل)"}
        </Label>
      </div>
    </div>
  );
}
