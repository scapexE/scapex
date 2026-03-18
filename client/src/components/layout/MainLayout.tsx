import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { RoleSwitcherBar } from "./RoleSwitcherBar";
import { ActiveRoleProvider } from "@/contexts/ActiveRoleContext";
import { BusinessActivityProvider } from "@/contexts/BusinessActivityContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import type { SystemUser } from "@/lib/permissions";

export function MainLayout({ children }: { children: React.ReactNode }) {
  const { dir } = useLanguage();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const currentUser: SystemUser | null = JSON.parse(localStorage.getItem("user") || "null");

  return (
    <SettingsProvider>
      <BusinessActivityProvider currentUser={currentUser}>
        <ActiveRoleProvider>
          <div className="min-h-screen bg-background flex w-full overflow-hidden" dir={dir}>
            <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
            <div className={cn(
              "flex flex-col flex-1 min-w-0 transition-all duration-300 w-full",
              dir === 'rtl' ? "md:mr-72" : "md:ml-72"
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
