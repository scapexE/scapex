import { useState, useCallback } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { RoleSwitcherBar } from "./RoleSwitcherBar";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

const COLLAPSE_KEY = "scapex_sidebar_collapsed";

function readCollapsed(): boolean {
  try { return localStorage.getItem(COLLAPSE_KEY) === "true"; } catch { return false; }
}

export function MainLayout({ children }: { children: React.ReactNode }) {
  const { dir } = useLanguage();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(readCollapsed);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem(COLLAPSE_KEY, String(next)); } catch {}
      return next;
    });
  }, []);

  return (
    <div className="min-h-screen bg-background flex w-full overflow-hidden" dir={dir}>
      <Sidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapse}
      />
      <div
        className={cn(
          "flex flex-col flex-1 min-w-0 transition-all duration-300 w-full",
          dir === "rtl"
            ? isCollapsed ? "md:mr-14" : "md:mr-64"
            : isCollapsed ? "md:ml-14" : "md:ml-64",
        )}
      >
        <Header onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl">
            <RoleSwitcherBar />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
