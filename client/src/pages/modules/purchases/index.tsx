import { useState } from "react";
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
import { ShoppingCart, Plus, Search, Truck, DollarSign, Clock, CheckCircle2, Edit, Eye, Download, X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendor: string;
  vendorAr: string;
  category: string;
  items: { name: string; qty: number; unit: string; unitPrice: number }[];
  total: number;
  status: "draft" | "sent" | "partial" | "received" | "cancelled";
  orderDate: string;
  expectedDate: string;
  notes: string;
}

interface Vendor {
  id: string;
  nameAr: string;
  nameEn: string;
  category: string;
  phone: string;
  email: string;
  vatNo: string;
  rating: number;
  status: "active" | "inactive";
}

const SEED_PO: PurchaseOrder[] = [
  { id:"1", poNumber:"PO-2026-001", vendor:"شركة المعدات الصناعية", vendorAr:"شركة المعدات الصناعية", category:"equipment", items:[{name:"Safety Helmets",qty:50,unit:"pcs",unitPrice:85},{name:"Safety Harness",qty:20,unit:"pcs",unitPrice:320}], total:10650, status:"received", orderDate:"2026-03-01", expectedDate:"2026-03-10", notes:"" },
  { id:"2", poNumber:"PO-2026-002", vendor:"الشركة السعودية للمستلزمات", vendorAr:"الشركة السعودية للمستلزمات", category:"consumables", items:[{name:"PPE Gloves",qty:200,unit:"pairs",unitPrice:12},{name:"Safety Goggles",qty:100,unit:"pcs",unitPrice:45}], total:6900, status:"sent", orderDate:"2026-03-05", expectedDate:"2026-03-15", notes:"Urgent order" },
  { id:"3", poNumber:"PO-2026-003", vendor:"مؤسسة التقنية المتقدمة", vendorAr:"مؤسسة التقنية المتقدمة", category:"it", items:[{name:"Laptop Dell",qty:3,unit:"pcs",unitPrice:4200}], total:12600, status:"draft", orderDate:"2026-03-10", expectedDate:"2026-03-25", notes:"" },
  { id:"4", poNumber:"PO-2026-004", vendor:"شركة الخدمات البيئية", vendorAr:"شركة الخدمات البيئية", category:"services", items:[{name:"Soil Testing Service",qty:1,unit:"service",unitPrice:8500}], total:8500, status:"partial", orderDate:"2026-02-20", expectedDate:"2026-03-20", notes:"50% advance paid" },
];

const SEED_VENDORS: Vendor[] = [
  { id:"1", nameAr:"شركة المعدات الصناعية", nameEn:"Industrial Equipment Co.", category:"equipment", phone:"+966112345678", email:"info@iec.sa", vatNo:"300123456789012", rating:5, status:"active" },
  { id:"2", nameAr:"الشركة السعودية للمستلزمات", nameEn:"Saudi Supplies Co.", category:"consumables", phone:"+966113456789", email:"orders@ssc.sa", vatNo:"300234567890123", rating:4, status:"active" },
  { id:"3", nameAr:"مؤسسة التقنية المتقدمة", nameEn:"Advanced Technology Est.", category:"it", phone:"+966114567890", email:"sales@ate.sa", vatNo:"300345678901234", rating:4, status:"active" },
  { id:"4", nameAr:"شركة الخدمات البيئية", nameEn:"Environmental Services Co.", category:"services", phone:"+966115678901", email:"info@esc.sa", vatNo:"300456789012345", rating:3, status:"active" },
];

const CATS = [
  { id:"equipment", ar:"معدات", en:"Equipment" },
  { id:"consumables", ar:"مستهلكات", en:"Consumables" },
  { id:"it", ar:"تقنية المعلومات", en:"IT" },
  { id:"services", ar:"خدمات", en:"Services" },
  { id:"materials", ar:"مواد بناء", en:"Materials" },
];

const STORAGE_PO = "scapex_purchase_orders";
const STORAGE_VEN = "scapex_vendors";
function load<T>(key: string, seed: T): T { try { const d = localStorage.getItem(key); return d ? JSON.parse(d) : seed; } catch { return seed; } }
function save(key: string, data: unknown) { localStorage.setItem(key, JSON.stringify(data)); }

export default function PurchasesModule() {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";
  const { toast } = useToast();
  const [orders, setOrders] = useState<PurchaseOrder[]>(() => load(STORAGE_PO, SEED_PO));
  const [vendors, setVendors] = useState<Vendor[]>(() => load(STORAGE_VEN, SEED_VENDORS));
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showPODialog, setShowPODialog] = useState(false);
  const [showVendorDialog, setShowVendorDialog] = useState(false);
  const [editVendor, setEditVendor] = useState<Vendor | null>(null);
  const [form, setForm] = useState<Partial<PurchaseOrder>>({});
  const [vForm, setVForm] = useState<Partial<Vendor>>({});

  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    return (!q || o.poNumber.toLowerCase().includes(q) || o.vendor.includes(q)) && (statusFilter === "all" || o.status === statusFilter);
  });

  const stats = { total: orders.length, draft: orders.filter(o => o.status === "draft").length, pending: orders.filter(o => o.status === "sent").length, totalValue: orders.reduce((s,o) => s+o.total, 0) };

  const statusColor = (s: string) => ({ draft:"secondary", sent:"default", partial:"secondary", received:"default", cancelled:"destructive" }[s] || "secondary");
  const statusLabel = (s: string) => ({ draft: isRtl?"مسودة":"Draft", sent: isRtl?"مرسل":"Sent", partial: isRtl?"جزئي":"Partial", received: isRtl?"مستلم":"Received", cancelled: isRtl?"ملغى":"Cancelled" }[s] || s);
  const catLabel = (id: string) => { const c = CATS.find(x=>x.id===id); return c ? (isRtl ? c.ar : c.en) : id; };

  const handleApprove = (id: string) => {
    const updated = orders.map(o => o.id === id ? {...o, status: "sent" as const} : o);
    setOrders(updated); save(STORAGE_PO, updated);
    toast({ title: isRtl ? "تم إرسال أمر الشراء" : "Purchase order sent" });
  };

  const handleReceive = (id: string) => {
    const updated = orders.map(o => o.id === id ? {...o, status: "received" as const} : o);
    setOrders(updated); save(STORAGE_PO, updated);
    toast({ title: isRtl ? "تم تأكيد الاستلام" : "Receipt confirmed" });
  };

  const handleSavePO = () => {
    if (!form.vendor) { toast({ title: isRtl ? "حدد المورد" : "Select vendor", variant: "destructive" }); return; }
    const newPO: PurchaseOrder = {
      ...form as PurchaseOrder, id: Date.now().toString(),
      poNumber: `PO-${new Date().getFullYear()}-${String(orders.length + 1).padStart(3,"0")}`,
      items: [], total: 0, status: "draft",
      orderDate: new Date().toISOString().split("T")[0],
    };
    const updated = [newPO, ...orders]; setOrders(updated); save(STORAGE_PO, updated);
    setShowPODialog(false); setForm({});
    toast({ title: isRtl ? "تم إنشاء أمر الشراء" : "Purchase order created" });
  };

  const handleSaveVendor = () => {
    if (!vForm.nameAr) { toast({ title: isRtl ? "أدخل اسم المورد" : "Enter vendor name", variant: "destructive" }); return; }
    if (editVendor) {
      const updated = vendors.map(v => v.id === editVendor.id ? {...editVendor, ...vForm} as Vendor : v);
      setVendors(updated); save(STORAGE_VEN, updated);
    } else {
      const newV: Vendor = {...vForm as Vendor, id: Date.now().toString(), rating: 3, status: "active"};
      const updated = [...vendors, newV]; setVendors(updated); save(STORAGE_VEN, updated);
    }
    setShowVendorDialog(false); setVForm({});
    toast({ title: isRtl ? "تم حفظ بيانات المورد" : "Vendor saved" });
  };

  return (
    <MainLayout>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{isRtl ? "المشتريات" : "Purchases"}</h1>
            <p className="text-muted-foreground text-sm mt-1">{isRtl ? "أوامر الشراء، طلبات العروض، وإدارة الموردين" : "Purchase orders, RFQs, and vendor management"}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setEditVendor(null); setVForm({ category: "equipment", status: "active" }); setShowVendorDialog(true); }}><Truck className="w-4 h-4 me-1.5" />{isRtl ? "مورد جديد" : "New Vendor"}</Button>
            <Button size="sm" onClick={() => { setForm({ category: "equipment", expectedDate: new Date(Date.now()+7*864e5).toISOString().split("T")[0] }); setShowPODialog(true); }}><Plus className="w-4 h-4 me-1.5" />{isRtl ? "أمر شراء" : "Purchase Order"}</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: isRtl?"إجمالي الأوامر":"Total Orders", value: stats.total, icon: ShoppingCart, color:"text-blue-500" },
            { label: isRtl?"مسودات":"Drafts", value: stats.draft, icon: Clock, color:"text-amber-500" },
            { label: isRtl?"بانتظار الاستلام":"Awaiting Receipt", value: stats.pending, icon: Truck, color:"text-orange-500" },
            { label: isRtl?"إجمالي القيمة":"Total Value", value: `${(stats.totalValue/1000).toFixed(0)}K`, icon: DollarSign, color:"text-emerald-500" },
          ].map((s,i) => (
            <Card key={i} className="border-border/50"><CardContent className="p-4 flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-xl bg-secondary flex items-center justify-center",s.color)}><s.icon className="w-5 h-5" /></div>
              <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-xl font-bold">{s.value}</p></div>
            </CardContent></Card>
          ))}
        </div>

        <Tabs defaultValue="orders">
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="orders">{isRtl?"أوامر الشراء":"Purchase Orders"}</TabsTrigger>
            <TabsTrigger value="vendors">{isRtl?"الموردون":"Vendors"}</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="mt-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground", isRtl?"right-3":"left-3")} />
                <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder={isRtl?"بحث...":"Search..."} className={cn("h-9 bg-secondary/30", isRtl?"pr-9":"pl-9")} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36 h-9 bg-secondary/30"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRtl?"الكل":"All"}</SelectItem>
                  <SelectItem value="draft">{isRtl?"مسودة":"Draft"}</SelectItem>
                  <SelectItem value="sent">{isRtl?"مرسل":"Sent"}</SelectItem>
                  <SelectItem value="received">{isRtl?"مستلم":"Received"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Card className="border-border/50 overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/40">
                    <TableRow>
                      <TableHead>{isRtl?"رقم الأمر":"PO No."}</TableHead>
                      <TableHead>{isRtl?"المورد":"Vendor"}</TableHead>
                      <TableHead>{isRtl?"الفئة":"Category"}</TableHead>
                      <TableHead>{isRtl?"تاريخ الطلب":"Order Date"}</TableHead>
                      <TableHead>{isRtl?"التاريخ المتوقع":"Expected"}</TableHead>
                      <TableHead>{isRtl?"الإجمالي":"Total"}</TableHead>
                      <TableHead>{isRtl?"الحالة":"Status"}</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(o => (
                      <TableRow key={o.id} className="hover:bg-muted/40">
                        <TableCell className="font-mono text-xs text-muted-foreground">{o.poNumber}</TableCell>
                        <TableCell className="font-medium text-sm">{o.vendor}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{catLabel(o.category)}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{o.orderDate}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{o.expectedDate}</TableCell>
                        <TableCell className="font-semibold">{o.total.toLocaleString()} {isRtl?"ر.س":"SAR"}</TableCell>
                        <TableCell><Badge variant={statusColor(o.status) as any} className={o.status==="received"?"bg-emerald-500 text-white":""}>{statusLabel(o.status)}</Badge></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {o.status==="draft" && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={()=>handleApprove(o.id)}><CheckCircle2 className="w-3 h-3 me-1" />{isRtl?"إرسال":"Send"}</Button>}
                            {o.status==="sent" && <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={()=>handleReceive(o.id)}>{isRtl?"استلام":"Receive"}</Button>}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="vendors" className="mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {vendors.map(v => (
                <Card key={v.id} className="border-border/50 hover:border-primary/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary text-sm">{v.nameAr[0]}</div>
                        <div><p className="font-semibold text-sm">{isRtl ? v.nameAr : v.nameEn}</p><p className="text-xs text-muted-foreground">{catLabel(v.category)}</p></div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditVendor(v); setVForm(v); setShowVendorDialog(true); }}><Edit className="w-3.5 h-3.5" /></Button>
                      </div>
                    </div>
                    <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                      <p>{v.phone}</p>
                      <p>{v.email}</p>
                      <p>{isRtl?"رقم الضريبة:":"VAT:"} {v.vatNo}</p>
                    </div>
                    <div className="mt-2 flex items-center gap-1">
                      {Array.from({length:5}).map((_,i) => <span key={i} className={i < v.rating ? "text-amber-400" : "text-muted-foreground/30"}>★</span>)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showPODialog} onOpenChange={setShowPODialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{isRtl?"إنشاء أمر شراء جديد":"New Purchase Order"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label className="text-xs font-semibold">{isRtl?"المورد *":"Vendor *"}</Label>
              <Select value={form.vendor||""} onValueChange={v => setForm(p=>({...p, vendor:v, vendorAr:v}))}>
                <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue placeholder={isRtl?"اختر المورد":"Select vendor"} /></SelectTrigger>
                <SelectContent>{vendors.map(v=><SelectItem key={v.id} value={isRtl?v.nameAr:v.nameEn}>{isRtl?v.nameAr:v.nameEn}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs font-semibold">{isRtl?"الفئة":"Category"}</Label>
              <Select value={form.category||"equipment"} onValueChange={v=>setForm(p=>({...p,category:v}))}>
                <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{CATS.map(c=><SelectItem key={c.id} value={c.id}>{isRtl?c.ar:c.en}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs font-semibold">{isRtl?"التاريخ المتوقع للاستلام":"Expected Delivery Date"}</Label>
              <Input type="date" className="mt-1 h-9 text-sm" value={form.expectedDate||""} onChange={e=>setForm(p=>({...p,expectedDate:e.target.value}))} />
            </div>
            <div><Label className="text-xs font-semibold">{isRtl?"ملاحظات":"Notes"}</Label>
              <Input className="mt-1 h-9 text-sm" value={form.notes||""} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setShowPODialog(false)}>{isRtl?"إلغاء":"Cancel"}</Button>
            <Button onClick={handleSavePO}>{isRtl?"إنشاء":"Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showVendorDialog} onOpenChange={setShowVendorDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editVendor?(isRtl?"تعديل المورد":"Edit Vendor"):(isRtl?"مورد جديد":"New Vendor")}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            {[{label:isRtl?"الاسم بالعربية *":"Arabic Name *",field:"nameAr"},{label:isRtl?"الاسم بالإنجليزية":"English Name",field:"nameEn"},{label:isRtl?"الهاتف":"Phone",field:"phone"},{label:isRtl?"البريد الإلكتروني":"Email",field:"email"},{label:isRtl?"الرقم الضريبي":"VAT No.",field:"vatNo"}].map(f=>(
              <div key={f.field}>
                <Label className="text-xs font-semibold">{f.label}</Label>
                <Input className="mt-1 h-8 text-sm" value={(vForm as any)[f.field]||""} onChange={e=>setVForm(p=>({...p,[f.field]:e.target.value}))} />
              </div>
            ))}
            <div><Label className="text-xs font-semibold">{isRtl?"الفئة":"Category"}</Label>
              <Select value={vForm.category||"equipment"} onValueChange={v=>setVForm(p=>({...p,category:v}))}>
                <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{CATS.map(c=><SelectItem key={c.id} value={c.id}>{isRtl?c.ar:c.en}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setShowVendorDialog(false)}>{isRtl?"إلغاء":"Cancel"}</Button>
            <Button onClick={handleSaveVendor}>{isRtl?"حفظ":"Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
