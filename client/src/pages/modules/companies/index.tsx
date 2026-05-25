import { useState, useEffect, useCallback, useRef } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBusinessActivity, type BusinessActivity } from "@/contexts/BusinessActivityContext";
import { Checkbox } from "@/components/ui/checkbox";
import { getAllowedCompanyIds, getAllowedBranchIds, type SystemUser } from "@/lib/permissions";
import { dbGetItem } from "@/lib/dbStorage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, Plus, Search, Edit, Trash2, MapPin, Users, GitBranch, Layers, Pencil, Shield, ShieldOff, Eye, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ACTIVITY_COLOR_MAP, type ActivityColor } from "@/lib/activities";
import { ActivityIcon } from "@/components/ActivityIcon";
import { ActivityForm, ActivityFormHandle, ActivityAssignmentCard, emptyActivity } from "@/pages/SystemAdmin";

interface Company {
  id: string;
  nameAr: string;
  nameEn: string;
  crNumber: string;
  vatNumber: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  type: "main" | "subsidiary" | "branch";
  parentId: string | null;
  employeeCount: number;
  isActive: boolean;
  activityIds: string[];
  settings?: any;
}

interface Branch {
  id: string;
  companyId: string;
  nameAr: string;
  nameEn: string;
  city: string;
  address: string;
  phone: string;
  manager: string;
  managerId: string | null;
  employeeCount: number;
  isActive: boolean;
}

export default function CompaniesModule() {
  return (
    <MainLayout>
      <CompaniesContent />
    </MainLayout>
  );
}

function CompaniesContent() {
  const { dir, language } = useLanguage();
  const isRtl = dir === "rtl";
  const { toast } = useToast();
  const {
    activities, activeActivity,
    createActivity, updateActivity, deleteActivity, setActivityMembers, getActivityUserIds,
  } = useBusinessActivity();
  const currentUser: SystemUser | null = JSON.parse(dbGetItem("user") || "null");
  const isAdmin = currentUser?.role === "admin" || (currentUser?.roles ?? []).includes("admin");
  const allowedCompanyIds = getAllowedCompanyIds(currentUser);
  const allowedBranchIds = getAllowedBranchIds(currentUser);
  // Manage-activities dialog state (per-company)
  const [manageCompany, setManageCompany] = useState<Company | null>(null);
  const [allUsers, setAllUsers] = useState<SystemUser[]>([]);

  // Load users only when admin opens the manage dialog (cheap one-time fetch)
  useEffect(() => {
    if (!isAdmin) return;
    fetch("/api/users").then(r => r.ok ? r.json() : []).then((rows: any[]) => {
      const mapped: SystemUser[] = (rows || []).filter(u => u.isActive).map(u => ({
        id: u.id, name: u.name || u.username || "", email: u.email || "",
        nationalId: u.nationalId || "", password: "",
        role: (u.role || "viewer") as SystemUser["role"],
        roles: Array.isArray(u.roles) && u.roles.length ? u.roles : [u.role || "viewer"],
        permissions: Array.isArray(u.permissions) ? u.permissions : [],
        active: !!u.isActive, createdAt: u.createdAt || new Date().toISOString(),
      }));
      setAllUsers(mapped);
    }).catch(() => {});
  }, [isAdmin]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCompanyDialog, setShowCompanyDialog] = useState(false);
  const [showBranchDialog, setShowBranchDialog] = useState(false);
  const [editCompany, setEditCompany] = useState<Company | null>(null);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companyForm, setCompanyForm] = useState<Partial<Company>>({});
  const [branchForm, setBranchForm] = useState<Partial<Branch>>({});
  const [showNewActivityDialog, setShowNewActivityDialog] = useState(false);
  const newActivityFormRef = useRef<ActivityFormHandle>(null);

  const fetchData = useCallback(async () => {
    try {
      const [cRes, bRes] = await Promise.all([
        fetch("/api/companies"),
        fetch("/api/branches"),
      ]);
      const cData = cRes.ok ? await cRes.json() : [];
      const bData = bRes.ok ? await bRes.json() : [];
      const mapped: Company[] = cData.map((c: any) => ({
        id: String(c.id),
        nameAr: c.nameAr || c.name_ar || "",
        nameEn: c.nameEn || c.name_en || "",
        crNumber: c.crNumber || c.cr_number || "",
        vatNumber: c.vatNumber || c.vat_number || "",
        city: c.city || "",
        address: c.address || "",
        phone: c.phone || "",
        email: c.email || "",
        website: c.website || "",
        type: c.settings?.type || "subsidiary",
        parentId: c.settings?.parentId || null,
        employeeCount: c.settings?.employeeCount || 0,
        isActive: c.isActive ?? c.is_active ?? true,
        activityIds: Array.isArray(c.settings?.activityIds) ? c.settings.activityIds : [],
        settings: c.settings,
      }));
      const mappedB: Branch[] = bData.map((b: any) => ({
        id: String(b.id),
        companyId: String(b.companyId || b.company_id),
        nameAr: b.nameAr || b.name_ar || "",
        nameEn: b.nameEn || b.name_en || "",
        city: b.city || "",
        address: b.address || "",
        phone: b.phone || "",
        manager: b.managerName || b.manager_name || "",
        managerId: b.managerId || b.manager_id || null,
        employeeCount: 0,
        isActive: b.isActive ?? b.is_active ?? true,
      }));
      setCompanies(mapped);
      setBranches(mappedB);
    } catch (err) {
      console.error("Failed to fetch companies:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const t = (ar: string, en: string) => isRtl ? ar : en;

  const userScopedCompanies = allowedCompanyIds === null
    ? companies
    : companies.filter(c => allowedCompanyIds.includes(c.id));
  const activityFiltered = activeActivity
    ? userScopedCompanies.filter(c => Array.isArray(c.activityIds) && c.activityIds.includes(activeActivity.id))
    : userScopedCompanies;
  const activityFilteredIds = new Set(activityFiltered.map(c => c.id));
  const userScopedBranches = branches.filter(b => activityFilteredIds.has(b.companyId) && (allowedBranchIds === null || allowedBranchIds.includes(b.id)));
  const branchesInActivity = userScopedBranches;

  const totalEmployees = activityFiltered.reduce((s, c) => s + c.employeeCount, 0);
  const activeCompanies = activityFiltered.filter(c => c.isActive).length;
  const totalBranches = branchesInActivity.length;
  const mainCompany = activityFiltered.find(c => c.type === "main");

  const filteredCompanies = activityFiltered.filter(c => {
    const q = search.toLowerCase();
    return !q || c.nameAr.includes(q) || c.nameEn.toLowerCase().includes(q) || c.city.includes(q);
  });

  const companyBranches = selectedCompany ? branchesInActivity.filter(b => b.companyId === selectedCompany.id) : [];

  function openNewCompany() {
    setEditCompany(null);
    setCompanyForm({ type: "subsidiary", parentId: "", isActive: true });
    setShowCompanyDialog(true);
  }

  function openEditCompany(c: Company) {
    setEditCompany(c);
    setCompanyForm({ ...c, managerId: c.settings?.managerId || null } as any);
    setShowCompanyDialog(true);
  }

  async function saveCompany() {
    if (!companyForm.nameAr || !companyForm.nameEn) return;
    const managerUser = (companyForm as any).managerId
      ? allUsers.find(u => u.id === (companyForm as any).managerId)
      : null;
    const payload = {
      nameAr: companyForm.nameAr,
      nameEn: companyForm.nameEn,
      crNumber: companyForm.crNumber || "",
      vatNumber: companyForm.vatNumber || "",
      city: companyForm.city || "",
      address: companyForm.address || "",
      phone: companyForm.phone || "",
      email: companyForm.email || "",
      website: companyForm.website || "",
      isActive: companyForm.isActive ?? true,
      settings: {
        ...(editCompany?.settings || {}),
        type: companyForm.type || "subsidiary",
        parentId: companyForm.parentId,
        employeeCount: companyForm.employeeCount || 0,
        activityIds: companyForm.activityIds || [],
        managerId: (companyForm as any).managerId || null,
        managerName: managerUser ? managerUser.name : null,
      },
    };
    try {
      if (editCompany) {
        await fetch(`/api/companies/${editCompany.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      } else {
        await fetch("/api/companies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      }
      await fetchData();
      setShowCompanyDialog(false);
      toast({ title: t("تم الحفظ", "Saved"), description: t("تم حفظ بيانات الشركة", "Company data saved") });
    } catch { toast({ title: t("خطأ", "Error"), variant: "destructive" }); }
  }

  async function deleteCompany(id: string) {
    try {
      await fetch(`/api/companies/${id}`, { method: "DELETE" });
      await fetchData();
      toast({ title: t("تم الحذف", "Deleted") });
    } catch { toast({ title: t("خطأ", "Error"), variant: "destructive" }); }
  }

  function openNewBranch() {
    setEditBranch(null);
    setBranchForm({ companyId: selectedCompany?.id || "1", isActive: true });
    setShowBranchDialog(true);
  }

  function openEditBranch(b: Branch) {
    setEditBranch(b);
    setBranchForm({ ...b });
    setShowBranchDialog(true);
  }

  async function saveBranch() {
    if (!branchForm.nameAr || !branchForm.nameEn) return;
    // Derive the display name from the selected user if a managerId was picked.
    const managerUser = branchForm.managerId
      ? allUsers.find(u => u.id === branchForm.managerId)
      : null;
    const payload = {
      companyId: parseInt(branchForm.companyId || selectedCompany?.id || "1"),
      nameAr: branchForm.nameAr,
      nameEn: branchForm.nameEn,
      city: branchForm.city || "",
      address: branchForm.address || "",
      phone: branchForm.phone || "",
      managerId: branchForm.managerId || null,
      managerName: managerUser ? managerUser.name : (branchForm.manager || ""),
      isActive: branchForm.isActive ?? true,
    };
    try {
      if (editBranch) {
        await fetch(`/api/branches/${editBranch.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      } else {
        await fetch("/api/branches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      }
      await fetchData();
      setShowBranchDialog(false);
      toast({ title: t("تم الحفظ", "Saved") });
    } catch { toast({ title: t("خطأ", "Error"), variant: "destructive" }); }
  }

  async function deleteBranch(id: string) {
    try {
      await fetch(`/api/branches/${id}`, { method: "DELETE" });
      await fetchData();
      toast({ title: t("تم الحذف", "Deleted") });
    } catch { toast({ title: t("خطأ", "Error"), variant: "destructive" }); }
  }

  const typeLabel = (type: string) => {
    const map: Record<string, [string, string]> = { main: ["الشركة الأم", "Parent Company"], subsidiary: ["رئيسية", "Headquarters"], branch: ["فرع", "Branch"] };
    return t(map[type]?.[0] || type, map[type]?.[1] || type);
  };
  const typeColor = (type: string) => {
    const map: Record<string, string> = { main: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300", subsidiary: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300", branch: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" };
    return map[type] || "";
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  // Companies & their activities are admin-only territory.
  if (!isAdmin) {
    return (
      <div className="p-6" dir={dir}>
        <Card className="max-w-xl mx-auto border-amber-300 dark:border-amber-700/40">
          <CardContent className="py-10 text-center space-y-3">
            <ShieldOff className="h-10 w-10 text-amber-600 mx-auto" />
            <h2 className="text-lg font-bold">{t("صلاحية مدير النظام مطلوبة", "System Admin permission required")}</h2>
            <p className="text-sm text-muted-foreground">
              {t(
                "إنشاء وإدارة الشركات وأنشطتها متاح فقط لمدير النظام. الرجاء التواصل مع المدير.",
                "Creating and managing companies and their activities is restricted to the system administrator. Please contact your admin."
              )}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
      <div className="p-4 md:p-6 space-y-6" dir={dir}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-companies-title">
              <Building2 className="h-7 w-7 text-blue-600" />
              {t("إدارة الشركات والفروع", "Company & Branch Management")}
            </h1>
            <p className="text-muted-foreground mt-1">{t("نظام متعدد الشركات لإدارة الكيانات والفروع", "Multi-tenant system for managing entities and branches")}</p>
          </div>
          <Button onClick={openNewCompany} data-testid="button-add-company">
            <Plus className="h-4 w-4 me-2" /> {t("إضافة شركة", "Add Company")}
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30"><Building2 className="h-6 w-6 text-blue-600" /></div><div><p className="text-sm text-muted-foreground">{t("إجمالي الشركات", "Total Companies")}</p><p className="text-2xl font-bold" data-testid="text-total-companies">{companies.length}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/30"><CheckCircle2 className="h-6 w-6 text-green-600" /></div><div><p className="text-sm text-muted-foreground">{t("شركات نشطة", "Active Companies")}</p><p className="text-2xl font-bold" data-testid="text-active-companies">{activeCompanies}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-900/30"><GitBranch className="h-6 w-6 text-purple-600" /></div><div><p className="text-sm text-muted-foreground">{t("إجمالي الفروع", "Total Branches")}</p><p className="text-2xl font-bold" data-testid="text-total-branches">{totalBranches}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-3 rounded-xl bg-orange-100 dark:bg-orange-900/30"><Users className="h-6 w-6 text-orange-600" /></div><div><p className="text-sm text-muted-foreground">{t("إجمالي الموظفين", "Total Employees")}</p><p className="text-2xl font-bold" data-testid="text-total-employees">{totalEmployees}</p></div></div></CardContent></Card>
        </div>

        <Tabs defaultValue="companies" dir={dir}>
          <TabsList>
            <TabsTrigger value="companies">{t("الشركات", "Companies")}</TabsTrigger>
            <TabsTrigger value="branches">{t("الفروع", "Branches")}</TabsTrigger>
            <TabsTrigger value="structure">{t("الهيكل التنظيمي", "Org Structure")}</TabsTrigger>
          </TabsList>

          <TabsContent value="companies" className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className={cn("absolute top-2.5 h-4 w-4 text-muted-foreground", isRtl ? "right-3" : "left-3")} />
                <Input placeholder={t("بحث في الشركات...", "Search companies...")} value={search} onChange={e => setSearch(e.target.value)} className={cn(isRtl ? "pr-9" : "pl-9")} data-testid="input-search-companies" />
              </div>
            </div>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("الشركة", "Company")}</TableHead>
                    <TableHead>{t("النوع", "Type")}</TableHead>
                    <TableHead>{t("تتبع لـ", "Parent")}</TableHead>
                    <TableHead>{t("المدير المسؤول", "Manager")}</TableHead>
                    <TableHead>{t("السجل التجاري", "CR Number")}</TableHead>
                    <TableHead>{t("المدينة", "City")}</TableHead>
                    <TableHead>{t("الحالة", "Status")}</TableHead>
                    <TableHead>{t("إجراءات", "Actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCompanies.map(c => (
                    <TableRow key={c.id} data-testid={`row-company-${c.id}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{isRtl ? c.nameAr : c.nameEn}</p>
                          <p className="text-xs text-muted-foreground">{isRtl ? c.nameEn : c.nameAr}</p>
                        </div>
                      </TableCell>
                      <TableCell><Badge className={typeColor(c.type)} variant="secondary">{typeLabel(c.type)}</Badge></TableCell>
                      <TableCell className="text-sm">{c.parentId ? (() => { const p = companies.find(x => x.id === c.parentId); return p ? (isRtl ? p.nameAr : p.nameEn) : "-"; })() : t("مستقلة", "Independent")}</TableCell>
                      <TableCell className="text-sm">
                        {(() => {
                          const mId = c.settings?.managerId;
                          if (mId) { const u = allUsers.find(u => u.id === mId); return u ? u.name : (c.settings?.managerName || "—"); }
                          return c.settings?.managerName || <span className="text-muted-foreground">—</span>;
                        })()}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{c.crNumber}</TableCell>
                      <TableCell><div className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {c.city}</div></TableCell>
                      <TableCell><Badge variant={c.isActive ? "default" : "secondary"}>{c.isActive ? t("نشط", "Active") : t("غير نشط", "Inactive")}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" title={t("إدارة الأنشطة", "Manage Activities")} onClick={() => setManageCompany(c)} data-testid={`button-manage-activities-${c.id}`}><Layers className="h-4 w-4 text-primary" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => openEditCompany(c)} data-testid={`button-edit-company-${c.id}`}><Edit className="h-4 w-4" /></Button>
                          {c.type !== "main" && <Button variant="ghost" size="icon" onClick={() => deleteCompany(c.id)} data-testid={`button-delete-company-${c.id}`}><Trash2 className="h-4 w-4 text-red-500" /></Button>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="branches" className="space-y-4">
            <div className="flex justify-between items-center">
              <Select value={selectedCompany?.id || "all"} onValueChange={v => setSelectedCompany(v === "all" ? null : activityFiltered.find(c => c.id === v) || null)}>
                <SelectTrigger className="w-[250px]" data-testid="select-company-filter"><SelectValue placeholder={t("كل الشركات", "All Companies")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("كل الشركات", "All Companies")}</SelectItem>
                  {activityFiltered.map(c => <SelectItem key={c.id} value={c.id}>{isRtl ? c.nameAr : c.nameEn}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={openNewBranch} data-testid="button-add-branch"><Plus className="h-4 w-4 me-2" /> {t("إضافة فرع", "Add Branch")}</Button>
            </div>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("الفرع", "Branch")}</TableHead>
                    <TableHead>{t("الشركة الرئيسية", "Parent Company")}</TableHead>
                    <TableHead>{t("المدينة", "City")}</TableHead>
                    <TableHead>{t("المدير", "Manager")}</TableHead>
                    <TableHead>{t("الموظفين", "Employees")}</TableHead>
                    <TableHead>{t("الحالة", "Status")}</TableHead>
                    <TableHead>{t("إجراءات", "Actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(selectedCompany ? companyBranches : branches).map(b => {
                    const comp = companies.find(c => c.id === b.companyId);
                    return (
                      <TableRow key={b.id} data-testid={`row-branch-${b.id}`}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{isRtl ? b.nameAr : b.nameEn}</p>
                            <p className="text-xs text-muted-foreground">{isRtl ? b.nameEn : b.nameAr}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{comp ? (isRtl ? comp.nameAr : comp.nameEn) : "-"}</TableCell>
                        <TableCell><div className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {b.city}</div></TableCell>
                        <TableCell>
                          {b.managerId
                            ? (() => { const u = allUsers.find(u => u.id === b.managerId); return u ? u.name : b.manager; })()
                            : (b.manager || <span className="text-muted-foreground text-xs">{t("—", "—")}</span>)
                          }
                        </TableCell>
                        <TableCell>{b.employeeCount}</TableCell>
                        <TableCell><Badge variant={b.isActive ? "default" : "secondary"}>{b.isActive ? t("نشط", "Active") : t("غير نشط", "Inactive")}</Badge></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEditBranch(b)} data-testid={`button-edit-branch-${b.id}`}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteBranch(b.id)} data-testid={`button-delete-branch-${b.id}`}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="structure" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-bold mb-6">{t("الهيكل التنظيمي لمجموعة سكابكس", "Scapex Group Organization Structure")}</h3>
              <div className="space-y-4">
                {activityFiltered.filter(c => c.type === "main").map(main => (
                  <div key={main.id} className="space-y-3">
                    <div className="p-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                      <div className="flex items-center gap-3">
                        <Building2 className="h-8 w-8" />
                        <div>
                          <h4 className="text-lg font-bold">{isRtl ? main.nameAr : main.nameEn}</h4>
                          <p className="text-blue-100 text-sm">{t("الشركة الأم", "Parent Company")} • {main.city} • {main.employeeCount} {t("موظف", "employees")}</p>
                        </div>
                      </div>
                    </div>
                    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3", isRtl ? "mr-8" : "ml-8")}>
                      {companies.filter(c => c.parentId === main.id).map(sub => (
                        <div key={sub.id} className="space-y-2">
                          <div className="p-3 rounded-lg border-2 border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20">
                            <div className="flex items-center gap-2 mb-1">
                              <Building2 className="h-5 w-5 text-purple-600" />
                              <h5 className="font-semibold text-sm">{isRtl ? sub.nameAr : sub.nameEn}</h5>
                            </div>
                            <p className="text-xs text-muted-foreground">{t("رئيسية", "HQ")} • {sub.city} • {sub.employeeCount} {t("موظف", "emp")}</p>
                          </div>
                          <div className={cn("space-y-1", isRtl ? "mr-4" : "ml-4")}>
                            {branches.filter(b => b.companyId === sub.id).map(br => (
                              <div key={br.id} className="p-2 rounded border bg-card text-xs flex justify-between items-center">
                                <span>{isRtl ? br.nameAr : br.nameEn}</span>
                                <Badge variant="outline" className="text-[10px]">{br.employeeCount}</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className={cn("space-y-1", isRtl ? "mr-8" : "ml-8")}>
                      <p className="text-xs font-medium text-muted-foreground mb-1">{t("فروع الشركة الأم المباشرة:", "Main company direct branches:")}</p>
                      {branches.filter(b => b.companyId === main.id).map(br => (
                        <div key={br.id} className="p-2 rounded border bg-blue-50 dark:bg-blue-900/10 text-sm flex justify-between items-center">
                          <div className="flex items-center gap-2"><GitBranch className="h-3 w-3" /><span>{isRtl ? br.nameAr : br.nameEn}</span></div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{br.city}<Badge variant="outline" className="text-[10px]">{br.employeeCount}</Badge></div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={showCompanyDialog} onOpenChange={setShowCompanyDialog}>
          <DialogContent className="max-w-lg" dir={dir}>
            <DialogHeader><DialogTitle>{editCompany ? t("تعديل شركة", "Edit Company") : t("إضافة شركة جديدة", "Add New Company")}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{t("الاسم بالعربي", "Name (Arabic)")}</Label><Input value={companyForm.nameAr || ""} onChange={e => setCompanyForm(p => ({ ...p, nameAr: e.target.value }))} data-testid="input-company-name-ar" /></div>
                <div><Label>{t("الاسم بالإنجليزي", "Name (English)")}</Label><Input value={companyForm.nameEn || ""} onChange={e => setCompanyForm(p => ({ ...p, nameEn: e.target.value }))} data-testid="input-company-name-en" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{t("السجل التجاري", "CR Number")}</Label><Input value={companyForm.crNumber || ""} onChange={e => setCompanyForm(p => ({ ...p, crNumber: e.target.value }))} data-testid="input-company-cr" /></div>
                <div><Label>{t("الرقم الضريبي", "VAT Number")}</Label><Input value={companyForm.vatNumber || ""} onChange={e => setCompanyForm(p => ({ ...p, vatNumber: e.target.value }))} data-testid="input-company-vat" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{t("المدينة", "City")}</Label><Input value={companyForm.city || ""} onChange={e => setCompanyForm(p => ({ ...p, city: e.target.value }))} data-testid="input-company-city" /></div>
                <div><Label>{t("النوع", "Type")}</Label>
                  <Select value={companyForm.type || "subsidiary"} onValueChange={v => setCompanyForm(p => ({ ...p, type: v as Company["type"] }))}>
                    <SelectTrigger data-testid="select-company-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="subsidiary">{t("رئيسية", "Headquarters")}</SelectItem>
                      <SelectItem value="branch">{t("فرع", "Branch")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {companyForm.type !== "main" && (
                <div><Label>{t("الشركة الرئيسية التابع لها", "Parent Company")}</Label>
                  <Select value={companyForm.parentId || ""} onValueChange={v => setCompanyForm(p => ({ ...p, parentId: v === "none" ? "" : v }))}>
                    <SelectTrigger data-testid="select-parent-company"><SelectValue placeholder={t("اختر الشركة الرئيسية", "Select parent company")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("بدون شركة رئيسية (مستقلة)", "No parent (independent)")}</SelectItem>
                      {companies.filter(c => c.id !== editCompany?.id).map(c => <SelectItem key={c.id} value={c.id}>{isRtl ? c.nameAr : c.nameEn} {c.type === "main" ? t("(الأم)", "(Parent)") : ""}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div><Label>{t("العنوان", "Address")}</Label><Input value={companyForm.address || ""} onChange={e => setCompanyForm(p => ({ ...p, address: e.target.value }))} data-testid="input-company-address" /></div>
              <div><Label>{t("البريد الإلكتروني", "Email")}</Label><Input value={companyForm.email || ""} onChange={e => setCompanyForm(p => ({ ...p, email: e.target.value }))} data-testid="input-company-email" /></div>
              <div><Label>{t("الهاتف", "Phone")}</Label><Input value={companyForm.phone || ""} onChange={e => setCompanyForm(p => ({ ...p, phone: e.target.value }))} data-testid="input-company-phone" /></div>
              <div><Label>{t("الموقع الإلكتروني", "Website")}</Label><Input value={companyForm.website || ""} onChange={e => setCompanyForm(p => ({ ...p, website: e.target.value }))} data-testid="input-company-website" /></div>
              <div>
                <Label>{t("المدير المسؤول", "Responsible Manager")}</Label>
                <Select
                  value={(companyForm as any).managerId || "__none__"}
                  onValueChange={v => setCompanyForm(p => ({ ...p, managerId: v === "__none__" ? null : v } as any))}
                >
                  <SelectTrigger data-testid="select-company-manager">
                    <SelectValue placeholder={t("اختر مديراً", "Select a manager")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t("— بدون مدير —", "— No manager —")}</SelectItem>
                    {allUsers
                      .filter(u => !["client", "viewer"].includes(u.role))
                      .map(u => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name} <span className="text-muted-foreground text-xs ml-1">({t(u.role, u.role)})</span>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label>{t("الأنشطة التجارية", "Business Activities")}</Label>
                  {isAdmin && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowNewActivityDialog(true)}
                      data-testid="button-add-activity-catalog"
                      className="h-7 text-xs"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      {t("إضافة نشاط جديد", "Add new activity")}
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-2">{t("اختر الأنشطة التي تعمل بها هذه الشركة", "Select the activities this company operates in")}</p>
                <div className="grid grid-cols-2 gap-2 p-3 border rounded-md max-h-48 overflow-y-auto">
                  {(() => {
                    // Deduplicate by nameAr|nameEn so each unique activity shows
                    // once even if it's been instantiated per company in the DB.
                    const seen = new Set<string>();
                    const unique = activities
                      .filter(a => a.active)
                      .filter(a => {
                        const key = `${a.nameAr}|${a.nameEn}`;
                        if (seen.has(key)) return false;
                        seen.add(key);
                        return true;
                      });
                    return unique.map(a => {
                      // Treat all activities sharing this name as the same logical
                      // catalog item: checking adds every matching id, unchecking
                      // removes them all.
                      const sameNameIds = activities
                        .filter(x => x.nameAr === a.nameAr && x.nameEn === a.nameEn)
                        .map(x => x.id);
                      const checked = sameNameIds.some(id => (companyForm.activityIds || []).includes(id));
                      return (
                        <label key={a.id} className="flex items-center gap-2 cursor-pointer text-sm" data-testid={`checkbox-activity-${a.id}`}>
                          <Checkbox checked={checked} onCheckedChange={(v) => {
                            setCompanyForm(p => {
                              const cur = p.activityIds || [];
                              if (v) {
                                const merged = Array.from(new Set([...cur, ...sameNameIds]));
                                return { ...p, activityIds: merged };
                              }
                              return { ...p, activityIds: cur.filter(x => !sameNameIds.includes(x)) };
                            });
                          }} />
                          <span>{isRtl ? a.nameAr : a.nameEn}</span>
                        </label>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCompanyDialog(false)}>{t("إلغاء", "Cancel")}</Button>
              <Button onClick={saveCompany} data-testid="button-save-company">{t("حفظ", "Save")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Inline "add new activity to catalog" dialog (admin only) */}
        <Dialog open={showNewActivityDialog} onOpenChange={setShowNewActivityDialog}>
          <DialogContent className="max-w-lg" dir={dir}>
            <DialogHeader>
              <DialogTitle>{t("إضافة نشاط جديد", "Add new activity")}</DialogTitle>
            </DialogHeader>
            <ActivityForm ref={newActivityFormRef} initialForm={emptyActivity()} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewActivityDialog(false)}>
                {t("إلغاء", "Cancel")}
              </Button>
              <Button
                data-testid="button-save-new-activity"
                onClick={async () => {
                  const v = newActivityFormRef.current?.getValues();
                  if (!v?.nameAr || !v?.nameEn) {
                    toast({ title: t("اسم النشاط مطلوب", "Activity name is required"), variant: "destructive" });
                    return;
                  }
                  // Catalog-level activity: companyId left null so it appears
                  // for every company in the picker. Once a company adopts it,
                  // the admin can clone it per-company via Manage Activities.
                  const created = await createActivity({
                    nameAr: v.nameAr, nameEn: v.nameEn,
                    color: (v.color as ActivityColor) ?? "blue",
                    icon: v.icon ?? "HardHat",
                    modules: v.modules ?? ["dashboard"],
                    active: true,
                    companyId: null,
                    companyNameAr: null,
                    companyNameEn: null,
                    companyLogoUrl: null,
                  });
                  if (!created) {
                    toast({ title: t("تعذر الحفظ", "Save failed"), variant: "destructive" });
                    return;
                  }
                  toast({ title: t("تمت الإضافة", "Added") });
                  // Auto-select the new activity for the company being edited.
                  setCompanyForm(p => ({
                    ...p,
                    activityIds: Array.from(new Set([...(p.activityIds || []), created.id])),
                  }));
                  setShowNewActivityDialog(false);
                }}
              >
                {t("حفظ", "Save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {manageCompany && (
          <ManageCompanyActivitiesDialog
            company={manageCompany}
            isRtl={isRtl}
            t={t}
            onClose={() => setManageCompany(null)}
            allActivities={activities}
            allUsers={allUsers}
            createActivity={createActivity}
            updateActivity={updateActivity}
            deleteActivity={deleteActivity}
            setActivityMembers={setActivityMembers}
            getActivityUserIds={getActivityUserIds}
          />
        )}

        <Dialog open={showBranchDialog} onOpenChange={setShowBranchDialog}>
          <DialogContent className="max-w-lg" dir={dir}>
            <DialogHeader><DialogTitle>{editBranch ? t("تعديل فرع", "Edit Branch") : t("إضافة فرع جديد", "Add New Branch")}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{t("الاسم بالعربي", "Name (Arabic)")}</Label><Input value={branchForm.nameAr || ""} onChange={e => setBranchForm(p => ({ ...p, nameAr: e.target.value }))} data-testid="input-branch-name-ar" /></div>
                <div><Label>{t("الاسم بالإنجليزي", "Name (English)")}</Label><Input value={branchForm.nameEn || ""} onChange={e => setBranchForm(p => ({ ...p, nameEn: e.target.value }))} data-testid="input-branch-name-en" /></div>
              </div>
              <div><Label>{t("الشركة الرئيسية التابع لها", "Parent Company")}</Label>
                <Select value={branchForm.companyId || ""} onValueChange={v => setBranchForm(p => ({ ...p, companyId: v }))}>
                  <SelectTrigger data-testid="select-branch-company"><SelectValue /></SelectTrigger>
                  <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{isRtl ? c.nameAr : c.nameEn} {c.type === "main" ? t("(الأم)", "(Parent)") : ""}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{t("المدينة", "City")}</Label><Input value={branchForm.city || ""} onChange={e => setBranchForm(p => ({ ...p, city: e.target.value }))} data-testid="input-branch-city" /></div>
                <div>
                  <Label>{t("المدير", "Manager")}</Label>
                  <Select
                    value={branchForm.managerId || "__none__"}
                    onValueChange={v => setBranchForm(p => ({ ...p, managerId: v === "__none__" ? null : v }))}
                  >
                    <SelectTrigger data-testid="select-branch-manager">
                      <SelectValue placeholder={t("اختر مديراً", "Select a manager")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">{t("— بدون مدير —", "— No manager —")}</SelectItem>
                      {allUsers
                        .filter(u => !["client", "viewer"].includes(u.role))
                        .map(u => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name} <span className="text-muted-foreground text-xs ml-1">({t(u.role, u.role)})</span>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>{t("العنوان", "Address")}</Label><Input value={branchForm.address || ""} onChange={e => setBranchForm(p => ({ ...p, address: e.target.value }))} data-testid="input-branch-address" /></div>
              <div><Label>{t("الهاتف", "Phone")}</Label><Input value={branchForm.phone || ""} onChange={e => setBranchForm(p => ({ ...p, phone: e.target.value }))} data-testid="input-branch-phone" /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBranchDialog(false)}>{t("إلغاء", "Cancel")}</Button>
              <Button onClick={saveBranch} data-testid="button-save-branch">{t("حفظ", "Save")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  );
}

// ─── Manage Activities Dialog (per-company) ───────────────────────────────────
// Admin-only inline editor that lists every business activity belonging to a
// single company, with create/edit/delete and per-activity user assignment.
function ManageCompanyActivitiesDialog({
  company, isRtl, t, onClose,
  allActivities, allUsers,
  createActivity, updateActivity, deleteActivity,
  setActivityMembers, getActivityUserIds,
}: {
  company: Company;
  isRtl: boolean;
  t: (ar: string, en: string) => string;
  onClose: () => void;
  allActivities: BusinessActivity[];
  allUsers: SystemUser[];
  createActivity: (a: Partial<BusinessActivity>) => Promise<BusinessActivity | null>;
  updateActivity: (id: string, p: Partial<BusinessActivity>) => Promise<BusinessActivity | null>;
  deleteActivity: (id: string) => Promise<boolean>;
  setActivityMembers: (activityId: string, userIds: string[]) => Promise<boolean>;
  getActivityUserIds: (activityId: string) => string[];
}) {
  const { toast } = useToast();
  const companyIdNum = parseInt(company.id, 10);
  const companyActivities = allActivities.filter(
    a => a.companyId === companyIdNum,
  );

  const [addOpen, setAddOpen] = useState(false);
  const [editAct, setEditAct] = useState<BusinessActivity | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<BusinessActivity | null>(null);
  const addRef = useRef<ActivityFormHandle>(null);
  const editRef = useRef<ActivityFormHandle>(null);

  const handleAdd = async () => {
    const v = addRef.current?.getValues();
    if (!v?.nameAr || !v?.nameEn) {
      toast({ title: t("اسم النشاط مطلوب", "Activity name is required"), variant: "destructive" });
      return;
    }
    const created = await createActivity({
      nameAr: v.nameAr, nameEn: v.nameEn,
      color: (v.color as ActivityColor) ?? "blue",
      icon: v.icon ?? "HardHat",
      modules: v.modules ?? ["dashboard"],
      active: true,
      companyId: companyIdNum,
      companyNameAr: company.nameAr,
      companyNameEn: company.nameEn,
      companyLogoUrl: null,
    });
    if (!created) { toast({ title: t("تعذر الحفظ", "Save failed"), variant: "destructive" }); return; }
    toast({ title: t("تمت الإضافة", "Added") });
    setAddOpen(false);
  };

  const handleEdit = async () => {
    if (!editAct) return;
    const v = editRef.current?.getValues();
    if (!v?.nameAr || !v?.nameEn) {
      toast({ title: t("اسم النشاط مطلوب", "Activity name is required"), variant: "destructive" });
      return;
    }
    const updated = await updateActivity(editAct.id, {
      nameAr: v.nameAr, nameEn: v.nameEn,
      color: (v.color as ActivityColor) ?? editAct.color,
      icon: v.icon ?? editAct.icon,
      modules: v.modules ?? editAct.modules,
    });
    if (!updated) { toast({ title: t("تعذر الحفظ", "Save failed"), variant: "destructive" }); return; }
    toast({ title: t("تم التحديث", "Updated") });
    setEditAct(null);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const ok = await deleteActivity(confirmDelete.id);
    if (!ok) { toast({ title: t("تعذر الحذف", "Delete failed"), variant: "destructive" }); return; }
    toast({ title: t("تم الحذف", "Deleted") });
    setConfirmDelete(null);
  };

  const toggleActive = async (a: BusinessActivity) => {
    await updateActivity(a.id, { active: !a.active });
  };

  const toggleUser = async (activityId: string, userId: string) => {
    const cur = getActivityUserIds(activityId);
    const next = cur.includes(userId) ? cur.filter(x => x !== userId) : [...cur, userId];
    await setActivityMembers(activityId, next);
  };

  return (
    <>
      <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir={isRtl ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              {t("أنشطة شركة", "Activities of")} <span className="text-primary">{isRtl ? company.nameAr : company.nameEn}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {companyActivities.length} {t("نشاط", "activities")}
              </p>
              <Button size="sm" onClick={() => setAddOpen(true)} className="gap-2" data-testid="button-add-company-activity">
                <Plus className="h-4 w-4" /> {t("إضافة نشاط", "Add Activity")}
              </Button>
            </div>

            {companyActivities.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-border/50 rounded-lg">
                <Layers className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {t("لا توجد أنشطة لهذه الشركة. أضف نشاطها الأول.", "No activities yet. Add this company's first activity.")}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {companyActivities.map((act) => {
                  const c = ACTIVITY_COLOR_MAP[act.color as ActivityColor] ?? ACTIVITY_COLOR_MAP.blue;
                  const assignedCount = getActivityUserIds(act.id).length;
                  return (
                    <Card key={act.id} className={cn("border-2", act.active ? c.border : "border-border/40 opacity-70")}>
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", c.badge)}>
                            <ActivityIcon name={act.icon} className={cn("w-5 h-5", c.text)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="font-bold text-sm">{isRtl ? act.nameAr : act.nameEn}</h4>
                                <p className="text-xs text-muted-foreground">{isRtl ? act.nameEn : act.nameAr}</p>
                              </div>
                              <Switch checked={act.active} onCheckedChange={() => toggleActive(act)} />
                            </div>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              <Badge variant="outline" className={cn("border-transparent text-xs", c.badge, c.text)}>
                                {act.modules.length} {t("وحدة", "modules")}
                              </Badge>
                              <Badge variant="outline" className="border-transparent text-xs bg-secondary text-muted-foreground">
                                <Users className="w-3 h-3 mr-1" />{assignedCount} {t("مستخدم", "users")}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
                          <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs h-8" onClick={() => setEditAct(act)} data-testid={`button-edit-act-${act.id}`}>
                            <Pencil className="w-3.5 h-3.5" /> {t("تعديل", "Edit")}
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1 text-xs h-8 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setConfirmDelete(act)} data-testid={`button-delete-act-${act.id}`}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                        {/* Per-activity user assignment */}
                        <div className="mt-3">
                          <ActivityAssignmentCard
                            act={act}
                            allUsers={allUsers}
                            getActivityUserIds={getActivityUserIds}
                            isUserAssigned={(aid, uid) => getActivityUserIds(aid).includes(uid)}
                            toggleUserAssignment={toggleUser}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>{t("إغلاق", "Close")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add activity */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir={isRtl ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{t("إضافة نشاط جديد", "Add New Activity")} — {isRtl ? company.nameAr : company.nameEn}</DialogTitle>
          </DialogHeader>
          <ActivityForm key="add-act" ref={addRef} initialForm={emptyActivity()} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>{t("إلغاء", "Cancel")}</Button>
            <Button onClick={handleAdd} data-testid="button-save-new-activity">{t("حفظ", "Save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit activity */}
      {editAct && (
        <Dialog open onOpenChange={(o) => { if (!o) setEditAct(null); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir={isRtl ? "rtl" : "ltr"}>
            <DialogHeader>
              <DialogTitle>{t("تعديل النشاط", "Edit Activity")}</DialogTitle>
            </DialogHeader>
            <ActivityForm
              key={editAct.id}
              ref={editRef}
              initialForm={{
                nameAr: editAct.nameAr, nameEn: editAct.nameEn,
                color: editAct.color, icon: editAct.icon,
                modules: [...editAct.modules], active: editAct.active,
              }}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditAct(null)}>{t("إلغاء", "Cancel")}</Button>
              <Button onClick={handleEdit}>{t("حفظ", "Save")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Confirm delete */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => { if (!o) setConfirmDelete(null); }}>
        <AlertDialogContent dir={isRtl ? "rtl" : "ltr"}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("تأكيد الحذف", "Confirm Delete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                `سيتم حذف نشاط "${confirmDelete ? (isRtl ? confirmDelete.nameAr : confirmDelete.nameEn) : ''}" نهائياً. هذا الإجراء لا يمكن التراجع عنه.`,
                `Activity "${confirmDelete ? (isRtl ? confirmDelete.nameAr : confirmDelete.nameEn) : ''}" will be permanently deleted. This cannot be undone.`,
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("إلغاء", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("حذف", "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
