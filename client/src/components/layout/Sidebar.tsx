import { dbGetItem, dbRemoveItem } from "@/lib/dbStorage";
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { getSystemSettings, type SystemSettings, DEFAULT_SYSTEM_SETTINGS } from "@/lib/companySettings";
import {
  LayoutDashboard, Smartphone, CalendarCheck,
  Settings, ShieldAlert, BarChart3, BrainCircuit,
  ShoppingBag, Truck, Calculator, Package, Building2,
  Globe2, HardDrive, LogOut, UserCog, Info,
  FolderOpen, SlidersHorizontal, UserRound, Wallet,
  Wrench, ScrollText, FolderKanban, ChevronLeft, ChevronRight, X, Users2,
  GripVertical, Check,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type SystemUser, ROLE_LABELS, ROLE_DEFAULTS } from "@/lib/permissions";
import { logAction } from "@/lib/auditLog";
import { useActiveRole } from "@/contexts/ActiveRoleContext";
import { useBusinessActivity } from "@/contexts/BusinessActivityContext";
import { ActivitySwitcher } from "./ActivitySwitcher";

const menuCategories = [
  {
    id: "core",
    labelAr: "الرئيسية",
    labelEn: "Core",
    items: [
      { id: "dashboard",        icon: LayoutDashboard,    path: "/dashboard" },
      { id: "ai_control",       icon: BrainCircuit,       path: "/ai-control" },
      { id: "bi",               icon: BarChart3,           path: "/bi" },
      { id: "multi_tenant",     icon: Building2,           path: "/companies" },
      { id: "company_settings", icon: SlidersHorizontal,  path: "/company-settings" },
    ],
  },
  {
    id: "business",
    labelAr: "الأعمال والمبيعات",
    labelEn: "Business",
    items: [
      { id: "crm",        icon: Users2,      path: "/crm" },
      { id: "sales",      icon: ShoppingBag, path: "/sales" },
      { id: "purchases",  icon: Truck,       path: "/purchases" },
      { id: "accounting", icon: Calculator,  path: "/accounting" },
    ],
  },
  {
    id: "operations",
    labelAr: "العمليات",
    labelEn: "Operations",
    items: [
      { id: "projects",   icon: FolderKanban, path: "/projects" },
      { id: "inventory",  icon: Package,       path: "/inventory" },
      { id: "equipment",  icon: Wrench,        path: "/equipment" },
    ],
  },
  {
    id: "hr",
    labelAr: "الموارد البشرية",
    labelEn: "Human Resources",
    items: [
      { id: "hr",         icon: UserRound,     path: "/hr" },
      { id: "payroll",    icon: Wallet,        path: "/payroll" },
      { id: "attendance", icon: CalendarCheck, path: "/attendance" },
      { id: "mobile_app", icon: Smartphone,    path: "/mobile-app" },
      { id: "hse",        icon: ShieldAlert,   path: "/hse" },
    ],
  },
  {
    id: "reports",
    labelAr: "التقارير",
    labelEn: "Reports",
    items: [
      { id: "audit_log", icon: ScrollText, path: "/audit-log" },
    ],
  },
  {
    id: "system",
    labelAr: "النظام",
    labelEn: "System",
    items: [
      { id: "dms",           icon: FolderOpen, path: "/dms" },
      { id: "client_portal", icon: Globe2,     path: "/client-portal" },
      { id: "users",         icon: UserCog,    path: "/users" },
      { id: "system_admin",  icon: Settings,   path: "/system-admin" },
      { id: "backup",        icon: HardDrive,  path: "/backup" },
      { id: "about",         icon: Info,       path: "/about" },
    ],
  },
];

const NAV_LABELS: Record<string, { ar: string; en: string }> = {
  dashboard:        { ar: "لوحة التحكم",           en: "Dashboard" },
  ai_control:       { ar: "مركز الذكاء الاصطناعي", en: "AI Control" },
  bi:               { ar: "تحليلات الأعمال",         en: "BI Analytics" },
  multi_tenant:     { ar: "إدارة الشركات",           en: "Companies" },
  company_settings: { ar: "إعدادات الشركة",          en: "Company Settings" },
  crm:              { ar: "إدارة العملاء",            en: "CRM" },
  sales:            { ar: "المبيعات",                en: "Sales" },
  purchases:        { ar: "المشتريات",               en: "Purchases" },
  accounting:       { ar: "المحاسبة",                en: "Accounting" },
  projects:         { ar: "المشاريع",                en: "Projects" },
  inventory:        { ar: "المخزون",                 en: "Inventory" },
  equipment:        { ar: "الأصول والمعدات",          en: "Equipment" },
  hr:               { ar: "الموارد البشرية",          en: "HR" },
  payroll:          { ar: "الرواتب",                 en: "Payroll" },
  attendance:       { ar: "الحضور والإجازات",         en: "Attendance" },
  mobile_app:       { ar: "التطبيق الميداني",         en: "Mobile App" },
  hse:              { ar: "السلامة والصحة المهنية",   en: "HSE" },
  audit_log:        { ar: "سجل النشاطات",             en: "Audit Log" },
  dms:              { ar: "إدارة الوثائق",            en: "DMS" },
  client_portal:    { ar: "بوابة العملاء",            en: "Client Portal" },
  users:            { ar: "المستخدمون",               en: "Users" },
  system_admin:     { ar: "إعدادات النظام",            en: "System Admin" },
  backup:           { ar: "النسخ الاحتياطي",           en: "Backup" },
  about:            { ar: "عن النظام",                en: "About" },
};

const SIDEBAR_ORDER_KEY = "scapex_sidebar_order";

function readOrder(): string[] {
  try {
    const r = localStorage.getItem(SIDEBAR_ORDER_KEY);
    return r ? (JSON.parse(r) as string[]) : [];
  } catch { return []; }
}

interface SidebarProps {
  isOpen?: boolean;
  setIsOpen?: (v: boolean) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isHidden?: boolean;
  onHide?: () => void;
}

function BrandIcon({ size }: { size: number }) {
  const settings = getSystemSettings();
  if (settings.brandLogo) {
    return (
      <img
        src={settings.brandLogo}
        alt={settings.brandName || "Logo"}
        style={{ width: size, height: size, borderRadius: 8, objectFit: "contain", background: "transparent" }}
        className="shrink-0"
      />
    );
  }
  const letter = (settings.brandName || "S").charAt(0).toUpperCase();
  return (
    <div
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.3) }}
      className="bg-primary flex items-center justify-center shrink-0 shadow-sm"
    >
      <span className="text-white font-black" style={{ fontSize: Math.round(size * 0.52) }}>{letter}</span>
    </div>
  );
}

export function Sidebar({
  isOpen, setIsOpen,
  isCollapsed = false, onToggleCollapse,
  isHidden = false, onHide,
}: SidebarProps) {
  const [location] = useLocation();
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";

  const currentUser: SystemUser | null = JSON.parse(dbGetItem("user") || "null");
  const { activeRole, isMultiRole } = useActiveRole();
  const { activeActivity } = useBusinessActivity();

  const [brandSettings, setBrandSettings] = useState<SystemSettings>(getSystemSettings);
  const [pendingUsersCount, setPendingUsersCount] = useState(0);
  const isAdmin =
    currentUser?.role === "admin" ||
    (currentUser?.roles as string[] | undefined)?.includes("admin");

  useEffect(() => {
    if (!isAdmin) return;
    const load = () => {
      const uid = (currentUser as any)?.id;
      const token = localStorage.getItem("session_token") || "";
      if (!uid || !token) return;
      fetch("/api/users/pending-count", {
        headers: { "x-user-id": String(uid), "x-session-token": token },
      })
        .then(r => r.ok ? r.json() : { count: 0 })
        .then(d => setPendingUsersCount(Number(d.count) || 0))
        .catch(() => {});
    };
    load();
    const timer = setInterval(load, 60_000);
    return () => clearInterval(timer);
  }, [isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onBrandUpdate = () => setBrandSettings(getSystemSettings());
    window.addEventListener("scapex_system_settings_update", onBrandUpdate);
    return () => window.removeEventListener("scapex_system_settings_update", onBrandUpdate);
  }, []);

  const [itemOrder, setItemOrder] = useState<string[]>(readOrder);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const saveOrder = (newOrder: string[]) => {
    setItemOrder(newOrder);
    try { localStorage.setItem(SIDEBAR_ORDER_KEY, JSON.stringify(newOrder)); } catch {}
  };

  const handleLogout = () => {
    logAction("logout", "auth", `User ${currentUser?.name} logged out`, `المستخدم ${currentUser?.name} سجّل خروج`);
    dbRemoveItem("user");
    localStorage.removeItem("session_token");
    sessionStorage.removeItem("activeRole");
    window.location.href = "/";
  };

  const userPerms = currentUser?.permissions || [];
  const roleFilteredPerms = isMultiRole && activeRole
    ? userPerms.filter(p => ROLE_DEFAULTS[activeRole as keyof typeof ROLE_DEFAULTS]?.includes(p))
    : userPerms;
  const effectivePerms = activeActivity
    ? roleFilteredPerms.filter(p => activeActivity.modules.includes(p))
    : roleFilteredPerms;

  const visibleCategories = menuCategories.map(cat => ({
    ...cat,
    items: cat.items.filter(item => {
      if (!currentUser) return false;
      if (item.id === "about" || item.id === "audit_log") return true;
      if (item.id === "system_admin" || item.id === "backup") {
        const roles = new Set<string>([currentUser.role || "", ...((currentUser.roles as string[]) || [])]);
        return roles.has("admin") || roles.has("manager");
      }
      if (item.id === "multi_tenant" || item.id === "client_portal") {
        const roles = new Set<string>([currentUser.role || "", ...((currentUser.roles as string[]) || [])]);
        return roles.has("admin");
      }
      if (currentUser.role === "admin") return true;
      if (item.id === "users") {
        return effectivePerms.includes("users") || userPerms.includes("approve_registrations");
      }
      return effectivePerms.includes(item.id);
    }),
  })).filter(cat => cat.items.length > 0);

  const allVisibleItems = visibleCategories.flatMap(c => c.items);

  const sortedAllItems = [...allVisibleItems].sort((a, b) => {
    const ai = itemOrder.indexOf(a.id);
    const bi = itemOrder.indexOf(b.id);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  const sortedCategories = visibleCategories
    .map(cat => ({
      ...cat,
      items: [...cat.items].sort((a, b) => {
        const ai = itemOrder.indexOf(a.id);
        const bi = itemOrder.indexOf(b.id);
        if (ai === -1 && bi === -1) return 0;
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      }),
    }))
    .sort((a, b) => {
      const fa = a.items[0] ? itemOrder.indexOf(a.items[0].id) : 9999;
      const fb = b.items[0] ? itemOrder.indexOf(b.items[0].id) : 9999;
      return (fa < 0 ? 9999 : fa) - (fb < 0 ? 9999 : fb);
    });

  const label = (id: string) =>
    isRtl ? (NAV_LABELS[id]?.ar || id) : (NAV_LABELS[id]?.en || id);

  const CollapseIcon = isRtl
    ? isCollapsed ? ChevronLeft : ChevronRight
    : isCollapsed ? ChevronRight : ChevronLeft;

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverId !== id) setDragOverId(id);
  };
  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!dragId || dragId === targetId) { setDragId(null); setDragOverId(null); return; }
    const base = sortedAllItems.map(i => i.id);
    const from = base.indexOf(dragId);
    const to = base.indexOf(targetId);
    if (from === -1 || to === -1) return;
    const next = [...base];
    next.splice(from, 1);
    next.splice(to, 0, dragId);
    saveOrder(next);
    setDragId(null);
    setDragOverId(null);
  };
  const handleDragEnd = () => { setDragId(null); setDragOverId(null); };

  const renderNavItem = (item: typeof allVisibleItems[number]) => {
    const isActive =
      location === item.path ||
      (item.path !== "/dashboard" && location.startsWith(item.path));
    const Icon = item.icon;
    const showUsersBadge = item.id === "users" && pendingUsersCount > 0;

    const inner = (
      <div
        className={cn(
          "flex items-center rounded-lg transition-all duration-150 cursor-pointer group",
          isCollapsed
            ? "relative justify-center w-9 h-9 mx-auto"
            : "gap-2.5 px-2.5 py-1.5",
          isActive
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-foreground",
        )}
        onClick={() => setIsOpen?.(false)}
      >
        <Icon
          className={cn(
            "shrink-0 transition-colors",
            isActive
              ? "text-primary-foreground"
              : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground",
          )}
          style={{ width: isCollapsed ? 18 : 16, height: isCollapsed ? 18 : 16 }}
        />
        {isCollapsed && showUsersBadge && (
          <span className="absolute top-1 end-1 w-2 h-2 rounded-full bg-amber-500 border border-sidebar ring-1 ring-sidebar" />
        )}
        {!isCollapsed && (
          <>
            <span className="text-sm font-medium leading-none flex-1">{label(item.id)}</span>
            {showUsersBadge && (
              <span className="ms-auto text-[10px] font-bold leading-none bg-amber-500 text-white rounded-full px-1.5 py-0.5 min-w-[18px] text-center tabular-nums">
                {pendingUsersCount}
              </span>
            )}
          </>
        )}
      </div>
    );

    const linked = (
      <Link key={item.id} href={item.path}>
        {inner}
      </Link>
    );

    if (isCollapsed) {
      return (
        <Tooltip key={item.id} delayDuration={100}>
          <TooltipTrigger asChild>{linked}</TooltipTrigger>
          <TooltipContent side={isRtl ? "left" : "right"} className="text-xs font-medium">
            {label(item.id)}
          </TooltipContent>
        </Tooltip>
      );
    }
    return linked;
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsOpen?.(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 z-50 bg-sidebar border-sidebar-border flex flex-col transition-all duration-300 ease-in-out",
          dir === "rtl" ? "right-0 border-l" : "left-0 border-r",
          isHidden
            ? "w-0 overflow-hidden"
            : cn(
                isCollapsed ? "w-14 md:w-14" : "w-64 md:w-64",
                isOpen
                  ? "translate-x-0"
                  : dir === "rtl"
                    ? "translate-x-full md:translate-x-0"
                    : "-translate-x-full md:translate-x-0",
              ),
        )}
      >
        {/* ── Header ── */}
        <div className={cn(
          "h-14 flex items-center border-b border-sidebar-border bg-sidebar-accent/20 flex-shrink-0 transition-all",
          isCollapsed ? "justify-center px-1.5 gap-0" : "justify-between px-4",
        )}>
          {!isCollapsed && (
            <div className="flex items-center gap-2.5 min-w-0">
              <BrandIcon size={28} />
              <div className="min-w-0">
                <p className="text-sidebar-foreground font-bold text-base tracking-tight leading-tight">{brandSettings.brandName || "Scapex"}</p>
                <p className="text-sidebar-foreground/40 text-[9px] leading-tight truncate">
                  {isRtl ? (brandSettings.brandSubtitleAr || "منصة إدارة الأعمال") : (brandSettings.brandSubtitleEn || "Business ERP")}
                </p>
              </div>
            </div>
          )}
          {isCollapsed && (
            <BrandIcon size={28} />
          )}

          {/* Mobile close */}
          <Button
            variant="ghost" size="icon"
            className="md:hidden text-sidebar-foreground w-7 h-7"
            onClick={() => setIsOpen?.(false)}
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Desktop controls: collapse + hide */}
          <div className={cn(
            "hidden md:flex items-center",
            isCollapsed ? "flex-col gap-1 mt-1" : "gap-0.5",
          )}>
            <Button
              variant="ghost" size="icon"
              className="w-6 h-6 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={onToggleCollapse}
              data-testid="button-sidebar-collapse"
              title={isCollapsed
                ? (isRtl ? "توسيع القائمة" : "Expand sidebar")
                : (isRtl ? "طي القائمة" : "Collapse sidebar")}
            >
              <CollapseIcon className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost" size="icon"
              className="w-6 h-6 text-sidebar-foreground/35 hover:text-destructive hover:bg-sidebar-accent"
              onClick={onHide}
              data-testid="button-sidebar-hide"
              title={isRtl ? "إخفاء القائمة" : "Hide sidebar"}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* ── Navigation ── */}
        <ScrollArea dir={dir} className="flex-1 py-2">
          <div className={cn("space-y-2", isCollapsed ? "px-1.5" : "px-2.5")}>
            {!isCollapsed && !isCustomizing && <ActivitySwitcher />}

            {isCustomizing ? (
              /* ── Customize / reorder mode ── */
              <div className="space-y-0.5">
                {!isCollapsed && (
                  <p className="px-2 pb-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-widest flex items-center gap-1">
                    <GripVertical className="w-3 h-3" />
                    {isRtl ? "اسحب لإعادة الترتيب" : "Drag to reorder"}
                  </p>
                )}
                {sortedAllItems.map(item => {
                  const Icon = item.icon;
                  const isDragging = dragId === item.id;
                  const isOver = dragOverId === item.id && dragId !== item.id;
                  return (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={e => handleDragStart(e, item.id)}
                      onDragOver={e => handleDragOver(e, item.id)}
                      onDrop={e => handleDrop(e, item.id)}
                      onDragEnd={handleDragEnd}
                      data-testid={`drag-item-${item.id}`}
                      className={cn(
                        "flex items-center rounded-lg transition-all select-none",
                        isCollapsed
                          ? "justify-center w-9 h-9 mx-auto cursor-grab active:cursor-grabbing"
                          : "gap-2 px-2 py-1.5 cursor-grab active:cursor-grabbing",
                        isDragging && "opacity-30 scale-95",
                        isOver
                          ? "ring-2 ring-primary/60 bg-primary/10"
                          : "bg-sidebar-accent/25 hover:bg-sidebar-accent/60",
                      )}
                    >
                      <GripVertical className={cn(
                        "text-sidebar-foreground/30 shrink-0",
                        isCollapsed ? "w-3 h-3" : "w-3.5 h-3.5",
                      )} />
                      <Icon
                        className="text-sidebar-foreground/55 shrink-0"
                        style={{ width: 15, height: 15 }}
                      />
                      {!isCollapsed && (
                        <span className="text-sm font-medium text-sidebar-foreground/65 flex-1 truncate">
                          {label(item.id)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* ── Normal navigation ── */
              sortedCategories.map(category => (
                <div key={category.id} className="space-y-px">
                  {!isCollapsed && (
                    <h3 className="px-2 text-[10px] font-semibold text-sidebar-foreground/35 uppercase tracking-widest mb-1">
                      {isRtl ? category.labelAr : category.labelEn}
                    </h3>
                  )}
                  {isCollapsed && <div className="h-px bg-sidebar-border/40 mx-1 mb-1" />}
                  {category.items.map(item => renderNavItem(item))}
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* ── Footer ── */}
        <div className={cn(
          "border-t border-sidebar-border flex-shrink-0",
          isCollapsed ? "p-1.5 space-y-1.5" : "p-3",
        )}>
          {/* Customize order toggle */}
          <div className={cn("mb-2", isCollapsed ? "flex justify-center" : "")}>
            {isCollapsed ? (
              <Tooltip delayDuration={100}>
                <TooltipTrigger asChild>
                  <Button
                    variant={isCustomizing ? "default" : "ghost"}
                    size="icon"
                    className={cn(
                      "w-9 h-7",
                      isCustomizing
                        ? "bg-primary text-primary-foreground"
                        : "text-sidebar-foreground/35 hover:text-sidebar-foreground",
                    )}
                    onClick={() => setIsCustomizing(v => !v)}
                    data-testid="button-sidebar-customize"
                  >
                    {isCustomizing
                      ? <Check className="w-3.5 h-3.5" />
                      : <GripVertical className="w-3.5 h-3.5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side={isRtl ? "left" : "right"} className="text-xs">
                  {isCustomizing
                    ? (isRtl ? "تم" : "Done")
                    : (isRtl ? "ترتيب القائمة" : "Reorder items")}
                </TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant={isCustomizing ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "h-7 w-full justify-start gap-1.5 px-2 text-[11px]",
                  isCustomizing
                    ? "bg-primary text-primary-foreground"
                    : "text-sidebar-foreground/40 hover:text-sidebar-foreground",
                )}
                onClick={() => setIsCustomizing(v => !v)}
                data-testid="button-sidebar-customize"
              >
                {isCustomizing
                  ? <Check className="w-3 h-3" />
                  : <GripVertical className="w-3 h-3" />}
                {isCustomizing
                  ? (isRtl ? "تم — حفظ الترتيب" : "Done — order saved")
                  : (isRtl ? "تخصيص الترتيب" : "Customize order")}
              </Button>
            )}
          </div>

          {/* User card */}
          {isCollapsed ? (
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <Link href="/profile">
                  <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center mx-auto cursor-pointer hover:bg-primary/30 transition-colors font-bold text-primary text-sm">
                    {currentUser?.name?.charAt(0).toUpperCase() ?? "?"}
                  </div>
                </Link>
              </TooltipTrigger>
              <TooltipContent side={isRtl ? "left" : "right"} className="text-xs">
                {currentUser?.name ?? "Profile"}
              </TooltipContent>
            </Tooltip>
          ) : (
            <Link href="/profile">
              <div className={cn(
                "flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-colors mb-1",
                location === "/profile"
                  ? "bg-primary/10 border border-primary/20"
                  : "bg-sidebar-accent/40 hover:bg-sidebar-accent",
              )}>
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 font-bold text-primary text-xs">
                  {currentUser?.name?.charAt(0).toUpperCase() ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-sidebar-foreground truncate leading-tight">
                    {currentUser?.name ?? "Guest"}
                  </p>
                  <p className="text-[10px] text-sidebar-foreground/45 truncate leading-tight mt-0.5">
                    {activeRole
                      ? (isRtl ? ROLE_LABELS[activeRole]?.ar : ROLE_LABELS[activeRole]?.en)
                      : currentUser
                        ? (isRtl ? ROLE_LABELS[currentUser.role]?.ar : ROLE_LABELS[currentUser.role]?.en)
                        : ""}
                    {isMultiRole && (
                      <span className="opacity-60"> · {isRtl ? "متعدد" : "Multi"}</span>
                    )}
                  </p>
                </div>
                <Button
                  variant="ghost" size="icon"
                  className="h-6 w-6 text-sidebar-foreground/40 hover:text-destructive shrink-0"
                  onClick={e => { e.preventDefault(); e.stopPropagation(); handleLogout(); }}
                  title={isRtl ? "تسجيل الخروج" : "Logout"}
                >
                  <LogOut className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Link>
          )}

          {!isCollapsed && (
            <div className="text-center text-[9px] opacity-30 text-sidebar-foreground pt-1">
              © 2026 Scapex {__APP_VERSION__}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
