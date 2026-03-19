import { useState, useEffect, useCallback, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useBusinessActivity } from "@/contexts/BusinessActivityContext";
import { ACTIVITY_COLOR_MAP, type ActivityColor } from "@/lib/activities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Bell, Search, Globe, Menu, Moon, Sun, Check, Trash2, X } from "lucide-react";
import { useTheme } from "next-themes";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ActivityIcon } from "@/components/ActivityIcon";
import {
  getNotifications, markAsRead, markAllRead, clearNotifications, getUnreadCount,
  seedDemoNotifications, TYPE_STYLES, type AppNotification,
} from "@/lib/notifications";

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const { t, language, toggleLanguage, dir } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { settings } = useSettings();
  const { activeActivity } = useBusinessActivity();
  const [showNotif, setShowNotif] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const isRtl = dir === "rtl";

  const refresh = useCallback(() => {
    setNotifications(getNotifications());
    setUnread(getUnreadCount());
  }, []);

  useEffect(() => {
    seedDemoNotifications();
    refresh();
    const handler = () => refresh();
    window.addEventListener("scapex_notification_update", handler);
    return () => window.removeEventListener("scapex_notification_update", handler);
  }, [refresh]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowNotif(false);
      }
    }
    if (showNotif) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showNotif]);

  const colors = activeActivity
    ? ACTIVITY_COLOR_MAP[activeActivity.color as ActivityColor]
    : null;

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

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return isRtl ? "الآن" : "Just now";
    if (mins < 60) return isRtl ? `منذ ${mins} دقيقة` : `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return isRtl ? `منذ ${hrs} ساعة` : `${hrs}h ago`;
    return d.toLocaleDateString(isRtl ? "ar-SA" : "en-US", { month: "short", day: "numeric" });
  };

  return (
    <header
      className={cn(
        "h-16 flex items-center justify-between px-4 md:px-6 sticky top-0 z-40 transition-colors duration-300",
        activeActivity ? cn("border-b-2", colors?.border) : "border-b border-border",
        activeActivity ? colors?.bg : "bg-card",
      )}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Button variant="ghost" size="icon" className="md:hidden shrink-0" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
        </Button>

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

      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {activeActivity && colors && (
          <Badge variant="outline" className={cn("border-transparent text-xs gap-1 sm:hidden", colors.badge, colors.text)}>
            <ActivityIcon name={activeActivity.icon} className="w-3 h-3" />
            {dir === "rtl" ? activeActivity.nameAr : activeActivity.nameEn}
          </Badge>
        )}

        <Button variant="ghost" size="sm" onClick={toggleLanguage}
          className={cn("flex items-center gap-1.5 h-9", activeActivity && colors ? colors.text : "")}
          data-testid="button-toggle-language">
          <Globe className="h-4 w-4" />
          <span className="font-medium text-sm hidden sm:inline">
            {language === "en" ? "العربية" : "English"}
          </span>
        </Button>

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

        <div className="relative" ref={panelRef}>
          <Button
            variant="ghost" size="icon" className="relative h-9 w-9"
            onClick={() => setShowNotif(!showNotif)}
            data-testid="button-notifications"
          >
            <Bell className={cn("h-5 w-5", activeActivity && colors ? colors.text : "text-muted-foreground")} />
            {unread > 0 && (
              <span className="absolute -top-0.5 -end-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Button>

          {showNotif && (
            <div className={cn(
              "absolute top-full mt-2 w-80 sm:w-96 rounded-xl border bg-card shadow-xl z-50 overflow-hidden",
              isRtl ? "left-0" : "right-0"
            )}>
              <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                <h3 className="text-sm font-semibold">{t("notif.title")} {unread > 0 && `(${unread})`}</h3>
                <div className="flex gap-1">
                  {unread > 0 && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { markAllRead(); refresh(); }}>
                      <Check className="w-3 h-3 me-1" /> {t("notif.mark_all")}
                    </Button>
                  )}
                  {notifications.length > 0 && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => { clearNotifications(); refresh(); }}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-sm">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    {t("notif.empty")}
                  </div>
                ) : (
                  notifications.slice(0, 20).map((n) => {
                    const style = TYPE_STYLES[n.type];
                    return (
                      <div
                        key={n.id}
                        className={cn(
                          "px-4 py-3 border-b last:border-0 cursor-pointer transition-colors hover:bg-muted/40",
                          !n.read && "bg-primary/5"
                        )}
                        onClick={() => {
                          markAsRead(n.id);
                          refresh();
                          if (n.link) window.location.href = n.link;
                        }}
                        data-testid={`notification-${n.id}`}
                      >
                        <div className="flex gap-3">
                          <span className="text-base shrink-0 mt-0.5">{style.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className={cn("text-sm font-medium", !n.read && "font-semibold")}>
                              {isRtl ? n.titleAr : n.titleEn}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {isRtl ? n.bodyAr : n.bodyEn}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-1">{formatTime(n.timestamp)}</p>
                          </div>
                          {!n.read && (
                            <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

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
            {displayLogoUrl && (
              <img
                src={displayLogoUrl}
                alt={displayName || "logo"}
                className="w-9 h-9 rounded-full object-cover border border-border/40 shrink-0"
                data-testid="header-company-logo"
              />
            )}
            {displayName && (
              <span
                className={cn(
                  "hidden sm:inline text-xs font-bold leading-tight max-w-[240px] truncate",
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
