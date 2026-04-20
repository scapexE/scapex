import { createContext, useContext, useState, useEffect, useMemo, useCallback, type ReactNode } from "react";
import { type SystemUser } from "@/lib/permissions";

export type ActivityColor =
  | "blue" | "emerald" | "amber" | "violet" | "cyan" | "rose" | "orange" | "teal"
  | "red" | "pink" | "indigo" | "sky" | "lime" | "yellow" | "purple" | "fuchsia"
  | "green" | "slate";

export interface BusinessActivity {
  id: string;
  companyId: number | null;
  nameAr: string;
  nameEn: string;
  color: ActivityColor;
  icon: string;
  modules: string[];
  active: boolean;
  companyNameAr?: string | null;
  companyNameEn?: string | null;
  companyLogoUrl?: string | null;
  userIds: string[];
  createdAt?: string;
}

export interface ActivityUserAssignment {
  activityId: string;
  userIds: string[];
}

interface BusinessActivityContextValue {
  activities: BusinessActivity[];
  refresh: () => Promise<void>;
  /** Activities visible to the current user (filtered by membership for non-admins) */
  userActivities: BusinessActivity[];
  activeActivity: BusinessActivity | null;
  setActiveActivity: (a: BusinessActivity | null) => void;
  assignments: ActivityUserAssignment[];
  loading: boolean;
  getUserActivityIds: (userId: string) => string[];
  getActivityUserIds: (activityId: string) => string[];
  /** CRUD helpers (admin/manager only on server) */
  createActivity: (a: Partial<BusinessActivity>) => Promise<BusinessActivity | null>;
  updateActivity: (id: string, patch: Partial<BusinessActivity>) => Promise<BusinessActivity | null>;
  deleteActivity: (id: string) => Promise<boolean>;
  setActivityMembers: (activityId: string, userIds: string[]) => Promise<boolean>;
}

const BusinessActivityContext = createContext<BusinessActivityContextValue | null>(null);

const ACTIVE_ACTIVITY_KEY = "scapex_active_activity";

export function BusinessActivityProvider({
  children,
  currentUser,
}: {
  children: ReactNode;
  currentUser: SystemUser | null;
}) {
  const isAdmin = currentUser?.role === "admin" || (currentUser?.roles ?? []).includes("admin");
  const isManager = currentUser?.role === "manager" || (currentUser?.roles ?? []).includes("manager");
  const userId = currentUser?.id ?? null;

  const [activities, setActivities] = useState<BusinessActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeActivity, setActiveActivityState] = useState<BusinessActivity | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setActivities([]); setLoading(false); return;
    }
    try {
      setLoading(true);
      const res = await fetch("/api/activities", { headers: { "x-user-id": userId } });
      const data: BusinessActivity[] = res.ok ? await res.json() : [];
      setActivities(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load activities:", err);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { refresh(); }, [refresh]);

  const userActivities = useMemo<BusinessActivity[]>(() => {
    const visible = activities.filter((a) => a.active);
    if (isAdmin || isManager) return visible;
    if (!userId) return [];
    return visible.filter((a) => (a.userIds || []).includes(userId));
  }, [activities, isAdmin, isManager, userId]);

  // Initialize / reconcile active activity whenever activities or userActivities change
  useEffect(() => {
    if (loading) return;
    const list = userActivities;
    // If no visible activities, clear any stale selection
    if (list.length === 0) {
      if (activeActivity !== null) {
        setActiveActivityState(null);
        sessionStorage.removeItem(ACTIVE_ACTIVITY_KEY);
      }
      return;
    }
    if (activeActivity && list.find((a) => a.id === activeActivity.id)) {
      // Refresh in-place data
      const fresh = list.find((a) => a.id === activeActivity.id);
      if (fresh && fresh !== activeActivity) setActiveActivityState(fresh);
      return;
    }
    // Try persisted: sessionStorage (current tab) → user.lastActivityId (server) → first item
    const storedId =
      sessionStorage.getItem(ACTIVE_ACTIVITY_KEY) ||
      currentUser?.lastActivityId ||
      null;
    const found = (storedId && list.find((a) => a.id === storedId)) || list[0] || null;
    setActiveActivityState(found);
  }, [loading, activities, userActivities, currentUser]);

  const setActiveActivity = useCallback((a: BusinessActivity | null) => {
    setActiveActivityState(a);
    if (a?.id) sessionStorage.setItem(ACTIVE_ACTIVITY_KEY, a.id);
    else sessionStorage.removeItem(ACTIVE_ACTIVITY_KEY);
    if (currentUser?.id) {
      fetch(`/api/users/${currentUser.id}/last-activity`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-user-id": currentUser.id },
        body: JSON.stringify({ activityId: a?.id || null }),
      }).catch(() => {});
    }
  }, [currentUser]);

  const assignments = useMemo<ActivityUserAssignment[]>(
    () => activities.map((a) => ({ activityId: a.id, userIds: a.userIds || [] })),
    [activities]
  );

  const getUserActivityIds = useCallback((uid: string): string[] => {
    return activities.filter((a) => (a.userIds || []).includes(uid)).map((a) => a.id);
  }, [activities]);

  const getActivityUserIds = useCallback((activityId: string): string[] => {
    return activities.find((a) => a.id === activityId)?.userIds ?? [];
  }, [activities]);

  const authHeaders = useMemo(() => ({
    "Content-Type": "application/json",
    ...(currentUser?.id ? { "x-user-id": currentUser.id } : {}),
  }), [currentUser?.id]);

  const createActivity = useCallback(async (a: Partial<BusinessActivity>) => {
    try {
      const res = await fetch("/api/activities", { method: "POST", headers: authHeaders, body: JSON.stringify(a) });
      if (!res.ok) return null;
      await refresh();
      return await res.json();
    } catch { return null; }
  }, [authHeaders, refresh]);

  const updateActivity = useCallback(async (id: string, patch: Partial<BusinessActivity>) => {
    try {
      const res = await fetch(`/api/activities/${id}`, { method: "PATCH", headers: authHeaders, body: JSON.stringify(patch) });
      if (!res.ok) return null;
      await refresh();
      return await res.json();
    } catch { return null; }
  }, [authHeaders, refresh]);

  const deleteActivity = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/activities/${id}`, { method: "DELETE", headers: authHeaders });
      if (!res.ok) return false;
      await refresh();
      return true;
    } catch { return false; }
  }, [authHeaders, refresh]);

  const setActivityMembers = useCallback(async (activityId: string, userIds: string[]) => {
    try {
      const res = await fetch(`/api/activities/${activityId}/members`, {
        method: "PUT", headers: authHeaders, body: JSON.stringify({ userIds }),
      });
      if (!res.ok) return false;
      await refresh();
      return true;
    } catch { return false; }
  }, [authHeaders, refresh]);

  return (
    <BusinessActivityContext.Provider
      value={{
        activities,
        refresh,
        userActivities,
        activeActivity,
        setActiveActivity,
        assignments,
        loading,
        getUserActivityIds,
        getActivityUserIds,
        createActivity,
        updateActivity,
        deleteActivity,
        setActivityMembers,
      }}
    >
      {children}
    </BusinessActivityContext.Provider>
  );
}

export function useBusinessActivity() {
  const ctx = useContext(BusinessActivityContext);
  if (!ctx) throw new Error("useBusinessActivity must be inside BusinessActivityProvider");
  return ctx;
}
