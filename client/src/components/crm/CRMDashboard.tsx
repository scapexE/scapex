import { useLanguage } from "../../contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "../dashboard/StatCard";
import { Users, Target, CheckCircle2, TrendingUp } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

const MONTHLY_DATA = [
  { name: 'Jan', won: 1200000, pipeline: 3500000 },
  { name: 'Feb', won: 1800000, pipeline: 4100000 },
  { name: 'Mar', won: 1500000, pipeline: 3800000 },
  { name: 'Apr', won: 2200000, pipeline: 5200000 },
  { name: 'May', won: 2800000, pipeline: 4800000 },
  { name: 'Jun', won: 3100000, pipeline: 6100000 },
];

const LEAD_SOURCES = [
  { name: 'Direct Inquiry', value: 45 },
  { name: 'Referral', value: 25 },
  { name: 'Tender Portal', value: 20 },
  { name: 'Event', value: 10 },
];

export function CRMDashboard() {
  const { t, dir } = useLanguage();

  return (
    <div className="flex flex-col gap-6 pb-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title={t('crm.dash.active_leads')}
          value="148"
          trend={t('crm.dash.active_leads.trend')}
          icon={Users}
          trendUp={true}
        />
        <StatCard 
          title={t('crm.dash.pipe_value')}
          value="$17.85M"
          trend={t('crm.dash.pipe_value.trend')}
          icon={Target}
          trendUp={true}
        />
        <StatCard 
          title={t('crm.dash.win_rate')}
          value="34.5%"
          trend={t('crm.dash.win_rate.trend')}
          icon={CheckCircle2}
          trendUp={false}
        />
        <StatCard 
          title={t('crm.dash.revenue_ytd')}
          value="$12.6M"
          trend={t('crm.dash.revenue_ytd.trend')}
          icon={TrendingUp}
          trendUp={true}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline vs Won Chart */}
        <Card className="lg:col-span-2 shadow-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('crm.dash.chart.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full mt-4" dir="ltr"> {/* Charts usually render better in LTR */}
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={MONTHLY_DATA} margin={{ top: 10, right: 10, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} dy={10} />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    tickFormatter={(value) => `$${value / 1000000}M`}
                    dx={-10}
                  />
                  <Tooltip 
                    cursor={{ fill: 'hsl(var(--secondary))' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}
                    formatter={(value: number) => [`$${(value / 1000000).toFixed(1)}M`, undefined]}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="pipeline" name="Pipeline" fill="hsl(var(--primary))" fillOpacity={0.3} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="won" name="Won Revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Lead Sources */}
        <Card className="shadow-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('crm.dash.sources.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mt-4">
              {LEAD_SOURCES.map((source, index) => (
                <div key={source.name} className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{source.name}</span>
                    <span className="text-muted-foreground">{source.value}%</span>
                  </div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full rounded-full", dir === 'rtl' ? "float-right" : "float-left")} 
                      style={{ 
                        width: `${source.value}%`,
                        backgroundColor: index === 0 ? 'hsl(var(--primary))' : 
                                       index === 1 ? 'hsl(var(--accent))' : 
                                       index === 2 ? 'hsl(var(--chart-3))' : 'hsl(var(--chart-4))'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-4 border-t border-border/50">
              <h4 className="text-sm font-medium mb-3">{t('crm.dash.top_performers')}</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">AK</div>
                    <span className="text-sm font-medium">Ahmed Khalid</span>
                  </div>
                  <span className="text-sm font-bold text-emerald-600">$4.2M</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent">SS</div>
                    <span className="text-sm font-medium">Sarah Smith</span>
                  </div>
                  <span className="text-sm font-bold text-emerald-600">$3.8M</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
