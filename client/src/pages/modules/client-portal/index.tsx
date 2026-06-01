import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import {
  LogOut, Bell, Building2, Sun, Moon, Palette, ChevronRight, ChevronLeft,
  FolderKanban, FileText, Receipt, MessageSquare, Loader2, ShieldCheck,
  Calendar, MapPin, User as UserIcon, ArrowLeft, ArrowRight, Send,
  FolderArchive, Upload, Download, X, FileSignature, ClipboardList, Pen, Check, RotateCcw,
  Smartphone, KeyRound, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import {
  portalLogin, portalVerifyLoginOtp, portalSendSignOtp,
  portalGetMe, portalListProjects, portalGetProject,
  portalListStages, portalListDocuments, portalListInvoices, portalListProposals,
  portalListMyInvoices, portalListMyContracts,
  portalApproveProposal, portalSignContract,
  portalSubmitRequest, portalListMyDocuments, portalDownloadDocument, portalUploadDocument,
  getPortalContact, getPortalToken, clearPortalSession,
  type PortalContact, type PortalProject, type PortalStage, type PortalDocument, type PortalInvoice,
  type PortalClientDocument, type PortalProposal, type PortalMyInvoice, type PortalMyContract,
} from "@/lib/portalApi";

export type PortalTheme = "default" | "ocean" | "forest" | "royal" | "sunset" | "slate";

export const PORTAL_THEMES: { id: PortalTheme; nameAr: string; nameEn: string; primary: string; bg: string; gradient: string; text: string; welcomeBg: string; welcomeText: string; }[] = [
  { id: "default", nameAr: "افتراضي", nameEn: "Default", primary: "from-blue-500 to-indigo-500", bg: "bg-slate-50 dark:bg-slate-950", gradient: "from-blue-50/80 to-indigo-50/60 dark:from-blue-950/20 dark:to-indigo-950/20", text: "text-blue-700 dark:text-blue-300", welcomeBg: "bg-blue-50 dark:bg-blue-950/30", welcomeText: "text-blue-700 dark:text-blue-300" },
  { id: "ocean", nameAr: "أزرق محيطي", nameEn: "Ocean", primary: "from-cyan-500 to-teal-500", bg: "bg-cyan-50/20 dark:bg-cyan-950/10", gradient: "from-cyan-50/60 to-teal-50/60 dark:from-cyan-950/20 dark:to-teal-950/20", text: "text-teal-700 dark:text-teal-300", welcomeBg: "bg-cyan-50 dark:bg-cyan-950/30", welcomeText: "text-teal-700 dark:text-teal-300" },
  { id: "forest", nameAr: "أخضر غابات", nameEn: "Forest", primary: "from-emerald-500 to-green-500", bg: "bg-emerald-50/20 dark:bg-emerald-950/10", gradient: "from-emerald-50/60 to-green-50/60 dark:from-emerald-950/20 dark:to-green-950/20", text: "text-emerald-700 dark:text-emerald-300", welcomeBg: "bg-emerald-50 dark:bg-emerald-950/30", welcomeText: "text-emerald-700 dark:text-emerald-300" },
  { id: "royal", nameAr: "بنفسجي ملكي", nameEn: "Royal", primary: "from-violet-500 to-purple-500", bg: "bg-violet-50/20 dark:bg-violet-950/10", gradient: "from-violet-50/60 to-purple-50/60 dark:from-violet-950/20 dark:to-purple-950/20", text: "text-violet-700 dark:text-violet-300", welcomeBg: "bg-violet-50 dark:bg-violet-950/30", welcomeText: "text-violet-700 dark:text-violet-300" },
  { id: "sunset", nameAr: "غروب", nameEn: "Sunset", primary: "from-orange-400 to-rose-500", bg: "bg-orange-50/20 dark:bg-orange-950/10", gradient: "from-orange-50/60 to-rose-50/60 dark:from-orange-950/20 dark:to-rose-950/20", text: "text-orange-700 dark:text-orange-300", welcomeBg: "bg-orange-50 dark:bg-orange-950/30", welcomeText: "text-orange-700 dark:text-orange-300" },
  { id: "slate", nameAr: "رمادي أنيق", nameEn: "Slate", primary: "from-slate-500 to-gray-600", bg: "bg-gray-50 dark:bg-gray-950", gradient: "from-slate-100/60 to-gray-100/60 dark:from-slate-900/20 dark:to-gray-900/20", text: "text-slate-700 dark:text-slate-300", welcomeBg: "bg-slate-100 dark:bg-slate-900/40", welcomeText: "text-slate-700 dark:text-slate-300" },
];

const STORAGE_THEME = "scapex_portal_theme";

const STAGE_STATUS_AR: Record<string, string> = { pending: "قيد الانتظار", in_progress: "قيد التنفيذ", completed: "مكتملة", on_hold: "متوقفة", cancelled: "ملغاة" };
const STAGE_STATUS_EN: Record<string, string> = { pending: "Pending", in_progress: "In progress", completed: "Completed", on_hold: "On hold", cancelled: "Cancelled" };
const STAGE_STATUS_COLOR: Record<string, string> = { pending: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300", in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300", completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300", on_hold: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300", cancelled: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300" };

function getPortalTheme(): PortalTheme {
  try { return (localStorage.getItem(STORAGE_THEME) as PortalTheme) || "default"; } catch { return "default"; }
}

// ── Login screen ──────────────────────────────────────────────────────────
function PortalLoginScreen({ onLogin, theme, isRtl, t, toggleLang }: { onLogin: (c: PortalContact) => void; theme: typeof PORTAL_THEMES[number]; isRtl: boolean; t: (a: string, e: string) => string; toggleLang: () => void; }) {
  const [nationalId, setNationalId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // OTP step state
  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [tempKey, setTempKey] = useState("");
  const [otpHint, setOtpHint] = useState("");
  const [otpDevCode, setOtpDevCode] = useState("");
  const [otpCode, setOtpCode] = useState("");

  const submit = async () => {
    setError("");
    if (!nationalId.trim() || !password) {
      setError(t("يرجى إدخال رقم الهوية وكلمة المرور", "Please enter national ID and password"));
      return;
    }
    setLoading(true);
    try {
      const res = await portalLogin(nationalId.trim(), password);
      if (res.requiresOtp) {
        setTempKey(res.tempKey);
        setOtpHint(res.hint);
        setOtpDevCode(res.devCode || "");
        setStep("otp");
      } else {
        onLogin(res.contact);
      }
    } catch (e: any) {
      setError(e?.message === "Invalid credentials"
        ? t("رقم الهوية أو كلمة المرور غير صحيحة", "Invalid national ID or password")
        : (e?.message || t("فشل تسجيل الدخول", "Login failed")));
    } finally { setLoading(false); }
  };

  const verifyOtp = async () => {
    setError("");
    if (!otpCode.trim()) {
      setError(t("يرجى إدخال رمز التحقق", "Please enter the verification code"));
      return;
    }
    setLoading(true);
    try {
      const res = await portalVerifyLoginOtp(tempKey, otpCode.trim());
      onLogin(res.contact);
    } catch (e: any) {
      setError(e?.message || t("رمز غير صحيح. حاول مجدداً.", "Incorrect code. Please try again."));
    } finally { setLoading(false); }
  };

  return (
    <div className={cn("min-h-screen flex items-center justify-center p-4", theme.bg)} dir={isRtl ? "rtl" : "ltr"}>
      <div className="w-full max-w-md">
        <div className={cn("rounded-t-2xl p-8 bg-gradient-to-r text-white", theme.primary)}>
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg mx-auto mb-4">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold">{t("بوابة العملاء", "Customer Portal")}</h2>
            <p className="text-white/80 text-sm mt-2">
              {t("سجل دخولك برقم الهوية لمتابعة مشاريعك", "Sign in with your national ID to track your projects")}
            </p>
          </div>
        </div>

        <div className="bg-card border border-t-0 border-border/50 shadow-xl rounded-b-2xl p-8">
          {step === "credentials" ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium block">{t("رقم الهوية الوطنية", "National ID")}</label>
              <input
                type="text"
                placeholder="1xxxxxxxxx"
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
                className="w-full h-11 rounded-lg border border-input bg-secondary/30 text-sm px-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                dir="ltr"
                data-testid="input-portal-national-id"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium block">{t("كلمة المرور", "Password")}</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
                className="w-full h-11 rounded-lg border border-input bg-secondary/30 text-sm px-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                data-testid="input-portal-password"
              />
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2.5 text-sm text-destructive" data-testid="text-portal-login-error">
                {error}
              </div>
            )}

            <Button
              className={cn("w-full h-11 text-base font-medium mt-2 bg-gradient-to-r text-white border-0", theme.primary)}
              onClick={submit}
              disabled={loading}
              data-testid="button-portal-login"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("تسجيل الدخول", "Sign In")}
            </Button>
          </div>
          ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
              <Smartphone className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  {t("تم إرسال رمز التحقق", "Verification code sent")}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5" dir="ltr">
                  {otpHint}
                </p>
              </div>
            </div>

            {otpDevCode && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700">
                <KeyRound className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-300">{t("وضع التطوير — الرمز:", "Dev mode — Code:")}</p>
                  <p className="text-xl font-mono font-bold tracking-widest text-amber-800 dark:text-amber-200" data-testid="text-dev-otp">{otpDevCode}</p>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium block">{t("رمز التحقق (6 أرقام)", "Verification Code (6 digits)")}</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="• • • • • •"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => { if (e.key === "Enter") verifyOtp(); }}
                className="w-full h-12 rounded-lg border border-input bg-secondary/30 text-center text-xl font-mono tracking-widest outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                dir="ltr"
                autoFocus
                data-testid="input-portal-otp"
              />
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2.5 text-sm text-destructive" data-testid="text-portal-otp-error">
                {error}
              </div>
            )}

            <Button
              className={cn("w-full h-11 text-base font-medium bg-gradient-to-r text-white border-0", theme.primary)}
              onClick={verifyOtp}
              disabled={loading}
              data-testid="button-portal-verify-otp"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("تحقق وادخل", "Verify & Sign In")}
            </Button>

            <button
              className="w-full text-xs text-muted-foreground hover:text-foreground text-center pt-1"
              onClick={() => { setStep("credentials"); setError(""); setOtpCode(""); }}
              data-testid="button-portal-back-to-credentials"
            >
              {t("← العودة لإدخال البيانات", "← Back to credentials")}
            </button>
          </div>
          )}

          <div className="mt-6 pt-4 border-t border-border/50 space-y-2 text-center">
            <Button variant="ghost" size="sm" onClick={toggleLang} className="text-xs">
              {isRtl ? "English" : "العربية"}
            </Button>
            <p className="text-xs text-muted-foreground">
              {t("للحصول على بيانات الدخول تواصل مع مدير حسابك", "Contact your account manager for login credentials")}
            </p>
            <p className="text-xs text-muted-foreground">Scapex ERP © 2026</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Shared docs list (used in ProjectDetail and standalone My Documents) ──
const SCOPE_LABEL_AR: Record<string, string> = { project: "مشروع", deal: "صفقة", company: "شركة" };
const SCOPE_LABEL_EN: Record<string, string> = { project: "Project", deal: "Deal", company: "Company" };

function DocsList({ docs, isRtl, t, theme }: { docs: PortalDocument[]; isRtl: boolean; t: (a: string, e: string) => string; theme: typeof PORTAL_THEMES[number]; }) {
  const [dlLoading, setDlLoading] = useState<number | null>(null);

  const openDoc = async (d: PortalDocument) => {
    if (d.fileUrl) { window.open(d.fileUrl, "_blank"); return; }
    if (!d.hasBlob) return;
    setDlLoading(d.id);
    try {
      const blob = await portalDownloadDocument(d.id);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch { /* ignore */ }
    finally { setDlLoading(null); }
  };

  if (docs.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8 sm:col-span-2">{t("لا توجد مستندات مشتركة معك", "No documents shared with you")}</p>;
  }

  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {docs.map((d) => {
        const dtitle = (isRtl ? d.titleAr : (d.titleEn || d.titleAr)) || "—";
        const scopeLabel = isRtl ? (SCOPE_LABEL_AR[d.scope] || d.scope) : (SCOPE_LABEL_EN[d.scope] || d.scope);
        const canOpen = !!(d.fileUrl || d.hasBlob);
        return (
          <button
            key={d.id}
            onClick={() => canOpen && openDoc(d)}
            disabled={!canOpen || dlLoading === d.id}
            className={cn(
              "bg-card border border-border/50 rounded-xl p-4 transition-colors flex items-start gap-3 text-left w-full",
              canOpen ? "hover:border-primary cursor-pointer" : "opacity-60 cursor-default"
            )}
            data-testid={`btn-document-${d.id}`}
          >
            <div className={cn("w-10 h-10 rounded-lg bg-gradient-to-r flex items-center justify-center text-white shrink-0", theme.primary)}>
              {dlLoading === d.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate text-sm">{dtitle}</p>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <span className="text-xs text-muted-foreground">{d.type || d.mimeType || "—"}{d.version ? ` • v${d.version}` : ""}</span>
                <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                  d.scope === "deal" ? "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300" :
                  d.scope === "project" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" :
                  "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                )}>{scopeLabel}</span>
                {d.source === "client" && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                    {t("رفعتَه أنت", "Uploaded by you")}
                  </span>
                )}
              </div>
            </div>
            {canOpen && <Download className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />}
          </button>
        );
      })}
    </div>
  );
}

// ── Project detail ────────────────────────────────────────────────────────
function ProjectDetail({ projectId, onBack, isRtl, t, theme }: { projectId: number; onBack: () => void; isRtl: boolean; t: (a: string, e: string) => string; theme: typeof PORTAL_THEMES[number]; }) {
  const [project, setProject] = useState<PortalProject | null>(null);
  const [stages, setStages] = useState<PortalStage[]>([]);
  const [docs, setDocs] = useState<PortalDocument[]>([]);
  const [invs, setInvs] = useState<PortalInvoice[]>([]);
  const [props, setProps] = useState<PortalProposal[]>([]);
  const [tab, setTab] = useState<"stages" | "docs" | "invoices" | "proposals">("stages");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      portalGetProject(projectId),
      portalListStages(projectId),
      portalListDocuments(projectId),
      portalListInvoices(projectId).catch(() => []),
      portalListProposals().catch(() => []),
    ]).then(([p, s, d, i, pr]) => {
      setProject(p);
      setStages(s.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)));
      setDocs(d);
      setInvs(i);
      setProps(pr);
    }).catch(() => { /* show empty */ })
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (!project) return <div className="text-center text-muted-foreground py-12">{t("المشروع غير موجود", "Project not found")}</div>;

  const Back = isRtl ? ArrowRight : ArrowLeft;
  const name = (isRtl ? project.nameAr : (project.nameEn || project.nameAr)) || "—";

  return (
    <div className="space-y-6" data-testid="view-portal-project-detail">
      <button onClick={onBack} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground" data-testid="button-back-to-projects">
        <Back className="w-4 h-4" />
        {t("العودة للمشاريع", "Back to projects")}
      </button>

      <div className={cn("rounded-2xl p-6 bg-gradient-to-r text-white", theme.primary)}>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-white/70 text-xs uppercase tracking-wider">{project.projectCode || `#${project.id}`}</p>
            <h2 className="text-2xl font-bold mt-1" data-testid="text-project-name">{name}</h2>
            {project.description && <p className="text-white/80 text-sm mt-2 max-w-2xl">{project.description}</p>}
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{project.progress ?? 0}%</div>
            <div className="text-white/70 text-xs">{t("نسبة الإنجاز", "Progress")}</div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-sm text-white/90">
          {project.startDate && <span className="inline-flex items-center gap-1.5"><Calendar className="w-4 h-4" />{project.startDate} → {project.endDate || "—"}</span>}
          {project.city && <span className="inline-flex items-center gap-1.5"><MapPin className="w-4 h-4" />{project.city}</span>}
          {project.status && <span className="px-2 py-0.5 rounded-full bg-white/20 text-xs">{project.status}</span>}
        </div>
      </div>

      <div className="flex gap-2 border-b border-border/50 flex-wrap">
        {([
          { id: "stages", label: t("المراحل", "Stages"), icon: FolderKanban },
          { id: "docs", label: t("المستندات", "Documents"), icon: FileText },
          { id: "invoices", label: t("الفواتير", "Invoices"), icon: Receipt },
          { id: "proposals", label: t("عروض الأسعار", "Proposals"), icon: FileText },
        ] as const).map((tt) => (
          <button
            key={tt.id}
            onClick={() => setTab(tt.id)}
            className={cn("inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
              tab === tt.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
            data-testid={`tab-portal-${tt.id}`}
          >
            <tt.icon className="w-4 h-4" />
            {tt.label}
          </button>
        ))}
      </div>

      {tab === "stages" && (
        <div className="space-y-3">
          {stages.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">{t("لا توجد مراحل بعد", "No stages yet")}</p>}
          {stages.map((s) => {
            const stitle = (isRtl ? s.titleAr : (s.titleEn || s.titleAr)) || "—";
            const sStatus = s.status || "pending";
            return (
              <div key={s.id} className="bg-card border border-border/50 rounded-xl p-4" data-testid={`card-stage-${s.id}`}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium" data-testid={`text-stage-title-${s.id}`}>{stitle}</h4>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {s.assignee && <span className="inline-flex items-center gap-1"><UserIcon className="w-3.5 h-3.5" />{s.assignee.name}</span>}
                      {(s.expectedStart || s.expectedEnd) && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {s.expectedStart || "—"} → {s.expectedEnd || "—"}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full", STAGE_STATUS_COLOR[sStatus] || STAGE_STATUS_COLOR.pending)}>
                      {isRtl ? (STAGE_STATUS_AR[sStatus] || sStatus) : (STAGE_STATUS_EN[sStatus] || sStatus)}
                    </span>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className={cn("h-full bg-gradient-to-r", theme.primary)} style={{ width: `${s.progress ?? 0}%` }} />
                      </div>
                      <span className="text-muted-foreground tabular-nums">{s.progress ?? 0}%</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "docs" && (
        <DocsList docs={docs} isRtl={isRtl} t={t} theme={theme} />
      )}

      {tab === "invoices" && (
        <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
          {invs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t("لا توجد فواتير", "No invoices")}</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className={cn("px-4 py-2.5", isRtl ? "text-right" : "text-left")}>#</th>
                  <th className={cn("px-4 py-2.5", isRtl ? "text-right" : "text-left")}>{t("التاريخ", "Date")}</th>
                  <th className={cn("px-4 py-2.5", isRtl ? "text-right" : "text-left")}>{t("الإجمالي", "Total")}</th>
                  <th className={cn("px-4 py-2.5", isRtl ? "text-right" : "text-left")}>{t("الحالة", "Status")}</th>
                </tr>
              </thead>
              <tbody>
                {invs.map((i) => (
                  <tr key={i.id} className="border-t border-border/50" data-testid={`row-invoice-${i.id}`}>
                    <td className="px-4 py-2.5 font-mono text-xs">{i.invoiceNumber}</td>
                    <td className="px-4 py-2.5">{i.issueDate || "—"}</td>
                    <td className="px-4 py-2.5">{i.total} {i.currency}</td>
                    <td className="px-4 py-2.5"><span className="text-xs px-2 py-0.5 rounded-full bg-muted">{i.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "proposals" && (
        <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
          {props.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8" data-testid="text-no-proposals">
              {t("لا توجد عروض أسعار", "No proposals yet")}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className={cn("px-4 py-2.5", isRtl ? "text-right" : "text-left")}>{t("الرقم", "No.")}</th>
                  <th className={cn("px-4 py-2.5", isRtl ? "text-right" : "text-left")}>{t("المشروع", "Project")}</th>
                  <th className={cn("px-4 py-2.5", isRtl ? "text-right" : "text-left")}>{t("الإجمالي", "Total")}</th>
                  <th className={cn("px-4 py-2.5", isRtl ? "text-right" : "text-left")}>{t("الحالة", "Status")}</th>
                  <th className={cn("px-4 py-2.5", isRtl ? "text-right" : "text-left")}>{t("التاريخ", "Date")}</th>
                </tr>
              </thead>
              <tbody>
                {props.map((pr) => (
                  <tr key={pr.id} className="border-t border-border/50" data-testid={`row-proposal-${pr.id}`}>
                    <td className="px-4 py-2.5 font-mono text-xs">{pr.proposalNumber}</td>
                    <td className="px-4 py-2.5 max-w-[180px] truncate">{pr.projectName || "—"}</td>
                    <td className="px-4 py-2.5 tabular-nums">{pr.total} {pr.currency}</td>
                    <td className="px-4 py-2.5">
                      <span className={cn("text-xs px-2 py-0.5 rounded-full",
                        pr.status === "approved" ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300" :
                        pr.status === "sent" ? "bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300" :
                        pr.status === "rejected" ? "bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300" :
                        "bg-muted text-muted-foreground")}>
                        {pr.status === "draft" ? t("مسودة", "Draft") :
                         pr.status === "sent" ? t("مُرسل", "Sent") :
                         pr.status === "approved" ? t("مُوافق عليه", "Approved") :
                         pr.status === "rejected" ? t("مرفوض", "Rejected") :
                         pr.status === "converted_contract" ? t("تحوّل لعقد", "Converted") :
                         pr.status === "converted_invoice" ? t("تحوّل لفاتورة", "Invoiced") :
                         pr.status || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">
                      {pr.createdAt ? new Date(pr.createdAt).toLocaleDateString(isRtl ? "ar-SA" : "en-US") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

// ── Contact form ──────────────────────────────────────────────────────────
function ContactForm({ projects, onDone, isRtl, t, theme }: { projects: PortalProject[]; onDone: () => void; isRtl: boolean; t: (a: string, e: string) => string; theme: typeof PORTAL_THEMES[number]; }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    setErr("");
    if (!subject.trim() || !message.trim()) { setErr(t("الموضوع والرسالة مطلوبان", "Subject and message are required")); return; }
    setBusy(true);
    try {
      await portalSubmitRequest({ subject: subject.trim(), message: message.trim(), projectId: projectId ? Number(projectId) : null });
      setDone(true);
      setSubject(""); setMessage(""); setProjectId("");
      setTimeout(onDone, 1500);
    } catch (e: any) {
      setErr(e?.message || t("تعذر إرسال الطلب", "Failed to submit request"));
    } finally { setBusy(false); }
  };

  return (
    <div className="bg-card border border-border/50 rounded-xl p-5 max-w-2xl">
      <h3 className="font-semibold flex items-center gap-2 mb-4">
        <MessageSquare className="w-4 h-4" />
        {t("تواصل معنا", "Contact us")}
      </h3>

      {done && <div className="bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 rounded-lg px-3 py-2 text-sm mb-3" data-testid="text-request-sent">{t("تم إرسال طلبك بنجاح", "Your request was submitted")}</div>}

      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium block mb-1">{t("المشروع (اختياري)", "Project (optional)")}</label>
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="w-full h-10 rounded-lg border border-input bg-secondary/30 text-sm px-3" data-testid="select-request-project">
            <option value="">{t("بدون مشروع محدد", "No specific project")}</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{(isRtl ? p.nameAr : (p.nameEn || p.nameAr)) || `#${p.id}`}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium block mb-1">{t("الموضوع", "Subject")}</label>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full h-10 rounded-lg border border-input bg-secondary/30 text-sm px-3" data-testid="input-request-subject" />
        </div>
        <div>
          <label className="text-xs font-medium block mb-1">{t("الرسالة", "Message")}</label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} className="w-full rounded-lg border border-input bg-secondary/30 text-sm px-3 py-2" data-testid="input-request-message" />
        </div>
        {err && <div className="text-sm text-destructive">{err}</div>}
        <Button onClick={submit} disabled={busy} className={cn("bg-gradient-to-r text-white border-0", theme.primary)} data-testid="button-submit-request">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 me-2" />{t("إرسال", "Send")}</>}
        </Button>
      </div>
    </div>
  );
}

// ── Signature canvas ─────────────────────────────────────────────────────
function SigCanvas({ canvasRef, onDraw }: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onDraw: () => void;
}) {
  const drawing = useRef(false);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1e293b";
  }, [canvasRef]);

  const getPos = (e: React.MouseEvent | React.TouchEvent, c: HTMLCanvasElement) => {
    const r = c.getBoundingClientRect();
    const sx = c.width / r.width, sy = c.height / r.height;
    if ("touches" in e.nativeEvent && (e.nativeEvent as TouchEvent).touches.length > 0) {
      const touch = (e.nativeEvent as TouchEvent).touches[0];
      return { x: (touch.clientX - r.left) * sx, y: (touch.clientY - r.top) * sy };
    }
    const m = e as React.MouseEvent;
    return { x: (m.clientX - r.left) * sx, y: (m.clientY - r.top) * sy };
  };

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    const c = canvasRef.current; if (!c) return;
    drawing.current = true;
    const p = getPos(e, c), ctx = c.getContext("2d")!;
    ctx.beginPath(); ctx.moveTo(p.x, p.y);
  };

  const move = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current) return;
    const c = canvasRef.current; if (!c) return;
    const p = getPos(e, c), ctx = c.getContext("2d")!;
    ctx.lineTo(p.x, p.y); ctx.stroke(); onDraw();
  };

  const stop = () => { drawing.current = false; };

  return (
    <canvas
      ref={canvasRef}
      width={520} height={160}
      className="w-full rounded-xl border-2 border-dashed border-input bg-white cursor-crosshair"
      style={{ touchAction: "none", height: "160px" }}
      onMouseDown={start} onMouseMove={move} onMouseUp={stop} onMouseLeave={stop}
      onTouchStart={start} onTouchMove={move} onTouchEnd={stop}
    />
  );
}

// ── Sign / Approval modal (2-step: OTP → Signature) ──────────────────────
function SignModal({
  docTitle, docType, onSign, onClose, isRtl, t, theme, busy,
}: {
  docTitle: string; docType: "proposal" | "contract";
  onSign: (name: string, sig: string, otp?: string) => Promise<void>;
  onClose: () => void; isRtl: boolean;
  t: (a: string, e: string) => string;
  theme: typeof PORTAL_THEMES[number]; busy: boolean;
}) {
  const [sigStep, setSigStep] = useState<"otp" | "sign">("otp");
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpHint, setOtpHint] = useState("");
  const [otpDevCode, setOtpDevCode] = useState("");
  const [noPhone, setNoPhone] = useState(false);
  const [otpErr, setOtpErr] = useState("");

  const [name, setName] = useState("");
  const [hasDrawn, setHasDrawn] = useState(false);
  const [err, setErr] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const sendOtp = async () => {
    setOtpSending(true); setOtpErr("");
    try {
      const res = await portalSendSignOtp();
      if (res.noPhone) { setNoPhone(true); setSigStep("sign"); return; }
      setOtpSent(true);
      setOtpHint(res.hint || "");
      setOtpDevCode(res.devCode || "");
    } catch (e: any) {
      setOtpErr(e?.message || t("فشل إرسال الرمز", "Failed to send code"));
    } finally { setOtpSending(false); }
  };

  const proceedToSign = () => {
    setOtpErr("");
    if (!otp.trim()) { setOtpErr(t("يرجى إدخال رمز التحقق", "Please enter the verification code")); return; }
    setSigStep("sign");
  };

  const clearSig = () => {
    const c = canvasRef.current; if (!c) return;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    setHasDrawn(false);
  };

  const confirm = async () => {
    setErr("");
    if (!name.trim()) { setErr(t("يرجى كتابة اسمك الكامل", "Please enter your full name")); return; }
    if (!hasDrawn) { setErr(t("يرجى رسم توقيعك في المربع أدناه", "Please draw your signature below")); return; }
    const c = canvasRef.current; if (!c) return;
    try {
      await onSign(name.trim(), c.toDataURL("image/png"), noPhone ? undefined : otp.trim());
    } catch (e: any) {
      const msg = e?.message || "";
      if (msg === "otp_invalid") setErr(t("رمز التحقق غير صحيح", "Incorrect verification code"));
      else if (msg === "otp_expired") setErr(t("انتهت صلاحية الرمز. أعد الإرسال.", "Code expired. Please resend."));
      else setErr(msg || t("حدث خطأ", "An error occurred"));
    }
  };

  const label = docType === "proposal"
    ? t("الموافقة على عرض السعر والتوقيع", "Approve Proposal & Sign")
    : t("توقيع العقد", "Sign Contract");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4"
        onClick={(e) => e.stopPropagation()} data-testid="modal-sign">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-lg">{label}</h3>
            <p className="text-sm text-muted-foreground font-mono mt-0.5">{docTitle}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted shrink-0" data-testid="button-close-modal">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step indicator */}
        {!noPhone && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className={cn("flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold",
              sigStep === "otp" ? "bg-primary text-primary-foreground" : "bg-emerald-500 text-white")}>
              {sigStep === "otp" ? "1" : <Check className="w-3 h-3" />}
            </span>
            <span className={sigStep === "otp" ? "font-medium text-foreground" : "text-muted-foreground"}>
              {t("التحقق بالجوال", "Phone Verification")}
            </span>
            <div className="flex-1 h-px bg-border mx-1" />
            <span className={cn("flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold",
              sigStep === "sign" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>2</span>
            <span className={sigStep === "sign" ? "font-medium text-foreground" : "text-muted-foreground"}>
              {t("التوقيع الإلكتروني", "Electronic Signature")}
            </span>
          </div>
        )}

        {/* ── Step 1: OTP ── */}
        {sigStep === "otp" && (
          <div className="space-y-3">
            {!otpSent ? (
              <div className="text-center space-y-3 py-2">
                <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center mx-auto">
                  <Smartphone className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("سيتم إرسال رمز تحقق إلى رقم جوالك المسجل للتأكيد قبل التوقيع",
                     "A verification code will be sent to your registered mobile number before signing")}
                </p>
                {otpErr && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{otpErr}</p>}
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" onClick={onClose} className="flex-1" data-testid="button-cancel-sign">{t("إلغاء", "Cancel")}</Button>
                  <Button
                    onClick={sendOtp}
                    disabled={otpSending}
                    className={cn("flex-1 bg-gradient-to-r text-white border-0", theme.primary)}
                    data-testid="button-send-otp"
                  >
                    {otpSending ? <Loader2 className="w-4 h-4 animate-spin me-1" /> : <Smartphone className="w-4 h-4 me-1" />}
                    {t("أرسل رمز التحقق", "Send Verification Code")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                  <Smartphone className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200">{t("تم الإرسال إلى", "Code sent to")}</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-mono" dir="ltr">{otpHint}</p>
                  </div>
                </div>

                {otpDevCode && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700">
                    <KeyRound className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-amber-700 dark:text-amber-300">{t("وضع التطوير — الرمز:", "Dev mode — Code:")}</p>
                      <p className="text-2xl font-mono font-bold tracking-widest text-amber-800 dark:text-amber-200" data-testid="text-sign-dev-otp">{otpDevCode}</p>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-medium block">{t("رمز التحقق", "Verification Code")}</label>
                  <input
                    type="text" inputMode="numeric" maxLength={6}
                    placeholder="• • • • • •"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    onKeyDown={(e) => { if (e.key === "Enter") proceedToSign(); }}
                    className="w-full h-12 rounded-lg border border-input bg-background text-center text-xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/30"
                    dir="ltr" autoFocus
                    data-testid="input-sign-otp"
                  />
                </div>

                {otpErr && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{otpErr}</p>}

                <div className="flex gap-2">
                  <button
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-md hover:bg-muted"
                    onClick={sendOtp} disabled={otpSending}
                    data-testid="button-resend-otp"
                  >
                    <RefreshCw className="w-3 h-3" />{t("إعادة الإرسال", "Resend")}
                  </button>
                  <div className="flex-1" />
                  <Button variant="outline" onClick={onClose} data-testid="button-cancel-sign-otp">{t("إلغاء", "Cancel")}</Button>
                  <Button
                    onClick={proceedToSign}
                    className={cn("bg-gradient-to-r text-white border-0", theme.primary)}
                    data-testid="button-next-to-sign"
                  >
                    {t("التالي →", "Next →")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Signature ── */}
        {sigStep === "sign" && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium block mb-1.5">{t("اسمك الكامل", "Full name")}</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-10 rounded-lg border border-input bg-background text-sm px-3 focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder={t("الاسم كما هو في الهوية الرسمية", "Name as on official ID")}
                data-testid="input-signer-name"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium">{t("التوقيع الإلكتروني", "Electronic Signature")}</label>
                <button onClick={clearSig} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted" data-testid="button-clear-sig">
                  <RotateCcw className="w-3 h-3" />{t("مسح", "Clear")}
                </button>
              </div>
              <SigCanvas canvasRef={canvasRef} onDraw={() => setHasDrawn(true)} />
              <p className="text-[11px] text-muted-foreground mt-1.5 text-center">
                {t("ارسم توقيعك بالماوس أو بإصبعك على الشاشة", "Draw your signature with mouse or finger")}
              </p>
            </div>

            {err && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{err}</p>}

            <div className="flex gap-3 pt-1">
              {!noPhone && (
                <button
                  className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md hover:bg-muted"
                  onClick={() => { setSigStep("otp"); setErr(""); }}
                  data-testid="button-back-to-otp"
                >
                  {t("← رجوع", "← Back")}
                </button>
              )}
              <div className="flex-1" />
              <Button variant="outline" onClick={onClose} disabled={busy} data-testid="button-cancel-sign">{t("إلغاء", "Cancel")}</Button>
              <Button
                onClick={confirm}
                disabled={busy}
                className={cn("bg-gradient-to-r text-white border-0", theme.primary)}
                data-testid="button-confirm-sign"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : <Check className="w-4 h-4 me-2" />}
                {t("تأكيد وتوقيع", "Confirm & Sign")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── My documents (company + deal docs shared by staff + client uploads) ─────
function formatBytes(n: number | null): string {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function PortalDocuments({ isRtl, t, theme }: { isRtl: boolean; t: (a: string, e: string) => string; theme: typeof PORTAL_THEMES[number]; }) {
  const [docs, setDocs] = useState<PortalClientDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const load = () => {
    setLoading(true);
    portalListMyDocuments()
      .then(setDocs)
      .catch(() => setDocs([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const open = async (d: PortalClientDocument) => {
    setBusyId(d.id);
    setErr("");
    try {
      const blob = await portalDownloadDocument(d.id);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      setErr(t("تعذر فتح الملف", "Could not open the file"));
    } finally { setBusyId(null); }
  };

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErr(""); setOk("");
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const extOk = /\.pdf$/i.test(file.name);
    const mimeOk = file.type === "application/pdf" || file.type === "";
    if (!extOk || !mimeOk) { setErr(t("يُسمح بملفات PDF فقط", "Only PDF files are allowed")); return; }
    if (file.size > 15 * 1024 * 1024) { setErr(t("الملف كبير جداً (الحد 15MB)", "File too large (max 15MB)")); return; }
    // Magic bytes: a valid PDF starts with "%PDF-".
    try {
      const head = new Uint8Array(await file.slice(0, 5).arrayBuffer());
      let magic = "";
      for (let i = 0; i < head.length; i++) magic += String.fromCharCode(head[i]);
      if (magic !== "%PDF-") {
        setErr(t("يُسمح بملفات PDF فقط", "Only PDF files are allowed")); return;
      }
    } catch {
      setErr(t("تعذر قراءة الملف", "Could not read the file")); return;
    }
    setUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await portalUploadDocument({
        titleAr: file.name.replace(/\.[^.]+$/, ""),
        fileContent: base64,
        originalName: file.name,
        mimeType: "application/pdf",
      });
      setOk(t("تم رفع المستند بنجاح", "Document uploaded successfully"));
      load();
    } catch (ex: any) {
      setErr(ex?.message === "Only PDF files are allowed"
        ? t("يُسمح بملفات PDF فقط", "Only PDF files are allowed")
        : (ex?.message || t("تعذر رفع الملف", "Upload failed")));
    } finally { setUploading(false); }
  };

  return (
    <div className="space-y-4" data-testid="view-portal-documents">
      <div className="bg-card border border-border/50 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <FolderArchive className="w-4 h-4" />
            {t("مستنداتي", "My documents")}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {t("المستندات التي شاركتها الشركة معك، بالإضافة إلى ما ترفعه أنت (PDF فقط)", "Documents your provider shared with you, plus your own uploads (PDF only)")}
          </p>
        </div>
        <label className={cn("inline-flex items-center gap-2 h-10 px-4 rounded-lg text-white text-sm font-medium cursor-pointer bg-gradient-to-r", theme.primary, uploading && "opacity-60 pointer-events-none")} data-testid="button-portal-upload">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {t("رفع مستند (PDF)", "Upload (PDF)")}
          <input type="file" accept="application/pdf,.pdf" className="hidden" onChange={onPick} disabled={uploading} data-testid="input-portal-file" />
        </label>
      </div>

      {err && <div className="bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2 text-sm text-destructive flex items-center justify-between" data-testid="text-portal-doc-error">{err}<button onClick={() => setErr("")}><X className="w-3.5 h-3.5" /></button></div>}
      {ok && <div className="bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 rounded-lg px-3 py-2 text-sm" data-testid="text-portal-doc-ok">{ok}</div>}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : docs.length === 0 ? (
        <div className="bg-card border border-dashed border-border/50 rounded-xl p-12 text-center text-sm text-muted-foreground" data-testid="text-no-documents">
          {t("لا توجد مستندات بعد", "No documents yet")}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {docs.map((d) => {
            const dtitle = (isRtl ? d.titleAr : (d.titleEn || d.titleAr)) || "—";
            return (
              <div key={d.id} className="bg-card border border-border/50 rounded-xl p-4 flex items-start gap-3" data-testid={`card-portal-doc-${d.id}`}>
                <div className="w-10 h-10 rounded-lg bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate text-sm" data-testid={`text-portal-doc-title-${d.id}`}>{dtitle}</p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">
                      {d.scope === "deal" ? t("مستند صفقة", "Deal doc") : t("مستند شركة", "Company doc")}
                    </span>
                    {d.source === "client" && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                        {t("رفعته أنت", "Uploaded by you")}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground/70">{formatBytes(d.fileSize)}</span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-primary" onClick={() => open(d)} disabled={busyId === d.id} title={t("فتح", "Open")} data-testid={`button-open-doc-${d.id}`}>
                  {busyId === d.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main portal module ────────────────────────────────────────────────────
export default function ClientPortalModule() {
  const { dir, language, toggleLanguage } = useLanguage();
  const { theme: appTheme, setTheme: setAppTheme } = useTheme();
  const isRtl = dir === "rtl";
  const t = (a: string, e: string) => (isRtl ? a : e);

  const [contact, setContact] = useState<PortalContact | null>(getPortalContact);
  const [portalTheme, setPortalTheme] = useState<PortalTheme>(getPortalTheme);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const theme = useMemo(() => PORTAL_THEMES.find((x) => x.id === portalTheme) || PORTAL_THEMES[0], [portalTheme]);

  const [view, setView] = useState<"projects" | "proposals" | "invoices" | "contracts" | "documents" | "contact">("projects");
  const [projects, setProjects] = useState<PortalProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [openProjectId, setOpenProjectId] = useState<number | null>(null);
  const [myProposals, setMyProposals] = useState<PortalProposal[]>([]);
  const [myInvoices, setMyInvoices] = useState<PortalMyInvoice[]>([]);
  const [myContracts, setMyContracts] = useState<PortalMyContract[]>([]);
  const [loadingFinancial, setLoadingFinancial] = useState(false);

  const [signModal, setSignModal] = useState<{ type: "proposal" | "contract"; id: number; title: string } | null>(null);
  const [signBusy, setSignBusy] = useState(false);

  const handleSign = useCallback(async (signerName: string, signature: string, otp?: string) => {
    if (!signModal) return;
    setSignBusy(true);
    try {
      if (signModal.type === "proposal") {
        await portalApproveProposal(signModal.id, { signerName, signature, otp });
        const now = new Date().toISOString();
        setMyProposals(prev => prev.map(p => p.id === signModal.id
          ? { ...p, status: "approved", clientApprovedAt: now, clientSignedBy: signerName } : p));
      } else {
        await portalSignContract(signModal.id, { signerName, signature, otp });
        const now = new Date().toISOString();
        setMyContracts(prev => prev.map(c => c.id === signModal.id
          ? { ...c, clientSignedAt: now, clientSignedBy: signerName } : c));
      }
      setSignModal(null);
    } finally {
      setSignBusy(false);
    }
  }, [signModal]);

  // Validate the saved token on mount; if expired, drop the session.
  useEffect(() => {
    if (!getPortalToken() || !contact) return;
    portalGetMe().then((c) => setContact(c)).catch(() => { clearPortalSession(); setContact(null); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!contact) return;
    setLoadingProjects(true);
    portalListProjects()
      .then((rows) => setProjects(rows))
      .catch(() => setProjects([]))
      .finally(() => setLoadingProjects(false));
  }, [contact]);

  useEffect(() => {
    if (!contact) return;
    setLoadingFinancial(true);
    Promise.all([
      portalListProposals().catch(() => []),
      portalListMyInvoices().catch(() => []),
      portalListMyContracts().catch(() => []),
    ]).then(([props, invs, cnts]) => {
      setMyProposals(props);
      setMyInvoices(invs);
      setMyContracts(cnts);
    }).finally(() => setLoadingFinancial(false));
  }, [contact]);

  const handleLogout = () => {
    clearPortalSession();
    setContact(null);
    setOpenProjectId(null);
    setProjects([]);
  };

  const changeTheme = (id: PortalTheme) => {
    setPortalTheme(id);
    try { localStorage.setItem(STORAGE_THEME, id); } catch { /* ignore */ }
    setShowThemePicker(false);
  };

  if (!contact) {
    return <PortalLoginScreen onLogin={(c) => setContact(c)} theme={theme} isRtl={isRtl} t={t} toggleLang={toggleLanguage} />;
  }

  const contactName = (isRtl ? contact.nameAr : (contact.nameEn || contact.nameAr)) || contact.email || "—";
  const Chev = isRtl ? ChevronLeft : ChevronRight;

  return (
    <div className={cn("min-h-screen flex flex-col", theme.bg)} dir={dir}>
      <header className={cn("h-16 sticky top-0 z-40 shadow-sm border-b border-white/10 bg-gradient-to-r text-white", theme.primary)}>
        <div className="max-w-7xl mx-auto h-full px-4 md:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="font-bold text-base hidden sm:block tracking-tight">{t("بوابة عملاء Scapex", "Scapex Customer Portal")}</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-sm text-sm">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs">
                {(contactName || "?").charAt(0).toUpperCase()}
              </div>
              <span className="font-medium max-w-32 truncate" data-testid="text-portal-contact-name">{contactName}</span>
            </div>

            <Button variant="ghost" size="sm" onClick={toggleLanguage} className="text-white/90 hover:text-white hover:bg-white/10 text-sm font-medium hidden sm:flex">
              {language === "en" ? "العربية" : "English"}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setAppTheme(appTheme === "dark" ? "light" : "dark")} className="text-white/80 hover:text-white hover:bg-white/10">
              {appTheme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <div className="relative">
              <Button variant="ghost" size="icon" onClick={() => setShowThemePicker(!showThemePicker)} className="text-white/80 hover:text-white hover:bg-white/10">
                <Palette className="w-4 h-4" />
              </Button>
              {showThemePicker && (
                <div className={cn("absolute top-full mt-2 bg-card border border-border rounded-xl shadow-xl p-3 z-50 w-56", isRtl ? "left-0" : "right-0")}>
                  <p className="text-xs font-medium text-muted-foreground mb-2">{t("ثيم البوابة", "Portal Theme")}</p>
                  <div className="space-y-1">
                    {PORTAL_THEMES.map(th => (
                      <button key={th.id} onClick={() => changeTheme(th.id)} className={cn("w-full flex items-center gap-3 p-2 rounded-lg text-sm transition-colors text-foreground", portalTheme === th.id ? "bg-muted font-medium" : "hover:bg-muted/50")}>
                        <div className={cn("w-6 h-6 rounded-full bg-gradient-to-r shrink-0", th.primary)} />
                        <span>{isRtl ? th.nameAr : th.nameEn}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <Button variant="ghost" size="icon" className="relative text-white/80 hover:text-white hover:bg-white/10">
              <Bell className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="sm" className="hidden sm:flex items-center gap-2 text-white/70 hover:text-white hover:bg-white/10" onClick={handleLogout} data-testid="button-portal-logout">
              <LogOut className="w-4 h-4" />
              {t("خروج", "Logout")}
            </Button>
          </div>
        </div>
      </header>

      <main className={cn("flex-1 p-4 md:p-6 lg:p-8 bg-gradient-to-b", theme.gradient)}>
        <div className="max-w-7xl mx-auto space-y-6">
          {openProjectId === null && (
            <>
              {/* Welcome card */}
              <div className="bg-card border border-border/50 rounded-2xl p-5 md:p-6 shadow-sm">
                <div className="flex items-start gap-4 flex-wrap">
                  <div className={cn("w-14 h-14 rounded-2xl bg-gradient-to-r flex items-center justify-center text-white shrink-0", theme.primary)}>
                    <Building2 className="w-7 h-7" />
                  </div>
                  <div className="flex-1 min-w-[240px]">
                    <h1 className="text-xl font-bold">{t(`أهلاً، ${contactName}`, `Welcome, ${contactName}`)}</h1>
                    <div className="mt-1 text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                      {contact.organization && <span>{contact.organization}</span>}
                      {contact.email && <span dir="ltr">{contact.email}</span>}
                      {contact.phone && <span dir="ltr">{contact.phone}</span>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant={view === "projects" ? "default" : "outline"} size="sm" onClick={() => setView("projects")} data-testid="button-view-projects">
                      <FolderKanban className="w-4 h-4 me-2" />
                      {t("مشاريعي", "Projects")}
                    </Button>
                    <Button variant={view === "proposals" ? "default" : "outline"} size="sm" onClick={() => setView("proposals")} data-testid="button-view-proposals">
                      <ClipboardList className="w-4 h-4 me-2" />
                      {t("عروض الأسعار", "Proposals")}
                      {myProposals.length > 0 && <span className="ms-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-primary/20 text-primary tabular-nums">{myProposals.length}</span>}
                    </Button>
                    <Button variant={view === "invoices" ? "default" : "outline"} size="sm" onClick={() => setView("invoices")} data-testid="button-view-invoices">
                      <Receipt className="w-4 h-4 me-2" />
                      {t("فواتيري", "Invoices")}
                      {myInvoices.length > 0 && <span className="ms-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-primary/20 text-primary tabular-nums">{myInvoices.length}</span>}
                    </Button>
                    <Button variant={view === "contracts" ? "default" : "outline"} size="sm" onClick={() => setView("contracts")} data-testid="button-view-contracts">
                      <FileSignature className="w-4 h-4 me-2" />
                      {t("عقودي", "Contracts")}
                      {myContracts.length > 0 && <span className="ms-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-primary/20 text-primary tabular-nums">{myContracts.length}</span>}
                    </Button>
                    <Button variant={view === "documents" ? "default" : "outline"} size="sm" onClick={() => setView("documents")} data-testid="button-view-documents">
                      <FolderArchive className="w-4 h-4 me-2" />
                      {t("مستنداتي", "Documents")}
                    </Button>
                    <Button variant={view === "contact" ? "default" : "outline"} size="sm" onClick={() => setView("contact")} data-testid="button-view-contact">
                      <MessageSquare className="w-4 h-4 me-2" />
                      {t("تواصل معنا", "Contact us")}
                    </Button>
                  </div>
                </div>
              </div>

              {view === "projects" && (
                <div>
                  <h2 className={cn("text-sm font-semibold mb-3", theme.text)}>{t("المشاريع", "Projects")}</h2>
                  {loadingProjects ? (
                    <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                  ) : projects.length === 0 ? (
                    <div className="bg-card border border-dashed border-border/50 rounded-xl p-12 text-center text-sm text-muted-foreground" data-testid="text-no-projects">
                      {t("لا توجد مشاريع مرتبطة بحسابك حتى الآن", "No projects linked to your account yet")}
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {projects.map((p) => {
                        const pname = (isRtl ? p.nameAr : (p.nameEn || p.nameAr)) || "—";
                        return (
                          <button
                            key={p.id}
                            onClick={() => setOpenProjectId(p.id)}
                            className="text-start bg-card border border-border/50 rounded-xl p-4 hover:border-primary transition-colors group"
                            data-testid={`card-project-${p.id}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="text-xs text-muted-foreground font-mono">{p.projectCode || `#${p.id}`}</p>
                                <h3 className="font-medium mt-1 truncate" data-testid={`text-project-title-${p.id}`}>{pname}</h3>
                              </div>
                              <Chev className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0 mt-1" />
                            </div>
                            {p.currentStageAr && (
                              <div className="mt-2">
                                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 font-medium" data-testid={`badge-current-stage-${p.id}`}>
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                  {p.currentStageAr}
                                </span>
                              </div>
                            )}
                            <div className="mt-3 flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">{t(
                                p.status === "active" ? "نشط" : p.status === "planning" ? "تخطيط" : p.status === "completed" ? "مكتمل" : p.status === "on_hold" ? "متوقف" : (p.status || "—"),
                                p.status === "active" ? "Active" : p.status === "planning" ? "Planning" : p.status === "completed" ? "Completed" : p.status === "on_hold" ? "On hold" : (p.status || "—"),
                              )}</span>
                              <span className="font-medium tabular-nums">{p.progress ?? 0}%</span>
                            </div>
                            <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className={cn("h-full bg-gradient-to-r", theme.primary)} style={{ width: `${p.progress ?? 0}%` }} />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {view === "proposals" && (
                <div data-testid="view-portal-proposals">
                  <h2 className={cn("text-sm font-semibold mb-3", theme.text)}>{t("عروض الأسعار", "Proposals")}</h2>
                  {loadingFinancial ? (
                    <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                  ) : myProposals.length === 0 ? (
                    <div className="bg-card border border-dashed border-border/50 rounded-xl p-12 text-center text-sm text-muted-foreground" data-testid="text-no-proposals-top">
                      {t("لا توجد عروض أسعار مرتبطة بحسابك", "No proposals linked to your account yet")}
                    </div>
                  ) : (
                    <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[700px] text-sm text-center [&_th]:align-middle [&_td]:align-middle">
                          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                            <tr>
                              <th className="px-4 py-3 font-semibold w-[130px]">{t("الرقم", "No.")}</th>
                              <th className="px-4 py-3 font-semibold text-center">{t("المشروع", "Project")}</th>
                              <th className="px-4 py-3 font-semibold w-[160px]">{t("الإجمالي", "Total")}</th>
                              <th className="px-4 py-3 font-semibold w-[110px]">{t("الحالة", "Status")}</th>
                              <th className="px-4 py-3 font-semibold w-[100px]">{t("التاريخ", "Date")}</th>
                              <th className="px-4 py-3 font-semibold w-[140px]">{t("الإجراء", "Action")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {myProposals.map((pr) => (
                              <tr key={pr.id} className="border-t border-border/50 hover:bg-muted/20 transition-colors" data-testid={`row-proposal-top-${pr.id}`}>
                                <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{pr.proposalNumber}</td>
                                <td className="px-4 py-3 max-w-[220px] overflow-hidden text-center"><span className="block truncate">{pr.projectName || "—"}</span></td>
                                <td className="px-4 py-3 tabular-nums font-medium whitespace-nowrap">{pr.currency} {Number(pr.total || 0).toLocaleString()}</td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className={cn("text-xs px-2 py-0.5 rounded-full inline-flex items-center",
                                    pr.status === "approved" || pr.clientApprovedAt ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300" :
                                    pr.status === "sent" ? "bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300" :
                                    pr.status === "rejected" ? "bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300" :
                                    pr.status === "converted_contract" || pr.status === "converted_invoice" ? "bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300" :
                                    "bg-muted text-muted-foreground")}>
                                    {pr.status === "draft" ? t("مسودة", "Draft") :
                                     pr.status === "sent" ? t("مُرسل", "Sent") :
                                     pr.status === "approved" ? t("مُوافق عليه", "Approved") :
                                     pr.status === "rejected" ? t("مرفوض", "Rejected") :
                                     pr.status === "converted_contract" ? t("تحوّل لعقد", "Converted") :
                                     pr.status === "converted_invoice" ? t("تحوّل لفاتورة", "Invoiced") :
                                     pr.status || "—"}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                                  {pr.createdAt ? new Date(pr.createdAt).toLocaleDateString(isRtl ? "ar-SA" : "en-US") : "—"}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="flex justify-center items-center">
                                  {pr.clientApprovedAt ? (
                                    <span className="text-xs text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1.5">
                                      <Check className="w-3.5 h-3.5 shrink-0" />{t("موقّع", "Signed")}
                                    </span>
                                  ) : pr.status === "sent" ? (
                                    <Button
                                      size="sm"
                                      className={cn("h-7 text-xs bg-gradient-to-r text-white border-0 gap-1 inline-flex", theme.primary)}
                                      onClick={() => setSignModal({ type: "proposal", id: pr.id, title: pr.proposalNumber })}
                                      data-testid={`button-approve-proposal-${pr.id}`}
                                    >
                                      <Pen className="w-3 h-3" />{t("وافق وقّع", "Approve & Sign")}
                                    </Button>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">—</span>
                                  )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {view === "invoices" && (
                <div data-testid="view-portal-invoices">
                  <h2 className={cn("text-sm font-semibold mb-3", theme.text)}>{t("الفواتير", "Invoices")}</h2>
                  {loadingFinancial ? (
                    <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                  ) : myInvoices.length === 0 ? (
                    <div className="bg-card border border-dashed border-border/50 rounded-xl p-12 text-center text-sm text-muted-foreground" data-testid="text-no-invoices-top">
                      {t("لا توجد فواتير مرتبطة بحسابك", "No invoices linked to your account yet")}
                    </div>
                  ) : (
                    <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[680px] text-sm text-center [&_th]:align-middle [&_td]:align-middle">
                          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                            <tr>
                              <th className="px-4 py-3 font-semibold w-[140px]">{t("رقم الفاتورة", "Invoice #")}</th>
                              <th className="px-4 py-3 font-semibold w-[110px]">{t("تاريخ الإصدار", "Issue date")}</th>
                              <th className="px-4 py-3 font-semibold w-[110px]">{t("تاريخ الاستحقاق", "Due date")}</th>
                              <th className="px-4 py-3 font-semibold w-[150px]">{t("الإجمالي", "Total")}</th>
                              <th className="px-4 py-3 font-semibold w-[140px]">{t("المدفوع", "Paid")}</th>
                              <th className="px-4 py-3 font-semibold w-[100px]">{t("الحالة", "Status")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {myInvoices.map((inv) => (
                              <tr key={inv.id} className="border-t border-border/50 hover:bg-muted/20 transition-colors" data-testid={`row-invoice-top-${inv.id}`}>
                                <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{inv.invoiceNumber}</td>
                                <td className="px-4 py-3 text-xs whitespace-nowrap">{inv.issueDate || "—"}</td>
                                <td className="px-4 py-3 text-xs whitespace-nowrap">{inv.dueDate || "—"}</td>
                                <td className="px-4 py-3 tabular-nums font-medium whitespace-nowrap">{inv.currency} {Number(inv.total || 0).toLocaleString()}</td>
                                <td className="px-4 py-3 tabular-nums text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{inv.currency} {Number(inv.paidAmount || 0).toLocaleString()}</td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className={cn("text-xs px-2 py-0.5 rounded-full inline-flex items-center",
                                    inv.status === "paid" ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300" :
                                    inv.status === "sent" || inv.status === "overdue" ? "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300" :
                                    inv.status === "cancelled" ? "bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300" :
                                    "bg-muted text-muted-foreground")}>
                                    {inv.status === "draft" ? t("مسودة", "Draft") :
                                     inv.status === "sent" ? t("مُرسلة", "Sent") :
                                     inv.status === "paid" ? t("مدفوعة", "Paid") :
                                     inv.status === "overdue" ? t("متأخرة", "Overdue") :
                                     inv.status === "cancelled" ? t("ملغاة", "Cancelled") :
                                     inv.status || "—"}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {view === "contracts" && (
                <div data-testid="view-portal-contracts">
                  <h2 className={cn("text-sm font-semibold mb-3", theme.text)}>{t("العقود", "Contracts")}</h2>
                  {loadingFinancial ? (
                    <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                  ) : myContracts.length === 0 ? (
                    <div className="bg-card border border-dashed border-border/50 rounded-xl p-12 text-center text-sm text-muted-foreground" data-testid="text-no-contracts-top">
                      {t("لا توجد عقود مرتبطة بحسابك", "No contracts linked to your account yet")}
                    </div>
                  ) : (
                    <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[740px] text-sm text-center [&_th]:align-middle [&_td]:align-middle">
                          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                            <tr>
                              <th className="px-4 py-3 font-semibold w-[140px]">{t("رقم العقد", "Contract #")}</th>
                              <th className="px-4 py-3 font-semibold text-center">{t("المشروع", "Project")}</th>
                              <th className="px-4 py-3 font-semibold w-[160px]">{t("الإجمالي", "Total")}</th>
                              <th className="px-4 py-3 font-semibold w-[210px]">{t("الفترة", "Period")}</th>
                              <th className="px-4 py-3 font-semibold w-[100px]">{t("الحالة", "Status")}</th>
                              <th className="px-4 py-3 font-semibold w-[130px]">{t("التوقيع", "Signature")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {myContracts.map((c) => (
                              <tr key={c.id} className="border-t border-border/50 hover:bg-muted/20 transition-colors" data-testid={`row-contract-top-${c.id}`}>
                                <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{c.contractNumber}</td>
                                <td className="px-4 py-3 max-w-[220px] overflow-hidden text-center"><span className="block truncate">{c.projectName || "—"}</span></td>
                                <td className="px-4 py-3 tabular-nums font-medium whitespace-nowrap">{c.currency} {Number(c.total || 0).toLocaleString()}</td>
                                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                                  {c.startDate ? new Date(c.startDate).toLocaleDateString(isRtl ? "ar-SA" : "en-US") : "—"}
                                  {(c.startDate || c.endDate) ? " → " : ""}
                                  {c.endDate ? new Date(c.endDate).toLocaleDateString(isRtl ? "ar-SA" : "en-US") : ""}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className={cn("text-xs px-2 py-0.5 rounded-full inline-flex items-center",
                                    c.status === "active" ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300" :
                                    c.status === "expired" ? "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300" :
                                    c.status === "terminated" ? "bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300" :
                                    "bg-muted text-muted-foreground")}>
                                    {c.status === "active" ? t("نشط", "Active") :
                                     c.status === "draft" ? t("مسودة", "Draft") :
                                     c.status === "expired" ? t("منتهي", "Expired") :
                                     c.status === "terminated" ? t("مُنهى", "Terminated") :
                                     c.status || "—"}
                                  </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="flex justify-center items-center">
                                  {c.clientSignedAt ? (
                                    <span className="text-xs text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1.5">
                                      <Check className="w-3.5 h-3.5 shrink-0" />{t("موقّع", "Signed")}
                                    </span>
                                  ) : (
                                    <Button
                                      size="sm"
                                      className={cn("h-7 text-xs bg-gradient-to-r text-white border-0 gap-1 inline-flex", theme.primary)}
                                      onClick={() => setSignModal({ type: "contract", id: c.id, title: c.contractNumber })}
                                      data-testid={`button-sign-contract-${c.id}`}
                                    >
                                      <Pen className="w-3 h-3" />{t("وقّع العقد", "Sign Contract")}
                                    </Button>
                                  )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {view === "documents" && <PortalDocuments isRtl={isRtl} t={t} theme={theme} />}

              {view === "contact" && <ContactForm projects={projects} onDone={() => setView("projects")} isRtl={isRtl} t={t} theme={theme} />}
            </>
          )}

          {openProjectId !== null && (
            <ProjectDetail projectId={openProjectId} onBack={() => setOpenProjectId(null)} isRtl={isRtl} t={t} theme={theme} />
          )}
        </div>
      </main>

      {signModal && (
        <SignModal
          docTitle={signModal.title}
          docType={signModal.type}
          onSign={handleSign}
          onClose={() => !signBusy && setSignModal(null)}
          isRtl={isRtl}
          t={t}
          theme={theme}
          busy={signBusy}
        />
      )}

      <footer className="border-t border-border/30 py-4 px-6 text-center text-xs text-muted-foreground">
        <p>Scapex ERP Platform © 2026 — {t("بوابة العملاء", "Customer Portal")}</p>
      </footer>
    </div>
  );
}
