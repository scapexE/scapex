import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  Briefcase, 
  CheckCircle2, 
  TrendingUp,
  BrainCircuit,
  MapPin,
  Clock,
  AlertTriangle
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { ProjectActivity } from "@/components/dashboard/ProjectActivity";
import { AIInsights } from "@/components/dashboard/AIInsights";

export default function Dashboard() {
  const { t } = useLanguage();

  return (
    <MainLayout>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('dash.overview')}</h1>
            <p className="text-muted-foreground mt-1">
              {t('dash.welcome')}, Ahmed Engineer.
            </p>
          </div>
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title={t('dash.active_projects')}
            value="24"
            trend="+12% from last month"
            icon={Briefcase}
            trendUp={true}
          />
          <StatCard 
            title={t('dash.pending_approvals')}
            value="18"
            trend="5 require immediate action"
            icon={CheckCircle2}
            trendUp={false}
          />
          <StatCard 
            title={t('dash.engineers_field')}
            value="142"
            trend="87% attendance rate today"
            icon={MapPin}
            trendUp={true}
          />
          <StatCard 
            title={t('dash.revenue')}
            value="$2.4M"
            trend="+18% year over year"
            icon={TrendingUp}
            trendUp={true}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart Area */}
          <Card className="lg:col-span-2 shadow-sm border-border/50">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">{t('dash.recent_activities')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ProjectActivity />
            </CardContent>
          </Card>

          {/* AI Insights & Alerts Sidebar */}
          <div className="space-y-6">
            <Card className="border-accent/30 shadow-md bg-accent/5 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <BrainCircuit className="w-24 h-24 text-accent" />
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold flex items-center gap-2 text-accent-foreground">
                  <BrainCircuit className="w-5 h-5 text-accent" />
                  {t('dash.ai_insights')}
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
                  HSE Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/50">
                    <Clock className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-900 dark:text-amber-200">Equipment Maintenance Due</p>
                      <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-1">Crane #42 at Riyadh Metro Site requires scheduled maintenance in 2 days.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
