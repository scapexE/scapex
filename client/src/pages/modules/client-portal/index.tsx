import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { ClientDashboard } from "@/components/client-portal/ClientDashboard";
import { Button } from "@/components/ui/button";
import { LogOut, Bell, Menu, X, Building2, ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getUsers, type SystemUser } from "@/lib/permissions";

function ClientPortalLogin({ onLogin }: { onLogin: (user: SystemUser) => void }) {
  const { dir } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

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
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4" dir={dir}>
      <div className="w-full max-w-md bg-card border border-border/50 shadow-lg rounded-xl p-8">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-sm mx-auto mb-3">
            <span className="text-white font-bold text-2xl">S</span>
          </div>
          <h2 className="text-2xl font-bold">
            {dir === "rtl" ? "بوابة العملاء" : "Client Portal"}
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            {dir === "rtl" ? "سجل دخولك لمتابعة مشاريعك وعقودك" : "Sign in to track your projects and contracts"}
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground block">
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
                  "w-full h-10 rounded-md border border-input bg-secondary/50 text-sm px-3 outline-none focus:border-primary transition-colors",
                  dir === "rtl" ? "pr-9" : "pl-9"
                )}
                dir="ltr"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground block">
              {dir === "rtl" ? "كلمة المرور" : "Password"}
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKey}
              className="w-full h-10 rounded-md border border-input bg-secondary/50 text-sm px-3 outline-none focus:border-primary transition-colors"
            />
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button className="w-full h-11 text-base font-medium mt-2" onClick={handleLogin}>
            {dir === "rtl" ? "تسجيل الدخول" : "Sign In"}
          </Button>

          <p className="text-center text-sm text-muted-foreground pt-2">
            {dir === "rtl" ? "ليس لديك حساب؟ " : "No account? "}
            <a href="/" className="text-primary font-medium hover:underline">
              {dir === "rtl" ? "سجّل الآن" : "Register here"}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ClientPortalModule() {
  const { dir, language, toggleLanguage } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Check if already logged in as a client
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

  const handleLogout = () => {
    // If accessed from main system, go back to dashboard; else go to login
    const mainUser = JSON.parse(localStorage.getItem("user") || "null");
    if (mainUser?.role !== "client") {
      window.location.href = "/dashboard";
    } else {
      localStorage.removeItem("user");
      setPortalUser(null);
    }
  };

  if (!portalUser) {
    return <ClientPortalLogin onLogin={(user) => setPortalUser(user)} />;
  }

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col" dir={dir}>
      {/* Portal Header */}
      <header className="h-16 bg-card border-b border-border/50 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto h-full px-4 md:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white font-bold text-xl">S</span>
            </div>
            <div>
              <span className="font-bold text-base hidden sm:block tracking-tight">
                {dir === "rtl" ? "بوابة عملاء Scapex" : "Scapex Client Portal"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/60 text-sm">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-xs">
                {portalUser.name.charAt(0).toUpperCase()}
              </div>
              <span className="font-medium max-w-32 truncate">{portalUser.name}</span>
            </div>

            <Button variant="ghost" size="sm" onClick={toggleLanguage} className="text-sm font-medium hidden sm:flex">
              {language === "en" ? "العربية" : "English"}
            </Button>

            <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 ring-2 ring-card" />
            </Button>

            <Button variant="outline" size="sm"
              className="hidden sm:flex items-center gap-2 text-primary hover:bg-primary/10"
              onClick={() => { window.location.href = "/dashboard"; }}
              data-testid="button-back-to-system"
            >
              {dir === "rtl" ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
              {dir === "rtl" ? "العودة للنظام" : "Back to System"}
            </Button>

            <Button variant="ghost" size="sm"
              className="hidden sm:flex items-center gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
              {dir === "rtl" ? "خروج" : "Logout"}
            </Button>

            <Button variant="ghost" size="icon" className="sm:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-card border-b border-border/50 p-4 absolute top-16 w-full z-30 shadow-md animate-in slide-in-from-top-2">
          <div className="flex flex-col gap-2">
            <div className="py-2 px-3 bg-muted/50 rounded-md font-medium text-sm text-center">
              {portalUser.name}
            </div>
            <Button variant="outline" className={cn("w-full text-primary", dir === "rtl" ? "justify-end" : "justify-start")} onClick={() => { window.location.href = "/dashboard"; }}>
              {dir === "rtl" ? <ArrowRight className="w-4 h-4 ml-2" /> : <ArrowLeft className="w-4 h-4 mr-2" />}
              {dir === "rtl" ? "العودة للنظام" : "Back to System"}
            </Button>
            <Button variant="ghost" className={cn("w-full text-destructive hover:text-destructive hover:bg-destructive/10", dir === "rtl" ? "justify-end" : "justify-start")} onClick={handleLogout}>
              <LogOut className={cn("w-4 h-4", dir === "rtl" ? "ml-2" : "mr-2")} />
              {dir === "rtl" ? "تسجيل الخروج" : "Logout"}
            </Button>
          </div>
        </div>
      )}

      {/* Portal Content */}
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <ClientDashboard />
        </div>
      </main>
    </div>
  );
}
