import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Building2, Mail, Phone, MapPin, Clock, Globe, Send,
  MessageSquare, Headphones, Shield, Server, Database,
  Linkedin, Twitter, MessageCircle, CheckCircle2, Info,
  Monitor, Layers, Code2, Cpu
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { SystemUser } from "@/lib/permissions";

const SUPPORT_CATEGORIES = [
  { id: "technical", ar: "مشكلة تقنية", en: "Technical Issue" },
  { id: "feature", ar: "طلب ميزة جديدة", en: "Feature Request" },
  { id: "account", ar: "مشكلة في الحساب", en: "Account Issue" },
  { id: "billing", ar: "استفسار مالي", en: "Billing Inquiry" },
  { id: "training", ar: "طلب تدريب", en: "Training Request" },
  { id: "other", ar: "أخرى", en: "Other" },
];

const SYSTEM_STATS = [
  { icon: Layers, value: "22", ar: "وحدة عمل", en: "Modules" },
  { icon: Database, value: "62", ar: "جدول بيانات", en: "Database Tables" },
  { icon: Globe, value: "AR/EN", ar: "ثنائي اللغة", en: "Bilingual" },
  { icon: Shield, value: "RBAC", ar: "نظام صلاحيات", en: "Access Control" },
];

import { getAboutData } from "@/lib/companySettings";
export { type CompanyBranch, type AboutSettings, DEFAULT_ABOUT, getAboutData } from "@/lib/companySettings";

export default function AboutModule() {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";
  const t = (ar: string, en: string) => isRtl ? ar : en;
  const { toast } = useToast();
  const currentUser: SystemUser | null = JSON.parse(localStorage.getItem("user") || "null");
  const aboutData = getAboutData();

  const [supportForm, setSupportForm] = useState({
    name: currentUser?.name || "",
    email: currentUser?.email || "",
    category: "",
    subject: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!supportForm.category || !supportForm.subject || !supportForm.message) {
      toast({
        title: t("تنبيه", "Notice"),
        description: t("يرجى تعبئة جميع الحقول المطلوبة", "Please fill in all required fields"),
        variant: "destructive",
      });
      return;
    }

    const tickets = JSON.parse(localStorage.getItem("scapex_support_tickets") || "[]");
    tickets.push({
      id: `TKT-${Date.now()}`,
      ...supportForm,
      status: "open",
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem("scapex_support_tickets", JSON.stringify(tickets));

    setSubmitted(true);
    toast({
      title: t("تم الإرسال بنجاح", "Submitted Successfully"),
      description: t("سيتم التواصل معك في أقرب وقت", "We will contact you shortly"),
    });
  };

  const resetForm = () => {
    setSupportForm({
      name: currentUser?.name || "",
      email: currentUser?.email || "",
      category: "",
      subject: "",
      message: "",
    });
    setSubmitted(false);
  };

  return (
    <MainLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto" dir={dir}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Info className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-about-title">
              {t("حول النظام", "About")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("معلومات النظام والتواصل والدعم الفني", "System info, contact & support")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-border/50 overflow-hidden">
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6 border-b border-border/30">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-3xl">S</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold" data-testid="text-about-system-name">Scapex</h2>
                    <p className="text-sm text-muted-foreground">
                      {t("منصة إدارة الأعمال الذكية", "Smart Business Management Platform")}
                    </p>
                    <Badge variant="secondary" className="mt-1 text-[10px]" data-testid="text-about-version">
                      {__APP_VERSION__}
                    </Badge>
                  </div>
                </div>
              </div>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-about-description">
                  {t(aboutData.descriptionAr, aboutData.descriptionEn)}
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
                  {SYSTEM_STATS.map((stat) => (
                    <div
                      key={stat.en}
                      className="text-center p-3 rounded-xl bg-secondary/30 border border-border/30"
                    >
                      <stat.icon className="w-5 h-5 mx-auto mb-1.5 text-primary" />
                      <p className="text-lg font-bold" data-testid={`text-stat-${stat.en.toLowerCase().replace(/\s/g, "-")}`}>
                        {stat.value}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{t(stat.ar, stat.en)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-5">
                  <Headphones className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-bold" data-testid="text-support-title">
                    {t("طلب الدعم والمساعدة", "Support & Help Request")}
                  </h3>
                </div>

                {submitted ? (
                  <div className="text-center py-10 space-y-3" data-testid="support-success">
                    <CheckCircle2 className="w-14 h-14 mx-auto text-green-500" />
                    <h4 className="text-lg font-bold">
                      {t("تم إرسال طلبك بنجاح!", "Your request has been submitted!")}
                    </h4>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      {t(
                        "شكراً لتواصلك معنا. سيتم مراجعة طلبك والرد عليك عبر البريد الإلكتروني في أقرب وقت.",
                        "Thank you for reaching out. Your request will be reviewed and we'll respond via email shortly."
                      )}
                    </p>
                    <Button variant="outline" onClick={resetForm} className="mt-3" data-testid="button-new-ticket">
                      {t("إرسال طلب جديد", "Submit Another Request")}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs">{t("الاسم", "Name")}</Label>
                        <Input
                          value={supportForm.name}
                          onChange={(e) => setSupportForm({ ...supportForm, name: e.target.value })}
                          placeholder={t("اسمك الكامل", "Your full name")}
                          data-testid="input-support-name"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">{t("البريد الإلكتروني", "Email")}</Label>
                        <Input
                          type="email"
                          value={supportForm.email}
                          onChange={(e) => setSupportForm({ ...supportForm, email: e.target.value })}
                          placeholder="name@company.sa"
                          dir="ltr"
                          data-testid="input-support-email"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs">{t("نوع الطلب", "Request Type")} *</Label>
                        <Select
                          value={supportForm.category}
                          onValueChange={(v) => setSupportForm({ ...supportForm, category: v })}
                        >
                          <SelectTrigger data-testid="select-support-category">
                            <SelectValue placeholder={t("اختر النوع", "Select type")} />
                          </SelectTrigger>
                          <SelectContent>
                            {SUPPORT_CATEGORIES.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {t(cat.ar, cat.en)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">{t("الموضوع", "Subject")} *</Label>
                        <Input
                          value={supportForm.subject}
                          onChange={(e) => setSupportForm({ ...supportForm, subject: e.target.value })}
                          placeholder={t("موضوع الطلب", "Request subject")}
                          data-testid="input-support-subject"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">{t("تفاصيل الطلب", "Details")} *</Label>
                      <Textarea
                        value={supportForm.message}
                        onChange={(e) => setSupportForm({ ...supportForm, message: e.target.value })}
                        placeholder={t("اشرح طلبك بالتفصيل...", "Describe your request in detail...")}
                        rows={4}
                        data-testid="input-support-message"
                      />
                    </div>

                    <Button onClick={handleSubmit} className="w-full gap-2" data-testid="button-submit-support">
                      <Send className="w-4 h-4" />
                      {t("إرسال الطلب", "Submit Request")}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-border/50">
              <CardContent className="p-6 space-y-5">
                <div className="flex items-center gap-2 mb-1">
                  <Phone className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-bold">{t("معلومات التواصل", "Contact Info")}</h3>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t("اسم الشركة", "Company")}</p>
                      <p className="text-sm font-medium" data-testid="text-company-name">
                        {t(aboutData.companyNameAr || "شركة سكيبكس للحلول التقنية", aboutData.companyNameEn || "Scapex Technology Solutions")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t("العنوان", "Address")}</p>
                      <p className="text-sm font-medium whitespace-pre-line" data-testid="text-address">
                        {t(aboutData.address, aboutData.addressEn)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                      <Phone className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t("الهاتف", "Phone")}</p>
                      <p className="text-sm font-medium" dir="ltr" data-testid="text-phone">{aboutData.phone1}</p>
                      {aboutData.phone2 && <p className="text-sm font-medium" dir="ltr">{aboutData.phone2}</p>}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t("البريد الإلكتروني", "Email")}</p>
                      <p className="text-sm font-medium" dir="ltr" data-testid="text-email">{aboutData.email1}</p>
                      {aboutData.email2 && <p className="text-sm font-medium" dir="ltr">{aboutData.email2}</p>}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t("ساعات العمل", "Working Hours")}</p>
                      <p className="text-sm font-medium" data-testid="text-hours">
                        {t(aboutData.workingHoursAr, aboutData.workingHoursEn)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t("الدعم الفني: 24/7", "Technical Support: 24/7")}
                      </p>
                    </div>
                  </div>

                  {aboutData.website && (
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                        <Globe className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{t("الموقع الإلكتروني", "Website")}</p>
                        <a href={aboutData.website.startsWith("http") ? aboutData.website : `https://${aboutData.website}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline" dir="ltr" data-testid="text-website">{aboutData.website}</a>
                      </div>
                    </div>
                  )}

                  {(aboutData.crNumber || aboutData.vatNumber) && (
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-900/30 flex items-center justify-center shrink-0">
                        <Shield className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                      </div>
                      <div>
                        {aboutData.crNumber && (<>
                          <p className="text-xs text-muted-foreground">{t("السجل التجاري", "CR No.")}</p>
                          <p className="text-sm font-medium" dir="ltr" data-testid="text-cr-number">{aboutData.crNumber}</p>
                        </>)}
                        {aboutData.vatNumber && (<>
                          <p className="text-xs text-muted-foreground mt-1">{t("الرقم الضريبي", "VAT No.")}</p>
                          <p className="text-sm font-medium" dir="ltr" data-testid="text-vat-number">{aboutData.vatNumber}</p>
                        </>)}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <MessageCircle className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-bold">{t("تابعنا", "Follow Us")}</h3>
                </div>

                {aboutData.twitterHandle && (
                  <a
                    href={`https://twitter.com/${aboutData.twitterHandle.replace("@","")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                    data-testid="link-twitter"
                  >
                    <Twitter className="w-5 h-5 text-sky-500" />
                    <div>
                      <p className="text-sm font-medium">Twitter / X</p>
                      <p className="text-xs text-muted-foreground">{aboutData.twitterHandle}</p>
                    </div>
                  </a>
                )}

                {aboutData.linkedinUrl && (
                  <a
                    href={aboutData.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                    data-testid="link-linkedin"
                  >
                    <Linkedin className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium">LinkedIn</p>
                      <p className="text-xs text-muted-foreground">{t(aboutData.companyNameAr, aboutData.companyNameEn)}</p>
                    </div>
                  </a>
                )}

                {aboutData.whatsapp && (
                  <a
                    href={`https://wa.me/${aboutData.whatsapp.replace(/[^0-9]/g,"")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                    data-testid="link-whatsapp"
                  >
                    <MessageSquare className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="text-sm font-medium">WhatsApp</p>
                      <p className="text-xs text-muted-foreground" dir="ltr">{aboutData.whatsapp}</p>
                    </div>
                  </a>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Cpu className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-bold">{t("معلومات تقنية", "Technical Info")}</h3>
                </div>
                <div className="space-y-2.5 text-sm">
                  {[
                    { label: t("الإصدار", "Version"), value: __APP_VERSION__, testId: "text-tech-version" },
                    { label: t("الواجهة", "Frontend"), value: "React + TypeScript", testId: "text-tech-frontend" },
                    { label: t("الخادم", "Backend"), value: "Express.js + Node.js", testId: "text-tech-backend" },
                    { label: t("قاعدة البيانات", "Database"), value: "PostgreSQL + Drizzle", testId: "text-tech-database" },
                    { label: t("التصميم", "UI Framework"), value: "Tailwind CSS + shadcn/ui", testId: "text-tech-ui" },
                  ].map((item) => (
                    <div key={item.testId} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                      <span className="text-muted-foreground text-xs">{item.label}</span>
                      <span className="font-medium text-xs" data-testid={item.testId}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
