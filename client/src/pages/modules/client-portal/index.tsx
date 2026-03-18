import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { ClientDashboard } from "@/components/client-portal/ClientDashboard";
import { Button } from "@/components/ui/button";
import { LogOut, Bell, Menu, X, Building2, ArrowLeft, ArrowRight, Palette, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getUsers, type SystemUser } from "@/lib/permissions";
import { useTheme } from "next-themes";

type PortalTheme = "default" | "ocean" | "forest" | "royal" | "sunset" | "slate";

const PORTAL_THEMES: { id: PortalTheme; nameAr: string; nameEn: string; primary: string; accent: string; gradient: string; bg: string }[] = [
  { id: "default", nameAr: "افتراضي", nameEn: "Default", primary: "from-blue-600 to-blue-700", accent: "bg-blue-600", gradient: "from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30", bg: "bg-slate-50 dark:bg-slate-950" },
  { id: "ocean", nameAr: "أزرق محيطي", nameEn: "Ocean", primary: "from-cyan-600 to-teal-600", accent: "bg-teal-600", gradient: "from-cyan-50 to-teal-50 dark:from-cyan-950/30 dark:to-teal-950/30", bg: "bg-cyan-50/30 dark:bg-cyan-950/20" },
  { id: "forest", nameAr: "أخضر غابات", nameEn: "Forest", primary: "from-emerald-600 to-green-700", accent: "bg-emerald-600", gradient: "from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30", bg: "bg-emerald-50/30 dark:bg-emerald-950/20" },
  { id: "royal", nameAr: "بنفسجي ملكي", nameEn: "Royal", primary: "from-violet-600 to-purple-700", accent: "bg-violet-600", gradient: "from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30", bg: "bg-violet-50/30 dark:bg-violet-950/20" },
  { id: "sunset", nameAr: "غروب", nameEn: "Sunset", primary: "from-orange-500 to-rose-600", accent: "bg-orange-600", gradient: "from-orange-50 to-rose-50 dark:from-orange-950/30 dark:to-rose-950/30", bg: "bg-orange-50/30 dark:bg-orange-950/20" },
  { id: "slate", nameAr: "رمادي أنيق", nameEn: "Slate", primary: "from-slate-700 to-gray-800", accent: "bg-slate-700", gradient: "from-slate-100 to-gray-100 dark:from-slate-900/30 dark:to-gray-900/30", bg: "bg-gray-50 dark:bg-gray-950" },
];

const STORAGE_THEME = "scapex_portal_theme";

function getPortalTheme(): PortalTheme {
  try { return (localStorage.getItem(STORAGE_THEME) as PortalTheme) || "default"; } catch { return "default"; }
}

function ClientPortalLogin({ onLogin, portalTheme }: { onLogin: (user: SystemUser) => void; portalTheme: PortalTheme }) {
  const { dir } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const theme = PORTAL_THEMES.find(t => t.id === portalTheme) || PORTAL_THEMES[0];

  const handleLogin = () => {
    setError("");
    if (!email || !password) { setError(dir === "rtl" ? "يرجى إدخال البريد وكلمة المرور" : "Please enter email and password"); return; }
    const users = getUsers();
    const user = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    if (!user) { setError(dir === "rtl" ? "البريد الإلكتروني أو كلمة المرور غير صحيحة" : "Invalid email or password"); return; }
    if (!user.active) { setError(dir === "rtl" ? "الحساب معطّل. تواصل مع المسؤول." : "Account disabled. Contact admin."); return; }
    if (!user.permissions.includes("client_portal")) { setError(dir === "rtl" ? "لا تملك صلاحية الوصول لبوابة العملاء" : "No access to client portal"); return; }
    localStorage.setItem("user", JSON.stringify(user));
    onLogin(user);
  };

  const handleKey = (e: React.KeyboardEvent) => { if (e.key === "Enter") handleLogin(); };

  return (
    <div className={cn("min-h-screen flex items-center justify-center p-4", theme.bg)} dir={dir}>
      <div className="w-full max-w-md">
        <div className={cn("rounded-t-2xl p-8 bg-gradient-to-r text-white", theme.primary)}>
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg mx-auto mb-4">
              <span className="text-white font-bold text-3xl">S</span>
            </div>
            <h2 className="text-2xl font-bold">
              {dir === "rtl" ? "بوابة العملاء" : "Client Portal"}
            </h2>
            <p className="text-white/80 text-sm mt-2">
              {dir === "rtl" ? "سجل دخولك لمتابعة مشاريعك وعقودك" : "Sign in to track your projects and contracts"}
            </p>
          </div>
        </div>

        <div className="bg-card border border-t-0 border-border/50 shadow-xl rounded-b-2xl p-8">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium block">
                {dir === "rtl" ? "البريد الإلكتروني" : "Email Address"}
              </label>
              <div className="relative">
                <Building2 className={cn("absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground", dir === "rtl" ? "right-3" : "left-3")} />
                <input
                  type="email"
                  placeholder="client@company.sa"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={handleKey}
                  className={cn(
                    "w-full h-11 rounded-lg border border-input bg-secondary/30 text-sm px-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all",
                    dir === "rtl" ? "pr-10" : "pl-10"
                  )}
                  dir="ltr"
                  data-testid="input-portal-email"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium block">
                {dir === "rtl" ? "كلمة المرور" : "Password"}
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKey}
                className="w-full h-11 rounded-lg border border-input bg-secondary/30 text-sm px-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                data-testid="input-portal-password"
              />
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2.5 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button className={cn("w-full h-11 text-base font-medium mt-2 bg-gradient-to-r text-white border-0", theme.primary)} onClick={handleLogin} data-testid="button-portal-login">
              {dir === "rtl" ? "تسجيل الدخول" : "Sign In"}
            </Button>
          </div>

          <div className="mt-6 pt-4 border-t border-border/50">
            <p className="text-center text-xs text-muted-foreground">
              Scapex ERP Platform © 2026
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ClientPortalModule() {
  const { dir, language, toggleLanguage } = useLanguage();
  const { theme: appTheme, setTheme: setAppTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [portalTheme, setPortalTheme] = useState<PortalTheme>(getPortalTheme);

  const currentTheme = PORTAL_THEMES.find(t => t.id === portalTheme) || PORTAL_THEMES[0];

  const isRtl = dir === "rtl";
  const t = (ar: string, en: string) => isRtl ? ar : en;

  const getSessionUser = (): SystemUser | null => {
    try {
      const saved = localStorage.getItem("user");
      if (!saved) return null;
      const u = JSON.parse(saved);
      if (u?.id && u?.permissions?.includes("client_portal")) return u;
      return null;
    } catch { return null; }
  };

  const [portalUser, setPortalUser] = useState<SystemUser | null>(getSessionUser);

  const isSystemUser = portalUser && portalUser.role !== "client";

  const handleLogout = () => {
    if (isSystemUser) {
      window.location.href = "/dashboard";
    } else {
      localStorage.removeItem("user");
      setPortalUser(null);
    }
  };

  const handleChangeTheme = (id: PortalTheme) => {
    setPortalTheme(id);
    localStorage.setItem(STORAGE_THEME, id);
    setShowThemePicker(false);
  };

  if (!portalUser) {
    return <ClientPortalLogin onLogin={(user) => setPortalUser(user)} portalTheme={portalTheme} />;
  }

  return (
    <div className={cn("min-h-screen flex flex-col", currentTheme.bg)} dir={dir}>
      <header className={cn("h-16 sticky top-0 z-40 shadow-sm border-b border-white/10 bg-gradient-to-r text-white", currentTheme.primary)}>
        <div className="max-w-7xl mx-auto h-full px-4 md:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <span className="text-white font-bold text-xl">S</span>
            </div>
            <div>
              <span className="font-bold text-base hidden sm:block tracking-tight">
                {t("بوابة عملاء Scapex", "Scapex Client Portal")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-sm text-sm">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs">
                {portalUser.name.charAt(0).toUpperCase()}
              </div>
              <span className="font-medium max-w-32 truncate">{portalUser.name}</span>
            </div>

            <Button variant="ghost" size="sm" onClick={toggleLanguage} className="text-white/90 hover:text-white hover:bg-white/10 text-sm font-medium hidden sm:flex">
              {language === "en" ? "العربية" : "English"}
            </Button>

            <Button variant="ghost" size="icon" onClick={() => setAppTheme(appTheme === "dark" ? "light" : "dark")} className="text-white/80 hover:text-white hover:bg-white/10" data-testid="button-portal-dark-mode">
              {appTheme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>

            <div className="relative">
              <Button variant="ghost" size="icon" onClick={() => setShowThemePicker(!showThemePicker)} className="text-white/80 hover:text-white hover:bg-white/10" data-testid="button-portal-theme">
                <Palette className="w-4 h-4" />
              </Button>
              {showThemePicker && (
                <div className={cn("absolute top-full mt-2 bg-card border border-border rounded-xl shadow-xl p-3 z-50 w-56", isRtl ? "left-0" : "right-0")}>
                  <p className="text-xs font-medium text-muted-foreground mb-2">{t("ثيم البوابة", "Portal Theme")}</p>
                  <div className="space-y-1">
                    {PORTAL_THEMES.map(th => (
                      <button
                        key={th.id}
                        onClick={() => handleChangeTheme(th.id)}
                        className={cn("w-full flex items-center gap-3 p-2 rounded-lg text-sm transition-colors text-foreground",
                          portalTheme === th.id ? "bg-muted font-medium" : "hover:bg-muted/50"
                        )}
                        data-testid={`button-theme-${th.id}`}
                      >
                        <div className={cn("w-6 h-6 rounded-full bg-gradient-to-r shrink-0", th.primary)} />
                        <span>{isRtl ? th.nameAr : th.nameEn}</span>
                        {portalTheme === th.id && <span className="ms-auto text-primary">✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Button variant="ghost" size="icon" className="relative text-white/80 hover:text-white hover:bg-white/10">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-400 ring-2 ring-white/20" />
            </Button>

            {isSystemUser && (
              <Button variant="ghost" size="sm"
                className="hidden sm:flex items-center gap-2 text-white/90 hover:text-white bg-white/10 hover:bg-white/20"
                onClick={() => { window.location.href = "/dashboard"; }}
                data-testid="button-back-to-system"
              >
                {isRtl ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                {t("العودة للنظام", "Back to System")}
              </Button>
            )}

            <Button variant="ghost" size="sm"
              className="hidden sm:flex items-center gap-2 text-white/70 hover:text-white hover:bg-white/10"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
              {t("خروج", "Logout")}
            </Button>

            <Button variant="ghost" size="icon" className="sm:hidden text-white/80 hover:text-white hover:bg-white/10" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="sm:hidden bg-card border-b border-border/50 p-4 absolute top-16 w-full z-30 shadow-md animate-in slide-in-from-top-2">
          <div className="flex flex-col gap-2">
            <div className="py-2 px-3 bg-muted/50 rounded-md font-medium text-sm text-center">
              {portalUser.name}
            </div>

            <Button variant="ghost" size="sm" onClick={toggleLanguage} className="w-full justify-center text-sm">
              {language === "en" ? "العربية" : "English"}
            </Button>

            <Button variant="ghost" size="sm" onClick={() => setAppTheme(appTheme === "dark" ? "light" : "dark")} className="w-full justify-center text-sm">
              {appTheme === "dark" ? <Sun className="w-4 h-4 me-2" /> : <Moon className="w-4 h-4 me-2" />}
              {appTheme === "dark" ? t("الوضع الفاتح", "Light Mode") : t("الوضع الداكن", "Dark Mode")}
            </Button>

            <div className="border-t border-border/50 pt-2 mt-1">
              <p className="text-xs font-medium text-muted-foreground mb-2 px-2">{t("ثيم البوابة", "Portal Theme")}</p>
              <div className="grid grid-cols-3 gap-1.5">
                {PORTAL_THEMES.map(th => (
                  <button
                    key={th.id}
                    onClick={() => handleChangeTheme(th.id)}
                    className={cn("flex flex-col items-center gap-1 p-2 rounded-lg text-xs transition-colors",
                      portalTheme === th.id ? "bg-muted font-medium ring-1 ring-primary" : "hover:bg-muted/50"
                    )}
                  >
                    <div className={cn("w-8 h-8 rounded-full bg-gradient-to-r", th.primary)} />
                    <span className="truncate max-w-full">{isRtl ? th.nameAr : th.nameEn}</span>
                  </button>
                ))}
              </div>
            </div>

            {isSystemUser && (
              <Button variant="outline" className={cn("w-full mt-2", isRtl ? "justify-end" : "justify-start")} onClick={() => { window.location.href = "/dashboard"; }}>
                {isRtl ? <ArrowRight className="w-4 h-4 ml-2" /> : <ArrowLeft className="w-4 h-4 mr-2" />}
                {t("العودة للنظام", "Back to System")}
              </Button>
            )}

            <Button variant="ghost" className={cn("w-full text-destructive hover:text-destructive hover:bg-destructive/10", isRtl ? "justify-end" : "justify-start")} onClick={handleLogout}>
              <LogOut className={cn("w-4 h-4", isRtl ? "ml-2" : "mr-2")} />
              {t("تسجيل الخروج", "Logout")}
            </Button>
          </div>
        </div>
      )}

      <main className={cn("flex-1 p-4 md:p-6 lg:p-8 bg-gradient-to-b", currentTheme.gradient)}>
        <div className="max-w-7xl mx-auto">
          <ClientDashboard />
        </div>
      </main>

      <footer className="border-t border-border/30 py-4 px-6 text-center text-xs text-muted-foreground">
        <p>Scapex ERP Platform © 2026 — {t("بوابة العملاء", "Client Portal")}</p>
      </footer>
    </div>
  );
}
