import { dbGetItem } from "@/lib/dbStorage";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useBusinessActivity } from "@/contexts/BusinessActivityContext";
import { ACTIVITY_COLOR_MAP, type ActivityColor } from "@/lib/activities";
import { ActivityIcon } from "@/components/ActivityIcon";
import { ChevronDown, Check, Layers, Building2, ArrowRight, ArrowLeft } from "lucide-react";
import type { SystemUser } from "@/lib/permissions";
import { useLanguage } from "@/contexts/LanguageContext";

export function ActivitySwitcher() {
  const { userActivities, activeActivity, setActiveActivity } = useBusinessActivity();
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";
  const [open, setOpen] = useState(false);
  // Two-step flow: pick a company first, then one of its activities.
  // null = show company list. string id = drilled into that company.
  const [drillCompanyId, setDrillCompanyId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const currentUser: SystemUser | null = JSON.parse(dbGetItem("user") || "null");
  const isAdmin = currentUser?.role === "admin";

  const colors = activeActivity
    ? ACTIVITY_COLOR_MAP[activeActivity.color as ActivityColor]
    : null;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setDrillCompanyId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // When the dropdown opens, default the drill to the active activity's company
  // so the user lands inside the company they're already working in.
  useEffect(() => {
    if (open && drillCompanyId === null && activeActivity?.companyId != null) {
      setDrillCompanyId(`c:${activeActivity.companyId}`);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // For non-admin with one assigned activity: auto-select it
  useEffect(() => {
    if (!isAdmin && userActivities.length === 1 && activeActivity?.id !== userActivities[0].id) {
      setActiveActivity(userActivities[0]);
    }
  }, [isAdmin, userActivities, activeActivity, setActiveActivity]);

  // Non-admin without any activity assigned: always show a clear empty state
  if (!isAdmin && userActivities.length === 0) {
    return (
      <div className="px-3 mb-1.5" data-testid="activity-switcher-empty">
        <div className="w-full flex items-start gap-2 px-2.5 py-2 rounded-lg border border-dashed border-amber-300 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-950/20">
          <Layers className="w-4 h-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 leading-tight">
              {isRtl ? "لا توجد أنشطة مُسندة إليك" : "No activities assigned"}
            </p>
            <p className="text-[10px] text-amber-700/70 dark:text-amber-400/70 leading-tight mt-0.5">
              {isRtl ? "تواصل مع المدير" : "Contact your administrator"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Non-admin with exactly one activity: show static badge (no switcher needed)
  if (!isAdmin && userActivities.length === 1) {
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
          <div className="flex-1 min-w-0 text-right">
            <p className={cn("text-[11px] font-semibold truncate leading-none", c.text)}>
              {isRtl ? act.nameAr : act.nameEn}
            </p>
            {(act.companyNameAr || act.companyNameEn) && (
              <p className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">
                {isRtl ? (act.companyNameAr || act.companyNameEn) : (act.companyNameEn || act.companyNameAr)}
              </p>
            )}
          </div>
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
          {activeActivity ? (isRtl ? activeActivity.nameAr : activeActivity.nameEn) : (isRtl ? "جميع الأنشطة" : "All Activities")}
        </p>

        <ChevronDown className={cn(
          "w-3 h-3 shrink-0 transition-transform duration-200 text-sidebar-foreground/40",
          open && "rotate-180"
        )} />
      </button>

      {/* ── Dropdown: 2-step (company → activity) ───────────── */}
      {open && (() => {
        // Build company groups from the user's accessible activities.
        type Group = { id: string; label: string; items: typeof userActivities };
        const groupMap = new Map<string, Group>();
        for (const a of userActivities) {
          const id = a.companyId == null ? "__none__" : `c:${a.companyId}`;
          const label =
            (isRtl ? (a.companyNameAr || a.companyNameEn) : (a.companyNameEn || a.companyNameAr)) ||
            (isRtl ? "بدون شركة" : "Unassigned");
          if (!groupMap.has(id)) groupMap.set(id, { id, label, items: [] });
          groupMap.get(id)!.items.push(a);
        }
        const collator = new Intl.Collator(isRtl ? "ar" : "en", { sensitivity: "base" });
        const groups = Array.from(groupMap.values()).sort((x, y) => collator.compare(x.label, y.label));
        for (const g of groups) {
          g.items.sort((p, q) => collator.compare(isRtl ? p.nameAr : p.nameEn, isRtl ? q.nameAr : q.nameEn));
        }

        const drilled = drillCompanyId ? groups.find((g) => g.id === drillCompanyId) : null;
        const BackIcon = isRtl ? ArrowRight : ArrowLeft;

        return (
          <div className="mt-1 rounded-xl border border-sidebar-border/70 overflow-hidden shadow-xl bg-sidebar/95 backdrop-blur-sm max-h-[60vh] overflow-y-auto">
            {/* ── Step 1: company list ─────────────────────────────── */}
            {!drilled && (
              <>
                <div className="px-3 pt-2.5 pb-1.5 flex items-center gap-2 border-b border-sidebar-border/40">
                  <Building2 className="w-3.5 h-3.5 text-sidebar-foreground/50 shrink-0" />
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-sidebar-foreground/60">
                    {isRtl ? "اختر الشركة" : "Choose Company"}
                  </p>
                </div>

                {/* "All Activities" — admins only */}
                {isAdmin && (
                  <button
                    onClick={() => { setActiveActivity(null); setOpen(false); setDrillCompanyId(null); }}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 transition-colors",
                      isRtl ? "text-right" : "text-left",
                      !activeActivity
                        ? "bg-sidebar-accent text-sidebar-foreground"
                        : "hover:bg-sidebar-accent/60 text-sidebar-foreground/70"
                    )}
                  >
                    <div className="w-6 h-6 rounded-md bg-sidebar-accent/80 flex items-center justify-center shrink-0">
                      <Layers className="w-3.5 h-3.5 text-sidebar-foreground/60" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{isRtl ? "جميع الأنشطة" : "All Activities"}</p>
                      <p className="text-[10px] text-sidebar-foreground/40 truncate">{isRtl ? "بدون تصفية" : "No filter"}</p>
                    </div>
                    {!activeActivity && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                  </button>
                )}

                {isAdmin && groups.length > 0 && <div className="h-px bg-sidebar-border/40 mx-2.5" />}

                {groups.length === 0 ? (
                  <p className="px-3 py-3 text-[11px] text-center text-sidebar-foreground/50">
                    {isRtl ? "لا توجد شركات متاحة" : "No companies available"}
                  </p>
                ) : (
                  groups.map((group) => {
                    const containsActive = activeActivity && group.items.some((a) => a.id === activeActivity.id);
                    return (
                      <button
                        key={group.id}
                        onClick={() => setDrillCompanyId(group.id)}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-3 py-2 transition-colors hover:bg-sidebar-accent/60",
                          isRtl ? "text-right" : "text-left",
                          containsActive ? "bg-sidebar-accent/40" : ""
                        )}
                        data-testid={`company-option-${group.id}`}
                      >
                        <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                          <Building2 className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate text-sidebar-foreground">{group.label}</p>
                          <p className="text-[10px] text-sidebar-foreground/50 truncate">
                            {group.items.length} {isRtl ? "نشاط" : group.items.length === 1 ? "activity" : "activities"}
                          </p>
                        </div>
                        <ChevronDown className={cn("w-3 h-3 text-sidebar-foreground/40 shrink-0", isRtl ? "rotate-90" : "-rotate-90")} />
                      </button>
                    );
                  })
                )}
              </>
            )}

            {/* ── Step 2: activities of the selected company ──────── */}
            {drilled && (
              <>
                <div className="px-2 pt-2 pb-1.5 flex items-center gap-1.5 border-b border-sidebar-border/40">
                  <button
                    onClick={() => setDrillCompanyId(null)}
                    className="p-1 rounded-md hover:bg-sidebar-accent/60 text-sidebar-foreground/70 shrink-0"
                    aria-label={isRtl ? "رجوع" : "Back"}
                    data-testid="company-back"
                  >
                    <BackIcon className="w-3.5 h-3.5" />
                  </button>
                  <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                  <p className="text-[11px] font-semibold tracking-wide text-sidebar-foreground/80 truncate">
                    {drilled.label}
                  </p>
                </div>

                {drilled.items.map((activity) => {
                  const c = ACTIVITY_COLOR_MAP[activity.color as ActivityColor];
                  const isSelected = activeActivity?.id === activity.id;
                  return (
                    <button
                      key={activity.id}
                      data-testid={`activity-option-${activity.id}`}
                      aria-label={`${isRtl ? activity.nameAr : activity.nameEn} — ${drilled.label}`}
                      onClick={() => { setActiveActivity(activity); setOpen(false); setDrillCompanyId(null); }}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 transition-colors",
                        isRtl ? "text-right" : "text-left",
                        isSelected ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/50"
                      )}
                    >
                      <div className={cn("w-6 h-6 rounded-md flex items-center justify-center shrink-0", c.badge)}>
                        <ActivityIcon name={activity.icon} className={cn("w-3.5 h-3.5", c.text)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-xs font-medium truncate", isSelected ? c.text : "text-sidebar-foreground/80")}>
                          {isRtl ? activity.nameAr : activity.nameEn}
                        </p>
                      </div>
                      {isSelected && <Check className={cn("w-3.5 h-3.5 shrink-0", c.text)} />}
                    </button>
                  );
                })}
              </>
            )}
          </div>
        );
      })()}
    </div>
  );
}
