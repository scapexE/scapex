import { dbGetItem, dbSetItem, dbRemoveItem } from "@/lib/dbStorage";
import { useState, useCallback, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Building2, MapPin, Phone, Mail, Globe, Clock, Save, RotateCcw,
  Plus, Pencil, Trash2, GitBranch, FileText, Shield,
  Info, Landmark, AlertCircle, Settings2, Printer, Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  type AboutSettings, DEFAULT_ABOUT, getAboutData,
  type SystemSettings, type FontFamily, type FontSize,
  DEFAULT_SYSTEM_SETTINGS, getSystemSettings, saveSystemSettings,
  FONT_OPTIONS, FONT_SIZE_OPTIONS,
} from "@/lib/companySettings";
import { logAction } from "@/lib/auditLog";
import { type SystemUser, getAllowedCompanyIds } from "@/lib/permissions";
import { useBusinessActivity } from "@/contexts/BusinessActivityContext";

function SettingsField({ label, value, onChange, textarea, dir: fieldDir, placeholder, disabled }: {
  label: string; value: string; onChange: (val: string) => void; textarea?: boolean; dir?: string; placeholder?: string; disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {textarea ? (
        <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className="text-sm" dir={fieldDir} placeholder={placeholder} disabled={disabled} />
      ) : (
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="text-sm" dir={fieldDir} placeholder={placeholder} disabled={disabled} />
      )}
    </div>
  );
}

export default function CompanySettingsModule() {
  return (
    <MainLayout>
      <CompanySettingsContent />
    </MainLayout>
  );
}

function CompanySettingsContent() {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";
  const t = (ar: string, en: string) => isRtl ? ar : en;
  const { toast } = useToast();
  const currentUser: SystemUser | null = JSON.parse(dbGetItem("user") || "null");
  const isAdmin = currentUser?.role === "admin";

  const { activeActivity } = useBusinessActivity();
  const allowedCompanyIds = getAllowedCompanyIds(currentUser);

  const [form, setForm] = useState<AboutSettings>(getAboutData);
  const [sysForm, setSysForm] = useState<SystemSettings>(getSystemSettings);
  const [hasChanges, setHasChanges] = useState(false);
  const [hasSysChanges, setHasSysChanges] = useState(false);
  const [branchDialogOpen, setBranchDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any | null>(null);
  const [branchForm, setBranchForm] = useState<any>({
    nameAr: "", nameEn: "", city: "", address: "", phone: "", managerName: "", isActive: true,
  });
  const [allCompanies, setAllCompanies] = useState<any[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [dbBranches, setDbBranches] = useState<any[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);

  // Companies visible to this user, filtered by active activity
  const visibleCompanies = (() => {
    let list = allCompanies;
    if (allowedCompanyIds !== null) {
      list = list.filter((c) => allowedCompanyIds.includes(String(c.id)));
    }
    if (activeActivity) {
      list = list.filter((c) => Array.isArray(c.settings?.activityIds) && c.settings.activityIds.includes(activeActivity.id));
    }
    return list;
  })();

  const loadBranches = useCallback(async (companyId: number) => {
    try {
      const res = await fetch(`/api/branches?companyId=${companyId}`);
      if (res.ok) setDbBranches(await res.json());
    } catch {}
  }, []);

  // Load all companies once
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/companies");
        if (res.ok && active) setAllCompanies(await res.json());
      } catch {}
    })();
    return () => { active = false; };
  }, []);

  // When the visible-companies list changes (activity switch / data load), pick a sensible selection
  useEffect(() => {
    if (visibleCompanies.length === 0) {
      setSelectedCompanyId(null);
      return;
    }
    if (selectedCompanyId && visibleCompanies.some((c) => c.id === selectedCompanyId)) return;
    const main = visibleCompanies.find((c) => c.settings?.type === "main") || visibleCompanies[0];
    setSelectedCompanyId(main.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allCompanies, activeActivity?.id]);

  // Load form + branches whenever selected company changes
  useEffect(() => {
    if (!selectedCompanyId) return;
    const company = allCompanies.find((c) => c.id === selectedCompanyId);
    if (!company) return;
    const about = company.settings?.about as Partial<AboutSettings> | undefined;
    setForm({
      ...DEFAULT_ABOUT,
      ...(about || {}),
      companyNameAr: about?.companyNameAr ?? company.nameAr ?? DEFAULT_ABOUT.companyNameAr,
      companyNameEn: about?.companyNameEn ?? company.nameEn ?? DEFAULT_ABOUT.companyNameEn,
      crNumber: about?.crNumber ?? company.crNumber ?? "",
      vatNumber: about?.vatNumber ?? company.vatNumber ?? "",
      address: about?.address ?? company.address ?? "",
      phone1: about?.phone1 ?? company.phone ?? "",
      email1: about?.email1 ?? company.email ?? "",
      website: about?.website ?? company.website ?? "",
    });
    setHasChanges(false);
    setBranchesLoading(true);
    loadBranches(selectedCompanyId).finally(() => setBranchesLoading(false));
  }, [selectedCompanyId, allCompanies, loadBranches]);

  const updateField = useCallback((key: keyof AboutSettings, val: string) => {
    setForm(prev => ({ ...prev, [key]: val }));
    setHasChanges(true);
  }, []);

  const updateSysField = useCallback((key: keyof SystemSettings, val: string) => {
    setSysForm(prev => ({ ...prev, [key]: val }));
    setHasSysChanges(true);
  }, []);

  const handleSave = async () => {
    if (!selectedCompanyId) {
      toast({ title: t("لم يتم تحديد شركة", "No company selected"), variant: "destructive" });
      return;
    }
    const company = allCompanies.find((c) => c.id === selectedCompanyId);
    if (!company) return;
    try {
      const res = await fetch(`/api/companies/${selectedCompanyId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nameAr: form.companyNameAr,
          nameEn: form.companyNameEn,
          crNumber: form.crNumber,
          vatNumber: form.vatNumber,
          address: form.address,
          phone: form.phone1,
          email: form.email1,
          website: form.website,
          settings: { ...(company.settings || {}), about: form },
        }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setAllCompanies((prev) => prev.map((c) => (c.id === selectedCompanyId ? updated : c)));
      // Mirror to local cache only when this is the user's primary company (keeps About page snappy)
      if (company.settings?.type === "main") {
        dbSetItem("scapex_about_settings", JSON.stringify(form));
      }
      setHasChanges(false);
      logAction("update", "company_settings", `Updated company ${form.companyNameEn}`, `تم تحديث بيانات الشركة ${form.companyNameAr}`);
      window.dispatchEvent(new CustomEvent("scapex_company_update"));
      toast({
        title: t("تم الحفظ بنجاح", "Saved Successfully"),
        description: t("تم تحديث بيانات الشركة المختارة", "Selected company data updated"),
      });
    } catch {
      toast({ title: t("فشل الحفظ", "Save failed"), variant: "destructive" });
    }
  };

  const handleReset = () => {
    setForm({ ...DEFAULT_ABOUT });
    dbRemoveItem("scapex_about_settings");
    setHasChanges(false);
    window.dispatchEvent(new CustomEvent("scapex_company_update"));
    toast({ title: t("تم الاستعادة", "Reset"), description: t("تمت استعادة القيم الافتراضية", "Default values restored") });
  };

  const handleSaveSys = () => {
    saveSystemSettings(sysForm);
    setHasSysChanges(false);
    logAction("update", "system_settings", "Updated system settings", "تم تحديث إعدادات النظام");
    toast({
      title: t("تم الحفظ", "Saved"),
      description: t("تم تحديث إعدادات النظام بنجاح", "System settings updated successfully"),
    });
  };

  const handleResetSys = () => {
    setSysForm({ ...DEFAULT_SYSTEM_SETTINGS });
    dbRemoveItem("scapex_system_settings");
    setHasSysChanges(false);
    window.dispatchEvent(new CustomEvent("scapex_system_settings_update"));
    toast({ title: t("تم الاستعادة", "Reset"), description: t("تمت استعادة الإعدادات الافتراضية", "Default settings restored") });
  };

  const openAddBranch = () => {
    setEditingBranch(null);
    setBranchForm({ nameAr: "", nameEn: "", city: "", address: "", phone: "", managerName: "", isActive: true });
    setBranchDialogOpen(true);
  };

  const openEditBranch = (branch: any) => {
    setEditingBranch(branch);
    setBranchForm({
      nameAr: branch.nameAr || "",
      nameEn: branch.nameEn || "",
      city: branch.city || "",
      address: branch.address || "",
      phone: branch.phone || "",
      managerName: branch.managerName || branch.manager || "",
      isActive: branch.isActive ?? true,
    });
    setBranchDialogOpen(true);
  };

  const saveBranch = async () => {
    if (!branchForm.nameAr || !branchForm.nameEn) {
      toast({ title: t("تنبيه", "Notice"), description: t("اسم الفرع مطلوب", "Branch name is required"), variant: "destructive" });
      return;
    }
    if (!selectedCompanyId) {
      toast({ title: t("خطأ", "Error"), description: t("لم يتم تحديد الشركة الرئيسية", "Main company not found"), variant: "destructive" });
      return;
    }
    try {
      if (editingBranch) {
        const res = await fetch(`/api/branches/${editingBranch.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(branchForm),
        });
        if (!res.ok) throw new Error();
        logAction("update", "company_branch", `Updated branch ${branchForm.nameEn}`, `تم تعديل الفرع ${branchForm.nameAr}`);
      } else {
        const res = await fetch(`/api/branches`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...branchForm, companyId: selectedCompanyId }),
        });
        if (!res.ok) throw new Error();
        logAction("create", "company_branch", `Created branch ${branchForm.nameEn}`, `تم إنشاء الفرع ${branchForm.nameAr}`);
      }
      await loadBranches(selectedCompanyId);
      window.dispatchEvent(new CustomEvent("scapex_company_update"));
      setBranchDialogOpen(false);
      toast({ title: t("تم الحفظ", "Saved"), description: t("تم حفظ بيانات الفرع", "Branch saved successfully") });
    } catch {
      toast({ title: t("فشل الحفظ", "Save failed"), description: t("تعذر حفظ الفرع", "Could not save branch"), variant: "destructive" });
    }
  };

  const deleteBranch = async (id: number, nameAr: string, nameEn: string) => {
    if (!selectedCompanyId) return;
    try {
      const res = await fetch(`/api/branches/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      logAction("delete", "company_branch", `Deleted branch ${nameEn}`, `تم حذف الفرع ${nameAr}`);
      await loadBranches(selectedCompanyId);
      window.dispatchEvent(new CustomEvent("scapex_company_update"));
      toast({ title: t("تم الحذف", "Deleted"), description: t("تم حذف الفرع", "Branch deleted") });
    } catch {
      toast({ title: t("فشل الحذف", "Delete failed"), description: t("تعذر حذف الفرع", "Could not delete branch"), variant: "destructive" });
    }
  };

  const completeness = (() => {
    const fields = [form.companyNameAr, form.companyNameEn, form.address, form.addressEn, form.phone1, form.email1, form.website, form.crNumber, form.vatNumber];
    const filled = fields.filter(f => f && f.trim()).length;
    return Math.round((filled / fields.length) * 100);
  })();

  return (
    <MainLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto" dir={dir}>
        {!isAdmin && (
          <div className="p-3 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
            <Shield className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{t("أنت تعرض هذه الصفحة في وضع القراءة فقط. التعديل متاح للمدير فقط.", "You are viewing this page in read-only mode. Editing is available only to administrators.")}</span>
          </div>
        )}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-company-settings-title">
                {t("إدارة الشركة", "Company Management")}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t("المصدر المركزي لجميع بيانات ومعلومات الشركة وإعدادات النظام", "Central source for all company data and system settings")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(hasChanges || hasSysChanges) && (
              <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50 gap-1">
                <AlertCircle className="w-3 h-3" />
                {t("تغييرات غير محفوظة", "Unsaved changes")}
              </Badge>
            )}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/50 border border-border/30">
              <span className="text-xs text-muted-foreground">{t("اكتمال البيانات", "Completeness")}</span>
              <Badge className={cn("text-[10px] px-1.5", completeness === 100 ? "bg-green-600" : completeness >= 70 ? "bg-blue-600" : "bg-orange-500")}>
                {completeness}%
              </Badge>
            </div>
          </div>
        </div>

        {/* Company selector — driven by active business activity */}
        <Card className="border-border/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 shrink-0">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{t("الشركة المعروضة", "Viewing company")}</span>
              </div>
              {visibleCompanies.length === 0 ? (
                <p className="text-sm text-muted-foreground" data-testid="text-no-companies">
                  {activeActivity
                    ? t(`لا توجد شركات في نشاط ${isRtl ? activeActivity.nameAr : activeActivity.nameEn}`, `No companies under ${activeActivity.nameEn} activity`)
                    : t("لا توجد شركات متاحة لك", "No companies available")}
                </p>
              ) : visibleCompanies.length === 1 ? (
                <div className="flex items-center gap-2" data-testid="text-locked-company">
                  <span className="text-sm font-medium">
                    {isRtl ? visibleCompanies[0].nameAr : visibleCompanies[0].nameEn}
                  </span>
                  {visibleCompanies[0].settings?.type === "main" && (
                    <Badge variant="secondary" className="text-[10px]">{t("رئيسية", "Main")}</Badge>
                  )}
                </div>
              ) : (
                <Select
                  value={selectedCompanyId ? String(selectedCompanyId) : ""}
                  onValueChange={(v) => setSelectedCompanyId(parseInt(v))}
                >
                  <SelectTrigger className="h-9 max-w-md" data-testid="select-active-company">
                    <SelectValue placeholder={t("اختر شركة...", "Select a company...")} />
                  </SelectTrigger>
                  <SelectContent>
                    {visibleCompanies.map((c: any) => (
                      <SelectItem key={c.id} value={String(c.id)} data-testid={`select-company-${c.id}`}>
                        {isRtl ? c.nameAr : c.nameEn}
                        {c.settings?.type === "main" && (
                          <span className="ms-2 text-[10px] text-muted-foreground">{t("(رئيسية)", "(Main)")}</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {activeActivity && (
                <Badge variant="outline" className="text-[10px] gap-1">
                  <Settings2 className="w-3 h-3" />
                  {t("النشاط:", "Activity:")} {isRtl ? activeActivity.nameAr : activeActivity.nameEn}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground ms-auto">
                {visibleCompanies.length} {t("شركة", "companies")}
              </span>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="w-full justify-start h-auto flex-wrap gap-1 bg-secondary/30 p-1.5 rounded-xl">
            <TabsTrigger value="basic" className="gap-1.5 text-xs" data-testid="tab-basic">
              <Building2 className="w-3.5 h-3.5" />{t("البيانات الأساسية", "Basic Info")}
            </TabsTrigger>
            <TabsTrigger value="contact" className="gap-1.5 text-xs" data-testid="tab-contact">
              <Phone className="w-3.5 h-3.5" />{t("التواصل", "Contact")}
            </TabsTrigger>
            <TabsTrigger value="legal" className="gap-1.5 text-xs" data-testid="tab-legal">
              <Landmark className="w-3.5 h-3.5" />{t("البيانات القانونية", "Legal Info")}
            </TabsTrigger>
            <TabsTrigger value="branches" className="gap-1.5 text-xs" data-testid="tab-branches">
              <GitBranch className="w-3.5 h-3.5" />{t("الفروع", "Branches")}
              {dbBranches.length > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1 py-0 ms-1">{dbBranches.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="social" className="gap-1.5 text-xs" data-testid="tab-social">
              <Globe className="w-3.5 h-3.5" />{t("التواصل الاجتماعي", "Social")}
            </TabsTrigger>
            <TabsTrigger value="system" className="gap-1.5 text-xs" data-testid="tab-system">
              <Settings2 className="w-3.5 h-3.5" />{t("إعدادات النظام", "System Settings")}
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-1.5 text-xs" data-testid="tab-templates">
              <Printer className="w-3.5 h-3.5" />{t("قوالب الطباعة", "Print Templates")}
            </TabsTrigger>
          </TabsList>

          {/* ═══ Basic Info ═══ */}
          <TabsContent value="basic" className="mt-4 space-y-6">
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  {t("الهوية والتعريف", "Identity & Description")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SettingsField label={t("اسم الشركة (عربي)", "Company Name (Arabic)")} value={form.companyNameAr} onChange={(v) => updateField("companyNameAr", v)} placeholder={t("مثال: شركة سكابكس", "e.g. Scapex Co.")} disabled={!isAdmin} />
                  <SettingsField label={t("اسم الشركة (إنجليزي)", "Company Name (English)")} value={form.companyNameEn} onChange={(v) => updateField("companyNameEn", v)} placeholder="e.g. Scapex Company" dir="ltr" disabled={!isAdmin} />
                </div>
                <SettingsField label={t("نبذة عن الشركة (عربي)", "Company Description (Arabic)")} value={form.descriptionAr} onChange={(v) => updateField("descriptionAr", v)} textarea disabled={!isAdmin} />
                <SettingsField label={t("نبذة عن الشركة (إنجليزي)", "Company Description (English)")} value={form.descriptionEn} onChange={(v) => updateField("descriptionEn", v)} textarea dir="ltr" disabled={!isAdmin} />
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  {t("العنوان", "Address")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SettingsField label={t("العنوان (عربي)", "Address (Arabic)")} value={form.address} onChange={(v) => updateField("address", v)} textarea disabled={!isAdmin} />
                  <SettingsField label={t("العنوان (إنجليزي)", "Address (English)")} value={form.addressEn} onChange={(v) => updateField("addressEn", v)} textarea dir="ltr" disabled={!isAdmin} />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  {t("ساعات العمل", "Working Hours")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SettingsField label={t("ساعات العمل (عربي)", "Working Hours (Arabic)")} value={form.workingHoursAr} onChange={(v) => updateField("workingHoursAr", v)} disabled={!isAdmin} />
                  <SettingsField label={t("ساعات العمل (إنجليزي)", "Working Hours (English)")} value={form.workingHoursEn} onChange={(v) => updateField("workingHoursEn", v)} dir="ltr" disabled={!isAdmin} />
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center gap-3 justify-end">
              <Button variant="outline" onClick={handleReset} className="gap-1.5" data-testid="button-reset-company">
                <RotateCcw className="w-3.5 h-3.5" />{t("استعادة الافتراضي", "Reset to Default")}
              </Button>
              <Button onClick={handleSave} className="gap-1.5 min-w-[140px]" disabled={!hasChanges} data-testid="button-save-company">
                <Save className="w-3.5 h-3.5" />{t("حفظ التغييرات", "Save Changes")}
              </Button>
            </div>
          </TabsContent>

          {/* ═══ Contact ═══ */}
          <TabsContent value="contact" className="mt-4 space-y-6">
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Phone className="w-4 h-4 text-primary" />{t("أرقام الهاتف", "Phone Numbers")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SettingsField label={t("الهاتف الرئيسي", "Primary Phone")} value={form.phone1} onChange={(v) => updateField("phone1", v)} dir="ltr" placeholder="+966 XX XXX XXXX" disabled={!isAdmin} />
                  <SettingsField label={t("هاتف إضافي", "Secondary Phone")} value={form.phone2} onChange={(v) => updateField("phone2", v)} dir="ltr" placeholder="+966 XX XXX XXXX" disabled={!isAdmin} />
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Mail className="w-4 h-4 text-primary" />{t("البريد الإلكتروني", "Email Addresses")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SettingsField label={t("البريد الرئيسي", "Primary Email")} value={form.email1} onChange={(v) => updateField("email1", v)} dir="ltr" placeholder="info@company.sa" disabled={!isAdmin} />
                  <SettingsField label={t("بريد الدعم الفني", "Support Email")} value={form.email2} onChange={(v) => updateField("email2", v)} dir="ltr" placeholder="support@company.sa" disabled={!isAdmin} />
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Globe className="w-4 h-4 text-primary" />{t("الموقع الإلكتروني", "Website")}</CardTitle>
              </CardHeader>
              <CardContent>
                <SettingsField label={t("رابط الموقع", "Website URL")} value={form.website || ""} onChange={(v) => updateField("website", v)} dir="ltr" placeholder="www.company.sa" disabled={!isAdmin} />
              </CardContent>
            </Card>
            <div className="flex items-center gap-3 justify-end">
              <Button variant="outline" onClick={handleReset} className="gap-1.5"><RotateCcw className="w-3.5 h-3.5" />{t("استعادة الافتراضي", "Reset")}</Button>
              <Button onClick={handleSave} className="gap-1.5 min-w-[140px]" disabled={!hasChanges}><Save className="w-3.5 h-3.5" />{t("حفظ التغييرات", "Save")}</Button>
            </div>
          </TabsContent>

          {/* ═══ Legal ═══ */}
          <TabsContent value="legal" className="mt-4 space-y-6">
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Landmark className="w-4 h-4 text-primary" />{t("البيانات القانونية والتسجيل", "Legal & Registration Data")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SettingsField label={t("رقم السجل التجاري", "Commercial Registration No.")} value={form.crNumber || ""} onChange={(v) => updateField("crNumber", v)} dir="ltr" placeholder="1010XXXXXX" disabled={!isAdmin} />
                  <SettingsField label={t("الرقم الضريبي (VAT)", "VAT Number")} value={form.vatNumber || ""} onChange={(v) => updateField("vatNumber", v)} dir="ltr" placeholder="3XXXXXXXXXXXXXXX" disabled={!isAdmin} />
                </div>
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{t("الرقم الضريبي سيظهر تلقائياً في عروض الأسعار والعقود والفواتير المطبوعة.", "The VAT number will automatically appear on printed proposals, contracts, and invoices.")}</span>
                </div>
              </CardContent>
            </Card>
            <div className="flex items-center gap-3 justify-end">
              <Button variant="outline" onClick={handleReset} className="gap-1.5"><RotateCcw className="w-3.5 h-3.5" />{t("استعادة الافتراضي", "Reset")}</Button>
              <Button onClick={handleSave} className="gap-1.5 min-w-[140px]" disabled={!hasChanges}><Save className="w-3.5 h-3.5" />{t("حفظ التغييرات", "Save")}</Button>
            </div>
          </TabsContent>

          {/* ═══ Branches ═══ */}
          <TabsContent value="branches" className="mt-4 space-y-6">
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2"><GitBranch className="w-4 h-4 text-primary" />{t("فروع الشركة", "Company Branches")}</CardTitle>
                  <Button size="sm" className="gap-1.5 h-8" onClick={openAddBranch} data-testid="button-add-branch">
                    <Plus className="w-3.5 h-3.5" />{t("إضافة فرع", "Add Branch")}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {branchesLoading ? (
                  <div className="text-center py-10 text-muted-foreground text-sm">{t("جارٍ التحميل...", "Loading...")}</div>
                ) : dbBranches.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground space-y-2">
                    <GitBranch className="w-10 h-10 mx-auto opacity-30" />
                    <p className="text-sm">{t("لا توجد فروع مضافة", "No branches added")}</p>
                    <p className="text-xs">{t("أضف فروع شركتك لعرضها في النظام", "Add your company branches to display them in the system")}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dbBranches.map((branch: any) => (
                      <div key={branch.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors" data-testid={`branch-${branch.id}`}>
                        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", branch.isActive ? "bg-green-100 dark:bg-green-900/30" : "bg-gray-100 dark:bg-gray-800")}>
                          <MapPin className={cn("w-4 h-4", branch.isActive ? "text-green-600 dark:text-green-400" : "text-gray-400")} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">{isRtl ? branch.nameAr : branch.nameEn}</p>
                            <Badge variant={branch.isActive ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                              {branch.isActive ? t("نشط", "Active") : t("غير نشط", "Inactive")}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                            {branch.city && <span>{branch.city}</span>}
                            {branch.managerName && <span>• {branch.managerName}</span>}
                            {branch.phone && <span dir="ltr">• {branch.phone}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditBranch(branch)} data-testid={`button-edit-branch-${branch.id}`}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteBranch(branch.id, branch.nameAr, branch.nameEn)} data-testid={`button-delete-branch-${branch.id}`}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1.5">
                  <Info className="w-3 h-3" />
                  {t("الفروع هنا مرتبطة مباشرة بإدارة الشركات — أي تغيير ينعكس في النظام كاملاً", "Branches here are linked directly to Company Management — any change reflects across the entire system")}
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ Social ═══ */}
          <TabsContent value="social" className="mt-4 space-y-6">
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Globe className="w-4 h-4 text-primary" />{t("حسابات التواصل الاجتماعي", "Social Media Accounts")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <SettingsField label="Twitter / X" value={form.twitterHandle} onChange={(v) => updateField("twitterHandle", v)} dir="ltr" placeholder="@company" disabled={!isAdmin} />
                  <SettingsField label="LinkedIn URL" value={form.linkedinUrl} onChange={(v) => updateField("linkedinUrl", v)} dir="ltr" placeholder="https://linkedin.com/company/..." disabled={!isAdmin} />
                  <SettingsField label="WhatsApp" value={form.whatsapp} onChange={(v) => updateField("whatsapp", v)} dir="ltr" placeholder="+966XXXXXXXXX" disabled={!isAdmin} />
                </div>
              </CardContent>
            </Card>
            <div className="flex items-center gap-3 justify-end">
              <Button variant="outline" onClick={handleReset} className="gap-1.5"><RotateCcw className="w-3.5 h-3.5" />{t("استعادة الافتراضي", "Reset")}</Button>
              <Button onClick={handleSave} className="gap-1.5 min-w-[140px]" disabled={!hasChanges}><Save className="w-3.5 h-3.5" />{t("حفظ التغييرات", "Save")}</Button>
            </div>
          </TabsContent>

          {/* ═══ System Settings ═══ */}
          <TabsContent value="system" className="mt-4 space-y-6">
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Clock className="w-4 h-4 text-primary" />{t("نظام الوقت", "Time Format")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Label className="text-xs font-medium">{t("صيغة الوقت", "Time Format")}</Label>
                  <Select value={sysForm.timeFormat} onValueChange={(v) => { setSysForm(prev => ({ ...prev, timeFormat: v as "24h" | "12h" })); setHasSysChanges(true); }}>
                    <SelectTrigger data-testid="select-time-format" className="w-full sm:w-[280px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12h">{t("12 ساعة (صباحاً/مساءً)", "12 Hour (AM/PM)")}</SelectItem>
                      <SelectItem value="24h">{t("24 ساعة", "24 Hour")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="p-3 rounded-lg bg-secondary/30 border border-border/30 text-xs">
                    <p className="text-muted-foreground">{t("مثال:", "Example:")} <span className="font-mono font-medium text-foreground">{sysForm.timeFormat === "24h" ? "14:30" : "2:30 PM"}</span></p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" />{t("نظام التاريخ", "Date Format")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Label className="text-xs font-medium">{t("نوع التقويم", "Calendar Type")}</Label>
                  <Select value={sysForm.dateFormat} onValueChange={(v) => { setSysForm(prev => ({ ...prev, dateFormat: v as "gregorian" | "hijri" | "both" })); setHasSysChanges(true); }}>
                    <SelectTrigger data-testid="select-date-format" className="w-full sm:w-[280px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gregorian">{t("ميلادي فقط", "Gregorian Only")}</SelectItem>
                      <SelectItem value="hijri">{t("هجري فقط", "Hijri Only")}</SelectItem>
                      <SelectItem value="both">{t("ميلادي وهجري معاً", "Both (Gregorian & Hijri)")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="p-3 rounded-lg bg-secondary/30 border border-border/30 text-xs space-y-1">
                    {(sysForm.dateFormat === "gregorian" || sysForm.dateFormat === "both") && (
                      <p className="text-muted-foreground">{t("ميلادي:", "Gregorian:")} <span className="font-mono font-medium text-foreground">{new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span></p>
                    )}
                    {(sysForm.dateFormat === "hijri" || sysForm.dateFormat === "both") && (
                      <p className="text-muted-foreground">{t("هجري:", "Hijri:")} <span className="font-mono font-medium text-foreground">{new Date().toLocaleDateString("ar-SA-u-ca-islamic", { year: "numeric", month: "long", day: "numeric" })}</span></p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4 text-primary" />{t("نوع الخط", "Font Family")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Label className="text-xs font-medium">{t("اختر الخط المستخدم في النظام", "Choose the system font")}</Label>
                  <Select value={sysForm.fontFamily} onValueChange={(v) => { setSysForm(prev => ({ ...prev, fontFamily: v as FontFamily })); setHasSysChanges(true); }}>
                    <SelectTrigger data-testid="select-font-family" className="w-full sm:w-[320px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_OPTIONS.map(f => (
                        <SelectItem key={f.value} value={f.value}>
                          <span style={{ fontFamily: f.family }}>{isRtl ? f.labelAr : f.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="p-4 rounded-lg bg-secondary/30 border border-border/30" style={{ fontFamily: FONT_OPTIONS.find(f => f.value === sysForm.fontFamily)?.family }}>
                    <p className="text-sm mb-1 font-semibold">{t("معاينة الخط", "Font Preview")}</p>
                    <p className="text-xs text-muted-foreground">{t("هذا نص تجريبي لمعاينة شكل الخط المختار في النظام — 0123456789", "This is a sample text to preview the selected font — 0123456789")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Settings2 className="w-4 h-4 text-primary" />{t("حجم الخط", "Font Size")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Label className="text-xs font-medium">{t("حجم الخط الأساسي للنظام", "Base font size for the system")}</Label>
                  <div className="flex gap-2">
                    {FONT_SIZE_OPTIONS.map(s => (
                      <button
                        key={s.value}
                        type="button"
                        className={cn(
                          "flex-1 py-3 px-4 rounded-xl border-2 text-center transition-all",
                          sysForm.fontSize === s.value
                            ? "border-primary bg-primary/5 text-primary font-semibold"
                            : "border-border/50 hover:border-primary/30"
                        )}
                        onClick={() => { setSysForm(prev => ({ ...prev, fontSize: s.value as FontSize })); setHasSysChanges(true); }}
                        data-testid={`button-font-size-${s.value}`}
                      >
                        <span style={{ fontSize: s.css }}>{isRtl ? s.labelAr : s.label}</span>
                        <span className="block text-[10px] text-muted-foreground mt-1">{s.css}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center gap-3 justify-end">
              <Button variant="outline" onClick={handleResetSys} className="gap-1.5"><RotateCcw className="w-3.5 h-3.5" />{t("استعادة الافتراضي", "Reset")}</Button>
              <Button onClick={handleSaveSys} className="gap-1.5 min-w-[140px]" disabled={!hasSysChanges} data-testid="button-save-system">
                <Save className="w-3.5 h-3.5" />{t("حفظ الإعدادات", "Save Settings")}
              </Button>
            </div>
          </TabsContent>

          {/* ═══ Print Templates ═══ */}
          <TabsContent value="templates" className="mt-4 space-y-6">
            <div className="p-3 rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30 text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{t(
                "خصص النصوص التي تظهر في تذييل عروض الأسعار والفواتير والخطابات الرسمية عند الطباعة. هذه النصوص ستظهر في جميع المستندات المطبوعة.",
                "Customize the text shown in the footer of proposals, invoices, and official letters when printed. These texts will appear in all printed documents."
              )}</span>
            </div>

            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4 text-primary" />{t("قالب عرض السعر", "Proposal Template")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SettingsField label={t("تذييل عرض السعر (عربي)", "Proposal Footer (Arabic)")} value={sysForm.proposalFooterAr} onChange={(v) => updateSysField("proposalFooterAr", v)} textarea disabled={!isAdmin} />
                  <SettingsField label={t("تذييل عرض السعر (إنجليزي)", "Proposal Footer (English)")} value={sysForm.proposalFooterEn} onChange={(v) => updateSysField("proposalFooterEn", v)} textarea dir="ltr" disabled={!isAdmin} />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4 text-green-600" />{t("قالب الفاتورة", "Invoice Template")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SettingsField label={t("تذييل الفاتورة (عربي)", "Invoice Footer (Arabic)")} value={sysForm.invoiceFooterAr} onChange={(v) => updateSysField("invoiceFooterAr", v)} textarea disabled={!isAdmin} />
                  <SettingsField label={t("تذييل الفاتورة (إنجليزي)", "Invoice Footer (English)")} value={sysForm.invoiceFooterEn} onChange={(v) => updateSysField("invoiceFooterEn", v)} textarea dir="ltr" disabled={!isAdmin} />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4 text-violet-600" />{t("قالب الخطابات الرسمية", "Official Letter Template")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SettingsField label={t("ترويسة الخطاب (عربي)", "Letter Header (Arabic)")} value={sysForm.letterHeaderAr} onChange={(v) => updateSysField("letterHeaderAr", v)} textarea disabled={!isAdmin} placeholder={t("نص الترويسة الرسمية...", "Official header text...")} />
                  <SettingsField label={t("ترويسة الخطاب (إنجليزي)", "Letter Header (English)")} value={sysForm.letterHeaderEn} onChange={(v) => updateSysField("letterHeaderEn", v)} textarea dir="ltr" disabled={!isAdmin} placeholder="Official header text..." />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SettingsField label={t("تذييل الخطاب (عربي)", "Letter Footer (Arabic)")} value={sysForm.letterFooterAr} onChange={(v) => updateSysField("letterFooterAr", v)} textarea disabled={!isAdmin} placeholder={t("نص التذييل الرسمي...", "Official footer text...")} />
                  <SettingsField label={t("تذييل الخطاب (إنجليزي)", "Letter Footer (English)")} value={sysForm.letterFooterEn} onChange={(v) => updateSysField("letterFooterEn", v)} textarea dir="ltr" disabled={!isAdmin} placeholder="Official footer text..." />
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center gap-3 justify-end">
              <Button variant="outline" onClick={handleResetSys} className="gap-1.5"><RotateCcw className="w-3.5 h-3.5" />{t("استعادة الافتراضي", "Reset")}</Button>
              <Button onClick={handleSaveSys} className="gap-1.5 min-w-[140px]" disabled={!hasSysChanges} data-testid="button-save-templates">
                <Save className="w-3.5 h-3.5" />{t("حفظ القوالب", "Save Templates")}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Branch Dialog */}
        <Dialog open={branchDialogOpen} onOpenChange={setBranchDialogOpen}>
          <DialogContent className="max-w-lg" dir={dir} onClick={(e) => e.stopPropagation()}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-primary" />
                {editingBranch ? t("تعديل الفرع", "Edit Branch") : t("إضافة فرع جديد", "Add New Branch")}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("اسم الفرع (عربي)", "Branch Name (Arabic)")}</Label>
                  <Input value={branchForm.nameAr} onChange={(e) => setBranchForm({ ...branchForm, nameAr: e.target.value })} data-testid="input-branch-name-ar" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("اسم الفرع (إنجليزي)", "Branch Name (English)")}</Label>
                  <Input value={branchForm.nameEn} onChange={(e) => setBranchForm({ ...branchForm, nameEn: e.target.value })} dir="ltr" data-testid="input-branch-name-en" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("المدينة", "City")}</Label>
                  <Input value={branchForm.city} onChange={(e) => setBranchForm({ ...branchForm, city: e.target.value })} data-testid="input-branch-city" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("المدير", "Manager")}</Label>
                  <Input value={branchForm.managerName} onChange={(e) => setBranchForm({ ...branchForm, managerName: e.target.value })} data-testid="input-branch-manager" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("العنوان", "Address")}</Label>
                <Input value={branchForm.address} onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })} data-testid="input-branch-address" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("الهاتف", "Phone")}</Label>
                  <Input value={branchForm.phone} onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })} dir="ltr" data-testid="input-branch-phone" />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch checked={branchForm.isActive} onCheckedChange={(v) => setBranchForm({ ...branchForm, isActive: v })} data-testid="switch-branch-active" />
                  <Label className="text-xs">{t("فرع نشط", "Active Branch")}</Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBranchDialogOpen(false)}>{t("إلغاء", "Cancel")}</Button>
              <Button onClick={saveBranch} data-testid="button-save-branch">{editingBranch ? t("تحديث", "Update") : t("إضافة", "Add")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
