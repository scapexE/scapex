import { useLanguage } from "@/contexts/LanguageContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useBusinessActivity } from "@/contexts/BusinessActivityContext";
import { ACTIVITY_COLOR_MAP, type ActivityColor } from "@/lib/activities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Bell, Search, Globe, Menu, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ActivityIcon } from "@/components/ActivityIcon";

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const { t, language, toggleLanguage, dir } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { settings } = useSettings();
  const { activeActivity } = useBusinessActivity();

  const colors = activeActivity
    ? ACTIVITY_COLOR_MAP[activeActivity.color as ActivityColor]
    : null;

  // Company info: prefer per-activity branding, fall back to global settings
  const activityLogoUrl   = activeActivity?.companyLogoUrl;
  const activityNameAr    = activeActivity?.companyNameAr;
  const activityNameEn    = activeActivity?.companyNameEn;
  const globalLogoUrl     = settings.companyLogoUrl;
  const globalNameAr      = settings.companyNameAr;
  const globalNameEn      = settings.companyNameEn || settings.companyName;

  const displayLogoUrl    = activityLogoUrl || globalLogoUrl;
  const displayName       = dir === "rtl"
    ? ((activityNameAr || activityNameEn) || (globalNameAr || globalNameEn))
    : ((activityNameEn || activityNameAr) || (globalNameEn || globalNameAr));
  const hasCompanyInfo    = displayLogoUrl || displayName;

  return (
    <header
      className={cn(
        "h-16 flex items-center justify-between px-4 md:px-6 sticky top-0 z-40 transition-colors duration-300",
        activeActivity ? cn("border-b-2", colors?.border) : "border-b border-border",
        activeActivity ? colors?.bg : "bg-card",
      )}
    >
      {/* ── Left / Search ──────────────────────────────── */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Button variant="ghost" size="icon" className="md:hidden shrink-0" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
        </Button>

        {/* Active activity label (desktop) */}
        {activeActivity && colors && (
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", colors.badge)}>
              <ActivityIcon name={activeActivity.icon} className={cn("w-4 h-4", colors.text)} />
            </div>
            <div>
              <p className={cn("text-xs font-semibold leading-tight", colors.text)}>
                {dir === "rtl" ? activeActivity.nameAr : activeActivity.nameEn}
              </p>
              <p className="text-[10px] text-muted-foreground leading-tight">
                {activeActivity.modules.length} {t("header.modules_active")}
              </p>
            </div>
            <div className={cn("w-px h-6 mx-1 rounded border-r", colors.border)} />
          </div>
        )}

        <div className="relative w-full max-w-[200px] hidden sm:block">
          <Search className={cn(
            "absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground",
            dir === "rtl" ? "right-3" : "left-3"
          )} />
          <Input
            placeholder={t("header.search")}
            className={cn(
              "h-9 border-0 focus-visible:ring-1",
              activeActivity ? "bg-white/50 dark:bg-black/20" : "bg-secondary/50",
              dir === "rtl" ? "pr-9 pl-4" : "pl-9 pr-4"
            )}
          />
        </div>
      </div>

      {/* ── Right / Actions ────────────────────────────── */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">

        {/* Activity badge (mobile) */}
        {activeActivity && colors && (
          <Badge variant="outline" className={cn("border-transparent text-xs gap-1 sm:hidden", colors.badge, colors.text)}>
            <ActivityIcon name={activeActivity.icon} className="w-3 h-3" />
            {dir === "rtl" ? activeActivity.nameAr : activeActivity.nameEn}
          </Badge>
        )}

        {/* Language */}
        <Button variant="ghost" size="sm" onClick={toggleLanguage}
          className={cn("flex items-center gap-1.5 h-9", activeActivity && colors ? colors.text : "")}
          data-testid="button-toggle-language">
          <Globe className="h-4 w-4" />
          <span className="font-medium text-sm hidden sm:inline">
            {language === "en" ? "العربية" : "English"}
          </span>
        </Button>

        {/* Theme */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon"
              className={cn("relative h-9 w-9", activeActivity && colors ? colors.text : "")}
              data-testid="button-toggle-theme">
              <Sun className="h-[1.1rem] w-[1.1rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-[1.1rem] w-[1.1rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme("light")}>Light</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>Dark</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")}>System</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Bell */}
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className={cn("h-5 w-5", activeActivity && colors ? colors.text : "text-muted-foreground")} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full border-2 border-card" />
        </Button>

        {/* ── Company Branding: after Bell ─────────────── */}
        {hasCompanyInfo && (
          <div
            className={cn(
              "flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-colors shrink-0",
              activeActivity && colors
                ? cn(colors.border, "bg-white/40 dark:bg-black/20")
                : "border-border/50 bg-secondary/30"
            )}
            data-testid="header-company-branding"
          >
            {/* Circular logo */}
            {displayLogoUrl && (
              <img
                src={displayLogoUrl}
                alt={displayName || "logo"}
                className="w-7 h-7 rounded-full object-cover border border-border/40 shrink-0"
                data-testid="header-company-logo"
              />
            )}
            {/* Company name — visible on sm+ */}
            {displayName && (
              <span
                className={cn(
                  "hidden sm:inline text-xs font-bold leading-tight max-w-[160px] truncate",
                  activeActivity && colors ? colors.text : "text-foreground/80"
                )}
                data-testid="header-company-name"
              >
                {displayName}
              </span>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
