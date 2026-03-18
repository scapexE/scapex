// ─── Business Activity (Multi-Tenant per Activity Line) ──────────────────────

export type ActivityColor =
  | "blue" | "emerald" | "amber" | "violet" | "cyan" | "rose" | "orange" | "teal"
  | "red" | "pink" | "indigo" | "sky" | "lime" | "yellow" | "purple" | "fuchsia"
  | "green" | "slate";

export interface BusinessActivity {
  id: string;
  nameAr: string;
  nameEn: string;
  color: ActivityColor;
  icon: string;
  modules: string[];
  active: boolean;
  createdAt: string;
  // Per-activity company branding
  companyNameAr?: string;
  companyNameEn?: string;
  companyLogoUrl?: string | null;
}

export interface ActivityUserAssignment {
  activityId: string;
  userIds: string[];
}

const ACTIVITIES_KEY         = "scapex_activities";
const ACTIVITIES_VERSION_KEY = "scapex_activities_version";
const ACTIVITIES_VERSION     = "v2";
const ASSIGNMENTS_KEY        = "scapex_activity_assignments";
const ACTIVE_ACTIVITY_KEY    = "scapex_active_activity";

export const ACTIVITY_COLOR_MAP: Record<ActivityColor, {
  bg: string; border: string; text: string; badge: string; dot: string;
}> = {
  blue:    { bg: "bg-blue-50 dark:bg-blue-950/30",       border: "border-blue-200 dark:border-blue-800/40",       text: "text-blue-700 dark:text-blue-400",       badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",       dot: "bg-blue-500" },
  emerald: { bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800/40", text: "text-emerald-700 dark:text-emerald-400", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", dot: "bg-emerald-500" },
  amber:   { bg: "bg-amber-50 dark:bg-amber-950/30",     border: "border-amber-200 dark:border-amber-800/40",     text: "text-amber-700 dark:text-amber-400",     badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",     dot: "bg-amber-500" },
  violet:  { bg: "bg-violet-50 dark:bg-violet-950/30",   border: "border-violet-200 dark:border-violet-800/40",   text: "text-violet-700 dark:text-violet-400",   badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",   dot: "bg-violet-500" },
  cyan:    { bg: "bg-cyan-50 dark:bg-cyan-950/30",       border: "border-cyan-200 dark:border-cyan-800/40",       text: "text-cyan-700 dark:text-cyan-400",       badge: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",       dot: "bg-cyan-500" },
  rose:    { bg: "bg-rose-50 dark:bg-rose-950/30",       border: "border-rose-200 dark:border-rose-800/40",       text: "text-rose-700 dark:text-rose-400",       badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",       dot: "bg-rose-500" },
  orange:  { bg: "bg-orange-50 dark:bg-orange-950/30",   border: "border-orange-200 dark:border-orange-800/40",   text: "text-orange-700 dark:text-orange-400",   badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",   dot: "bg-orange-500" },
  teal:    { bg: "bg-teal-50 dark:bg-teal-950/30",       border: "border-teal-200 dark:border-teal-800/40",       text: "text-teal-700 dark:text-teal-400",       badge: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",       dot: "bg-teal-500" },
  red:     { bg: "bg-red-50 dark:bg-red-950/30",         border: "border-red-200 dark:border-red-800/40",         text: "text-red-700 dark:text-red-400",         badge: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",         dot: "bg-red-500" },
  pink:    { bg: "bg-pink-50 dark:bg-pink-950/30",       border: "border-pink-200 dark:border-pink-800/40",       text: "text-pink-700 dark:text-pink-400",       badge: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",       dot: "bg-pink-500" },
  indigo:  { bg: "bg-indigo-50 dark:bg-indigo-950/30",   border: "border-indigo-200 dark:border-indigo-800/40",   text: "text-indigo-700 dark:text-indigo-400",   badge: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",   dot: "bg-indigo-500" },
  sky:     { bg: "bg-sky-50 dark:bg-sky-950/30",         border: "border-sky-200 dark:border-sky-800/40",         text: "text-sky-700 dark:text-sky-400",         badge: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",         dot: "bg-sky-500" },
  lime:    { bg: "bg-lime-50 dark:bg-lime-950/30",       border: "border-lime-200 dark:border-lime-800/40",       text: "text-lime-700 dark:text-lime-400",       badge: "bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400",       dot: "bg-lime-500" },
  yellow:  { bg: "bg-yellow-50 dark:bg-yellow-950/30",   border: "border-yellow-200 dark:border-yellow-800/40",   text: "text-yellow-700 dark:text-yellow-400",   badge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",   dot: "bg-yellow-500" },
  purple:  { bg: "bg-purple-50 dark:bg-purple-950/30",   border: "border-purple-200 dark:border-purple-800/40",   text: "text-purple-700 dark:text-purple-400",   badge: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",   dot: "bg-purple-500" },
  fuchsia: { bg: "bg-fuchsia-50 dark:bg-fuchsia-950/30", border: "border-fuchsia-200 dark:border-fuchsia-800/40", text: "text-fuchsia-700 dark:text-fuchsia-400", badge: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-400", dot: "bg-fuchsia-500" },
  green:   { bg: "bg-green-50 dark:bg-green-950/30",     border: "border-green-200 dark:border-green-800/40",     text: "text-green-700 dark:text-green-400",     badge: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",     dot: "bg-green-500" },
  slate:   { bg: "bg-slate-50 dark:bg-slate-950/30",     border: "border-slate-200 dark:border-slate-800/40",     text: "text-slate-700 dark:text-slate-400",     badge: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",     dot: "bg-slate-500" },
};

function generateId(seed: string) { return `act_${seed}`; }

export const DEFAULT_ACTIVITIES: BusinessActivity[] = [
  {
    id: generateId("eng_consulting"), nameAr: "استشارات هندسية", nameEn: "Engineering Consultancy",
    color: "blue", icon: "HardHat", active: true, createdAt: new Date().toISOString(),
    modules: ["dashboard","crm","sales","accounting","purchases","projects","engineering","approvals","government","smart_proposal","equipment","inventory","hr","payroll","attendance","hse","dms","mobile_app","bi"],
  },
  {
    id: generateId("env_consulting"), nameAr: "استشارات بيئية", nameEn: "Environmental Consultancy",
    color: "emerald", icon: "Leaf", active: true, createdAt: new Date().toISOString(),
    modules: ["dashboard","crm","sales","accounting","purchases","projects","engineering","government","smart_proposal","hse","dms","hr","payroll","attendance","bi"],
  },
  {
    id: generateId("safety_consulting"), nameAr: "استشارات سلامة", nameEn: "Safety Consultancy",
    color: "amber", icon: "ShieldAlert", active: true, createdAt: new Date().toISOString(),
    modules: ["dashboard","crm","sales","accounting","projects","government","smart_proposal","hse","dms","hr","payroll","attendance","bi"],
  },
  {
    id: generateId("safety_services"), nameAr: "خدمات سلامة", nameEn: "Safety Services",
    color: "orange", icon: "Flame", active: true, createdAt: new Date().toISOString(),
    modules: ["dashboard","crm","sales","accounting","purchases","equipment","smart_proposal","hse","attendance","mobile_app","hr","payroll","dms"],
  },
  {
    id: generateId("contracting"), nameAr: "مقاولات", nameEn: "Contracting",
    color: "violet", icon: "Building2", active: true, createdAt: new Date().toISOString(),
    modules: ["dashboard","crm","sales","accounting","purchases","projects","engineering","approvals","government","smart_proposal","equipment","inventory","hr","payroll","attendance","hse","dms","mobile_app","bi"],
  },
  {
    id: generateId("metal_recycling"), nameAr: "تدوير المعادن", nameEn: "Metal Recycling",
    color: "teal", icon: "RefreshCcw", active: true, createdAt: new Date().toISOString(),
    modules: ["dashboard","crm","sales","accounting","purchases","inventory","equipment","smart_proposal","hr","payroll","attendance","hse","dms","bi"],
  },
];

export function getActivities(): BusinessActivity[] {
  const storedVersion = localStorage.getItem(ACTIVITIES_VERSION_KEY);
  if (storedVersion !== ACTIVITIES_VERSION) {
    localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(DEFAULT_ACTIVITIES));
    localStorage.setItem(ACTIVITIES_VERSION_KEY, ACTIVITIES_VERSION);
    return DEFAULT_ACTIVITIES;
  }
  try {
    const stored = localStorage.getItem(ACTIVITIES_KEY);
    if (stored) return JSON.parse(stored) as BusinessActivity[];
  } catch { /* ignore */ }
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
export function getActiveActivityId(): string | null {
  return sessionStorage.getItem(ACTIVE_ACTIVITY_KEY);
}
export function setActiveActivityId(id: string | null): void {
  if (id) sessionStorage.setItem(ACTIVE_ACTIVITY_KEY, id);
  else sessionStorage.removeItem(ACTIVE_ACTIVITY_KEY);
}
export function getEffectiveModules(activity: BusinessActivity | null, userPermissions: string[]): string[] {
  if (!activity) return userPermissions;
  return userPermissions.filter((p) => activity.modules.includes(p));
}
export function getUserActivities(userId: string, isAdmin: boolean): string[] {
  if (isAdmin) return [];
  const assignments = getActivityAssignments();
  const result: string[] = [];
  for (const a of assignments) {
    if (a.userIds.includes(userId)) result.push(a.activityId);
  }
  return result;
}
