import { cn } from "@/lib/utils";
import { ROLE_LABELS, ROLE_DEFAULTS } from "@/lib/permissions";
import { useActiveRole } from "@/contexts/ActiveRoleContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  UserCog, ChevronDown, CheckCircle2,
  Briefcase, Shield, Building, Eye, Calculator, HardHat, Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import type { Role } from "@/lib/permissions";

const ROLE_ICONS: Record<Role, React.ComponentType<{ className?: string }>> = {
  admin:      Shield,
  manager:    Briefcase,
  accountant: Calculator,
  engineer:   HardHat,
  hr_manager: Users,
  client:     Building,
  viewer:     Eye,
};

const ROLE_MESSAGES: Record<Role, { ar: string; en: string; color: string; bg: string; border: string }> = {
  admin:      { ar: "مدير النظام",       en: "System Admin",    color: "text-red-700 dark:text-red-400",         bg: "bg-red-50 dark:bg-red-950/30",           border: "border-red-200 dark:border-red-800/50" },
  manager:    { ar: "مشرف / مدير",       en: "Manager",         color: "text-violet-700 dark:text-violet-400",   bg: "bg-violet-50 dark:bg-violet-950/30",      border: "border-violet-200 dark:border-violet-800/50" },
  accountant: { ar: "محاسب",             en: "Accountant",      color: "text-blue-700 dark:text-blue-400",       bg: "bg-blue-50 dark:bg-blue-950/30",          border: "border-blue-200 dark:border-blue-800/50" },
  engineer:   { ar: "مهندس",             en: "Engineer",        color: "text-amber-700 dark:text-amber-400",     bg: "bg-amber-50 dark:bg-amber-950/30",        border: "border-amber-200 dark:border-amber-800/50" },
  hr_manager: { ar: "مدير موارد بشرية", en: "HR Manager",      color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30",    border: "border-emerald-200 dark:border-emerald-800/50" },
  client:     { ar: "عميل",             en: "Client",          color: "text-cyan-700 dark:text-cyan-400",       bg: "bg-cyan-50 dark:bg-cyan-950/30",          border: "border-cyan-200 dark:border-cyan-800/50" },
  viewer:     { ar: "مشاهد",            en: "Viewer",          color: "text-gray-600 dark:text-gray-400",       bg: "bg-gray-50 dark:bg-gray-950/30",          border: "border-gray-200 dark:border-gray-700/50" },
};

export function RoleSwitcherBar() {
  const { activeRole, setActiveRole, isMultiRole, userRoles, currentUser } = useActiveRole();
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";

  if (!currentUser || !activeRole) return null;

  const meta = ROLE_MESSAGES[activeRole];
  const Icon = ROLE_ICONS[activeRole];
  const roleName = isRtl ? meta.ar : meta.en;
  const permCount = (currentUser.permissions || []).filter(
    (p) => ROLE_DEFAULTS[activeRole]?.includes(p)
  ).length;

  // Single role — minimal quiet indicator
  if (!isMultiRole) {
    return (
      <div
        dir={dir}
        className={cn(
          "flex items-center gap-2.5 px-4 py-2.5 rounded-xl border mb-5 text-sm",
          meta.bg, meta.border,
        )}
        data-testid="role-indicator-bar"
      >
        <Icon className={cn("w-4 h-4 shrink-0", meta.color)} />
        <span className={cn("font-medium", meta.color)}>
          {isRtl ? "أنت في حساب" : "You are logged in as"} <strong>{roleName}</strong>
        </span>
        <Badge
          variant="outline"
          className={cn("border-transparent text-xs ms-auto", ROLE_LABELS[activeRole].color)}
        >
          {isRtl ? meta.ar : meta.en}
        </Badge>
      </div>
    );
  }

  // Multi-role — full switcher
  return (
    <div
      dir={dir}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl border mb-5",
        meta.bg, meta.border,
      )}
      data-testid="role-switcher-bar"
    >
      {/* Left: icon + message */}
      <div className={cn("flex items-center gap-2.5 flex-1 min-w-0")}>
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
          "bg-white/60 dark:bg-black/20 border", meta.border)}>
          <Icon className={cn("w-4 h-4", meta.color)} />
        </div>
        <div className="min-w-0">
          <p className={cn("font-semibold text-sm leading-tight", meta.color)}>
            {isRtl ? "أنت الآن في وضع" : "Active mode:"} <span className="underline underline-offset-2">{roleName}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isRtl
              ? `${permCount} صلاحية نشطة · ${userRoles.length} أدوار مُسنَدة`
              : `${permCount} active permissions · ${userRoles.length} assigned roles`}
          </p>
        </div>
      </div>

      {/* Right: role pills + switcher */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Quick role pills (visible on md+) */}
        <div className="hidden sm:flex items-center gap-1.5">
          {userRoles.map((role) => {
            const RoleIcon = ROLE_ICONS[role];
            const isActive = role === activeRole;
            return (
              <button
                key={role}
                data-testid={`role-pill-${role}`}
                onClick={() => setActiveRole(role)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all",
                  isActive
                    ? cn("bg-white dark:bg-black/40 shadow-sm border-current", ROLE_LABELS[role].color)
                    : "bg-white/40 dark:bg-white/5 border-transparent text-muted-foreground hover:bg-white/70 dark:hover:bg-white/10"
                )}
              >
                <RoleIcon className="w-3 h-3" />
                {isRtl ? ROLE_LABELS[role].ar : ROLE_LABELS[role].en}
                {isActive && <CheckCircle2 className="w-3 h-3" />}
              </button>
            );
          })}
        </div>

        {/* Dropdown for mobile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 gap-1.5 text-xs border bg-white/60 dark:bg-black/20 sm:hidden",
                meta.border, meta.color
              )}
              data-testid="role-switcher-dropdown"
            >
              <UserCog className="w-3.5 h-3.5" />
              {isRtl ? "تبديل الوضع" : "Switch Role"}
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              {isRtl ? "اختر الوضع النشط" : "Choose active role"}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {userRoles.map((role) => {
              const RoleIcon = ROLE_ICONS[role];
              const isActive = role === activeRole;
              return (
                <DropdownMenuItem
                  key={role}
                  onClick={() => setActiveRole(role)}
                  className={cn("gap-2 text-sm", isActive && "font-semibold")}
                  data-testid={`role-menu-item-${role}`}
                >
                  <RoleIcon className={cn("w-4 h-4", ROLE_MESSAGES[role].color)} />
                  {isRtl ? ROLE_LABELS[role].ar : ROLE_LABELS[role].en}
                  {isActive && <CheckCircle2 className="w-4 h-4 text-primary ms-auto" />}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
