import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import {
  LogOut, Bell, Building2, Sun, Moon, Palette, ChevronRight, ChevronLeft,
  FolderKanban, FileText, Receipt, MessageSquare, Loader2, ShieldCheck,
  Calendar, MapPin, User as UserIcon, ArrowLeft, ArrowRight, Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import {
  portalLogin, portalGetMe, portalListProjects, portalGetProject,
  portalListStages, portalListDocuments, portalListInvoices, portalSubmitRequest,
  getPortalContact, getPortalToken, clearPortalSession,
  type PortalContact, type PortalProject, type PortalStage, type PortalDocument, type PortalInvoice,
} from "@/lib/portalApi";

export type PortalTheme = "default" | "ocean" | "forest" | "royal" | "sunset" | "slate";

export const PORTAL_THEMES: { id: PortalTheme; nameAr: string; nameEn: string; primary: string; bg: string; gradient: string; text: string; }[] = [
  { id: "default", nameAr: "افتراضي", nameEn: "Default", primary: "from-blue-500 to-indigo-500", bg: "bg-slate-50 dark:bg-slate-950", gradient: "from-blue-50/80 to-indigo-50/60 dark:from-blue-950/20 dark:to-indigo-950/20", text: "text-blue-700 dark:text-blue-300" },
  { id: "ocean", nameAr: "أزرق محيطي", nameEn: "Ocean", primary: "from-cyan-500 to-teal-500", bg: "bg-cyan-50/20 dark:bg-cyan-950/10", gradient: "from-cyan-50/60 to-teal-50/60 dark:from-cyan-950/20 dark:to-teal-950/20", text: "text-teal-700 dark:text-teal-300" },
  { id: "forest", nameAr: "أخضر غابات", nameEn: "Forest", primary: "from-emerald-500 to-green-500", bg: "bg-emerald-50/20 dark:bg-emerald-950/10", gradient: "from-emerald-50/60 to-green-50/60 dark:from-emerald-950/20 dark:to-green-950/20", text: "text-emerald-700 dark:text-emerald-300" },
  { id: "royal", nameAr: "بنفسجي ملكي", nameEn: "Royal", primary: "from-violet-500 to-purple-500", bg: "bg-violet-50/20 dark:bg-violet-950/10", gradient: "from-violet-50/60 to-purple-50/60 dark:from-violet-950/20 dark:to-purple-950/20", text: "text-violet-700 dark:text-violet-300" },
  { id: "sunset", nameAr: "غروب", nameEn: "Sunset", primary: "from-orange-400 to-rose-500", bg: "bg-orange-50/20 dark:bg-orange-950/10", gradient: "from-orange-50/60 to-rose-50/60 dark:from-orange-950/20 dark:to-rose-950/20", text: "text-orange-700 dark:text-orange-300" },
  { id: "slate", nameAr: "رمادي أنيق", nameEn: "Slate", primary: "from-slate-500 to-gray-600", bg: "bg-gray-50 dark:bg-gray-950", gradient: "from-slate-100/60 to-gray-100/60 dark:from-slate-900/20 dark:to-gray-900/20", text: "text-slate-700 dark:text-slate-300" },
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

  const submit = async () => {
    setError("");
    if (!nationalId.trim() || !password) {
      setError(t("يرجى إدخال رقم الهوية وكلمة المرور", "Please enter national ID and password"));
      return;
    }
    setLoading(true);
    try {
      const res = await portalLogin(nationalId.trim(), password);
      onLogin(res.contact);
    } catch (e: any) {
      setError(e?.message === "Invalid credentials"
        ? t("رقم الهوية أو كلمة المرور غير صحيحة", "Invalid national ID or password")
        : (e?.message || t("فشل تسجيل الدخول", "Login failed")));
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
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2.5 text-sm text-destructive" data-testid="text-portal-error">
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

// ── Project detail ────────────────────────────────────────────────────────
function ProjectDetail({ projectId, onBack, isRtl, t, theme }: { projectId: number; onBack: () => void; isRtl: boolean; t: (a: string, e: string) => string; theme: typeof PORTAL_THEMES[number]; }) {
  const [project, setProject] = useState<PortalProject | null>(null);
  const [stages, setStages] = useState<PortalStage[]>([]);
  const [docs, setDocs] = useState<PortalDocument[]>([]);
  const [invs, setInvs] = useState<PortalInvoice[]>([]);
  const [tab, setTab] = useState<"stages" | "docs" | "invoices">("stages");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      portalGetProject(projectId),
      portalListStages(projectId),
      portalListDocuments(projectId),
      portalListInvoices(projectId).catch(() => []),
    ]).then(([p, s, d, i]) => {
      setProject(p);
      setStages(s.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)));
      setDocs(d);
      setInvs(i);
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

      <div className="flex gap-2 border-b border-border/50">
        {([
          { id: "stages", label: t("المراحل", "Stages"), icon: FolderKanban },
          { id: "docs", label: t("المستندات", "Documents"), icon: FileText },
          { id: "invoices", label: t("الفواتير", "Invoices"), icon: Receipt },
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
        <div className="grid sm:grid-cols-2 gap-3">
          {docs.length === 0 && <p className="text-sm text-muted-foreground text-center py-8 sm:col-span-2">{t("لا توجد مستندات مشتركة معك", "No documents shared with you")}</p>}
          {docs.map((d) => {
            const dtitle = (isRtl ? d.titleAr : (d.titleEn || d.titleAr)) || "—";
            return (
              <a
                key={d.id}
                href={d.fileUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-card border border-border/50 rounded-xl p-4 hover:border-primary transition-colors flex items-start gap-3"
                data-testid={`link-document-${d.id}`}
              >
                <div className={cn("w-10 h-10 rounded-lg bg-gradient-to-r flex items-center justify-center text-white shrink-0", theme.primary)}>
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate text-sm">{dtitle}</p>
                  <p className="text-xs text-muted-foreground mt-1">{d.type || d.mimeType || "—"}{d.version ? ` • v${d.version}` : ""}</p>
                </div>
              </a>
            );
          })}
        </div>
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

  const [view, setView] = useState<"projects" | "contact">("projects");
  const [projects, setProjects] = useState<PortalProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [openProjectId, setOpenProjectId] = useState<number | null>(null);

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
                  <div className="flex gap-2">
                    <Button variant={view === "projects" ? "default" : "outline"} size="sm" onClick={() => setView("projects")} data-testid="button-view-projects">
                      <FolderKanban className="w-4 h-4 me-2" />
                      {t("مشاريعي", "My projects")}
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
                            <div className="mt-3 flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">{p.status || "—"}</span>
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

              {view === "contact" && <ContactForm projects={projects} onDone={() => setView("projects")} isRtl={isRtl} t={t} theme={theme} />}
            </>
          )}

          {openProjectId !== null && (
            <ProjectDetail projectId={openProjectId} onBack={() => setOpenProjectId(null)} isRtl={isRtl} t={t} theme={theme} />
          )}
        </div>
      </main>

      <footer className="border-t border-border/30 py-4 px-6 text-center text-xs text-muted-foreground">
        <p>Scapex ERP Platform © 2026 — {t("بوابة العملاء", "Customer Portal")}</p>
      </footer>
    </div>
  );
}
