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
import { Landmark, Plus, Search, AlertTriangle, CheckCircle2, Clock, Edit, Trash2, Calendar, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Permit {
  id: string; permitNo: string; type: string; entity: string; entityAr: string;
  project: string; issueDate: string; expiryDate: string; fee: number;
  status: "active"|"expired"|"expiring_soon"|"pending"|"cancelled"; notes: string;
}

interface GovEntity {
  id: string; nameAr: string; nameEn: string; type: string; contactPerson: string;
  phone: string; email: string; website: string; lastContact: string;
}

const PERMIT_TYPES = [{id:"building",ar:"رخصة بناء",en:"Building Permit"},{id:"env",ar:"موافقة بيئية",en:"Environmental Clearance"},{id:"safety",ar:"شهادة سلامة",en:"Safety Certificate"},{id:"municipality",ar:"ترخيص بلدي",en:"Municipality License"},{id:"coc",ar:"شهادة إتمام",en:"Certificate of Completion"},{id:"cr",ar:"سجل تجاري",en:"Commercial Registration"}];
const ENTITY_TYPES = [{id:"ministry",ar:"وزارة",en:"Ministry"},{id:"municipality",ar:"أمانة/بلدية",en:"Municipality"},{id:"authority",ar:"هيئة",en:"Authority"},{id:"other",ar:"أخرى",en:"Other"}];

const SEED_PERMITS: Permit[] = [
  {id:"1",permitNo:"PRM-2025-001",type:"cr",entity:"وزارة التجارة",entityAr:"وزارة التجارة",project:"",issueDate:"2025-01-15",expiryDate:"2026-01-15",fee:500,status:"expiring_soon",notes:"تجديد قبل 15 يناير 2026"},
  {id:"2",permitNo:"PRM-2025-002",type:"safety",entity:"الدفاع المدني",entityAr:"الدفاع المدني",project:"مشروع الرياض",issueDate:"2025-06-01",expiryDate:"2026-06-01",fee:1200,status:"active",notes:""},
  {id:"3",permitNo:"PRM-2025-003",type:"env",entity:"الهيئة السعودية للبيئة",entityAr:"الهيئة السعودية للبيئة",project:"مشروع الدمام",issueDate:"2024-09-15",expiryDate:"2025-09-15",fee:3500,status:"expired",notes:"يجب التجديد"},
  {id:"4",permitNo:"PRM-2026-001",type:"building",entity:"أمانة منطقة الرياض",entityAr:"أمانة منطقة الرياض",project:"مشروع نيوم",issueDate:"2026-02-01",expiryDate:"2027-02-01",fee:8000,status:"active",notes:""},
  {id:"5",permitNo:"PRM-2026-002",type:"municipality",entity:"أمانة جدة",entityAr:"أمانة جدة",project:"مشروع جدة",issueDate:"",expiryDate:"",fee:2500,status:"pending",notes:"قيد المعالجة"},
];

const SEED_ENTITIES: GovEntity[] = [
  {id:"1",nameAr:"وزارة البيئة والمياه والزراعة",nameEn:"Ministry of Environment, Water & Agriculture",type:"ministry",contactPerson:"م. عبدالله",phone:"920002518",email:"info@mewa.gov.sa",website:"www.mewa.gov.sa",lastContact:"2026-02-15"},
  {id:"2",nameAr:"الهيئة السعودية للبيئة",nameEn:"Saudi Environmental Authority",type:"authority",contactPerson:"د. خالد",phone:"920001900",email:"info@sea.gov.sa",website:"www.sea.gov.sa",lastContact:"2026-01-20"},
  {id:"3",nameAr:"أمانة منطقة الرياض",nameEn:"Riyadh Regional Municipality",type:"municipality",contactPerson:"م. فهد",phone:"920002929",email:"info@alriyadh.gov.sa",website:"www.alriyadh.gov.sa",lastContact:"2026-03-01"},
  {id:"4",nameAr:"الدفاع المدني",nameEn:"Civil Defense Directorate",type:"authority",contactPerson:"نقيب سعيد",phone:"998",email:"info@998.gov.sa",website:"www.998.gov.sa",lastContact:"2026-01-10"},
];

const STORAGE = "scapex_permits";
function load<T>(k: string, s: T): T { try { const d=localStorage.getItem(k); return d?JSON.parse(d):s; } catch { return s; } }
function save(k: string, d: unknown) { localStorage.setItem(k,JSON.stringify(d)); }

export default function GovernmentModule() {
  const { dir } = useLanguage(); const isRtl = dir==="rtl";
  const { toast } = useToast();
  const [permits, setPermits] = useState<Permit[]>(()=>load(STORAGE, SEED_PERMITS));
  const [entities] = useState<GovEntity[]>(SEED_ENTITIES);
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false); const [editPermit, setEditPermit] = useState<Permit|null>(null);
  const [form, setForm] = useState<Partial<Permit>>({});

  const filtered = permits.filter(p => {
    const q=search.toLowerCase();
    return !q||p.permitNo.toLowerCase().includes(q)||p.entityAr.includes(q)||p.project.includes(q);
  });

  const stats = { total:permits.length, active:permits.filter(p=>p.status==="active").length, expired:permits.filter(p=>p.status==="expired").length, expiring:permits.filter(p=>p.status==="expiring_soon").length, pending:permits.filter(p=>p.status==="pending").length };
  const typeLabel = (id:string) => { const t=PERMIT_TYPES.find(x=>x.id===id); return t?(isRtl?t.ar:t.en):id; };
  const statusLabel = (s:string) => ({active:isRtl?"ساري":"Active",expired:isRtl?"منتهي":"Expired",expiring_soon:isRtl?"قارب على الانتهاء":"Expiring Soon",pending:isRtl?"معلق":"Pending",cancelled:isRtl?"ملغى":"Cancelled"}[s]||s);
  const statusClass = (s:string) => ({active:"bg-emerald-500 text-white",expired:"",expiring_soon:"bg-amber-500 text-white",pending:"bg-blue-500 text-white"}[s]||"");

  const openAdd = () => { setEditPermit(null); setForm({type:"building",status:"active",fee:0}); setShowDialog(true); };
  const openEdit = (p:Permit) => { setEditPermit(p); setForm(p); setShowDialog(true); };
  const handleSave = () => {
    if (!form.permitNo||!form.entityAr) { toast({title:isRtl?"ادخل البيانات":"Fill required",variant:"destructive"}); return; }
    if (editPermit) { const u=permits.map(p=>p.id===editPermit.id?{...editPermit,...form} as Permit:p); setPermits(u); save(STORAGE,u); }
    else { const u=[{...form as Permit,id:Date.now().toString()},...permits]; setPermits(u); save(STORAGE,u); }
    setShowDialog(false); toast({title:isRtl?"تم الحفظ":"Saved"});
  };
  const handleDelete = (id:string) => { const u=permits.filter(p=>p.id!==id); setPermits(u); save(STORAGE,u); toast({title:isRtl?"تم الحذف":"Deleted"}); };

  return (
    <MainLayout>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{isRtl?"الجهات الحكومية والتراخيص":"Government Entities & Permits"}</h1>
            <p className="text-muted-foreground text-sm mt-1">{isRtl?"تتبع التراخيص، الأذونات، والامتثال الحكومي":"Track permits, licenses, and government compliance"}</p>
          </div>
          <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 me-1.5"/>{isRtl?"ترخيص جديد":"New Permit"}</Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            {label:isRtl?"الإجمالي":"Total",value:stats.total,color:"text-blue-500",icon:Landmark},
            {label:isRtl?"سارية":"Active",value:stats.active,color:"text-emerald-500",icon:CheckCircle2},
            {label:isRtl?"قارب الانتهاء":"Expiring",value:stats.expiring,color:"text-amber-500",icon:AlertTriangle},
            {label:isRtl?"منتهية":"Expired",value:stats.expired,color:"text-red-500",icon:AlertTriangle},
            {label:isRtl?"معلقة":"Pending",value:stats.pending,color:"text-purple-500",icon:Clock},
          ].map((s,i)=>(
            <Card key={i} className="border-border/50"><CardContent className="p-4 flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-xl bg-secondary flex items-center justify-center",s.color)}><s.icon className="w-5 h-5"/></div>
              <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-xl font-bold">{s.value}</p></div>
            </CardContent></Card>
          ))}
        </div>

        {(stats.expired>0||stats.expiring>0) && (
          <div className="flex items-center gap-3 p-3 rounded-xl border border-amber-200 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/20">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0"/>
            <p className="text-sm text-amber-700 dark:text-amber-400">
              {stats.expired>0 && <><strong>{stats.expired}</strong> {isRtl?"تراخيص منتهية الصلاحية":"expired permits"} </>}
              {stats.expiring>0 && <><strong>{stats.expiring}</strong> {isRtl?"قارب انتهاؤها":"expiring soon"}</>}
            </p>
          </div>
        )}

        <Tabs defaultValue="permits">
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="permits">{isRtl?"التراخيص والأذونات":"Permits & Licenses"}</TabsTrigger>
            <TabsTrigger value="entities">{isRtl?"الجهات الحكومية":"Gov. Entities"}</TabsTrigger>
          </TabsList>

          <TabsContent value="permits" className="mt-4 space-y-3">
            <div className="relative">
              <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground",isRtl?"right-3":"left-3")}/>
              <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder={isRtl?"بحث...":"Search..."} className={cn("h-9 bg-secondary/30 w-full sm:w-80",isRtl?"pr-9":"pl-9")}/>
            </div>
            <Card className="border-border/50 overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/40">
                    <TableRow>
                      <TableHead>{isRtl?"رقم الترخيص":"Permit No."}</TableHead>
                      <TableHead>{isRtl?"النوع":"Type"}</TableHead>
                      <TableHead>{isRtl?"الجهة":"Entity"}</TableHead>
                      <TableHead>{isRtl?"المشروع":"Project"}</TableHead>
                      <TableHead>{isRtl?"تاريخ الإصدار":"Issue Date"}</TableHead>
                      <TableHead>{isRtl?"تاريخ الانتهاء":"Expiry Date"}</TableHead>
                      <TableHead>{isRtl?"الرسوم":"Fee"}</TableHead>
                      <TableHead>{isRtl?"الحالة":"Status"}</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(p=>(
                      <TableRow key={p.id} className={cn("hover:bg-muted/40",p.status==="expired"?"bg-red-50/20 dark:bg-red-950/10":"",p.status==="expiring_soon"?"bg-amber-50/20 dark:bg-amber-950/10":"")}>
                        <TableCell className="font-mono text-xs text-muted-foreground">{p.permitNo}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{typeLabel(p.type)}</Badge></TableCell>
                        <TableCell className="font-medium text-sm">{p.entityAr}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.project||"—"}</TableCell>
                        <TableCell className="text-sm">{p.issueDate||"—"}</TableCell>
                        <TableCell className={cn("text-sm font-medium",p.status==="expired"?"text-red-500":p.status==="expiring_soon"?"text-amber-600":"")}>{p.expiryDate||"—"}</TableCell>
                        <TableCell className="text-sm">{p.fee>0?`${p.fee.toLocaleString()} ${isRtl?"ر.س":"SAR"}`:"—"}</TableCell>
                        <TableCell><Badge className={cn("text-xs",statusClass(p.status))} variant={p.status==="expired"?"destructive":"secondary"}>{statusLabel(p.status)}</Badge></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={()=>openEdit(p)}><Edit className="w-3.5 h-3.5"/></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={()=>handleDelete(p.id)}><Trash2 className="w-3.5 h-3.5"/></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="entities" className="mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {entities.map(e=>(
                <Card key={e.id} className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><Landmark className="w-5 h-5 text-primary"/></div>
                      <div><p className="font-semibold text-sm">{isRtl?e.nameAr:e.nameEn}</p><Badge variant="outline" className="text-xs mt-0.5">{ENTITY_TYPES.find(t=>t.id===e.type)?.(isRtl?"ar":"en")??e.type}</Badge></div>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p><strong>{isRtl?"المسؤول:":"Contact:"}</strong> {e.contactPerson}</p>
                      <p><strong>{isRtl?"الهاتف:":"Phone:"}</strong> {e.phone}</p>
                      <p><strong>{isRtl?"آخر تواصل:":"Last Contact:"}</strong> {e.lastContact}</p>
                    </div>
                    <Button variant="link" className="p-0 h-auto text-xs mt-2 text-primary" onClick={()=>window.open(`https://${e.website}`,"_blank")}>
                      <ExternalLink className="w-3 h-3 me-1"/>{e.website}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editPermit?(isRtl?"تعديل الترخيص":"Edit Permit"):(isRtl?"ترخيص/إذن جديد":"New Permit")}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            {[{label:isRtl?"رقم الترخيص *":"Permit No. *",field:"permitNo"},{label:isRtl?"الجهة الحكومية *":"Government Entity *",field:"entityAr"},{label:isRtl?"المشروع":"Project",field:"project"},{label:isRtl?"تاريخ الإصدار":"Issue Date",field:"issueDate",type:"date"},{label:isRtl?"تاريخ الانتهاء":"Expiry Date",field:"expiryDate",type:"date"},{label:isRtl?"الرسوم (ر.س)":"Fee (SAR)",field:"fee",type:"number"},{label:isRtl?"ملاحظات":"Notes",field:"notes"}].map(f=>(
              <div key={f.field}><Label className="text-xs font-semibold">{f.label}</Label><Input type={f.type||"text"} className="mt-1 h-8 text-sm" value={(form as any)[f.field]||""} onChange={e=>setForm(p=>({...p,[f.field]:f.type==="number"?Number(e.target.value):e.target.value}))}/></div>
            ))}
            <div><Label className="text-xs font-semibold">{isRtl?"نوع الترخيص":"Permit Type"}</Label>
              <Select value={form.type||"building"} onValueChange={v=>setForm(p=>({...p,type:v}))}>
                <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue/></SelectTrigger>
                <SelectContent>{PERMIT_TYPES.map(t=><SelectItem key={t.id} value={t.id}>{isRtl?t.ar:t.en}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs font-semibold">{isRtl?"الحالة":"Status"}</Label>
              <Select value={form.status||"pending"} onValueChange={v=>setForm(p=>({...p,status:v as any}))}>
                <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue/></SelectTrigger>
                <SelectContent><SelectItem value="active">{isRtl?"ساري":"Active"}</SelectItem><SelectItem value="pending">{isRtl?"معلق":"Pending"}</SelectItem><SelectItem value="expired">{isRtl?"منتهي":"Expired"}</SelectItem></SelectContent>
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
