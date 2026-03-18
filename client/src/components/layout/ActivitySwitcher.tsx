import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useBusinessActivity } from "@/contexts/BusinessActivityContext";
import { ACTIVITY_COLOR_MAP, type ActivityColor } from "@/lib/activities";
import { ActivityIcon } from "@/components/ActivityIcon";
import { ChevronDown, Check, Layers } from "lucide-react";
import type { SystemUser } from "@/lib/permissions";

export function ActivitySwitcher() {
  const { userActivities, activeActivity, setActiveActivity } = useBusinessActivity();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentUser: SystemUser | null = JSON.parse(localStorage.getItem("user") || "null");
  const isAdmin = currentUser?.role === "admin";

  const colors = activeActivity
    ? ACTIVITY_COLOR_MAP[activeActivity.color as ActivityColor]
    : null;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // If user has only one activity and is not admin, auto-select and hide switcher
  if (!isAdmin && userActivities.length <= 1) {
    if (userActivities.length === 1 && activeActivity?.id !== userActivities[0].id) {
      setActiveActivity(userActivities[0]);
    }
    if (userActivities.length === 0) return null;
    const act = userActivities[0];
    const c = ACTIVITY_COLOR_MAP[act.color as ActivityColor];
    return (
      <div className="px-3 mb-1.5">
        <div className={cn(
          "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg border",
          c.border, c.bg
        )}>
          <div className={cn("w-5 h-5 rounded-md flex items-center justify-center shrink-0", c.badge)}>
            <ActivityIcon name={act.icon} className={cn("w-3 h-3", c.text)} />
          </div>
          <p className={cn("flex-1 text-right text-[11px] font-semibold truncate leading-none", c.text)}>
            {act.nameAr}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="px-3 mb-1.5">
      {/* ── Compact trigger pill ───────────────────────────── */}
      <button
        data-testid="activity-switcher-trigger"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all duration-200 group",
          activeActivity && colors
            ? cn(colors.border, colors.bg)
            : "border-sidebar-border/50 bg-sidebar-accent/30 hover:bg-sidebar-accent/60"
        )}
      >
        {/* Colored dot / icon */}
        <div className={cn(
          "w-5 h-5 rounded-md flex items-center justify-center shrink-0",
          activeActivity && colors ? colors.badge : "bg-sidebar-accent/70"
        )}>
          <ActivityIcon
            name={activeActivity?.icon ?? "Layers"}
            className={cn("w-3 h-3", activeActivity && colors ? colors.text : "text-sidebar-foreground/50")}
          />
        </div>

        {/* Name */}
        <p className={cn(
          "flex-1 text-right text-[11px] font-semibold truncate leading-none",
          activeActivity && colors ? colors.text : "text-sidebar-foreground/50"
        )}>
          {activeActivity ? activeActivity.nameAr : "جميع الأنشطة"}
        </p>

        <ChevronDown className={cn(
          "w-3 h-3 shrink-0 transition-transform duration-200 text-sidebar-foreground/40",
          open && "rotate-180"
        )} />
      </button>

      {/* ── Dropdown ───────────────────────────────────────── */}
      {open && (
        <div className="mt-1 rounded-xl border border-sidebar-border/70 overflow-hidden shadow-xl bg-sidebar/95 backdrop-blur-sm">
          {/* "All" option — only for admins */}
          {isAdmin && (
            <button
              onClick={() => { setActiveActivity(null); setOpen(false); }}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 text-right transition-colors",
                !activeActivity
                  ? "bg-sidebar-accent text-sidebar-foreground"
                  : "hover:bg-sidebar-accent/60 text-sidebar-foreground/70"
              )}
            >
              <div className="w-6 h-6 rounded-md bg-sidebar-accent/80 flex items-center justify-center shrink-0">
                <Layers className="w-3.5 h-3.5 text-sidebar-foreground/60" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">جميع الأنشطة</p>
                <p className="text-[10px] text-sidebar-foreground/40 truncate">بدون تصفية</p>
              </div>
              {!activeActivity && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
            </button>
          )}

          {isAdmin && userActivities.length > 0 && <div className="h-px bg-sidebar-border/50 mx-2.5" />}

          {/* Activity list */}
          {userActivities.map((activity) => {
            const c = ACTIVITY_COLOR_MAP[activity.color as ActivityColor];
            const isSelected = activeActivity?.id === activity.id;
            return (
              <button
                key={activity.id}
                data-testid={`activity-option-${activity.id}`}
                onClick={() => { setActiveActivity(activity); setOpen(false); }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 text-right transition-colors",
                  isSelected ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/50"
                )}
              >
                <div className={cn("w-6 h-6 rounded-md flex items-center justify-center shrink-0", c.badge)}>
                  <ActivityIcon name={activity.icon} className={cn("w-3.5 h-3.5", c.text)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-xs font-medium truncate",
                    isSelected ? c.text : "text-sidebar-foreground/80"
                  )}>
                    {activity.nameAr}
                  </p>
                  {(activity.companyNameAr || activity.companyNameEn) && (
                    <p className="text-[10px] text-sidebar-foreground/40 truncate">
                      {activity.companyNameAr || activity.companyNameEn}
                    </p>
                  )}
                </div>
                {isSelected && <Check className={cn("w-3.5 h-3.5 shrink-0", c.text)} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
