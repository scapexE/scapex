import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useBusinessActivity } from "@/contexts/BusinessActivityContext";
import { ACTIVITY_COLOR_MAP, type ActivityColor } from "@/lib/activities";
import {
  ChevronDown, Check, Layers,
  HardHat, Leaf, ShieldAlert, Flame, Building2, RefreshCcw, Globe,
  Factory, TreePine, Zap, Wind, Droplets, Mountain, Wrench, Cpu,
  FlaskConical, Anchor, Warehouse, Hammer, Recycle, Sprout, Fish,
  Cog, Shield, Home, Star, Package, Truck,
} from "lucide-react";

// Icon resolver
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  HardHat, Leaf, ShieldAlert, Flame, Building2, RefreshCcw, Globe, Layers,
  Factory, TreePine, Zap, Wind, Droplets, Mountain, Wrench, Cpu,
  FlaskConical, Anchor, Warehouse, Hammer, Recycle, Sprout, Fish,
  Cog, Shield, Home, Star, Package, Truck,
};

function ActivityIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name] ?? Layers;
  return <Icon className={className} />;
}

export function ActivitySwitcher() {
  const { activities, activeActivity, setActiveActivity } = useBusinessActivity();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const active = activities.filter((a) => a.active);
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
          {/* "All" option */}
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

          {active.length > 0 && <div className="h-px bg-sidebar-border/50 mx-2.5" />}

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
