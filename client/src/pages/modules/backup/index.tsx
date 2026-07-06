import { useEffect, useState, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { dbGetItem } from "@/lib/dbStorage";
import {
  Download, Database, Loader2, ShieldCheck, History, Settings as SettingsIcon,
  Zap, Clock, HardDrive, CheckCircle2, AlertTriangle, XCircle, Trash2, RefreshCw,
  RotateCcw, ShieldAlert, Mail, Send, Upload, FileArchive,
} from "lucide-react";
import { logAction } from "@/lib/auditLog";

type ModuleInfo = { id: string; labelEn: string; labelAr: string; tableCount: number };

type BackupRow = {
  id: number; type: string; filename: string; status: string;
  sizeBytes: number; tableCount: number; totalRows: number; errorCount: number;
  createdBy?: string; createdByName?: string; createdAt: string;
};

type BackupSettings = {
  dailyEnabled: boolean; dailyHour: number;
  weeklyEnabled: boolean; weeklyDay: number; weeklyHour: number;
  monthlyEnabled: boolean; monthlyHour: number;
  retainDaily: number; retainWeekly: number; retainMonthly: number; retainManual: number;
  emailEnabled: boolean; emailRecipient: string; emailFormat: "xlsx" | "pdf";
};

type BackupStatus = {
  settings: BackupSettings;
  lastSuccess: { id: number; type: string; createdAt: string; sizeBytes: number; totalRows: number } | null;
  nextDaily: string | null;
  nextWeekly: string | null;
  nextMonthly: string | null;
  totalCount: number;
  totalSize: number;
  schedulerRunning: boolean;
};

const TYPE_LABELS: Record<string, { ar: string; en: string; color: string }> = {
  manual:        { ar: "يدوي",     en: "Manual",   color: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30" },
  auto_daily:    { ar: "يومي",     en: "Daily",    color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" },
  auto_weekly:   { ar: "أسبوعي",   en: "Weekly",   color: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30" },
  auto_monthly:  { ar: "شهري",     en: "Monthly",  color: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30" },
  pre_restore:   { ar: "قبل الاستعادة", en: "Pre-Restore", color: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30" },
};

const DAY_LABELS = [
  { ar: "الأحد", en: "Sun" }, { ar: "الإثنين", en: "Mon" }, { ar: "الثلاثاء", en: "Tue" },
  { ar: "الأربعاء", en: "Wed" }, { ar: "الخميس", en: "Thu" }, { ar: "الجمعة", en: "Fri" }, { ar: "السبت", en: "Sat" },
];

function formatBytes(n: number): string {
  if (!n) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0; let v = n;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v >= 100 ? 0 : 1)} ${units[i]}`;
}

function formatWhen(iso: string | null, isRtl: boolean): string {
  if (!iso) return isRtl ? "—" : "—";
  const d = new Date(iso);
  return d.toLocaleString(isRtl ? "ar-SA" : "en-GB", { dateStyle: "medium", timeStyle: "short" });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function BackupModule() {
  const { dir, language } = useLanguage();
  const isRtl = dir === "rtl";
  const user = JSON.parse(dbGetItem("user") || "null");
  const userId = user?.id || "";
  const roles = new Set<string>([user?.role || "", ...((user?.roles as string[]) || [])]);
  const isAdmin = roles.has("admin");
  const isManager = roles.has("manager");
  const authHeaders = { "x-user-id": userId };

  const [tab, setTab] = useState<"export" | "history" | "settings">("export");

  // shared messages
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [warning, setWarning] = useState("");
  const clearMessages = () => { setError(""); setSuccess(""); setWarning(""); };

  // status card
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  const loadStatus = useCallback(() => {
    setStatusLoading(true);
    fetch("/api/backup/status", { headers: authHeaders })
      .then(async (r) => {
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          throw new Error(d.error || (isRtl ? "فشل تحميل الحالة" : "Failed to load status"));
        }
        return r.json();
      })
      .then((d) => { setStatus(d); setError(""); })
      .catch((e: any) => { setStatus(null); setError(e.message); })
      .finally(() => setStatusLoading(false));
  }, [userId, isRtl]);

  useEffect(() => { if (isAdmin || isManager) loadStatus(); }, [loadStatus, isAdmin, isManager]);

  // ─── Export tab state ──────────────────────────────────────────────────
  const [modules, setModules] = useState<ModuleInfo[]>([]);
  const [modulesLoading, setModulesLoading] = useState(true);
  const [modulesError, setModulesError] = useState("");
  const [loadingFull, setLoadingFull] = useState(false);
  const [loadingMod, setLoadingMod] = useState<string | null>(null);
  const [creatingSnapshot, setCreatingSnapshot] = useState(false);

  useEffect(() => {
    setModulesLoading(true);
    fetch("/api/backup/modules", { headers: authHeaders })
      .then(async (r) => {
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          throw new Error(d.error || (isRtl ? "فشل تحميل القائمة" : "Failed to load modules"));
        }
        return r.json();
      })
      .then((list: ModuleInfo[]) => { setModules(list); setModulesError(""); })
      .catch((e: any) => setModulesError(e.message || (isRtl ? "خطأ في الاتصال" : "Connection error")))
      .finally(() => setModulesLoading(false));
  }, [userId, isRtl]);

  const handleFullBackup = async () => {
    clearMessages(); setLoadingFull(true);
    try {
      const res = await fetch("/api/backup/full", { headers: authHeaders });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || (isRtl ? "فشل إنشاء النسخة" : "Backup failed"));
      }
      const errCount = parseInt(res.headers.get("X-Backup-Errors") || "0", 10);
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") || "";
      const m = cd.match(/filename="?([^";]+)"?/);
      downloadBlob(blob, m ? m[1] : "scapex-full-backup.zip");
      logAction("export", "backup", `Full backup downloaded`, `تم تنزيل نسخة احتياطية كاملة`);
      if (errCount > 0) setWarning(isRtl ? `تم التنزيل مع ${errCount} جدول فاشل` : `Downloaded with ${errCount} table failures`);
      else setSuccess(isRtl ? "تم تنزيل النسخة الاحتياطية الكاملة" : "Full backup downloaded successfully");
    } catch (e: any) {
      setError(e.message || (isRtl ? "خطأ في الاتصال" : "Connection error"));
    } finally { setLoadingFull(false); }
  };

  const handleModuleBackup = async (id: string, label: string) => {
    clearMessages(); setLoadingMod(id);
    try {
      const res = await fetch(`/api/backup/module/${id}`, { headers: authHeaders });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || (isRtl ? "فشل التصدير" : "Export failed"));
      }
      const errCount = parseInt(res.headers.get("X-Backup-Errors") || "0", 10);
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") || "";
      const m = cd.match(/filename="?([^";]+)"?/);
      downloadBlob(blob, m ? m[1] : `scapex-${id}.json`);
      logAction("export", "backup", `Module backup: ${id}`, `نسخة احتياطية للموديول: ${label}`);
      if (errCount > 0) setWarning(isRtl ? `تم تنزيل ${label} مع ${errCount} جدول فاشل` : `${label} downloaded with ${errCount} failures`);
      else setSuccess(isRtl ? `تم تنزيل ${label}` : `${label} downloaded`);
    } catch (e: any) {
      setError(e.message || (isRtl ? "خطأ في الاتصال" : "Connection error"));
    } finally { setLoadingMod(null); }
  };

  const handleSnapshotNow = async () => {
    clearMessages(); setCreatingSnapshot(true);
    try {
      const res = await fetch("/api/backup/now", { method: "POST", headers: authHeaders });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || (isRtl ? "فشل إنشاء النسخة" : "Snapshot failed"));
      logAction("create", "backup", `Manual snapshot #${d.id}`, `نسخة فورية #${d.id}`);
      if (d.status === "success") setSuccess(isRtl ? `تم إنشاء النسخة الفورية بنجاح (${formatBytes(d.sizeBytes)})` : `Snapshot created (${formatBytes(d.sizeBytes)})`);
      else if (d.status === "partial") setWarning(isRtl ? `تم إنشاء النسخة مع ${d.errorCount} جدول فاشل` : `Created with ${d.errorCount} failures`);
      else setError(isRtl ? "فشل إنشاء النسخة" : "Snapshot failed");
      loadStatus();
      if (tab === "history") loadHistory();
    } catch (e: any) {
      setError(e.message || (isRtl ? "خطأ في الاتصال" : "Connection error"));
    } finally { setCreatingSnapshot(false); }
  };

  // ─── History tab state ─────────────────────────────────────────────────
  const [history, setHistory] = useState<BackupRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [filterType, setFilterType] = useState<string>("");
  const [downloadingHist, setDownloadingHist] = useState<number | null>(null);
  const [deletingHist, setDeletingHist] = useState<number | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<BackupRow | null>(null);
  const [restoreStep, setRestoreStep] = useState<1 | 2>(1);
  const [restoreText, setRestoreText] = useState("");
  const [restoring, setRestoring] = useState(false);

  // ─── Upload ZIP restore state ───────────────────────────────────────────
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadStep, setUploadStep] = useState<1 | 2>(1);
  const [uploadText, setUploadText] = useState("");
  const [uploading, setUploading] = useState(false);

  const openUploadModal = () => { setUploadModalOpen(true); setUploadStep(1); setUploadFile(null); setUploadText(""); };
  const closeUploadModal = () => { if (uploading) return; setUploadModalOpen(false); setUploadStep(1); setUploadFile(null); setUploadText(""); };

  const handleUploadRestore = async () => {
    if (!uploadFile) return;
    clearMessages(); setUploading(true);
    try {
      const reader = new FileReader();
      const base64: string = await new Promise((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(uploadFile);
      });
      const res = await fetch("/api/backup/upload-restore", {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json", "x-confirm-restore": "I-UNDERSTAND-THIS-WILL-OVERWRITE-ALL-DATA" },
        body: JSON.stringify({ fileBase64: base64, filename: uploadFile.name }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || (isRtl ? "فشلت الاستعادة" : "Restore failed"));
      logAction("update", "backup", `Restored from uploaded ZIP: ${uploadFile.name}`, `استعادة من ملف ZIP: ${uploadFile.name}`);
      const errCount = Object.keys(d.errors || {}).length;
      const preMsg = d.preRestoreId ? (isRtl ? ` (نسخة ما قبل الاستعادة #${d.preRestoreId})` : ` (pre-restore snapshot #${d.preRestoreId})`) : "";
      if (d.status === "success") {
        setSuccess(isRtl
          ? `تمت الاستعادة بنجاح من الملف المرفوع: ${d.tablesRestored} جدول، ${d.rowsInserted.toLocaleString()} سجل${preMsg}`
          : `Restore successful: ${d.tablesRestored} tables, ${d.rowsInserted.toLocaleString()} rows${preMsg}`);
      } else {
        const firstErr = Object.entries(d.errors || {}).slice(0, 1).map(([k, v]) => `${k}: ${v}`).join("");
        setError(isRtl ? `فشلت الاستعادة (${errCount} خطأ)${preMsg}. ${firstErr}` : `Restore failed (${errCount} errors)${preMsg}. ${firstErr}`);
      }
      closeUploadModal();
      loadHistory(); loadStatus();
    } catch (e: any) {
      setError(e.message);
    } finally { setUploading(false); }
  };

  const loadHistory = useCallback(() => {
    setHistoryLoading(true); setHistoryError("");
    const qs = filterType ? `?type=${filterType}` : "";
    fetch(`/api/backup/history${qs}`, { headers: authHeaders })
      .then(async (r) => {
        if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error || "Failed"); }
        return r.json();
      })
      .then(setHistory)
      .catch((e: any) => setHistoryError(e.message))
      .finally(() => setHistoryLoading(false));
  }, [userId, filterType]);

  useEffect(() => { if (tab === "history") loadHistory(); }, [tab, loadHistory]);

  const handleDownloadHistory = async (row: BackupRow) => {
    clearMessages(); setDownloadingHist(row.id);
    try {
      const res = await fetch(`/api/backup/history/${row.id}/download`, { headers: authHeaders });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || (isRtl ? "فشل التنزيل" : "Download failed"));
      }
      const blob = await res.blob();
      downloadBlob(blob, row.filename);
      logAction("export", "backup", `Downloaded backup #${row.id}`, `تنزيل النسخة #${row.id}`);
    } catch (e: any) {
      setError(e.message);
    } finally { setDownloadingHist(null); }
  };

  const openRestore = (row: BackupRow) => {
    setRestoreTarget(row); setRestoreStep(1); setRestoreText("");
  };
  const closeRestore = () => {
    if (restoring) return;
    setRestoreTarget(null); setRestoreStep(1); setRestoreText("");
  };
  const handleConfirmRestore = async () => {
    if (!restoreTarget) return;
    clearMessages(); setRestoring(true);
    try {
      const res = await fetch(`/api/backup/restore/${restoreTarget.id}`, {
        method: "POST",
        headers: { ...authHeaders, "x-confirm-restore": "I-UNDERSTAND-THIS-WILL-OVERWRITE-ALL-DATA" },
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || (isRtl ? "فشل الاستعادة" : "Restore failed"));
      logAction("update", "backup", `Restored backup #${restoreTarget.id}`, `استعادة النسخة #${restoreTarget.id}`);
      const errCount = Object.keys(d.errors || {}).length;
      const preMsg = d.preRestoreId
        ? (isRtl ? ` (نسخة احتياطية ما قبل الاستعادة #${d.preRestoreId})` : ` (pre-restore snapshot #${d.preRestoreId})`)
        : "";
      if (d.status === "success") {
        setSuccess((isRtl
          ? `تمت الاستعادة بنجاح: ${d.tablesRestored} جدول، ${d.rowsInserted.toLocaleString()} سجل${preMsg}`
          : `Restore successful: ${d.tablesRestored} tables, ${d.rowsInserted.toLocaleString()} rows${preMsg}`));
      } else {
        const firstErr = Object.entries(d.errors || {}).slice(0, 1).map(([k, v]) => `${k}: ${v}`).join("");
        setError((isRtl
          ? `فشلت الاستعادة (${errCount} خطأ) — لم يتم تغيير أي بيانات. ${firstErr}${preMsg}`
          : `Restore failed (${errCount} errors) — no data changed. ${firstErr}${preMsg}`));
      }
      closeRestore();
      loadHistory(); loadStatus();
    } catch (e: any) {
      setError(e.message);
    } finally { setRestoring(false); }
  };

  const handleDeleteHistory = async (row: BackupRow) => {
    if (!confirm(isRtl ? `حذف النسخة "${row.filename}" نهائياً؟` : `Delete backup "${row.filename}" permanently?`)) return;
    clearMessages(); setDeletingHist(row.id);
    try {
      const res = await fetch(`/api/backup/history/${row.id}`, { method: "DELETE", headers: authHeaders });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || (isRtl ? "فشل الحذف" : "Delete failed"));
      }
      logAction("delete", "backup", `Deleted backup #${row.id}`, `حذف النسخة #${row.id}`);
      setSuccess(isRtl ? "تم الحذف" : "Deleted");
      loadHistory(); loadStatus();
    } catch (e: any) {
      setError(e.message);
    } finally { setDeletingHist(null); }
  };

  // ─── Settings tab state ────────────────────────────────────────────────
  const [settings, setSettings] = useState<BackupSettings | null>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [testEmailSending, setTestEmailSending] = useState(false);

  const handleTestEmail = async () => {
    if (!settings?.emailRecipient) return;
    clearMessages(); setTestEmailSending(true);
    try {
      const res = await fetch("/api/backup/test-email", {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ recipient: settings.emailRecipient }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || (isRtl ? "فشل الإرسال" : "Send failed"));
      setSuccess(isRtl ? `✅ تم إرسال بريد تجريبي إلى ${settings.emailRecipient}` : `✅ Test email sent to ${settings.emailRecipient}`);
    } catch (e: any) {
      setError(e.message || (isRtl ? "خطأ في الإرسال" : "Send error"));
    } finally { setTestEmailSending(false); }
  };

  useEffect(() => {
    if (tab !== "settings" || !isAdmin) return;
    setSettingsLoading(true);
    fetch("/api/backup/settings", { headers: authHeaders })
      .then(async (r) => {
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          throw new Error(d.error || (isRtl ? "فشل تحميل الإعدادات" : "Failed to load settings"));
        }
        return r.json();
      })
      .then(setSettings)
      .catch((e: any) => setError(e.message))
      .finally(() => setSettingsLoading(false));
  }, [tab, isAdmin, isRtl]);

  const handleSaveSettings = async () => {
    if (!settings) return;
    clearMessages(); setSettingsSaving(true);
    try {
      const res = await fetch("/api/backup/settings", {
        method: "PUT",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Save failed");
      setSettings(d);
      setSuccess(isRtl ? "تم حفظ الإعدادات" : "Settings saved");
      logAction("update", "backup", "Backup settings updated", "تعديل إعدادات النسخ الاحتياطي");
      loadStatus();
    } catch (e: any) {
      setError(e.message);
    } finally { setSettingsSaving(false); }
  };

  if (!isAdmin && !isManager) {
    return (
      <MainLayout>
        <div className="p-8 text-center text-muted-foreground" data-testid="text-no-permission">
          {isRtl ? "غير مصرح لك بالوصول إلى هذه الصفحة" : "Access denied"}
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
    <div className="p-6 max-w-6xl mx-auto" dir={dir}>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3" data-testid="heading-backup">
          <Database className="w-8 h-8 text-primary" />
          {isRtl ? "النسخ الاحتياطية" : "Backups"}
        </h1>
        <p className="text-muted-foreground">
          {isRtl
            ? "نظام احترافي للنسخ الاحتياطي التلقائي والاستعادة — يومي، أسبوعي، شهري + نسخ يدوية فورية."
            : "Professional automated backup system — daily, weekly, monthly schedules with manual snapshots."}
        </p>
      </div>

      {/* Status card */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-3">
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          label={isRtl ? "آخر نسخة ناجحة" : "Last successful"}
          value={statusLoading ? "..." : formatWhen(status?.lastSuccess?.createdAt || null, isRtl)}
          sub={status?.lastSuccess ? `${formatBytes(status.lastSuccess.sizeBytes)} • ${status.lastSuccess.totalRows.toLocaleString()} ${isRtl ? "سجل" : "rows"}` : (isRtl ? "لا توجد" : "None yet")}
          color="emerald"
          testId="stat-last-success"
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label={isRtl ? "النسخة التالية" : "Next scheduled"}
          value={
            status?.settings.dailyEnabled ? formatWhen(status.nextDaily, isRtl) :
            status?.settings.weeklyEnabled ? formatWhen(status.nextWeekly, isRtl) :
            status?.settings.monthlyEnabled ? formatWhen(status.nextMonthly, isRtl) :
            (isRtl ? "معطّل" : "Disabled")
          }
          sub={
            status?.settings.dailyEnabled ? (isRtl ? "يومي" : "Daily") :
            status?.settings.weeklyEnabled ? (isRtl ? "أسبوعي" : "Weekly") :
            status?.settings.monthlyEnabled ? (isRtl ? "شهري" : "Monthly") :
            (isRtl ? "كل الجداول معطّلة" : "All schedules off")
          }
          color="blue"
          testId="stat-next"
        />
        <StatCard
          icon={<HardDrive className="w-5 h-5" />}
          label={isRtl ? "إجمالي النسخ" : "Total stored"}
          value={statusLoading ? "..." : String(status?.totalCount || 0)}
          sub={status ? formatBytes(status.totalSize) : ""}
          color="violet"
          testId="stat-total"
        />
        <StatCard
          icon={<Zap className="w-5 h-5" />}
          label={isRtl ? "المجدوِل" : "Scheduler"}
          value={status?.schedulerRunning ? (isRtl ? "نشط" : "Active") : (isRtl ? "متوقف" : "Stopped")}
          sub={isAdmin ? (isRtl ? "نسخة فورية" : "Snapshot now") : ""}
          color={status?.schedulerRunning ? "emerald" : "slate"}
          testId="stat-scheduler"
          action={isAdmin ? (
            <button
              onClick={handleSnapshotNow}
              disabled={creatingSnapshot}
              data-testid="button-snapshot-now"
              className="mt-2 w-full flex items-center justify-center gap-1.5 px-2 py-1.5 bg-primary text-primary-foreground rounded text-xs font-medium hover-elevate disabled:opacity-50"
            >
              {creatingSnapshot ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
              {isRtl ? "نسخة الآن" : "Backup now"}
            </button>
          ) : undefined}
        />
      </div>

      {/* Messages */}
      {error && <Alert kind="error" testId="alert-error">{error}</Alert>}
      {success && <Alert kind="success" testId="alert-success">{success}</Alert>}
      {warning && <Alert kind="warning" testId="alert-warning">{warning}</Alert>}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-6">
        <TabButton active={tab === "export"} onClick={() => setTab("export")} icon={<Download className="w-4 h-4" />} testId="tab-export">
          {isRtl ? "تصدير" : "Export"}
        </TabButton>
        <TabButton active={tab === "history"} onClick={() => setTab("history")} icon={<History className="w-4 h-4" />} testId="tab-history">
          {isRtl ? "السجل" : "History"}
        </TabButton>
        {isAdmin && (
          <TabButton active={tab === "settings"} onClick={() => setTab("settings")} icon={<SettingsIcon className="w-4 h-4" />} testId="tab-settings">
            {isRtl ? "الإعدادات" : "Settings"}
          </TabButton>
        )}
      </div>

      {/* Tab content */}
      {tab === "export" && (
        <div>
          <div className="mb-6 bg-card border-2 border-primary/40 rounded-xl p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-9 h-9 text-primary mt-1" />
                <div>
                  <h2 className="text-lg font-bold mb-1">{isRtl ? "نسخة كاملة (ZIP) — تنزيل فوري" : "Full Backup (ZIP) — Instant Download"}</h2>
                  <p className="text-sm text-muted-foreground max-w-xl">
                    {isRtl ? "تصدير كل الجداول كملف ZIP منظَّم. متاح للمشرفين فقط." : "Export every table as a structured ZIP. Admin only."}
                  </p>
                </div>
              </div>
              <button onClick={handleFullBackup} disabled={!isAdmin || loadingFull} data-testid="button-full-backup"
                className="flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover-elevate disabled:opacity-50 shrink-0">
                {loadingFull ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                {loadingFull ? (isRtl ? "جارٍ التحضير..." : "Preparing...") : (isRtl ? "تنزيل الآن" : "Download")}
              </button>
            </div>
          </div>

          <h3 className="text-base font-bold mb-1">{isRtl ? "تصدير حسب الموديول" : "Per-Module Export"}</h3>
          <p className="text-sm text-muted-foreground mb-3">{isRtl ? "اختر موديول لتنزيل بياناته كملف JSON." : "Download module data as a single JSON."}</p>

          {modulesError && <Alert kind="error" testId="alert-modules-error">{modulesError}</Alert>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {modules.map((m) => {
              const label = language === "ar" ? m.labelAr : m.labelEn;
              const loading = loadingMod === m.id;
              return (
                <div key={m.id} data-testid={`card-module-${m.id}`} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between gap-3 hover-elevate">
                  <div className="min-w-0">
                    <div className="font-semibold truncate" data-testid={`text-module-label-${m.id}`}>{label}</div>
                    <div className="text-xs text-muted-foreground">{isRtl ? `${m.tableCount} جدول` : `${m.tableCount} tables`}</div>
                  </div>
                  <button onClick={() => handleModuleBackup(m.id, label)} disabled={loading || loadingFull} data-testid={`button-backup-${m.id}`}
                    className="flex items-center gap-2 px-3 py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-medium hover-elevate disabled:opacity-50 shrink-0">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    {isRtl ? "تنزيل" : "Export"}
                  </button>
                </div>
              );
            })}
            {modulesLoading && modules.length === 0 && (
              <div className="col-span-full text-center text-muted-foreground py-8 flex items-center justify-center gap-2" data-testid="text-loading-modules">
                <Loader2 className="w-4 h-4 animate-spin" />
                {isRtl ? "جارٍ التحميل..." : "Loading..."}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "history" && (
        <div>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex gap-2 flex-wrap">
              <FilterChip active={filterType === ""} onClick={() => setFilterType("")} testId="filter-all">{isRtl ? "الكل" : "All"}</FilterChip>
              {Object.keys(TYPE_LABELS).map((t) => (
                <FilterChip key={t} active={filterType === t} onClick={() => setFilterType(t)} testId={`filter-${t}`}>
                  {isRtl ? TYPE_LABELS[t].ar : TYPE_LABELS[t].en}
                </FilterChip>
              ))}
            </div>
            <div className="flex gap-2">
              {isAdmin && (
                <button onClick={openUploadModal} data-testid="button-upload-zip"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-md text-xs font-semibold hover-elevate">
                  <Upload className="w-3.5 h-3.5" />
                  {isRtl ? "استعادة من ZIP" : "Restore from ZIP"}
                </button>
              )}
              <button onClick={loadHistory} disabled={historyLoading} data-testid="button-refresh-history"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-secondary-foreground rounded-md text-xs font-medium hover-elevate disabled:opacity-50">
                <RefreshCw className={`w-3.5 h-3.5 ${historyLoading ? "animate-spin" : ""}`} />
                {isRtl ? "تحديث" : "Refresh"}
              </button>
            </div>
          </div>

          {historyError && <Alert kind="error" testId="alert-history-error">{historyError}</Alert>}

          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase">
                  <tr>
                    <th className="px-3 py-2 text-start">{isRtl ? "النوع" : "Type"}</th>
                    <th className="px-3 py-2 text-start">{isRtl ? "التاريخ" : "Date"}</th>
                    <th className="px-3 py-2 text-start">{isRtl ? "الحالة" : "Status"}</th>
                    <th className="px-3 py-2 text-start">{isRtl ? "الحجم" : "Size"}</th>
                    <th className="px-3 py-2 text-start">{isRtl ? "السجلات" : "Rows"}</th>
                    <th className="px-3 py-2 text-start">{isRtl ? "بواسطة" : "By"}</th>
                    <th className="px-3 py-2 text-end">{isRtl ? "إجراءات" : "Actions"}</th>
                  </tr>
                </thead>
                <tbody>
                  {historyLoading && (
                    <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin inline" /> {isRtl ? "جارٍ التحميل..." : "Loading..."}
                    </td></tr>
                  )}
                  {!historyLoading && history.length === 0 && (
                    <tr><td colSpan={7} data-testid="text-empty-history">
                      <div className="text-center py-10 flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                          <History className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground font-medium">
                          {isRtl ? "لا توجد نسخ احتياطية بعد" : "No backups yet"}
                        </p>
                        <p className="text-xs text-muted-foreground max-w-xs">
                          {isRtl
                            ? "أنشئ نسخة احتياطية الآن، ثم ستظهر هنا مع زر الاستعادة بجانبها."
                            : "Create a backup first — it will appear here with a Restore button."}
                        </p>
                        {isAdmin && (
                          <button
                            onClick={handleSnapshotNow}
                            disabled={creatingSnapshot}
                            data-testid="button-snapshot-empty"
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover-elevate disabled:opacity-50"
                          >
                            {creatingSnapshot ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                            {isRtl ? "إنشاء نسخة احتياطية الآن" : "Create Backup Now"}
                          </button>
                        )}
                      </div>
                    </td></tr>
                  )}
                  {history.map((b) => {
                    const t = TYPE_LABELS[b.type] || { ar: b.type, en: b.type, color: "bg-muted text-muted-foreground border-border" };
                    return (
                      <tr key={b.id} className="border-t border-border hover:bg-muted/30" data-testid={`row-backup-${b.id}`}>
                        <td className="px-3 py-2">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs border ${t.color}`}>
                            {isRtl ? t.ar : t.en}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">{formatWhen(b.createdAt, isRtl)}</td>
                        <td className="px-3 py-2">
                          {b.status === "success" && <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5" />{isRtl ? "ناجحة" : "Success"}</span>}
                          {b.status === "partial" && <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400"><AlertTriangle className="w-3.5 h-3.5" />{isRtl ? `جزئية (${b.errorCount})` : `Partial (${b.errorCount})`}</span>}
                          {b.status === "failed" && <span className="inline-flex items-center gap-1 text-destructive"><XCircle className="w-3.5 h-3.5" />{isRtl ? "فاشلة" : "Failed"}</span>}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">{formatBytes(b.sizeBytes)}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{(b.totalRows || 0).toLocaleString()}</td>
                        <td className="px-3 py-2 truncate max-w-[140px]" title={b.createdByName || ""}>{b.createdByName || "—"}</td>
                        <td className="px-3 py-2 text-end whitespace-nowrap">
                          <button onClick={() => handleDownloadHistory(b)} disabled={!b.sizeBytes || downloadingHist === b.id} data-testid={`button-download-${b.id}`}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded text-xs hover-elevate disabled:opacity-40 me-1">
                            {downloadingHist === b.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                            {isRtl ? "تنزيل" : "Get"}
                          </button>
                          {isAdmin && b.status !== "failed" && b.sizeBytes > 0 && (
                            <button onClick={() => openRestore(b)} data-testid={`button-restore-${b.id}`}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded text-xs hover-elevate me-1">
                              <RotateCcw className="w-3 h-3" />
                              {isRtl ? "استعادة" : "Restore"}
                            </button>
                          )}
                          {isAdmin && (
                            <button onClick={() => handleDeleteHistory(b)} disabled={deletingHist === b.id} data-testid={`button-delete-${b.id}`}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-destructive/10 text-destructive rounded text-xs hover-elevate disabled:opacity-40">
                              {deletingHist === b.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Restore confirmation modal (double-step) */}
      {restoreTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" data-testid="modal-restore">
          <div className="bg-card border-2 border-amber-500/50 rounded-xl shadow-2xl max-w-lg w-full p-6" dir={dir}>
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-amber-500/15 rounded-lg">
                <ShieldAlert className="w-7 h-7 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold mb-1">
                  {isRtl ? "تأكيد الاستعادة" : "Confirm Restore"}
                </h2>
                <p className="text-xs text-muted-foreground">{restoreTarget.filename}</p>
              </div>
            </div>

            {restoreStep === 1 && (
              <>
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 mb-4 text-sm">
                  <p className="font-semibold text-destructive mb-2">
                    {isRtl ? "⚠ تحذير: عملية لا يمكن التراجع عنها مباشرة" : "⚠ Warning: This operation cannot be directly undone"}
                  </p>
                  <ul className="text-sm space-y-1 text-foreground/80 list-disc ms-5">
                    <li>{isRtl ? "ستُحذف كل البيانات الحالية في الجداول المشمولة" : "All current data in covered tables will be replaced"}</li>
                    <li>{isRtl ? "ستُستبدل بمحتويات هذه النسخة الاحتياطية" : "Replaced with contents from this backup"}</li>
                    <li>{isRtl ? "سيتم إنشاء نسخة احتياطية تلقائية قبل البدء (للتراجع)" : "An automatic pre-restore snapshot will be created (for rollback)"}</li>
                    <li>{isRtl ? "العملية ذرّية — إذا فشل أي جدول، تُلغى الاستعادة بالكامل دون أي تغيير" : "Atomic operation — if any table fails, the entire restore aborts with zero changes"}</li>
                    <li>{isRtl ? "سيتوقف المجدوِل التلقائي مؤقتاً أثناء الاستعادة" : "Auto-scheduler pauses during restore"}</li>
                    <li>{isRtl ? "قد يتأثر المستخدمون المتصلون حالياً" : "Currently connected users may be affected"}</li>
                  </ul>
                </div>
                <div className="text-sm mb-4 space-y-1">
                  <div><span className="text-muted-foreground">{isRtl ? "النوع:" : "Type:"}</span> {isRtl ? (TYPE_LABELS[restoreTarget.type]?.ar || restoreTarget.type) : (TYPE_LABELS[restoreTarget.type]?.en || restoreTarget.type)}</div>
                  <div><span className="text-muted-foreground">{isRtl ? "التاريخ:" : "Date:"}</span> {formatWhen(restoreTarget.createdAt, isRtl)}</div>
                  <div><span className="text-muted-foreground">{isRtl ? "الحجم:" : "Size:"}</span> {formatBytes(restoreTarget.sizeBytes)} • {restoreTarget.totalRows.toLocaleString()} {isRtl ? "سجل" : "rows"}</div>
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={closeRestore} data-testid="button-restore-cancel-1"
                    className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-medium hover-elevate">
                    {isRtl ? "إلغاء" : "Cancel"}
                  </button>
                  <button onClick={() => setRestoreStep(2)} data-testid="button-restore-continue"
                    className="px-4 py-2 bg-amber-600 text-white rounded-md text-sm font-semibold hover-elevate">
                    {isRtl ? "متابعة" : "Continue"}
                  </button>
                </div>
              </>
            )}

            {restoreStep === 2 && (
              <>
                <p className="text-sm mb-3">
                  {isRtl
                    ? <>اكتب <code className="px-1.5 py-0.5 bg-muted rounded font-mono">RESTORE</code> للتأكيد:</>
                    : <>Type <code className="px-1.5 py-0.5 bg-muted rounded font-mono">RESTORE</code> to confirm:</>}
                </p>
                <input
                  type="text"
                  value={restoreText}
                  onChange={(e) => setRestoreText(e.target.value)}
                  disabled={restoring}
                  data-testid="input-restore-confirm"
                  className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm mb-4 font-mono"
                  placeholder="RESTORE"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <button onClick={closeRestore} disabled={restoring} data-testid="button-restore-cancel-2"
                    className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-medium hover-elevate disabled:opacity-50">
                    {isRtl ? "إلغاء" : "Cancel"}
                  </button>
                  <button
                    onClick={handleConfirmRestore}
                    disabled={restoring || restoreText.trim() !== "RESTORE"}
                    data-testid="button-restore-confirm"
                    className="flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-md text-sm font-bold hover-elevate disabled:opacity-40"
                  >
                    {restoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                    {restoring ? (isRtl ? "جارٍ الاستعادة..." : "Restoring...") : (isRtl ? "تنفيذ الاستعادة" : "Run Restore")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Upload ZIP Restore Modal ── */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" data-testid="modal-upload-restore">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center">
                <FileArchive className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="font-bold text-base">{isRtl ? "استعادة من ملف ZIP" : "Restore from ZIP File"}</h3>
                <p className="text-xs text-muted-foreground">{isRtl ? "رفع نسخة احتياطية مرسلة على الإيميل" : "Upload a backup received by email"}</p>
              </div>
            </div>

            {uploadStep === 1 && (
              <>
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4 text-xs text-amber-700 dark:text-amber-400">
                  ⚠️ {isRtl
                    ? "ستُستبدل جميع البيانات الحالية ببيانات الملف المرفوع. النظام سيحفظ نسخة احتياطية تلقائياً قبل الاستعادة."
                    : "All current data will be replaced with the uploaded file's data. A pre-restore backup is taken automatically."}
                </div>

                <label className="block text-sm font-medium mb-2">{isRtl ? "اختر ملف ZIP" : "Select ZIP file"}</label>
                <div
                  className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors mb-4"
                  onClick={() => document.getElementById("zip-upload-input")?.click()}
                  data-testid="dropzone-zip"
                >
                  <input
                    id="zip-upload-input"
                    type="file"
                    accept=".zip"
                    className="hidden"
                    data-testid="input-zip-file"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      if (f && !f.name.endsWith(".zip")) { setError(isRtl ? "يجب أن يكون الملف بصيغة ZIP" : "File must be a .zip"); return; }
                      setUploadFile(f);
                    }}
                  />
                  {uploadFile ? (
                    <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400">
                      <FileArchive className="w-6 h-6" />
                      <div className="text-start">
                        <p className="font-semibold text-sm">{uploadFile.name}</p>
                        <p className="text-xs text-muted-foreground">{(uploadFile.size / 1024).toFixed(0)} KB</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-muted-foreground">
                      <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">{isRtl ? "اضغط لاختيار ملف ZIP" : "Click to select a ZIP file"}</p>
                      <p className="text-xs mt-1">{isRtl ? "الحد الأقصى 15 ميغابايت" : "Max 15MB"}</p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <button onClick={closeUploadModal} data-testid="button-upload-cancel"
                    className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-medium hover-elevate">
                    {isRtl ? "إلغاء" : "Cancel"}
                  </button>
                  <button
                    onClick={() => setUploadStep(2)}
                    disabled={!uploadFile}
                    data-testid="button-upload-next"
                    className="px-4 py-2 bg-emerald-600 text-white rounded-md text-sm font-semibold hover-elevate disabled:opacity-40"
                  >
                    {isRtl ? "التالي" : "Next"} →
                  </button>
                </div>
              </>
            )}

            {uploadStep === 2 && (
              <>
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 mb-4 text-xs text-destructive">
                  🚨 {isRtl
                    ? "هذا الإجراء لا يمكن التراجع عنه. ستُستبدل جميع بيانات النظام بالكامل."
                    : "This action cannot be undone. All system data will be completely replaced."}
                </div>
                <div className="bg-muted/50 rounded-lg p-3 mb-4 text-xs">
                  <p className="font-semibold mb-1">{isRtl ? "الملف المختار:" : "Selected file:"}</p>
                  <p className="font-mono text-primary">{uploadFile?.name}</p>
                  <p className="text-muted-foreground mt-1">{uploadFile ? `${(uploadFile.size / 1024).toFixed(0)} KB` : ""}</p>
                </div>
                <p className="text-sm mb-3">
                  {isRtl
                    ? <> اكتب <code className="px-1.5 py-0.5 bg-muted rounded font-mono">RESTORE</code> للتأكيد:</>
                    : <> Type <code className="px-1.5 py-0.5 bg-muted rounded font-mono">RESTORE</code> to confirm:</>}
                </p>
                <input
                  type="text"
                  value={uploadText}
                  onChange={(e) => setUploadText(e.target.value)}
                  disabled={uploading}
                  data-testid="input-upload-confirm"
                  className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm mb-4 font-mono"
                  placeholder="RESTORE"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setUploadStep(1)} disabled={uploading} data-testid="button-upload-back"
                    className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-medium hover-elevate disabled:opacity-50">
                    {isRtl ? "رجوع" : "Back"}
                  </button>
                  <button
                    onClick={handleUploadRestore}
                    disabled={uploading || uploadText.trim() !== "RESTORE"}
                    data-testid="button-upload-confirm"
                    className="flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-md text-sm font-bold hover-elevate disabled:opacity-40"
                  >
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {uploading ? (isRtl ? "جارٍ الاستعادة..." : "Restoring...") : (isRtl ? "تنفيذ الاستعادة" : "Run Restore")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {tab === "settings" && isAdmin && (
        <div className="space-y-4 max-w-3xl">
          {settingsLoading && !settings && (
            <div className="text-center py-8 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin inline" /> {isRtl ? "جارٍ التحميل..." : "Loading..."}</div>
          )}
          {settings && (
            <>
              <SettingsBlock title={isRtl ? "النسخ التلقائي اليومي" : "Auto Daily Backup"} testId="block-daily">
                <Toggle checked={settings.dailyEnabled} onChange={(v) => setSettings({ ...settings, dailyEnabled: v })} testId="toggle-daily"
                  label={isRtl ? "تفعيل النسخ اليومي" : "Enable daily backups"} />
                <HourInput label={isRtl ? "الساعة" : "Hour (0–23)"} value={settings.dailyHour} onChange={(v) => setSettings({ ...settings, dailyHour: v })} testId="input-daily-hour" />
                <NumInput label={isRtl ? "عدد النسخ المحفوظة" : "Keep last N"} value={settings.retainDaily} onChange={(v) => setSettings({ ...settings, retainDaily: v })} min={1} max={90} testId="input-retain-daily" />
              </SettingsBlock>

              <SettingsBlock title={isRtl ? "النسخ التلقائي الأسبوعي" : "Auto Weekly Backup"} testId="block-weekly">
                <Toggle checked={settings.weeklyEnabled} onChange={(v) => setSettings({ ...settings, weeklyEnabled: v })} testId="toggle-weekly"
                  label={isRtl ? "تفعيل النسخ الأسبوعي" : "Enable weekly backups"} />
                <div>
                  <label className="text-xs text-muted-foreground">{isRtl ? "اليوم" : "Day"}</label>
                  <select value={settings.weeklyDay} onChange={(e) => setSettings({ ...settings, weeklyDay: parseInt(e.target.value, 10) })} data-testid="select-weekly-day"
                    className="w-full mt-1 bg-background border border-input rounded-md px-3 py-2 text-sm">
                    {DAY_LABELS.map((d, i) => <option key={i} value={i}>{isRtl ? d.ar : d.en}</option>)}
                  </select>
                </div>
                <HourInput label={isRtl ? "الساعة" : "Hour (0–23)"} value={settings.weeklyHour} onChange={(v) => setSettings({ ...settings, weeklyHour: v })} testId="input-weekly-hour" />
                <NumInput label={isRtl ? "عدد النسخ المحفوظة" : "Keep last N"} value={settings.retainWeekly} onChange={(v) => setSettings({ ...settings, retainWeekly: v })} min={1} max={52} testId="input-retain-weekly" />
              </SettingsBlock>

              <SettingsBlock title={isRtl ? "النسخ التلقائي الشهري" : "Auto Monthly Backup"} testId="block-monthly">
                <Toggle checked={settings.monthlyEnabled} onChange={(v) => setSettings({ ...settings, monthlyEnabled: v })} testId="toggle-monthly"
                  label={isRtl ? "تفعيل النسخ الشهري (أول يوم من اليوم الأسبوعي المختار)" : "Enable monthly backups (first chosen weekday)"} />
                <HourInput label={isRtl ? "الساعة" : "Hour (0–23)"} value={settings.monthlyHour} onChange={(v) => setSettings({ ...settings, monthlyHour: v })} testId="input-monthly-hour" />
                <NumInput label={isRtl ? "عدد النسخ المحفوظة" : "Keep last N"} value={settings.retainMonthly} onChange={(v) => setSettings({ ...settings, retainMonthly: v })} min={1} max={24} testId="input-retain-monthly" />
              </SettingsBlock>

              <SettingsBlock title={isRtl ? "النسخ اليدوية" : "Manual Backups"} testId="block-manual">
                <NumInput label={isRtl ? "عدد النسخ اليدوية المحفوظة" : "Keep last N manual snapshots"} value={settings.retainManual} onChange={(v) => setSettings({ ...settings, retainManual: v })} min={1} max={100} testId="input-retain-manual" />
              </SettingsBlock>

              {/* Email Settings Block */}
              <div className="bg-card border border-border rounded-lg p-4" data-testid="block-email">
                <div className="flex items-center gap-2 mb-3">
                  <Mail className="w-5 h-5 text-primary" />
                  <h3 className="font-bold">{isRtl ? "إرسال النسخة الأسبوعية على البريد" : "Email Weekly Backup"}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Toggle
                    checked={settings.emailEnabled}
                    onChange={(v) => setSettings({ ...settings, emailEnabled: v })}
                    testId="toggle-email"
                    label={isRtl ? "تفعيل إرسال البريد تلقائياً مع كل نسخة أسبوعية" : "Send email with each weekly backup"}
                  />
                  <div className="md:col-span-2">
                    <label className="text-xs text-muted-foreground">{isRtl ? "عنوان البريد المستلِم" : "Recipient email"}</label>
                    <div className="flex gap-2 mt-1">
                      <input
                        type="email"
                        value={settings.emailRecipient}
                        onChange={(e) => setSettings({ ...settings, emailRecipient: e.target.value })}
                        placeholder={isRtl ? "example@company.com" : "example@company.com"}
                        data-testid="input-email-recipient"
                        className="flex-1 bg-background border border-input rounded-md px-3 py-2 text-sm"
                      />
                      <button
                        onClick={handleTestEmail}
                        disabled={testEmailSending || !settings.emailRecipient}
                        data-testid="button-test-email"
                        title={isRtl ? "إرسال بريد تجريبي مع نسخة Excel الآن" : "Send test email with Excel backup now"}
                        className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-md text-sm font-medium hover-elevate disabled:opacity-40 whitespace-nowrap"
                      >
                        {testEmailSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        {isRtl ? "إرسال تجريبي" : "Test Send"}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {isRtl
                        ? "سيتم إرسال ملف Excel يحتوي على جميع بيانات النظام مع كل نسخة أسبوعية تلقائية."
                        : "An Excel file containing all system data will be sent with each automatic weekly backup."}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">{isRtl ? "صيغة الملف المرفق" : "Attachment format"}</label>
                    <select
                      value={settings.emailFormat}
                      onChange={(e) => setSettings({ ...settings, emailFormat: e.target.value as "xlsx" | "pdf" })}
                      data-testid="select-email-format"
                      className="w-full mt-1 bg-background border border-input rounded-md px-3 py-2 text-sm"
                    >
                      <option value="xlsx">{isRtl ? "Excel (.xlsx) — موصى به" : "Excel (.xlsx) — Recommended"}</option>
                      <option value="pdf">{isRtl ? "PDF — قريباً" : "PDF — Coming soon"}</option>
                    </select>
                  </div>
                  {settings.emailEnabled && settings.weeklyEnabled && (
                    <div className="md:col-span-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm text-blue-700 dark:text-blue-300">
                      <strong>{isRtl ? "موعد الإرسال:" : "Send schedule:"}</strong>{" "}
                      {isRtl
                        ? `كل ${DAY_LABELS[settings.weeklyDay]?.ar || "جمعة"} الساعة ${String(settings.weeklyHour).padStart(2, "0")}:00`
                        : `Every ${DAY_LABELS[settings.weeklyDay]?.en || "Fri"} at ${String(settings.weeklyHour).padStart(2, "0")}:00`}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <button onClick={handleSaveSettings} disabled={settingsSaving} data-testid="button-save-settings"
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold hover-elevate disabled:opacity-50">
                  {settingsSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isRtl ? "حفظ الإعدادات" : "Save Settings"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
    </MainLayout>
  );
}

// ─── Small UI helpers ────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color, testId, action }: any) {
  const colorMap: any = {
    emerald: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
    blue: "text-blue-600 dark:text-blue-400 bg-blue-500/10",
    violet: "text-violet-600 dark:text-violet-400 bg-violet-500/10",
    slate: "text-slate-600 dark:text-slate-400 bg-slate-500/10",
  };
  return (
    <div className="bg-card border border-border rounded-lg p-3" data-testid={testId}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`p-1.5 rounded ${colorMap[color] || colorMap.slate}`}>{icon}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="font-semibold text-sm truncate">{value}</div>
      {sub && <div className="text-xs text-muted-foreground truncate mt-0.5">{sub}</div>}
      {action}
    </div>
  );
}

function Alert({ kind, testId, children }: any) {
  const map: any = {
    error: "bg-destructive/10 border-destructive/30 text-destructive",
    success: "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400",
    warning: "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400",
  };
  return <div className={`mb-4 p-3 border rounded-md text-sm ${map[kind]}`} data-testid={testId}>{children}</div>;
}

function TabButton({ active, onClick, icon, testId, children }: any) {
  return (
    <button onClick={onClick} data-testid={testId}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px ${active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
      {icon}{children}
    </button>
  );
}

function FilterChip({ active, onClick, testId, children }: any) {
  return (
    <button onClick={onClick} data-testid={testId}
      className={`px-3 py-1 rounded-full text-xs font-medium border ${active ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover-elevate"}`}>
      {children}
    </button>
  );
}

function SettingsBlock({ title, testId, children }: any) {
  return (
    <div className="bg-card border border-border rounded-lg p-4" data-testid={testId}>
      <h3 className="font-bold mb-3">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange, label, testId }: { checked: boolean; onChange: (v: boolean) => void; label: string; testId?: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer md:col-span-2">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} data-testid={testId} className="w-4 h-4" />
      <span className="text-sm">{label}</span>
    </label>
  );
}

function HourInput({ label, value, onChange, testId }: { label: string; value: number; onChange: (v: number) => void; testId?: string }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <input type="number" min={0} max={23} value={value} onChange={(e) => onChange(Math.max(0, Math.min(23, parseInt(e.target.value, 10) || 0)))} data-testid={testId}
        className="w-full mt-1 bg-background border border-input rounded-md px-3 py-2 text-sm" />
    </div>
  );
}

function NumInput({ label, value, onChange, min, max, testId }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; testId?: string }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <input type="number" min={min} max={max} value={value} onChange={(e) => onChange(Math.max(min, Math.min(max, parseInt(e.target.value, 10) || min)))} data-testid={testId}
        className="w-full mt-1 bg-background border border-input rounded-md px-3 py-2 text-sm" />
    </div>
  );
}
