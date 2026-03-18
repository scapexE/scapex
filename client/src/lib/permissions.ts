export type Role = "admin" | "manager" | "accountant" | "engineer" | "hr_manager" | "client" | "viewer";

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  permissions: string[];
  createdAt: string;
  active: boolean;
  pendingApproval?: boolean;
}

export const ALL_MODULES = [
  { id: "dashboard",            labelAr: "لوحة التحكم",            labelEn: "Dashboard",          category: "core" },
  { id: "ai_control",           labelAr: "مركز الذكاء الاصطناعي",  labelEn: "AI Control",         category: "core" },
  { id: "bi",                   labelAr: "تحليلات الأعمال",         labelEn: "BI Analytics",       category: "core" },
  { id: "multi_tenant",         labelAr: "إدارة الشركات",           labelEn: "Companies",          category: "core" },
  { id: "crm",                  labelAr: "إدارة العملاء",           labelEn: "CRM",                category: "business" },
  { id: "sales",                labelAr: "المبيعات",                labelEn: "Sales",              category: "business" },
  { id: "purchases",            labelAr: "المشتريات",               labelEn: "Purchases",          category: "business" },
  { id: "accounting",           labelAr: "المحاسبة",                labelEn: "Accounting",         category: "business" },
  { id: "projects",             labelAr: "المشاريع",                labelEn: "Projects",           category: "operations" },
  { id: "inventory",            labelAr: "المخزون",                 labelEn: "Inventory",          category: "operations" },
  { id: "equipment",            labelAr: "المعدات والأسطول",        labelEn: "Equipment",          category: "operations" },
  { id: "engineering",          labelAr: "الرسومات الهندسية",       labelEn: "Engineering",        category: "engineering" },
  { id: "approvals",            labelAr: "الموافقات",               labelEn: "Approvals",          category: "engineering" },
  { id: "government",           labelAr: "الجهات الحكومية",         labelEn: "Government",         category: "engineering" },
  { id: "smart_proposal",       labelAr: "العروض الذكية",           labelEn: "Smart Proposal",     category: "engineering" },
  { id: "hr",                   labelAr: "الموارد البشرية",         labelEn: "HR",                 category: "hr" },
  { id: "payroll",              labelAr: "الرواتب",                 labelEn: "Payroll",            category: "hr" },
  { id: "mobile_app",           labelAr: "تطبيق الجوال",            labelEn: "Mobile App",         category: "hr" },
  { id: "attendance",           labelAr: "الحضور والغياب",          labelEn: "Attendance",         category: "hr" },
  { id: "hse",                  labelAr: "الصحة والسلامة",          labelEn: "HSE",                category: "hr" },
  { id: "dms",                  labelAr: "إدارة الوثائق",           labelEn: "Documents",          category: "system" },
  { id: "client_portal",        labelAr: "بوابة العملاء",           labelEn: "Client Portal",      category: "system" },
  { id: "approve_registrations",labelAr: "اعتماد التسجيلات",        labelEn: "Approve Registrations", category: "system" },
  { id: "users",                labelAr: "إدارة المستخدمين",        labelEn: "Users",              category: "system" },
];

export const ROLE_DEFAULTS: Record<Role, string[]> = {
  admin: ALL_MODULES.map((m) => m.id),
  manager: [
    "dashboard", "crm", "sales", "purchases", "accounting",
    "projects", "inventory", "equipment", "engineering",
    "approvals", "government", "smart_proposal", "bi",
  ],
  accountant: ["dashboard", "accounting", "purchases", "sales"],
  engineer:   ["dashboard", "projects", "engineering", "approvals", "equipment", "attendance", "hse"],
  hr_manager: ["dashboard", "hr", "payroll", "attendance", "mobile_app"],
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
  if (user.role === "admin") return true;
  return (user.permissions || []).includes(page);
}

export function canApproveRegistrations(user: SystemUser | null): boolean {
  if (!user) return false;
  return user.role === "admin" || (user.permissions || []).includes("approve_registrations");
}

export function getUsers(): SystemUser[] {
  const saved = localStorage.getItem("users");
  if (!saved) return initDefaultUsers();
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
      id: "1", name: "Ahmed Al-Admin",     email: "admin@scapex.sa",      password: "Admin@123",
      role: "admin",      permissions: ROLE_DEFAULTS.admin,      createdAt: new Date().toISOString(), active: true,
    },
    {
      id: "2", name: "Sara Manager",        email: "manager@scapex.sa",    password: "Manager@123",
      role: "manager",    permissions: ROLE_DEFAULTS.manager,    createdAt: new Date().toISOString(), active: true,
    },
    {
      id: "3", name: "Khalid Accountant",   email: "accountant@scapex.sa", password: "Account@123",
      role: "accountant", permissions: ROLE_DEFAULTS.accountant, createdAt: new Date().toISOString(), active: true,
    },
    {
      id: "4", name: "Mohammed Engineer",   email: "engineer@scapex.sa",   password: "Engineer@123",
      role: "engineer",   permissions: ROLE_DEFAULTS.engineer,   createdAt: new Date().toISOString(), active: true,
    },
  ];
  localStorage.setItem("users", JSON.stringify(defaults));
  return defaults;
}

export function saveUsers(users: SystemUser[]): void {
  localStorage.setItem("users", JSON.stringify(users));
}
