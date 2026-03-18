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
import { PenTool, Plus, Search, CheckCircle2, Clock, AlertTriangle, Edit, Trash2, Eye, Download, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Drawing {
  id: string; drawingNo: string; title: string; titleAr: string;
  project: string; discipline: string; scale: string; version: string;
  submittedBy: string; submittedAt: string; reviewedBy: string;
  status: "draft"|"submitted"|"under_review"|"approved"|"rejected"|"superseded"; revisions: number;
}

const DISCIPLINES = [{id:"civil",ar:"مدني",en:"Civil"},{id:"structural",ar:"إنشائي",en:"Structural"},{id:"mechanical",ar:"ميكانيكي",en:"Mechanical"},{id:"electrical",ar:"كهربائي",en:"Electrical"},{id:"environmental",ar:"بيئي",en:"Environmental"},{id:"survey",ar:"مساحة",en:"Survey"}];

const SEED_DRAWINGS: Drawing[] = [
  {id:"1",drawingNo:"DWG-2026-001",title:"Site Layout Plan - NEOM",titleAr:"مخطط الموقع العام - نيوم",project:"مشروع نيوم",discipline:"civil",scale:"1:500",version:"A",submittedBy:"أحمد الغامدي",submittedAt:"2026-03-01",reviewedBy:"م. خالد",status:"approved",revisions:2},
  {id:"2",drawingNo:"DWG-2026-002",title:"Foundation Details",titleAr:"تفاصيل الأساسات",project:"مشروع نيوم",discipline:"structural",scale:"1:50",version:"B",submittedBy:"Rajesh Kumar",submittedAt:"2026-03-05",reviewedBy:"",status:"under_review",revisions:1},
  {id:"3",drawingNo:"DWG-2026-003",title:"Electrical Single Line Diagram",titleAr:"مخطط الخط الواحد الكهربائي",project:"مشروع جدة",discipline:"electrical",scale:"1:100",version:"A",submittedBy:"أحمد الغامدي",submittedAt:"2026-03-08",reviewedBy:"",status:"submitted",revisions:0},
  {id:"4",drawingNo:"DWG-2026-004",title:"Environmental Monitoring Stations",titleAr:"مواقع محطات المراقبة البيئية",project:"مشروع الدمام",discipline:"environmental",scale:"1:1000",version:"A",submittedBy:"فاطمة الشهري",submittedAt:"2026-02-20",reviewedBy:"م. سامي",status:"approved",revisions:0},
  {id:"5",drawingNo:"DWG-2026-005",title:"Grading and Drainage Plan",titleAr:"مخطط التسوية والصرف",project:"مشروع جدة",discipline:"civil",scale:"1:200",version:"A",submittedBy:"Rajesh Kumar",submittedAt:"2026-03-10",reviewedBy:"م. خالد",status:"rejected",revisions:1},
];

const STORAGE = "scapex_drawings";
function load<T>(k: string, s: T): T { try { const d=localStorage.getItem(k); return d?JSON.parse(d):s; } catch { return s; } }
function save(k: string, d: unknown) { localStorage.setItem(k,JSON.stringify(d)); }

export default function EngineeringModule() {
  const { dir } = useLanguage(); const isRtl = dir==="rtl";
  const { toast } = useToast();
  const [drawings, setDrawings] = useState<Drawing[]>(()=>load(STORAGE, SEED_DRAWINGS));
  const [search, setSearch] = useState(""); const [discFilter, setDiscFilter] = useState("all");
  const [showDialog, setShowDialog] = useState(false); const [editDrawing, setEditDrawing] = useState<Drawing|null>(null);
  const [form, setForm] = useState<Partial<Drawing>>({});

  const filtered = drawings.filter(d=>{
    const q=search.toLowerCase();
    return (!q||d.title.toLowerCase().includes(q)||d.titleAr.includes(q)||d.drawingNo.toLowerCase().includes(q)||d.project.includes(q)) && (discFilter==="all"||d.discipline===discFilter);
  });

  const stats = { total:drawings.length, approved:drawings.filter(d=>d.status==="approved").length, pending:drawings.filter(d=>d.status==="submitted"||d.status==="under_review").length, rejected:drawings.filter(d=>d.status==="rejected").length };
  const discLabel = (id:string) => { const d=DISCIPLINES.find(x=>x.id===id); return d?(isRtl?d.ar:d.en):id; };
  const statusLabel = (s:string) => ({draft:isRtl?"مسودة":"Draft",submitted:isRtl?"مقدم":"Submitted",under_review:isRtl?"قيد المراجعة":"Under Review",approved:isRtl?"معتمد":"Approved",rejected:isRtl?"مرفوض":"Rejected",superseded:isRtl?"مستبدل":"Superseded"}[s]||s);
  const statusClass = (s:string) => ({approved:"bg-emerald-500 text-white",rejected:"",under_review:"bg-blue-500 text-white",submitted:"bg-amber-500 text-white"}[s]||"");

  const handleApprove = (id:string) => { const u=drawings.map(d=>d.id===id?{...d,status:"approved" as const,reviewedBy:"المستخدم الحالي"}:d); setDrawings(u); save(STORAGE,u); toast({title:isRtl?"تم اعتماد المخطط":"Drawing approved"}); };
  const handleReject = (id:string) => { const u=drawings.map(d=>d.id===id?{...d,status:"rejected" as const}:d); setDrawings(u); save(STORAGE,u); toast({title:isRtl?"تم رفض المخطط":"Drawing rejected"}); };

  const openAdd = () => { setEditDrawing(null); setForm({discipline:"civil",status:"draft",scale:"1:100",version:"A",revisions:0,submittedAt:new Date().toISOString().split("T")[0]}); setShowDialog(true); };
  const openEdit = (d:Drawing) => { setEditDrawing(d); setForm(d); setShowDialog(true); };
  const handleSave = () => {
    if (!form.title||!form.drawingNo) { toast({title:isRtl?"ادخل البيانات":"Fill required fields",variant:"destructive"}); return; }
    if (editDrawing) { const u=drawings.map(d=>d.id===editDrawing.id?{...editDrawing,...form} as Drawing:d); setDrawings(u); save(STORAGE,u); }
    else { const u=[{...form as Drawing,id:Date.now().toString()},...drawings]; setDrawings(u); save(STORAGE,u); }
    setShowDialog(false); toast({title:isRtl?"تم الحفظ":"Saved"});
  };
  const handleDelete = (id:string) => { const u=drawings.filter(d=>d.id!==id); setDrawings(u); save(STORAGE,u); toast({title:isRtl?"تم الحذف":"Deleted"}); };

  return (
    <MainLayout>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{isRtl?"الرسومات الهندسية":"Engineering Drawings"}</h1>
            <p className="text-muted-foreground text-sm mt-1">{isRtl?"إدارة المخططات الهندسية، المراجعات، وسير موافقات":"Manage CAD drawings, revisions, and approval workflows"}</p>
          </div>
          <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 me-1.5"/>{isRtl?"مخطط جديد":"New Drawing"}</Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {label:isRtl?"إجمالي المخططات":"Total Drawings",value:stats.total,icon:PenTool,color:"text-blue-500"},
            {label:isRtl?"معتمدة":"Approved",value:stats.approved,icon:CheckCircle2,color:"text-emerald-500"},
            {label:isRtl?"قيد المراجعة":"Under Review",value:stats.pending,icon:Clock,color:"text-amber-500"},
            {label:isRtl?"مرفوضة":"Rejected",value:stats.rejected,icon:AlertTriangle,color:"text-red-500"},
          ].map((s,i)=>(
            <Card key={i} className="border-border/50"><CardContent className="p-4 flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-xl bg-secondary flex items-center justify-center",s.color)}><s.icon className="w-5 h-5"/></div>
              <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-xl font-bold">{s.value}</p></div>
            </CardContent></Card>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground",isRtl?"right-3":"left-3")}/>
            <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder={isRtl?"بحث...":"Search..."} className={cn("h-9 bg-secondary/30",isRtl?"pr-9":"pl-9")}/>
          </div>
          <Select value={discFilter} onValueChange={setDiscFilter}>
            <SelectTrigger className="w-40 h-9 bg-secondary/30"><SelectValue/></SelectTrigger>
            <SelectContent><SelectItem value="all">{isRtl?"كل التخصصات":"All Disciplines"}</SelectItem>{DISCIPLINES.map(d=><SelectItem key={d.id} value={d.id}>{isRtl?d.ar:d.en}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <Card className="border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-secondary/40">
                <TableRow>
                  <TableHead>{isRtl?"رقم المخطط":"Drawing No."}</TableHead>
                  <TableHead>{isRtl?"العنوان":"Title"}</TableHead>
                  <TableHead>{isRtl?"المشروع":"Project"}</TableHead>
                  <TableHead>{isRtl?"التخصص":"Discipline"}</TableHead>
                  <TableHead>{isRtl?"الإصدار":"Rev."}</TableHead>
                  <TableHead>{isRtl?"المراجعات":"Revisions"}</TableHead>
                  <TableHead>{isRtl?"الحالة":"Status"}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(d=>(
                  <TableRow key={d.id} className="hover:bg-muted/40">
                    <TableCell className="font-mono text-xs text-muted-foreground">{d.drawingNo}</TableCell>
                    <TableCell><p className="font-medium text-sm">{isRtl?d.titleAr:d.title}</p><p className="text-xs text-muted-foreground">{d.scale} • {d.submittedBy}</p></TableCell>
                    <TableCell className="text-sm">{d.project}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{discLabel(d.discipline)}</Badge></TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs font-mono">Rev.{d.version}</Badge></TableCell>
                    <TableCell>{d.revisions>0?<div className="flex items-center gap-1 text-xs text-amber-600"><RefreshCw className="w-3 h-3"/>{d.revisions}</div>:<span className="text-muted-foreground text-xs">—</span>}</TableCell>
                    <TableCell><Badge className={cn("text-xs",statusClass(d.status))} variant={d.status==="rejected"?"destructive":"secondary"}>{statusLabel(d.status)}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {(d.status==="submitted"||d.status==="under_review") && <>
                          <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={()=>handleApprove(d.id)}><CheckCircle2 className="w-3 h-3 me-1"/>{isRtl?"اعتماد":"Approve"}</Button>
                          <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={()=>handleReject(d.id)}>{isRtl?"رفض":"Reject"}</Button>
                        </>}
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={()=>openEdit(d)}><Edit className="w-3.5 h-3.5"/></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={()=>handleDelete(d.id)}><Trash2 className="w-3.5 h-3.5"/></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editDrawing?(isRtl?"تعديل المخطط":"Edit Drawing"):(isRtl?"مخطط جديد":"New Drawing")}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            {[{label:isRtl?"رقم المخطط *":"Drawing No. *",field:"drawingNo"},{label:isRtl?"العنوان (EN) *":"Title (EN) *",field:"title"},{label:isRtl?"العنوان (AR)":"Title (AR)",field:"titleAr"},{label:isRtl?"المشروع":"Project",field:"project"},{label:isRtl?"المقياس":"Scale",field:"scale"},{label:isRtl?"الإصدار":"Version",field:"version"},{label:isRtl?"مقدم من":"Submitted By",field:"submittedBy"}].map(f=>(
              <div key={f.field}><Label className="text-xs font-semibold">{f.label}</Label><Input className="mt-1 h-8 text-sm" value={(form as any)[f.field]||""} onChange={e=>setForm(p=>({...p,[f.field]:e.target.value}))}/></div>
            ))}
            <div><Label className="text-xs font-semibold">{isRtl?"التخصص":"Discipline"}</Label>
              <Select value={form.discipline||"civil"} onValueChange={v=>setForm(p=>({...p,discipline:v}))}>
                <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue/></SelectTrigger>
                <SelectContent>{DISCIPLINES.map(d=><SelectItem key={d.id} value={d.id}>{isRtl?d.ar:d.en}</SelectItem>)}</SelectContent>
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
