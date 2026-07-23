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
import { Package, Plus, Search, ArrowDownToLine, ArrowUpFromLine, AlertTriangle, Edit, Trash2, BarChart3, Download, Loader2, Warehouse as WarehouseIcon, ArrowLeftRight, Tags } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { dbGetItem } from "@/lib/dbStorage";
import { addNotification } from "@/lib/notifications";

interface InventoryItem {
  id: string; code: string; nameAr: string; nameEn: string; category: string;
  unit: string; onHand: number; minStock: number; unitCost: number; warehouse: string; status: "active" | "inactive";
}

interface StockMovement {
  id: string; itemId: string; itemName: string; type: "in" | "out" | "transfer";
  qty: number; date: string; reference: string; notes: string;
}

interface WarehouseRow {
  id: number; nameAr: string; nameEn: string; location?: string | null; isActive?: boolean;
}

interface CustomCat { id: string; ar: string; en: string; }

const CUSTOM_CATS_KEY = "scapex_inv_categories";
function loadCustomCats(): CustomCat[] {
  try { const v = JSON.parse(localStorage.getItem(CUSTOM_CATS_KEY) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
}

const CATS = [
  { id: "safety", ar: "مستلزمات السلامة", en: "Safety Supplies" },
  { id: "tools", ar: "أدوات", en: "Tools" },
  { id: "materials", ar: "مواد خام", en: "Raw Materials" },
  { id: "equipment", ar: "معدات", en: "Equipment" },
  { id: "consumables", ar: "مستهلكات", en: "Consumables" },
  { id: "it", ar: "تقنية", en: "IT" },
];

const WAREHOUSES = [
  { id: "main", ar: "المستودع الرئيسي", en: "Main Warehouse" },
  { id: "site_a", ar: "موقع أ", en: "Site A" },
  { id: "site_b", ar: "موقع ب", en: "Site B" },
];

const SEED_ITEMS: InventoryItem[] = [
  { id: "s1", code: "SAF-001", nameAr: "خوذة السلامة", nameEn: "Safety Helmet", category: "safety", unit: "pcs", onHand: 45, minStock: 20, unitCost: 85, warehouse: "main", status: "active" },
  { id: "s2", code: "SAF-002", nameAr: "حزام السلامة", nameEn: "Safety Harness", category: "safety", unit: "pcs", onHand: 12, minStock: 10, unitCost: 320, warehouse: "main", status: "active" },
  { id: "s3", code: "SAF-003", nameAr: "نظارات واقية", nameEn: "Safety Goggles", category: "safety", unit: "pcs", onHand: 80, minStock: 30, unitCost: 45, warehouse: "main", status: "active" },
  { id: "s4", code: "TOL-001", nameAr: "عتاد القياس", nameEn: "Survey Equipment Set", category: "tools", unit: "set", onHand: 3, minStock: 2, unitCost: 2800, warehouse: "main", status: "active" },
  { id: "s5", code: "SAF-004", nameAr: "قفازات العمل", nameEn: "Work Gloves", category: "safety", unit: "pairs", onHand: 8, minStock: 50, unitCost: 12, warehouse: "main", status: "active" },
  { id: "s6", code: "CON-001", nameAr: "قضبان حديدية", nameEn: "Steel Rods", category: "materials", unit: "ton", onHand: 15, minStock: 10, unitCost: 3200, warehouse: "site_a", status: "active" },
  { id: "s7", code: "IT-001", nameAr: "لابتوب مهندس", nameEn: "Engineer Laptop", category: "it", unit: "pcs", onHand: 5, minStock: 2, unitCost: 4200, warehouse: "main", status: "active" },
];

function mapItem(r: any): InventoryItem {
  return {
    id: String(r.id),
    code: r.sku || r.code || `SKU-${r.id}`,
    nameAr: r.nameAr || "",
    nameEn: r.nameEn || r.nameAr || "",
    category: r.category || "safety",
    unit: r.unit || "pcs",
    onHand: parseFloat(r.currentQty || r.onHand || "0") || 0,
    minStock: parseFloat(r.minQty || r.minStock || "0") || 0,
    unitCost: parseFloat(r.unitCost || "0") || 0,
    warehouse: r.warehouseId ? `wh_${r.warehouseId}` : (r.warehouse || "main"),
    status: r.isActive !== false ? "active" : "inactive",
  };
}

function mapMovement(r: any): StockMovement {
  return {
    id: String(r.id),
    itemId: String(r.itemId),
    itemName: r.itemName || "",
    type: r.type as any,
    qty: parseFloat(r.qty || "0"),
    date: r.createdAt ? r.createdAt.split("T")[0] : "",
    reference: r.reference || "",
    notes: r.notes || "",
  };
}

function printStockReport(items: InventoryItem[], isRtl: boolean) {
  const total = items.reduce((s, i) => s + i.onHand * i.unitCost, 0);
  const low = items.filter(i => i.onHand <= i.minStock);
  const html = `<!DOCTYPE html><html dir="${isRtl ? "rtl" : "ltr"}"><head><meta charset="UTF-8"><title>${isRtl ? "تقرير المخزون" : "Stock Report"}</title>
  <style>body{font-family:Arial,sans-serif;font-size:11px;margin:20px}h2{text-align:center;color:#059669}table{width:100%;border-collapse:collapse;margin-top:15px}th{background:#059669;color:white;padding:6px;text-align:${isRtl ? "right" : "left"}}td{padding:5px;border-bottom:1px solid #e5e7eb}tr:nth-child(even){background:#f0fdf4}.low{color:#dc2626;font-weight:bold}.sum{background:#f0fdf4;font-weight:bold}</style></head>
  <body><h2>${isRtl ? "تقرير المخزون" : "Inventory Stock Report"}</h2><p style="text-align:center;color:#6b7280">${new Date().toLocaleDateString("ar-SA")} — ${isRtl ? `إجمالي القيمة: ${total.toLocaleString()} ر.س` : `Total Value: ${total.toLocaleString()} SAR`}</p>
  ${low.length > 0 ? `<p style="color:#dc2626;font-weight:bold">⚠ ${isRtl ? `${low.length} أصناف تحت الحد الأدنى` : `${low.length} items below minimum stock`}</p>` : ""}
  <table><thead><tr><th>${isRtl ? "الكود" : "Code"}</th><th>${isRtl ? "الصنف" : "Item"}</th><th>${isRtl ? "الكمية" : "On Hand"}</th><th>${isRtl ? "الحد الأدنى" : "Min Stock"}</th><th>${isRtl ? "سعر الوحدة" : "Unit Cost"}</th><th>${isRtl ? "إجمالي القيمة" : "Total Value"}</th></tr></thead>
  <tbody>${items.map(i => `<tr class="${i.onHand <= i.minStock ? "low" : ""}"><td>${esc(i.code)}</td><td>${esc(isRtl ? i.nameAr : i.nameEn)}</td><td>${i.onHand} ${esc(i.unit)}</td><td>${i.minStock} ${esc(i.unit)}</td><td>${i.unitCost.toLocaleString()} ${isRtl ? "ر.س" : "SAR"}</td><td>${(i.onHand * i.unitCost).toLocaleString()} ${isRtl ? "ر.س" : "SAR"}</td></tr>`).join("")}</tbody>
  <tfoot><tr class="sum"><td colspan="5">${isRtl ? "إجمالي قيمة المخزون" : "Total Inventory Value"}</td><td>${total.toLocaleString()} ${isRtl ? "ر.س" : "SAR"}</td></tr></tfoot></table></body></html>`;
  const w = window.open("", "_blank");
  if (w) { w.document.write(html); w.document.close(); w.print(); }
}

export default function InventoryModule() {
  const { dir } = useLanguage(); const isRtl = dir === "rtl";
  const { toast } = useToast();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(""); const [catFilter, setCatFilter] = useState("all");
  const [showDialog, setShowDialog] = useState(false); const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState<Partial<InventoryItem>>({});
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [moveForm, setMoveForm] = useState<{ itemId: string; type: "in" | "out" | "transfer"; qty: number; reference: string; notes: string; toWarehouseId: string }>({ itemId: "", type: "in", qty: 0, reference: "", notes: "", toWarehouseId: "" });
  const [saving, setSaving] = useState(false);
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
  const [showWhDialog, setShowWhDialog] = useState(false);
  const [editWh, setEditWh] = useState<WarehouseRow | null>(null);
  const [whForm, setWhForm] = useState<{ nameAr: string; nameEn: string; location: string }>({ nameAr: "", nameEn: "", location: "" });
  const [customCats, setCustomCats] = useState<CustomCat[]>(loadCustomCats);
  const [showCatsDialog, setShowCatsDialog] = useState(false);
  const [newCatAr, setNewCatAr] = useState("");
  const [newCatEn, setNewCatEn] = useState("");

  const allCats = [...CATS, ...customCats];

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [iRes, mRes, wRes] = await Promise.all([fetch("/api/inventory-items"), fetch("/api/stock-movements"), fetch("/api/warehouses")]);
      const iData = await iRes.json();
      const mData = await mRes.json();
      let wData = await wRes.json();

      const cu = (() => { try { return JSON.parse(dbGetItem("user") || "null"); } catch { return null; } })();
      const canSeed = cu?.role === "admin" || cu?.role === "manager";
      if (canSeed && (!Array.isArray(wData) || wData.length === 0)) {
        for (const w of WAREHOUSES) {
          await fetch("/api/warehouses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nameAr: w.ar, nameEn: w.en, location: "" }) });
        }
        const wr2 = await fetch("/api/warehouses");
        wData = await wr2.json();
      }
      setWarehouses(Array.isArray(wData) ? wData : []);
      if (Array.isArray(iData) && iData.length > 0) {
        setItems(iData.map(mapItem));
      } else {
        const legacy = localStorage.getItem("scapex_inventory_items");
        const source = legacy ? JSON.parse(legacy) : SEED_ITEMS;
        for (const it of source) {
          await fetch("/api/inventory-items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sku: it.code, nameAr: it.nameAr, nameEn: it.nameEn, category: it.category, unit: it.unit, currentQty: it.onHand, minQty: it.minStock, unitCost: it.unitCost }) });
        }
        if (legacy) localStorage.removeItem("scapex_inventory_items");
        const r2 = await fetch("/api/inventory-items");
        setItems((await r2.json()).map(mapItem));
      }
      setMovements(Array.isArray(mData) ? mData.map(mapMovement) : []);
    } catch { toast({ title: isRtl ? "خطأ في تحميل البيانات" : "Load error", variant: "destructive" }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = items.filter(item => {
    const q = search.toLowerCase();
    return (!q || item.nameAr.includes(q) || item.nameEn.toLowerCase().includes(q) || item.code.toLowerCase().includes(q)) && (catFilter === "all" || item.category === catFilter);
  });

  const lowStock = items.filter(i => i.onHand <= i.minStock);
  const stats = { total: items.length, lowStock: lowStock.length, totalValue: items.reduce((s, i) => s + i.onHand * i.unitCost, 0), movements: movements.length };
  const catLabel = (id: string) => { const c = allCats.find(x => x.id === id); return c ? (isRtl ? c.ar : c.en) : id; };

  /* ── Warehouse helpers ── */
  const whIdOf = (w?: string): string => {
    if (!w) return "";
    if (w.startsWith("wh_")) return w.slice(3);
    const legacy = WAREHOUSES.find(x => x.id === w);
    if (legacy) {
      const seeded = warehouses.find(x => x.nameAr === legacy.ar || x.nameEn === legacy.en);
      return seeded ? String(seeded.id) : "";
    }
    return "";
  };
  const whLabel = (w: string) => {
    const id = whIdOf(w);
    if (id) {
      const wh = warehouses.find(x => String(x.id) === id);
      if (wh) return isRtl ? wh.nameAr : (wh.nameEn || wh.nameAr);
    }
    const legacy = WAREHOUSES.find(x => x.id === w);
    return legacy ? (isRtl ? legacy.ar : legacy.en) : (w || "—");
  };
  const whNameById = (id?: number | string | null) => {
    if (!id) return "—";
    const wh = warehouses.find(x => String(x.id) === String(id));
    return wh ? (isRtl ? wh.nameAr : (wh.nameEn || wh.nameAr)) : "—";
  };

  /* ── Low-stock notifications (dedup per item) ── */
  useEffect(() => {
    if (loading || items.length === 0) return;
    const low = items.filter(i => i.status === "active" && i.onHand <= i.minStock);
    const key = "scapex_lowstock_notified";
    let prev: string[] = [];
    try { const v = JSON.parse(localStorage.getItem(key) || "[]"); prev = Array.isArray(v) ? v : []; } catch { /* ignore */ }
    const newOnes = low.filter(i => !prev.includes(i.id));
    if (newOnes.length > 0) {
      const namesAr = newOnes.slice(0, 3).map(i => i.nameAr || i.nameEn).join("، ");
      const namesEn = newOnes.slice(0, 3).map(i => i.nameEn || i.nameAr).join(", ");
      addNotification({
        titleEn: "Low stock alert",
        titleAr: "تنبيه مخزون منخفض",
        bodyEn: `${newOnes.length} item(s) below minimum stock: ${namesEn}${newOnes.length > 3 ? "…" : ""}`,
        bodyAr: `${newOnes.length} صنف تحت الحد الأدنى: ${namesAr}${newOnes.length > 3 ? "…" : ""}`,
        type: "warning",
        module: "inventory",
        link: "/inventory",
      });
    }
    localStorage.setItem(key, JSON.stringify(low.map(i => i.id)));
  }, [items, loading]);

  const openAdd = () => { setEditItem(null); setForm({ category: "safety", unit: "pcs", status: "active", warehouse: warehouses[0] ? `wh_${warehouses[0].id}` : "main", onHand: 0, minStock: 0, unitCost: 0 }); setShowDialog(true); };
  const openEdit = (item: InventoryItem) => { setEditItem(item); setForm(item); setShowDialog(true); };

  const handleSave = async () => {
    if (!form.nameAr || !form.code) { toast({ title: isRtl ? "ادخل البيانات المطلوبة" : "Fill required fields", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const whId = whIdOf(form.warehouse);
      const payload = { sku: form.code, nameAr: form.nameAr, nameEn: form.nameEn, category: form.category, unit: form.unit, currentQty: form.onHand, minQty: form.minStock, unitCost: form.unitCost, warehouseId: whId ? parseInt(whId) : null };
      if (editItem) {
        await fetch(`/api/inventory-items/${editItem.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      } else {
        await fetch("/api/inventory-items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      }
      setShowDialog(false);
      toast({ title: isRtl ? "تم الحفظ" : "Saved" });
      fetchData();
    } catch { toast({ title: isRtl ? "خطأ" : "Error", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/inventory-items/${id}`, { method: "DELETE" });
      toast({ title: isRtl ? "تم الحذف" : "Deleted" });
      fetchData();
    } catch { toast({ title: isRtl ? "خطأ" : "Error", variant: "destructive" }); }
  };

  const handleMovement = async () => {
    const item = items.find(i => i.id === moveForm.itemId);
    if (!moveForm.itemId || (moveForm.type !== "transfer" && moveForm.qty <= 0)) { toast({ title: isRtl ? "ادخل البيانات" : "Fill fields", variant: "destructive" }); return; }
    if (moveForm.type === "transfer") {
      if (!moveForm.toWarehouseId) { toast({ title: isRtl ? "اختر المستودع المستلم" : "Select destination warehouse", variant: "destructive" }); return; }
      if (item && whIdOf(item.warehouse) === moveForm.toWarehouseId) { toast({ title: isRtl ? "المستودع المستلم هو نفس المستودع الحالي" : "Destination is the same as current warehouse", variant: "destructive" }); return; }
    }
    setSaving(true);
    try {
      const payload: any = {
        itemId: moveForm.itemId, type: moveForm.type,
        qty: moveForm.type === "transfer" ? (item?.onHand ?? 0) : moveForm.qty,
        reference: moveForm.reference, notes: moveForm.notes,
      };
      const curWh = item ? whIdOf(item.warehouse) : "";
      if (curWh) payload.warehouseId = parseInt(curWh);
      if (moveForm.type === "transfer") payload.toWarehouseId = parseInt(moveForm.toWarehouseId);
      const res = await fetch("/api/stock-movements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("Failed");
      setShowMoveDialog(false);
      toast({ title: moveForm.type === "transfer" ? (isRtl ? "تم تحويل الصنف بين المستودعات" : "Item transferred") : (isRtl ? "تم تسجيل الحركة" : "Movement recorded") });
      fetchData();
    } catch { toast({ title: isRtl ? "خطأ" : "Error", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  /* ── Warehouse CRUD ── */
  const openWhAdd = () => { setEditWh(null); setWhForm({ nameAr: "", nameEn: "", location: "" }); setShowWhDialog(true); };
  const openWhEdit = (w: WarehouseRow) => { setEditWh(w); setWhForm({ nameAr: w.nameAr, nameEn: w.nameEn || "", location: w.location || "" }); setShowWhDialog(true); };
  const handleSaveWh = async () => {
    if (!whForm.nameAr) { toast({ title: isRtl ? "أدخل اسم المستودع" : "Enter warehouse name", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const payload = { nameAr: whForm.nameAr, nameEn: whForm.nameEn || whForm.nameAr, location: whForm.location };
      const res = editWh
        ? await fetch(`/api/warehouses/${editWh.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        : await fetch("/api/warehouses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("Failed");
      setShowWhDialog(false);
      toast({ title: editWh ? (isRtl ? "تم تحديث المستودع" : "Warehouse updated") : (isRtl ? "تم إضافة المستودع" : "Warehouse added") });
      fetchData();
    } catch { toast({ title: isRtl ? "خطأ في الحفظ" : "Save error", variant: "destructive" }); }
    finally { setSaving(false); }
  };
  const handleDeleteWh = async (w: WarehouseRow) => {
    try {
      const res = await fetch(`/api/warehouses/${w.id}`, { method: "DELETE" });
      if (res.status === 400) {
        toast({ title: isRtl ? "لا يمكن حذف المستودع — توجد أصناف مرتبطة به. انقل الأصناف أولاً." : "Cannot delete — items are linked to this warehouse.", variant: "destructive" });
        return;
      }
      if (!res.ok) throw new Error("Failed");
      toast({ title: isRtl ? "تم حذف المستودع" : "Warehouse deleted" });
      fetchData();
    } catch { toast({ title: isRtl ? "خطأ" : "Error", variant: "destructive" }); }
  };

  /* ── Category management ── */
  const saveCustomCats = (list: CustomCat[]) => {
    setCustomCats(list);
    localStorage.setItem(CUSTOM_CATS_KEY, JSON.stringify(list));
  };
  const handleAddCat = () => {
    if (!newCatAr.trim()) { toast({ title: isRtl ? "أدخل اسم الفئة" : "Enter category name", variant: "destructive" }); return; }
    const id = `cat_${Date.now()}`;
    saveCustomCats([...customCats, { id, ar: newCatAr.trim(), en: (newCatEn || newCatAr).trim() }]);
    setNewCatAr(""); setNewCatEn("");
    toast({ title: isRtl ? "تمت إضافة الفئة" : "Category added" });
  };
  const handleDeleteCat = (id: string) => {
    const used = items.filter(i => i.category === id).length;
    if (used > 0) { toast({ title: isRtl ? `لا يمكن الحذف — ${used} صنف يستخدم هذه الفئة` : `Cannot delete — used by ${used} item(s)`, variant: "destructive" }); return; }
    saveCustomCats(customCats.filter(c => c.id !== id));
    toast({ title: isRtl ? "تم حذف الفئة" : "Category deleted" });
  };

  return (
    <MainLayout>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{isRtl ? "المخازن والمستودعات" : "Inventory"}</h1>
            <p className="text-muted-foreground text-sm mt-1">{isRtl ? "إدارة المخزون، حركة المواد، وتتبع المستودعات" : "Manage stock, movements, and warehouse tracking"}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => printStockReport(items, isRtl)}><Download className="w-4 h-4 me-1.5" />{isRtl ? "تقرير PDF" : "Stock Report"}</Button>
            <Button variant="outline" size="sm" onClick={() => setShowCatsDialog(true)} data-testid="button-manage-categories"><Tags className="w-4 h-4 me-1.5" />{isRtl ? "الفئات" : "Categories"}</Button>
            <Button variant="outline" size="sm" onClick={() => { setMoveForm({ itemId: "", type: "in", qty: 0, reference: "", notes: "", toWarehouseId: "" }); setShowMoveDialog(true); }}>{isRtl ? "حركة مخزون" : "Stock Movement"}</Button>
            <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 me-1.5" />{isRtl ? "إضافة صنف" : "Add Item"}</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: isRtl ? "إجمالي الأصناف" : "Total Items", value: stats.total, icon: Package, color: "text-blue-500" },
            { label: isRtl ? "مخزون منخفض" : "Low Stock", value: stats.lowStock, icon: AlertTriangle, color: "text-red-500" },
            { label: isRtl ? "إجمالي القيمة" : "Total Value", value: `${(stats.totalValue / 1000).toFixed(0)}K`, icon: BarChart3, color: "text-emerald-500" },
            { label: isRtl ? "حركات المخزون" : "Movements", value: stats.movements, icon: ArrowDownToLine, color: "text-purple-500" },
          ].map((s, i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-xl bg-secondary flex items-center justify-center", s.color)}><s.icon className="w-5 h-5" /></div>
                <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-xl font-bold">{s.value}</p></div>
              </CardContent>
            </Card>
          ))}
        </div>

        {lowStock.length > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{isRtl ? `تنبيه: ${lowStock.length} أصناف تحت الحد الأدنى للمخزون` : `Warning: ${lowStock.length} items below minimum stock level`}</span>
          </div>
        )}

        <Tabs defaultValue="items">
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="items">{isRtl ? "الأصناف" : "Items"}</TabsTrigger>
            <TabsTrigger value="warehouses">{isRtl ? "المستودعات" : "Warehouses"}</TabsTrigger>
            <TabsTrigger value="movements">{isRtl ? "حركة المخزون" : "Movements"}</TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="mt-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground", isRtl ? "right-3" : "left-3")} />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={isRtl ? "بحث..." : "Search..."} className={cn("h-9 bg-secondary/30", isRtl ? "pr-9" : "pl-9")} />
              </div>
              <Select value={catFilter} onValueChange={setCatFilter}>
                <SelectTrigger className="w-44 h-9 bg-secondary/30"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRtl ? "كل الفئات" : "All Categories"}</SelectItem>
                  {allCats.map(c => <SelectItem key={c.id} value={c.id}>{isRtl ? c.ar : c.en}</SelectItem>)}
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
                        <TableHead>{isRtl ? "الكود" : "Code"}</TableHead>
                        <TableHead>{isRtl ? "الصنف" : "Item"}</TableHead>
                        <TableHead>{isRtl ? "الفئة" : "Category"}</TableHead>
                        <TableHead>{isRtl ? "المستودع" : "Warehouse"}</TableHead>
                        <TableHead>{isRtl ? "الكمية" : "On Hand"}</TableHead>
                        <TableHead>{isRtl ? "الحد الأدنى" : "Min Stock"}</TableHead>
                        <TableHead>{isRtl ? "سعر الوحدة" : "Unit Cost"}</TableHead>
                        <TableHead>{isRtl ? "إجمالي القيمة" : "Total Value"}</TableHead>
                        <TableHead>{isRtl ? "الحالة" : "Status"}</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.length === 0 ? (
                        <TableRow><TableCell colSpan={10} className="text-center py-10 text-muted-foreground">{isRtl ? "لا توجد أصناف" : "No items found"}</TableCell></TableRow>
                      ) : filtered.map(item => (
                        <TableRow key={item.id} className={cn("hover:bg-muted/40", item.onHand <= item.minStock && "bg-red-50/30 dark:bg-red-900/10")} data-testid={`row-inventory-${item.id}`}>
                          <TableCell className="font-mono text-xs text-muted-foreground">{item.code}</TableCell>
                          <TableCell className="font-medium text-sm">{isRtl ? item.nameAr : item.nameEn}</TableCell>
                          <TableCell className="text-sm">{catLabel(item.category)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{whLabel(item.warehouse)}</TableCell>
                          <TableCell className="text-sm">
                            <span className={cn("font-semibold", item.onHand <= item.minStock && "text-red-600")}>{item.onHand}</span>
                            <span className="text-muted-foreground text-xs ms-1">{item.unit}</span>
                            {item.onHand <= item.minStock && <AlertTriangle className="w-3 h-3 text-red-500 inline ms-1" />}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{item.minStock} {item.unit}</TableCell>
                          <TableCell className="text-sm">{item.unitCost.toLocaleString()} {isRtl ? "ر.س" : "SAR"}</TableCell>
                          <TableCell className="text-sm font-medium">{(item.onHand * item.unitCost).toLocaleString()} {isRtl ? "ر.س" : "SAR"}</TableCell>
                          <TableCell><Badge variant={item.status === "active" ? "default" : "secondary"}>{item.status === "active" ? (isRtl ? "نشط" : "Active") : (isRtl ? "غير نشط" : "Inactive")}</Badge></TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" title={isRtl ? "إدخال مخزون" : "Stock In"} onClick={() => { setMoveForm({ itemId: item.id, type: "in", qty: 0, reference: "", notes: "", toWarehouseId: "" }); setShowMoveDialog(true); }}><ArrowDownToLine className="w-3.5 h-3.5 text-emerald-600" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" title={isRtl ? "إخراج مخزون" : "Stock Out"} onClick={() => { setMoveForm({ itemId: item.id, type: "out", qty: 0, reference: "", notes: "", toWarehouseId: "" }); setShowMoveDialog(true); }}><ArrowUpFromLine className="w-3.5 h-3.5 text-amber-600" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}><Edit className="w-3.5 h-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(item.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
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

          <TabsContent value="warehouses" className="mt-4 space-y-3">
            <div className="flex justify-end">
              <Button size="sm" onClick={openWhAdd} data-testid="button-add-warehouse"><Plus className="w-4 h-4 me-1.5" />{isRtl ? "إضافة مستودع" : "Add Warehouse"}</Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {warehouses.map(w => {
                const whItems = items.filter(i => whIdOf(i.warehouse) === String(w.id));
                const whValue = whItems.reduce((s, i) => s + i.onHand * i.unitCost, 0);
                return (
                  <Card key={w.id} className="border-border/50 hover:border-primary/30 transition-colors" data-testid={`card-warehouse-${w.id}`}>
                    <CardContent className="p-4 flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0"><WarehouseIcon className="w-5 h-5 text-emerald-600" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{isRtl ? w.nameAr : (w.nameEn || w.nameAr)}</p>
                        {w.location && <p className="text-xs text-muted-foreground mt-0.5">{w.location}</p>}
                        <p className="text-xs text-muted-foreground mt-1">
                          {whItems.length} {isRtl ? "صنف" : "items"} — {whValue.toLocaleString()} {isRtl ? "ر.س" : "SAR"}
                        </p>
                      </div>
                      <div className="flex gap-0.5 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openWhEdit(w)} data-testid={`button-edit-warehouse-${w.id}`}><Edit className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteWh(w)} data-testid={`button-delete-warehouse-${w.id}`}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {warehouses.length === 0 && !loading && (
                <p className="text-sm text-muted-foreground col-span-full text-center py-8">{isRtl ? "لا توجد مستودعات" : "No warehouses"}</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="movements" className="mt-4">
            <Card className="border-border/50 overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/40">
                    <TableRow>
                      <TableHead>{isRtl ? "التاريخ" : "Date"}</TableHead>
                      <TableHead>{isRtl ? "الصنف" : "Item"}</TableHead>
                      <TableHead>{isRtl ? "النوع" : "Type"}</TableHead>
                      <TableHead>{isRtl ? "الكمية" : "Qty"}</TableHead>
                      <TableHead>{isRtl ? "المرجع" : "Reference"}</TableHead>
                      <TableHead>{isRtl ? "ملاحظات" : "Notes"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">{isRtl ? "لا توجد حركات مخزون" : "No movements"}</TableCell></TableRow>
                    ) : movements.map(m => (
                      <TableRow key={m.id} className="hover:bg-muted/40">
                        <TableCell className="text-sm">{m.date}</TableCell>
                        <TableCell className="text-sm">{items.find(i => i.id === m.itemId)?.nameAr || m.itemName || m.itemId}</TableCell>
                        <TableCell>
                          {m.type === "transfer" ? (
                            <Badge variant="outline" className="border-blue-300 text-blue-600 dark:border-blue-700 dark:text-blue-400"><ArrowLeftRight className="w-3 h-3 me-1" />{isRtl ? "تحويل" : "Transfer"}</Badge>
                          ) : (
                            <Badge variant={m.type === "in" ? "default" : "secondary"}>{m.type === "in" ? (isRtl ? "وارد" : "In") : (isRtl ? "صادر" : "Out")}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm font-medium">{m.qty}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{m.reference}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{m.notes}</TableCell>
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
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editItem ? (isRtl ? "تعديل الصنف" : "Edit Item") : (isRtl ? "إضافة صنف" : "Add Item")}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div><Label className="text-xs">{isRtl ? "الكود *" : "Code *"}</Label><Input className="mt-1 h-8 text-sm" value={form.code || ""} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} /></div>
            <div><Label className="text-xs">{isRtl ? "الاسم بالعربية *" : "Arabic Name *"}</Label><Input className="mt-1 h-8 text-sm" value={form.nameAr || ""} onChange={e => setForm(p => ({ ...p, nameAr: e.target.value }))} /></div>
            <div><Label className="text-xs">{isRtl ? "الاسم بالإنجليزية" : "English Name"}</Label><Input className="mt-1 h-8 text-sm" value={form.nameEn || ""} onChange={e => setForm(p => ({ ...p, nameEn: e.target.value }))} /></div>
            <div><Label className="text-xs">{isRtl ? "وحدة القياس" : "Unit"}</Label><Input className="mt-1 h-8 text-sm" value={form.unit || ""} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} /></div>
            <div><Label className="text-xs">{isRtl ? "الكمية الحالية" : "On Hand"}</Label><Input type="number" className="mt-1 h-8 text-sm" value={form.onHand || 0} onChange={e => setForm(p => ({ ...p, onHand: Number(e.target.value) }))} /></div>
            <div><Label className="text-xs">{isRtl ? "الحد الأدنى" : "Min Stock"}</Label><Input type="number" className="mt-1 h-8 text-sm" value={form.minStock || 0} onChange={e => setForm(p => ({ ...p, minStock: Number(e.target.value) }))} /></div>
            <div><Label className="text-xs">{isRtl ? "سعر الوحدة" : "Unit Cost"}</Label><Input type="number" className="mt-1 h-8 text-sm" value={form.unitCost || 0} onChange={e => setForm(p => ({ ...p, unitCost: Number(e.target.value) }))} /></div>
            <div>
              <Label className="text-xs">{isRtl ? "الفئة" : "Category"}</Label>
              <Select value={form.category || "safety"} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{allCats.map(c => <SelectItem key={c.id} value={c.id}>{isRtl ? c.ar : c.en}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">{isRtl ? "المستودع" : "Warehouse"}</Label>
              <Select value={whIdOf(form.warehouse) || ""} onValueChange={v => setForm(p => ({ ...p, warehouse: `wh_${v}` }))}>
                <SelectTrigger className="mt-1 h-8 text-sm" data-testid="select-item-warehouse"><SelectValue placeholder={isRtl ? "اختر المستودع" : "Select warehouse"} /></SelectTrigger>
                <SelectContent>{warehouses.map(w => <SelectItem key={w.id} value={String(w.id)}>{isRtl ? w.nameAr : (w.nameEn || w.nameAr)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>{isRtl ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (isRtl ? "حفظ" : "Save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{isRtl ? "تسجيل حركة مخزون" : "Record Stock Movement"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">{isRtl ? "الصنف *" : "Item *"}</Label>
              <Select value={moveForm.itemId} onValueChange={v => setMoveForm(p => ({ ...p, itemId: v }))}>
                <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder={isRtl ? "اختر الصنف" : "Select item"} /></SelectTrigger>
                <SelectContent>{items.map(i => <SelectItem key={i.id} value={i.id}>{isRtl ? i.nameAr : i.nameEn}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">{isRtl ? "النوع" : "Type"}</Label>
                <Select value={moveForm.type} onValueChange={v => setMoveForm(p => ({ ...p, type: v as any, toWarehouseId: "" }))}>
                  <SelectTrigger className="mt-1 h-8 text-sm" data-testid="select-movement-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">{isRtl ? "وارد" : "Stock In"}</SelectItem>
                    <SelectItem value="out">{isRtl ? "صادر" : "Stock Out"}</SelectItem>
                    <SelectItem value="transfer">{isRtl ? "تحويل بين مستودعات" : "Transfer"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">{isRtl ? "الكمية *" : "Quantity *"}</Label>
                {moveForm.type === "transfer" ? (
                  <p className="mt-2.5 text-[11px] text-muted-foreground leading-tight">{isRtl ? "يتم تحويل كامل كمية الصنف إلى المستودع المستلم" : "The item's full quantity moves to the destination warehouse"}</p>
                ) : (
                  <Input type="number" className="mt-1 h-8 text-sm" value={moveForm.qty} onChange={e => setMoveForm(p => ({ ...p, qty: Number(e.target.value) }))} />
                )}
              </div>
            </div>
            {moveForm.type === "transfer" && (
              <div>
                <Label className="text-xs">{isRtl ? "إلى المستودع *" : "To Warehouse *"}</Label>
                {(() => {
                  const item = items.find(i => i.id === moveForm.itemId);
                  const curId = item ? whIdOf(item.warehouse) : "";
                  return (
                    <>
                      {item && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">{isRtl ? `المستودع الحالي: ${whLabel(item.warehouse)}` : `Current: ${whLabel(item.warehouse)}`}</p>
                      )}
                      <Select value={moveForm.toWarehouseId} onValueChange={v => setMoveForm(p => ({ ...p, toWarehouseId: v }))}>
                        <SelectTrigger className="mt-1 h-8 text-sm" data-testid="select-to-warehouse"><SelectValue placeholder={isRtl ? "اختر المستودع المستلم" : "Select destination"} /></SelectTrigger>
                        <SelectContent>
                          {warehouses.filter(w => String(w.id) !== curId).map(w => <SelectItem key={w.id} value={String(w.id)}>{isRtl ? w.nameAr : (w.nameEn || w.nameAr)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </>
                  );
                })()}
              </div>
            )}
            <div><Label className="text-xs">{isRtl ? "المرجع" : "Reference"}</Label><Input className="mt-1 h-8 text-sm" value={moveForm.reference} onChange={e => setMoveForm(p => ({ ...p, reference: e.target.value }))} /></div>
            <div><Label className="text-xs">{isRtl ? "ملاحظات" : "Notes"}</Label><Input className="mt-1 h-8 text-sm" value={moveForm.notes} onChange={e => setMoveForm(p => ({ ...p, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMoveDialog(false)}>{isRtl ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={handleMovement} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (isRtl ? "تسجيل" : "Record")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Warehouse Dialog ── */}
      <Dialog open={showWhDialog} onOpenChange={setShowWhDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editWh ? (isRtl ? "تعديل المستودع" : "Edit Warehouse") : (isRtl ? "إضافة مستودع" : "Add Warehouse")}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label className="text-xs">{isRtl ? "الاسم بالعربية *" : "Arabic Name *"}</Label><Input className="mt-1 h-9 text-sm" value={whForm.nameAr} onChange={e => setWhForm(p => ({ ...p, nameAr: e.target.value }))} data-testid="input-warehouse-name-ar" /></div>
            <div><Label className="text-xs">{isRtl ? "الاسم بالإنجليزية" : "English Name"}</Label><Input className="mt-1 h-9 text-sm" value={whForm.nameEn} onChange={e => setWhForm(p => ({ ...p, nameEn: e.target.value }))} data-testid="input-warehouse-name-en" /></div>
            <div><Label className="text-xs">{isRtl ? "الموقع" : "Location"}</Label><Input className="mt-1 h-9 text-sm" value={whForm.location} onChange={e => setWhForm(p => ({ ...p, location: e.target.value }))} data-testid="input-warehouse-location" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWhDialog(false)}>{isRtl ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={handleSaveWh} disabled={saving} data-testid="button-save-warehouse">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (isRtl ? "حفظ" : "Save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Categories Dialog ── */}
      <Dialog open={showCatsDialog} onOpenChange={setShowCatsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{isRtl ? "إدارة فئات الأصناف" : "Manage Categories"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="border border-border/60 rounded-md divide-y divide-border/40 max-h-56 overflow-y-auto">
              {allCats.map(c => {
                const isCustom = customCats.some(x => x.id === c.id);
                const used = items.filter(i => i.category === c.id).length;
                return (
                  <div key={c.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                    <Tags className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="flex-1">{isRtl ? c.ar : c.en}</span>
                    <span className="text-xs text-muted-foreground">{used} {isRtl ? "صنف" : "items"}</span>
                    {isCustom ? (
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDeleteCat(c.id)} data-testid={`button-delete-category-${c.id}`}><Trash2 className="w-3 h-3" /></Button>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">{isRtl ? "أساسية" : "Built-in"}</Badge>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">{isRtl ? "اسم الفئة بالعربية *" : "Arabic Name *"}</Label><Input className="mt-1 h-8 text-sm" value={newCatAr} onChange={e => setNewCatAr(e.target.value)} data-testid="input-new-category-ar" /></div>
              <div><Label className="text-xs">{isRtl ? "بالإنجليزية" : "English Name"}</Label><Input className="mt-1 h-8 text-sm" value={newCatEn} onChange={e => setNewCatEn(e.target.value)} data-testid="input-new-category-en" /></div>
            </div>
            <Button size="sm" variant="outline" className="w-full" onClick={handleAddCat} data-testid="button-add-category"><Plus className="w-4 h-4 me-1.5" />{isRtl ? "إضافة فئة جديدة" : "Add Category"}</Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCatsDialog(false)}>{isRtl ? "إغلاق" : "Close"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
