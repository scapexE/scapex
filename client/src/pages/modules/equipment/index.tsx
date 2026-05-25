import { useState, useEffect, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Settings, Plus, Search, Truck, AlertTriangle, Wrench, Edit, Trash2, MapPin, Calendar, Loader2, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Asset {
  id: string; assetNo: string; nameAr: string; nameEn: string; category: string;
  brand: string; model: string; serial: string; plate?: string;
  location: string; assignedTo: string; purchaseDate: string; purchaseCost: number;
  lastMaintenance: string; nextMaintenance: string;
  status: "active" | "maintenance" | "out_of_service" | "rented";
}

interface MaintenanceLog {
  id: string; assetId: string; assetName: string; type: "preventive" | "corrective";
  date: string; cost: number; technician: string; description: string; nextDate: string;
}

const CATS = [
  { id: "vehicle", ar: "مركبات", en: "Vehicles" },
  { id: "heavy", ar: "معدات ثقيلة", en: "Heavy Equipment" },
  { id: "survey", ar: "أجهزة مساحة", en: "Survey Instruments" },
  { id: "safety", ar: "معدات السلامة", en: "Safety Equipment" },
  { id: "it", ar: "أجهزة تقنية", en: "IT Assets" },
  { id: "office", ar: "أثاث مكتبي", en: "Office Furniture" },
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
  };
}

export default function EquipmentModule() {
  const { dir } = useLanguage(); const isRtl = dir === "rtl";
  const { toast } = useToast();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(""); const [catFilter, setCatFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("assets");
  const [assetFilter, setAssetFilter] = useState("");
  const [showDialog, setShowDialog] = useState(false); const [editAsset, setEditAsset] = useState<Asset | null>(null);
  const [form, setForm] = useState<Partial<Asset>>({});
  const [showMaintDialog, setShowMaintDialog] = useState(false);
  const [maintForm, setMaintForm] = useState<Partial<MaintenanceLog & { assetId: string }>>({});
  const [saving, setSaving] = useState(false);

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
      const [aRes, mRes] = await Promise.all([fetch("/api/assets"), fetch("/api/maintenance-records")]);
      const aData = await aRes.json();
      const mData = await mRes.json();

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
    return (!q || a.nameAr.includes(q) || a.nameEn.toLowerCase().includes(q) || a.assetNo.toLowerCase().includes(q) || (a.plate || "").includes(q)) && (catFilter === "all" || a.category === catFilter);
  });

  const nearMaint = assets.filter(a => {
    if (!a.nextMaintenance) return false;
    const d = new Date(a.nextMaintenance); const now = new Date();
    return (d.getTime() - now.getTime()) < 30 * 864e5 && a.status === "active";
  });

  const stats = { total: assets.length, active: assets.filter(a => a.status === "active").length, maintenance: assets.filter(a => a.status === "maintenance").length, nearMaint: nearMaint.length };
  const catLabel = (id: string) => { const c = CATS.find(x => x.id === id); return c ? (isRtl ? c.ar : c.en) : id; };
  const statusLabel = (s: string) => ({ active: isRtl ? "نشط" : "Active", maintenance: isRtl ? "صيانة" : "In Maintenance", out_of_service: isRtl ? "خارج الخدمة" : "Out of Service", rented: isRtl ? "مؤجر" : "Rented" }[s] || s);
  const statusClass = (s: string) => ({ active: "bg-emerald-500 text-white", maintenance: "bg-amber-500 text-white", out_of_service: "", rented: "bg-blue-500 text-white" }[s] || "");

  const openAdd = () => { setEditAsset(null); setForm({ category: "vehicle", status: "active", purchaseDate: new Date().toISOString().split("T")[0] }); setShowDialog(true); };
  const openEdit = (a: Asset) => { setEditAsset(a); setForm(a); setShowDialog(true); };

  const handleSave = async () => {
    if (!form.nameAr || !form.assetNo) { toast({ title: isRtl ? "ادخل البيانات المطلوبة" : "Fill required fields", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const payload = { assetCode: form.assetNo, nameAr: form.nameAr, nameEn: form.nameEn, brand: form.brand, model: form.model, serial: form.serial, plate: form.plate, location: form.location, purchaseDate: form.purchaseDate, purchaseCost: form.purchaseCost, status: form.status === "active" ? "available" : form.status, lastMaintenance: form.lastMaintenance, nextMaintenance: form.nextMaintenance };
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
    try { await fetch(`/api/assets/${id}`, { method: "DELETE" }); toast({ title: isRtl ? "تم الحذف" : "Deleted" }); fetchData(); }
    catch { toast({ title: isRtl ? "خطأ" : "Error", variant: "destructive" }); }
  };

  const handleSaveMaint = async () => {
    if (!maintForm.assetId || !maintForm.date) { toast({ title: isRtl ? "ادخل البيانات" : "Fill fields", variant: "destructive" }); return; }
    setSaving(true);
    try {
      await fetch("/api/maintenance-records", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assetId: maintForm.assetId, type: maintForm.type || "preventive", date: maintForm.date, description: maintForm.description, cost: maintForm.cost, technician: maintForm.technician, nextDate: maintForm.nextDate }) });
      setShowMaintDialog(false); toast({ title: isRtl ? "تم تسجيل الصيانة" : "Maintenance recorded" }); fetchData();
    } catch { toast({ title: isRtl ? "خطأ" : "Error", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  return (
    <MainLayout>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{isRtl ? "الأصول والمعدات" : "Equipment & Fleet"}</h1>
            <p className="text-muted-foreground text-sm mt-1">{isRtl ? "إدارة الأصول، المركبات، والصيانة الدورية" : "Manage assets, vehicles, and maintenance schedules"}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setMaintForm({ type: "preventive" }); setShowMaintDialog(true); }}><Wrench className="w-4 h-4 me-1.5" />{isRtl ? "تسجيل صيانة" : "Log Maintenance"}</Button>
            <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 me-1.5" />{isRtl ? "إضافة أصل" : "Add Asset"}</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: isRtl ? "إجمالي الأصول" : "Total Assets", value: stats.total, icon: Truck, color: "text-blue-500" },
            { label: isRtl ? "نشطة" : "Active", value: stats.active, icon: Settings, color: "text-emerald-500" },
            { label: isRtl ? "في الصيانة" : "In Maintenance", value: stats.maintenance, icon: Wrench, color: "text-amber-500" },
            { label: isRtl ? "صيانة قريبة" : "Due Soon (30d)", value: stats.nearMaint, icon: AlertTriangle, color: "text-red-500" },
          ].map((s, i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-xl bg-secondary flex items-center justify-center", s.color)}><s.icon className="w-5 h-5" /></div>
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

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="assets">{isRtl ? "الأصول" : "Assets"}</TabsTrigger>
            <TabsTrigger value="maintenance">{isRtl ? "سجل الصيانة" : "Maintenance Log"}</TabsTrigger>
          </TabsList>

          <TabsContent value="assets" className="mt-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground", isRtl ? "right-3" : "left-3")} />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={isRtl ? "بحث..." : "Search..."} className={cn("h-9 bg-secondary/30", isRtl ? "pr-9" : "pl-9")} />
              </div>
              <Select value={catFilter} onValueChange={setCatFilter}>
                <SelectTrigger className="w-44 h-9 bg-secondary/30"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRtl ? "كل الفئات" : "All Categories"}</SelectItem>
                  {CATS.map(c => <SelectItem key={c.id} value={c.id}>{isRtl ? c.ar : c.en}</SelectItem>)}
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
                        <TableHead>{isRtl ? "المسؤول" : "Assigned To"}</TableHead>
                        <TableHead>{isRtl ? "الصيانة القادمة" : "Next Maint."}</TableHead>
                        <TableHead>{isRtl ? "الحالة" : "Status"}</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.length === 0 ? (
                        <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">{isRtl ? "لا توجد أصول" : "No assets found"}</TableCell></TableRow>
                      ) : filtered.map(a => (
                        <TableRow key={a.id} className={cn("hover:bg-muted/40", nearMaint.find(x => x.id === a.id) && "bg-amber-50/30 dark:bg-amber-900/10")} data-testid={`row-asset-${a.id}`}>
                          <TableCell className="font-mono text-xs text-muted-foreground">{a.assetNo}</TableCell>
                          <TableCell><div><p className="font-medium text-sm">{isRtl ? a.nameAr : a.nameEn}</p><p className="text-xs text-muted-foreground">{a.brand} {a.model}</p></div></TableCell>
                          <TableCell className="text-sm">{catLabel(a.category)}</TableCell>
                          <TableCell className="text-sm"><div className="flex items-center gap-1"><MapPin className="w-3 h-3" />{a.location}</div></TableCell>
                          <TableCell className="text-sm">{a.assignedTo}</TableCell>
                          <TableCell className="text-sm">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span className={nearMaint.find(x => x.id === a.id) ? "text-amber-600 font-semibold" : ""}>{a.nextMaintenance || "—"}</span>
                            </div>
                          </TableCell>
                          <TableCell><Badge className={statusClass(a.status)}>{statusLabel(a.status)}</Badge></TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-500" title={isRtl ? "سجل الصيانة" : "Maintenance log"} onClick={() => window.location.href = `/equipment?tab=maintenance&asset=${encodeURIComponent(a.assetNo)}`} data-testid={`button-maintenance-asset-${a.id}`}><ClipboardCheck className="w-3.5 h-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(a)}><Edit className="w-3.5 h-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(a.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="maintenance" className="mt-4">
            {assetFilter && (
              <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm">
                <span className="text-amber-700 dark:text-amber-300">{isRtl ? `فلتر الأصل: ${assetFilter}` : `Filtered by asset: ${assetFilter}`}</span>
                <button onClick={() => setAssetFilter("")} className="ms-auto text-xs underline text-amber-600">{isRtl ? "إلغاء" : "Clear"}</button>
              </div>
            )}
            <Card className="border-border/50 overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/40">
                    <TableRow>
                      <TableHead>{isRtl ? "الأصل" : "Asset"}</TableHead>
                      <TableHead>{isRtl ? "النوع" : "Type"}</TableHead>
                      <TableHead>{isRtl ? "التاريخ" : "Date"}</TableHead>
                      <TableHead>{isRtl ? "الوصف" : "Description"}</TableHead>
                      <TableHead>{isRtl ? "الفني" : "Technician"}</TableHead>
                      <TableHead>{isRtl ? "التكلفة" : "Cost"}</TableHead>
                      <TableHead>{isRtl ? "الصيانة القادمة" : "Next Date"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {maintenance.filter(m => !assetFilter || (assets.find(a => a.id === m.assetId)?.assetNo || "").toLowerCase().includes(assetFilter.toLowerCase())).length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">{isRtl ? "لا يوجد سجل صيانة" : "No maintenance records"}</TableCell></TableRow>
                    ) : maintenance.filter(m => !assetFilter || (assets.find(a => a.id === m.assetId)?.assetNo || "").toLowerCase().includes(assetFilter.toLowerCase())).map(m => (
                      <TableRow key={m.id} className="hover:bg-muted/40">
                        <TableCell className="text-sm font-medium">{assets.find(a => a.id === m.assetId)?.nameAr || m.assetName || m.assetId}</TableCell>
                        <TableCell><Badge variant={m.type === "preventive" ? "default" : "destructive"}>{m.type === "preventive" ? (isRtl ? "وقائية" : "Preventive") : (isRtl ? "علاجية" : "Corrective")}</Badge></TableCell>
                        <TableCell className="text-sm">{m.date}</TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">{m.description}</TableCell>
                        <TableCell className="text-sm">{m.technician}</TableCell>
                        <TableCell className="text-sm">{m.cost.toLocaleString()} {isRtl ? "ر.س" : "SAR"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{m.nextDate}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editAsset ? (isRtl ? "تعديل الأصل" : "Edit Asset") : (isRtl ? "إضافة أصل" : "Add Asset")}</DialogTitle></DialogHeader>
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
              { label: isRtl ? "تكلفة الشراء" : "Purchase Cost", field: "purchaseCost", type: "number" },
              { label: isRtl ? "آخر صيانة" : "Last Maintenance", field: "lastMaintenance", type: "date" },
              { label: isRtl ? "الصيانة القادمة" : "Next Maintenance", field: "nextMaintenance", type: "date" },
            ] as any[]).map((f: any) => (
              <div key={f.field}>
                <Label className="text-xs">{f.label}</Label>
                <Input type={f.type || "text"} className="mt-1 h-8 text-sm" value={(form as any)[f.field] || ""} onChange={e => setForm(p => ({ ...p, [f.field]: f.type === "number" ? Number(e.target.value) : e.target.value }))} />
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>{isRtl ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (isRtl ? "حفظ" : "Save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showMaintDialog} onOpenChange={setShowMaintDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{isRtl ? "تسجيل صيانة" : "Log Maintenance"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">{isRtl ? "الأصل *" : "Asset *"}</Label>
              <Select value={maintForm.assetId || ""} onValueChange={v => setMaintForm(p => ({ ...p, assetId: v }))}>
                <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder={isRtl ? "اختر الأصل" : "Select asset"} /></SelectTrigger>
                <SelectContent>{assets.map(a => <SelectItem key={a.id} value={a.id}>{isRtl ? a.nameAr : a.nameEn}</SelectItem>)}</SelectContent>
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
              <div><Label className="text-xs">{isRtl ? "التاريخ *" : "Date *"}</Label><Input type="date" className="mt-1 h-8 text-sm" value={maintForm.date || ""} onChange={e => setMaintForm(p => ({ ...p, date: e.target.value }))} /></div>
            </div>
            <div><Label className="text-xs">{isRtl ? "الوصف" : "Description"}</Label><Input className="mt-1 h-8 text-sm" value={maintForm.description || ""} onChange={e => setMaintForm(p => ({ ...p, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">{isRtl ? "الفني" : "Technician"}</Label><Input className="mt-1 h-8 text-sm" value={maintForm.technician || ""} onChange={e => setMaintForm(p => ({ ...p, technician: e.target.value }))} /></div>
              <div><Label className="text-xs">{isRtl ? "التكلفة" : "Cost (SAR)"}</Label><Input type="number" className="mt-1 h-8 text-sm" value={maintForm.cost || 0} onChange={e => setMaintForm(p => ({ ...p, cost: Number(e.target.value) }))} /></div>
            </div>
            <div><Label className="text-xs">{isRtl ? "موعد الصيانة القادمة" : "Next Maintenance Date"}</Label><Input type="date" className="mt-1 h-8 text-sm" value={maintForm.nextDate || ""} onChange={e => setMaintForm(p => ({ ...p, nextDate: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMaintDialog(false)}>{isRtl ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={handleSaveMaint} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (isRtl ? "تسجيل" : "Record")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
