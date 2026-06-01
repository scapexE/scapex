import { useState, useCallback } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { RoleSwitcherBar } from "./RoleSwitcherBar";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

const COLLAPSE_KEY = "scapex_sidebar_collapsed";
const HIDDEN_KEY  = "scapex_sidebar_hidden";

function readCollapsed(): boolean {
  try { return localStorage.getItem(COLLAPSE_KEY) === "true"; } catch { return false; }
}
function readHidden(): boolean {
  try { return localStorage.getItem(HIDDEN_KEY) === "true"; } catch { return false; }
}

export function MainLayout({ children }: { children: React.ReactNode }) {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(readCollapsed);
  const [isHidden, setIsHidden] = useState(readHidden);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem(COLLAPSE_KEY, String(next)); } catch {}
      return next;
    });
  }, []);

  const hideSidebar = useCallback(() => {
    setIsHidden(true);
    try { localStorage.setItem(HIDDEN_KEY, "true"); } catch {}
  }, []);

  const showSidebar = useCallback(() => {
    setIsHidden(false);
    try { localStorage.removeItem(HIDDEN_KEY); } catch {}
  }, []);

  return (
    <div className="min-h-screen bg-background flex w-full overflow-hidden" dir={dir}>
      <Sidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapse}
        isHidden={isHidden}
        onHide={hideSidebar}
      />

      {/* Floating tab — restore hidden sidebar */}
      {isHidden && (
        <button
          onClick={showSidebar}
          data-testid="button-show-sidebar"
          title={isRtl ? "إظهار القائمة الجانبية" : "Show sidebar"}
          className={cn(
            "fixed top-1/2 -translate-y-1/2 z-50",
            "flex items-center justify-center overflow-hidden",
            "bg-primary/80 hover:bg-primary text-primary-foreground",
            "shadow-lg transition-all duration-200",
            "w-4 hover:w-7 h-14 rounded-none",
            isRtl
              ? "right-0 rounded-l-lg"
              : "left-0 rounded-r-lg",
          )}
        >
          {isRtl
            ? <ChevronLeft  className="w-3 h-3 shrink-0" />
            : <ChevronRight className="w-3 h-3 shrink-0" />}
        </button>
      )}

      <div
        className={cn(
          "flex flex-col flex-1 min-w-0 transition-all duration-300 w-full",
          !isHidden && (
            isRtl
              ? isCollapsed ? "md:mr-14" : "md:mr-64"
              : isCollapsed ? "md:ml-14" : "md:ml-64"
          ),
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
