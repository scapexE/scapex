import { MainLayout } from "@/components/layout/MainLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PieChart, BarChart3, TrendingUp, TrendingDown, DollarSign, Users, Briefcase, Download, RefreshCw, ArrowUpRight, ArrowDownRight, AlertTriangle, Package, Truck, ShieldAlert, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useCallback } from "react";
import { scopedFetch } from "@/lib/queryClient";
import { AIInsightsPanel } from "@/components/shared/AIInsightsPanel";

interface Analytics {
  employees: { total: number; active: number };
  projects: { total: number; active: number };
  incidents: { total: number; open: number };
  inventory: { items: number; totalValue: number; lowStock: number };
  purchases: { vendors: number; orders: number; totalValue: number };
  assets: { total: number; active: number };
  clients: { total: number };
  permits: { total: number; expiring: number };
  alerts: { expiringPermits: number; expiringAssets: number; lowStockItems: number; openIncidents: number };
}

interface MonthlyRevenue { month: string; monthAr?: string; value: number; }
interface ServiceBreakdownItem { label: string; labelAr?: string; value: number; color?: string; }
interface Finance {
  totalRevenue: number;
  outstanding: number;
  monthlyRevenue: MonthlyRevenue[];
  serviceBreakdown: ServiceBreakdownItem[];
}

const BREAKDOWN_COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6", "#06b6d4", "#ec4899"];

const fmtMoney = (n: number) =>
  n >= 1_000_000 ? (n / 1_000_000).toFixed(2) + "M" :
  n >= 1_000 ? (n / 1_000).toFixed(0) + "K" :
  (n || 0).toLocaleString("en-SA");

export default function BIModule() {
  const { dir } = useLanguage(); const isRtl = dir === "rtl";
  const [period, setPeriod] = useState("2026");
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [finance, setFinance] = useState<Finance | null>(null);
  const [loading, setLoading] = useState(true);
  const monthly = finance?.monthlyRevenue ?? [];
  const breakdown = finance?.serviceBreakdown ?? [];
  const maxRevenue = monthly.length ? Math.max(...monthly.map(m => m.value)) : 0;
  const annualTotal = monthly.reduce((s, m) => s + m.value, 0);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const [sumRes, finRes] = await Promise.all([
        scopedFetch("/api/analytics/summary"),
        scopedFetch("/api/analytics/finance"),
      ]);
      if (sumRes.ok) setAnalytics(await sumRes.json());
      if (finRes.ok) setFinance(await finRes.json());
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  const a = analytics;
  const totalAlerts = a ? a.alerts.expiringPermits + a.alerts.expiringAssets + a.alerts.lowStockItems + a.alerts.openIncidents : 0;

  const kpis = [
    { label: "Total Revenue", labelAr: "إجمالي الإيرادات", value: finance ? fmtMoney(finance.totalRevenue) : "—", change: 0, unit: "SAR", trend: "up" as const, icon: DollarSign, color: "text-emerald-500" },
    { label: "Active Projects", labelAr: "مشاريع نشطة", value: a ? String(a.projects.active) : "—", change: 0, unit: "", trend: "up" as const, icon: Briefcase, color: "text-blue-500" },
    { label: "Total Employees", labelAr: "إجمالي الموظفين", value: a ? String(a.employees.total) : "—", change: 0, unit: "", trend: "up" as const, icon: Users, color: "text-purple-500" },
    { label: "Total Clients", labelAr: "إجمالي العملاء", value: a ? String(a.clients.total) : "—", change: 0, unit: "", trend: "up" as const, icon: TrendingUp, color: "text-amber-500" },
    { label: "Inventory Value", labelAr: "قيمة المخزون", value: a ? `${(a.inventory.totalValue / 1000).toFixed(0)}K` : "—", change: 0, unit: "SAR", trend: "up" as const, icon: Package, color: "text-cyan-500" },
    { label: "Open Incidents", labelAr: "حوادث مفتوحة", value: a ? String(a.incidents.open) : "—", change: 0, unit: "", trend: a && a.incidents.open > 0 ? "down" as const : "up" as const, icon: ShieldAlert, color: a && a.incidents.open > 0 ? "text-red-500" : "text-emerald-500" },
  ];

  return (
    <MainLayout>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{isRtl ? "تحليلات الأعمال (BI)" : "Business Intelligence"}</h1>
            <p className="text-muted-foreground text-sm mt-1">{isRtl ? "لوحات التقارير، مؤشرات الأداء، وتحليل البيانات الحية" : "Performance dashboards, KPIs, and live data analytics"}</p>
          </div>
          <div className="flex gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-28 h-9 bg-secondary/30"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="2026">2026</SelectItem><SelectItem value="2025">2025</SelectItem></SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={fetchAnalytics}><RefreshCw className={cn("w-4 h-4 me-1.5", loading && "animate-spin")} />{isRtl ? "تحديث" : "Refresh"}</Button>
            <Button variant="outline" size="sm"><Download className="w-4 h-4 me-1.5" />{isRtl ? "تصدير" : "Export"}</Button>
          </div>
        </div>

        {/* Alerts Banner */}
        {totalAlerts > 0 && (
          <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <span className="flex items-center gap-1 text-sm text-amber-700 dark:text-amber-300 font-medium"><AlertTriangle className="w-4 h-4" />{isRtl ? "تنبيهات تحتاج انتباهاً:" : "Alerts requiring attention:"}</span>
            {a && a.alerts.expiringPermits > 0 && <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">{a.alerts.expiringPermits} {isRtl ? "تصاريح منتهية" : "permits expiring"}</Badge>}
            {a && a.alerts.lowStockItems > 0 && <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">{a.alerts.lowStockItems} {isRtl ? "أصناف منخفضة" : "low stock items"}</Badge>}
            {a && a.alerts.openIncidents > 0 && <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">{a.alerts.openIncidents} {isRtl ? "حوادث مفتوحة" : "open incidents"}</Badge>}
            {a && a.alerts.expiringAssets > 0 && <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">{a.alerts.expiringAssets} {isRtl ? "أصول تحتاج صيانة" : "assets due maintenance"}</Badge>}
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {kpis.map((k, i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className={cn("w-8 h-8 rounded-lg bg-secondary flex items-center justify-center", k.color)}><k.icon className="w-4 h-4" /></div>
                  {k.change !== 0 && (
                    <div className={cn("flex items-center gap-0.5 text-xs", k.trend === "up" ? "text-emerald-500" : "text-red-500")}>
                      {k.trend === "up" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {Math.abs(k.change)}%
                    </div>
                  )}
                </div>
                <p className="text-xl font-bold">{k.value}</p>
                {k.unit && <p className="text-xs text-muted-foreground">{k.unit}</p>}
                <p className="text-xs text-muted-foreground mt-0.5">{isRtl ? k.labelAr : k.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <AIInsightsPanel modules={["bi", "finance", "sales", "crm"]} />

        <Tabs defaultValue="overview">
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="overview">{isRtl ? "نظرة عامة" : "Overview"}</TabsTrigger>
            <TabsTrigger value="modules">{isRtl ? "الوحدات" : "Modules"}</TabsTrigger>
            <TabsTrigger value="revenue">{isRtl ? "الإيرادات" : "Revenue"}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-4">
            {/* Module Summary Cards */}
            {a && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: isRtl ? "الموظفون" : "Employees", sub: isRtl ? `${a.employees.active} نشط` : `${a.employees.active} active`, value: a.employees.total, icon: Users, color: "bg-blue-100 dark:bg-blue-900/30 text-blue-600" },
                  { label: isRtl ? "المشاريع" : "Projects", sub: isRtl ? `${a.projects.active} نشط` : `${a.projects.active} active`, value: a.projects.total, icon: Briefcase, color: "bg-purple-100 dark:bg-purple-900/30 text-purple-600" },
                  { label: isRtl ? "المخزون" : "Inventory", sub: isRtl ? `${a.inventory.lowStock} منخفض` : `${a.inventory.lowStock} low`, value: a.inventory.items, icon: Package, color: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600" },
                  { label: isRtl ? "الأصول" : "Assets", sub: isRtl ? `${a.assets.active} نشط` : `${a.assets.active} active`, value: a.assets.total, icon: Settings, color: "bg-amber-100 dark:bg-amber-900/30 text-amber-600" },
                  { label: isRtl ? "الموردون" : "Vendors", sub: isRtl ? `${a.purchases.orders} أمر شراء` : `${a.purchases.orders} POs`, value: a.purchases.vendors, icon: Truck, color: "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600" },
                  { label: isRtl ? "العملاء" : "Clients", sub: isRtl ? "في السجل" : "in database", value: a.clients.total, icon: Users, color: "bg-pink-100 dark:bg-pink-900/30 text-pink-600" },
                  { label: isRtl ? "الحوادث" : "Incidents", sub: isRtl ? `${a.incidents.open} مفتوح` : `${a.incidents.open} open`, value: a.incidents.total, icon: ShieldAlert, color: "bg-red-100 dark:bg-red-900/30 text-red-600" },
                  { label: isRtl ? "التصاريح" : "Permits", sub: isRtl ? `${a.permits.expiring} تنتهي قريباً` : `${a.permits.expiring} expiring`, value: a.permits.total, icon: BarChart3, color: "bg-orange-100 dark:bg-orange-900/30 text-orange-600" },
                ].map((m, i) => (
                  <Card key={i} className="border-border/50">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", m.color)}><m.icon className="w-5 h-5" /></div>
                      <div><p className="text-xl font-bold">{m.value}</p><p className="text-xs font-medium">{m.label}</p><p className="text-xs text-muted-foreground">{m.sub}</p></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="modules" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Service Breakdown */}
              <Card className="border-border/50">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">{isRtl ? "توزيع الخدمات" : "Service Breakdown"}</CardTitle></CardHeader>
                <CardContent>
                  {breakdown.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">{isRtl ? "لا توجد بيانات" : "No data available"}</p>
                  ) : (
                    <div className="space-y-3">
                      {breakdown.map((s, i) => {
                        const color = s.color || BREAKDOWN_COLORS[i % BREAKDOWN_COLORS.length];
                        return (
                          <div key={i} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ background: color }} />
                                <span>{isRtl ? (s.labelAr || s.label) : s.label}</span>
                              </div>
                              <span className="font-semibold">{s.value}%</span>
                            </div>
                            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${s.value}%`, background: color }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Operations Health */}
              {a && (
                <Card className="border-border/50">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">{isRtl ? "صحة التشغيل" : "Operations Health"}</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { label: isRtl ? "نشاط الموظفين" : "Employee Activity", value: a.employees.total > 0 ? Math.round((a.employees.active / a.employees.total) * 100) : 0, color: "bg-emerald-500" },
                      { label: isRtl ? "إنجاز المشاريع" : "Project Activity", value: a.projects.total > 0 ? Math.round((a.projects.active / a.projects.total) * 100) : 0, color: "bg-blue-500" },
                      { label: isRtl ? "مستوى المخزون" : "Stock Health", value: a.inventory.items > 0 ? Math.round(((a.inventory.items - a.inventory.lowStock) / a.inventory.items) * 100) : 100, color: "bg-purple-500" },
                      { label: isRtl ? "جاهزية الأصول" : "Asset Readiness", value: a.assets.total > 0 ? Math.round((a.assets.active / a.assets.total) * 100) : 0, color: "bg-amber-500" },
                    ].map((m, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-sm"><span>{m.label}</span><span className="font-semibold">{m.value}%</span></div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full transition-all", m.color)} style={{ width: `${m.value}%` }} />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="revenue" className="mt-4">
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">{isRtl ? "الإيرادات الشهرية" : "Monthly Revenue"} — {period}</CardTitle>
                  <span className="text-xs text-muted-foreground">{isRtl ? "بالريال السعودي" : "SAR"}</span>
                </div>
              </CardHeader>
              <CardContent>
                {monthly.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-10 text-center">{isRtl ? "لا توجد بيانات إيرادات" : "No revenue data available"}</p>
                ) : (
                  <>
                    <div className="flex items-end gap-1 h-40">
                      {monthly.map((m, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full rounded-t-sm bg-primary/70 hover:bg-primary transition-colors cursor-pointer relative group" style={{ height: `${maxRevenue > 0 ? (m.value / maxRevenue) * 100 : 0}%` }}>
                            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-10">
                              {fmtMoney(m.value)} SAR
                            </div>
                          </div>
                          <span className="text-[9px] text-muted-foreground">{(isRtl ? (m.monthAr || m.month) : m.month).slice(0, 3)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-3 pt-3 border-t">
                      <span>{isRtl ? "إجمالي السنة" : "Annual Total"}: <strong>{annualTotal.toLocaleString()} {isRtl ? "ر.س" : "SAR"}</strong></span>
                      <span>{isRtl ? "المتوسط الشهري" : "Monthly Avg"}: <strong>{fmtMoney(annualTotal / monthly.length)} {isRtl ? "ر.س" : "SAR"}</strong></span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
