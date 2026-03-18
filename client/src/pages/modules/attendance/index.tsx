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
import { MapPin, Clock, UserCheck, UserX, CalendarDays, Plus, Search, Download, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface AttendanceRecord {
  id: string; date: string; empNo: string; empName: string; department: string;
  checkIn: string; checkOut: string; site: string; status: "present"|"absent"|"late"|"half_day"|"leave";
  lateMinutes: number; notes: string;
}

interface LeaveRequest {
  id: string; empNo: string; empName: string; type: string; startDate: string; endDate: string;
  days: number; reason: string; status: "pending"|"approved"|"rejected";
}

const SITES = [{id:"hq",ar:"المقر الرئيسي",en:"HQ"},{id:"site_a",ar:"موقع الرياض",en:"Riyadh Site"},{id:"site_b",ar:"موقع جدة",en:"Jeddah Site"},{id:"site_c",ar:"موقع الدمام",en:"Dammam Site"}];
const LEAVE_TYPES = [{id:"annual",ar:"إجازة سنوية",en:"Annual Leave"},{id:"sick",ar:"إجازة مرضية",en:"Sick Leave"},{id:"emergency",ar:"إجازة طارئة",en:"Emergency Leave"},{id:"hajj",ar:"إجازة حج",en:"Hajj Leave"}];

const TODAY = new Date().toISOString().split("T")[0];
const YESTERDAY = new Date(Date.now()-864e5).toISOString().split("T")[0];

const SEED_ATT: AttendanceRecord[] = [
  {id:"1",date:TODAY,empNo:"EMP-001",empName:"أحمد محمد الغامدي",department:"الهندسة",checkIn:"08:02",checkOut:"17:05",site:"hq",status:"present",lateMinutes:0,notes:""},
  {id:"2",date:TODAY,empNo:"EMP-002",empName:"سارة علي القحطاني",department:"الموارد البشرية",checkIn:"08:00",checkOut:"17:00",site:"hq",status:"present",lateMinutes:0,notes:""},
  {id:"3",date:TODAY,empNo:"EMP-003",empName:"محمد خالد الزهراني",department:"السلامة",checkIn:"08:25",checkOut:"17:30",site:"site_a",status:"late",lateMinutes:25,notes:""},
  {id:"4",date:TODAY,empNo:"EMP-004",empName:"Rajesh Kumar",department:"الهندسة",checkIn:"08:00",checkOut:"17:00",site:"site_a",status:"present",lateMinutes:0,notes:""},
  {id:"5",date:TODAY,empNo:"EMP-005",empName:"فاطمة عبدالله الشهري",department:"المالية",checkIn:"",checkOut:"",site:"",status:"leave",lateMinutes:0,notes:"إجازة سنوية"},
  {id:"6",date:TODAY,empNo:"EMP-006",empName:"Abdullah Hassan Al-Otaibi",department:"العمليات",checkIn:"",checkOut:"",site:"",status:"absent",lateMinutes:0,notes:""},
];

const SEED_LEAVES: LeaveRequest[] = [
  {id:"1",empNo:"EMP-005",empName:"فاطمة عبدالله الشهري",type:"annual",startDate:"2026-03-10",endDate:"2026-03-20",days:10,reason:"إجازة سنوية مستحقة",status:"approved"},
  {id:"2",empNo:"EMP-001",empName:"أحمد محمد الغامدي",type:"emergency",startDate:"2026-03-25",endDate:"2026-03-26",days:2,reason:"ظروف عائلية",status:"pending"},
];

const STORAGE_ATT = "scapex_attendance"; const STORAGE_LEAVES = "scapex_leaves";
function load<T>(key: string, seed: T): T { try { const d=localStorage.getItem(key); return d?JSON.parse(d):seed; } catch { return seed; } }
function save(key: string, data: unknown) { localStorage.setItem(key,JSON.stringify(data)); }

export default function AttendanceModule() {
  const { dir } = useLanguage(); const isRtl = dir==="rtl";
  const { toast } = useToast();
  const [records, setRecords] = useState<AttendanceRecord[]>(()=>load(STORAGE_ATT, SEED_ATT));
  const [leaves, setLeaves] = useState<LeaveRequest[]>(()=>load(STORAGE_LEAVES, SEED_LEAVES));
  const [dateFilter, setDateFilter] = useState(TODAY);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [leaveForm, setLeaveForm] = useState<Partial<LeaveRequest>>({});

  const dayRecords = records.filter(r=>r.date===dateFilter);
  const stats = {
    present: dayRecords.filter(r=>r.status==="present").length,
    absent: dayRecords.filter(r=>r.status==="absent").length,
    late: dayRecords.filter(r=>r.status==="late").length,
    onLeave: dayRecords.filter(r=>r.status==="leave").length,
  };

  const statusLabel = (s:string) => ({present:isRtl?"حاضر":"Present",absent:isRtl?"غائب":"Absent",late:isRtl?"متأخر":"Late",leave:isRtl?"إجازة":"On Leave",half_day:isRtl?"نصف يوم":"Half Day"}[s]||s);
  const statusVariant = (s:string): "default"|"secondary"|"destructive" => ({present:"default",late:"secondary",absent:"destructive",leave:"secondary",half_day:"secondary"}[s] as any || "secondary");
  const statusClass = (s:string) => s==="present"?"bg-emerald-500 text-white":s==="absent"?"":"";
  const siteLabel = (id:string) => { const s=SITES.find(x=>x.id===id); return s?(isRtl?s.ar:s.en):"—"; };
  const leaveLabel = (id:string) => { const l=LEAVE_TYPES.find(x=>x.id===id); return l?(isRtl?l.ar:l.en):id; };

  const handleLeaveAction = (id:string, action:"approved"|"rejected") => {
    const updated=leaves.map(l=>l.id===id?{...l,status:action}:l); setLeaves(updated); save(STORAGE_LEAVES,updated);
    toast({title:action==="approved"?(isRtl?"تمت الموافقة على الإجازة":"Leave approved"):(isRtl?"تم رفض الإجازة":"Leave rejected")});
  };

  const handleSaveLeave = () => {
    if (!leaveForm.empName||!leaveForm.startDate||!leaveForm.endDate) { toast({title:isRtl?"ادخل جميع البيانات":"Fill all fields",variant:"destructive"}); return; }
    const newLeave:LeaveRequest={...leaveForm as LeaveRequest, id:Date.now().toString(), status:"pending", days: Math.ceil((new Date(leaveForm.endDate!).getTime()-new Date(leaveForm.startDate!).getTime())/864e5)+1};
    const updated=[newLeave,...leaves]; setLeaves(updated); save(STORAGE_LEAVES,updated);
    setShowLeaveDialog(false); setLeaveForm({});
    toast({title:isRtl?"تم تقديم طلب الإجازة":"Leave request submitted"});
  };

  return (
    <MainLayout>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{isRtl?"الحضور والانصراف":"GPS Attendance"}</h1>
            <p className="text-muted-foreground text-sm mt-1">{isRtl?"تتبع حضور الموظفين وطلبات الإجازات":"Track employee attendance and leave requests"}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm"><Download className="w-4 h-4 me-1.5"/>{isRtl?"تصدير":"Export"}</Button>
            <Button size="sm" onClick={()=>{setLeaveForm({type:"annual"});setShowLeaveDialog(true)}}><Plus className="w-4 h-4 me-1.5"/>{isRtl?"طلب إجازة":"Leave Request"}</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {label:isRtl?"حاضر":"Present",value:stats.present,icon:UserCheck,color:"text-emerald-500"},
            {label:isRtl?"غائب":"Absent",value:stats.absent,icon:UserX,color:"text-red-500"},
            {label:isRtl?"متأخر":"Late",value:stats.late,icon:AlertTriangle,color:"text-amber-500"},
            {label:isRtl?"في إجازة":"On Leave",value:stats.onLeave,icon:CalendarDays,color:"text-blue-500"},
          ].map((s,i)=>(
            <Card key={i} className="border-border/50"><CardContent className="p-4 flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-xl bg-secondary flex items-center justify-center",s.color)}><s.icon className="w-5 h-5"/></div>
              <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-xl font-bold">{s.value}</p></div>
            </CardContent></Card>
          ))}
        </div>

        <Tabs defaultValue="daily">
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="daily">{isRtl?"السجل اليومي":"Daily Log"}</TabsTrigger>
            <TabsTrigger value="leaves">{isRtl?"طلبات الإجازة":"Leave Requests"}</TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="mt-4 space-y-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0"/>
              <Input type="date" value={dateFilter} onChange={e=>setDateFilter(e.target.value)} className="h-9 w-40 bg-secondary/30"/>
            </div>
            <Card className="border-border/50 overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/40">
                    <TableRow>
                      <TableHead>{isRtl?"الموظف":"Employee"}</TableHead>
                      <TableHead>{isRtl?"القسم":"Dept."}</TableHead>
                      <TableHead>{isRtl?"الموقع":"Site"}</TableHead>
                      <TableHead>{isRtl?"دخول":"Check In"}</TableHead>
                      <TableHead>{isRtl?"خروج":"Check Out"}</TableHead>
                      <TableHead>{isRtl?"تأخر":"Late"}</TableHead>
                      <TableHead>{isRtl?"الحالة":"Status"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dayRecords.map(r=>(
                      <TableRow key={r.id} className="hover:bg-muted/40">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{r.empName[0]}</div>
                            <div><p className="font-medium text-sm">{r.empName}</p><p className="text-xs text-muted-foreground">{r.empNo}</p></div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{r.department}</TableCell>
                        <TableCell className="text-sm">
                          {r.site && <div className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="w-3 h-3"/>{siteLabel(r.site)}</div>}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{r.checkIn||"—"}</TableCell>
                        <TableCell className="font-mono text-sm">{r.checkOut||"—"}</TableCell>
                        <TableCell>{r.lateMinutes>0?<span className="text-amber-500 text-sm font-medium">{r.lateMinutes} {isRtl?"د":"min"}</span>:<span className="text-muted-foreground">—</span>}</TableCell>
                        <TableCell><Badge variant={statusVariant(r.status)} className={statusClass(r.status)}>{statusLabel(r.status)}</Badge></TableCell>
                      </TableRow>
                    ))}
                    {dayRecords.length===0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{isRtl?"لا توجد سجلات لهذا اليوم":"No records for this day"}</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="leaves" className="mt-4">
            <Card className="border-border/50 overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/40">
                    <TableRow>
                      <TableHead>{isRtl?"الموظف":"Employee"}</TableHead>
                      <TableHead>{isRtl?"نوع الإجازة":"Type"}</TableHead>
                      <TableHead>{isRtl?"من":"From"}</TableHead>
                      <TableHead>{isRtl?"إلى":"To"}</TableHead>
                      <TableHead>{isRtl?"الأيام":"Days"}</TableHead>
                      <TableHead>{isRtl?"السبب":"Reason"}</TableHead>
                      <TableHead>{isRtl?"الحالة":"Status"}</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaves.map(l=>(
                      <TableRow key={l.id} className="hover:bg-muted/40">
                        <TableCell><p className="font-medium text-sm">{l.empName}</p><p className="text-xs text-muted-foreground">{l.empNo}</p></TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{leaveLabel(l.type)}</Badge></TableCell>
                        <TableCell className="text-sm">{l.startDate}</TableCell>
                        <TableCell className="text-sm">{l.endDate}</TableCell>
                        <TableCell className="font-semibold">{l.days}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{l.reason}</TableCell>
                        <TableCell>
                          <Badge variant={l.status==="approved"?"default":l.status==="rejected"?"destructive":"secondary"} className={l.status==="approved"?"bg-emerald-500 text-white":""}>
                            {l.status==="approved"?(isRtl?"موافق":"Approved"):l.status==="rejected"?(isRtl?"مرفوض":"Rejected"):(isRtl?"معلق":"Pending")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {l.status==="pending" && (
                            <div className="flex gap-1">
                              <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={()=>handleLeaveAction(l.id,"approved")}>{isRtl?"موافقة":"Approve"}</Button>
                              <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={()=>handleLeaveAction(l.id,"rejected")}>{isRtl?"رفض":"Reject"}</Button>
                            </div>
                          )}
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

      <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{isRtl?"طلب إجازة جديد":"New Leave Request"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            {[{label:isRtl?"اسم الموظف":"Employee Name",field:"empName"},{label:isRtl?"الرقم الوظيفي":"Emp No.",field:"empNo"}].map(f=>(
              <div key={f.field}><Label className="text-xs font-semibold">{f.label}</Label><Input className="mt-1 h-9 text-sm" value={(leaveForm as any)[f.field]||""} onChange={e=>setLeaveForm(p=>({...p,[f.field]:e.target.value}))}/></div>
            ))}
            <div><Label className="text-xs font-semibold">{isRtl?"نوع الإجازة":"Leave Type"}</Label>
              <Select value={leaveForm.type||"annual"} onValueChange={v=>setLeaveForm(p=>({...p,type:v}))}>
                <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue/></SelectTrigger>
                <SelectContent>{LEAVE_TYPES.map(t=><SelectItem key={t.id} value={t.id}>{isRtl?t.ar:t.en}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs font-semibold">{isRtl?"من":"From"}</Label><Input type="date" className="mt-1 h-9 text-sm" value={leaveForm.startDate||""} onChange={e=>setLeaveForm(p=>({...p,startDate:e.target.value}))}/></div>
              <div><Label className="text-xs font-semibold">{isRtl?"إلى":"To"}</Label><Input type="date" className="mt-1 h-9 text-sm" value={leaveForm.endDate||""} onChange={e=>setLeaveForm(p=>({...p,endDate:e.target.value}))}/></div>
            </div>
            <div><Label className="text-xs font-semibold">{isRtl?"السبب":"Reason"}</Label><Input className="mt-1 h-9 text-sm" value={leaveForm.reason||""} onChange={e=>setLeaveForm(p=>({...p,reason:e.target.value}))}/></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setShowLeaveDialog(false)}>{isRtl?"إلغاء":"Cancel"}</Button>
            <Button onClick={handleSaveLeave}>{isRtl?"تقديم الطلب":"Submit"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
