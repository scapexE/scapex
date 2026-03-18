import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Smartphone, Plus, Search, Wifi, WifiOff, MapPin, Camera, CheckCircle2, Clock, AlertTriangle, Battery, Signal, RefreshCw, Settings, Eye, Trash2, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface MobileDevice {
  id: string;
  deviceId: string;
  userName: string;
  userNameAr: string;
  userRole: string;
  deviceModel: string;
  osVersion: string;
  appVersion: string;
  lastSync: string;
  lastLocation: string;
  batteryLevel: number;
  isOnline: boolean;
  status: "active" | "inactive" | "suspended";
}

interface SiteReport {
  id: string;
  deviceId: string;
  engineerName: string;
  engineerNameAr: string;
  projectName: string;
  projectNameAr: string;
  type: "daily_report" | "inspection" | "incident" | "photo_log" | "measurement";
  date: string;
  time: string;
  location: string;
  status: "submitted" | "reviewed" | "approved";
  photosCount: number;
  notes: string;
}

interface AppFeature {
  id: string;
  nameAr: string;
  nameEn: string;
  descAr: string;
  descEn: string;
  icon: string;
  isEnabled: boolean;
  requiredRole: string;
}

const SEED_DEVICES: MobileDevice[] = [
  { id: "1", deviceId: "DEV-001", userName: "Ahmed Al-Ghamdi", userNameAr: "أحمد الغامدي", userRole: "senior_engineer", deviceModel: "Samsung Galaxy S24", osVersion: "Android 15", appVersion: "2.4.1", lastSync: "2026-03-18 09:45", lastLocation: "الرياض - حي العليا - مشروع 101", batteryLevel: 78, isOnline: true, status: "active" },
  { id: "2", deviceId: "DEV-002", userName: "Mohammed Al-Zahrani", userNameAr: "محمد الزهراني", userRole: "hse_officer", deviceModel: "iPhone 16 Pro", osVersion: "iOS 19.2", appVersion: "2.4.1", lastSync: "2026-03-18 09:30", lastLocation: "جدة - حي الروضة - مشروع 103", batteryLevel: 92, isOnline: true, status: "active" },
  { id: "3", deviceId: "DEV-003", userName: "Rajesh Kumar", userNameAr: "راجيش كومار", userRole: "civil_engineer", deviceModel: "Samsung Galaxy A54", osVersion: "Android 14", appVersion: "2.3.8", lastSync: "2026-03-18 08:15", lastLocation: "الدمام - مشروع 105", batteryLevel: 45, isOnline: false, status: "active" },
  { id: "4", deviceId: "DEV-004", userName: "Abdullah Al-Otaibi", userNameAr: "عبدالله العتيبي", userRole: "site_supervisor", deviceModel: "Samsung Galaxy S23", osVersion: "Android 14", appVersion: "2.4.0", lastSync: "2026-03-17 16:30", lastLocation: "الرياض - طريق الملك فهد - مشروع 102", batteryLevel: 12, isOnline: false, status: "active" },
  { id: "5", deviceId: "DEV-005", userName: "Khalid Al-Harbi", userNameAr: "خالد الحربي", userRole: "surveyor", deviceModel: "iPhone 15", osVersion: "iOS 18.4", appVersion: "2.4.1", lastSync: "2026-03-18 10:02", lastLocation: "الرياض - حي النخيل - مشروع 106", batteryLevel: 88, isOnline: true, status: "active" },
  { id: "6", deviceId: "DEV-006", userName: "Omar Al-Mutairi", userNameAr: "عمر المطيري", userRole: "electrical_engineer", deviceModel: "Samsung Galaxy S22", osVersion: "Android 14", appVersion: "2.2.0", lastSync: "2026-03-10 11:00", lastLocation: "الرياض - مشروع 100", batteryLevel: 0, isOnline: false, status: "suspended" },
];

const SEED_REPORTS: SiteReport[] = [
  { id: "1", deviceId: "DEV-001", engineerName: "Ahmed Al-Ghamdi", engineerNameAr: "أحمد الغامدي", projectName: "Office Tower Project 101", projectNameAr: "مشروع برج المكاتب 101", type: "daily_report", date: "2026-03-18", time: "09:30", location: "الرياض - حي العليا", status: "submitted", photosCount: 12, notes: "Foundation work completed for zone B" },
  { id: "2", deviceId: "DEV-002", engineerName: "Mohammed Al-Zahrani", engineerNameAr: "محمد الزهراني", projectName: "Hospital Project 103", projectNameAr: "مشروع المستشفى 103", type: "inspection", date: "2026-03-18", time: "08:45", location: "جدة - حي الروضة", status: "reviewed", photosCount: 24, notes: "Fire safety systems inspection - all units passed" },
  { id: "3", deviceId: "DEV-003", engineerName: "Rajesh Kumar", engineerNameAr: "راجيش كومار", projectName: "Road Infrastructure 105", projectNameAr: "مشروع البنية التحتية 105", type: "measurement", date: "2026-03-17", time: "15:20", location: "الدمام", status: "approved", photosCount: 8, notes: "Soil compaction test results - 98% density achieved" },
  { id: "4", deviceId: "DEV-001", engineerName: "Ahmed Al-Ghamdi", engineerNameAr: "أحمد الغامدي", projectName: "Office Tower Project 101", projectNameAr: "مشروع برج المكاتب 101", type: "photo_log", date: "2026-03-17", time: "14:00", location: "الرياض - حي العليا", status: "approved", photosCount: 36, notes: "Weekly progress photos - structural work" },
  { id: "5", deviceId: "DEV-005", engineerName: "Khalid Al-Harbi", engineerNameAr: "خالد الحربي", projectName: "Residential Complex 106", projectNameAr: "مجمع سكني 106", type: "incident", date: "2026-03-16", time: "11:30", location: "الرياض - حي النخيل", status: "reviewed", photosCount: 6, notes: "Minor equipment malfunction - crane #3 hydraulic leak" },
];

const SEED_FEATURES: AppFeature[] = [
  { id: "1", nameAr: "التقارير اليومية", nameEn: "Daily Reports", descAr: "إنشاء وإرسال التقارير اليومية من الموقع", descEn: "Create and submit daily site reports", icon: "📋", isEnabled: true, requiredRole: "engineer" },
  { id: "2", nameAr: "التفتيش والمعاينة", nameEn: "Site Inspection", descAr: "إجراء عمليات التفتيش وتسجيل الملاحظات", descEn: "Conduct inspections and record findings", icon: "🔍", isEnabled: true, requiredRole: "hse" },
  { id: "3", nameAr: "تسجيل الحوادث", nameEn: "Incident Reporting", descAr: "الإبلاغ الفوري عن الحوادث والمخاطر", descEn: "Instant incident and hazard reporting", icon: "⚠️", isEnabled: true, requiredRole: "all" },
  { id: "4", nameAr: "الصور والفيديو", nameEn: "Photo & Video", descAr: "التقاط الصور والفيديو مع الموقع والوقت", descEn: "Capture geo-tagged photos and videos", icon: "📸", isEnabled: true, requiredRole: "all" },
  { id: "5", nameAr: "القياسات الميدانية", nameEn: "Field Measurements", descAr: "تسجيل القياسات والاختبارات الميدانية", descEn: "Record field measurements and test results", icon: "📏", isEnabled: true, requiredRole: "engineer" },
  { id: "6", nameAr: "الحضور والانصراف", nameEn: "Attendance Check-in", descAr: "تسجيل حضور وانصراف العمال بالموقع", descEn: "Worker attendance tracking with GPS", icon: "✅", isEnabled: true, requiredRole: "supervisor" },
  { id: "7", nameAr: "المخططات الهندسية", nameEn: "Drawing Viewer", descAr: "عرض المخططات الهندسية في الموقع", descEn: "View engineering drawings on-site", icon: "📐", isEnabled: true, requiredRole: "engineer" },
  { id: "8", nameAr: "طلبات المواد", nameEn: "Material Requests", descAr: "طلب مواد ومعدات من المستودع", descEn: "Request materials and equipment from warehouse", icon: "📦", isEnabled: false, requiredRole: "supervisor" },
];

const STORAGE_DEV = "scapex_mobile_devices";
const STORAGE_REP = "scapex_mobile_reports";
const STORAGE_FEAT = "scapex_mobile_features";
function load<T>(key: string, seed: T): T { try { const d = localStorage.getItem(key); return d ? JSON.parse(d) : seed; } catch { return seed; } }
function save(key: string, data: unknown) { localStorage.setItem(key, JSON.stringify(data)); }

export default function MobileAppModule() {
  const { dir, language } = useLanguage();
  const isRtl = dir === "rtl";
  const { toast } = useToast();
  const [devices, setDevices] = useState<MobileDevice[]>(() => load(STORAGE_DEV, SEED_DEVICES));
  const [reports] = useState<SiteReport[]>(() => load(STORAGE_REP, SEED_REPORTS));
  const [features, setFeatures] = useState<AppFeature[]>(() => load(STORAGE_FEAT, SEED_FEATURES));
  const [search, setSearch] = useState("");
  const [selectedDevice, setSelectedDevice] = useState<MobileDevice | null>(null);

  const t = (ar: string, en: string) => isRtl ? ar : en;

  const onlineDevices = devices.filter(d => d.isOnline).length;
  const totalReports = reports.length;
  const todayReports = reports.filter(r => r.date === "2026-03-18").length;

  const filteredDevices = devices.filter(d => {
    const q = search.toLowerCase();
    return !q || d.userName.toLowerCase().includes(q) || d.userNameAr.includes(q) || d.deviceId.toLowerCase().includes(q);
  });

  function toggleFeature(id: string) {
    const updated = features.map(f => f.id === id ? { ...f, isEnabled: !f.isEnabled } : f);
    setFeatures(updated);
    save(STORAGE_FEAT, updated);
    toast({ title: t("تم التحديث", "Updated") });
  }

  function suspendDevice(id: string) {
    const updated = devices.map(d => d.id === id ? { ...d, status: d.status === "suspended" ? "active" as const : "suspended" as const, isOnline: false } : d);
    setDevices(updated);
    save(STORAGE_DEV, updated);
    toast({ title: t("تم تحديث حالة الجهاز", "Device status updated") });
  }

  const reportTypeLabel = (type: string) => {
    const map: Record<string, [string, string]> = { daily_report: ["تقرير يومي", "Daily Report"], inspection: ["تفتيش", "Inspection"], incident: ["حادث", "Incident"], photo_log: ["سجل صور", "Photo Log"], measurement: ["قياسات", "Measurements"] };
    return t(map[type]?.[0] || type, map[type]?.[1] || type);
  };

  const reportTypeColor = (type: string) => {
    const map: Record<string, string> = { daily_report: "bg-blue-100 text-blue-700", inspection: "bg-green-100 text-green-700", incident: "bg-red-100 text-red-700", photo_log: "bg-purple-100 text-purple-700", measurement: "bg-orange-100 text-orange-700" };
    return map[type] || "";
  };

  return (
    <MainLayout>
      <div className="p-4 md:p-6 space-y-6" dir={dir}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-mobile-app-title">
              <Smartphone className="h-7 w-7 text-indigo-600" />
              {t("تطبيق المهندسين الميداني", "Engineers Field App")}
            </h1>
            <p className="text-muted-foreground mt-1">{t("إدارة الأجهزة وتقارير الموقع والمزامنة", "Device management, site reports, and sync control")}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/30"><Wifi className="h-6 w-6 text-green-600" /></div><div><p className="text-sm text-muted-foreground">{t("أجهزة متصلة", "Online Devices")}</p><p className="text-2xl font-bold" data-testid="text-online-devices">{onlineDevices}/{devices.length}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30"><Camera className="h-6 w-6 text-blue-600" /></div><div><p className="text-sm text-muted-foreground">{t("تقارير اليوم", "Today's Reports")}</p><p className="text-2xl font-bold" data-testid="text-today-reports">{todayReports}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-900/30"><Camera className="h-6 w-6 text-purple-600" /></div><div><p className="text-sm text-muted-foreground">{t("إجمالي الصور", "Total Photos")}</p><p className="text-2xl font-bold" data-testid="text-total-photos">{reports.reduce((s, r) => s + r.photosCount, 0)}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-3 rounded-xl bg-orange-100 dark:bg-orange-900/30"><AlertTriangle className="h-6 w-6 text-orange-600" /></div><div><p className="text-sm text-muted-foreground">{t("أجهزة معلقة", "Suspended")}</p><p className="text-2xl font-bold" data-testid="text-suspended-devices">{devices.filter(d => d.status === "suspended").length}</p></div></div></CardContent></Card>
        </div>

        <Tabs defaultValue="devices" dir={dir}>
          <TabsList>
            <TabsTrigger value="devices">{t("الأجهزة", "Devices")}</TabsTrigger>
            <TabsTrigger value="reports">{t("التقارير الميدانية", "Site Reports")}</TabsTrigger>
            <TabsTrigger value="features">{t("إعدادات التطبيق", "App Settings")}</TabsTrigger>
            <TabsTrigger value="live_map">{t("الخريطة الحية", "Live Map")}</TabsTrigger>
          </TabsList>

          <TabsContent value="devices" className="space-y-4">
            <div className="relative">
              <Search className={cn("absolute top-2.5 h-4 w-4 text-muted-foreground", isRtl ? "right-3" : "left-3")} />
              <Input placeholder={t("بحث في الأجهزة...", "Search devices...")} value={search} onChange={e => setSearch(e.target.value)} className={cn(isRtl ? "pr-9" : "pl-9")} data-testid="input-search-devices" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDevices.map(d => (
                <Card key={d.id} className={cn("hover:shadow-md transition-shadow", d.status === "suspended" && "opacity-60")} data-testid={`card-device-${d.id}`}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-3 h-3 rounded-full", d.isOnline ? "bg-green-500 animate-pulse" : "bg-gray-300")} />
                        <span className="font-mono text-sm text-muted-foreground">{d.deviceId}</span>
                      </div>
                      <Badge variant={d.status === "active" ? "default" : d.status === "suspended" ? "destructive" : "secondary"}>
                        {d.status === "active" ? t("نشط", "Active") : d.status === "suspended" ? t("معلق", "Suspended") : t("غير نشط", "Inactive")}
                      </Badge>
                    </div>
                    <h3 className="font-semibold">{isRtl ? d.userNameAr : d.userName}</h3>
                    <p className="text-xs text-muted-foreground mb-3">{d.deviceModel} • {d.osVersion}</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-3 w-3" />
                        <span className="text-muted-foreground">{t("آخر مزامنة:", "Last Sync:")}</span>
                        <span>{d.lastSync}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3" />
                        <span className="text-xs text-muted-foreground truncate">{d.lastLocation}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Battery className={cn("h-3 w-3", d.batteryLevel < 20 ? "text-red-500" : d.batteryLevel < 50 ? "text-yellow-500" : "text-green-500")} />
                          <span className={cn("text-sm", d.batteryLevel < 20 && "text-red-500")}>{d.batteryLevel}%</span>
                        </div>
                        <Badge variant="outline" className="text-xs">v{d.appVersion}</Badge>
                      </div>
                    </div>
                    <div className="flex gap-1 mt-3 pt-3 border-t">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedDevice(d)} data-testid={`button-view-device-${d.id}`}><Eye className="h-3 w-3 me-1" />{t("تفاصيل", "Details")}</Button>
                      <Button variant="ghost" size="sm" onClick={() => suspendDevice(d.id)} data-testid={`button-toggle-device-${d.id}`}>
                        <Shield className="h-3 w-3 me-1" />{d.status === "suspended" ? t("تفعيل", "Activate") : t("تعليق", "Suspend")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("المهندس", "Engineer")}</TableHead>
                    <TableHead>{t("المشروع", "Project")}</TableHead>
                    <TableHead>{t("النوع", "Type")}</TableHead>
                    <TableHead>{t("التاريخ", "Date")}</TableHead>
                    <TableHead>{t("الصور", "Photos")}</TableHead>
                    <TableHead>{t("الحالة", "Status")}</TableHead>
                    <TableHead>{t("الملاحظات", "Notes")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map(r => (
                    <TableRow key={r.id} data-testid={`row-report-${r.id}`}>
                      <TableCell className="font-medium">{isRtl ? r.engineerNameAr : r.engineerName}</TableCell>
                      <TableCell className="text-sm">{isRtl ? r.projectNameAr : r.projectName}</TableCell>
                      <TableCell><Badge className={reportTypeColor(r.type)} variant="secondary">{reportTypeLabel(r.type)}</Badge></TableCell>
                      <TableCell className="text-sm">{r.date} {r.time}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1"><Camera className="h-3 w-3" />{r.photosCount}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.status === "approved" ? "default" : r.status === "reviewed" ? "secondary" : "outline"}>
                          {r.status === "approved" ? t("معتمد", "Approved") : r.status === "reviewed" ? t("تمت المراجعة", "Reviewed") : t("مُرسل", "Submitted")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{r.notes}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="features" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {features.map(f => (
                <Card key={f.id} className={cn(!f.isEnabled && "opacity-60")} data-testid={`card-feature-${f.id}`}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-3">
                        <span className="text-2xl">{f.icon}</span>
                        <div>
                          <h3 className="font-semibold">{isRtl ? f.nameAr : f.nameEn}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{isRtl ? f.descAr : f.descEn}</p>
                        </div>
                      </div>
                      <Button variant={f.isEnabled ? "default" : "outline"} size="sm" onClick={() => toggleFeature(f.id)} data-testid={`button-toggle-feature-${f.id}`}>
                        {f.isEnabled ? t("مفعّل", "Enabled") : t("معطّل", "Disabled")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="live_map" className="space-y-4">
            <Card className="p-6">
              <div className="text-center space-y-4">
                <div className="w-full h-[400px] bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/10 dark:to-blue-900/10 rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-muted">
                  <MapPin className="h-16 w-16 text-muted-foreground/40 mb-4" />
                  <h3 className="text-lg font-medium">{t("خريطة المواقع الحية", "Live Location Map")}</h3>
                  <p className="text-sm text-muted-foreground max-w-md">{t("عرض مواقع المهندسين في الوقت الحقيقي على الخريطة", "Real-time view of engineers' locations on the map")}</p>
                  <div className="flex flex-wrap justify-center gap-4 mt-6">
                    {devices.filter(d => d.isOnline).map(d => (
                      <div key={d.id} className="flex items-center gap-2 bg-white dark:bg-card p-2 px-3 rounded-full shadow-sm border">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-sm font-medium">{isRtl ? d.userNameAr : d.userName}</span>
                        <Badge variant="outline" className="text-[10px]">{d.lastLocation.split(" - ")[0]}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={!!selectedDevice} onOpenChange={() => setSelectedDevice(null)}>
          <DialogContent className="max-w-lg" dir={dir}>
            {selectedDevice && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5" />
                    {selectedDevice.deviceId} - {isRtl ? selectedDevice.userNameAr : selectedDevice.userName}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-3 rounded-lg bg-muted/30"><span className="text-muted-foreground block text-xs">{t("الجهاز", "Device")}</span><span className="font-medium">{selectedDevice.deviceModel}</span></div>
                    <div className="p-3 rounded-lg bg-muted/30"><span className="text-muted-foreground block text-xs">{t("النظام", "OS")}</span><span className="font-medium">{selectedDevice.osVersion}</span></div>
                    <div className="p-3 rounded-lg bg-muted/30"><span className="text-muted-foreground block text-xs">{t("إصدار التطبيق", "App Version")}</span><span className="font-medium">v{selectedDevice.appVersion}</span></div>
                    <div className="p-3 rounded-lg bg-muted/30"><span className="text-muted-foreground block text-xs">{t("البطارية", "Battery")}</span><span className={cn("font-medium", selectedDevice.batteryLevel < 20 && "text-red-500")}>{selectedDevice.batteryLevel}%</span></div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 text-sm">
                    <span className="text-muted-foreground block text-xs mb-1">{t("آخر موقع", "Last Location")}</span>
                    <span className="font-medium flex items-center gap-1"><MapPin className="h-3 w-3" />{selectedDevice.lastLocation}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 text-sm">
                    <span className="text-muted-foreground block text-xs mb-1">{t("آخر مزامنة", "Last Sync")}</span>
                    <span className="font-medium flex items-center gap-1"><RefreshCw className="h-3 w-3" />{selectedDevice.lastSync}</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-2">{t("التقارير الأخيرة", "Recent Reports")}</h4>
                    <div className="space-y-1">
                      {reports.filter(r => r.deviceId === selectedDevice.deviceId).slice(0, 3).map(r => (
                        <div key={r.id} className="text-xs p-2 rounded border flex justify-between items-center">
                          <span>{isRtl ? r.projectNameAr : r.projectName}</span>
                          <Badge variant="secondary" className={cn("text-[10px]", reportTypeColor(r.type))}>{reportTypeLabel(r.type)}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
