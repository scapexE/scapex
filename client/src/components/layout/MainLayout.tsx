import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { RoleSwitcherBar } from "./RoleSwitcherBar";
import { ActiveRoleProvider } from "@/contexts/ActiveRoleContext";
import { BusinessActivityProvider } from "@/contexts/BusinessActivityContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useBusinessActivity } from "@/contexts/BusinessActivityContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import type { SystemUser } from "@/lib/permissions";

// Updates browser tab title based on active activity's company name or global settings
function DocumentTitleUpdater() {
  const { settings } = useSettings();
  const { activeActivity } = useBusinessActivity();
  const { dir } = useLanguage();

  useEffect(() => {
    const actNameAr = activeActivity?.companyNameAr;
    const actNameEn = activeActivity?.companyNameEn;
    const globalNameAr = settings.companyNameAr;
    const globalNameEn = settings.companyNameEn || settings.companyName || "Scapex";

    const companyName = dir === "rtl"
      ? ((actNameAr || actNameEn) || (globalNameAr || globalNameEn))
      : ((actNameEn || actNameAr) || (globalNameEn || globalNameAr));

    const activityName = dir === "rtl"
      ? activeActivity?.nameAr
      : activeActivity?.nameEn;

    if (companyName && activityName) {
      document.title = `${activityName} — ${companyName}`;
    } else if (companyName) {
      document.title = companyName;
    } else {
      document.title = "Scapex — منصة إدارة الأعمال";
    }
  }, [activeActivity, settings, dir]);

  return null;
}

export function MainLayout({ children }: { children: React.ReactNode }) {
  const { dir } = useLanguage();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const currentUser: SystemUser | null = JSON.parse(localStorage.getItem("user") || "null");

  return (
    <SettingsProvider>
      <BusinessActivityProvider currentUser={currentUser}>
        <ActiveRoleProvider>
          <DocumentTitleUpdater />
          <div className="min-h-screen bg-background flex w-full overflow-hidden" dir={dir}>
            <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
            <div className={cn(
              "flex flex-col flex-1 min-w-0 transition-all duration-300 w-full",
              dir === "rtl" ? "md:mr-72" : "md:ml-72"
            )}>
              <Header onMenuClick={() => setIsSidebarOpen(true)} />
              <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
                <div className="mx-auto w-full max-w-7xl">
                  <RoleSwitcherBar />
                  {children}
                </div>
              </main>
            </div>
          </div>
        </ActiveRoleProvider>
      </BusinessActivityProvider>
    </SettingsProvider>
  );
}
