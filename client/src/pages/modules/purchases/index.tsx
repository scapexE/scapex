import { useState, useEffect, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { esc } from "@/lib/htmlEscape";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShoppingCart, Plus, Search, Truck, DollarSign, Clock, CheckCircle2, Edit, Download, Trash2, Loader2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface PurchaseOrder {
  id: string; poNumber: string; vendor: string; vendorAr: string; vendorId?: string;
  category: string; items: { name: string; qty: number; unit: string; unitPrice: number }[];
  total: number; status: "draft" | "sent" | "partial" | "received" | "cancelled";
  orderDate: string; expectedDate: string; notes: string;
}

interface Vendor {
  id: string; nameAr: string; nameEn: string; category: string;
  phone: string; email: string; vatNo: string; rating: number; status: "active" | "inactive";
}

const CATS = [
  { id: "equipment", ar: "معدات", en: "Equipment" },
  { id: "consumables", ar: "مستهلكات", en: "Consumables" },
  { id: "it", ar: "تقنية المعلومات", en: "IT" },
  { id: "services", ar: "خدمات", en: "Services" },
  { id: "materials", ar: "مواد بناء", en: "Materials" },
];

const SEED_PO: PurchaseOrder[] = [
  { id: "s1", poNumber: "PO-2026-001", vendor: "شركة المعدات الصناعية", vendorAr: "شركة المعدات الصناعية", category: "equipment", items: [{ name: "Safety Helmets", qty: 50, unit: "pcs", unitPrice: 85 }], total: 4250, status: "received", orderDate: "2026-03-01", expectedDate: "2026-03-10", notes: "" },
  { id: "s2", poNumber: "PO-2026-002", vendor: "الشركة السعودية للمستلزمات", vendorAr: "الشركة السعودية للمستلزمات", category: "consumables", items: [{ name: "PPE Gloves", qty: 200, unit: "pairs", unitPrice: 12 }], total: 2400, status: "sent", orderDate: "2026-03-05", expectedDate: "2026-03-15", notes: "" },
];

const SEED_VENDORS: Vendor[] = [
  { id: "s1", nameAr: "شركة المعدات الصناعية", nameEn: "Industrial Equipment Co.", category: "equipment", phone: "+966112345678", email: "info@iec.sa", vatNo: "300123456789012", rating: 5, status: "active" },
  { id: "s2", nameAr: "الشركة السعودية للمستلزمات", nameEn: "Saudi Supplies Co.", category: "consumables", phone: "+966113456789", email: "orders@ssc.sa", vatNo: "300234567890123", rating: 4, status: "active" },
  { id: "s3", nameAr: "مؤسسة التقنية المتقدمة", nameEn: "Advanced Technology Est.", category: "it", phone: "+966114567890", email: "sales@ate.sa", vatNo: "300345678901234", rating: 4, status: "active" },
];

function mapOrder(r: any): PurchaseOrder {
  return {
    id: String(r.id),
    poNumber: r.poNumber || `PO-${r.id}`,
    vendor: r.vendorNameAr || r.vendor || `Vendor ${r.vendorId || ""}`,
    vendorAr: r.vendorNameAr || r.vendor || "",
    vendorId: r.vendorId ? String(r.vendorId) : undefined,
    category: r.category || "equipment",
    items: r.items || [],
    total: parseFloat(r.total || "0") || 0,
    status: r.status || "draft",
    orderDate: r.createdAt ? r.createdAt.split("T")[0] : "",
    expectedDate: r.deliveryDate || r.expectedDate || "",
    notes: r.notes || "",
  };
}

function mapVendor(r: any): Vendor {
  return {
    id: String(r.id),
    nameAr: r.nameAr || "",
    nameEn: r.nameEn || r.nameAr || "",
    category: r.category || "equipment",
    phone: r.phone || "",
    email: r.email || "",
    vatNo: r.vatNumber || r.vatNo || "",
    rating: r.rating || 0,
    status: r.isActive !== false ? "active" : "inactive",
  };
}

function printPO(po: PurchaseOrder, vendors: Vendor[], isRtl: boolean) {
  const v = vendors.find(v => v.id === po.vendorId);
  const html = `<!DOCTYPE html><html dir="${isRtl ? "rtl" : "ltr"}"><head><meta charset="UTF-8"><title>PO ${esc(po.poNumber)}</title>
  <style>body{font-family:Arial,sans-serif;font-size:11px;margin:20px}h2{text-align:center;color:#1d4ed8}.info{display:flex;justify-content:space-between;margin:15px 0;padding:10px;background:#f8fafc;border-radius:6px}table{width:100%;border-collapse:collapse;margin-top:15px}th{background:#1d4ed8;color:white;padding:6px}td{padding:5px;border-bottom:1px solid #e5e7eb}.total{text-align:${isRtl ? "left" : "right"};font-weight:bold;margin-top:10px;font-size:13px}</style></head>
  <body><h2>${isRtl ? "أمر الشراء" : "Purchase Order"} — ${esc(po.poNumber)}</h2>
  <div class="info"><div><strong>${isRtl ? "المورد:" : "Vendor:"}</strong> ${esc(isRtl ? po.vendorAr : (v?.nameEn || po.vendor))}</div><div><strong>${isRtl ? "التاريخ:" : "Date:"}</strong> ${po.orderDate}</div><div><strong>${isRtl ? "التسليم:" : "Delivery:"}</strong> ${po.expectedDate}</div></div>
  <table><thead><tr><th>${isRtl ? "الصنف" : "Item"}</th><th>${isRtl ? "الكمية" : "Qty"}</th><th>${isRtl ? "الوحدة" : "Unit"}</th><th>${isRtl ? "سعر الوحدة" : "Unit Price"}</th><th>${isRtl ? "الإجمالي" : "Total"}</th></tr></thead>
  <tbody>${po.items.map(i => `<tr><td>${esc(i.name)}</td><td>${i.qty}</td><td>${esc(i.unit)}</td><td>${i.unitPrice.toLocaleString()}</td><td>${(i.qty * i.unitPrice).toLocaleString()}</td></tr>`).join("")}</tbody></table>
  <div class="total">${isRtl ? "الإجمالي:" : "Total:"} ${po.total.toLocaleString()} ${isRtl ? "ر.س" : "SAR"}</div>
  <p style="margin-top:20px;color:#6b7280">${esc(po.notes)}</p></body></html>`;
  const w = window.open("", "_blank");
  if (w) { w.document.write(html); w.document.close(); w.print(); }
}

export default function PurchasesModule() {
  const { dir } = useLanguage(); const isRtl = dir === "rtl";
  const { toast } = useToast();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(""); const [statusFilter, setStatusFilter] = useState("all");
  const [vendorFilter, setVendorFilter] = useState("");
  const [showPODialog, setShowPODialog] = useState(false);
  const [showVendorDialog, setShowVendorDialog] = useState(false);
  const [editVendor, setEditVendor] = useState<Vendor | null>(null);
  const [form, setForm] = useState<Partial<PurchaseOrder>>({});
  const [vForm, setVForm] = useState<Partial<Vendor>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const v = params.get("vendor");
    if (v) setVendorFilter(v);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [pRes, vRes] = await Promise.all([fetch("/api/purchase-orders"), fetch("/api/vendors")]);
      const pData = await pRes.json();
      const vData = await vRes.json();

      if (Array.isArray(vData) && vData.length > 0) {
        setVendors(vData.map(mapVendor));
      } else {
        const legacyV = localStorage.getItem("scapex_vendors");
        const src = legacyV ? JSON.parse(legacyV) : SEED_VENDORS;
        for (const v of src) await fetch("/api/vendors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nameAr: v.nameAr, nameEn: v.nameEn, category: v.category, phone: v.phone, email: v.email, vatNo: v.vatNo, rating: v.rating }) });
        if (legacyV) localStorage.removeItem("scapex_vendors");
        const r2 = await fetch("/api/vendors");
        setVendors((await r2.json()).map(mapVendor));
      }

      if (Array.isArray(pData) && pData.length > 0) {
        setOrders(pData.map(mapOrder));
      } else {
        const legacyP = localStorage.getItem("scapex_purchase_orders");
        const src = legacyP ? JSON.parse(legacyP) : SEED_PO;
        for (const po of src) await fetch("/api/purchase-orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ poNumber: po.poNumber, total: po.total, status: po.status, deliveryDate: po.expectedDate, notes: po.notes, items: po.items }) });
        if (legacyP) localStorage.removeItem("scapex_purchase_orders");
        const r2 = await fetch("/api/purchase-orders");
        setOrders((await r2.json()).map(mapOrder));
      }
    } catch { toast({ title: isRtl ? "خطأ في تحميل البيانات" : "Load error", variant: "destructive" }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    return (!q || o.poNumber.toLowerCase().includes(q) || o.vendor.includes(q)) && (statusFilter === "all" || o.status === statusFilter) && (!vendorFilter || o.vendorId === vendorFilter);
  });

  const stats = { total: orders.length, draft: orders.filter(o => o.status === "draft").length, pending: orders.filter(o => o.status === "sent").length, totalValue: orders.reduce((s, o) => s + o.total, 0) };
  const statusColor = (s: string) => ({ draft: "secondary", sent: "default", partial: "secondary", received: "default", cancelled: "destructive" }[s] as any || "secondary");
  const statusLabel = (s: string) => ({ draft: isRtl ? "مسودة" : "Draft", sent: isRtl ? "مرسل" : "Sent", partial: isRtl ? "جزئي" : "Partial", received: isRtl ? "مستلم" : "Received", cancelled: isRtl ? "ملغى" : "Cancelled" }[s] || s);
  const catLabel = (id: string) => { const c = CATS.find(x => x.id === id); return c ? (isRtl ? c.ar : c.en) : id; };

  const handleSavePO = async () => {
    if (!form.poNumber || !form.vendor) { toast({ title: isRtl ? "ادخل البيانات المطلوبة" : "Fill required fields", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const payload = { poNumber: form.poNumber, total: form.total || 0, status: form.status || "draft", deliveryDate: form.expectedDate, notes: form.notes || "", items: form.items || [] };
      await fetch("/api/purchase-orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      setShowPODialog(false);
      toast({ title: isRtl ? "تم حفظ أمر الشراء" : "Purchase order saved" });
      fetchData();
    } catch { toast({ title: isRtl ? "خطأ" : "Error", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await fetch(`/api/purchase-orders/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      toast({ title: isRtl ? "تم تحديث الحالة" : "Status updated" });
      fetchData();
    } catch { toast({ title: isRtl ? "خطأ" : "Error", variant: "destructive" }); }
  };

  const handleDeletePO = async (id: string) => {
    try {
      await fetch(`/api/purchase-orders/${id}`, { method: "DELETE" });
      toast({ title: isRtl ? "تم الحذف" : "Deleted" });
      fetchData();
    } catch { toast({ title: isRtl ? "خطأ" : "Error", variant: "destructive" }); }
  };

  const handleSaveVendor = async () => {
    if (!vForm.nameAr) { toast({ title: isRtl ? "ادخل اسم المورد" : "Enter vendor name", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const payload = { nameAr: vForm.nameAr, nameEn: vForm.nameEn, category: vForm.category, phone: vForm.phone, email: vForm.email, vatNo: vForm.vatNo, rating: vForm.rating || 0 };
      if (editVendor) {
        await fetch(`/api/vendors/${editVendor.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      } else {
        await fetch("/api/vendors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      }
      setShowVendorDialog(false);
      toast({ title: isRtl ? "تم حفظ المورد" : "Vendor saved" });
      fetchData();
    } catch { toast({ title: isRtl ? "خطأ" : "Error", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleDeleteVendor = async (id: string) => {
    try {
      await fetch(`/api/vendors/${id}`, { method: "DELETE" });
      toast({ title: isRtl ? "تم الحذف" : "Deleted" });
      fetchData();
    } catch { toast({ title: isRtl ? "خطأ" : "Error", variant: "destructive" }); }
  };

  return (
    <MainLayout>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{isRtl ? "المشتريات والموردين" : "Purchases & Vendors"}</h1>
            <p className="text-muted-foreground text-sm mt-1">{isRtl ? "إدارة أوامر الشراء والموردين" : "Manage purchase orders and vendors"}</p>
          </div>
          <Button size="sm" onClick={() => { setForm({ status: "draft", orderDate: new Date().toISOString().split("T")[0], items: [] }); setShowPODialog(true); }}>
            <Plus className="w-4 h-4 me-1.5" />{isRtl ? "أمر شراء جديد" : "New Purchase Order"}
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: isRtl ? "إجمالي الطلبات" : "Total Orders", value: stats.total, icon: ShoppingCart, color: "text-blue-500" },
            { label: isRtl ? "مسودات" : "Draft", value: stats.draft, icon: Clock, color: "text-amber-500" },
            { label: isRtl ? "قيد الإرسال" : "Pending", value: stats.pending, icon: Truck, color: "text-purple-500" },
            { label: isRtl ? "إجمالي المشتريات" : "Total Value", value: `${(stats.totalValue / 1000).toFixed(0)}K`, icon: DollarSign, color: "text-emerald-500" },
          ].map((s, i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-xl bg-secondary flex items-center justify-center", s.color)}><s.icon className="w-5 h-5" /></div>
                <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-xl font-bold">{s.value}</p></div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="orders">
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="orders">{isRtl ? "أوامر الشراء" : "Purchase Orders"}</TabsTrigger>
            <TabsTrigger value="vendors">{isRtl ? "الموردون" : "Vendors"}</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="mt-4 space-y-3">
            {vendorFilter && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm">
                <span className="text-blue-700 dark:text-blue-300">{isRtl ? `مفلتر بالمورد` : `Filtered by vendor`}</span>
                <button onClick={() => setVendorFilter("")} className="ms-auto text-xs underline text-blue-600">{isRtl ? "إلغاء الفلتر" : "Clear filter"}</button>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground", isRtl ? "right-3" : "left-3")} />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={isRtl ? "بحث..." : "Search..."} className={cn("h-9 bg-secondary/30", isRtl ? "pr-9" : "pl-9")} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40 h-9 bg-secondary/30"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRtl ? "كل الحالات" : "All Statuses"}</SelectItem>
                  {["draft", "sent", "partial", "received", "cancelled"].map(s => <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>)}
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
                        <TableHead>{isRtl ? "رقم الأمر" : "PO Number"}</TableHead>
                        <TableHead>{isRtl ? "المورد" : "Vendor"}</TableHead>
                        <TableHead>{isRtl ? "الإجمالي" : "Total"}</TableHead>
                        <TableHead>{isRtl ? "تاريخ الطلب" : "Order Date"}</TableHead>
                        <TableHead>{isRtl ? "التسليم المتوقع" : "Expected Delivery"}</TableHead>
                        <TableHead>{isRtl ? "الحالة" : "Status"}</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.length === 0 ? (
                        <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">{isRtl ? "لا توجد أوامر شراء" : "No purchase orders"}</TableCell></TableRow>
                      ) : filtered.map(o => (
                        <TableRow key={o.id} className="hover:bg-muted/40" data-testid={`row-po-${o.id}`}>
                          <TableCell className="font-mono text-xs font-semibold text-primary">{o.poNumber}</TableCell>
                          <TableCell className="text-sm">{isRtl ? o.vendorAr : o.vendor}</TableCell>
                          <TableCell className="text-sm font-medium">{o.total.toLocaleString()} {isRtl ? "ر.س" : "SAR"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{o.orderDate}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{o.expectedDate}</TableCell>
                          <TableCell><Badge variant={statusColor(o.status)}>{statusLabel(o.status)}</Badge></TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" title={isRtl ? "طباعة" : "Print"} onClick={() => printPO(o, vendors, isRtl)}><Download className="w-3.5 h-3.5" /></Button>
                              {o.status === "draft" && <Button variant="ghost" size="icon" className="h-7 w-7" title={isRtl ? "إرسال" : "Send"} onClick={() => handleUpdateStatus(o.id, "sent")}><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /></Button>}
                              {o.status === "sent" && <Button variant="ghost" size="icon" className="h-7 w-7" title={isRtl ? "تسليم" : "Receive"} onClick={() => handleUpdateStatus(o.id, "received")}><Truck className="w-3.5 h-3.5 text-blue-600" /></Button>}
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeletePO(o.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
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

          <TabsContent value="vendors" className="mt-4 space-y-3">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => { setEditVendor(null); setVForm({ status: "active", category: "equipment", rating: 3 }); setShowVendorDialog(true); }}>
                <Plus className="w-4 h-4 me-1.5" />{isRtl ? "إضافة مورد" : "Add Vendor"}
              </Button>
            </div>
            <Card className="border-border/50 overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/40">
                    <TableRow>
                      <TableHead>{isRtl ? "اسم المورد" : "Vendor Name"}</TableHead>
                      <TableHead>{isRtl ? "الفئة" : "Category"}</TableHead>
                      <TableHead>{isRtl ? "الهاتف" : "Phone"}</TableHead>
                      <TableHead>{isRtl ? "البريد" : "Email"}</TableHead>
                      <TableHead>{isRtl ? "التقييم" : "Rating"}</TableHead>
                      <TableHead>{isRtl ? "الحالة" : "Status"}</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendors.map(v => (
                      <TableRow key={v.id} className="hover:bg-muted/40" data-testid={`row-vendor-${v.id}`}>
                        <TableCell><div><p className="font-medium text-sm">{isRtl ? v.nameAr : v.nameEn}</p><p className="text-xs text-muted-foreground">{isRtl ? v.nameEn : v.nameAr}</p></div></TableCell>
                        <TableCell className="text-sm">{catLabel(v.category)}</TableCell>
                        <TableCell className="text-sm">{v.phone}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{v.email}</TableCell>
                        <TableCell className="text-sm">{"★".repeat(v.rating)}{"☆".repeat(5 - v.rating)}</TableCell>
                        <TableCell><Badge variant={v.status === "active" ? "default" : "secondary"}>{v.status === "active" ? (isRtl ? "نشط" : "Active") : (isRtl ? "غير نشط" : "Inactive")}</Badge></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-500" title={isRtl ? "أوامر الشراء" : "View POs"} onClick={() => window.location.href = `/purchases?vendor=${encodeURIComponent(v.id)}`} data-testid={`button-vendor-pos-${v.id}`}><FileText className="w-3.5 h-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditVendor(v); setVForm(v); setShowVendorDialog(true); }}><Edit className="w-3.5 h-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteVendor(v.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showPODialog} onOpenChange={setShowPODialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{isRtl ? "أمر شراء جديد" : "New Purchase Order"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div><Label className="text-xs">{isRtl ? "رقم الأمر *" : "PO Number *"}</Label><Input className="mt-1 h-8 text-sm" value={form.poNumber || ""} onChange={e => setForm(p => ({ ...p, poNumber: e.target.value }))} /></div>
            <div><Label className="text-xs">{isRtl ? "المورد *" : "Vendor *"}</Label>
              <Select value={form.vendorId || "__none__"} onValueChange={v => { const ven = vendors.find(x => x.id === v); setForm(p => ({ ...p, vendorId: v, vendor: ven?.nameEn || "", vendorAr: ven?.nameAr || "" })); }}>
                <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder={isRtl ? "اختر مورداً" : "Select vendor"} /></SelectTrigger>
                <SelectContent><SelectItem value="__none__">{isRtl ? "— اختر —" : "— Select —"}</SelectItem>{vendors.map(v => <SelectItem key={v.id} value={v.id}>{isRtl ? v.nameAr : v.nameEn}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">{isRtl ? "الإجمالي" : "Total (SAR)"}</Label><Input type="number" className="mt-1 h-8 text-sm" value={form.total || 0} onChange={e => setForm(p => ({ ...p, total: Number(e.target.value) }))} /></div>
            <div><Label className="text-xs">{isRtl ? "تاريخ التسليم" : "Delivery Date"}</Label><Input type="date" className="mt-1 h-8 text-sm" value={form.expectedDate || ""} onChange={e => setForm(p => ({ ...p, expectedDate: e.target.value }))} /></div>
            <div className="col-span-2">
              <Label className="text-xs">{isRtl ? "الحالة" : "Status"}</Label>
              <Select value={form.status || "draft"} onValueChange={v => setForm(p => ({ ...p, status: v as any }))}>
                <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{["draft", "sent", "partial", "received", "cancelled"].map(s => <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label className="text-xs">{isRtl ? "ملاحظات" : "Notes"}</Label><Input className="mt-1 h-8 text-sm" value={form.notes || ""} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPODialog(false)}>{isRtl ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={handleSavePO} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (isRtl ? "حفظ" : "Save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showVendorDialog} onOpenChange={setShowVendorDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editVendor ? (isRtl ? "تعديل المورد" : "Edit Vendor") : (isRtl ? "إضافة مورد" : "Add Vendor")}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div><Label className="text-xs">{isRtl ? "الاسم بالعربية *" : "Arabic Name *"}</Label><Input className="mt-1 h-8 text-sm" value={vForm.nameAr || ""} onChange={e => setVForm(p => ({ ...p, nameAr: e.target.value }))} /></div>
            <div><Label className="text-xs">{isRtl ? "الاسم بالإنجليزية" : "English Name"}</Label><Input className="mt-1 h-8 text-sm" value={vForm.nameEn || ""} onChange={e => setVForm(p => ({ ...p, nameEn: e.target.value }))} /></div>
            <div><Label className="text-xs">{isRtl ? "الهاتف" : "Phone"}</Label><Input className="mt-1 h-8 text-sm" value={vForm.phone || ""} onChange={e => setVForm(p => ({ ...p, phone: e.target.value }))} /></div>
            <div><Label className="text-xs">{isRtl ? "البريد الإلكتروني" : "Email"}</Label><Input className="mt-1 h-8 text-sm" value={vForm.email || ""} onChange={e => setVForm(p => ({ ...p, email: e.target.value }))} /></div>
            <div><Label className="text-xs">{isRtl ? "الرقم الضريبي" : "VAT Number"}</Label><Input className="mt-1 h-8 text-sm" value={vForm.vatNo || ""} onChange={e => setVForm(p => ({ ...p, vatNo: e.target.value }))} /></div>
            <div><Label className="text-xs">{isRtl ? "التقييم (1-5)" : "Rating (1-5)"}</Label><Input type="number" min={1} max={5} className="mt-1 h-8 text-sm" value={vForm.rating || 3} onChange={e => setVForm(p => ({ ...p, rating: Number(e.target.value) }))} /></div>
            <div className="col-span-2">
              <Label className="text-xs">{isRtl ? "الفئة" : "Category"}</Label>
              <Select value={vForm.category || "equipment"} onValueChange={v => setVForm(p => ({ ...p, category: v }))}>
                <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{CATS.map(c => <SelectItem key={c.id} value={c.id}>{isRtl ? c.ar : c.en}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVendorDialog(false)}>{isRtl ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={handleSaveVendor} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (isRtl ? "حفظ" : "Save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
