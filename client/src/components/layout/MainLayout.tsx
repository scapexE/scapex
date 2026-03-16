import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

export function MainLayout({ children }: { children: React.ReactNode }) {
  const { dir } = useLanguage();

  return (
    <div className="min-h-screen bg-background flex w-full" dir={dir}>
      <Sidebar />
      <div className={cn(
        "flex flex-col flex-1 min-w-0 transition-all duration-300",
        dir === 'rtl' ? "md:mr-72" : "md:ml-72"
      )}>
        <Header />
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
