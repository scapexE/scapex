import { useLanguage } from "../../contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "../dashboard/StatCard";
import { Users, Target, CheckCircle2, TrendingUp, Calendar, ArrowUpRight } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const MONTHLY_DATA = [
  { name: 'Jan', won: 1200000, pipeline: 3500000, forecast: 1300000 },
  { name: 'Feb', won: 1800000, pipeline: 4100000, forecast: 1700000 },
  { name: 'Mar', won: 1500000, pipeline: 3800000, forecast: 1900000 },
  { name: 'Apr', won: 2200000, pipeline: 5200000, forecast: 2400000 },
  { name: 'May', won: 2800000, pipeline: 4800000, forecast: 2900000 },
  { name: 'Jun', won: 3100000, pipeline: 6100000, forecast: 3500000 },
];

const LEAD_SOURCES = [
  { name: 'Direct Inquiry', value: 45 },
  { name: 'Referral', value: 25 },
  { name: 'Tender Portal', value: 20 },
  { name: 'Event', value: 10 },
];

const UPCOMING_ACTIVITIES = [
  { id: 1, title: 'Call NEOM Procurement', time: '10:00 AM', type: 'call', priority: 'high', user: 'Ahmed E.' },
  { id: 2, title: 'Send Proposal: KAFD Retail', time: '1:30 PM', type: 'email', priority: 'high', user: 'Sarah S.' },
  { id: 3, title: 'Site Visit: Red Sea Terminal', time: 'Tomorrow', type: 'meeting', priority: 'medium', user: 'Ahmed E.' },
  { id: 4, title: 'Follow up on Contract', time: 'Tomorrow', type: 'call', priority: 'low', user: 'Mohammed K.' },
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
          title={dir === 'rtl' ? 'توقع المبيعات (الشهر القادم)' : 'Sales Forecast (Next Month)'}
          value="$4.2M"
          trend={dir === 'rtl' ? '+15% بناءً على مسار المبيعات' : '+15% based on current pipeline'}
          icon={TrendingUp}
          trendUp={true}
        />
        <StatCard 
          title={t('crm.dash.revenue_ytd')}
          value="$12.6M"
          trend={t('crm.dash.revenue_ytd.trend')}
          icon={CheckCircle2}
          trendUp={true}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Forecasting Chart */}
        <Card className="lg:col-span-2 shadow-sm border-border/50">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base">{dir === 'rtl' ? 'تحليل الإيرادات والتوقعات' : 'Revenue & Forecast Analysis'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full mt-4" dir="ltr"> 
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={MONTHLY_DATA} margin={{ top: 10, right: 10, left: 20, bottom: 20 }}>
                  <defs>
                    <linearGradient id="colorWon" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
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
                    cursor={{ stroke: 'hsl(var(--secondary))', strokeWidth: 2, strokeDasharray: '5 5' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}
                    formatter={(value: number) => [`$${(value / 1000000).toFixed(1)}M`, undefined]}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Area type="monotone" dataKey="forecast" name={dir === 'rtl' ? 'التوقعات (AI)' : 'AI Forecast'} stroke="hsl(var(--accent))" strokeDasharray="5 5" fillOpacity={1} fill="url(#colorForecast)" />
                  <Area type="monotone" dataKey="won" name={dir === 'rtl' ? 'الإيرادات المحققة' : 'Actual Revenue'} stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorWon)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Activities & Sources */}
        <div className="space-y-6">
          {/* Upcoming Activities Widget */}
          <Card className="shadow-sm border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                {dir === 'rtl' ? 'الأنشطة القادمة والتذكيرات' : 'Upcoming Activities & Reminders'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[180px] pr-3 mt-2">
                <div className="space-y-3">
                  {UPCOMING_ACTIVITIES.map((activity) => (
                    <div key={activity.id} className="flex gap-3 border-b border-border/50 pb-3 last:border-0 last:pb-0">
                      <div className="mt-0.5 shrink-0">
                        {activity.priority === 'high' ? (
                          <div className="w-2 h-2 rounded-full bg-destructive animate-pulse"></div>
                        ) : activity.priority === 'medium' ? (
                          <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium leading-none">{activity.title}</p>
                        <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                          <span className="text-primary font-medium">{activity.time}</span>
                          <span>•</span>
                          <span>{activity.user}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <Button variant="ghost" className="w-full mt-2 text-xs h-8 text-primary">
                {dir === 'rtl' ? 'عرض جميع الأنشطة' : 'View all activities'} <ArrowUpRight className={cn("w-3 h-3", dir === 'rtl' ? 'mr-1' : 'ml-1')} />
              </Button>
            </CardContent>
          </Card>

          {/* Lead Sources */}
          <Card className="shadow-sm border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t('crm.dash.sources.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 mt-2">
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
