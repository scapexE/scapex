import { dbGetItem } from "@/lib/dbStorage";
import { useState, useRef, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useBusinessActivity } from "@/contexts/BusinessActivityContext";
import { ACTIVITY_COLOR_MAP, type ActivityColor } from "@/lib/activities";
import { ActivityIcon } from "@/components/ActivityIcon";
import { ChevronDown, Check, Layers, Building2 } from "lucide-react";
import type { SystemUser } from "@/lib/permissions";
import { useLanguage } from "@/contexts/LanguageContext";

type CompanyGroup = {
  id: string;
  label: string;
  items: ReturnType<typeof useBusinessActivity>["userActivities"];
};

export function ActivitySwitcher() {
  const { userActivities, activeActivity, setActiveActivity } = useBusinessActivity();
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";

  const [openCompany, setOpenCompany] = useState(false);
  const [openActivity, setOpenActivity] = useState(false);
  const companyRef = useRef<HTMLDivElement>(null);
  const activityRef = useRef<HTMLDivElement>(null);

  const currentUser: SystemUser | null = JSON.parse(dbGetItem("user") || "null");
  const isAdmin = currentUser?.role === "admin";

  // Group the user's accessible activities by company.
  const groups = useMemo<CompanyGroup[]>(() => {
    const map = new Map<string, CompanyGroup>();
    for (const a of userActivities) {
      const id = a.companyId == null ? "__none__" : `c:${a.companyId}`;
      const label =
        (isRtl ? (a.companyNameAr || a.companyNameEn) : (a.companyNameEn || a.companyNameAr)) ||
        (isRtl ? "بدون شركة" : "Unassigned");
      if (!map.has(id)) map.set(id, { id, label, items: [] });
      map.get(id)!.items.push(a);
    }
    const collator = new Intl.Collator(isRtl ? "ar" : "en", { sensitivity: "base" });
    const arr = Array.from(map.values()).sort((x, y) => collator.compare(x.label, y.label));
    for (const g of arr) {
      g.items.sort((p, q) => collator.compare(isRtl ? p.nameAr : p.nameEn, isRtl ? q.nameAr : q.nameEn));
    }
    return arr;
  }, [userActivities, isRtl]);

  // Active company derived from active activity.
  const activeCompanyId = activeActivity?.companyId == null
    ? (activeActivity ? "__none__" : null)
    : `c:${activeActivity.companyId}`;
  const activeGroup = activeCompanyId ? groups.find((g) => g.id === activeCompanyId) : null;
  const activitiesInActiveCompany = activeGroup?.items ?? [];

  // Auto-pick first available activity if nothing is selected yet.
  useEffect(() => {
    if (isAdmin) return;
    if (activeActivity) return;
    if (groups.length === 0) return;
    const first = groups[0].items[0];
    if (first) setActiveActivity(first);
  }, [isAdmin, activeActivity, groups, setActiveActivity]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (companyRef.current && !companyRef.current.contains(e.target as Node)) setOpenCompany(false);
      if (activityRef.current && !activityRef.current.contains(e.target as Node)) setOpenActivity(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Empty state ─────────────────────────────────────
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

  const showCompanyDropdown = isAdmin || groups.length > 1;
  const showActivityDropdown = isAdmin || activitiesInActiveCompany.length > 1;

  // ── Static badge: exactly one company AND one activity (no choice to make) ──
  if (!isAdmin && !showCompanyDropdown && !showActivityDropdown && activeActivity) {
    const c = ACTIVITY_COLOR_MAP[activeActivity.color as ActivityColor];
    return (
      <div className="px-3 mb-1.5" data-testid="activity-switcher-static">
        <div className={cn("w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg border", c.border, c.bg)}>
          <div className={cn("w-5 h-5 rounded-md flex items-center justify-center shrink-0", c.badge)}>
            <ActivityIcon name={activeActivity.icon} className={cn("w-3 h-3", c.text)} />
          </div>
          <div className="flex-1 min-w-0 text-right">
            <p className={cn("text-[11px] font-semibold truncate leading-none", c.text)}>
              {isRtl ? activeActivity.nameAr : activeActivity.nameEn}
            </p>
            {(activeActivity.companyNameAr || activeActivity.companyNameEn) && (
              <p className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">
                {isRtl ? (activeActivity.companyNameAr || activeActivity.companyNameEn) : (activeActivity.companyNameEn || activeActivity.companyNameAr)}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const colors = activeActivity ? ACTIVITY_COLOR_MAP[activeActivity.color as ActivityColor] : null;
  const activeCompanyLabel = activeGroup?.label ?? (isAdmin ? (isRtl ? "كل الشركات" : "All Companies") : (isRtl ? "اختر شركة" : "Choose company"));

  // Switching company → auto-select that company's first activity.
  const pickCompany = (g: CompanyGroup | null) => {
    setOpenCompany(false);
    if (!g) {
      // "All companies" — admins only
      setActiveActivity(null);
      return;
    }
    if (g.items.length > 0) setActiveActivity(g.items[0]);
  };

  return (
    <div className="px-3 mb-1.5 space-y-1.5">
      {/* ── Company dropdown ─────────────────────────────── */}
      {showCompanyDropdown && (
        <div ref={companyRef} className="relative">
          <button
            data-testid="company-switcher-trigger"
            onClick={() => { setOpenCompany((v) => !v); setOpenActivity(false); }}
            className={cn(
              "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all duration-200",
              "border-sidebar-border/50 bg-sidebar-accent/30 hover:bg-sidebar-accent/60"
            )}
          >
            <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 bg-primary/10">
              <Building2 className="w-3 h-3 text-primary" />
            </div>
            <p className="flex-1 text-right text-[11px] font-semibold truncate leading-none text-sidebar-foreground">
              {activeCompanyLabel}
            </p>
            <ChevronDown className={cn("w-3 h-3 shrink-0 transition-transform duration-200 text-sidebar-foreground/40", openCompany && "rotate-180")} />
          </button>
          {openCompany && (
            <div className="absolute z-30 left-0 right-0 mt-1 rounded-xl border border-sidebar-border/70 overflow-hidden shadow-xl bg-sidebar/95 backdrop-blur-sm max-h-[60vh] overflow-y-auto">
              {isAdmin && (
                <button
                  onClick={() => pickCompany(null)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 transition-colors",
                    isRtl ? "text-right" : "text-left",
                    !activeActivity ? "bg-sidebar-accent text-sidebar-foreground" : "hover:bg-sidebar-accent/60 text-sidebar-foreground/70"
                  )}
                >
                  <div className="w-6 h-6 rounded-md bg-sidebar-accent/80 flex items-center justify-center shrink-0">
                    <Layers className="w-3.5 h-3.5 text-sidebar-foreground/60" />
                  </div>
                  <p className="flex-1 text-xs font-medium truncate">{isRtl ? "كل الشركات" : "All Companies"}</p>
                  {!activeActivity && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                </button>
              )}
              {isAdmin && groups.length > 0 && <div className="h-px bg-sidebar-border/40 mx-2.5" />}
              {groups.map((g) => {
                const isSelected = g.id === activeCompanyId;
                return (
                  <button
                    key={g.id}
                    data-testid={`company-option-${g.id}`}
                    onClick={() => pickCompany(g)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 transition-colors",
                      isRtl ? "text-right" : "text-left",
                      isSelected ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/50"
                    )}
                  >
                    <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <Building2 className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate text-sidebar-foreground">{g.label}</p>
                      <p className="text-[10px] text-sidebar-foreground/50 truncate">
                        {g.items.length} {isRtl ? "نشاط" : g.items.length === 1 ? "activity" : "activities"}
                      </p>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                  </button>
                );
              })}
              {groups.length === 0 && (
                <p className="px-3 py-3 text-[11px] text-center text-sidebar-foreground/50">
                  {isRtl ? "لا توجد شركات متاحة" : "No companies available"}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Activity dropdown ────────────────────────────── */}
      {showActivityDropdown && (
        <div ref={activityRef} className="relative">
          <button
            data-testid="activity-switcher-trigger"
            onClick={() => { setOpenActivity((v) => !v); setOpenCompany(false); }}
            className={cn(
              "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all duration-200",
              activeActivity && colors ? cn(colors.border, colors.bg) : "border-sidebar-border/50 bg-sidebar-accent/30 hover:bg-sidebar-accent/60"
            )}
          >
            <div className={cn("w-5 h-5 rounded-md flex items-center justify-center shrink-0", activeActivity && colors ? colors.badge : "bg-sidebar-accent/70")}>
              <ActivityIcon name={activeActivity?.icon ?? "Layers"} className={cn("w-3 h-3", activeActivity && colors ? colors.text : "text-sidebar-foreground/50")} />
            </div>
            <p className={cn("flex-1 text-right text-[11px] font-semibold truncate leading-none", activeActivity && colors ? colors.text : "text-sidebar-foreground/50")}>
              {activeActivity ? (isRtl ? activeActivity.nameAr : activeActivity.nameEn) : (isRtl ? "اختر نشاطاً" : "Choose activity")}
            </p>
            <ChevronDown className={cn("w-3 h-3 shrink-0 transition-transform duration-200 text-sidebar-foreground/40", openActivity && "rotate-180")} />
          </button>
          {openActivity && (
            <div className="absolute z-30 left-0 right-0 mt-1 rounded-xl border border-sidebar-border/70 overflow-hidden shadow-xl bg-sidebar/95 backdrop-blur-sm max-h-[60vh] overflow-y-auto">
              {(isAdmin && !activeGroup ? userActivities : activitiesInActiveCompany).map((activity) => {
                const c = ACTIVITY_COLOR_MAP[activity.color as ActivityColor];
                const isSelected = activeActivity?.id === activity.id;
                return (
                  <button
                    key={activity.id}
                    data-testid={`activity-option-${activity.id}`}
                    onClick={() => { setActiveActivity(activity); setOpenActivity(false); }}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 transition-colors",
                      isRtl ? "text-right" : "text-left",
                      isSelected ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/50"
                    )}
                  >
                    <div className={cn("w-6 h-6 rounded-md flex items-center justify-center shrink-0", c.badge)}>
                      <ActivityIcon name={activity.icon} className={cn("w-3.5 h-3.5", c.text)} />
                    </div>
                    <p className={cn("flex-1 text-xs font-medium truncate", isSelected ? c.text : "text-sidebar-foreground/80")}>
                      {isRtl ? activity.nameAr : activity.nameEn}
                    </p>
                    {isSelected && <Check className={cn("w-3.5 h-3.5 shrink-0", c.text)} />}
                  </button>
                );
              })}
              {(isAdmin && !activeGroup ? userActivities : activitiesInActiveCompany).length === 0 && (
                <p className="px-3 py-3 text-[11px] text-center text-sidebar-foreground/50">
                  {isRtl ? "لا توجد أنشطة" : "No activities"}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
