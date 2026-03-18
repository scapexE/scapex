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
import { Package, Plus, Search, ArrowDownToLine, ArrowUpFromLine, AlertTriangle, Edit, Trash2, BarChart3, Warehouse } from "lucide-react";
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

const CATS = [{id:"safety",ar:"مستلزمات السلامة",en:"Safety Supplies"},{id:"tools",ar:"أدوات",en:"Tools"},{id:"materials",ar:"مواد خام",en:"Raw Materials"},{id:"equipment",ar:"معدات",en:"Equipment"},{id:"consumables",ar:"مستهلكات",en:"Consumables"},{id:"it",ar:"تقنية",en:"IT"}];
const WAREHOUSES = [{id:"main",ar:"المستودع الرئيسي",en:"Main Warehouse"},{id:"site_a",ar:"موقع أ",en:"Site A"},{id:"site_b",ar:"موقع ب",en:"Site B"}];

const SEED_ITEMS: InventoryItem[] = [
  {id:"1",code:"SAF-001",nameAr:"خوذة السلامة",nameEn:"Safety Helmet",category:"safety",unit:"pcs",onHand:45,minStock:20,unitCost:85,warehouse:"main",status:"active"},
  {id:"2",code:"SAF-002",nameAr:"حزام السلامة",nameEn:"Safety Harness",category:"safety",unit:"pcs",onHand:12,minStock:10,unitCost:320,warehouse:"main",status:"active"},
  {id:"3",code:"SAF-003",nameAr:"نظارات واقية",nameEn:"Safety Goggles",category:"safety",unit:"pcs",onHand:80,minStock:30,unitCost:45,warehouse:"main",status:"active"},
  {id:"4",code:"TOL-001",nameAr:"عتاد القياس",nameEn:"Survey Equipment Set",category:"tools",unit:"set",onHand:3,minStock:2,unitCost:2800,warehouse:"main",status:"active"},
  {id:"5",code:"SAF-004",nameAr:"قفازات العمل",nameEn:"Work Gloves",category:"safety",unit:"pairs",onHand:8,minStock:50,unitCost:12,warehouse:"main",status:"active"},
  {id:"6",code:"CON-001",nameAr:"قضبان حديدية",nameEn:"Steel Rods",category:"materials",unit:"ton",onHand:15,minStock:10,unitCost:3200,warehouse:"site_a",status:"active"},
  {id:"7",code:"IT-001",nameAr:"لابتوب مهندس",nameEn:"Engineer Laptop",category:"it",unit:"pcs",onHand:5,minStock:2,unitCost:4200,warehouse:"main",status:"active"},
];

const SEED_MOVEMENTS: StockMovement[] = [
  {id:"1",itemId:"1",itemName:"Safety Helmet",type:"in",qty:50,date:"2026-03-01",reference:"PO-2026-001",notes:"Received from supplier"},
  {id:"2",itemId:"1",itemName:"Safety Helmet",type:"out",qty:5,date:"2026-03-05",reference:"REQ-001",notes:"Issued to Site A"},
  {id:"3",itemId:"5",itemName:"Work Gloves",type:"out",qty:42,date:"2026-03-08",reference:"REQ-002",notes:"PPE issue to team"},
];

const STORAGE_INV = "scapex_inventory_items";
function load<T>(key: string, seed: T): T { try { const d = localStorage.getItem(key); return d?JSON.parse(d):seed; } catch { return seed; } }
function save(key: string, data: unknown) { localStorage.setItem(key,JSON.stringify(data)); }

export default function InventoryModule() {
  const { dir } = useLanguage(); const isRtl = dir==="rtl";
  const { toast } = useToast();
  const [items, setItems] = useState<InventoryItem[]>(()=>load(STORAGE_INV, SEED_ITEMS));
  const [movements] = useState<StockMovement[]>(SEED_MOVEMENTS);
  const [search, setSearch] = useState(""); const [catFilter, setCatFilter] = useState("all");
  const [showDialog, setShowDialog] = useState(false); const [editItem, setEditItem] = useState<InventoryItem|null>(null);
  const [form, setForm] = useState<Partial<InventoryItem>>({});

  const filtered = items.filter(item => {
    const q = search.toLowerCase();
    return (!q||item.nameAr.includes(q)||item.nameEn.toLowerCase().includes(q)||item.code.toLowerCase().includes(q)) && (catFilter==="all"||item.category===catFilter);
  });

  const lowStock = items.filter(i=>i.onHand<=i.minStock);
  const stats = { total:items.length, lowStock:lowStock.length, totalValue:items.reduce((s,i)=>s+i.onHand*i.unitCost,0), movements:movements.length };

  const catLabel = (id:string) => { const c=CATS.find(x=>x.id===id); return c?(isRtl?c.ar:c.en):id; };
  const whLabel = (id:string) => { const w=WAREHOUSES.find(x=>x.id===id); return w?(isRtl?w.ar:w.en):id; };

  const openAdd = () => { setEditItem(null); setForm({category:"safety",unit:"pcs",status:"active",warehouse:"main",onHand:0,minStock:0,unitCost:0}); setShowDialog(true); };
  const openEdit = (item:InventoryItem) => { setEditItem(item); setForm(item); setShowDialog(true); };

  const handleSave = () => {
    if (!form.nameAr||!form.code) { toast({title:isRtl?"ادخل البيانات المطلوبة":"Fill required fields",variant:"destructive"}); return; }
    if (editItem) {
      const updated=items.map(i=>i.id===editItem.id?{...editItem,...form} as InventoryItem:i); setItems(updated); save(STORAGE_INV,updated);
    } else {
      const newItem:InventoryItem={...form as InventoryItem,id:Date.now().toString()};
      const updated=[...items,newItem]; setItems(updated); save(STORAGE_INV,updated);
    }
    setShowDialog(false); toast({title:isRtl?"تم الحفظ":"Saved"});
  };

  const handleDelete = (id:string) => {
    const updated=items.filter(i=>i.id!==id); setItems(updated); save(STORAGE_INV,updated);
    toast({title:isRtl?"تم الحذف":"Deleted"});
  };

  return (
    <MainLayout>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{isRtl?"المخازن والمستودعات":"Inventory"}</h1>
            <p className="text-muted-foreground text-sm mt-1">{isRtl?"إدارة المخزون، حركة المواد، وتتبع المستودعات":"Manage stock, movements, and warehouse tracking"}</p>
          </div>
          <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 me-1.5" />{isRtl?"إضافة صنف":"Add Item"}</Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {label:isRtl?"إجمالي الأصناف":"Total Items",value:stats.total,icon:Package,color:"text-blue-500"},
            {label:isRtl?"مخزون منخفض":"Low Stock",value:stats.lowStock,icon:AlertTriangle,color:"text-red-500"},
            {label:isRtl?"قيمة المخزون":"Stock Value",value:`${(stats.totalValue/1000).toFixed(0)}K`,icon:BarChart3,color:"text-emerald-500"},
            {label:isRtl?"حركات المخزون":"Movements",value:stats.movements,icon:ArrowDownToLine,color:"text-purple-500"},
          ].map((s,i) => (
            <Card key={i} className="border-border/50"><CardContent className="p-4 flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-xl bg-secondary flex items-center justify-center",s.color)}><s.icon className="w-5 h-5" /></div>
              <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-xl font-bold">{s.value}</p></div>
            </CardContent></Card>
          ))}
        </div>

        {lowStock.length > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-xl border border-amber-200 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/20">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-400">
              <strong>{lowStock.length}</strong> {isRtl?"أصناف وصلت للحد الأدنى:":"items at minimum stock:"} {lowStock.map(i=>isRtl?i.nameAr:i.nameEn).join("، ")}
            </p>
          </div>
        )}

        <Tabs defaultValue="items">
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="items">{isRtl?"الأصناف":"Items"}</TabsTrigger>
            <TabsTrigger value="movements">{isRtl?"حركات المخزون":"Movements"}</TabsTrigger>
            <TabsTrigger value="warehouses">{isRtl?"المستودعات":"Warehouses"}</TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="mt-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground",isRtl?"right-3":"left-3")} />
                <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder={isRtl?"بحث...":"Search..."} className={cn("h-9 bg-secondary/30",isRtl?"pr-9":"pl-9")} />
              </div>
              <Select value={catFilter} onValueChange={setCatFilter}>
                <SelectTrigger className="w-40 h-9 bg-secondary/30"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">{isRtl?"كل الفئات":"All Categories"}</SelectItem>{CATS.map(c=><SelectItem key={c.id} value={c.id}>{isRtl?c.ar:c.en}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Card className="border-border/50 overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/40">
                    <TableRow>
                      <TableHead>{isRtl?"الكود":"Code"}</TableHead>
                      <TableHead>{isRtl?"الصنف":"Item"}</TableHead>
                      <TableHead>{isRtl?"الفئة":"Category"}</TableHead>
                      <TableHead>{isRtl?"المستودع":"Warehouse"}</TableHead>
                      <TableHead>{isRtl?"المتاح":"On Hand"}</TableHead>
                      <TableHead>{isRtl?"الحد الأدنى":"Min Stock"}</TableHead>
                      <TableHead>{isRtl?"تكلفة الوحدة":"Unit Cost"}</TableHead>
                      <TableHead>{isRtl?"القيمة":"Value"}</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(item => (
                      <TableRow key={item.id} className={cn("hover:bg-muted/40", item.onHand<=item.minStock?"bg-red-50/30 dark:bg-red-950/10":"")}>
                        <TableCell className="font-mono text-xs text-muted-foreground">{item.code}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {item.onHand<=item.minStock&&<AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0"/>}
                            <div><p className="font-medium text-sm">{isRtl?item.nameAr:item.nameEn}</p><p className="text-xs text-muted-foreground">{item.unit}</p></div>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{catLabel(item.category)}</Badge></TableCell>
                        <TableCell className="text-sm">{whLabel(item.warehouse)}</TableCell>
                        <TableCell className={cn("font-semibold",item.onHand<=item.minStock?"text-red-500":"text-emerald-600")}>{item.onHand}</TableCell>
                        <TableCell className="text-muted-foreground">{item.minStock}</TableCell>
                        <TableCell>{item.unitCost.toLocaleString()}</TableCell>
                        <TableCell className="font-medium">{(item.onHand*item.unitCost).toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={()=>openEdit(item)}><Edit className="w-3.5 h-3.5"/></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={()=>handleDelete(item.id)}><Trash2 className="w-3.5 h-3.5"/></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="movements" className="mt-4">
            <Card className="border-border/50 overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/40">
                    <TableRow>
                      <TableHead>{isRtl?"النوع":"Type"}</TableHead>
                      <TableHead>{isRtl?"الصنف":"Item"}</TableHead>
                      <TableHead>{isRtl?"الكمية":"Qty"}</TableHead>
                      <TableHead>{isRtl?"التاريخ":"Date"}</TableHead>
                      <TableHead>{isRtl?"المرجع":"Reference"}</TableHead>
                      <TableHead>{isRtl?"ملاحظات":"Notes"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.map(m=>(
                      <TableRow key={m.id} className="hover:bg-muted/40">
                        <TableCell>
                          <div className={cn("flex items-center gap-1.5 text-xs font-semibold",m.type==="in"?"text-emerald-600":"text-red-500")}>
                            {m.type==="in"?<ArrowDownToLine className="w-3.5 h-3.5"/>:<ArrowUpFromLine className="w-3.5 h-3.5"/>}
                            {m.type==="in"?(isRtl?"وارد":"In"):(isRtl?"صادر":"Out")}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-sm">{m.itemName}</TableCell>
                        <TableCell className="font-semibold">{m.qty}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{m.date}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{m.reference}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{m.notes}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="warehouses" className="mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {WAREHOUSES.map(wh => {
                const whItems = items.filter(i=>i.warehouse===wh.id);
                const whValue = whItems.reduce((s,i)=>s+i.onHand*i.unitCost,0);
                return (
                  <Card key={wh.id} className="border-border/50">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Warehouse className="w-5 h-5 text-primary"/></div>
                        <div><p className="font-bold">{isRtl?wh.ar:wh.en}</p><p className="text-xs text-muted-foreground">{whItems.length} {isRtl?"صنف":"items"}</p></div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">{isRtl?"القيمة الإجمالية":"Total Value"}</span><span className="font-semibold">{whValue.toLocaleString()} {isRtl?"ر.س":"SAR"}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">{isRtl?"أصناف منخفضة":"Low Stock"}</span><span className="font-semibold text-red-500">{whItems.filter(i=>i.onHand<=i.minStock).length}</span></div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editItem?(isRtl?"تعديل الصنف":"Edit Item"):(isRtl?"إضافة صنف":"Add Item")}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            {[{label:isRtl?"الكود *":"Code *",field:"code"},{label:isRtl?"الاسم بالعربية *":"Arabic Name *",field:"nameAr"},{label:isRtl?"الاسم بالإنجليزية":"English Name",field:"nameEn"},{label:isRtl?"وحدة القياس":"Unit",field:"unit"},{label:isRtl?"الكمية المتاحة":"On Hand",field:"onHand",type:"number"},{label:isRtl?"الحد الأدنى":"Min Stock",field:"minStock",type:"number"},{label:isRtl?"تكلفة الوحدة":"Unit Cost",field:"unitCost",type:"number"}].map(f=>(
              <div key={f.field}>
                <Label className="text-xs font-semibold">{f.label}</Label>
                <Input type={f.type||"text"} className="mt-1 h-8 text-sm" value={(form as any)[f.field]||""} onChange={e=>setForm(p=>({...p,[f.field]:f.type==="number"?Number(e.target.value):e.target.value}))} />
              </div>
            ))}
            <div><Label className="text-xs font-semibold">{isRtl?"الفئة":"Category"}</Label>
              <Select value={form.category||"safety"} onValueChange={v=>setForm(p=>({...p,category:v}))}>
                <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue/></SelectTrigger>
                <SelectContent>{CATS.map(c=><SelectItem key={c.id} value={c.id}>{isRtl?c.ar:c.en}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs font-semibold">{isRtl?"المستودع":"Warehouse"}</Label>
              <Select value={form.warehouse||"main"} onValueChange={v=>setForm(p=>({...p,warehouse:v}))}>
                <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue/></SelectTrigger>
                <SelectContent>{WAREHOUSES.map(w=><SelectItem key={w.id} value={w.id}>{isRtl?w.ar:w.en}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setShowDialog(false)}>{isRtl?"إلغاء":"Cancel"}</Button>
            <Button onClick={handleSave}>{isRtl?"حفظ":"Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
