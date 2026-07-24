import { dbGetItem, dbSetItem } from "@/lib/dbStorage";
export type Role = "admin" | "manager" | "accountant" | "engineer" | "hr_manager" | "client" | "viewer";

export interface SystemUser {
  id: string;
  nationalId: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  roles?: Role[];
  permissions: string[];
  createdAt: string;
  active: boolean;
  pendingApproval?: boolean;
  emailVerified?: boolean;
  /** Companies this user is allowed to access. Empty/undefined for admin = all */
  companyIds?: string[];
  /** Specific branches the user is restricted to. Empty = all branches of allowed companies */
  branchIds?: string[];
  /** Server-persisted last selected business activity (for auto-restore on login) */
  lastActivityId?: string | null;
  /** Mobile phone number */
  phone?: string;
}

/** Returns the list of company IDs a user can access. Admins return null = unrestricted. */
export function getAllowedCompanyIds(user: SystemUser | null): string[] | null {
  if (!user) return [];
  if (user.role === "admin") return null;
  return Array.isArray(user.companyIds) ? user.companyIds : [];
}

/** Returns the list of branch IDs a user can access. null = unrestricted. */
export function getAllowedBranchIds(user: SystemUser | null): string[] | null {
  if (!user) return [];
  if (user.role === "admin") return null;
  if (Array.isArray(user.branchIds) && user.branchIds.length > 0) return user.branchIds;
  return null;
}

/** Validates Saudi/Resident ID: 10 digits, starts with 1 or 2 */
export function validateNationalId(id: string): boolean {
  return /^[12]\d{9}$/.test(id.trim());
}

// Priority order for determining primary role when multiple are assigned
export const ROLE_PRIORITY: Role[] = [
  "admin", "manager", "hr_manager", "accountant", "engineer", "client", "viewer",
];

export function getPrimaryRole(roles: Role[]): Role {
  for (const r of ROLE_PRIORITY) {
    if (roles.includes(r)) return r;
  }
  return roles[0] ?? "viewer";
}

export function mergePermissions(roles: Role[]): string[] {
  const merged = new Set<string>();
  for (const r of roles) {
    (ROLE_DEFAULTS[r] || []).forEach((p) => merged.add(p));
  }
  return Array.from(merged);
}

export const ALL_MODULES = [
  { id: "dashboard",            labelAr: "لوحة التحكم",            labelEn: "Dashboard",          category: "core" },
  { id: "bi",                   labelAr: "تحليلات الأعمال",         labelEn: "BI Analytics",       category: "core" },
  { id: "multi_tenant",         labelAr: "إدارة الشركات",           labelEn: "Companies",          category: "core" },
  { id: "crm",                  labelAr: "إدارة العملاء",           labelEn: "CRM",                category: "business" },
  { id: "sales",                labelAr: "المبيعات",                labelEn: "Sales",              category: "business" },
  { id: "purchases",            labelAr: "المشتريات",               labelEn: "Purchases",          category: "business" },
  { id: "accounting",           labelAr: "المحاسبة",                labelEn: "Accounting",         category: "business" },
  { id: "projects",             labelAr: "المشاريع",                labelEn: "Projects",           category: "operations" },
  { id: "inventory",            labelAr: "المخزون",                 labelEn: "Inventory",          category: "operations" },
  { id: "equipment",            labelAr: "المعدات والأسطول",        labelEn: "Equipment",          category: "operations" },
  { id: "hr",                   labelAr: "الموارد البشرية",         labelEn: "HR",                 category: "hr" },
  { id: "payroll",              labelAr: "الرواتب",                 labelEn: "Payroll",            category: "hr" },
  { id: "attendance",           labelAr: "الحضور والغياب",          labelEn: "Attendance",         category: "hr" },
  { id: "dms",                  labelAr: "إدارة الوثائق",           labelEn: "Documents",          category: "system" },
  { id: "client_portal",        labelAr: "بوابة العملاء",           labelEn: "Client Portal",      category: "system" },
  { id: "approve_registrations",labelAr: "اعتماد التسجيلات",        labelEn: "Approve Registrations", category: "system" },
  { id: "users",                labelAr: "إدارة المستخدمين",        labelEn: "Users",              category: "system" },
  { id: "system_admin",         labelAr: "لوحة تحكم النظام",        labelEn: "System Admin",       category: "system" },
  { id: "backup",               labelAr: "النسخ الاحتياطية",        labelEn: "Backups",            category: "system" },
];

export const ROLE_DEFAULTS: Record<Role, string[]> = {
  admin: ALL_MODULES.map((m) => m.id),
  manager: [
    "dashboard", "crm", "sales", "purchases", "accounting",
    "projects", "inventory", "equipment", "bi",
  ],
  accountant: ["dashboard", "accounting", "purchases", "sales"],
  engineer:   ["dashboard", "projects", "equipment", "attendance", "crm"],
  hr_manager: ["dashboard", "hr", "payroll", "attendance"],
  client:     ["dashboard", "client_portal"],
  viewer:     ["dashboard"],
};

export const ROLE_LABELS: Record<Role, { ar: string; en: string; color: string }> = {
  admin:      { ar: "مدير النظام",        en: "System Admin", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  manager:    { ar: "مدير",               en: "Manager",      color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  accountant: { ar: "محاسب",              en: "Accountant",   color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  engineer:   { ar: "مهندس",              en: "Engineer",     color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  hr_manager: { ar: "مدير موارد بشرية",   en: "HR Manager",   color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400" },
  client:     { ar: "عميل",               en: "Client",       color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  viewer:     { ar: "مشاهد",              en: "Viewer",       color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400" },
};

export function hasAccess(user: SystemUser | null, page: string): boolean {
  if (!user) return false;
  const roles = new Set<string>([user.role || "", ...((user.roles as string[]) || [])]);
  if (roles.has("admin")) return true;
  // Managers can manage activities/users from System Admin
  if (roles.has("manager") && (page === "system_admin" || page === "users" || page === "backup")) return true;
  return (user.permissions || []).includes(page);
}

export function canApproveRegistrations(user: SystemUser | null): boolean {
  if (!user) return false;
  return user.role === "admin" || (user.permissions || []).includes("approve_registrations");
}

const PERMISSIONS_VERSION = "v3";

export function getUsers(): SystemUser[] {
  const saved = dbGetItem("users");
  const storedVersion = dbGetItem("users_version");
  if (!saved || storedVersion !== PERMISSIONS_VERSION) return initDefaultUsers();
  try {
    const users = JSON.parse(saved);
    if (!Array.isArray(users) || users.length === 0) return initDefaultUsers();
    if (!users[0].id || !users[0].permissions || !users[0].name) return initDefaultUsers();
    return users;
  } catch {
    return initDefaultUsers();
  }
}

function initDefaultUsers(): SystemUser[] {
  const defaults: SystemUser[] = [
    {
      id: "1", nationalId: "1000000001", name: "Ahmed Al-Admin",     email: "admin@scapex.sa",      password: "Admin@123",
      role: "admin",      permissions: ROLE_DEFAULTS.admin,      createdAt: new Date().toISOString(), active: true,
    },
    {
      id: "2", nationalId: "1000000002", name: "Sara Manager",        email: "manager@scapex.sa",    password: "Manager@123",
      role: "manager",    permissions: ROLE_DEFAULTS.manager,    createdAt: new Date().toISOString(), active: true,
    },
    {
      id: "3", nationalId: "1000000003", name: "Khalid Accountant",   email: "accountant@scapex.sa", password: "Account@123",
      role: "accountant", permissions: ROLE_DEFAULTS.accountant, createdAt: new Date().toISOString(), active: true,
    },
    {
      id: "4", nationalId: "1000000004", name: "Mohammed Engineer",   email: "engineer@scapex.sa",   password: "Engineer@123",
      role: "engineer",   permissions: ROLE_DEFAULTS.engineer,   createdAt: new Date().toISOString(), active: true,
    },
  ];
  dbSetItem("users", JSON.stringify(defaults));
  dbSetItem("users_version", PERMISSIONS_VERSION);
  const storedUser = dbGetItem("user");
  if (storedUser) {
    try {
      const u = JSON.parse(storedUser) as SystemUser;
      const refreshed = defaults.find((d) => d.id === u.id);
      if (refreshed) dbSetItem("user", JSON.stringify(refreshed));
    } catch {}
  }
  return defaults;
}

export function saveUsers(users: SystemUser[]): void {
  dbSetItem("users", JSON.stringify(users));
}
