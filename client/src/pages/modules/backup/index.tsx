import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { dbGetItem } from "@/lib/dbStorage";
import { Download, Database, Loader2, ShieldCheck } from "lucide-react";
import { logAction } from "@/lib/auditLog";

type ModuleInfo = { id: string; labelEn: string; labelAr: string; tableCount: number };

export default function BackupModule() {
  const { dir, language } = useLanguage();
  const isRtl = dir === "rtl";
  const user = JSON.parse(dbGetItem("user") || "null");
  const userId = user?.id || "";
  const roles = new Set<string>([user?.role || "", ...((user?.roles as string[]) || [])]);
  const isAdmin = roles.has("admin");
  const isManager = roles.has("manager");

  const [modules, setModules] = useState<ModuleInfo[]>([]);
  const [modulesLoading, setModulesLoading] = useState(true);
  const [modulesError, setModulesError] = useState("");
  const [loadingFull, setLoadingFull] = useState(false);
  const [loadingMod, setLoadingMod] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [warning, setWarning] = useState("");

  useEffect(() => {
    setModulesLoading(true);
    fetch("/api/backup/modules", { headers: { "x-user-id": userId } })
      .then(async (r) => {
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          throw new Error(d.error || (r.status === 403 ? (isRtl ? "غير مصرح" : "Forbidden") : (isRtl ? "فشل تحميل القائمة" : "Failed to load modules")));
        }
        return r.json();
      })
      .then((list: ModuleInfo[]) => { setModules(list); setModulesError(""); })
      .catch((e: any) => setModulesError(e.message || (isRtl ? "خطأ في الاتصال" : "Connection error")))
      .finally(() => setModulesLoading(false));
  }, [userId, isRtl]);

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const extractFilename = (res: Response, fallback: string) => {
    const cd = res.headers.get("Content-Disposition") || "";
    const m = cd.match(/filename="?([^";]+)"?/);
    return m ? m[1] : fallback;
  };

  const handleFullBackup = async () => {
    setError(""); setSuccess(""); setWarning(""); setLoadingFull(true);
    try {
      const res = await fetch("/api/backup/full", { headers: { "x-user-id": userId } });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || (isRtl ? "فشل إنشاء النسخة" : "Backup failed"));
      }
      const errCount = parseInt(res.headers.get("X-Backup-Errors") || "0", 10);
      const blob = await res.blob();
      const filename = extractFilename(res, "scapex-full-backup.zip");
      downloadBlob(blob, filename);
      logAction("export", "backup", `Full backup downloaded`, `تم تنزيل نسخة احتياطية كاملة`);
      if (errCount > 0) {
        setWarning(isRtl
          ? `تم التنزيل لكن ${errCount} جدول فشل تصديره. راجع manifest.json داخل الملف.`
          : `Downloaded with ${errCount} table failures. Check manifest.json inside the archive.`);
      } else {
        setSuccess(isRtl ? "تم تنزيل النسخة الاحتياطية الكاملة بنجاح" : "Full backup downloaded successfully");
      }
    } catch (e: any) {
      setError(e.message || (isRtl ? "خطأ في الاتصال" : "Connection error"));
    } finally {
      setLoadingFull(false);
    }
  };

  const handleModuleBackup = async (id: string, label: string) => {
    setError(""); setSuccess(""); setWarning(""); setLoadingMod(id);
    try {
      const res = await fetch(`/api/backup/module/${id}`, { headers: { "x-user-id": userId } });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || (isRtl ? "فشل التصدير" : "Export failed"));
      }
      const errCount = parseInt(res.headers.get("X-Backup-Errors") || "0", 10);
      const blob = await res.blob();
      const filename = extractFilename(res, `scapex-${id}.json`);
      downloadBlob(blob, filename);
      logAction("export", "backup", `Module backup: ${id}`, `نسخة احتياطية للموديول: ${label}`);
      if (errCount > 0) {
        setWarning(isRtl
          ? `تم تنزيل ${label} لكن ${errCount} جدول فشل. راجع حقل errors في الملف.`
          : `${label} downloaded with ${errCount} table failures. Check the "errors" field in the file.`);
      } else {
        setSuccess(isRtl ? `تم تنزيل ${label} بنجاح` : `${label} downloaded successfully`);
      }
    } catch (e: any) {
      setError(e.message || (isRtl ? "خطأ في الاتصال" : "Connection error"));
    } finally {
      setLoadingMod(null);
    }
  };

  if (!isAdmin && !isManager) {
    return (
      <div className="p-8 text-center text-muted-foreground" data-testid="text-no-permission">
        {isRtl ? "غير مصرح لك بالوصول إلى هذه الصفحة" : "You don't have permission to access this page"}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto" dir={dir}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3" data-testid="heading-backup">
          <Database className="w-8 h-8 text-primary" />
          {isRtl ? "النسخ الاحتياطية" : "Backups"}
        </h1>
        <p className="text-muted-foreground">
          {isRtl
            ? "قم بتنزيل نسخة احتياطية كاملة من بيانات النظام أو نسخة من موديول محدد."
            : "Download a complete backup of your system data or export a specific module."}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 text-destructive rounded-md text-sm" data-testid="alert-error">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-md text-sm" data-testid="alert-success">
          {success}
        </div>
      )}
      {warning && (
        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 rounded-md text-sm" data-testid="alert-warning">
          {warning}
        </div>
      )}
      {modulesError && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 text-destructive rounded-md text-sm" data-testid="alert-modules-error">
          {modulesError}
        </div>
      )}

      <div className="mb-8 bg-card border-2 border-primary/40 rounded-xl p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-10 h-10 text-primary mt-1" />
            <div>
              <h2 className="text-xl font-bold mb-1">
                {isRtl ? "نسخة احتياطية كاملة (ZIP)" : "Full System Backup (ZIP)"}
              </h2>
              <p className="text-sm text-muted-foreground max-w-md">
                {isRtl
                  ? "تصدير كل جداول قاعدة البيانات كملف ZIP يحتوي على ملفات JSON منظّمة حسب الموديول. متاح للمشرفين فقط."
                  : "Export every database table as a ZIP file containing JSON files grouped by module. Admin only."}
              </p>
            </div>
          </div>
          <button
            onClick={handleFullBackup}
            disabled={!isAdmin || loadingFull}
            data-testid="button-full-backup"
            className="flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover-elevate disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {loadingFull ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            {loadingFull
              ? (isRtl ? "جارٍ التحضير..." : "Preparing...")
              : (isRtl ? "تنزيل النسخة الكاملة" : "Download Full Backup")}
          </button>
        </div>
        {!isAdmin && (
          <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
            {isRtl ? "⚠ النسخة الكاملة متاحة للمشرف (admin) فقط" : "⚠ Full backup is admin-only"}
          </p>
        )}
      </div>

      <div className="mb-3">
        <h2 className="text-xl font-bold mb-1">
          {isRtl ? "تصدير حسب الموديول" : "Per-Module Export"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {isRtl
            ? "اختر موديول لتنزيل بياناته كملف JSON واحد."
            : "Choose a module to download its data as a single JSON file."}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {modules.map((m) => {
          const label = language === "ar" ? m.labelAr : m.labelEn;
          const isLoading = loadingMod === m.id;
          return (
            <div
              key={m.id}
              data-testid={`card-module-${m.id}`}
              className="bg-card border border-border rounded-lg p-4 flex items-center justify-between gap-3 hover-elevate"
            >
              <div className="min-w-0">
                <div className="font-semibold truncate" data-testid={`text-module-label-${m.id}`}>{label}</div>
                <div className="text-xs text-muted-foreground">
                  {isRtl ? `${m.tableCount} جدول` : `${m.tableCount} tables`}
                </div>
              </div>
              <button
                onClick={() => handleModuleBackup(m.id, label)}
                disabled={isLoading || loadingFull}
                data-testid={`button-backup-${m.id}`}
                className="flex items-center gap-2 px-3 py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-medium hover-elevate disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
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
        {!modulesLoading && modules.length === 0 && !modulesError && (
          <div className="col-span-full text-center text-muted-foreground py-8" data-testid="text-empty-modules">
            {isRtl ? "لا توجد موديولات متاحة" : "No modules available"}
          </div>
        )}
      </div>
    </div>
  );
}
