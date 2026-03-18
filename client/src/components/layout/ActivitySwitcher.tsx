import { useState } from "react";
import { cn } from "@/lib/utils";
import { useBusinessActivity } from "@/contexts/BusinessActivityContext";
import { ACTIVITY_COLOR_MAP, type ActivityColor } from "@/lib/activities";
import {
  ChevronDown, ChevronUp, Check, Globe,
  HardHat, Leaf, ShieldAlert, Flame, Building2, RefreshCcw,
  Layers,
} from "lucide-react";

// Icon resolver
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  HardHat, Leaf, ShieldAlert, Flame, Building2, RefreshCcw, Globe, Layers,
};

function ActivityIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name] ?? Globe;
  return <Icon className={className} />;
}

export function ActivitySwitcher() {
  const { activities, activeActivity, setActiveActivity } = useBusinessActivity();
  const [open, setOpen] = useState(false);

  const active = activities.filter((a) => a.active);
  const colors = activeActivity
    ? ACTIVITY_COLOR_MAP[activeActivity.color as ActivityColor]
    : null;

  return (
    <div className="px-3 mb-2">
      {/* Trigger */}
      <button
        data-testid="activity-switcher-trigger"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 transition-all duration-200",
          "text-sidebar-foreground/80 hover:text-sidebar-foreground",
          activeActivity && colors
            ? `${colors.border} ${colors.bg}`
            : "border-sidebar-border/60 bg-sidebar-accent/40 hover:bg-sidebar-accent"
        )}
      >
        {/* Icon */}
        <div className={cn(
          "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
          activeActivity && colors ? colors.badge : "bg-sidebar-accent"
        )}>
          <ActivityIcon
            name={activeActivity?.icon ?? "Layers"}
            className={cn("w-4 h-4", activeActivity && colors ? colors.text : "text-sidebar-foreground/60")}
          />
        </div>

        {/* Name */}
        <div className="flex-1 text-right min-w-0">
          <p className={cn(
            "text-xs font-semibold leading-tight truncate",
            activeActivity && colors ? colors.text : "text-sidebar-foreground/60"
          )}>
            {activeActivity ? activeActivity.nameAr : "جميع الأنشطة"}
          </p>
          <p className="text-[10px] text-sidebar-foreground/40 truncate">
            {activeActivity
              ? `${activeActivity.modules.length} وحدة مفعّلة`
              : `${active.length} نشاط`}
          </p>
        </div>

        {open ? (
          <ChevronUp className="w-3.5 h-3.5 shrink-0 text-sidebar-foreground/40" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 shrink-0 text-sidebar-foreground/40" />
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="mt-1.5 rounded-xl border border-sidebar-border overflow-hidden shadow-lg bg-sidebar">
          {/* "All" option */}
          <button
            onClick={() => { setActiveActivity(null); setOpen(false); }}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2.5 text-right transition-colors hover:bg-sidebar-accent",
              !activeActivity && "bg-sidebar-accent"
            )}
          >
            <div className="w-6 h-6 rounded-md bg-sidebar-accent/70 flex items-center justify-center shrink-0">
              <Layers className="w-3.5 h-3.5 text-sidebar-foreground/60" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground/80 truncate">جميع الأنشطة</p>
              <p className="text-[10px] text-sidebar-foreground/40">بدون تصفية حسب النشاط</p>
            </div>
            {!activeActivity && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
          </button>

          {/* Divider */}
          <div className="h-px bg-sidebar-border/60 mx-3" />

          {/* Activity list */}
          {active.map((activity) => {
            const c = ACTIVITY_COLOR_MAP[activity.color as ActivityColor];
            const isSelected = activeActivity?.id === activity.id;
            return (
              <button
                key={activity.id}
                data-testid={`activity-option-${activity.id}`}
                onClick={() => { setActiveActivity(activity); setOpen(false); }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2.5 text-right transition-colors",
                  isSelected ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/60"
                )}
              >
                <div className={cn("w-6 h-6 rounded-md flex items-center justify-center shrink-0", c.badge)}>
                  <ActivityIcon name={activity.icon} className={cn("w-3.5 h-3.5", c.text)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-xs font-medium truncate", isSelected ? c.text : "text-sidebar-foreground/80")}>
                    {activity.nameAr}
                  </p>
                  <p className="text-[10px] text-sidebar-foreground/40 truncate">
                    {activity.modules.length} وحدة
                  </p>
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
