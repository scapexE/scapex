export interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  action: "login" | "logout" | "create" | "update" | "delete" | "export" | "approve" | "reject" | "settings_change" | "upload" | "sign";
  module: string;
  details: string;
  detailsAr: string;
}

const STORAGE_KEY = "scapex_audit_log";
const MAX_ENTRIES = 500;

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function getAuditLog(): AuditEntry[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function logAction(
  action: AuditEntry["action"],
  module: string,
  details: string,
  detailsAr: string,
): void {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  if (!user) return;

  const entry: AuditEntry = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    userId: user.id || user.email,
    userName: user.name || user.email,
    userRole: user.role || "user",
    action,
    module,
    details,
    detailsAr,
  };

  const log = getAuditLog();
  log.unshift(entry);
  if (log.length > MAX_ENTRIES) log.length = MAX_ENTRIES;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(log));

  window.dispatchEvent(new CustomEvent("scapex_audit_update"));
}

export function clearAuditLog(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
  window.dispatchEvent(new CustomEvent("scapex_audit_update"));
}

export const ACTION_LABELS: Record<AuditEntry["action"], { en: string; ar: string }> = {
  login: { en: "Login", ar: "تسجيل دخول" },
  logout: { en: "Logout", ar: "تسجيل خروج" },
  create: { en: "Create", ar: "إنشاء" },
  update: { en: "Update", ar: "تعديل" },
  delete: { en: "Delete", ar: "حذف" },
  export: { en: "Export", ar: "تصدير" },
  upload: { en: "Upload", ar: "رفع ملف" },
  approve: { en: "Approve", ar: "موافقة" },
  reject: { en: "Reject", ar: "رفض" },
  settings_change: { en: "Settings Change", ar: "تغيير إعدادات" },
  sign: { en: "Sign", ar: "توقيع" },
};

export const ACTION_COLORS: Record<AuditEntry["action"], string> = {
  login: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
  logout: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  create: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  update: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  delete: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  export: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400",
  upload: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-400",
  approve: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400",
  reject: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400",
  settings_change: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400",
  sign: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
};

export const ACTION_CATEGORIES: Record<string, { en: string; ar: string; actions: AuditEntry["action"][] }> = {
  auth: { en: "Login & Logout", ar: "الدخول والخروج", actions: ["login", "logout"] },
  changes: { en: "Changes & Modifications", ar: "التعديلات والتغييرات", actions: ["create", "update", "delete", "settings_change"] },
  files: { en: "File Uploads & Exports", ar: "رفع الملفات والتصدير", actions: ["upload", "export"] },
  approvals: { en: "Approvals & Rejections", ar: "الموافقات والرفض", actions: ["approve", "reject"] },
  signatures: { en: "Electronic Signatures", ar: "التوقيعات الإلكترونية", actions: ["sign"] },
};
