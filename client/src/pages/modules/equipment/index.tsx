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
import { Settings, Plus, Search, Truck, AlertTriangle, Wrench, Edit, Trash2, MapPin, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Asset {
  id: string; assetNo: string; nameAr: string; nameEn: string; category: string;
  brand: string; model: string; serial: string; plate?: string;
  location: string; assignedTo: string; purchaseDate: string; purchaseCost: number;
  lastMaintenance: string; nextMaintenance: string;
  status: "active"|"maintenance"|"out_of_service"|"rented";
}

interface MaintenanceLog {
  id: string; assetId: string; assetName: string; type: "preventive"|"corrective";
  date: string; cost: number; technician: string; description: string; nextDate: string;
}

const CATS = [{id:"vehicle",ar:"مركبات",en:"Vehicles"},{id:"heavy",ar:"معدات ثقيلة",en:"Heavy Equipment"},{id:"survey",ar:"أجهزة مساحة",en:"Survey Instruments"},{id:"safety",ar:"معدات السلامة",en:"Safety Equipment"},{id:"it",ar:"أجهزة تقنية",en:"IT Assets"},{id:"office",ar:"أثاث مكتبي",en:"Office Furniture"}];

const SEED_ASSETS: Asset[] = [
  {id:"1",assetNo:"AST-001",nameAr:"سيارة تويوتا لاندكروزر",nameEn:"Toyota Land Cruiser",category:"vehicle",brand:"Toyota",model:"Land Cruiser 200",serial:"JT3HB18V2S0123456",plate:"أ ب ج 1234",location:"الرياض",assignedTo:"أحمد الغامدي",purchaseDate:"2022-06-15",purchaseCost:280000,lastMaintenance:"2025-12-01",nextMaintenance:"2026-06-01",status:"active"},
  {id:"2",assetNo:"AST-002",nameAr:"سيارة فورد F-150",nameEn:"Ford F-150 Pickup",category:"vehicle",brand:"Ford",model:"F-150 XLT",serial:"1FTFW1ETXKFB12345",plate:"د هـ و 5678",location:"جدة",assignedTo:"محمد الزهراني",purchaseDate:"2023-01-20",purchaseCost:195000,lastMaintenance:"2026-01-15",nextMaintenance:"2026-07-15",status:"active"},
  {id:"3",assetNo:"AST-003",nameAr:"جهاز مسح توبكون",nameEn:"Topcon Total Station",category:"survey",brand:"Topcon",model:"OS-105",serial:"TC-2024-00123",plate:"",location:"موقع الرياض",assignedTo:"Rajesh Kumar",purchaseDate:"2021-09-10",purchaseCost:85000,lastMaintenance:"2025-09-10",nextMaintenance:"2026-03-10",status:"maintenance"},
  {id:"4",assetNo:"AST-004",nameAr:"حفارة جي سي بي",nameEn:"JCB Backhoe Loader",category:"heavy",brand:"JCB",model:"3CX",serial:"JCB3CX240000456",plate:"ز ح ط 9012",location:"موقع الدمام",assignedTo:"Operations Team",purchaseDate:"2020-05-01",purchaseCost:650000,lastMaintenance:"2025-11-20",nextMaintenance:"2026-05-20",status:"active"},
  {id:"5",assetNo:"AST-005",nameAr:"لابتوب ديل",nameEn:"Dell Laptop",category:"it",brand:"Dell",model:"Latitude 5540",serial:"DELL-2025-00789",plate:"",location:"المقر الرئيسي",assignedTo:"سارة القحطاني",purchaseDate:"2025-01-10",purchaseCost:4200,lastMaintenance:"",nextMaintenance:"2026-12-31",status:"active"},
];

const SEED_MAINT: MaintenanceLog[] = [
  {id:"1",assetId:"1",assetName:"Toyota Land Cruiser",type:"preventive",date:"2025-12-01",cost:1200,technician:"ورشة النجم",description:"تغيير زيت ومرشحات",nextDate:"2026-06-01"},
  {id:"2",assetId:"3",assetName:"Topcon Total Station",type:"corrective",date:"2026-03-08",cost:3500,technician:"مركز التوبكون",description:"صيانة الشاشة وإعادة المعايرة",nextDate:"2026-09-08"},
];

const STORAGE_ASSETS = "scapex_assets"; const STORAGE_MAINT = "scapex_maintenance";
function load<T>(k: string, s: T): T { try { const d=localStorage.getItem(k); return d?JSON.parse(d):s; } catch { return s; } }
function save(k: string, d: unknown) { localStorage.setItem(k,JSON.stringify(d)); }

export default function EquipmentModule() {
  const { dir } = useLanguage(); const isRtl = dir==="rtl";
  const { toast } = useToast();
  const [assets, setAssets] = useState<Asset[]>(()=>load(STORAGE_ASSETS, SEED_ASSETS));
  const [maintenance] = useState<MaintenanceLog[]>(()=>load(STORAGE_MAINT, SEED_MAINT));
  const [search, setSearch] = useState(""); const [catFilter, setCatFilter] = useState("all");
  const [showDialog, setShowDialog] = useState(false); const [editAsset, setEditAsset] = useState<Asset|null>(null);
  const [form, setForm] = useState<Partial<Asset>>({});

  const filtered = assets.filter(a => {
    const q=search.toLowerCase();
    return (!q||a.nameAr.includes(q)||a.nameEn.toLowerCase().includes(q)||a.assetNo.toLowerCase().includes(q)||a.plate?.includes(q)) && (catFilter==="all"||a.category===catFilter);
  });

  const nearMaint = assets.filter(a => { const d=new Date(a.nextMaintenance); const now=new Date(); return (d.getTime()-now.getTime())<30*864e5 && a.status==="active"; });
  const stats = { total:assets.length, active:assets.filter(a=>a.status==="active").length, maintenance:assets.filter(a=>a.status==="maintenance").length, nearMaint:nearMaint.length };
  const catLabel = (id:string) => { const c=CATS.find(x=>x.id===id); return c?(isRtl?c.ar:c.en):id; };
  const statusLabel = (s:string) => ({active:isRtl?"نشط":"Active",maintenance:isRtl?"صيانة":"In Maintenance",out_of_service:isRtl?"خارج الخدمة":"Out of Service",rented:isRtl?"مؤجر":"Rented"}[s]||s);
  const statusClass = (s:string) => ({active:"bg-emerald-500 text-white",maintenance:"bg-amber-500 text-white",out_of_service:"",rented:"bg-blue-500 text-white"}[s]||"");

  const openAdd = () => { setEditAsset(null); setForm({category:"vehicle",status:"active",purchaseDate:new Date().toISOString().split("T")[0]}); setShowDialog(true); };
  const openEdit = (a:Asset) => { setEditAsset(a); setForm(a); setShowDialog(true); };
  const handleSave = () => {
    if (!form.nameAr||!form.assetNo) { toast({title:isRtl?"ادخل البيانات المطلوبة":"Fill required fields",variant:"destructive"}); return; }
    if (editAsset) { const u=assets.map(a=>a.id===editAsset.id?{...editAsset,...form} as Asset:a); setAssets(u); save(STORAGE_ASSETS,u); }
    else { const u=[...assets,{...form as Asset,id:Date.now().toString()}]; setAssets(u); save(STORAGE_ASSETS,u); }
    setShowDialog(false); toast({title:isRtl?"تم الحفظ":"Saved"});
  };
  const handleDelete = (id:string) => { const u=assets.filter(a=>a.id!==id); setAssets(u); save(STORAGE_ASSETS,u); toast({title:isRtl?"تم الحذف":"Deleted"}); };

  return (
    <MainLayout>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{isRtl?"المعدات والمركبات":"Equipment & Fleet"}</h1>
            <p className="text-muted-foreground text-sm mt-1">{isRtl?"إدارة الأصول، المركبات، وجدول الصيانة":"Manage assets, vehicles, and maintenance schedules"}</p>
          </div>
          <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 me-1.5"/>{isRtl?"إضافة أصل":"Add Asset"}</Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {label:isRtl?"إجمالي الأصول":"Total Assets",value:stats.total,icon:Settings,color:"text-blue-500"},
            {label:isRtl?"نشط":"Active",value:stats.active,icon:Truck,color:"text-emerald-500"},
            {label:isRtl?"في الصيانة":"In Maintenance",value:stats.maintenance,icon:Wrench,color:"text-amber-500"},
            {label:isRtl?"صيانة قريبة":"Due Soon",value:stats.nearMaint,icon:AlertTriangle,color:"text-red-500"},
          ].map((s,i)=>(
            <Card key={i} className="border-border/50"><CardContent className="p-4 flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-xl bg-secondary flex items-center justify-center",s.color)}><s.icon className="w-5 h-5"/></div>
              <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-xl font-bold">{s.value}</p></div>
            </CardContent></Card>
          ))}
        </div>

        {nearMaint.length>0 && (
          <div className="flex items-center gap-3 p-3 rounded-xl border border-amber-200 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/20">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0"/>
            <p className="text-sm text-amber-700 dark:text-amber-400">{nearMaint.length} {isRtl?"أصول موعد صيانتها خلال 30 يوماً":"assets due for maintenance within 30 days"}</p>
          </div>
        )}

        <Tabs defaultValue="assets">
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="assets">{isRtl?"الأصول":"Assets"}</TabsTrigger>
            <TabsTrigger value="maintenance">{isRtl?"سجل الصيانة":"Maintenance Log"}</TabsTrigger>
          </TabsList>

          <TabsContent value="assets" className="mt-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground",isRtl?"right-3":"left-3")}/>
                <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder={isRtl?"بحث...":"Search..."} className={cn("h-9 bg-secondary/30",isRtl?"pr-9":"pl-9")}/>
              </div>
              <Select value={catFilter} onValueChange={setCatFilter}>
                <SelectTrigger className="w-40 h-9 bg-secondary/30"><SelectValue/></SelectTrigger>
                <SelectContent><SelectItem value="all">{isRtl?"كل الفئات":"All"}</SelectItem>{CATS.map(c=><SelectItem key={c.id} value={c.id}>{isRtl?c.ar:c.en}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Card className="border-border/50 overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/40">
                    <TableRow>
                      <TableHead>{isRtl?"رقم الأصل":"Asset No."}</TableHead>
                      <TableHead>{isRtl?"الاسم":"Name"}</TableHead>
                      <TableHead>{isRtl?"الفئة":"Category"}</TableHead>
                      <TableHead>{isRtl?"الموقع":"Location"}</TableHead>
                      <TableHead>{isRtl?"المسؤول":"Assigned To"}</TableHead>
                      <TableHead>{isRtl?"الصيانة القادمة":"Next Maint."}</TableHead>
                      <TableHead>{isRtl?"الحالة":"Status"}</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(a=>(
                      <TableRow key={a.id} className="hover:bg-muted/40">
                        <TableCell className="font-mono text-xs text-muted-foreground">{a.assetNo}</TableCell>
                        <TableCell>
                          <p className="font-medium text-sm">{isRtl?a.nameAr:a.nameEn}</p>
                          {a.plate && <p className="text-xs text-muted-foreground font-mono">{a.plate}</p>}
                        </TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{catLabel(a.category)}</Badge></TableCell>
                        <TableCell className="text-sm"><div className="flex items-center gap-1 text-muted-foreground"><MapPin className="w-3 h-3"/>{a.location}</div></TableCell>
                        <TableCell className="text-sm">{a.assignedTo}</TableCell>
                        <TableCell className="text-sm">{a.nextMaintenance||"—"}</TableCell>
                        <TableCell><Badge className={cn("text-xs",statusClass(a.status))} variant={a.status==="out_of_service"?"destructive":"secondary"}>{statusLabel(a.status)}</Badge></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={()=>openEdit(a)}><Edit className="w-3.5 h-3.5"/></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={()=>handleDelete(a.id)}><Trash2 className="w-3.5 h-3.5"/></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="maintenance" className="mt-4">
            <Card className="border-border/50 overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/40">
                    <TableRow>
                      <TableHead>{isRtl?"الأصل":"Asset"}</TableHead>
                      <TableHead>{isRtl?"النوع":"Type"}</TableHead>
                      <TableHead>{isRtl?"التاريخ":"Date"}</TableHead>
                      <TableHead>{isRtl?"التكلفة":"Cost"}</TableHead>
                      <TableHead>{isRtl?"الفني":"Technician"}</TableHead>
                      <TableHead>{isRtl?"الوصف":"Description"}</TableHead>
                      <TableHead>{isRtl?"الموعد القادم":"Next Date"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {maintenance.map(m=>(
                      <TableRow key={m.id} className="hover:bg-muted/40">
                        <TableCell className="font-medium text-sm">{m.assetName}</TableCell>
                        <TableCell><Badge variant={m.type==="preventive"?"default":"secondary"} className={m.type==="preventive"?"bg-blue-500 text-white":"bg-amber-500 text-white"}>{m.type==="preventive"?(isRtl?"وقائية":"Preventive"):(isRtl?"تصحيحية":"Corrective")}</Badge></TableCell>
                        <TableCell className="text-sm">{m.date}</TableCell>
                        <TableCell className="font-semibold">{m.cost.toLocaleString()} {isRtl?"ر.س":"SAR"}</TableCell>
                        <TableCell className="text-sm">{m.technician}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{m.description}</TableCell>
                        <TableCell className="text-sm">{m.nextDate}</TableCell>
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
          <DialogHeader><DialogTitle>{editAsset?(isRtl?"تعديل الأصل":"Edit Asset"):(isRtl?"إضافة أصل":"Add Asset")}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            {[{label:isRtl?"رقم الأصل *":"Asset No. *",field:"assetNo"},{label:isRtl?"الاسم بالعربية *":"Arabic Name *",field:"nameAr"},{label:isRtl?"الاسم بالإنجليزية":"English Name",field:"nameEn"},{label:isRtl?"الماركة":"Brand",field:"brand"},{label:isRtl?"الموديل":"Model",field:"model"},{label:isRtl?"الرقم التسلسلي":"Serial No.",field:"serial"},{label:isRtl?"رقم اللوحة":"Plate No.",field:"plate"},{label:isRtl?"الموقع":"Location",field:"location"},{label:isRtl?"المسؤول":"Assigned To",field:"assignedTo"},{label:isRtl?"تاريخ الشراء":"Purchase Date",field:"purchaseDate",type:"date"},{label:isRtl?"تكلفة الشراء":"Purchase Cost",field:"purchaseCost",type:"number"},{label:isRtl?"تاريخ الصيانة القادمة":"Next Maintenance",field:"nextMaintenance",type:"date"}].map(f=>(
              <div key={f.field}><Label className="text-xs font-semibold">{f.label}</Label><Input type={f.type||"text"} className="mt-1 h-8 text-sm" value={(form as any)[f.field]||""} onChange={e=>setForm(p=>({...p,[f.field]:f.type==="number"?Number(e.target.value):e.target.value}))}/></div>
            ))}
            <div><Label className="text-xs font-semibold">{isRtl?"الفئة":"Category"}</Label>
              <Select value={form.category||"vehicle"} onValueChange={v=>setForm(p=>({...p,category:v}))}>
                <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue/></SelectTrigger>
                <SelectContent>{CATS.map(c=><SelectItem key={c.id} value={c.id}>{isRtl?c.ar:c.en}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs font-semibold">{isRtl?"الحالة":"Status"}</Label>
              <Select value={form.status||"active"} onValueChange={v=>setForm(p=>({...p,status:v as any}))}>
                <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue/></SelectTrigger>
                <SelectContent><SelectItem value="active">{isRtl?"نشط":"Active"}</SelectItem><SelectItem value="maintenance">{isRtl?"صيانة":"Maintenance"}</SelectItem><SelectItem value="out_of_service">{isRtl?"خارج الخدمة":"Out of Service"}</SelectItem></SelectContent>
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
