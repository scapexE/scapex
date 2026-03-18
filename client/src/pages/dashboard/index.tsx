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
  { id: "crm",           icon: Users,        color: "bg-blue-500",    path: "/crm" },
  { id: "sales",         icon: ShoppingCart, color: "bg-emerald-500", path: "/sales" },
  { id: "purchases",     icon: Package,      color: "bg-indigo-500",  path: "/purchases" },
  { id: "accounting",    icon: Wallet,       color: "bg-amber-500",   path: "/accounting" },
  { id: "projects",      icon: Briefcase,    color: "bg-purple-500",  path: "/projects" },
  { id: "inventory",     icon: Package,      color: "bg-cyan-500",    path: "/inventory" },
  { id: "equipment",     icon: Settings,     color: "bg-slate-600",   path: "/equipment" },
  { id: "engineering",   icon: PenTool,      color: "bg-teal-500",    path: "/engineering" },
  { id: "approvals",     icon: CheckSquare,  color: "bg-lime-600",    path: "/approvals" },
  { id: "government",    icon: Landmark,     color: "bg-rose-600",    path: "/government" },
  { id: "smart_proposal",icon: Lightbulb,    color: "bg-yellow-500",  path: "/smart-proposal" },
  { id: "hr",            icon: Users,        color: "bg-rose-500",    path: "/hr" },
  { id: "payroll",       icon: Banknote,     color: "bg-orange-500",  path: "/payroll" },
  { id: "attendance",    icon: MapPin,       color: "bg-fuchsia-500", path: "/attendance" },
  { id: "hse",           icon: ShieldAlert,  color: "bg-red-600",     path: "/hse" },
  { id: "mobile_app",    icon: Smartphone,   color: "bg-violet-500",  path: "/mobile-app" },
  { id: "bi",            icon: PieChart,     color: "bg-sky-500",     path: "/bi" },
  { id: "ai_control",    icon: BrainCircuit, color: "bg-indigo-700",  path: "/ai-control" },
  { id: "multi_tenant",  icon: Building2,    color: "bg-slate-700",   path: "/companies" },
  { id: "dms",           icon: FileText,     color: "bg-gray-600",    path: "/dms" },
  { id: "client_portal", icon: Globe,        color: "bg-emerald-700", path: "/client-portal" },
  { id: "users",         icon: UserCog,      color: "bg-slate-500",   path: "/users" },
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
                  <div className={`w-16 h-16 rounded-2xl ${app.color} text-white flex items-center justify-center shadow-sm group-hover:shadow-md transition-all group-hover:-translate-y-1`}>
                    <Icon className="w-8 h-8" />
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
          trend="+12% من الشهر الماضي"
          icon={Briefcase}
          trendUp={true}
        />
        <StatCard
          title={t("dash.pending_approvals")}
          value="128"
          trend="15 تستدعي اتخاذ إجراء"
          icon={CheckCircle2}
          trendUp={false}
        />
        <StatCard
          title={t("dash.engineers_field")}
          value="340"
          trend="نسبة الحضور 92% اليوم"
          icon={MapPin}
          trendUp={true}
        />
        <StatCard
          title={t("dash.revenue")}
          value="12.4M ر.س"
          trend="+24% عن العام الماضي"
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
                تنبيهات النظام
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/50">
                  <Clock className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-900 dark:text-amber-200">معالجة الرواتب</p>
                    <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-1">في انتظار الاعتماد لـ 3 فروع قبل نهاية الشهر.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-100 dark:bg-red-950/20 dark:border-red-900/50">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-red-900 dark:text-red-200">مخزون منخفض</p>
                    <p className="text-xs text-red-700/80 dark:text-red-400/80 mt-1">مخزون الحديد في مستودع الرياض أقل من الحد الأدنى.</p>
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
