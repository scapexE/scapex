import { MainLayout } from "@/components/layout/MainLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PieChart, BarChart3, TrendingUp, TrendingDown, DollarSign, Users, Briefcase, Download, RefreshCw, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface KPI {
  label: string; labelAr: string; value: string; change: number; unit: string;
  trend: "up"|"down"; icon: React.ElementType; color: string;
}

const MONTHLY_REVENUE = [
  {month:"يناير",en:"Jan",value:285000},
  {month:"فبراير",en:"Feb",value:312000},
  {month:"مارس",en:"Mar",value:298000},
  {month:"أبريل",en:"Apr",value:425000},
  {month:"مايو",en:"May",value:380000},
  {month:"يونيو",en:"Jun",value:440000},
  {month:"يوليو",en:"Jul",value:395000},
  {month:"أغسطس",en:"Aug",value:462000},
  {month:"سبتمبر",en:"Sep",value:510000},
  {month:"أكتوبر",en:"Oct",value:485000},
  {month:"نوفمبر",en:"Nov",value:530000},
  {month:"ديسمبر",en:"Dec",value:620000},
];

const SERVICE_BREAKDOWN = [
  {label:"استشارات هندسية",en:"Engineering",value:35,color:"#3b82f6"},
  {label:"خدمات السلامة",en:"Safety",value:28,color:"#ef4444"},
  {label:"استشارات بيئية",en:"Environmental",value:18,color:"#22c55e"},
  {label:"مقاولات",en:"Contracting",value:12,color:"#f59e0b"},
  {label:"أخرى",en:"Other",value:7,color:"#8b5cf6"},
];

const TOP_CLIENTS = [
  {name:"أرامكو السعودية",en:"Saudi Aramco",value:480000,deals:8},
  {name:"نيوم",en:"NEOM",value:380000,deals:4},
  {name:"الهيئة الملكية للجبيل وينبع",en:"RCJY",value:220000,deals:5},
  {name:"مجموعة STC",en:"STC Group",value:185000,deals:6},
  {name:"سابك",en:"SABIC",value:155000,deals:3},
];

export default function BIModule() {
  const { dir } = useLanguage(); const isRtl = dir==="rtl";
  const [period, setPeriod] = useState("2026");
  const maxRevenue = Math.max(...MONTHLY_REVENUE.map(m=>m.value));

  const kpis: KPI[] = [
    {label:"Total Revenue",labelAr:"إجمالي الإيرادات",value:"5.14M",change:23,unit:"SAR",trend:"up",icon:DollarSign,color:"text-emerald-500"},
    {label:"Active Projects",labelAr:"مشاريع نشطة",value:"18",change:12,unit:"",trend:"up",icon:Briefcase,color:"text-blue-500"},
    {label:"Proposals Won",labelAr:"عروض مقبولة",value:"67%",change:5,unit:"",trend:"up",icon:TrendingUp,color:"text-purple-500"},
    {label:"New Clients",labelAr:"عملاء جدد",value:"14",change:-3,unit:"",trend:"down",icon:Users,color:"text-amber-500"},
    {label:"Avg. Project Value",labelAr:"متوسط قيمة المشروع",value:"285K",change:18,unit:"SAR",trend:"up",icon:BarChart3,color:"text-cyan-500"},
    {label:"Collection Rate",labelAr:"نسبة التحصيل",value:"91%",change:4,unit:"",trend:"up",icon:TrendingUp,color:"text-pink-500"},
  ];

  return (
    <MainLayout>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{isRtl?"تحليلات الأعمال (BI)":"Business Intelligence"}</h1>
            <p className="text-muted-foreground text-sm mt-1">{isRtl?"لوحات التقارير، مؤشرات الأداء، وتحليل البيانات":"Performance dashboards, KPIs, and data analytics"}</p>
          </div>
          <div className="flex gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-28 h-9 bg-secondary/30"><SelectValue/></SelectTrigger>
              <SelectContent><SelectItem value="2026">2026</SelectItem><SelectItem value="2025">2025</SelectItem></SelectContent>
            </Select>
            <Button variant="outline" size="sm"><RefreshCw className="w-4 h-4 me-1.5"/>{isRtl?"تحديث":"Refresh"}</Button>
            <Button variant="outline" size="sm"><Download className="w-4 h-4 me-1.5"/>{isRtl?"تصدير":"Export"}</Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {kpis.map((kpi,i)=>(
            <Card key={i} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className={cn("w-8 h-8 rounded-lg bg-secondary flex items-center justify-center",kpi.color)}><kpi.icon className="w-4 h-4"/></div>
                  <div className={cn("flex items-center gap-0.5 text-xs font-semibold",kpi.trend==="up"?"text-emerald-600":"text-red-500")}>
                    {kpi.trend==="up"?<ArrowUpRight className="w-3 h-3"/>:<ArrowDownRight className="w-3 h-3"/>}
                    {Math.abs(kpi.change)}%
                  </div>
                </div>
                <p className="text-xl font-bold">{kpi.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{isRtl?kpi.labelAr:kpi.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="revenue">
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="revenue">{isRtl?"الإيرادات":"Revenue"}</TabsTrigger>
            <TabsTrigger value="services">{isRtl?"الخدمات":"Services"}</TabsTrigger>
            <TabsTrigger value="clients">{isRtl?"أفضل العملاء":"Top Clients"}</TabsTrigger>
          </TabsList>

          <TabsContent value="revenue" className="mt-4">
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{isRtl?"الإيرادات الشهرية":"Monthly Revenue"} {period}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {/* Bar chart */}
                <div className="flex items-end gap-1.5 h-48">
                  {MONTHLY_REVENUE.map((m,i)=>{
                    const height=Math.round((m.value/maxRevenue)*100);
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full group relative" style={{height:"160px",display:"flex",alignItems:"flex-end"}}>
                          <div className={cn("w-full rounded-t-sm transition-all cursor-pointer","bg-primary/70 hover:bg-primary")} style={{height:`${height}%`}}>
                            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-foreground text-background text-[9px] px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">
                              {(m.value/1000).toFixed(0)}K
                            </div>
                          </div>
                        </div>
                        <span className="text-[9px] text-muted-foreground">{isRtl?m.month.substring(0,3):m.en}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 pt-4 border-t border-border/40 grid grid-cols-3 gap-4 text-center">
                  <div><p className="text-xs text-muted-foreground">{isRtl?"الإجمالي":"Total"}</p><p className="font-bold text-emerald-600">5.14M SAR</p></div>
                  <div><p className="text-xs text-muted-foreground">{isRtl?"المتوسط":"Avg."}</p><p className="font-bold">428K SAR</p></div>
                  <div><p className="text-xs text-muted-foreground">{isRtl?"الأعلى":"Peak"}</p><p className="font-bold">620K SAR</p></div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="services" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="border-border/50">
                <CardHeader className="pb-2"><CardTitle className="text-sm">{isRtl?"توزيع الإيرادات حسب الخدمة":"Revenue by Service Type"}</CardTitle></CardHeader>
                <CardContent className="p-4 pt-0">
                  {/* Pie chart visualization */}
                  <div className="flex items-center justify-center mb-6">
                    <div className="relative w-36 h-36">
                      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                        {SERVICE_BREAKDOWN.reduce((acc,s,i)=>{
                          const start=acc.start; const end=start+(s.value/100)*360;
                          const r=40; const cx=50; const cy=50;
                          const startRad=(start*Math.PI)/180; const endRad=(end*Math.PI)/180;
                          const x1=cx+r*Math.cos(startRad); const y1=cy+r*Math.sin(startRad);
                          const x2=cx+r*Math.cos(endRad); const y2=cy+r*Math.sin(endRad);
                          const large=end-start>180?1:0;
                          acc.paths.push(<path key={i} d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z`} fill={s.color} stroke="var(--background)" strokeWidth="1"/>);
                          acc.start=end; return acc;
                        },{start:0,paths:[] as React.ReactNode[]}).paths}
                      </svg>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {SERVICE_BREAKDOWN.map((s,i)=>(
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm shrink-0" style={{backgroundColor:s.color}}/>
                        <span className="text-xs flex-1">{isRtl?s.label:s.en}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-secondary rounded-full overflow-hidden"><div className="h-full rounded-full" style={{width:`${s.value}%`,backgroundColor:s.color}}/></div>
                          <span className="text-xs font-semibold w-8 text-end">{s.value}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader className="pb-2"><CardTitle className="text-sm">{isRtl?"مؤشرات الأداء الرئيسية":"Key Performance Indicators"}</CardTitle></CardHeader>
                <CardContent className="p-4 pt-0 space-y-4">
                  {[
                    {label:isRtl?"معدل الفوز بالعطاءات":"Proposal Win Rate",value:67,color:"bg-emerald-500"},
                    {label:isRtl?"نسبة إتمام المشاريع":"Project Completion Rate",value:82,color:"bg-blue-500"},
                    {label:isRtl?"رضا العملاء":"Client Satisfaction",value:91,color:"bg-purple-500"},
                    {label:isRtl?"نسبة التحصيل":"Collection Rate",value:88,color:"bg-amber-500"},
                    {label:isRtl?"كفاءة الفريق":"Team Efficiency",value:79,color:"bg-cyan-500"},
                  ].map((kpi,i)=>(
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-1.5"><span className="text-muted-foreground">{kpi.label}</span><span className="font-bold">{kpi.value}%</span></div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden"><div className={cn("h-full rounded-full transition-all",kpi.color)} style={{width:`${kpi.value}%`}}/></div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="clients" className="mt-4">
            <Card className="border-border/50">
              <CardHeader className="pb-2"><CardTitle className="text-sm">{isRtl?"أفضل العملاء حسب الإيرادات":"Top Clients by Revenue"} {period}</CardTitle></CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="space-y-4">
                  {TOP_CLIENTS.map((c,i)=>{
                    const pct=Math.round((c.value/TOP_CLIENTS[0].value)*100);
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="w-5 text-xs font-bold text-muted-foreground text-center">#{i+1}</span>
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary text-sm shrink-0">{c.name[0]}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-medium text-sm truncate">{isRtl?c.name:c.en}</span>
                            <span className="font-bold text-sm ms-2 shrink-0">{(c.value/1000).toFixed(0)}K</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full" style={{width:`${pct}%`}}/></div>
                            <span className="text-xs text-muted-foreground shrink-0">{c.deals} {isRtl?"صفقة":"deals"}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
