import { useEffect, useMemo } from "react";
import { useBusinessActivity } from "@/contexts/BusinessActivityContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { dbGetItem } from "@/lib/dbStorage";
import { setRequestScope } from "@/lib/queryClient";
import type { SystemUser } from "@/lib/permissions";
import { Layers, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Reads the active business activity, the current user, and exposes:
 *   - activityId: the id to send with every API request
 *   - isPrivileged: admin/manager (allowed to see "All Activities")
 *   - showAllActivities: whether the admin chose "all" (no filter)
 *   - canQuery: false when no activity is selected and user isn't privileged
 *
 * Side-effect: keeps the global queryClient request scope in sync so every
 * fetch made via apiRequest/scopedFetch is automatically scoped.
 */
export function useActivityScope() {
  const { activeActivity } = useBusinessActivity();
  const currentUser: SystemUser | null = useMemo(() => {
    try { return JSON.parse(dbGetItem("user") || "null"); } catch { return null; }
  }, []);

  const isPrivileged = useMemo(() => {
    if (!currentUser) return false;
    const roles = new Set<string>([currentUser.role || "", ...((currentUser.roles as string[]) || [])]);
    return roles.has("admin") || roles.has("manager");
  }, [currentUser]);

  const activityId = activeActivity?.id ?? null;

  // Keep the global fetch scope in sync. Runs on every change.
  useEffect(() => {
    setRequestScope({ userId: currentUser?.id ?? null, activityId });
  }, [currentUser?.id, activityId]);

  const canQuery = isPrivileged || !!activityId;

  return { activityId, activeActivity, isPrivileged, canQuery, currentUser };
}

/**
 * Banner shown above any module page when no activity is selected.
 * For privileged users it's informational; for regular users it blocks data entry.
 */
export function ActivityRequiredAlert({ blocking = false }: { blocking?: boolean }) {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";
  return (
    <div
      data-testid="activity-required-alert"
      className={cn(
        "flex items-start gap-3 px-4 py-3 rounded-md border text-sm",
        blocking
          ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-200"
          : "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-700/50 dark:bg-blue-950/30 dark:text-blue-200",
      )}
    >
      {blocking ? <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> : <Layers className="w-4 h-4 mt-0.5 shrink-0" />}
      <div className="flex-1">
        <p className="font-semibold">
          {isRtl ? "يجب اختيار نشاط تجاري" : "Select a business activity"}
        </p>
        <p className="text-xs opacity-80 mt-0.5">
          {isRtl
            ? "اختر نشاطاً من الشريط الجانبي لعرض البيانات وإضافة سجلات جديدة."
            : "Pick an activity from the sidebar to view data and add new records."}
        </p>
      </div>
    </div>
  );
}
