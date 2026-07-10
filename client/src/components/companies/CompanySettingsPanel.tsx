import { useState, useEffect, useCallback, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Building2, MapPin, Clock, Globe, Save, RotateCcw, FileText,
  Info, Settings2, Calendar, ImageIcon, X, AlertCircle, Printer,
  Upload, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { dbSetItem } from "@/lib/dbStorage";
import {
  type AboutSettings, DEFAULT_ABOUT,
  type SystemSettings, type FontFamily, type FontSize,
  DEFAULT_SYSTEM_SETTINGS, getSystemSettings, saveSystemSettings,
  FONT_OPTIONS, FONT_SIZE_OPTIONS,
  type CustomFont, getCustomFonts, addCustomFont, deleteCustomFont,
  fontFormatFromFileName, MAX_FONT_FILE_BYTES, getAllFontOptions,
} from "@/lib/companySettings";
import { logAction } from "@/lib/auditLog";

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

interface CompanyLike {
  id: string;
  nameAr: string;
  nameEn: string;
  crNumber?: string;
  vatNumber?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  type?: string;
  settings?: any;
}

/**
 * Per-company info & settings editor mounted inside the Company Management module.
 * Covers three sections the (now-removed) standalone Company Settings module used to
 * own: company identity/description/working-hours/social, system settings, and print
 * templates — all scoped to the selected company.
 */
export function CompanySettingsPanel({ companies, onSaved }: {
  companies: CompanyLike[];
  onSaved?: () => void;
}) {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";
  const t = (ar: string, en: string) => (isRtl ? ar : en);
  const { toast } = useToast();

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [form, setForm] = useState<AboutSettings>({ ...DEFAULT_ABOUT });
  const [sysForm, setSysForm] = useState<SystemSettings>({ ...DEFAULT_SYSTEM_SETTINGS });
  const [hasChanges, setHasChanges] = useState(false);
  const [hasSysChanges, setHasSysChanges] = useState(false);
  const [customFonts, setCustomFonts] = useState<CustomFont[]>(() => getCustomFonts());
  const [uploadingFont, setUploadingFont] = useState(false);

  const allFontOptions = useMemo(() => getAllFontOptions(), [customFonts]);
  const fontSelectValue = useMemo(
    () => (allFontOptions.some((f) => f.value === sysForm.fontFamily) ? sysForm.fontFamily : "cairo"),
    [allFontOptions, sysForm.fontFamily],
  );

  const handleFontUpload = (file: File | null) => {
    if (!file) return;
    const format = fontFormatFromFileName(file.name);
    if (!format) {
      toast({ title: t("صيغة غير مدعومة", "Unsupported format"), description: t("الصيغ المدعومة: TTF, OTF, WOFF, WOFF2", "Supported formats: TTF, OTF, WOFF, WOFF2"), variant: "destructive" });
      return;
    }
    if (file.size > MAX_FONT_FILE_BYTES) {
      toast({ title: t("الملف كبير جداً", "File too large"), description: t("الحد الأقصى لحجم ملف الخط 2 ميجابايت", "Maximum font file size is 2MB"), variant: "destructive" });
      return;
    }
    setUploadingFont(true);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const ts = Date.now();
        const name = file.name.replace(/\.[^.]+$/, "");
        const font: CustomFont = {
          id: `custom:${ts}`,
          name,
          family: `ScapexCustom-${ts}`,
          format,
          dataUrl: String(reader.result),
        };
        addCustomFont(font);
        setCustomFonts(getCustomFonts());
        setSysForm((prev) => ({ ...prev, fontFamily: font.id }));
        setHasSysChanges(true);
        logAction("create", "companies", `Uploaded custom font: ${name}`, `رفع خط مخصص: ${name}`);
        toast({ title: t("تم رفع الخط", "Font uploaded"), description: t("تم اختيار الخط الجديد — احفظ الإعدادات لتطبيقه", "New font selected — save settings to apply it") });
      } catch (err: any) {
        if (err?.message === "quota") {
          toast({ title: t("مساحة التخزين ممتلئة", "Storage is full"), description: t("لا توجد مساحة كافية لحفظ الخط — احذف خطوطاً مخصصة قديمة أو استخدم ملفاً أصغر", "Not enough space to save the font — delete old custom fonts or use a smaller file"), variant: "destructive" });
        } else {
          toast({ title: t("فشل حفظ الخط", "Failed to save font"), variant: "destructive" });
        }
      } finally {
        setUploadingFont(false);
      }
    };
    reader.onerror = () => {
      setUploadingFont(false);
      toast({ title: t("فشل قراءة الملف", "Failed to read file"), variant: "destructive" });
    };
    reader.readAsDataURL(file);
  };

  const handleFontDelete = (id: string, name: string) => {
    deleteCustomFont(id);
    setCustomFonts(getCustomFonts());
    if (sysForm.fontFamily === id) {
      setSysForm((prev) => ({ ...prev, fontFamily: "cairo" }));
      setHasSysChanges(true);
    }
    logAction("delete", "companies", `Deleted custom font: ${name}`, `حذف خط مخصص: ${name}`);
    toast({ title: t("تم حذف الخط", "Font deleted") });
  };

  const selectedCompany = useMemo(
    () => companies.find((c) => c.id === selectedCompanyId) || null,
    [companies, selectedCompanyId],
  );
  const isCompanyMain = (c: CompanyLike) =>
    c.type === "main" || c.settings?.type === "main";
  const isMain = !!selectedCompany && isCompanyMain(selectedCompany);

  // Pick a sensible default company (main, else first) when the list changes.
  useEffect(() => {
    if (companies.length === 0) { setSelectedCompanyId(""); return; }
    if (selectedCompanyId && companies.some((c) => c.id === selectedCompanyId)) return;
    const main = companies.find(isCompanyMain) || companies[0];
    setSelectedCompanyId(main.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companies]);

  // Load both forms whenever the selected company changes.
  useEffect(() => {
    if (!selectedCompany) return;
    const about = selectedCompany.settings?.about as Partial<AboutSettings> | undefined;
    setForm({
      ...DEFAULT_ABOUT,
      ...(about || {}),
      companyNameAr: about?.companyNameAr ?? selectedCompany.nameAr ?? DEFAULT_ABOUT.companyNameAr,
      companyNameEn: about?.companyNameEn ?? selectedCompany.nameEn ?? DEFAULT_ABOUT.companyNameEn,
      crNumber: about?.crNumber ?? selectedCompany.crNumber ?? "",
      vatNumber: about?.vatNumber ?? selectedCompany.vatNumber ?? "",
      address: about?.address ?? selectedCompany.address ?? "",
      phone1: about?.phone1 ?? selectedCompany.phone ?? "",
      email1: about?.email1 ?? selectedCompany.email ?? "",
      website: about?.website ?? selectedCompany.website ?? "",
    });
    setSysForm(getSystemSettings(selectedCompany.id));
    setHasChanges(false);
    setHasSysChanges(false);
  }, [selectedCompany]);

  const updateField = useCallback((key: keyof AboutSettings, val: string) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    setHasChanges(true);
  }, []);

  const updateSysField = useCallback((key: keyof SystemSettings, val: string) => {
    setSysForm((prev) => ({ ...prev, [key]: val }));
    setHasSysChanges(true);
  }, []);

  const handleSaveInfo = async () => {
    if (!selectedCompany) return;
    try {
      const res = await fetch(`/api/companies/${selectedCompany.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nameAr: form.companyNameAr,
          nameEn: form.companyNameEn,
          settings: { ...(selectedCompany.settings || {}), about: form },
        }),
      });
      if (!res.ok) throw new Error();
      // Mirror to local cache only for the primary company (keeps About page + docs snappy).
      if (isMain) dbSetItem("scapex_about_settings", JSON.stringify(form));
      setHasChanges(false);
      logAction("update", "company_settings", `Updated company ${form.companyNameEn}`, `تم تحديث بيانات الشركة ${form.companyNameAr}`);
      window.dispatchEvent(new CustomEvent("scapex_company_update"));
      onSaved?.();
      toast({ title: t("تم الحفظ بنجاح", "Saved successfully"), description: t("تم تحديث بيانات الشركة المختارة", "Selected company data updated") });
    } catch {
      toast({ title: t("فشل الحفظ", "Save failed"), variant: "destructive" });
    }
  };

  const handleResetInfo = () => {
    if (!selectedCompany) return;
    setForm({
      ...DEFAULT_ABOUT,
      companyNameAr: selectedCompany.nameAr || DEFAULT_ABOUT.companyNameAr,
      companyNameEn: selectedCompany.nameEn || DEFAULT_ABOUT.companyNameEn,
    });
    setHasChanges(true);
    toast({ title: t("تم الاستعادة", "Reset"), description: t("راجع ثم احفظ لتطبيق القيم الافتراضية", "Review then save to apply defaults") });
  };

  const handleSaveSys = () => {
    if (!selectedCompany) return;
    saveSystemSettings(sysForm, { companyId: selectedCompany.id, alsoGlobal: isMain });
    setHasSysChanges(false);
    logAction("update", "system_settings", `Updated system settings for ${selectedCompany.nameEn}`, `تم تحديث إعدادات النظام للشركة ${selectedCompany.nameAr}`);
    toast({ title: t("تم الحفظ", "Saved"), description: t("تم تحديث إعدادات النظام للشركة المختارة", "System settings updated for the selected company") });
  };

  const handleResetSys = () => {
    setSysForm({ ...DEFAULT_SYSTEM_SETTINGS });
    setHasSysChanges(true);
    toast({ title: t("تم الاستعادة", "Reset"), description: t("راجع ثم احفظ لتطبيق الإعدادات الافتراضية", "Review then save to apply defaults") });
  };

  if (companies.length === 0) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          {t("لا توجد شركات متاحة", "No companies available")}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" dir={dir}>
      {/* Company selector */}
      <Card className="border-border/50">
        <CardContent className="p-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 shrink-0">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t("الشركة المعروضة", "Viewing company")}</span>
            </div>
            <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
              <SelectTrigger className="h-9 max-w-md min-w-[260px]" data-testid="select-settings-company">
                <SelectValue placeholder={t("اختر شركة...", "Select a company...")} />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id} data-testid={`select-settings-company-${c.id}`}>
                    {isRtl ? c.nameAr : c.nameEn}
                    {c.settings?.type === "main" && (
                      <span className="ms-2 text-[10px] text-muted-foreground">{t("(رئيسية)", "(Main)")}</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(hasChanges || hasSysChanges) && (
              <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50 gap-1">
                <AlertCircle className="w-3 h-3" />
                {t("تغييرات غير محفوظة", "Unsaved changes")}
              </Badge>
            )}
            {isMain && (
              <Badge variant="outline" className="text-[10px] gap-1">
                <Settings2 className="w-3 h-3" />
                {t("تؤثر على واجهة النظام", "Drives live UI")}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="info" className="w-full" dir={dir}>
        <TabsList className="w-full justify-start h-auto flex-wrap gap-1 bg-secondary/30 p-1.5 rounded-xl">
          <TabsTrigger value="info" className="gap-1.5 text-xs" data-testid="tab-company-info">
            <Building2 className="w-3.5 h-3.5" />{t("معلومات الشركة", "Company Info")}
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-1.5 text-xs" data-testid="tab-system-settings">
            <Settings2 className="w-3.5 h-3.5" />{t("إعدادات النظام", "System Settings")}
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5 text-xs" data-testid="tab-print-templates">
            <Printer className="w-3.5 h-3.5" />{t("قوالب الطباعة", "Print Templates")}
          </TabsTrigger>
        </TabsList>

        {/* ═══ Company Info ═══ */}
        <TabsContent value="info" className="mt-4 space-y-6">
          <div className="p-3 rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30 text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{t(
              "بيانات التواصل والبيانات القانونية والفروع تُدار من تبويب \"الشركات\" و\"الفروع\". هنا الهوية والوصف وساعات العمل والتواصل الاجتماعي.",
              "Contact, legal, and branch data are managed in the \"Companies\" and \"Branches\" tabs. Here you manage identity, description, working hours, and social accounts.",
            )}</span>
          </div>

          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Building2 className="w-4 h-4 text-primary" />{t("الهوية والتعريف", "Identity & Description")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SettingsField label={t("اسم الشركة (عربي)", "Company Name (Arabic)")} value={form.companyNameAr} onChange={(v) => updateField("companyNameAr", v)} placeholder={t("مثال: شركة سكابكس", "e.g. Scapex Co.")} />
                <SettingsField label={t("اسم الشركة (إنجليزي)", "Company Name (English)")} value={form.companyNameEn} onChange={(v) => updateField("companyNameEn", v)} placeholder="e.g. Scapex Company" dir="ltr" />
              </div>
              <SettingsField label={t("نبذة عن الشركة (عربي)", "Company Description (Arabic)")} value={form.descriptionAr} onChange={(v) => updateField("descriptionAr", v)} textarea />
              <SettingsField label={t("نبذة عن الشركة (إنجليزي)", "Company Description (English)")} value={form.descriptionEn} onChange={(v) => updateField("descriptionEn", v)} textarea dir="ltr" />
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Clock className="w-4 h-4 text-primary" />{t("ساعات العمل", "Working Hours")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SettingsField label={t("ساعات العمل (عربي)", "Working Hours (Arabic)")} value={form.workingHoursAr} onChange={(v) => updateField("workingHoursAr", v)} />
                <SettingsField label={t("ساعات العمل (إنجليزي)", "Working Hours (English)")} value={form.workingHoursEn} onChange={(v) => updateField("workingHoursEn", v)} dir="ltr" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Globe className="w-4 h-4 text-primary" />{t("حسابات التواصل الاجتماعي", "Social Media Accounts")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <SettingsField label="Twitter / X" value={form.twitterHandle} onChange={(v) => updateField("twitterHandle", v)} dir="ltr" placeholder="@company" />
                <SettingsField label="LinkedIn URL" value={form.linkedinUrl} onChange={(v) => updateField("linkedinUrl", v)} dir="ltr" placeholder="https://linkedin.com/company/..." />
                <SettingsField label="WhatsApp" value={form.whatsapp} onChange={(v) => updateField("whatsapp", v)} dir="ltr" placeholder="+966XXXXXXXXX" />
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-3 justify-end">
            <Button variant="outline" onClick={handleResetInfo} className="gap-1.5" data-testid="button-reset-company-info"><RotateCcw className="w-3.5 h-3.5" />{t("استعادة الافتراضي", "Reset")}</Button>
            <Button onClick={handleSaveInfo} className="gap-1.5 min-w-[140px]" disabled={!hasChanges} data-testid="button-save-company-info"><Save className="w-3.5 h-3.5" />{t("حفظ التغييرات", "Save")}</Button>
          </div>
        </TabsContent>

        {/* ═══ System Settings ═══ */}
        <TabsContent value="system" className="mt-4 space-y-6">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><ImageIcon className="w-4 h-4 text-primary" />{t("هوية النظام (البراندنج)", "System Branding")}</CardTitle>
              <p className="text-xs text-muted-foreground">{t("الشعار والاسم المعروض في صفحة الدخول والقائمة الجانبية للشركة الرئيسية", "Logo and name shown on the login page and sidebar for the main company")}</p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-medium">{t("شعار النظام", "System Logo")}</Label>
                <div className="flex items-start gap-4">
                  <div className="w-20 h-20 rounded-xl border-2 border-dashed border-border/50 bg-secondary/20 flex items-center justify-center shrink-0 overflow-hidden">
                    {sysForm.brandLogo ? (
                      <img src={sysForm.brandLogo} alt="logo" className="w-full h-full object-contain p-1" />
                    ) : (
                      <ImageIcon className="w-7 h-7 text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="cursor-pointer">
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50 bg-secondary/30 hover:bg-secondary/60 transition-colors text-sm font-medium">
                        <ImageIcon className="w-4 h-4" />{t("رفع صورة الشعار", "Upload Logo")}
                      </div>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml,image/webp"
                        className="hidden"
                        data-testid="input-brand-logo"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 2 * 1024 * 1024) { alert(t("الحجم الأقصى 2MB", "Max size is 2MB")); return; }
                          const reader = new FileReader();
                          reader.onload = (ev) => { setSysForm((prev) => ({ ...prev, brandLogo: ev.target?.result as string })); setHasSysChanges(true); };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                    {sysForm.brandLogo && (
                      <button
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors text-xs"
                        onClick={() => { setSysForm((prev) => ({ ...prev, brandLogo: "" })); setHasSysChanges(true); }}
                        data-testid="button-remove-logo"
                      >
                        <X className="w-3 h-3" />{t("حذف الشعار", "Remove Logo")}
                      </button>
                    )}
                    <p className="text-[11px] text-muted-foreground">{t("PNG أو SVG أو JPG — بحد أقصى 2MB", "PNG, SVG or JPG — max 2MB")}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">{t("اسم النظام / المنصة", "System / Platform Name")}</Label>
                  <Input value={sysForm.brandName} onChange={(e) => updateSysField("brandName", e.target.value)} className="text-sm" placeholder="Scapex" data-testid="input-brand-name" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">{t("النص التوضيحي (عربي)", "Subtitle (Arabic)")}</Label>
                  <Input value={sysForm.brandSubtitleAr} onChange={(e) => updateSysField("brandSubtitleAr", e.target.value)} className="text-sm" dir="rtl" placeholder="منصة إدارة الأعمال الذكية" data-testid="input-brand-subtitle-ar" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">{t("النص التوضيحي (إنجليزي)", "Subtitle (English)")}</Label>
                  <Input value={sysForm.brandSubtitleEn} onChange={(e) => updateSysField("brandSubtitleEn", e.target.value)} className="text-sm" dir="ltr" placeholder="Smart Business Management Platform" data-testid="input-brand-subtitle-en" />
                </div>
              </div>

              <div className="p-4 rounded-xl border border-border/40 bg-secondary/20 space-y-1">
                <p className="text-[10px] text-muted-foreground mb-2">{t("معاينة مباشرة", "Live Preview")}</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shrink-0 overflow-hidden">
                    {sysForm.brandLogo ? (
                      <img src={sysForm.brandLogo} alt="" className="w-full h-full object-contain p-0.5" />
                    ) : (
                      <span className="text-white font-black text-sm">{(sysForm.brandName || "S").charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-sm leading-tight">{sysForm.brandName || "Scapex"}</p>
                    <p className="text-[10px] text-muted-foreground">{isRtl ? (sysForm.brandSubtitleAr || "منصة إدارة الأعمال الذكية") : (sysForm.brandSubtitleEn || "Smart Business Management Platform")}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Clock className="w-4 h-4 text-primary" />{t("نظام الوقت", "Time Format")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Label className="text-xs font-medium">{t("صيغة الوقت", "Time Format")}</Label>
                <Select value={sysForm.timeFormat} onValueChange={(v) => { setSysForm((prev) => ({ ...prev, timeFormat: v as "24h" | "12h" })); setHasSysChanges(true); }}>
                  <SelectTrigger data-testid="select-time-format" className="w-full sm:w-[280px]"><SelectValue /></SelectTrigger>
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
                <Select value={sysForm.dateFormat} onValueChange={(v) => { setSysForm((prev) => ({ ...prev, dateFormat: v as "gregorian" | "hijri" | "both" })); setHasSysChanges(true); }}>
                  <SelectTrigger data-testid="select-date-format" className="w-full sm:w-[280px]"><SelectValue /></SelectTrigger>
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
                <Select value={fontSelectValue} onValueChange={(v) => { setSysForm((prev) => ({ ...prev, fontFamily: v as FontFamily })); setHasSysChanges(true); }}>
                  <SelectTrigger data-testid="select-font-family" className="w-full sm:w-[320px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {allFontOptions.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        <span style={{ fontFamily: f.family }}>{isRtl ? f.labelAr : f.label}</span>
                        {f.custom && <span className="text-[10px] text-muted-foreground ms-2">({t("مخصص", "custom")})</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="p-4 rounded-lg bg-secondary/30 border border-border/30" style={{ fontFamily: allFontOptions.find((f) => f.value === fontSelectValue)?.family }}>
                  <p className="text-sm mb-1 font-semibold">{t("معاينة الخط", "Font Preview")}</p>
                  <p className="text-xs text-muted-foreground">{t("هذا نص تجريبي لمعاينة شكل الخط المختار في النظام — 0123456789", "This is a sample text to preview the selected font — 0123456789")}</p>
                </div>

                <div className="pt-3 border-t border-border/30 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <Label className="text-xs font-medium">{t("خطوط مخصصة", "Custom Fonts")}</Label>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{t("ارفع ملف خط (TTF, OTF, WOFF, WOFF2) بحد أقصى 2MB — سيظهر لجميع المستخدمين", "Upload a font file (TTF, OTF, WOFF, WOFF2), max 2MB — visible to all users")}</p>
                    </div>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept=".ttf,.otf,.woff,.woff2"
                        className="hidden"
                        disabled={uploadingFont}
                        onChange={(e) => { handleFontUpload(e.target.files?.[0] || null); e.target.value = ""; }}
                        data-testid="input-upload-font"
                      />
                      <span className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50 bg-secondary/30 hover:bg-secondary/60 transition-colors text-sm font-medium">
                        <Upload className="w-4 h-4" />
                        {uploadingFont ? t("جارٍ الرفع...", "Uploading...") : t("رفع خط جديد", "Upload New Font")}
                      </span>
                    </label>
                  </div>
                  {customFonts.length > 0 && (
                    <div className="space-y-2">
                      {customFonts.map((f) => (
                        <div key={f.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-border/40 bg-secondary/20" data-testid={`row-custom-font-${f.id}`}>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate" style={{ fontFamily: `'${f.family}', sans-serif` }}>{f.name}</p>
                            <p className="text-[11px] text-muted-foreground" style={{ fontFamily: `'${f.family}', sans-serif` }}>{t("نموذج: أبجد هوز ABC abc 123", "Sample: ABC abc 123 أبجد")}</p>
                          </div>
                          <Button variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => handleFontDelete(f.id, f.name)} data-testid={`button-delete-font-${f.id}`}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
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
                  {FONT_SIZE_OPTIONS.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      className={cn(
                        "flex-1 py-3 px-4 rounded-xl border-2 text-center transition-all",
                        sysForm.fontSize === s.value ? "border-primary bg-primary/5 text-primary font-semibold" : "border-border/50 hover:border-primary/30",
                      )}
                      onClick={() => { setSysForm((prev) => ({ ...prev, fontSize: s.value as FontSize })); setHasSysChanges(true); }}
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
            <Button onClick={handleSaveSys} className="gap-1.5 min-w-[140px]" disabled={!hasSysChanges} data-testid="button-save-system"><Save className="w-3.5 h-3.5" />{t("حفظ الإعدادات", "Save Settings")}</Button>
          </div>
        </TabsContent>

        {/* ═══ Print Templates ═══ */}
        <TabsContent value="templates" className="mt-4 space-y-6">
          <div className="p-3 rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30 text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{t(
              "خصص النصوص التي تظهر في تذييل عروض الأسعار والفواتير والخطابات الرسمية عند الطباعة لهذه الشركة.",
              "Customize the footer text shown on printed proposals, invoices, and official letters for this company.",
            )}</span>
          </div>

          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4 text-primary" />{t("قالب عرض السعر", "Proposal Template")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SettingsField label={t("تذييل عرض السعر (عربي)", "Proposal Footer (Arabic)")} value={sysForm.proposalFooterAr} onChange={(v) => updateSysField("proposalFooterAr", v)} textarea />
                <SettingsField label={t("تذييل عرض السعر (إنجليزي)", "Proposal Footer (English)")} value={sysForm.proposalFooterEn} onChange={(v) => updateSysField("proposalFooterEn", v)} textarea dir="ltr" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4 text-green-600" />{t("قالب الفاتورة", "Invoice Template")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SettingsField label={t("تذييل الفاتورة (عربي)", "Invoice Footer (Arabic)")} value={sysForm.invoiceFooterAr} onChange={(v) => updateSysField("invoiceFooterAr", v)} textarea />
                <SettingsField label={t("تذييل الفاتورة (إنجليزي)", "Invoice Footer (English)")} value={sysForm.invoiceFooterEn} onChange={(v) => updateSysField("invoiceFooterEn", v)} textarea dir="ltr" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4 text-violet-600" />{t("قالب الخطابات الرسمية", "Official Letter Template")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SettingsField label={t("ترويسة الخطاب (عربي)", "Letter Header (Arabic)")} value={sysForm.letterHeaderAr} onChange={(v) => updateSysField("letterHeaderAr", v)} textarea placeholder={t("نص الترويسة الرسمية...", "Official header text...")} />
                <SettingsField label={t("ترويسة الخطاب (إنجليزي)", "Letter Header (English)")} value={sysForm.letterHeaderEn} onChange={(v) => updateSysField("letterHeaderEn", v)} textarea dir="ltr" placeholder="Official header text..." />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SettingsField label={t("تذييل الخطاب (عربي)", "Letter Footer (Arabic)")} value={sysForm.letterFooterAr} onChange={(v) => updateSysField("letterFooterAr", v)} textarea placeholder={t("نص التذييل الرسمي...", "Official footer text...")} />
                <SettingsField label={t("تذييل الخطاب (إنجليزي)", "Letter Footer (English)")} value={sysForm.letterFooterEn} onChange={(v) => updateSysField("letterFooterEn", v)} textarea dir="ltr" placeholder="Official footer text..." />
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-3 justify-end">
            <Button variant="outline" onClick={handleResetSys} className="gap-1.5"><RotateCcw className="w-3.5 h-3.5" />{t("استعادة الافتراضي", "Reset")}</Button>
            <Button onClick={handleSaveSys} className="gap-1.5 min-w-[140px]" disabled={!hasSysChanges} data-testid="button-save-templates"><Save className="w-3.5 h-3.5" />{t("حفظ القوالب", "Save Templates")}</Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
