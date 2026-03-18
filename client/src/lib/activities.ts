// ─── Business Activity (Multi-Tenant per Activity Line) ──────────────────────

export type ActivityColor =
  | "blue" | "emerald" | "amber" | "violet" | "cyan" | "rose" | "orange" | "teal";

export interface BusinessActivity {
  id: string;
  nameAr: string;
  nameEn: string;
  color: ActivityColor;
  icon: string;      // lucide icon name key
  modules: string[]; // enabled module IDs for this activity
  active: boolean;
  createdAt: string;
}

// Per-activity user assignment: which users are allowed inside each activity
export interface ActivityUserAssignment {
  activityId: string;
  userIds: string[];
}

// ─── Storage keys ─────────────────────────────────────────────────────────────
const ACTIVITIES_KEY     = "scapex_activities";
const ASSIGNMENTS_KEY    = "scapex_activity_assignments";
const ACTIVE_ACTIVITY_KEY = "scapex_active_activity"; // sessionStorage

// ─── Color map ────────────────────────────────────────────────────────────────
export const ACTIVITY_COLOR_MAP: Record<ActivityColor, {
  bg: string; border: string; text: string; badge: string; dot: string;
}> = {
  blue:    { bg: "bg-blue-50 dark:bg-blue-950/30",    border: "border-blue-200 dark:border-blue-800/40",    text: "text-blue-700 dark:text-blue-400",    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",    dot: "bg-blue-500" },
  emerald: { bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800/40", text: "text-emerald-700 dark:text-emerald-400", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", dot: "bg-emerald-500" },
  amber:   { bg: "bg-amber-50 dark:bg-amber-950/30",  border: "border-amber-200 dark:border-amber-800/40",  text: "text-amber-700 dark:text-amber-400",  badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",  dot: "bg-amber-500" },
  violet:  { bg: "bg-violet-50 dark:bg-violet-950/30", border: "border-violet-200 dark:border-violet-800/40", text: "text-violet-700 dark:text-violet-400", badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400", dot: "bg-violet-500" },
  cyan:    { bg: "bg-cyan-50 dark:bg-cyan-950/30",    border: "border-cyan-200 dark:border-cyan-800/40",    text: "text-cyan-700 dark:text-cyan-400",    badge: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",    dot: "bg-cyan-500" },
  rose:    { bg: "bg-rose-50 dark:bg-rose-950/30",    border: "border-rose-200 dark:border-rose-800/40",    text: "text-rose-700 dark:text-rose-400",    badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",    dot: "bg-rose-500" },
  orange:  { bg: "bg-orange-50 dark:bg-orange-950/30", border: "border-orange-200 dark:border-orange-800/40", text: "text-orange-700 dark:text-orange-400", badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", dot: "bg-orange-500" },
  teal:    { bg: "bg-teal-50 dark:bg-teal-950/30",    border: "border-teal-200 dark:border-teal-800/40",    text: "text-teal-700 dark:text-teal-400",    badge: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",    dot: "bg-teal-500" },
};

// ─── Default activities ───────────────────────────────────────────────────────
function generateId(seed: string) {
  return `act_${seed}`;
}

export const DEFAULT_ACTIVITIES: BusinessActivity[] = [
  {
    id: generateId("eng_consulting"),
    nameAr: "استشارات هندسية",
    nameEn: "Engineering Consultancy",
    color: "blue",
    icon: "HardHat",
    active: true,
    createdAt: new Date().toISOString(),
    modules: [
      "dashboard", "crm", "sales", "accounting", "purchases",
      "projects", "engineering", "approvals", "government", "smart_proposal",
      "equipment", "inventory", "hr", "payroll", "attendance", "hse", "dms",
      "mobile_app", "bi",
    ],
  },
  {
    id: generateId("env_consulting"),
    nameAr: "استشارات بيئية",
    nameEn: "Environmental Consultancy",
    color: "emerald",
    icon: "Leaf",
    active: true,
    createdAt: new Date().toISOString(),
    modules: [
      "dashboard", "crm", "sales", "accounting", "purchases",
      "projects", "engineering", "government", "hse", "dms",
      "hr", "payroll", "attendance", "bi",
    ],
  },
  {
    id: generateId("safety_consulting"),
    nameAr: "استشارات سلامة",
    nameEn: "Safety Consultancy",
    color: "amber",
    icon: "ShieldAlert",
    active: true,
    createdAt: new Date().toISOString(),
    modules: [
      "dashboard", "crm", "sales", "accounting",
      "projects", "government", "hse", "dms",
      "hr", "payroll", "attendance", "bi",
    ],
  },
  {
    id: generateId("safety_services"),
    nameAr: "خدمات سلامة",
    nameEn: "Safety Services",
    color: "orange",
    icon: "Flame",
    active: true,
    createdAt: new Date().toISOString(),
    modules: [
      "dashboard", "crm", "sales", "accounting", "purchases",
      "equipment", "hse", "attendance", "mobile_app",
      "hr", "payroll", "dms",
    ],
  },
  {
    id: generateId("contracting"),
    nameAr: "مقاولات",
    nameEn: "Contracting",
    color: "violet",
    icon: "Building2",
    active: true,
    createdAt: new Date().toISOString(),
    modules: [
      "dashboard", "crm", "sales", "accounting", "purchases",
      "projects", "engineering", "approvals", "government", "smart_proposal",
      "equipment", "inventory", "hr", "payroll", "attendance", "hse", "dms",
      "mobile_app", "bi",
    ],
  },
  {
    id: generateId("metal_recycling"),
    nameAr: "تدوير المعادن",
    nameEn: "Metal Recycling",
    color: "teal",
    icon: "RefreshCcw",
    active: true,
    createdAt: new Date().toISOString(),
    // No projects, engineering, smart_proposal, government
    modules: [
      "dashboard", "crm", "sales", "accounting", "purchases",
      "inventory", "equipment", "hr", "payroll", "attendance", "hse", "dms", "bi",
    ],
  },
];

// ─── CRUD ─────────────────────────────────────────────────────────────────────
export function getActivities(): BusinessActivity[] {
  try {
    const stored = localStorage.getItem(ACTIVITIES_KEY);
    if (stored) return JSON.parse(stored) as BusinessActivity[];
  } catch { /* ignore */ }
  // Seed defaults on first load
  localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(DEFAULT_ACTIVITIES));
  return DEFAULT_ACTIVITIES;
}

export function saveActivities(list: BusinessActivity[]): void {
  localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(list));
}

export function getActivityAssignments(): ActivityUserAssignment[] {
  try {
    const stored = localStorage.getItem(ASSIGNMENTS_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return [];
}

export function saveActivityAssignments(list: ActivityUserAssignment[]): void {
  localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(list));
}

// ─── Active activity (session) ────────────────────────────────────────────────
export function getActiveActivityId(): string | null {
  return sessionStorage.getItem(ACTIVE_ACTIVITY_KEY);
}

export function setActiveActivityId(id: string | null): void {
  if (id) sessionStorage.setItem(ACTIVE_ACTIVITY_KEY, id);
  else sessionStorage.removeItem(ACTIVE_ACTIVITY_KEY);
}

// Returns modules enabled for a specific user in a specific activity:
// intersection of activity.modules, user.permissions, and user assignment
export function getEffectiveModules(
  activity: BusinessActivity | null,
  userPermissions: string[],
): string[] {
  if (!activity) return userPermissions;
  return userPermissions.filter((p) => activity.modules.includes(p));
}

// Returns activities that a user is assigned to (or all if admin / no assignments configured)
export function getUserActivities(
  userId: string,
  isAdmin: boolean,
): string[] /* activityIds */ {
  if (isAdmin) return []; // admin sees all ([] = no filter)
  const assignments = getActivityAssignments();
  const found = assignments.find((a) => a.activityId);
  // Collect all activityIds where userId appears
  const result: string[] = [];
  for (const a of assignments) {
    if (a.userIds.includes(userId)) result.push(a.activityId);
  }
  return result;
}
