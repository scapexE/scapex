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
import { MapPin, Clock, UserCheck, UserX, CalendarDays, Plus, Search, Download, AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { scopedFetch } from "@/lib/queryClient";

interface AttendanceRecord {
  id: number;
  employeeId: number;
  employeeNumber?: string;
  nameAr?: string;
  nameEn?: string;
  departmentName?: string;
  date: string;
  checkIn?: string | null;
  checkOut?: string | null;
  status: string;
  location?: string;
  notes?: string;
  workedHours?: string | null;
}

interface LeaveRequest {
  id: number;
  employeeId: number;
  employeeName?: string;
  startDate: string;
  endDate: string;
  days: number;
  reason?: string;
  status: string;
  notes?: string;
}

interface Employee {
  id: number;
  nameAr: string;
  nameEn?: string;
  employeeNumber?: string;
  departmentName?: string;
  status?: string;
}

const LEAVE_TYPES = [
  { id: "annual",    ar: "إجازة سنوية",    en: "Annual Leave" },
  { id: "sick",      ar: "إجازة مرضية",    en: "Sick Leave" },
  { id: "emergency", ar: "إجازة طارئة",    en: "Emergency Leave" },
  { id: "hajj",      ar: "إجازة حج",       en: "Hajj Leave" },
  { id: "maternity", ar: "إجازة أمومة",    en: "Maternity Leave" },
];

const TODAY = new Date().toISOString().split("T")[0];

export function AttendanceContent() {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";
  const { toast } = useToast();

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [dateFilter, setDateFilter] = useState(TODAY);
  const [empFilter, setEmpFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [leavesLoading, setLeavesLoading] = useState(true);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [leaveForm, setLeaveForm] = useState<{ employeeId?: string; type?: string; startDate?: string; endDate?: string; reason?: string }>({ type: "annual" });
  const [savingLeave, setSavingLeave] = useState(false);

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await scopedFetch("/api/employees");
      if (res.ok) setEmployees(await res.json());
    } catch { /* silent */ }
  }, []);

  const fetchRecords = useCallback(async (date: string) => {
    setLoading(true);
    try {
      const res = await scopedFetch(`/api/attendance-records?date=${date}`);
      if (res.ok) setRecords(await res.json());
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  const fetchLeaves = useCallback(async () => {
    setLeavesLoading(true);
    try {
      const res = await scopedFetch("/api/leave-requests");
      if (res.ok) {
        const data: LeaveRequest[] = await res.json();
        const enriched = data.map(l => {
          const emp = employees.find(e => e.id === l.employeeId);
          return { ...l, employeeName: emp?.nameAr || emp?.nameEn };
        });
        setLeaves(enriched);
      }
    } catch { /* silent */ } finally {
      setLeavesLoading(false);
    }
  }, [employees]);

  useEffect(() => {
    const init = async () => {
      await fetchEmployees();
      await fetchRecords(TODAY);
    };
    init();

    const params = new URLSearchParams(window.location.search);
    const emp = params.get("emp");
    if (emp) setEmpFilter(emp);
  }, []);

  useEffect(() => {
    if (employees.length > 0) fetchLeaves();
  }, [employees]);

  useEffect(() => { fetchRecords(dateFilter); }, [dateFilter]);

  const empName = (r: AttendanceRecord) => r.nameAr || r.nameEn || `EMP-${r.employeeId}`;
  const empNo = (r: AttendanceRecord) => r.employeeNumber || `#${r.employeeId}`;

  const dayRecords = records.filter(r =>
    !empFilter ||
    (r.nameAr || "").toLowerCase().includes(empFilter.toLowerCase()) ||
    (r.nameEn || "").toLowerCase().includes(empFilter.toLowerCase()) ||
    (r.employeeNumber || "").toLowerCase().includes(empFilter.toLowerCase()),
  );

  const stats = {
    present: records.filter(r => r.status === "present").length,
    absent:  records.filter(r => r.status === "absent").length,
    late:    records.filter(r => r.status === "late").length,
    onLeave: records.filter(r => r.status === "leave").length,
  };

  const statusLabel = (s: string) => ({
    present:  isRtl ? "حاضر"     : "Present",
    absent:   isRtl ? "غائب"     : "Absent",
    late:     isRtl ? "متأخر"    : "Late",
    leave:    isRtl ? "إجازة"    : "On Leave",
    half_day: isRtl ? "نصف يوم" : "Half Day",
  }[s] || s);

  const statusVariant = (s: string): "default" | "secondary" | "destructive" =>
    ({ present: "default", late: "secondary", absent: "destructive", leave: "secondary", half_day: "secondary" } as any)[s] ?? "secondary";

  const leaveLabel = (id: string) => { const l = LEAVE_TYPES.find(x => x.id === id); return l ? (isRtl ? l.ar : l.en) : id; };

  const handleLeaveAction = async (id: number, action: "approved" | "rejected") => {
    try {
      const res = await scopedFetch(`/api/leave-requests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action }),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: action === "approved" ? (isRtl ? "تمت الموافقة" : "Approved") : (isRtl ? "تم الرفض" : "Rejected") });
      fetchLeaves();
    } catch {
      toast({ title: isRtl ? "حدث خطأ" : "Error", variant: "destructive" });
    }
  };

  const handleSaveLeave = async () => {
    if (!leaveForm.employeeId || !leaveForm.startDate || !leaveForm.endDate) {
      toast({ title: isRtl ? "ادخل جميع البيانات المطلوبة" : "Fill all required fields", variant: "destructive" });
      return;
    }
    setSavingLeave(true);
    try {
      const days = Math.max(1, Math.ceil((new Date(leaveForm.endDate!).getTime() - new Date(leaveForm.startDate!).getTime()) / 864e5) + 1);
      const res = await scopedFetch("/api/leave-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: parseInt(leaveForm.employeeId!), startDate: leaveForm.startDate, endDate: leaveForm.endDate, days, reason: leaveForm.reason || "", status: "pending" }),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: isRtl ? "تم تقديم طلب الإجازة" : "Leave request submitted" });
      setShowLeaveDialog(false);
      setLeaveForm({ type: "annual" });
      fetchLeaves();
    } catch {
      toast({ title: isRtl ? "حدث خطأ" : "Error", variant: "destructive" });
    } finally {
      setSavingLeave(false);
    }
  };

  const activeEmployees = employees.filter(e => e.status !== "terminated");

  return (
    <>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{isRtl ? "الحضور والانصراف" : "GPS Attendance"}</h1>
            <p className="text-muted-foreground text-sm mt-1">{isRtl ? "تتبع حضور الموظفين وطلبات الإجازات" : "Track employee attendance and leave requests"}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { fetchRecords(dateFilter); fetchLeaves(); }}>
              <RefreshCw className="w-4 h-4 me-1.5" />{isRtl ? "تحديث" : "Refresh"}
            </Button>
            <Button size="sm" onClick={() => { setLeaveForm({ type: "annual" }); setShowLeaveDialog(true); }}>
              <Plus className="w-4 h-4 me-1.5" />{isRtl ? "طلب إجازة" : "Leave Request"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: isRtl ? "حاضر"    : "Present",  value: stats.present,  icon: UserCheck,    color: "text-emerald-500" },
            { label: isRtl ? "غائب"    : "Absent",   value: stats.absent,   icon: UserX,        color: "text-red-500" },
            { label: isRtl ? "متأخر"   : "Late",     value: stats.late,     icon: AlertTriangle, color: "text-amber-500" },
            { label: isRtl ? "في إجازة": "On Leave", value: stats.onLeave,  icon: CalendarDays, color: "text-blue-500" },
          ].map((s, i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-xl bg-secondary flex items-center justify-center", s.color)}><s.icon className="w-5 h-5" /></div>
                <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-xl font-bold">{s.value}</p></div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="daily">
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="daily">{isRtl ? "السجل اليومي" : "Daily Log"}</TabsTrigger>
            <TabsTrigger value="leaves">{isRtl ? "طلبات الإجازة" : "Leave Requests"}</TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="mt-4 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
              <Input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="h-9 w-40 bg-secondary/30" />
              <div className="relative flex-1 min-w-[160px]">
                <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder={isRtl ? "بحث بالموظف..." : "Search employee..."} value={empFilter} onChange={e => setEmpFilter(e.target.value)} className="h-9 ps-8 bg-secondary/30" />
              </div>
              {empFilter && <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={() => setEmpFilter("")}>{isRtl ? "إلغاء الفلتر" : "Clear"}</Button>}
            </div>
            <Card className="border-border/50 overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/40">
                    <TableRow>
                      <TableHead>{isRtl ? "الموظف" : "Employee"}</TableHead>
                      <TableHead>{isRtl ? "القسم" : "Dept."}</TableHead>
                      <TableHead>{isRtl ? "الموقع" : "Location"}</TableHead>
                      <TableHead>{isRtl ? "دخول" : "Check In"}</TableHead>
                      <TableHead>{isRtl ? "خروج" : "Check Out"}</TableHead>
                      <TableHead>{isRtl ? "ساعات العمل" : "Hours"}</TableHead>
                      <TableHead>{isRtl ? "الحالة" : "Status"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading && <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="w-4 h-4 animate-spin mx-auto" /></TableCell></TableRow>}
                    {!loading && dayRecords.map(r => (
                      <TableRow key={r.id} className="hover:bg-muted/40">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{empName(r)[0]}</div>
                            <div><p className="font-medium text-sm">{empName(r)}</p><p className="text-xs text-muted-foreground">{empNo(r)}</p></div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{r.departmentName ?? "—"}</TableCell>
                        <TableCell>
                          {r.location ? (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="w-3 h-3" />{r.location}</div>
                          ) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{r.checkIn ? new Date(r.checkIn).toLocaleTimeString("en-SA", { hour: "2-digit", minute: "2-digit" }) : "—"}</TableCell>
                        <TableCell className="font-mono text-sm">{r.checkOut ? new Date(r.checkOut).toLocaleTimeString("en-SA", { hour: "2-digit", minute: "2-digit" }) : "—"}</TableCell>
                        <TableCell className="text-sm">{r.workedHours ? `${r.workedHours}h` : "—"}</TableCell>
                        <TableCell><Badge variant={statusVariant(r.status)} className={r.status === "present" ? "bg-emerald-500 text-white" : ""}>{statusLabel(r.status)}</Badge></TableCell>
                      </TableRow>
                    ))}
                    {!loading && dayRecords.length === 0 && (
                      <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">{isRtl ? "لا توجد سجلات حضور لهذا اليوم" : "No attendance records for this day"}</TableCell></TableRow>
                    )}
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
                      <TableHead>{isRtl ? "الموظف" : "Employee"}</TableHead>
                      <TableHead>{isRtl ? "نوع الإجازة" : "Type"}</TableHead>
                      <TableHead>{isRtl ? "من" : "From"}</TableHead>
                      <TableHead>{isRtl ? "إلى" : "To"}</TableHead>
                      <TableHead>{isRtl ? "الأيام" : "Days"}</TableHead>
                      <TableHead>{isRtl ? "السبب" : "Reason"}</TableHead>
                      <TableHead>{isRtl ? "الحالة" : "Status"}</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leavesLoading && <TableRow><TableCell colSpan={8} className="text-center py-8"><Loader2 className="w-4 h-4 animate-spin mx-auto" /></TableCell></TableRow>}
                    {!leavesLoading && leaves.map(l => (
                      <TableRow key={l.id} className="hover:bg-muted/40">
                        <TableCell><p className="font-medium text-sm">{l.employeeName ?? `EMP-${l.employeeId}`}</p></TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{leaveLabel("")}</Badge></TableCell>
                        <TableCell className="text-sm">{l.startDate}</TableCell>
                        <TableCell className="text-sm">{l.endDate}</TableCell>
                        <TableCell className="font-semibold">{l.days}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">{l.reason || "—"}</TableCell>
                        <TableCell>
                          <Badge
                            variant={l.status === "approved" ? "default" : l.status === "rejected" ? "destructive" : "secondary"}
                            className={l.status === "approved" ? "bg-emerald-500 text-white" : ""}
                          >
                            {l.status === "approved" ? (isRtl ? "موافق" : "Approved") : l.status === "rejected" ? (isRtl ? "مرفوض" : "Rejected") : (isRtl ? "معلق" : "Pending")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {l.status === "pending" && (
                            <div className="flex gap-1">
                              <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => handleLeaveAction(l.id, "approved")}>{isRtl ? "موافقة" : "Approve"}</Button>
                              <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => handleLeaveAction(l.id, "rejected")}>{isRtl ? "رفض" : "Reject"}</Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {!leavesLoading && leaves.length === 0 && (
                      <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">{isRtl ? "لا توجد طلبات إجازة" : "No leave requests"}</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{isRtl ? "طلب إجازة جديد" : "New Leave Request"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs font-semibold">{isRtl ? "الموظف" : "Employee"} *</Label>
              <Select value={leaveForm.employeeId ?? ""} onValueChange={v => setLeaveForm(p => ({ ...p, employeeId: v }))}>
                <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue placeholder={isRtl ? "اختر موظفاً" : "Select employee"} /></SelectTrigger>
                <SelectContent>
                  {activeEmployees.map(e => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {e.nameAr || e.nameEn} {e.employeeNumber ? `· ${e.employeeNumber}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold">{isRtl ? "نوع الإجازة" : "Leave Type"}</Label>
              <Select value={leaveForm.type ?? "annual"} onValueChange={v => setLeaveForm(p => ({ ...p, type: v }))}>
                <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{LEAVE_TYPES.map(t => <SelectItem key={t.id} value={t.id}>{isRtl ? t.ar : t.en}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-semibold">{isRtl ? "من" : "From"} *</Label>
                <Input type="date" className="mt-1 h-9 text-sm" value={leaveForm.startDate ?? ""} onChange={e => setLeaveForm(p => ({ ...p, startDate: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs font-semibold">{isRtl ? "إلى" : "To"} *</Label>
                <Input type="date" className="mt-1 h-9 text-sm" value={leaveForm.endDate ?? ""} onChange={e => setLeaveForm(p => ({ ...p, endDate: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold">{isRtl ? "السبب" : "Reason"}</Label>
              <Input className="mt-1 h-9 text-sm" value={leaveForm.reason ?? ""} onChange={e => setLeaveForm(p => ({ ...p, reason: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLeaveDialog(false)}>{isRtl ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={handleSaveLeave} disabled={savingLeave}>
              {savingLeave && <Loader2 className="w-4 h-4 animate-spin me-2" />}
              {isRtl ? "تقديم الطلب" : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function AttendanceModule() {
  return (
    <MainLayout>
      <AttendanceContent />
    </MainLayout>
  );
}
