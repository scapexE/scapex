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
import { ShieldAlert, Plus, Search, AlertTriangle, CheckCircle2, ClipboardList, FileText, Activity, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Incident {
  id: string; incidentNo: string; date: string; type: string; severity: "near_miss"|"minor"|"major"|"fatality";
  location: string; reportedBy: string; description: string; injured?: string; status: "open"|"investigating"|"closed";
  correctiveAction: string;
}

interface Inspection {
  id: string; inspectionNo: string; date: string; site: string; inspector: string;
  type: string; score: number; findings: number; status: "scheduled"|"completed"|"overdue";
}

interface PPERecord {
  id: string; empName: string; empNo: string; items: string[]; issuedDate: string; status: "issued"|"expired"|"pending";
}

const INC_TYPES = [{id:"fall",ar:"سقوط",en:"Fall"},{id:"electrical",ar:"كهرباء",en:"Electrical"},{id:"chemical",ar:"مواد كيميائية",en:"Chemical"},{id:"fire",ar:"حريق",en:"Fire"},{id:"vehicle",ar:"مركبة",en:"Vehicle"},{id:"other",ar:"أخرى",en:"Other"}];

const SEED_INCIDENTS: Incident[] = [
  {id:"1",incidentNo:"INC-2026-001",date:"2026-03-05",type:"fall",severity:"minor",location:"موقع الرياض",reportedBy:"محمد الزهراني",description:"انزلاق عامل من سلم بارتفاع 1.5م",injured:"عامل - كدمات طفيفة",status:"closed",correctiveAction:"تركيب حواجز وقاية وتدريب العمال"},
  {id:"2",incidentNo:"INC-2026-002",date:"2026-03-12",type:"electrical",severity:"near_miss",location:"المقر الرئيسي",reportedBy:"أحمد الغامدي",description:"اتصال غير مباشر بسلك كهربائي مكشوف",injured:"",status:"investigating",correctiveAction:"قيد المعالجة"},
];

const SEED_INSPECTIONS: Inspection[] = [
  {id:"1",inspectionNo:"INS-2026-001",date:"2026-03-01",site:"موقع الرياض",inspector:"محمد الزهراني",type:"شهرية",score:87,findings:3,status:"completed"},
  {id:"2",inspectionNo:"INS-2026-002",date:"2026-03-15",site:"موقع جدة",inspector:"محمد الزهراني",type:"أسبوعية",score:92,findings:1,status:"completed"},
  {id:"3",inspectionNo:"INS-2026-003",date:"2026-04-01",site:"موقع الرياض",inspector:"محمد الزهراني",type:"شهرية",score:0,findings:0,status:"scheduled"},
];

const SEED_PPE: PPERecord[] = [
  {id:"1",empName:"أحمد الغامدي",empNo:"EMP-001",items:["خوذة","حزام","قفازات","نظارات"],issuedDate:"2026-01-15",status:"issued"},
  {id:"2",empName:"Rajesh Kumar",empNo:"EMP-004",items:["خوذة","حزام","قفازات"],issuedDate:"2025-10-01",status:"expired"},
];

const STORAGE_INC = "scapex_incidents"; const STORAGE_INS = "scapex_inspections";
function load<T>(k: string, s: T): T { try { const d=localStorage.getItem(k); return d?JSON.parse(d):s; } catch { return s; } }
function save(k: string, d: unknown) { localStorage.setItem(k,JSON.stringify(d)); }

export default function HSEModule() {
  const { dir } = useLanguage(); const isRtl = dir==="rtl";
  const { toast } = useToast();
  const [incidents, setIncidents] = useState<Incident[]>(()=>load(STORAGE_INC, SEED_INCIDENTS));
  const [inspections] = useState<Inspection[]>(SEED_INSPECTIONS);
  const [ppeRecords] = useState<PPERecord[]>(SEED_PPE);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState<Partial<Incident>>({});

  const stats = {
    total: incidents.length,
    open: incidents.filter(i=>i.status==="open"||i.status==="investigating").length,
    nearMiss: incidents.filter(i=>i.severity==="near_miss").length,
    safetyScore: Math.round(inspections.filter(i=>i.score>0).reduce((s,i)=>s+i.score,0)/Math.max(1,inspections.filter(i=>i.score>0).length)),
  };

  const severityLabel = (s:string) => ({near_miss:isRtl?"بالكاد سلم":"Near Miss",minor:isRtl?"طفيف":"Minor",major:isRtl?"خطير":"Major",fatality:isRtl?"وفاة":"Fatality"}[s]||s);
  const severityClass = (s:string) => ({near_miss:"bg-yellow-400 text-black",minor:"bg-orange-400 text-white",major:"bg-red-500 text-white",fatality:"bg-red-900 text-white"}[s]||"");
  const statusLabel = (s:string) => ({open:isRtl?"مفتوح":"Open",investigating:isRtl?"تحقيق":"Investigating",closed:isRtl?"مغلق":"Closed"}[s]||s);

  const handleSaveIncident = () => {
    if (!form.description||!form.location) { toast({title:isRtl?"ادخل البيانات":"Fill required fields",variant:"destructive"}); return; }
    const newInc: Incident = {...form as Incident, id:Date.now().toString(), incidentNo:`INC-${new Date().getFullYear()}-${String(incidents.length+1).padStart(3,"0")}`, date:form.date||new Date().toISOString().split("T")[0], status:"open"};
    const updated=[newInc,...incidents]; setIncidents(updated); save(STORAGE_INC,updated);
    setShowDialog(false); setForm({});
    toast({title:isRtl?"تم تسجيل الحادث":"Incident reported"});
  };

  const handleClose = (id:string) => {
    const updated=incidents.map(i=>i.id===id?{...i,status:"closed" as const}:i); setIncidents(updated); save(STORAGE_INC,updated);
    toast({title:isRtl?"تم إغلاق البلاغ":"Incident closed"});
  };

  return (
    <MainLayout>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{isRtl?"الصحة والسلامة والبيئة (HSE)":"Health, Safety & Environment"}</h1>
            <p className="text-muted-foreground text-sm mt-1">{isRtl?"تقارير الحوادث، التفتيش، ومعدات الحماية الشخصية":"Incident reports, inspections, and PPE management"}</p>
          </div>
          <Button size="sm" onClick={()=>{setForm({severity:"minor",type:"other"});setShowDialog(true)}} className="bg-red-600 hover:bg-red-700">
            <Plus className="w-4 h-4 me-1.5"/>{isRtl?"تسجيل حادث":"Report Incident"}
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {label:isRtl?"إجمالي البلاغات":"Total Incidents",value:stats.total,icon:ShieldAlert,color:"text-red-500"},
            {label:isRtl?"بلاغات مفتوحة":"Open Incidents",value:stats.open,icon:AlertTriangle,color:"text-amber-500"},
            {label:isRtl?"كاد يسلم":"Near Misses",value:stats.nearMiss,icon:Activity,color:"text-orange-500"},
            {label:isRtl?"مستوى السلامة":"Safety Score",value:`${stats.safetyScore}%`,icon:TrendingDown,color:"text-emerald-500"},
          ].map((s,i)=>(
            <Card key={i} className="border-border/50"><CardContent className="p-4 flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-xl bg-secondary flex items-center justify-center",s.color)}><s.icon className="w-5 h-5"/></div>
              <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-xl font-bold">{s.value}</p></div>
            </CardContent></Card>
          ))}
        </div>

        <Tabs defaultValue="incidents">
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="incidents">{isRtl?"الحوادث والبلاغات":"Incidents"}</TabsTrigger>
            <TabsTrigger value="inspections">{isRtl?"التفتيش الميداني":"Inspections"}</TabsTrigger>
            <TabsTrigger value="ppe">{isRtl?"معدات الوقاية (PPE)":"PPE Records"}</TabsTrigger>
          </TabsList>

          <TabsContent value="incidents" className="mt-4">
            <Card className="border-border/50 overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/40">
                    <TableRow>
                      <TableHead>{isRtl?"رقم البلاغ":"Inc. No."}</TableHead>
                      <TableHead>{isRtl?"التاريخ":"Date"}</TableHead>
                      <TableHead>{isRtl?"النوع":"Type"}</TableHead>
                      <TableHead>{isRtl?"الخطورة":"Severity"}</TableHead>
                      <TableHead>{isRtl?"الموقع":"Location"}</TableHead>
                      <TableHead>{isRtl?"المُبلِّغ":"Reported By"}</TableHead>
                      <TableHead>{isRtl?"الحالة":"Status"}</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {incidents.map(inc=>(
                      <TableRow key={inc.id} className="hover:bg-muted/40">
                        <TableCell className="font-mono text-xs text-muted-foreground">{inc.incidentNo}</TableCell>
                        <TableCell className="text-sm">{inc.date}</TableCell>
                        <TableCell className="text-sm">{INC_TYPES.find(t=>t.id===inc.type)?.[isRtl?"ar":"en"]??inc.type}</TableCell>
                        <TableCell><Badge className={cn("text-xs",severityClass(inc.severity))} variant="secondary">{severityLabel(inc.severity)}</Badge></TableCell>
                        <TableCell className="text-sm">{inc.location}</TableCell>
                        <TableCell className="text-sm">{inc.reportedBy}</TableCell>
                        <TableCell><Badge variant={inc.status==="closed"?"default":"secondary"} className={inc.status==="closed"?"bg-emerald-500 text-white":inc.status==="investigating"?"bg-amber-500 text-white":""}>{statusLabel(inc.status)}</Badge></TableCell>
                        <TableCell>{inc.status!=="closed"&&<Button size="sm" variant="outline" className="h-7 text-xs" onClick={()=>handleClose(inc.id)}><CheckCircle2 className="w-3 h-3 me-1"/>{isRtl?"إغلاق":"Close"}</Button>}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="inspections" className="mt-4">
            <Card className="border-border/50 overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/40">
                    <TableRow>
                      <TableHead>{isRtl?"رقم التفتيش":"Insp. No."}</TableHead>
                      <TableHead>{isRtl?"التاريخ":"Date"}</TableHead>
                      <TableHead>{isRtl?"الموقع":"Site"}</TableHead>
                      <TableHead>{isRtl?"المفتش":"Inspector"}</TableHead>
                      <TableHead>{isRtl?"النوع":"Type"}</TableHead>
                      <TableHead>{isRtl?"النتيجة":"Score"}</TableHead>
                      <TableHead>{isRtl?"ملاحظات":"Findings"}</TableHead>
                      <TableHead>{isRtl?"الحالة":"Status"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inspections.map(ins=>(
                      <TableRow key={ins.id} className="hover:bg-muted/40">
                        <TableCell className="font-mono text-xs text-muted-foreground">{ins.inspectionNo}</TableCell>
                        <TableCell className="text-sm">{ins.date}</TableCell>
                        <TableCell className="text-sm font-medium">{ins.site}</TableCell>
                        <TableCell className="text-sm">{ins.inspector}</TableCell>
                        <TableCell className="text-sm">{ins.type}</TableCell>
                        <TableCell>{ins.score>0?<span className={cn("font-bold text-sm",ins.score>=90?"text-emerald-600":ins.score>=75?"text-amber-600":"text-red-500")}>{ins.score}%</span>:<span className="text-muted-foreground">—</span>}</TableCell>
                        <TableCell>{ins.findings>0?<Badge variant="destructive" className="text-xs">{ins.findings} {isRtl?"ملاحظة":"findings"}</Badge>:<span className="text-emerald-500 text-xs font-medium">✓</span>}</TableCell>
                        <TableCell><Badge variant={ins.status==="completed"?"default":ins.status==="overdue"?"destructive":"secondary"} className={ins.status==="completed"?"bg-emerald-500 text-white":""}>{ins.status==="completed"?(isRtl?"مكتمل":"Completed"):ins.status==="overdue"?(isRtl?"متأخر":"Overdue"):(isRtl?"مجدول":"Scheduled")}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="ppe" className="mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {ppeRecords.map(r=>(
                <Card key={r.id} className={cn("border-border/50",r.status==="expired"?"border-red-200 dark:border-red-800":"")}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div><p className="font-semibold text-sm">{r.empName}</p><p className="text-xs text-muted-foreground">{r.empNo}</p></div>
                      <Badge variant={r.status==="issued"?"default":"destructive"} className={r.status==="issued"?"bg-emerald-500 text-white":""}>{r.status==="issued"?(isRtl?"صالح":"Active"):(isRtl?"منتهي":"Expired")}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-3">{r.items.map(item=><Badge key={item} variant="outline" className="text-xs">{item}</Badge>)}</div>
                    <p className="text-xs text-muted-foreground">{isRtl?"تاريخ الإصدار:":"Issued:"} {r.issuedDate}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{isRtl?"تسجيل حادث/بلاغ جديد":"Report New Incident"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-semibold">{isRtl?"التاريخ":"Date"}</Label><Input type="date" className="mt-1 h-9 text-sm" value={form.date||new Date().toISOString().split("T")[0]} onChange={e=>setForm(p=>({...p,date:e.target.value}))}/></div>
              <div><Label className="text-xs font-semibold">{isRtl?"الخطورة":"Severity"}</Label>
                <Select value={form.severity||"minor"} onValueChange={v=>setForm(p=>({...p,severity:v as any}))}>
                  <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="near_miss">{isRtl?"كاد يسلم":"Near Miss"}</SelectItem>
                    <SelectItem value="minor">{isRtl?"طفيف":"Minor"}</SelectItem>
                    <SelectItem value="major">{isRtl?"خطير":"Major"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-xs font-semibold">{isRtl?"نوع الحادث":"Type"}</Label>
              <Select value={form.type||"other"} onValueChange={v=>setForm(p=>({...p,type:v}))}>
                <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue/></SelectTrigger>
                <SelectContent>{INC_TYPES.map(t=><SelectItem key={t.id} value={t.id}>{isRtl?t.ar:t.en}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {[{label:isRtl?"الموقع *":"Location *",field:"location"},{label:isRtl?"المُبلِّغ":"Reported By",field:"reportedBy"},{label:isRtl?"المصاب (إن وجد)":"Injured (if any)",field:"injured"},{label:isRtl?"الوصف *":"Description *",field:"description"},{label:isRtl?"الإجراء التصحيحي":"Corrective Action",field:"correctiveAction"}].map(f=>(
              <div key={f.field}><Label className="text-xs font-semibold">{f.label}</Label><Input className="mt-1 h-9 text-sm" value={(form as any)[f.field]||""} onChange={e=>setForm(p=>({...p,[f.field]:e.target.value}))}/></div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setShowDialog(false)}>{isRtl?"إلغاء":"Cancel"}</Button>
            <Button onClick={handleSaveIncident} className="bg-red-600 hover:bg-red-700">{isRtl?"تسجيل الحادث":"Report Incident"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
