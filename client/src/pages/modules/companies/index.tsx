import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, Plus, Search, Edit, Trash2, MapPin, Users, GitBranch, Settings, Globe, Phone, Mail, FileText, CheckCircle2, XCircle, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

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
  employeeCount: number;
  isActive: boolean;
}

const SEED_COMPANIES: Company[] = [
  { id: "1", nameAr: "شركة سكابكس للمقاولات", nameEn: "Scapex Contracting Co.", crNumber: "1010234567", vatNumber: "300012345600003", city: "الرياض", address: "حي العليا، شارع الأمير محمد بن عبدالعزيز", phone: "+966112345678", email: "info@scapex.sa", website: "www.scapex.sa", type: "main", parentId: null, employeeCount: 156, isActive: true },
  { id: "2", nameAr: "سكابكس لأنظمة السلامة", nameEn: "Scapex Safety Systems", crNumber: "1010345678", vatNumber: "300012345600004", city: "جدة", address: "حي الروضة، طريق الملك فهد", phone: "+966122345678", email: "safety@scapex.sa", website: "www.scapex-safety.sa", type: "subsidiary", parentId: "1", employeeCount: 45, isActive: true },
  { id: "3", nameAr: "سكابكس للخدمات البيئية", nameEn: "Scapex Environmental Services", crNumber: "1010456789", vatNumber: "300012345600005", city: "الدمام", address: "حي الشاطئ، شارع الخليج", phone: "+966132345678", email: "env@scapex.sa", website: "www.scapex-env.sa", type: "subsidiary", parentId: "1", employeeCount: 32, isActive: true },
  { id: "4", nameAr: "سكابكس للبنية التحتية", nameEn: "Scapex Infrastructure", crNumber: "1010567890", vatNumber: "300012345600006", city: "الرياض", address: "حي النخيل، طريق الملك سلمان", phone: "+966114567890", email: "infra@scapex.sa", website: "www.scapex-infra.sa", type: "subsidiary", parentId: "1", employeeCount: 78, isActive: true },
];

const SEED_BRANCHES: Branch[] = [
  { id: "1", companyId: "1", nameAr: "المقر الرئيسي - الرياض", nameEn: "HQ - Riyadh", city: "الرياض", address: "حي العليا", phone: "+966112345678", manager: "أحمد الغامدي", employeeCount: 85, isActive: true },
  { id: "2", companyId: "1", nameAr: "فرع جدة", nameEn: "Jeddah Branch", city: "جدة", address: "حي الروضة", phone: "+966122345678", manager: "محمد القحطاني", employeeCount: 42, isActive: true },
  { id: "3", companyId: "1", nameAr: "فرع الدمام", nameEn: "Dammam Branch", city: "الدمام", address: "حي الشاطئ", phone: "+966132345678", manager: "خالد الزهراني", employeeCount: 29, isActive: true },
  { id: "4", companyId: "2", nameAr: "مكتب جدة - السلامة", nameEn: "Jeddah Safety Office", city: "جدة", address: "حي الصفا", phone: "+966122456789", manager: "فيصل العتيبي", employeeCount: 28, isActive: true },
  { id: "5", companyId: "2", nameAr: "مكتب الرياض - السلامة", nameEn: "Riyadh Safety Office", city: "الرياض", address: "حي الملقا", phone: "+966113456789", manager: "عبدالله الشهري", employeeCount: 17, isActive: true },
  { id: "6", companyId: "3", nameAr: "مكتب الدمام - البيئة", nameEn: "Dammam Env. Office", city: "الدمام", address: "حي الفيصلية", phone: "+966133456789", manager: "عمر الحربي", employeeCount: 32, isActive: true },
];

const STORAGE_COMPANIES = "scapex_mt_companies";
const STORAGE_BRANCHES = "scapex_mt_branches";
function load<T>(key: string, seed: T): T { try { const d = localStorage.getItem(key); return d ? JSON.parse(d) : seed; } catch { return seed; } }
function save(key: string, data: unknown) { localStorage.setItem(key, JSON.stringify(data)); }

export default function CompaniesModule() {
  const { dir, language } = useLanguage();
  const isRtl = dir === "rtl";
  const { toast } = useToast();
  const [companies, setCompanies] = useState<Company[]>(() => load(STORAGE_COMPANIES, SEED_COMPANIES));
  const [branches, setBranches] = useState<Branch[]>(() => load(STORAGE_BRANCHES, SEED_BRANCHES));
  const [search, setSearch] = useState("");
  const [showCompanyDialog, setShowCompanyDialog] = useState(false);
  const [showBranchDialog, setShowBranchDialog] = useState(false);
  const [editCompany, setEditCompany] = useState<Company | null>(null);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companyForm, setCompanyForm] = useState<Partial<Company>>({});
  const [branchForm, setBranchForm] = useState<Partial<Branch>>({});

  const t = (ar: string, en: string) => isRtl ? ar : en;

  const totalEmployees = companies.reduce((s, c) => s + c.employeeCount, 0);
  const activeCompanies = companies.filter(c => c.isActive).length;
  const totalBranches = branches.length;
  const mainCompany = companies.find(c => c.type === "main");

  const filteredCompanies = companies.filter(c => {
    const q = search.toLowerCase();
    return !q || c.nameAr.includes(q) || c.nameEn.toLowerCase().includes(q) || c.city.includes(q);
  });

  const companyBranches = selectedCompany ? branches.filter(b => b.companyId === selectedCompany.id) : [];

  function openNewCompany() {
    setEditCompany(null);
    setCompanyForm({ type: "subsidiary", parentId: mainCompany?.id || "1", isActive: true });
    setShowCompanyDialog(true);
  }

  function openEditCompany(c: Company) {
    setEditCompany(c);
    setCompanyForm({ ...c });
    setShowCompanyDialog(true);
  }

  function saveCompany() {
    if (!companyForm.nameAr || !companyForm.nameEn) return;
    let updated: Company[];
    if (editCompany) {
      updated = companies.map(c => c.id === editCompany.id ? { ...c, ...companyForm } as Company : c);
    } else {
      const nc: Company = { ...companyForm, id: Date.now().toString(), employeeCount: 0 } as Company;
      updated = [...companies, nc];
    }
    setCompanies(updated);
    save(STORAGE_COMPANIES, updated);
    setShowCompanyDialog(false);
    toast({ title: t("تم الحفظ", "Saved"), description: t("تم حفظ بيانات الشركة", "Company data saved") });
  }

  function deleteCompany(id: string) {
    const updated = companies.filter(c => c.id !== id);
    setCompanies(updated);
    save(STORAGE_COMPANIES, updated);
    const updBranches = branches.filter(b => b.companyId !== id);
    setBranches(updBranches);
    save(STORAGE_BRANCHES, updBranches);
    toast({ title: t("تم الحذف", "Deleted") });
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

  function saveBranch() {
    if (!branchForm.nameAr || !branchForm.nameEn) return;
    let updated: Branch[];
    if (editBranch) {
      updated = branches.map(b => b.id === editBranch.id ? { ...b, ...branchForm } as Branch : b);
    } else {
      const nb: Branch = { ...branchForm, id: Date.now().toString(), employeeCount: 0 } as Branch;
      updated = [...branches, nb];
    }
    setBranches(updated);
    save(STORAGE_BRANCHES, updated);
    setShowBranchDialog(false);
    toast({ title: t("تم الحفظ", "Saved") });
  }

  function deleteBranch(id: string) {
    const updated = branches.filter(b => b.id !== id);
    setBranches(updated);
    save(STORAGE_BRANCHES, updated);
    toast({ title: t("تم الحذف", "Deleted") });
  }

  const typeLabel = (type: string) => {
    const map: Record<string, [string, string]> = { main: ["الشركة الأم", "Main Company"], subsidiary: ["شركة تابعة", "Subsidiary"], branch: ["فرع", "Branch"] };
    return t(map[type]?.[0] || type, map[type]?.[1] || type);
  };
  const typeColor = (type: string) => {
    const map: Record<string, string> = { main: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300", subsidiary: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300", branch: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" };
    return map[type] || "";
  };

  return (
    <MainLayout>
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
                    <TableHead>{t("السجل التجاري", "CR Number")}</TableHead>
                    <TableHead>{t("المدينة", "City")}</TableHead>
                    <TableHead>{t("الموظفين", "Employees")}</TableHead>
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
                      <TableCell className="font-mono text-sm">{c.crNumber}</TableCell>
                      <TableCell><div className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {c.city}</div></TableCell>
                      <TableCell>{c.employeeCount}</TableCell>
                      <TableCell><Badge variant={c.isActive ? "default" : "secondary"}>{c.isActive ? t("نشط", "Active") : t("غير نشط", "Inactive")}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setSelectedCompany(c)} data-testid={`button-view-company-${c.id}`}><Eye className="h-4 w-4" /></Button>
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
              <Select value={selectedCompany?.id || "all"} onValueChange={v => setSelectedCompany(v === "all" ? null : companies.find(c => c.id === v) || null)}>
                <SelectTrigger className="w-[250px]" data-testid="select-company-filter"><SelectValue placeholder={t("كل الشركات", "All Companies")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("كل الشركات", "All Companies")}</SelectItem>
                  {companies.map(c => <SelectItem key={c.id} value={c.id}>{isRtl ? c.nameAr : c.nameEn}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={openNewBranch} data-testid="button-add-branch"><Plus className="h-4 w-4 me-2" /> {t("إضافة فرع", "Add Branch")}</Button>
            </div>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("الفرع", "Branch")}</TableHead>
                    <TableHead>{t("الشركة", "Company")}</TableHead>
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
                        <TableCell>{b.manager}</TableCell>
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
                {companies.filter(c => c.type === "main").map(main => (
                  <div key={main.id} className="space-y-3">
                    <div className="p-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                      <div className="flex items-center gap-3">
                        <Building2 className="h-8 w-8" />
                        <div>
                          <h4 className="text-lg font-bold">{isRtl ? main.nameAr : main.nameEn}</h4>
                          <p className="text-blue-100 text-sm">{typeLabel(main.type)} • {main.city} • {main.employeeCount} {t("موظف", "employees")}</p>
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
                            <p className="text-xs text-muted-foreground">{sub.city} • {sub.employeeCount} {t("موظف", "emp")}</p>
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
                      <SelectItem value="subsidiary">{t("شركة تابعة", "Subsidiary")}</SelectItem>
                      <SelectItem value="branch">{t("فرع", "Branch")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>{t("البريد الإلكتروني", "Email")}</Label><Input value={companyForm.email || ""} onChange={e => setCompanyForm(p => ({ ...p, email: e.target.value }))} data-testid="input-company-email" /></div>
              <div><Label>{t("الهاتف", "Phone")}</Label><Input value={companyForm.phone || ""} onChange={e => setCompanyForm(p => ({ ...p, phone: e.target.value }))} data-testid="input-company-phone" /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCompanyDialog(false)}>{t("إلغاء", "Cancel")}</Button>
              <Button onClick={saveCompany} data-testid="button-save-company">{t("حفظ", "Save")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showBranchDialog} onOpenChange={setShowBranchDialog}>
          <DialogContent className="max-w-lg" dir={dir}>
            <DialogHeader><DialogTitle>{editBranch ? t("تعديل فرع", "Edit Branch") : t("إضافة فرع جديد", "Add New Branch")}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{t("الاسم بالعربي", "Name (Arabic)")}</Label><Input value={branchForm.nameAr || ""} onChange={e => setBranchForm(p => ({ ...p, nameAr: e.target.value }))} data-testid="input-branch-name-ar" /></div>
                <div><Label>{t("الاسم بالإنجليزي", "Name (English)")}</Label><Input value={branchForm.nameEn || ""} onChange={e => setBranchForm(p => ({ ...p, nameEn: e.target.value }))} data-testid="input-branch-name-en" /></div>
              </div>
              <div><Label>{t("الشركة", "Company")}</Label>
                <Select value={branchForm.companyId || ""} onValueChange={v => setBranchForm(p => ({ ...p, companyId: v }))}>
                  <SelectTrigger data-testid="select-branch-company"><SelectValue /></SelectTrigger>
                  <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{isRtl ? c.nameAr : c.nameEn}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{t("المدينة", "City")}</Label><Input value={branchForm.city || ""} onChange={e => setBranchForm(p => ({ ...p, city: e.target.value }))} data-testid="input-branch-city" /></div>
                <div><Label>{t("المدير", "Manager")}</Label><Input value={branchForm.manager || ""} onChange={e => setBranchForm(p => ({ ...p, manager: e.target.value }))} data-testid="input-branch-manager" /></div>
              </div>
              <div><Label>{t("الهاتف", "Phone")}</Label><Input value={branchForm.phone || ""} onChange={e => setBranchForm(p => ({ ...p, phone: e.target.value }))} data-testid="input-branch-phone" /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBranchDialog(false)}>{t("إلغاء", "Cancel")}</Button>
              <Button onClick={saveBranch} data-testid="button-save-branch">{t("حفظ", "Save")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
