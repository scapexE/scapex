import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { ClientLogin } from "@/components/client-portal/ClientLogin";
import { ClientDashboard } from "@/components/client-portal/ClientDashboard";
import { Button } from "@/components/ui/button";
import { LogOut, Bell, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ClientPortalModule() {
  const { t, dir, language, toggleLanguage } = useLanguage();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!isAuthenticated) {
    return <ClientLogin onLogin={() => setIsAuthenticated(true)} />;
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
            <span className="font-bold text-lg hidden sm:block tracking-tight text-foreground/90">
              {dir === 'rtl' ? "بوابة عملاء سكيب" : "SCAPE Client Portal"}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={toggleLanguage}
              className="text-sm font-medium"
            >
              {language === 'en' ? 'العربية' : 'English'}
            </Button>
            
            <div className="w-px h-4 bg-border hidden sm:block" />
            
            <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 ring-2 ring-card"></span>
            </Button>

            <Button 
              variant="ghost" 
              size="sm" 
              className="hidden sm:flex items-center gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={() => setIsAuthenticated(false)}
            >
              <LogOut className="w-4 h-4" />
              {dir === 'rtl' ? "تسجيل الخروج" : "Logout"}
            </Button>

            <Button 
              variant="ghost" 
              size="icon" 
              className="sm:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-card border-b border-border/50 p-4 absolute w-full z-30 shadow-md animate-in slide-in-from-top-2">
          <div className="flex flex-col gap-2">
            <div className="py-2 px-3 bg-muted/50 rounded-md font-medium text-sm text-center mb-2">
              NEOM Co.
            </div>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setIsAuthenticated(false)}
            >
              <LogOut className={cn("w-4 h-4", dir === 'rtl' ? "ml-2" : "mr-2")} />
              {dir === 'rtl' ? "تسجيل الخروج" : "Logout"}
            </Button>
          </div>
        </div>
      )}

      {/* Portal Main Content */}
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <ClientDashboard />
        </div>
      </main>
    </div>
  );
}
