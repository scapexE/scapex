import { useState, useEffect } from "react";
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
import {
  Building2, MapPin, Phone, Mail, Globe, Clock, Save, RotateCcw,
  Plus, Pencil, Trash2, GitBranch, FileText, Shield, CheckCircle2,
  Info, Users, Landmark, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { type AboutSettings, type CompanyBranch, DEFAULT_ABOUT, getAboutData } from "@/lib/companySettings";
import { logAction } from "@/lib/auditLog";
import type { SystemUser } from "@/lib/permissions";

function generateId() {
  return `br-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export default function CompanySettingsModule() {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";
  const t = (ar: string, en: string) => isRtl ? ar : en;
  const { toast } = useToast();
  const currentUser: SystemUser | null = JSON.parse(localStorage.getItem("user") || "null");
  const isAdmin = currentUser?.role === "admin";

  const [form, setForm] = useState<AboutSettings>(getAboutData());
  const [hasChanges, setHasChanges] = useState(false);
  const [branchDialogOpen, setBranchDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<CompanyBranch | null>(null);
  const [branchForm, setBranchForm] = useState<CompanyBranch>({
    id: "", nameAr: "", nameEn: "", city: "", address: "", phone: "", manager: "", isActive: true,
  });

  const update = (key: keyof AboutSettings, val: string) => {
    setForm({ ...form, [key]: val });
    setHasChanges(true);
  };

  const handleSave = () => {
    localStorage.setItem("scapex_about_settings", JSON.stringify(form));
    setHasChanges(false);
    logAction("update", "company_settings", "Updated company settings", "تم تحديث إعدادات الشركة");
    window.dispatchEvent(new CustomEvent("scapex_company_update"));
    toast({
      title: t("تم الحفظ بنجاح", "Saved Successfully"),
      description: t("تم تحديث بيانات الشركة وستنعكس على جميع أجزاء النظام", "Company data updated and will reflect across the entire system"),
    });
  };

  const handleReset = () => {
    setForm({ ...DEFAULT_ABOUT });
    localStorage.removeItem("scapex_about_settings");
    setHasChanges(false);
    window.dispatchEvent(new CustomEvent("scapex_company_update"));
    toast({ title: t("تم الاستعادة", "Reset"), description: t("تمت استعادة القيم الافتراضية", "Default values restored") });
  };

  const openAddBranch = () => {
    setEditingBranch(null);
    setBranchForm({ id: generateId(), nameAr: "", nameEn: "", city: "", address: "", phone: "", manager: "", isActive: true });
    setBranchDialogOpen(true);
  };

  const openEditBranch = (branch: CompanyBranch) => {
    setEditingBranch(branch);
    setBranchForm({ ...branch });
    setBranchDialogOpen(true);
  };

  const saveBranch = () => {
    if (!branchForm.nameAr || !branchForm.nameEn) {
      toast({ title: t("تنبيه", "Notice"), description: t("اسم الفرع مطلوب", "Branch name is required"), variant: "destructive" });
      return;
    }
    let newBranches: CompanyBranch[];
    if (editingBranch) {
      newBranches = (form.branches || []).map(b => b.id === editingBranch.id ? branchForm : b);
    } else {
      newBranches = [...(form.branches || []), branchForm];
    }
    setForm({ ...form, branches: newBranches });
    setHasChanges(true);
    setBranchDialogOpen(false);
  };

  const deleteBranch = (id: string) => {
    setForm({ ...form, branches: (form.branches || []).filter(b => b.id !== id) });
    setHasChanges(true);
  };

  const Field = ({ label, value, field, textarea, dir: fieldDir, placeholder }: {
    label: string; value: string; field: keyof AboutSettings; textarea?: boolean; dir?: string; placeholder?: string;
  }) => (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {textarea ? (
        <Textarea value={value} onChange={(e) => update(field, e.target.value)} rows={3} className="text-sm" dir={fieldDir} placeholder={placeholder} disabled={!isAdmin} />
      ) : (
        <Input value={value} onChange={(e) => update(field, e.target.value)} className="text-sm" dir={fieldDir} placeholder={placeholder} disabled={!isAdmin} />
      )}
    </div>
  );

  const completeness = (() => {
    const fields = [form.companyNameAr, form.companyNameEn, form.address, form.addressEn, form.phone1, form.email1, form.website, form.crNumber, form.vatNumber];
    const filled = fields.filter(f => f && f.trim()).length;
    return Math.round((filled / fields.length) * 100);
  })();

  if (!isAdmin) {
    return (
      <MainLayout>
        <div className="p-6 max-w-2xl mx-auto text-center space-y-4" dir={dir}>
          <Shield className="w-16 h-16 mx-auto text-muted-foreground/30" />
          <h2 className="text-xl font-bold">{t("صلاحية محدودة", "Restricted Access")}</h2>
          <p className="text-muted-foreground">{t("هذه الصفحة متاحة للمدير فقط", "This page is only available to administrators")}</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto" dir={dir}>
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
                {t("المصدر المركزي لجميع بيانات ومعلومات الشركة في النظام", "Central source for all company data across the system")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasChanges && (
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

        <div className="p-3 rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30 text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{t(
            "البيانات المدخلة هنا ستنعكس تلقائياً على جميع أجزاء النظام: عروض الأسعار، التقارير، صفحة حول النظام، والتذييل في المستندات المطبوعة.",
            "Data entered here will automatically reflect across the entire system: proposals, reports, About page, and document print footers."
          )}</span>
        </div>

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
              {(form.branches || []).length > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1 py-0 ms-1">{(form.branches || []).length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="social" className="gap-1.5 text-xs" data-testid="tab-social">
              <Globe className="w-3.5 h-3.5" />{t("التواصل الاجتماعي", "Social Media")}
            </TabsTrigger>
          </TabsList>

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
                  <Field label={t("اسم الشركة (عربي)", "Company Name (Arabic)")} value={form.companyNameAr} field="companyNameAr" placeholder={t("مثال: شركة سكابكس", "e.g. Scapex Co.")} />
                  <Field label={t("اسم الشركة (إنجليزي)", "Company Name (English)")} value={form.companyNameEn} field="companyNameEn" placeholder="e.g. Scapex Company" dir="ltr" />
                </div>
                <Field label={t("نبذة عن الشركة (عربي)", "Company Description (Arabic)")} value={form.descriptionAr} field="descriptionAr" textarea />
                <Field label={t("نبذة عن الشركة (إنجليزي)", "Company Description (English)")} value={form.descriptionEn} field="descriptionEn" textarea dir="ltr" />
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
                  <Field label={t("العنوان (عربي)", "Address (Arabic)")} value={form.address} field="address" textarea />
                  <Field label={t("العنوان (إنجليزي)", "Address (English)")} value={form.addressEn} field="addressEn" textarea dir="ltr" />
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
                  <Field label={t("ساعات العمل (عربي)", "Working Hours (Arabic)")} value={form.workingHoursAr} field="workingHoursAr" />
                  <Field label={t("ساعات العمل (إنجليزي)", "Working Hours (English)")} value={form.workingHoursEn} field="workingHoursEn" dir="ltr" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contact" className="mt-4 space-y-6">
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Phone className="w-4 h-4 text-primary" />
                  {t("أرقام الهاتف", "Phone Numbers")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label={t("الهاتف الرئيسي", "Primary Phone")} value={form.phone1} field="phone1" dir="ltr" placeholder="+966 XX XXX XXXX" />
                  <Field label={t("هاتف إضافي", "Secondary Phone")} value={form.phone2} field="phone2" dir="ltr" placeholder="+966 XX XXX XXXX" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  {t("البريد الإلكتروني", "Email Addresses")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label={t("البريد الرئيسي", "Primary Email")} value={form.email1} field="email1" dir="ltr" placeholder="info@company.sa" />
                  <Field label={t("بريد الدعم الفني", "Support Email")} value={form.email2} field="email2" dir="ltr" placeholder="support@company.sa" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" />
                  {t("الموقع الإلكتروني", "Website")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Field label={t("رابط الموقع", "Website URL")} value={form.website || ""} field="website" dir="ltr" placeholder="www.company.sa" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="legal" className="mt-4 space-y-6">
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-primary" />
                  {t("البيانات القانونية والتسجيل", "Legal & Registration Data")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label={t("رقم السجل التجاري", "Commercial Registration No.")} value={form.crNumber || ""} field="crNumber" dir="ltr" placeholder="1010XXXXXX" />
                  <Field label={t("الرقم الضريبي (VAT)", "VAT Number")} value={form.vatNumber || ""} field="vatNumber" dir="ltr" placeholder="3XXXXXXXXXXXXXXX" />
                </div>
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{t(
                    "الرقم الضريبي سيظهر تلقائياً في عروض الأسعار والعقود والفواتير المطبوعة.",
                    "The VAT number will automatically appear on printed proposals, contracts, and invoices."
                  )}</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="branches" className="mt-4 space-y-6">
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-primary" />
                    {t("فروع الشركة", "Company Branches")}
                  </CardTitle>
                  <Button size="sm" className="gap-1.5 h-8" onClick={openAddBranch} data-testid="button-add-branch">
                    <Plus className="w-3.5 h-3.5" />{t("إضافة فرع", "Add Branch")}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {(!form.branches || form.branches.length === 0) ? (
                  <div className="text-center py-10 text-muted-foreground space-y-2">
                    <GitBranch className="w-10 h-10 mx-auto opacity-30" />
                    <p className="text-sm">{t("لا توجد فروع مضافة", "No branches added")}</p>
                    <p className="text-xs">{t("أضف فروع شركتك لعرضها في النظام", "Add your company branches to display them in the system")}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(form.branches || []).map((branch) => (
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
                            <span>{branch.city}</span>
                            {branch.manager && <span>• {branch.manager}</span>}
                            {branch.phone && <span dir="ltr">• {branch.phone}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditBranch(branch)} data-testid={`button-edit-branch-${branch.id}`}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteBranch(branch.id)} data-testid={`button-delete-branch-${branch.id}`}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="social" className="mt-4 space-y-6">
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" />
                  {t("حسابات التواصل الاجتماعي", "Social Media Accounts")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label="Twitter / X" value={form.twitterHandle} field="twitterHandle" dir="ltr" placeholder="@company" />
                  <Field label="LinkedIn URL" value={form.linkedinUrl} field="linkedinUrl" dir="ltr" placeholder="https://linkedin.com/company/..." />
                  <Field label="WhatsApp" value={form.whatsapp} field="whatsapp" dir="ltr" placeholder="+966XXXXXXXXX" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex items-center gap-3 justify-end pt-2 pb-6 border-t border-border/30">
          <Button variant="outline" onClick={handleReset} className="gap-1.5" data-testid="button-reset-company">
            <RotateCcw className="w-3.5 h-3.5" />{t("استعادة الافتراضي", "Reset to Default")}
          </Button>
          <Button onClick={handleSave} className="gap-1.5 min-w-[140px]" disabled={!hasChanges} data-testid="button-save-company">
            <Save className="w-3.5 h-3.5" />{t("حفظ جميع التغييرات", "Save All Changes")}
          </Button>
        </div>

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
                  <Input value={branchForm.manager} onChange={(e) => setBranchForm({ ...branchForm, manager: e.target.value })} data-testid="input-branch-manager" />
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
