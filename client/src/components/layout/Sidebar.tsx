import { Link, useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, Briefcase, PenTool, CheckSquare, Landmark,
  Smartphone, MapPin, Settings, ShieldAlert, FileText,
  PieChart, BrainCircuit, Lightbulb, ShoppingCart, Truck, Wallet,
  Banknote, Package, Building2, Globe, FileKey2, HardHat
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const menuCategories = [
  {
    id: 'core',
    items: [
      { id: 'dashboard', icon: LayoutDashboard, path: '/' },
      { id: 'ai_control', icon: BrainCircuit, path: '/ai-control' },
      { id: 'bi', icon: PieChart, path: '/bi' },
      { id: 'multi_tenant', icon: Building2, path: '/companies' },
    ]
  },
  {
    id: 'business',
    items: [
      { id: 'crm', icon: Users, path: '/crm' },
      { id: 'sales', icon: ShoppingCart, path: '/sales' },
      { id: 'purchases', icon: Truck, path: '/purchases' },
      { id: 'accounting', icon: Wallet, path: '/accounting' },
    ]
  },
  {
    id: 'operations',
    items: [
      { id: 'projects', icon: Briefcase, path: '/projects' },
      { id: 'inventory', icon: Package, path: '/inventory' },
      { id: 'equipment', icon: Settings, path: '/equipment' },
    ]
  },
  {
    id: 'engineering',
    items: [
      { id: 'engineering', icon: PenTool, path: '/engineering' },
      { id: 'approvals', icon: CheckSquare, path: '/approvals' },
      { id: 'government', icon: Landmark, path: '/government' },
      { id: 'smart_proposal', icon: Lightbulb, path: '/smart-proposal' },
    ]
  },
  {
    id: 'hr',
    items: [
      { id: 'hr', icon: Users, path: '/hr' },
      { id: 'payroll', icon: Banknote, path: '/payroll' },
      { id: 'mobile_app', icon: Smartphone, path: '/mobile-app' },
      { id: 'attendance', icon: MapPin, path: '/attendance' },
      { id: 'hse', icon: ShieldAlert, path: '/hse' },
    ]
  },
  {
    id: 'system',
    items: [
      { id: 'dms', icon: FileText, path: '/dms' },
      { id: 'client_portal', icon: Globe, path: '/client-portal' },
    ]
  }
];

export function Sidebar() {
  const [location] = useLocation();
  const { t, dir } = useLanguage();

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-72 bg-sidebar border-r border-sidebar-border hidden md:flex flex-col">
      {/* Logo Area */}
      <div className="h-16 flex items-center px-6 border-b border-sidebar-border bg-sidebar-accent/30 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-white font-bold text-xl">S</span>
          </div>
          <span className="text-sidebar-foreground font-bold text-xl tracking-tight">SCAPE ERP</span>
        </div>
      </div>

      {/* Navigation Menu */}
      <ScrollArea className="flex-1 py-4">
        <div className="px-3 space-y-6">
          {menuCategories.map((category) => (
            <div key={category.id} className="space-y-1">
              <h3 className="px-3 text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider mb-2">
                {t(`nav.cat.${category.id}`)}
              </h3>
              {category.items.map((item) => {
                const isActive = location === item.path;
                const Icon = item.icon;
                
                return (
                  <Link key={item.id} href={item.path}>
                    <a
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group",
                        isActive 
                          ? "bg-primary text-primary-foreground font-medium shadow-sm" 
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      )}
                      dir={dir}
                    >
                      <Icon 
                        className={cn(
                          "w-4 h-4 transition-colors", 
                          isActive ? "text-primary-foreground" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground"
                        )} 
                      />
                      <span className="text-sm">{t(`nav.${item.id}`)}</span>
                    </a>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Footer Area */}
      <div className="p-4 border-t border-sidebar-border mt-auto flex-shrink-0">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-sidebar-accent/50">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <HardHat className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0 overflow-hidden">
            <p className="text-sm font-medium text-sidebar-foreground truncate">Ahmed Engineer</p>
            <p className="text-xs text-sidebar-foreground/50 truncate">System Admin | HQ</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
