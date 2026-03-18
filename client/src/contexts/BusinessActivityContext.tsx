import { createContext, useContext, useState, type ReactNode } from "react";
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
  const [activities, setActivitiesState] = useState<BusinessActivity[]>(() => getActivities());
  const [assignments, setAssignmentsState] = useState<ActivityUserAssignment[]>(() => getActivityAssignments());

  const [activeActivity, setActiveActivityState] = useState<BusinessActivity | null>(() => {
    const storedId = getActiveActivityId();
    const list = getActivities();
    if (storedId) {
      const found = list.find((a) => a.id === storedId && a.active);
      if (found) return found;
    }
    // Default: first active activity the user is assigned to, or first overall for admin
    return list.find((a) => a.active) ?? null;
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

  const getUserActivityIds = (userId: string): string[] => {
    const result: string[] = [];
    for (const a of assignments) {
      if (a.userIds.includes(userId)) result.push(a.activityId);
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
