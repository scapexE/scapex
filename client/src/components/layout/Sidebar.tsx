import { Link, useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  PenTool,
  CheckSquare,
  Landmark,
  Smartphone,
  MapPin,
  Settings,
  ShieldAlert,
  FileText,
  FileSpreadsheet,
  Users2,
  PieChart,
  BrainCircuit,
  Lightbulb,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const menuItems = [
  { id: 'dashboard', icon: LayoutDashboard, path: '/' },
  { id: 'crm', icon: Users, path: '/crm' },
  { id: 'projects', icon: Briefcase, path: '/projects' },
  { id: 'engineering', icon: PenTool, path: '/engineering' },
  { id: 'approvals', icon: CheckSquare, path: '/approvals' },
  { id: 'government', icon: Landmark, path: '/government' },
  { id: 'mobile_app', icon: Smartphone, path: '/mobile-app' },
  { id: 'attendance', icon: MapPin, path: '/attendance' },
  { id: 'equipment', icon: Settings, path: '/equipment' },
  { id: 'hse', icon: ShieldAlert, path: '/hse' },
  { id: 'dms', icon: FileText, path: '/dms' },
  { id: 'invoices', icon: FileSpreadsheet, path: '/invoices' },
  { id: 'hr', icon: Users2, path: '/hr' },
  { id: 'bi', icon: PieChart, path: '/bi' },
  { id: 'ai_control', icon: BrainCircuit, path: '/ai-control' },
  { id: 'smart_proposal', icon: Lightbulb, path: '/smart-proposal' },
];

export function Sidebar() {
  const [location] = useLocation();
  const { t, dir } = useLanguage();

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-72 bg-sidebar border-r border-sidebar-border hidden md:flex flex-col">
      {/* Logo Area */}
      <div className="h-16 flex items-center px-6 border-b border-sidebar-border bg-sidebar-accent/30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-white font-bold text-xl">S</span>
          </div>
          <span className="text-sidebar-foreground font-bold text-xl tracking-tight">SCAPE ERP</span>
        </div>
      </div>

      {/* Navigation Menu */}
      <ScrollArea className="flex-1 py-4">
        <nav className="px-3 space-y-1">
          {menuItems.map((item) => {
            const isActive = location === item.path;
            const Icon = item.icon;
            
            return (
              <Link key={item.id} href={item.path}>
                <a
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                    isActive 
                      ? "bg-primary text-primary-foreground font-medium shadow-sm" 
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                  dir={dir}
                >
                  <Icon 
                    className={cn(
                      "w-5 h-5 transition-colors", 
                      isActive ? "text-primary-foreground" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground"
                    )} 
                  />
                  <span className="text-sm">{t(`nav.${item.id}`)}</span>
                </a>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer Area */}
      <div className="p-4 border-t border-sidebar-border mt-auto">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-sidebar-accent/50">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0 overflow-hidden">
            <p className="text-sm font-medium text-sidebar-foreground truncate">Ahmed Engineer</p>
            <p className="text-xs text-sidebar-foreground/50 truncate">System Admin</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
