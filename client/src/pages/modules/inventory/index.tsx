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
import { Package, Plus, Search, ArrowDownToLine, ArrowUpFromLine, AlertTriangle, Edit, Trash2, BarChart3, Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface InventoryItem {
  id: string; code: string; nameAr: string; nameEn: string; category: string;
  unit: string; onHand: number; minStock: number; unitCost: number; warehouse: string; status: "active" | "inactive";
}

interface StockMovement {
  id: string; itemId: string; itemName: string; type: "in" | "out" | "transfer";
  qty: number; date: string; reference: string; notes: string;
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
  <tbody>${items.map(i => `<tr class="${i.onHand <= i.minStock ? "low" : ""}"><td>${i.code}</td><td>${isRtl ? i.nameAr : i.nameEn}</td><td>${i.onHand} ${i.unit}</td><td>${i.minStock} ${i.unit}</td><td>${i.unitCost.toLocaleString()} ${isRtl ? "ر.س" : "SAR"}</td><td>${(i.onHand * i.unitCost).toLocaleString()} ${isRtl ? "ر.س" : "SAR"}</td></tr>`).join("")}</tbody>
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
  const [moveForm, setMoveForm] = useState<{ itemId: string; type: "in" | "out"; qty: number; reference: string; notes: string }>({ itemId: "", type: "in", qty: 0, reference: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [iRes, mRes] = await Promise.all([fetch("/api/inventory-items"), fetch("/api/stock-movements")]);
      const iData = await iRes.json();
      const mData = await mRes.json();
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
  const catLabel = (id: string) => { const c = CATS.find(x => x.id === id); return c ? (isRtl ? c.ar : c.en) : id; };

  const openAdd = () => { setEditItem(null); setForm({ category: "safety", unit: "pcs", status: "active", warehouse: "main", onHand: 0, minStock: 0, unitCost: 0 }); setShowDialog(true); };
  const openEdit = (item: InventoryItem) => { setEditItem(item); setForm(item); setShowDialog(true); };

  const handleSave = async () => {
    if (!form.nameAr || !form.code) { toast({ title: isRtl ? "ادخل البيانات المطلوبة" : "Fill required fields", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const payload = { sku: form.code, nameAr: form.nameAr, nameEn: form.nameEn, category: form.category, unit: form.unit, currentQty: form.onHand, minQty: form.minStock, unitCost: form.unitCost };
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
    if (!moveForm.itemId || moveForm.qty <= 0) { toast({ title: isRtl ? "ادخل البيانات" : "Fill fields", variant: "destructive" }); return; }
    setSaving(true);
    try {
      await fetch("/api/stock-movements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(moveForm) });
      setShowMoveDialog(false);
      toast({ title: isRtl ? "تم تسجيل الحركة" : "Movement recorded" });
      fetchData();
    } catch { toast({ title: isRtl ? "خطأ" : "Error", variant: "destructive" }); }
    finally { setSaving(false); }
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
            <Button variant="outline" size="sm" onClick={() => { setMoveForm({ itemId: "", type: "in", qty: 0, reference: "", notes: "" }); setShowMoveDialog(true); }}>{isRtl ? "حركة مخزون" : "Stock Movement"}</Button>
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
                        <TableHead>{isRtl ? "الكود" : "Code"}</TableHead>
                        <TableHead>{isRtl ? "الصنف" : "Item"}</TableHead>
                        <TableHead>{isRtl ? "الفئة" : "Category"}</TableHead>
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
                        <TableRow><TableCell colSpan={9} className="text-center py-10 text-muted-foreground">{isRtl ? "لا توجد أصناف" : "No items found"}</TableCell></TableRow>
                      ) : filtered.map(item => (
                        <TableRow key={item.id} className={cn("hover:bg-muted/40", item.onHand <= item.minStock && "bg-red-50/30 dark:bg-red-900/10")} data-testid={`row-inventory-${item.id}`}>
                          <TableCell className="font-mono text-xs text-muted-foreground">{item.code}</TableCell>
                          <TableCell className="font-medium text-sm">{isRtl ? item.nameAr : item.nameEn}</TableCell>
                          <TableCell className="text-sm">{catLabel(item.category)}</TableCell>
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
                              <Button variant="ghost" size="icon" className="h-7 w-7" title={isRtl ? "إدخال مخزون" : "Stock In"} onClick={() => { setMoveForm({ itemId: item.id, type: "in", qty: 0, reference: "", notes: "" }); setShowMoveDialog(true); }}><ArrowDownToLine className="w-3.5 h-3.5 text-emerald-600" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" title={isRtl ? "إخراج مخزون" : "Stock Out"} onClick={() => { setMoveForm({ itemId: item.id, type: "out", qty: 0, reference: "", notes: "" }); setShowMoveDialog(true); }}><ArrowUpFromLine className="w-3.5 h-3.5 text-amber-600" /></Button>
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
                        <TableCell><Badge variant={m.type === "in" ? "default" : "secondary"}>{m.type === "in" ? (isRtl ? "وارد" : "In") : (isRtl ? "صادر" : "Out")}</Badge></TableCell>
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
                <SelectContent>{CATS.map(c => <SelectItem key={c.id} value={c.id}>{isRtl ? c.ar : c.en}</SelectItem>)}</SelectContent>
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
                <Select value={moveForm.type} onValueChange={v => setMoveForm(p => ({ ...p, type: v as any }))}>
                  <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">{isRtl ? "وارد" : "Stock In"}</SelectItem>
                    <SelectItem value="out">{isRtl ? "صادر" : "Stock Out"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">{isRtl ? "الكمية *" : "Quantity *"}</Label><Input type="number" className="mt-1 h-8 text-sm" value={moveForm.qty} onChange={e => setMoveForm(p => ({ ...p, qty: Number(e.target.value) }))} /></div>
            </div>
            <div><Label className="text-xs">{isRtl ? "المرجع" : "Reference"}</Label><Input className="mt-1 h-8 text-sm" value={moveForm.reference} onChange={e => setMoveForm(p => ({ ...p, reference: e.target.value }))} /></div>
            <div><Label className="text-xs">{isRtl ? "ملاحظات" : "Notes"}</Label><Input className="mt-1 h-8 text-sm" value={moveForm.notes} onChange={e => setMoveForm(p => ({ ...p, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMoveDialog(false)}>{isRtl ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={handleMovement} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (isRtl ? "تسجيل" : "Record")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
