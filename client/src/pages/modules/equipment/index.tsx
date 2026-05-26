import { useState, useEffect, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Settings, Plus, Search, Truck, AlertTriangle, Wrench, Edit, Trash2,
  MapPin, Calendar, Loader2, ClipboardCheck, BarChart3, TrendingDown,
  Shield, FolderOpen, DollarSign, X, Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";

interface Asset {
  id: string; assetNo: string; nameAr: string; nameEn: string; category: string;
  brand: string; model: string; serial: string; plate?: string;
  location: string; assignedTo: string; purchaseDate: string; purchaseCost: number;
  lastMaintenance: string; nextMaintenance: string; insuranceExpiry?: string;
  projectId?: string; projectName?: string;
  status: "active" | "maintenance" | "out_of_service" | "rented";
}

interface MaintenanceLog {
  id: string; assetId: string; assetName: string; type: "preventive" | "corrective";
  date: string; cost: number; technician: string; description: string; nextDate: string;
  vendor?: string;
}

interface EquipmentAnalytics {
  kpis: {
    total: number; active: number; inMaintenance: number; outOfService: number;
    dueSoon30: number; dueSoon90: number; totalPurchaseCost: number;
    totalMaintenanceCost: number; insuranceExpiring: number;
  };
  months: { label: string; cost: number; count: number }[];
  depreciationData: { id: number; name: string; purchaseCost: number; currentValue: number; depreciation: number; depreciationPct: number }[];
  byStatus: { status: string; count: number; label: string }[];
}

const CATS = [
  { id: "vehicle", ar: "مركبات", en: "Vehicles" },
  { id: "heavy", ar: "معدات ثقيلة", en: "Heavy Equipment" },
  { id: "survey", ar: "أجهزة مساحة", en: "Survey Instruments" },
  { id: "safety", ar: "معدات السلامة", en: "Safety Equipment" },
  { id: "it", ar: "أجهزة تقنية", en: "IT Assets" },
  { id: "office", ar: "أثاث مكتبي", en: "Office Furniture" },
  { id: "other", ar: "أخرى", en: "Other" },
];

const SEED_ASSETS: Asset[] = [
  { id: "s1", assetNo: "AST-001", nameAr: "سيارة تويوتا لاندكروزر", nameEn: "Toyota Land Cruiser", category: "vehicle", brand: "Toyota", model: "Land Cruiser 200", serial: "JT3HB18V2S0123456", plate: "أ ب ج 1234", location: "الرياض", assignedTo: "أحمد الغامدي", purchaseDate: "2022-06-15", purchaseCost: 280000, lastMaintenance: "2025-12-01", nextMaintenance: "2026-06-01", status: "active" },
  { id: "s2", assetNo: "AST-002", nameAr: "سيارة فورد F-150", nameEn: "Ford F-150 Pickup", category: "vehicle", brand: "Ford", model: "F-150 XLT", serial: "1FTFW1ETXKFB12345", plate: "د هـ و 5678", location: "جدة", assignedTo: "محمد الزهراني", purchaseDate: "2023-01-20", purchaseCost: 195000, lastMaintenance: "2026-01-15", nextMaintenance: "2026-07-15", status: "active" },
  { id: "s3", assetNo: "AST-003", nameAr: "جهاز مسح توبكون", nameEn: "Topcon Total Station", category: "survey", brand: "Topcon", model: "OS-105", serial: "TC-2024-00123", plate: "", location: "موقع الرياض", assignedTo: "Rajesh Kumar", purchaseDate: "2021-09-10", purchaseCost: 85000, lastMaintenance: "2025-09-10", nextMaintenance: "2026-03-10", status: "maintenance" },
];

const SEED_MAINT: MaintenanceLog[] = [
  { id: "m1", assetId: "s1", assetName: "Toyota Land Cruiser", type: "preventive", date: "2025-12-01", cost: 1200, technician: "ورشة النجم", description: "تغيير زيت ومرشحات", nextDate: "2026-06-01" },
];

function mapAsset(r: any): Asset {
  return {
    id: String(r.id),
    assetNo: r.assetCode || r.assetNo || `AST-${r.id}`,
    nameAr: r.nameAr || "",
    nameEn: r.nameEn || r.nameAr || "",
    category: r.category || "vehicle",
    brand: r.brand || "",
    model: r.model || "",
    serial: r.serialNumber || r.serial || "",
    plate: r.plateNumber || r.plate || "",
    location: r.location || "",
    assignedTo: r.assignedTo || "",
    purchaseDate: r.purchaseDate || "",
    purchaseCost: parseFloat(r.purchaseCost || "0") || 0,
    lastMaintenance: r.lastMaintenanceDate || r.lastMaintenance || "",
    nextMaintenance: r.nextMaintenanceDate || r.nextMaintenance || "",
    insuranceExpiry: r.insuranceExpiry || "",
    projectId: r.projectId ? String(r.projectId) : "",
    status: (r.status === "available" ? "active" : r.status) || "active",
  };
}

function mapMaint(r: any): MaintenanceLog {
  return {
    id: String(r.id),
    assetId: String(r.assetId),
    assetName: r.assetName || "",
    type: r.type || "preventive",
    date: r.date || "",
    cost: parseFloat(r.cost || "0") || 0,
    technician: r.technician || "",
    description: r.description || "",
    nextDate: r.nextDate || "",
    vendor: r.vendor || "",
  };
}

function formatSAR(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 864e5);
}

// ─── Analytics Dashboard ──────────────────────────────────────────────────────
function EquipmentDashboard({ assets, maintenance, isRtl }: { assets: Asset[]; maintenance: MaintenanceLog[]; isRtl: boolean }) {
  const [analytics, setAnalytics] = useState<EquipmentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/assets/analytics")
      .then(r => r.ok ? r.json() : null)
      .then(d => { setAnalytics(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [assets.length, maintenance.length]);

  if (loading) return <div className="text-center py-20 text-muted-foreground text-sm">{isRtl ? "جارٍ التحميل..." : "Loading..."}</div>;
  if (!analytics) {
    // Fallback: compute locally
    const totalCost = assets.reduce((s, a) => s + a.purchaseCost, 0);
    const maintCost = maintenance.reduce((s, m) => s + m.cost, 0);
    const now = new Date();
    const in30 = new Date(now); in30.setDate(in30.getDate() + 30);
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: isRtl ? "إجمالي الأصول" : "Total Assets", value: assets.length, color: "text-blue-500" },
          { label: isRtl ? "نشطة" : "Active", value: assets.filter(a => a.status === "active").length, color: "text-emerald-500" },
          { label: isRtl ? "قيمة الأصول" : "Asset Value", value: formatSAR(totalCost) + (isRtl ? " ر.س" : " SAR"), color: "text-purple-500" },
          { label: isRtl ? "تكاليف الصيانة" : "Maintenance Costs", value: formatSAR(maintCost) + (isRtl ? " ر.س" : " SAR"), color: "text-amber-500" },
        ].map((k, i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-4"><p className="text-xs text-muted-foreground">{k.label}</p><p className={cn("text-xl font-bold", k.color)}>{k.value}</p></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const { kpis, months, depreciationData, byStatus } = analytics;
  const maxMonthCost = Math.max(...months.map(m => m.cost), 1);

  return (
    <div className="space-y-5">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: isRtl ? "إجمالي الأصول" : "Total Assets", value: kpis.total, icon: Truck, color: "text-blue-500 bg-blue-500/10" },
          { label: isRtl ? "نشطة" : "Active", value: kpis.active, icon: Settings, color: "text-emerald-500 bg-emerald-500/10" },
          { label: isRtl ? "في الصيانة" : "In Maintenance", value: kpis.inMaintenance, icon: Wrench, color: "text-amber-500 bg-amber-500/10" },
          { label: isRtl ? "صيانة خلال 30 يوم" : "Maintenance Due (30d)", value: kpis.dueSoon30, icon: AlertTriangle, color: "text-red-500 bg-red-500/10" },
        ].map((k, i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", k.color.split(" ").slice(1).join(" "))}>
                <k.icon className={cn("w-5 h-5", k.color.split(" ")[0])} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className="text-2xl font-bold tabular-nums">{k.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Cost Summary */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              {isRtl ? "ملخص التكاليف" : "Cost Summary"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-border/40">
              <span className="text-xs text-muted-foreground">{isRtl ? "إجمالي تكلفة الشراء" : "Total Purchase Cost"}</span>
              <span className="font-bold text-sm">{formatSAR(kpis.totalPurchaseCost)} {isRtl ? "ر.س" : "SAR"}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/40">
              <span className="text-xs text-muted-foreground">{isRtl ? "إجمالي تكاليف الصيانة" : "Total Maintenance Cost"}</span>
              <span className="font-bold text-sm text-amber-600">{formatSAR(kpis.totalMaintenanceCost)} {isRtl ? "ر.س" : "SAR"}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/40">
              <span className="text-xs text-muted-foreground">{isRtl ? "تأمين ينتهي قريباً" : "Insurance Expiring (30d)"}</span>
              <Badge variant={kpis.insuranceExpiring > 0 ? "destructive" : "secondary"}>{kpis.insuranceExpiring}</Badge>
            </div>
            <div className="pt-1 grid grid-cols-2 gap-2">
              <div className="text-center p-2 rounded-lg bg-secondary/50">
                <p className="text-lg font-bold text-blue-500">{kpis.dueSoon90}</p>
                <p className="text-[10px] text-muted-foreground">{isRtl ? "صيانة خلال 90 يوم" : "Due in 90 days"}</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-secondary/50">
                <p className="text-lg font-bold text-red-500">{kpis.outOfService}</p>
                <p className="text-[10px] text-muted-foreground">{isRtl ? "خارج الخدمة" : "Out of Service"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Maintenance cost chart */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-500" />
              {isRtl ? "تكاليف الصيانة (6 أشهر)" : "Maintenance Costs (6 Months)"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1.5 h-28 mt-2">
              {months.map((m, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-t-sm bg-primary/80 transition-all"
                    style={{ height: `${Math.max(4, (m.cost / maxMonthCost) * 100)}%` }}
                    title={`${m.cost.toLocaleString()} SAR`} />
                  <span className="text-[9px] text-muted-foreground">{m.label}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground border-t border-border/40 pt-2">
              <span>{isRtl ? "إجمالي 6 أشهر:" : "6-Month Total:"}</span>
              <span className="font-semibold">{formatSAR(months.reduce((s, m) => s + m.cost, 0))} {isRtl ? "ر.س" : "SAR"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Status breakdown */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Settings className="w-4 h-4 text-purple-500" />
              {isRtl ? "توزيع الحالات" : "Status Breakdown"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {byStatus.map(s => (
              <div key={s.status}>
                <div className="flex justify-between text-xs mb-1">
                  <span>{s.label}</span>
                  <span className="font-semibold">{s.count}</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full", {
                    available: "bg-emerald-500", maintenance: "bg-amber-500",
                    out_of_service: "bg-red-500", rented: "bg-blue-500",
                  }[s.status] || "bg-slate-500")}
                    style={{ width: kpis.total ? `${Math.round((s.count / kpis.total) * 100)}%` : "0%" }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Depreciation Table */}
      {depreciationData.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-500" />
              {isRtl ? "تقرير الإهلاك التلقائي (القسط الثابت — 10 سنوات)" : "Depreciation Report (Straight-Line — 10 Years)"}
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-secondary/40">
                <TableRow>
                  <TableHead>{isRtl ? "الأصل" : "Asset"}</TableHead>
                  <TableHead>{isRtl ? "تكلفة الشراء" : "Purchase Cost"}</TableHead>
                  <TableHead>{isRtl ? "القيمة الحالية" : "Current Value"}</TableHead>
                  <TableHead>{isRtl ? "الإهلاك المتراكم" : "Accumulated Depreciation"}</TableHead>
                  <TableHead>{isRtl ? "نسبة الإهلاك" : "Dep. %"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {depreciationData.map(d => (
                  <TableRow key={d.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium text-sm">{d.name}</TableCell>
                    <TableCell className="text-sm tabular-nums">{formatSAR(d.purchaseCost)} {isRtl ? "ر.س" : "SAR"}</TableCell>
                    <TableCell className="text-sm tabular-nums text-emerald-600">{formatSAR(d.currentValue)} {isRtl ? "ر.س" : "SAR"}</TableCell>
                    <TableCell className="text-sm tabular-nums text-red-500">({formatSAR(d.depreciation)} {isRtl ? "ر.س" : "SAR"})</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-red-400 rounded-full" style={{ width: `${d.depreciationPct}%` }} />
                        </div>
                        <span className="text-xs font-medium">{d.depreciationPct}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Asset Detail Drawer ──────────────────────────────────────────────────────
function AssetDetailDrawer({ asset, maintenance, projects, isRtl, onClose, onEdit }: {
  asset: Asset; maintenance: MaintenanceLog[]; projects: { id: string; nameAr: string; nameEn: string }[];
  isRtl: boolean; onClose: () => void; onEdit: () => void;
}) {
  const assetMaint = maintenance.filter(m => m.assetId === asset.id);
  const totalMaintCost = assetMaint.reduce((s, m) => s + m.cost, 0);
  const now = new Date();
  const insuranceDays = asset.insuranceExpiry ? daysUntil(asset.insuranceExpiry) : null;
  const maintDays = asset.nextMaintenance ? daysUntil(asset.nextMaintenance) : null;
  const project = projects.find(p => p.id === asset.projectId);

  // Depreciation
  const depPct = asset.purchaseDate
    ? Math.min(100, Math.round(((now.getTime() - new Date(asset.purchaseDate).getTime()) / (365.25 * 864e5)) / 10 * 100))
    : 0;
  const currentValue = Math.max(0, asset.purchaseCost * (1 - depPct / 100));

  const catLabel = CATS.find(c => c.id === asset.category);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-xl bg-background border-s border-border shadow-xl overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/50 sticky top-0 bg-background z-10">
          <div>
            <h2 className="font-bold text-lg">{isRtl ? asset.nameAr : asset.nameEn}</h2>
            <p className="text-xs text-muted-foreground font-mono">{asset.assetNo}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={onEdit}><Edit className="w-4 h-4 mr-1 rtl:ml-1 rtl:mr-0" />{isRtl ? "تعديل" : "Edit"}</Button>
            <Button size="icon" variant="ghost" onClick={onClose}><X className="w-4 h-4" /></Button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Status badge */}
          <div className="flex flex-wrap gap-2">
            <Badge className={cn({
              "bg-emerald-500 text-white": asset.status === "active",
              "bg-amber-500 text-white": asset.status === "maintenance",
              "bg-red-500 text-white": asset.status === "out_of_service",
              "bg-blue-500 text-white": asset.status === "rented",
            })}>
              {asset.status === "active" ? (isRtl ? "نشط" : "Active") :
               asset.status === "maintenance" ? (isRtl ? "في الصيانة" : "In Maintenance") :
               asset.status === "out_of_service" ? (isRtl ? "خارج الخدمة" : "Out of Service") :
               (isRtl ? "مؤجر" : "Rented")}
            </Badge>
            <Badge variant="outline">{isRtl ? catLabel?.ar : catLabel?.en}</Badge>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: isRtl ? "الماركة / الطراز" : "Brand / Model", value: `${asset.brand} ${asset.model}`.trim() || "—" },
              { label: isRtl ? "الرقم التسلسلي" : "Serial No.", value: asset.serial || "—" },
              { label: isRtl ? "رقم اللوحة" : "Plate No.", value: asset.plate || "—" },
              { label: isRtl ? "الموقع" : "Location", value: asset.location || "—" },
              { label: isRtl ? "المكلف به" : "Assigned To", value: asset.assignedTo || "—" },
              { label: isRtl ? "تاريخ الشراء" : "Purchase Date", value: asset.purchaseDate || "—" },
            ].map((info, i) => (
              <div key={i} className="bg-secondary/30 rounded-lg p-2.5">
                <p className="text-[10px] text-muted-foreground">{info.label}</p>
                <p className="text-sm font-medium mt-0.5">{info.value}</p>
              </div>
            ))}
          </div>

          {/* Project linkage */}
          {project && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <FolderOpen className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">{isRtl ? "المشروع المرتبط" : "Linked Project"}</p>
                <p className="text-sm font-medium">{isRtl ? project.nameAr : project.nameEn}</p>
              </div>
            </div>
          )}

          {/* Financial */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">{isRtl ? "المعلومات المالية" : "Financial Info"}</h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-secondary/30 rounded-lg p-2.5 text-center">
                <p className="text-[10px] text-muted-foreground">{isRtl ? "تكلفة الشراء" : "Purchase Cost"}</p>
                <p className="text-sm font-bold">{formatSAR(asset.purchaseCost)}</p>
              </div>
              <div className="bg-secondary/30 rounded-lg p-2.5 text-center">
                <p className="text-[10px] text-muted-foreground">{isRtl ? "القيمة الحالية" : "Current Value"}</p>
                <p className="text-sm font-bold text-emerald-600">{formatSAR(currentValue)}</p>
              </div>
              <div className="bg-secondary/30 rounded-lg p-2.5 text-center">
                <p className="text-[10px] text-muted-foreground">{isRtl ? "تكاليف صيانة" : "Maint. Costs"}</p>
                <p className="text-sm font-bold text-amber-600">{formatSAR(totalMaintCost)}</p>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">{isRtl ? "الإهلاك" : "Depreciation"}</span>
                <span>{depPct}%</span>
              </div>
              <Progress value={depPct} className="h-1.5" />
            </div>
          </div>

          {/* Maintenance & Insurance alerts */}
          <div className="space-y-2">
            {maintDays !== null && (
              <div className={cn("flex items-center gap-2 p-3 rounded-lg text-sm",
                maintDays <= 0 ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300" :
                maintDays <= 30 ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300" :
                "bg-secondary/50 border border-border/40")}>
                <Wrench className="w-4 h-4 flex-shrink-0" />
                <div>
                  <p className="font-medium text-xs">{isRtl ? "الصيانة القادمة" : "Next Maintenance"}</p>
                  <p className="text-xs">{asset.nextMaintenance} {maintDays <= 0 ? (isRtl ? "(متأخر!)" : "(overdue!)") : `(${maintDays} ${isRtl ? "يوم" : "days"})`}</p>
                </div>
              </div>
            )}
            {insuranceDays !== null && asset.insuranceExpiry && (
              <div className={cn("flex items-center gap-2 p-3 rounded-lg text-sm",
                insuranceDays <= 0 ? "bg-red-50 dark:bg-red-900/20 border border-red-200 text-red-700 dark:text-red-300" :
                insuranceDays <= 30 ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 text-amber-700 dark:text-amber-300" :
                "bg-secondary/50 border border-border/40")}>
                <Shield className="w-4 h-4 flex-shrink-0" />
                <div>
                  <p className="font-medium text-xs">{isRtl ? "انتهاء التأمين" : "Insurance Expiry"}</p>
                  <p className="text-xs">{asset.insuranceExpiry} {insuranceDays <= 0 ? (isRtl ? "(منتهي!)" : "(expired!)") : `(${insuranceDays} ${isRtl ? "يوم" : "days"})`}</p>
                </div>
              </div>
            )}
          </div>

          {/* Maintenance History */}
          {assetMaint.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2">{isRtl ? "سجل الصيانة" : "Maintenance History"} ({assetMaint.length})</h3>
              <div className="space-y-2">
                {assetMaint.slice(0, 5).map(m => (
                  <div key={m.id} className="flex items-center justify-between p-2.5 border border-border/50 rounded-lg text-xs">
                    <div>
                      <p className="font-medium">{m.description || (isRtl ? "صيانة" : "Maintenance")}</p>
                      <p className="text-muted-foreground">{m.date} — {m.technician}</p>
                    </div>
                    <div className="text-end">
                      <Badge variant={m.type === "preventive" ? "default" : "destructive"} className="text-[10px]">
                        {m.type === "preventive" ? (isRtl ? "وقائية" : "Prev.") : (isRtl ? "علاجية" : "Corr.")}
                      </Badge>
                      <p className="text-muted-foreground mt-1">{m.cost.toLocaleString()} {isRtl ? "ر.س" : "SAR"}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Module ──────────────────────────────────────────────────────────────
export default function EquipmentModule() {
  const { dir } = useLanguage(); const isRtl = dir === "rtl";
  const { toast } = useToast();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceLog[]>([]);
  const [projects, setProjects] = useState<{ id: string; nameAr: string; nameEn: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(""); const [catFilter, setCatFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("assets");
  const [assetFilter, setAssetFilter] = useState("");
  const [showDialog, setShowDialog] = useState(false); const [editAsset, setEditAsset] = useState<Asset | null>(null);
  const [form, setForm] = useState<Partial<Asset & { insuranceExpiry: string; projectId: string }>>({});
  const [showMaintDialog, setShowMaintDialog] = useState(false);
  const [maintForm, setMaintForm] = useState<Partial<MaintenanceLog & { assetId: string }>>({});
  const [saving, setSaving] = useState(false);
  const [viewAsset, setViewAsset] = useState<Asset | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    const asset = params.get("asset");
    if (tab) setActiveTab(tab);
    if (asset) setAssetFilter(asset);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [aRes, mRes, pRes] = await Promise.all([
        fetch("/api/assets"),
        fetch("/api/maintenance-records"),
        fetch("/api/projects").catch(() => ({ ok: false, json: async () => [] })),
      ]);
      const aData = await aRes.json();
      const mData = await mRes.json();
      const pData = pRes.ok ? await pRes.json() : [];

      if (Array.isArray(pData)) {
        setProjects(pData.map((p: any) => ({ id: String(p.id), nameAr: p.nameAr || "", nameEn: p.nameEn || p.nameAr || "" })));
      }

      if (Array.isArray(aData) && aData.length > 0) {
        setAssets(aData.map(mapAsset));
      } else {
        const legacy = localStorage.getItem("scapex_assets");
        const src = legacy ? JSON.parse(legacy) : SEED_ASSETS;
        for (const a of src) {
          await fetch("/api/assets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assetCode: a.assetNo, nameAr: a.nameAr, nameEn: a.nameEn, brand: a.brand, model: a.model, serial: a.serial, plate: a.plate, location: a.location, purchaseDate: a.purchaseDate, purchaseCost: a.purchaseCost, status: a.status === "active" ? "available" : a.status, lastMaintenance: a.lastMaintenance, nextMaintenance: a.nextMaintenance }) });
        }
        if (legacy) localStorage.removeItem("scapex_assets");
        const r2 = await fetch("/api/assets");
        setAssets((await r2.json()).map(mapAsset));
      }

      if (Array.isArray(mData) && mData.length > 0) {
        setMaintenance(mData.map(mapMaint));
      } else {
        const legacyM = localStorage.getItem("scapex_maintenance");
        if (legacyM) {
          const src = JSON.parse(legacyM);
          for (const m of src) await fetch("/api/maintenance-records", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(m) });
          localStorage.removeItem("scapex_maintenance");
        } else {
          for (const m of SEED_MAINT) await fetch("/api/maintenance-records", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assetId: 1, type: m.type, date: m.date, description: m.description, cost: m.cost, technician: m.technician, nextDate: m.nextDate }) }).catch(() => {});
        }
        const r2 = await fetch("/api/maintenance-records");
        setMaintenance((await r2.json()).map(mapMaint));
      }
    } catch { toast({ title: isRtl ? "خطأ في التحميل" : "Load error", variant: "destructive" }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = assets.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = !q || a.nameAr.includes(q) || a.nameEn.toLowerCase().includes(q) || a.assetNo.toLowerCase().includes(q) || (a.plate || "").includes(q);
    const matchCat = catFilter === "all" || a.category === catFilter;
    const matchStatus = statusFilter === "all" || a.status === statusFilter;
    return matchSearch && matchCat && matchStatus;
  });

  const nearMaint = assets.filter(a => {
    if (!a.nextMaintenance) return false;
    const d = new Date(a.nextMaintenance); const now = new Date();
    return (d.getTime() - now.getTime()) < 30 * 864e5 && a.status === "active";
  });

  const stats = { total: assets.length, active: assets.filter(a => a.status === "active").length, maintenance: assets.filter(a => a.status === "maintenance").length, nearMaint: nearMaint.length };

  const catLabel = (id: string) => { const c = CATS.find(x => x.id === id); return c ? (isRtl ? c.ar : c.en) : id; };
  const statusLabel = (s: string) => ({ active: isRtl ? "نشط" : "Active", maintenance: isRtl ? "صيانة" : "In Maintenance", out_of_service: isRtl ? "خارج الخدمة" : "Out of Service", rented: isRtl ? "مؤجر" : "Rented" }[s] || s);
  const statusClass = (s: string) => ({ active: "bg-emerald-500 text-white", maintenance: "bg-amber-500 text-white", out_of_service: "bg-red-500 text-white", rented: "bg-blue-500 text-white" }[s] || "");

  const openAdd = () => {
    setEditAsset(null);
    setForm({ category: "vehicle", status: "active", purchaseDate: new Date().toISOString().split("T")[0] });
    setShowDialog(true);
  };
  const openEdit = (a: Asset) => {
    setEditAsset(a);
    setForm({ ...a, insuranceExpiry: a.insuranceExpiry || "", projectId: a.projectId || "" });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.nameAr || !form.assetNo) { toast({ title: isRtl ? "ادخل البيانات المطلوبة" : "Fill required fields", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const payload = {
        assetCode: form.assetNo, nameAr: form.nameAr, nameEn: form.nameEn,
        brand: form.brand, model: form.model, serialNumber: form.serial, plateNumber: form.plate,
        location: form.location, assignedTo: form.assignedTo,
        purchaseDate: form.purchaseDate, purchaseCost: form.purchaseCost,
        status: form.status === "active" ? "available" : form.status,
        lastMaintenanceDate: form.lastMaintenance, nextMaintenanceDate: form.nextMaintenance,
        insuranceExpiry: form.insuranceExpiry || null,
        projectId: form.projectId ? parseInt(form.projectId) : null,
      };
      if (editAsset) {
        await fetch(`/api/assets/${editAsset.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      } else {
        await fetch("/api/assets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      }
      setShowDialog(false); toast({ title: isRtl ? "تم الحفظ" : "Saved" }); fetchData();
    } catch { toast({ title: isRtl ? "خطأ" : "Error", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(isRtl ? "حذف هذا الأصل؟" : "Delete this asset?")) return;
    try { await fetch(`/api/assets/${id}`, { method: "DELETE" }); toast({ title: isRtl ? "تم الحذف" : "Deleted" }); fetchData(); }
    catch { toast({ title: isRtl ? "خطأ" : "Error", variant: "destructive" }); }
  };

  const handleSaveMaint = async () => {
    if (!maintForm.assetId || !maintForm.date) { toast({ title: isRtl ? "ادخل البيانات" : "Fill fields", variant: "destructive" }); return; }
    setSaving(true);
    try {
      await fetch("/api/maintenance-records", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId: maintForm.assetId, type: maintForm.type || "preventive", date: maintForm.date, description: maintForm.description, cost: maintForm.cost, technician: maintForm.technician, vendor: maintForm.vendor, nextDate: maintForm.nextDate }),
      });
      setShowMaintDialog(false); toast({ title: isRtl ? "تم تسجيل الصيانة" : "Maintenance recorded" }); fetchData();
    } catch { toast({ title: isRtl ? "خطأ" : "Error", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  return (
    <MainLayout>
      <div className="flex flex-col gap-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{isRtl ? "الأصول والمعدات" : "Equipment & Fleet"}</h1>
            <p className="text-muted-foreground text-sm mt-1">{isRtl ? "إدارة الأصول، المركبات، الصيانة الدورية والإهلاك" : "Manage assets, vehicles, maintenance schedules, and depreciation"}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setMaintForm({ type: "preventive" }); setShowMaintDialog(true); }}>
              <Wrench className="w-4 h-4 me-1.5" />{isRtl ? "تسجيل صيانة" : "Log Maintenance"}
            </Button>
            <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 me-1.5" />{isRtl ? "إضافة أصل" : "Add Asset"}</Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: isRtl ? "إجمالي الأصول" : "Total Assets", value: stats.total, icon: Truck, color: "text-blue-500" },
            { label: isRtl ? "نشطة" : "Active", value: stats.active, icon: Settings, color: "text-emerald-500" },
            { label: isRtl ? "في الصيانة" : "In Maintenance", value: stats.maintenance, icon: Wrench, color: "text-amber-500" },
            { label: isRtl ? "صيانة قريبة (30 يوم)" : "Due Soon (30d)", value: stats.nearMaint, icon: AlertTriangle, color: "text-red-500" },
          ].map((s, i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-xl bg-secondary flex items-center justify-center", s.color)}>
                  <s.icon className="w-5 h-5" />
                </div>
                <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-xl font-bold">{s.value}</p></div>
              </CardContent>
            </Card>
          ))}
        </div>

        {nearMaint.length > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{isRtl ? `تنبيه: ${nearMaint.length} أصول تحتاج صيانة خلال 30 يوماً` : `Warning: ${nearMaint.length} assets need maintenance within 30 days`}</span>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="assets"><Truck className="w-3.5 h-3.5 me-1.5" />{isRtl ? "الأصول" : "Assets"}</TabsTrigger>
            <TabsTrigger value="maintenance"><Wrench className="w-3.5 h-3.5 me-1.5" />{isRtl ? "سجل الصيانة" : "Maintenance"}</TabsTrigger>
            <TabsTrigger value="analytics"><BarChart3 className="w-3.5 h-3.5 me-1.5" />{isRtl ? "التحليلات" : "Analytics"}</TabsTrigger>
          </TabsList>

          {/* ── Assets Tab ── */}
          <TabsContent value="assets" className="mt-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground", isRtl ? "right-3" : "left-3")} />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={isRtl ? "بحث باسم، رقم، لوحة..." : "Search by name, no., plate..."} className={cn("h-9 bg-secondary/30", isRtl ? "pr-9" : "pl-9")} />
              </div>
              <Select value={catFilter} onValueChange={setCatFilter}>
                <SelectTrigger className="w-40 h-9 bg-secondary/30"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRtl ? "كل الفئات" : "All Categories"}</SelectItem>
                  {CATS.map(c => <SelectItem key={c.id} value={c.id}>{isRtl ? c.ar : c.en}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36 h-9 bg-secondary/30"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRtl ? "كل الحالات" : "All Status"}</SelectItem>
                  <SelectItem value="active">{isRtl ? "نشط" : "Active"}</SelectItem>
                  <SelectItem value="maintenance">{isRtl ? "صيانة" : "In Maintenance"}</SelectItem>
                  <SelectItem value="out_of_service">{isRtl ? "خارج الخدمة" : "Out of Service"}</SelectItem>
                  <SelectItem value="rented">{isRtl ? "مؤجر" : "Rented"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
            ) : (
              <Card className="border-border/50 overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-secondary/40">
                      <TableRow>
                        <TableHead>{isRtl ? "رقم الأصل" : "Asset No."}</TableHead>
                        <TableHead>{isRtl ? "الاسم" : "Name"}</TableHead>
                        <TableHead>{isRtl ? "الفئة" : "Category"}</TableHead>
                        <TableHead>{isRtl ? "الموقع" : "Location"}</TableHead>
                        <TableHead>{isRtl ? "رقم اللوحة" : "Plate"}</TableHead>
                        <TableHead>{isRtl ? "المشروع" : "Project"}</TableHead>
                        <TableHead>{isRtl ? "الصيانة القادمة" : "Next Maint."}</TableHead>
                        <TableHead>{isRtl ? "التأمين" : "Insurance"}</TableHead>
                        <TableHead>{isRtl ? "الحالة" : "Status"}</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.length === 0 ? (
                        <TableRow><TableCell colSpan={10} className="text-center py-10 text-muted-foreground">{isRtl ? "لا توجد أصول" : "No assets found"}</TableCell></TableRow>
                      ) : filtered.map(a => {
                        const isNearMaint = !!nearMaint.find(x => x.id === a.id);
                        const project = projects.find(p => p.id === a.projectId);
                        const insExpiring = a.insuranceExpiry && daysUntil(a.insuranceExpiry) <= 30;
                        return (
                          <TableRow key={a.id} className={cn("hover:bg-muted/40", isNearMaint && "bg-amber-50/30 dark:bg-amber-900/10")} data-testid={`row-asset-${a.id}`}>
                            <TableCell className="font-mono text-xs text-muted-foreground">{a.assetNo}</TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm">{isRtl ? a.nameAr : a.nameEn}</p>
                                <p className="text-xs text-muted-foreground">{a.brand} {a.model}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{catLabel(a.category)}</TableCell>
                            <TableCell className="text-sm">
                              <div className="flex items-center gap-1"><MapPin className="w-3 h-3" />{a.location || "—"}</div>
                            </TableCell>
                            <TableCell className="text-sm font-mono">{a.plate || "—"}</TableCell>
                            <TableCell className="text-sm">
                              {project ? (
                                <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-200">
                                  {isRtl ? project.nameAr : project.nameEn}
                                </Badge>
                              ) : <span className="text-muted-foreground text-xs">—</span>}
                            </TableCell>
                            <TableCell className="text-sm">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span className={isNearMaint ? "text-amber-600 font-semibold" : ""}>{a.nextMaintenance || "—"}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              {a.insuranceExpiry ? (
                                <span className={cn("text-xs", insExpiring ? "text-red-500 font-medium" : "text-muted-foreground")}>
                                  {a.insuranceExpiry}
                                </span>
                              ) : <span className="text-muted-foreground text-xs">—</span>}
                            </TableCell>
                            <TableCell><Badge className={statusClass(a.status)}>{statusLabel(a.status)}</Badge></TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-500" onClick={() => setViewAsset(a)} title={isRtl ? "عرض التفاصيل" : "View Details"} data-testid={`button-view-asset-${a.id}`}><Eye className="w-3.5 h-3.5" /></Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-500" title={isRtl ? "سجل الصيانة" : "Maintenance log"} onClick={() => { setActiveTab("maintenance"); setAssetFilter(a.assetNo); }} data-testid={`button-maintenance-asset-${a.id}`}><ClipboardCheck className="w-3.5 h-3.5" /></Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(a)} data-testid={`button-edit-asset-${a.id}`}><Edit className="w-3.5 h-3.5" /></Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(a.id)} data-testid={`button-delete-asset-${a.id}`}><Trash2 className="w-3.5 h-3.5" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* ── Maintenance Tab ── */}
          <TabsContent value="maintenance" className="mt-4 space-y-3">
            {assetFilter && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm">
                <span className="text-amber-700 dark:text-amber-300">{isRtl ? `فلتر الأصل: ${assetFilter}` : `Filtered by asset: ${assetFilter}`}</span>
                <button onClick={() => setAssetFilter("")} className="ms-auto text-xs underline text-amber-600">{isRtl ? "إلغاء" : "Clear"}</button>
              </div>
            )}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground", isRtl ? "right-3" : "left-3")} />
                <Input value={assetFilter} onChange={e => setAssetFilter(e.target.value)} placeholder={isRtl ? "بحث بالأصل..." : "Search by asset..."} className={cn("h-9 bg-secondary/30", isRtl ? "pr-9" : "pl-9")} />
              </div>
              <Button variant="outline" size="sm" onClick={() => { setMaintForm({ type: "preventive" }); setShowMaintDialog(true); }}>
                <Plus className="w-4 h-4 me-1.5" />{isRtl ? "تسجيل صيانة" : "Log Maintenance"}
              </Button>
            </div>
            <Card className="border-border/50 overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/40">
                    <TableRow>
                      <TableHead>{isRtl ? "الأصل" : "Asset"}</TableHead>
                      <TableHead>{isRtl ? "النوع" : "Type"}</TableHead>
                      <TableHead>{isRtl ? "التاريخ" : "Date"}</TableHead>
                      <TableHead>{isRtl ? "الوصف" : "Description"}</TableHead>
                      <TableHead>{isRtl ? "الفني / المورد" : "Tech / Vendor"}</TableHead>
                      <TableHead>{isRtl ? "التكلفة" : "Cost"}</TableHead>
                      <TableHead>{isRtl ? "الصيانة القادمة" : "Next Date"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {maintenance.filter(m => !assetFilter || (assets.find(a => a.id === m.assetId)?.assetNo || "").toLowerCase().includes(assetFilter.toLowerCase()) || (assets.find(a => a.id === m.assetId)?.nameAr || "").toLowerCase().includes(assetFilter.toLowerCase())).length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">{isRtl ? "لا يوجد سجل صيانة" : "No maintenance records"}</TableCell></TableRow>
                    ) : maintenance.filter(m => !assetFilter || (assets.find(a => a.id === m.assetId)?.assetNo || "").toLowerCase().includes(assetFilter.toLowerCase()) || (assets.find(a => a.id === m.assetId)?.nameAr || "").includes(assetFilter)).map(m => (
                      <TableRow key={m.id} className="hover:bg-muted/40" data-testid={`row-maint-${m.id}`}>
                        <TableCell className="font-medium text-sm">{assets.find(a => a.id === m.assetId)?.nameAr || m.assetName || m.assetId}</TableCell>
                        <TableCell><Badge variant={m.type === "preventive" ? "default" : "destructive"} className="text-xs">{m.type === "preventive" ? (isRtl ? "وقائية" : "Preventive") : (isRtl ? "علاجية" : "Corrective")}</Badge></TableCell>
                        <TableCell className="text-sm">{m.date}</TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">{m.description}</TableCell>
                        <TableCell className="text-sm">{[m.technician, m.vendor].filter(Boolean).join(" / ")}</TableCell>
                        <TableCell className="text-sm tabular-nums">{m.cost.toLocaleString()} {isRtl ? "ر.س" : "SAR"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{m.nextDate || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          {/* ── Analytics Tab ── */}
          <TabsContent value="analytics" className="mt-4">
            <EquipmentDashboard assets={assets} maintenance={maintenance} isRtl={isRtl} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Asset Detail Drawer */}
      {viewAsset && (
        <AssetDetailDrawer
          asset={viewAsset}
          maintenance={maintenance}
          projects={projects}
          isRtl={isRtl}
          onClose={() => setViewAsset(null)}
          onEdit={() => { openEdit(viewAsset); setViewAsset(null); }}
        />
      )}

      {/* Add/Edit Asset Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editAsset ? (isRtl ? "تعديل الأصل" : "Edit Asset") : (isRtl ? "إضافة أصل جديد" : "Add New Asset")}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            {([
              { label: isRtl ? "رقم الأصل *" : "Asset No. *", field: "assetNo" },
              { label: isRtl ? "الاسم بالعربية *" : "Arabic Name *", field: "nameAr" },
              { label: isRtl ? "الاسم بالإنجليزية" : "English Name", field: "nameEn" },
              { label: isRtl ? "الماركة" : "Brand", field: "brand" },
              { label: isRtl ? "الطراز" : "Model", field: "model" },
              { label: isRtl ? "الرقم التسلسلي" : "Serial No.", field: "serial" },
              { label: isRtl ? "رقم اللوحة" : "Plate No.", field: "plate" },
              { label: isRtl ? "الموقع" : "Location", field: "location" },
              { label: isRtl ? "المكلف به" : "Assigned To", field: "assignedTo" },
              { label: isRtl ? "تاريخ الشراء" : "Purchase Date", field: "purchaseDate", type: "date" },
              { label: isRtl ? "تكلفة الشراء (ر.س)" : "Purchase Cost (SAR)", field: "purchaseCost", type: "number" },
              { label: isRtl ? "آخر صيانة" : "Last Maintenance", field: "lastMaintenance", type: "date" },
              { label: isRtl ? "الصيانة القادمة" : "Next Maintenance", field: "nextMaintenance", type: "date" },
              { label: isRtl ? "انتهاء التأمين" : "Insurance Expiry", field: "insuranceExpiry", type: "date" },
            ] as any[]).map((f: any) => (
              <div key={f.field}>
                <Label className="text-xs">{f.label}</Label>
                <Input
                  type={f.type || "text"}
                  className="mt-1 h-8 text-sm"
                  value={(form as any)[f.field] || ""}
                  onChange={e => setForm(p => ({ ...p, [f.field]: f.type === "number" ? Number(e.target.value) : e.target.value }))}
                  data-testid={`input-asset-${f.field}`}
                />
              </div>
            ))}

            <div>
              <Label className="text-xs">{isRtl ? "الفئة" : "Category"}</Label>
              <Select value={form.category || "vehicle"} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{CATS.map(c => <SelectItem key={c.id} value={c.id}>{isRtl ? c.ar : c.en}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">{isRtl ? "الحالة" : "Status"}</Label>
              <Select value={form.status || "active"} onValueChange={v => setForm(p => ({ ...p, status: v as any }))}>
                <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{isRtl ? "نشط" : "Active"}</SelectItem>
                  <SelectItem value="maintenance">{isRtl ? "صيانة" : "In Maintenance"}</SelectItem>
                  <SelectItem value="out_of_service">{isRtl ? "خارج الخدمة" : "Out of Service"}</SelectItem>
                  <SelectItem value="rented">{isRtl ? "مؤجر" : "Rented"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label className="text-xs">{isRtl ? "المشروع المرتبط" : "Linked Project"}</Label>
              <Select value={form.projectId || "__none__"} onValueChange={v => setForm(p => ({ ...p, projectId: v === "__none__" ? "" : v }))}>
                <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder={isRtl ? "اختر مشروعاً" : "Select project"} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{isRtl ? "بدون مشروع" : "No project"}</SelectItem>
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{isRtl ? p.nameAr : p.nameEn}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>{isRtl ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={handleSave} disabled={saving} data-testid="button-save-asset">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (isRtl ? "حفظ" : "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Log Maintenance Dialog */}
      <Dialog open={showMaintDialog} onOpenChange={setShowMaintDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{isRtl ? "تسجيل صيانة" : "Log Maintenance"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">{isRtl ? "الأصل *" : "Asset *"}</Label>
              <Select value={maintForm.assetId || ""} onValueChange={v => setMaintForm(p => ({ ...p, assetId: v }))}>
                <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder={isRtl ? "اختر الأصل" : "Select asset"} /></SelectTrigger>
                <SelectContent>{assets.map(a => <SelectItem key={a.id} value={a.id}>{isRtl ? a.nameAr : a.nameEn} ({a.assetNo})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">{isRtl ? "نوع الصيانة" : "Type"}</Label>
                <Select value={maintForm.type || "preventive"} onValueChange={v => setMaintForm(p => ({ ...p, type: v as any }))}>
                  <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preventive">{isRtl ? "وقائية" : "Preventive"}</SelectItem>
                    <SelectItem value="corrective">{isRtl ? "علاجية" : "Corrective"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">{isRtl ? "التاريخ *" : "Date *"}</Label>
                <Input type="date" className="mt-1 h-8 text-sm" value={maintForm.date || ""} onChange={e => setMaintForm(p => ({ ...p, date: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="text-xs">{isRtl ? "الوصف" : "Description"}</Label>
              <Input className="mt-1 h-8 text-sm" value={maintForm.description || ""} onChange={e => setMaintForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">{isRtl ? "الفني" : "Technician"}</Label>
                <Input className="mt-1 h-8 text-sm" value={maintForm.technician || ""} onChange={e => setMaintForm(p => ({ ...p, technician: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">{isRtl ? "المورد / الورشة" : "Vendor / Workshop"}</Label>
                <Input className="mt-1 h-8 text-sm" value={(maintForm as any).vendor || ""} onChange={e => setMaintForm(p => ({ ...p, vendor: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">{isRtl ? "التكلفة (ر.س)" : "Cost (SAR)"}</Label>
                <Input type="number" className="mt-1 h-8 text-sm" value={maintForm.cost || 0} onChange={e => setMaintForm(p => ({ ...p, cost: Number(e.target.value) }))} />
              </div>
              <div>
                <Label className="text-xs">{isRtl ? "موعد الصيانة القادمة" : "Next Maintenance Date"}</Label>
                <Input type="date" className="mt-1 h-8 text-sm" value={maintForm.nextDate || ""} onChange={e => setMaintForm(p => ({ ...p, nextDate: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMaintDialog(false)}>{isRtl ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={handleSaveMaint} disabled={saving} data-testid="button-save-maintenance">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (isRtl ? "تسجيل" : "Record")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
