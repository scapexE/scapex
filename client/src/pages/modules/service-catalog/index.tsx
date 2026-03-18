import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Search, Plus, FileText, ChevronRight, Flame, Building2, HardHat,
  Leaf, ShieldAlert, RefreshCcw, Wrench, Package, Users,
  Landmark, Settings, Hammer, CheckCircle2, ArrowRight,
  FileCheck, Zap, Layers,
} from "lucide-react";
import { SERVICE_META } from "@/lib/proposals";
import { ALL_SUB_SERVICES, SUB_SERVICES_BY_TYPE, type SubService } from "@/lib/sub-services";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Flame, Building2, HardHat, Leaf, ShieldAlert, RefreshCcw,
  Wrench, Package, Users, Landmark, Settings, Hammer, Layers,
  WrenchIcon: Wrench, FileCheck, Zap,
  Construction: Hammer, Trees: Leaf,
};

const SERVICE_TYPES = Object.entries(SERVICE_META).map(([id, meta]) => ({ id, ...meta }));

const ACTIVITY_COLORS: Record<string, string> = {
  blue: "from-blue-500/10 to-blue-500/5 border-blue-200/60 dark:border-blue-800/40",
  emerald: "from-emerald-500/10 to-emerald-500/5 border-emerald-200/60 dark:border-emerald-800/40",
  amber: "from-amber-500/10 to-amber-500/5 border-amber-200/60 dark:border-amber-800/40",
  orange: "from-orange-500/10 to-orange-500/5 border-orange-200/60 dark:border-orange-800/40",
  violet: "from-violet-500/10 to-violet-500/5 border-violet-200/60 dark:border-violet-800/40",
  teal: "from-teal-500/10 to-teal-500/5 border-teal-200/60 dark:border-teal-800/40",
  red: "from-red-500/10 to-red-500/5 border-red-200/60 dark:border-red-800/40",
  green: "from-green-500/10 to-green-500/5 border-green-200/60 dark:border-green-800/40",
  slate: "from-slate-500/10 to-slate-500/5 border-slate-200/60 dark:border-slate-800/40",
};

const BADGE_COLORS: Record<string, string> = {
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  orange: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  violet: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  teal: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
};

function SubServiceCard({ sub, isRtl, onCreateProposal }: {
  sub: SubService; isRtl: boolean; onCreateProposal: (sub: SubService) => void;
}) {
  const Icon = ICON_MAP[sub.icon] ?? FileText;
  const totalBase = sub.items.reduce((s, i) => s + i.total, 0);

  return (
    <Card className={cn(
      "border bg-gradient-to-br transition-all hover:shadow-md hover:-translate-y-0.5 cursor-default group",
      ACTIVITY_COLORS[sub.color] ?? ACTIVITY_COLORS.slate
    )}>
      <CardHeader className="p-4 pb-3">
        <div className="flex items-start gap-3">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0", `bg-${sub.color}-500`)}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm leading-tight">
              {isRtl ? sub.labelAr : sub.labelEn}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 leading-snug line-clamp-2">
              {isRtl ? sub.descAr : sub.descEn}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0 space-y-3">
        {/* Items preview */}
        <div className="space-y-1">
          {sub.items.slice(0, 3).map((item, i) => (
            <div key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0 text-emerald-500" />
              <span className="line-clamp-1">{isRtl ? item.descAr : item.descEn}</span>
            </div>
          ))}
          {sub.items.length > 3 && (
            <p className="text-xs text-muted-foreground ps-5">
              {isRtl ? `+${sub.items.length - 3} بنود أخرى` : `+${sub.items.length - 3} more items`}
            </p>
          )}
        </div>

        <Separator className="opacity-50" />

        {/* Pricing & meta */}
        <div className="flex items-center justify-between text-xs">
          <div>
            <p className="text-muted-foreground">{isRtl ? "تكلفة تقديرية ابتداءً من" : "Estimated from"}</p>
            <p className="font-bold text-primary">{totalBase.toLocaleString()} {isRtl ? "ر.س" : "SAR"}</p>
          </div>
          <div className={cn("text-[10px] px-2 py-0.5 rounded-full", BADGE_COLORS[sub.color] ?? BADGE_COLORS.slate)}>
            {isRtl ? `هامش ${sub.estimatedMargin}%` : `${sub.estimatedMargin}% margin`}
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          {sub.tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary/70 text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>

        {/* Action */}
        <Button
          size="sm"
          className="w-full gap-1.5 h-8 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => onCreateProposal(sub)}
          data-testid={`button-create-proposal-${sub.id}`}
        >
          <Plus className="w-3.5 h-3.5" />
          {isRtl ? "إنشاء عرض سعر" : "Create Proposal"}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function ServiceCatalogModule() {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);
  const [view, setView] = useState<"activities" | "all">("activities");

  const filteredSubs = ALL_SUB_SERVICES.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      s.labelAr.includes(q) || s.labelEn.toLowerCase().includes(q) ||
      s.descAr.includes(q) || s.descEn.toLowerCase().includes(q) ||
      s.tags.some(t => t.toLowerCase().includes(q));
    const matchActivity = !selectedActivity || s.serviceType === selectedActivity;
    return matchSearch && matchActivity;
  });

  const handleCreateProposal = (sub: SubService) => {
    try {
      localStorage.setItem("scapex_proposal_sub", JSON.stringify({
        serviceType: sub.serviceType,
        subServiceId: sub.id,
        subServiceLabelAr: sub.labelAr,
        subServiceLabelEn: sub.labelEn,
      }));
    } catch {}
    navigate("/smart-proposal");
  };

  return (
    <MainLayout>
      <div className="flex flex-col h-[calc(100vh-6rem)] gap-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Zap className="w-6 h-6 text-primary" />
              {isRtl ? "كتالوج الخدمات" : "Service Catalog"}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {isRtl
                ? `${ALL_SUB_SERVICES.length} خدمة متخصصة — اضغط على أي خدمة لإنشاء عرض سعر فوري`
                : `${ALL_SUB_SERVICES.length} specialized services — click any service to create an instant proposal`}
            </p>
          </div>
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90 gap-1.5"
            onClick={() => navigate("/smart-proposal")}
          >
            <Plus className="w-4 h-4" />
            {isRtl ? "عرض سعر مخصص" : "Custom Proposal"}
          </Button>
        </div>

        {/* Search & Filter */}
        <div className="flex gap-3 items-center shrink-0">
          <div className="relative flex-1 max-w-md">
            <Search className={cn("absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground", isRtl ? "right-3" : "left-3")} />
            <Input
              placeholder={isRtl ? "بحث في الخدمات..." : "Search services..."}
              className={cn("h-9 bg-secondary/50 border-0", isRtl ? "pr-9" : "pl-9")}
              value={search}
              onChange={e => setSearch(e.target.value)}
              data-testid="input-search-services"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-0.5">
            <Button
              size="sm"
              variant={!selectedActivity ? "default" : "outline"}
              className="h-8 text-xs shrink-0"
              onClick={() => setSelectedActivity(null)}
            >
              {isRtl ? "الكل" : "All"}
            </Button>
            {SERVICE_TYPES.filter(s => SUB_SERVICES_BY_TYPE[s.id as keyof typeof SUB_SERVICES_BY_TYPE]?.length).map(svc => {
              const Icon = ICON_MAP[svc.iconName] ?? FileText;
              const isSelected = selectedActivity === svc.id;
              return (
                <Button
                  key={svc.id}
                  size="sm"
                  variant={isSelected ? "default" : "outline"}
                  className={cn("h-8 text-xs gap-1.5 shrink-0", !isSelected && "border-border/50")}
                  onClick={() => setSelectedActivity(isSelected ? null : svc.id)}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {isRtl ? svc.labelAr : svc.labelEn}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto space-y-8 pb-6">
          {search || selectedActivity ? (
            /* Search / Filter Results */
            <div>
              <p className="text-xs text-muted-foreground mb-4">
                {isRtl ? `${filteredSubs.length} نتيجة` : `${filteredSubs.length} results`}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSubs.map(sub => (
                  <SubServiceCard key={sub.id} sub={sub} isRtl={isRtl} onCreateProposal={handleCreateProposal} />
                ))}
                {filteredSubs.length === 0 && (
                  <div className="col-span-3 text-center py-16 text-muted-foreground">
                    <Search className="w-12 h-12 mb-3 mx-auto opacity-20" />
                    <p>{isRtl ? "لا توجد خدمات مطابقة" : "No services match your search"}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Activities Grouped View */
            <>
              {/* ── Safety Services ── */}
              <ActivitySection
                activityId="safety_services"
                isRtl={isRtl}
                onCreateProposal={handleCreateProposal}
                onViewAll={() => { setSelectedActivity("safety_services"); }}
              />

              {/* ── Contracting ── */}
              <ActivitySection
                activityId="contracting"
                isRtl={isRtl}
                onCreateProposal={handleCreateProposal}
                onViewAll={() => { setSelectedActivity("contracting"); }}
              />

              {/* ── Other Activities (core services only) ── */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <HardHat className="w-5 h-5 text-muted-foreground" />
                    {isRtl ? "الأنشطة الأخرى" : "Other Activities"}
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {SERVICE_TYPES.filter(s => !SUB_SERVICES_BY_TYPE[s.id as keyof typeof SUB_SERVICES_BY_TYPE]?.length).map(svc => {
                    const Icon = ICON_MAP[svc.iconName] ?? FileText;
                    return (
                      <Card
                        key={svc.id}
                        className={cn("border bg-gradient-to-br cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5 group", ACTIVITY_COLORS[svc.color])}
                        onClick={() => navigate("/smart-proposal")}
                      >
                        <CardContent className="p-5">
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white mb-3", `bg-${svc.color}-500`)}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <h3 className="font-semibold text-sm">{isRtl ? svc.labelAr : svc.labelEn}</h3>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{isRtl ? svc.descAr : svc.descEn}</p>
                          <Button size="sm" variant="ghost" className="w-full mt-3 h-7 text-xs gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Plus className="w-3 h-3" />
                            {isRtl ? "عرض سعر" : "New Proposal"}
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

// ── Activity Section Component ──────────────────────────────────────────────

function ActivitySection({ activityId, isRtl, onCreateProposal, onViewAll }: {
  activityId: string;
  isRtl: boolean;
  onCreateProposal: (sub: SubService) => void;
  onViewAll: () => void;
}) {
  const subs = SUB_SERVICES_BY_TYPE[activityId as keyof typeof SUB_SERVICES_BY_TYPE] ?? [];
  const svc = SERVICE_META[activityId as keyof typeof SERVICE_META];
  if (!subs.length || !svc) return null;

  const Icon = ICON_MAP[svc.iconName] ?? FileText;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0", `bg-${svc.color}-500`)}>
            <Icon className="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">{isRtl ? svc.labelAr : svc.labelEn}</h2>
            <p className="text-xs text-muted-foreground">{isRtl ? svc.descAr : svc.descEn}</p>
          </div>
          <Badge variant="secondary" className="text-xs">{subs.length} {isRtl ? "خدمة" : "services"}</Badge>
        </div>
        <Button size="sm" variant="ghost" className="gap-1 text-xs text-muted-foreground" onClick={onViewAll}>
          {isRtl ? "عرض الكل" : "View All"}
          <ChevronRight className={cn("w-3.5 h-3.5", isRtl ? "rotate-180" : "")} />
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {subs.map(sub => (
          <SubServiceCard key={sub.id} sub={sub} isRtl={isRtl} onCreateProposal={onCreateProposal} />
        ))}
      </div>
    </div>
  );
}
