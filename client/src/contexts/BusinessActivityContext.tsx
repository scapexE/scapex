import { createContext, useContext, useState, useMemo, type ReactNode } from "react";
import {
  type BusinessActivity,
  getActivities, saveActivities,
  getActiveActivityId, setActiveActivityId,
  getActivityAssignments, saveActivityAssignments,
  type ActivityUserAssignment,
} from "@/lib/activities";
import { type SystemUser } from "@/lib/permissions";

interface BusinessActivityContextValue {
  activities: BusinessActivity[];
  setActivities: (list: BusinessActivity[]) => void;
  /** Activities visible to the current user (filtered by assignment for non-admins) */
  userActivities: BusinessActivity[];
  activeActivity: BusinessActivity | null;
  setActiveActivity: (a: BusinessActivity | null) => void;
  assignments: ActivityUserAssignment[];
  setAssignments: (list: ActivityUserAssignment[]) => void;
  getUserActivityIds: (userId: string) => string[];
  getActivityUserIds: (activityId: string) => string[];
}

const BusinessActivityContext = createContext<BusinessActivityContextValue | null>(null);

export function BusinessActivityProvider({
  children,
  currentUser,
}: {
  children: ReactNode;
  currentUser: SystemUser | null;
}) {
  const isAdmin = currentUser?.role === "admin";
  const userId = currentUser?.id ?? null;

  const [activities, setActivitiesState] = useState<BusinessActivity[]>(() => getActivities());
  const [assignments, setAssignmentsState] = useState<ActivityUserAssignment[]>(() => getActivityAssignments());

  /** Compute activities visible to this user */
  const userActivities = useMemo<BusinessActivity[]>(() => {
    if (isAdmin) return activities.filter((a) => a.active);
    if (!userId) return [];
    return activities.filter((a) => {
      if (!a.active) return false;
      const asgn = assignments.find((x) => x.activityId === a.id);
      return asgn?.userIds.includes(userId) ?? false;
    });
  }, [activities, assignments, isAdmin, userId]);

  const [activeActivity, setActiveActivityState] = useState<BusinessActivity | null>(() => {
    const storedId = getActiveActivityId();
    const list = getActivities();
    const initAssignments = getActivityAssignments();

    const isUserVisible = (a: BusinessActivity) => {
      if (!a.active) return false;
      if (isAdmin) return true;
      if (!userId) return false;
      const asgn = initAssignments.find((x) => x.activityId === a.id);
      return asgn?.userIds.includes(userId) ?? false;
    };

    if (storedId) {
      const found = list.find((a) => a.id === storedId && isUserVisible(a));
      if (found) return found;
    }
    return list.find(isUserVisible) ?? null;
  });

  const setActivities = (list: BusinessActivity[]) => {
    setActivitiesState(list);
    saveActivities(list);
  };

  const setAssignments = (list: ActivityUserAssignment[]) => {
    setAssignmentsState(list);
    saveActivityAssignments(list);
  };

  const setActiveActivity = (a: BusinessActivity | null) => {
    setActiveActivityState(a);
    setActiveActivityId(a?.id ?? null);
  };

  const getUserActivityIds = (uid: string): string[] => {
    const result: string[] = [];
    for (const a of assignments) {
      if (a.userIds.includes(uid)) result.push(a.activityId);
    }
    return result;
  };

  const getActivityUserIds = (activityId: string): string[] => {
    return assignments.find((a) => a.activityId === activityId)?.userIds ?? [];
  };

  return (
    <BusinessActivityContext.Provider
      value={{
        activities,
        setActivities,
        userActivities,
        activeActivity,
        setActiveActivity,
        assignments,
        setAssignments,
        getUserActivityIds,
        getActivityUserIds,
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
