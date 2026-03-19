import { Link, useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  PenTool,
  CheckSquare,
  Landmark,
  Smartphone,
  MapPin,
  Settings,
  ShieldAlert,
  FileText,
  PieChart,
  BrainCircuit,
  Lightbulb,
  ShoppingCart,
  Truck,
  Wallet,
  Banknote,
  Package,
  Building2,
  Globe,
  HardHat,
  X,
  LogOut,
  UserCog,
  UserCheck,
  Zap,
  HelpCircle,
  Activity,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { type SystemUser, ROLE_LABELS, ROLE_DEFAULTS } from "@/lib/permissions";
import { logAction } from "@/lib/auditLog";
import { useActiveRole } from "@/contexts/ActiveRoleContext";
import { useBusinessActivity } from "@/contexts/BusinessActivityContext";
import { ActivitySwitcher } from "./ActivitySwitcher";

const menuCategories = [
  {
    id: "core",
    items: [
      { id: "dashboard", icon: LayoutDashboard, path: "/dashboard" },
      { id: "ai_control", icon: BrainCircuit, path: "/ai-control" },
      { id: "bi", icon: PieChart, path: "/bi" },
      { id: "multi_tenant", icon: Building2, path: "/companies" },
      { id: "company_settings", icon: Building2, path: "/company-settings" },
    ],
  },
  {
    id: "business",
    items: [
      { id: "crm", icon: Users, path: "/crm" },
      { id: "sales", icon: ShoppingCart, path: "/sales" },
      { id: "purchases", icon: Truck, path: "/purchases" },
      { id: "accounting", icon: Wallet, path: "/accounting" },
    ],
  },
  {
    id: "operations",
    items: [
      { id: "projects", icon: Briefcase, path: "/projects" },
      { id: "inventory", icon: Package, path: "/inventory" },
      { id: "equipment", icon: Settings, path: "/equipment" },
    ],
  },
  {
    id: "engineering",
    items: [
      { id: "engineering", icon: PenTool, path: "/engineering" },
      { id: "approvals", icon: CheckSquare, path: "/approvals" },
      { id: "government", icon: Landmark, path: "/government" },
      { id: "smart_proposal", icon: Lightbulb, path: "/smart-proposal" },
      { id: "service_catalog", icon: Zap, path: "/service-catalog" },
    ],
  },
  {
    id: "hr",
    items: [
      { id: "hr", icon: Users, path: "/hr" },
      { id: "payroll", icon: Banknote, path: "/payroll" },
      { id: "mobile_app", icon: Smartphone, path: "/mobile-app" },
      { id: "attendance", icon: MapPin, path: "/attendance" },
      { id: "hse", icon: ShieldAlert, path: "/hse" },
    ],
  },
  {
    id: "reports",
    items: [
      { id: "audit_log", icon: Activity, path: "/audit-log" },
    ],
  },
  {
    id: "system",
    items: [
      { id: "dms", icon: FileText, path: "/dms" },
      { id: "client_portal", icon: Globe, path: "/client-portal" },
      { id: "users", icon: UserCog, path: "/users" },
      { id: "system_admin", icon: Settings, path: "/system-admin" },
      { id: "about", icon: HelpCircle, path: "/about" },
    ],
  },
];

interface SidebarProps {
  isOpen?: boolean;
  setIsOpen?: (isOpen: boolean) => void;
}

export function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const [location] = useLocation();
  const { t, dir } = useLanguage();
  const isRtl = dir === "rtl";

  const currentUser: SystemUser | null = JSON.parse(localStorage.getItem("user") || "null");
  const { activeRole, isMultiRole } = useActiveRole();
  const { activeActivity } = useBusinessActivity();

  const handleLogout = () => {
    logAction("logout", "auth", `User ${currentUser?.name} logged out`, `المستخدم ${currentUser?.name} سجّل خروج`);
    localStorage.removeItem("user");
    sessionStorage.removeItem("activeRole");
    window.location.href = "/";
  };

  const userPerms = currentUser?.permissions || [];

  // Step 1: filter by active role (multi-role mode)
  const roleFilteredPerms = isMultiRole && activeRole
    ? userPerms.filter((p) => ROLE_DEFAULTS[activeRole as keyof typeof ROLE_DEFAULTS]?.includes(p))
    : userPerms;

  // Step 2: further filter by active business activity's enabled modules
  const effectivePerms = activeActivity
    ? roleFilteredPerms.filter((p) => activeActivity.modules.includes(p))
    : roleFilteredPerms;

  const visibleCategories = menuCategories.map((cat) => ({
    ...cat,
    items: cat.items.filter((item) => {
      if (!currentUser) return false;
      // system_admin is only for admin role
      if (item.id === "about" || item.id === "audit_log") return true;
      if (item.id === "system_admin") return currentUser.role === "admin";
      if (currentUser.role === "admin") return true;
      // Users with approve_registrations can also access the users page
      if (item.id === "users") {
        return effectivePerms.includes("users") || userPerms.includes("approve_registrations");
      }
      return effectivePerms.includes(item.id);
    }),
  })).filter((cat) => cat.items.length > 0);

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsOpen?.(false)}
        />
      )}

      {/* Sidebar Content */}
      <aside
        className={cn(
          "fixed inset-y-0 z-50 w-72 bg-sidebar border-x border-sidebar-border flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0",
          dir === "rtl" ? "right-0" : "left-0",
          isOpen
            ? "translate-x-0"
            : dir === "rtl"
              ? "translate-x-full md:translate-x-0"
              : "-translate-x-full md:translate-x-0",
        )}
      >
        {/* Logo Area */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border bg-sidebar-accent/30 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {/* Fixed system branding — always shown in sidebar */}
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <div className="min-w-0">
              <p className="text-sidebar-foreground font-bold text-lg tracking-tight leading-tight">
                Scapex
              </p>
              <p className="text-sidebar-foreground/50 text-[10px] leading-tight truncate">
                {dir === "rtl" ? "منصة إدارة الأعمال الذكية" : "Smart Business Platform"}
              </p>
            </div>
          </div>

          {/* Mobile Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-sidebar-foreground shrink-0"
            onClick={() => setIsOpen?.(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation Menu */}
        <ScrollArea className="flex-1 py-4">
          <div className="px-3 space-y-6">
            {/* Activity Switcher — always above nav links */}
            <ActivitySwitcher />

            {visibleCategories.map((category) => (
              <div key={category.id} className="space-y-1">
                <h3 className="px-3 text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider mb-2">
                  {t(`nav.cat.${category.id}`)}
                </h3>
                {category.items.map((item) => {
                  const isActive = location === item.path;
                  const Icon = item.icon;

                  return (
                    <Link key={item.id} href={item.path}>
                      <a
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group",
                          isActive
                            ? "bg-primary text-primary-foreground font-medium shadow-sm"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                        )}
                        dir={dir}
                      >
                        <Icon
                          className={cn(
                            "w-4 h-4 transition-colors",
                            isActive
                              ? "text-primary-foreground"
                              : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground",
                          )}
                        />
                        <span className="text-sm">{t(`nav.${item.id}`)}</span>
                      </a>
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Footer Area */}
        <div className="p-4 border-t border-sidebar-border mt-auto flex-shrink-0">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-sidebar-accent/50 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 font-bold text-primary text-sm">
              {currentUser?.name?.charAt(0).toUpperCase() ?? <HardHat className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0 overflow-hidden">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {currentUser?.name ?? "Guest"}
              </p>
              <p className="text-xs text-sidebar-foreground/50 truncate">
                {activeRole
                  ? (isRtl ? ROLE_LABELS[activeRole]?.ar : ROLE_LABELS[activeRole]?.en)
                  : currentUser
                    ? (isRtl ? ROLE_LABELS[currentUser.role]?.ar : ROLE_LABELS[currentUser.role]?.en)
                    : ""}
                {isMultiRole && <span className="opacity-60"> · {isRtl ? "متعدد الأدوار" : "Multi-role"}</span>}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-sidebar-foreground/50 hover:text-sidebar-foreground shrink-0"
              onClick={handleLogout}
              title="تسجيل الخروج"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
          <div className="text-center text-[10px] opacity-40 text-sidebar-foreground">
            © 2026 Scapex {__APP_VERSION__} · Smart Business Platform
          </div>
        </div>
      </aside>
    </>
  );
}
