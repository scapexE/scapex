import { useLanguage } from "../../contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users, Briefcase, CheckCircle2, TrendingUp,
  BrainCircuit, MapPin, Clock, AlertTriangle,
  Wallet, Package, ShoppingCart, Building2,
  FileText, Globe, PieChart, Settings, Banknote,
  PenTool, CheckSquare, Landmark, Lightbulb,
  UserCog, ShieldAlert, Smartphone,
} from "lucide-react";
import { MainLayout } from "../../components/layout/MainLayout";
import { StatCard } from "../../components/dashboard/StatCard";
import { ProjectActivity } from "../../components/dashboard/ProjectActivity";
import { AIInsights } from "../../components/dashboard/AIInsights";
import { useBusinessActivity } from "@/contexts/BusinessActivityContext";
import { useActiveRole } from "@/contexts/ActiveRoleContext";
import { ROLE_DEFAULTS, type SystemUser } from "@/lib/permissions";

// All possible apps — each maps to a module ID
const ALL_APPS = [
  { id: "crm",           icon: Users,        color: "bg-blue-100 dark:bg-blue-900/40",    iconColor: "text-blue-600 dark:text-blue-400",    path: "/crm" },
  { id: "sales",         icon: ShoppingCart, color: "bg-emerald-100 dark:bg-emerald-900/40", iconColor: "text-emerald-600 dark:text-emerald-400", path: "/sales" },
  { id: "purchases",     icon: Package,      color: "bg-indigo-100 dark:bg-indigo-900/40",  iconColor: "text-indigo-600 dark:text-indigo-400",  path: "/purchases" },
  { id: "accounting",    icon: Wallet,       color: "bg-amber-100 dark:bg-amber-900/40",   iconColor: "text-amber-600 dark:text-amber-400",   path: "/accounting" },
  { id: "projects",      icon: Briefcase,    color: "bg-purple-100 dark:bg-purple-900/40",  iconColor: "text-purple-600 dark:text-purple-400",  path: "/projects" },
  { id: "inventory",     icon: Package,      color: "bg-cyan-100 dark:bg-cyan-900/40",    iconColor: "text-cyan-600 dark:text-cyan-400",    path: "/inventory" },
  { id: "equipment",     icon: Settings,     color: "bg-slate-100 dark:bg-slate-800/60",   iconColor: "text-slate-600 dark:text-slate-400",   path: "/equipment" },
  { id: "engineering",   icon: PenTool,      color: "bg-teal-100 dark:bg-teal-900/40",    iconColor: "text-teal-600 dark:text-teal-400",    path: "/engineering" },
  { id: "approvals",     icon: CheckSquare,  color: "bg-lime-100 dark:bg-lime-900/40",    iconColor: "text-lime-600 dark:text-lime-400",    path: "/approvals" },
  { id: "government",    icon: Landmark,     color: "bg-rose-100 dark:bg-rose-900/40",    iconColor: "text-rose-600 dark:text-rose-400",    path: "/government" },
  { id: "smart_proposal",icon: Lightbulb,    color: "bg-yellow-100 dark:bg-yellow-900/40",  iconColor: "text-yellow-600 dark:text-yellow-400",  path: "/smart-proposal" },
  { id: "hr",            icon: Users,        color: "bg-rose-100 dark:bg-rose-900/40",    iconColor: "text-rose-600 dark:text-rose-400",    path: "/hr" },
  { id: "payroll",       icon: Banknote,     color: "bg-orange-100 dark:bg-orange-900/40",  iconColor: "text-orange-600 dark:text-orange-400",  path: "/payroll" },
  { id: "attendance",    icon: MapPin,       color: "bg-fuchsia-100 dark:bg-fuchsia-900/40", iconColor: "text-fuchsia-600 dark:text-fuchsia-400", path: "/attendance" },
  { id: "hse",           icon: ShieldAlert,  color: "bg-red-100 dark:bg-red-900/40",     iconColor: "text-red-600 dark:text-red-400",     path: "/hse" },
  { id: "mobile_app",    icon: Smartphone,   color: "bg-violet-100 dark:bg-violet-900/40",  iconColor: "text-violet-600 dark:text-violet-400",  path: "/mobile-app" },
  { id: "bi",            icon: PieChart,     color: "bg-sky-100 dark:bg-sky-900/40",     iconColor: "text-sky-600 dark:text-sky-400",     path: "/bi" },
  { id: "ai_control",    icon: BrainCircuit, color: "bg-indigo-100 dark:bg-indigo-900/40",  iconColor: "text-indigo-600 dark:text-indigo-400",  path: "/ai-control" },
  { id: "multi_tenant",  icon: Building2,    color: "bg-slate-100 dark:bg-slate-800/60",   iconColor: "text-slate-600 dark:text-slate-400",   path: "/companies" },
  { id: "dms",           icon: FileText,     color: "bg-gray-100 dark:bg-gray-800/60",    iconColor: "text-gray-600 dark:text-gray-400",    path: "/dms" },
  { id: "client_portal", icon: Globe,        color: "bg-emerald-100 dark:bg-emerald-900/40", iconColor: "text-emerald-600 dark:text-emerald-400", path: "/client-portal" },
  { id: "users",         icon: UserCog,      color: "bg-slate-100 dark:bg-slate-800/60",   iconColor: "text-slate-600 dark:text-slate-400",   path: "/users" },
];

// Inner component — rendered inside MainLayout so all contexts are available
function DashboardContent() {
  const { t } = useLanguage();
  const { activeActivity } = useBusinessActivity();
  const { activeRole, isMultiRole } = useActiveRole();

  const currentUser: SystemUser | null = JSON.parse(localStorage.getItem("user") || "null");
  const isAdmin = currentUser?.role === "admin";
  const userPerms = currentUser?.permissions || [];

  // Step 1: filter by active role (mirrors Sidebar logic)
  const roleFilteredPerms = isMultiRole && activeRole
    ? userPerms.filter((p) => ROLE_DEFAULTS[activeRole as keyof typeof ROLE_DEFAULTS]?.includes(p))
    : userPerms;

  // Step 2: filter by active activity's enabled modules
  const activityModules = activeActivity?.modules ?? null;
  const effectivePerms = activityModules
    ? roleFilteredPerms.filter((p) => activityModules.includes(p))
    : roleFilteredPerms;

  const visibleApps = ALL_APPS.filter((app) => {
    if (isAdmin) {
      return activityModules ? activityModules.includes(app.id) : true;
    }
    return effectivePerms.includes(app.id);
  });

  return (
    <div className="flex flex-col gap-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("dash.overview")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("dash.welcome")}, {currentUser?.name?.split(" ")[0] ?? "Ahmed"}.
          </p>
        </div>
      </div>

      {/* Odoo-style App Grid */}
      {visibleApps.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">{t("dash.apps")}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
            {visibleApps.map((app) => {
              const Icon = app.icon;
              return (
                <a
                  key={app.id}
                  href={app.path}
                  data-testid={`app-icon-${app.id}`}
                  className="flex flex-col items-center gap-2 group cursor-pointer no-underline"
                >
                  <div className={`w-16 h-16 rounded-2xl ${app.color} flex items-center justify-center shadow-sm group-hover:shadow-md transition-all group-hover:-translate-y-1 border border-border/30 dark:border-border/50`}>
                    <Icon className={`w-7 h-7 ${app.iconColor}`} />
                  </div>
                  <span className="text-xs font-medium text-center text-muted-foreground group-hover:text-foreground transition-colors">
                    {t(`nav.${app.id}`)}
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title={t("dash.active_projects")}
          value="42"
          trend={t("dash.trend_projects")}
          icon={Briefcase}
          trendUp={true}
        />
        <StatCard
          title={t("dash.pending_approvals")}
          value="128"
          trend={t("dash.trend_approvals")}
          icon={CheckCircle2}
          trendUp={false}
        />
        <StatCard
          title={t("dash.engineers_field")}
          value="340"
          trend={t("dash.trend_engineers")}
          icon={MapPin}
          trendUp={true}
        />
        <StatCard
          title={t("dash.revenue")}
          value="12.4M ر.س"
          trend={t("dash.trend_revenue")}
          icon={TrendingUp}
          trendUp={true}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart Area */}
        <Card className="lg:col-span-2 shadow-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">{t("dash.recent_activities")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ProjectActivity />
          </CardContent>
        </Card>

        {/* AI Insights & Alerts */}
        <div className="space-y-6">
          <Card className="border-accent/30 shadow-md bg-accent/5 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <BrainCircuit className="w-24 h-24 text-accent" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2 text-accent-foreground">
                <BrainCircuit className="w-5 h-5 text-accent" />
                {t("dash.ai_insights")}
              </CardTitle>
            </CardHeader>
            <CardContent className="relative z-10">
              <AIInsights />
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                {t("dash.alert_title")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/50">
                  <Clock className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-900 dark:text-amber-200">{t("dash.alert_payroll")}</p>
                    <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-1">{t("dash.alert_payroll_desc")}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-100 dark:bg-red-950/20 dark:border-red-900/50">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-red-900 dark:text-red-200">{t("dash.alert_stock")}</p>
                    <p className="text-xs text-red-700/80 dark:text-red-400/80 mt-1">{t("dash.alert_stock_desc")}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <MainLayout>
      <DashboardContent />
    </MainLayout>
  );
}
