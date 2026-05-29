import { dbGetItem, dbRemoveItem } from "@/lib/dbStorage";
import { Link, useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, Briefcase, Smartphone, CalendarCheck,
  Settings, ShieldAlert, FileText, BarChart3, BrainCircuit,
  ShoppingBag, Truck, Calculator, Package, Building2,
  Globe2, HardDrive, LogOut, UserCog, Info, Activity,
  FolderOpen, SlidersHorizontal, UserRound, Wallet,
  Wrench, ScrollText, FolderKanban, ChevronLeft, ChevronRight, X, Users2,
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
  dashboard:        { ar: "لوحة التحكم",          en: "Dashboard" },
  ai_control:       { ar: "مركز الذكاء الاصطناعي", en: "AI Control" },
  bi:               { ar: "تحليلات الأعمال",        en: "BI Analytics" },
  multi_tenant:     { ar: "إدارة الشركات",          en: "Companies" },
  company_settings: { ar: "إعدادات الشركة",         en: "Company Settings" },
  crm:              { ar: "إدارة العملاء",           en: "CRM" },
  sales:            { ar: "المبيعات",               en: "Sales" },
  purchases:        { ar: "المشتريات",              en: "Purchases" },
  accounting:       { ar: "المحاسبة",               en: "Accounting" },
  projects:         { ar: "المشاريع",               en: "Projects" },
  inventory:        { ar: "المخزون",                en: "Inventory" },
  equipment:        { ar: "الأصول والمعدات",         en: "Equipment" },
  hr:               { ar: "الموارد البشرية",         en: "HR" },
  payroll:          { ar: "الرواتب",                en: "Payroll" },
  attendance:       { ar: "الحضور والإجازات",        en: "Attendance" },
  mobile_app:       { ar: "التطبيق الميداني",        en: "Mobile App" },
  hse:              { ar: "السلامة والصحة المهنية",  en: "HSE" },
  audit_log:        { ar: "سجل النشاطات",            en: "Audit Log" },
  dms:              { ar: "إدارة الوثائق",           en: "DMS" },
  client_portal:    { ar: "بوابة العملاء",           en: "Client Portal" },
  users:            { ar: "المستخدمون",              en: "Users" },
  system_admin:     { ar: "إعدادات النظام",           en: "System Admin" },
  backup:           { ar: "النسخ الاحتياطي",          en: "Backup" },
  about:            { ar: "عن النظام",               en: "About" },
};

interface SidebarProps {
  isOpen?: boolean;
  setIsOpen?: (v: boolean) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({ isOpen, setIsOpen, isCollapsed = false, onToggleCollapse }: SidebarProps) {
  const [location] = useLocation();
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";

  const currentUser: SystemUser | null = JSON.parse(dbGetItem("user") || "null");
  const { activeRole, isMultiRole } = useActiveRole();
  const { activeActivity } = useBusinessActivity();

  const handleLogout = () => {
    logAction("logout", "auth", `User ${currentUser?.name} logged out`, `المستخدم ${currentUser?.name} سجّل خروج`);
    dbRemoveItem("user");
    sessionStorage.removeItem("activeRole");
    window.location.href = "/";
  };

  const userPerms = currentUser?.permissions || [];
  const roleFilteredPerms = isMultiRole && activeRole
    ? userPerms.filter((p) => ROLE_DEFAULTS[activeRole as keyof typeof ROLE_DEFAULTS]?.includes(p))
    : userPerms;
  const effectivePerms = activeActivity
    ? roleFilteredPerms.filter((p) => activeActivity.modules.includes(p))
    : roleFilteredPerms;

  const visibleCategories = menuCategories.map((cat) => ({
    ...cat,
    items: cat.items.filter((item) => {
      if (!currentUser) return false;
      if (item.id === "about" || item.id === "audit_log") return true;
      if (item.id === "system_admin" || item.id === "backup") {
        const roles = new Set<string>([currentUser.role || "", ...((currentUser.roles as string[]) || [])]);
        return roles.has("admin") || roles.has("manager");
      }
      if (item.id === "multi_tenant") {
        const roles = new Set<string>([currentUser.role || "", ...((currentUser.roles as string[]) || [])]);
        return roles.has("admin");
      }
      if (currentUser.role === "admin") return true;
      if (item.id === "users") {
        return effectivePerms.includes("users") || userPerms.includes("approve_registrations");
      }
      return effectivePerms.includes(item.id);
    }),
  })).filter((cat) => cat.items.length > 0);

  const label = (id: string) => isRtl ? (NAV_LABELS[id]?.ar || id) : (NAV_LABELS[id]?.en || id);
  const CollapseIcon = isRtl ? (isCollapsed ? ChevronLeft : ChevronRight) : (isCollapsed ? ChevronRight : ChevronLeft);

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
          isCollapsed ? "w-14 md:w-14" : "w-64 md:w-64",
          isOpen
            ? "translate-x-0"
            : dir === "rtl"
              ? "translate-x-full md:translate-x-0"
              : "-translate-x-full md:translate-x-0",
        )}
      >
        {/* Logo / Header */}
        <div className={cn(
          "h-14 flex items-center border-b border-sidebar-border bg-sidebar-accent/20 flex-shrink-0 transition-all",
          isCollapsed ? "justify-center px-2" : "justify-between px-4",
        )}>
          {!isCollapsed && (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0 shadow-sm">
                <span className="text-white font-black text-sm">S</span>
              </div>
              <div className="min-w-0">
                <p className="text-sidebar-foreground font-bold text-base tracking-tight leading-tight">Scapex</p>
                <p className="text-sidebar-foreground/40 text-[9px] leading-tight truncate">
                  {isRtl ? "منصة إدارة الأعمال" : "Business ERP"}
                </p>
              </div>
            </div>
          )}
          {isCollapsed && (
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shadow-sm">
              <span className="text-white font-black text-sm">S</span>
            </div>
          )}

          {/* Mobile close */}
          <Button variant="ghost" size="icon" className="md:hidden text-sidebar-foreground w-7 h-7" onClick={() => setIsOpen?.(false)}>
            <X className="h-4 w-4" />
          </Button>

          {/* Desktop collapse toggle */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "hidden md:flex w-7 h-7 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent shrink-0",
              isCollapsed && "mx-auto",
            )}
            onClick={onToggleCollapse}
            title={isCollapsed ? (isRtl ? "توسيع" : "Expand") : (isRtl ? "طي" : "Collapse")}
          >
            <CollapseIcon className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-2">
          <div className={cn("space-y-2", isCollapsed ? "px-1.5" : "px-2.5")}>
            {!isCollapsed && <ActivitySwitcher />}

            {visibleCategories.map((category) => (
              <div key={category.id} className="space-y-px">
                {!isCollapsed && (
                  <h3 className="px-2 text-[10px] font-semibold text-sidebar-foreground/35 uppercase tracking-widest mb-1">
                    {isRtl ? category.labelAr : category.labelEn}
                  </h3>
                )}
                {isCollapsed && <div className="h-px bg-sidebar-border/40 mx-1 mb-1" />}

                {category.items.map((item) => {
                  const isActive = location === item.path || (item.path !== "/dashboard" && location.startsWith(item.path));
                  const Icon = item.icon;

                  const navItem = (
                    <Link key={item.id} href={item.path}>
                      <div
                        className={cn(
                          "flex items-center rounded-lg transition-all duration-150 cursor-pointer group",
                          isCollapsed
                            ? "justify-center w-9 h-9 mx-auto"
                            : "gap-2.5 px-2.5 py-1.5",
                          isActive
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                        )}
                        onClick={() => setIsOpen?.(false)}
                      >
                        <Icon className={cn("shrink-0 transition-colors", isCollapsed ? "w-4.5 h-4.5" : "w-4 h-4",
                          isActive ? "text-primary-foreground" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground"
                        )} style={{ width: isCollapsed ? 18 : 16, height: isCollapsed ? 18 : 16 }} />
                        {!isCollapsed && (
                          <span className="text-sm font-medium leading-none">{label(item.id)}</span>
                        )}
                      </div>
                    </Link>
                  );

                  if (isCollapsed) {
                    return (
                      <Tooltip key={item.id} delayDuration={100}>
                        <TooltipTrigger asChild>{navItem}</TooltipTrigger>
                        <TooltipContent side={isRtl ? "left" : "right"} className="text-xs font-medium">
                          {label(item.id)}
                        </TooltipContent>
                      </Tooltip>
                    );
                  }
                  return navItem;
                })}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Footer / User */}
        <div className={cn("border-t border-sidebar-border flex-shrink-0", isCollapsed ? "p-1.5" : "p-3")}>
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
                    {isMultiRole && <span className="opacity-60"> · {isRtl ? "متعدد" : "Multi"}</span>}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-sidebar-foreground/40 hover:text-destructive shrink-0"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleLogout(); }}
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
