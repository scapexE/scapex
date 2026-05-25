import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, CheckCircle2, XCircle, Trash2, Loader2, AlertTriangle, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Violation {
  id: number; employeeId: number; violationType: string;
  description: string | null; penaltyAmount: string;
  date: string | null; status: string; notes: string | null; createdAt: string;
}
interface Employee { id: number; nameAr: string; nameEn: string; employeeNumber: string; }

const SAR = (v: string | number) => `${parseFloat(String(v || 0)).toLocaleString("ar-SA")} ر.س`;
const today = () => new Date().toISOString().slice(0, 10);

const VIOLATION_TYPES = [
  { id: "attendance", ar: "غياب / تأخر", en: "Attendance / Late" },
  { id: "misconduct", ar: "سلوك غير لائق", en: "Misconduct" },
  { id: "negligence", ar: "إهمال في العمل", en: "Negligence" },
  { id: "uniform", ar: "مخالفة الزي الرسمي", en: "Uniform Violation" },
  { id: "safety", ar: "مخالفة أنظمة السلامة", en: "Safety Violation" },
  { id: "policy", ar: "مخالفة السياسات", en: "Policy Violation" },
  { id: "damage", ar: "إتلاف ممتلكات", en: "Property Damage" },
  { id: "other", ar: "أخرى", en: "Other" },
];

const STATUS_MAP: Record<string,{ ar: string; en: string; cls: string }> = {
  pending: { ar: "بانتظار القرار", en: "Pending", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  confirmed: { ar: "مؤكدة", en: "Confirmed", cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  waived: { ar: "تم العفو", en: "Waived", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
};

export function ViolationsTab() {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";
  const { toast } = useToast();

  const [violations, setViolations] = useState<Violation[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    employeeId: "", violationType: "attendance", description: "",
    penaltyAmount: "", date: today(), notes: "",
  });

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [vRes, eRes] = await Promise.all([fetch("/api/employee-violations"), fetch("/api/employees")]);
      const [vData, eData] = await Promise.all([vRes.json(), eRes.json()]);
      setViolations(Array.isArray(vData) ? vData : []);
      setEmployees(Array.isArray(eData) ? eData : []);
    } catch { toast({ title: isRtl ? "خطأ" : "Error", variant: "destructive" }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const empName = (id: number) => {
    const e = employees.find(x => x.id === id);
    return e ? (isRtl ? e.nameAr : e.nameEn) : `#${id}`;
  };

  const violationLabel = (id: string) => {
    const t = VIOLATION_TYPES.find(x => x.id === id);
    return t ? (isRtl ? t.ar : t.en) : id;
  };

  const handleSave = async () => {
    if (!form.employeeId || !form.violationType) {
      toast({ title: isRtl ? "يرجى تحديد الموظف ونوع المخالفة" : "Select employee and violation type", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      await fetch("/api/employee-violations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: form.employeeId, violationType: form.violationType, description: form.description || null, penaltyAmount: parseFloat(form.penaltyAmount || "0"), date: form.date, notes: form.notes || null }),
      });
      toast({ title: isRtl ? "تم تسجيل المخالفة" : "Violation recorded" });
      setShowCreate(false);
      fetchAll();
    } catch { toast({ title: isRtl ? "خطأ" : "Error", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      await fetch(`/api/employee-violations/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      toast({ title: isRtl ? "تم تحديث الحالة" : "Status updated" });
      fetchAll();
    } catch { toast({ title: isRtl ? "خطأ" : "Error", variant: "destructive" }); }
  };

  const handleDelete = async (id: number) => {
    try {
      await fetch(`/api/employee-violations/${id}`, { method: "DELETE" });
      toast({ title: isRtl ? "تم الحذف" : "Deleted" });
      fetchAll();
    } catch { toast({ title: isRtl ? "خطأ" : "Error", variant: "destructive" }); }
  };

  const stats = {
    total: violations.length,
    pending: violations.filter(v => v.status === "pending").length,
    confirmed: violations.filter(v => v.status === "confirmed").length,
    totalPenalty: violations.filter(v => v.status === "confirmed").reduce((s, v) => s + parseFloat(v.penaltyAmount || "0"), 0),
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: isRtl ? "إجمالي المخالفات" : "Total", value: stats.total, icon: ShieldAlert, color: "text-red-500" },
          { label: isRtl ? "بانتظار القرار" : "Pending", value: stats.pending, icon: AlertTriangle, color: "text-amber-500" },
          { label: isRtl ? "مؤكدة" : "Confirmed", value: stats.confirmed, icon: XCircle, color: "text-red-600" },
          { label: isRtl ? "إجمالي الغرامات" : "Total Penalties", value: SAR(stats.totalPenalty), icon: ShieldAlert, color: "text-primary" },
        ].map((s, i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn("w-9 h-9 rounded-xl bg-secondary flex items-center justify-center", s.color)}>
                <s.icon className="w-4 h-4" />
              </div>
              <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="font-bold text-base">{s.value}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">{isRtl ? "مخالفات الموظفين" : "Employee Violations"}</h3>
        <Button size="sm" variant="destructive" className="gap-1.5" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" />{isRtl ? "تسجيل مخالفة" : "Record Violation"}
        </Button>
      </div>

      {/* Table */}
      <Card className="border-border/50 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-secondary/40">
                <TableRow>
                  <TableHead>{isRtl ? "الموظف" : "Employee"}</TableHead>
                  <TableHead>{isRtl ? "نوع المخالفة" : "Type"}</TableHead>
                  <TableHead>{isRtl ? "الوصف" : "Description"}</TableHead>
                  <TableHead>{isRtl ? "التاريخ" : "Date"}</TableHead>
                  <TableHead>{isRtl ? "الغرامة" : "Penalty"}</TableHead>
                  <TableHead>{isRtl ? "الحالة" : "Status"}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {violations.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">{isRtl ? "لا توجد مخالفات مسجلة" : "No violations recorded"}</TableCell></TableRow>
                ) : violations.map(v => {
                  const st = STATUS_MAP[v.status] || { ar: v.status, en: v.status, cls: "" };
                  return (
                    <TableRow key={v.id} className="hover:bg-muted/30" data-testid={`row-violation-${v.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-xs font-bold text-red-600">{empName(v.employeeId)[0]}</div>
                          <span className="font-medium text-sm">{empName(v.employeeId)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-normal border-red-200 text-red-600 bg-red-50 dark:bg-red-950/20">{violationLabel(v.violationType)}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[160px] truncate">{v.description || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{v.date || "—"}</TableCell>
                      <TableCell className={cn("font-semibold", parseFloat(v.penaltyAmount) > 0 ? "text-red-600" : "text-muted-foreground")}>
                        {parseFloat(v.penaltyAmount) > 0 ? SAR(v.penaltyAmount) : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("text-xs border-0 font-normal", st.cls)}>{isRtl ? st.ar : st.en}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className={cn("flex items-center gap-1", isRtl ? "justify-start" : "justify-end")}>
                          {v.status === "pending" && (
                            <>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50" onClick={() => updateStatus(v.id, "confirmed")} title={isRtl ? "تأكيد المخالفة" : "Confirm"}>
                                <XCircle className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600 hover:bg-emerald-50" onClick={() => updateStatus(v.id, "waived")} title={isRtl ? "العفو" : "Waive"}>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500" onClick={() => handleDelete(v.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent dir={dir}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-500" />
              {isRtl ? "تسجيل مخالفة جديدة" : "Record New Violation"}
            </DialogTitle>
            <DialogDescription>{isRtl ? "سيتم تطبيق الغرامة في مسير الراتب عند تأكيد المخالفة" : "Penalty will be applied to payroll when violation is confirmed"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div>
              <Label className="text-xs">{isRtl ? "الموظف *" : "Employee *"}</Label>
              <Select value={form.employeeId} onValueChange={v => setForm(p => ({ ...p, employeeId: v }))}>
                <SelectTrigger className="mt-1 h-9"><SelectValue placeholder={isRtl ? "اختر موظفاً..." : "Select employee..."} /></SelectTrigger>
                <SelectContent>
                  {employees.map(e => <SelectItem key={e.id} value={String(e.id)}>{isRtl ? e.nameAr : e.nameEn} ({e.employeeNumber})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">{isRtl ? "نوع المخالفة *" : "Violation Type *"}</Label>
                <Select value={form.violationType} onValueChange={v => setForm(p => ({ ...p, violationType: v }))}>
                  <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VIOLATION_TYPES.map(t => <SelectItem key={t.id} value={t.id}>{isRtl ? t.ar : t.en}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">{isRtl ? "مبلغ الغرامة (ر.س)" : "Penalty Amount (SAR)"}</Label>
                <Input type="number" className="mt-1 h-9 text-sm" placeholder="0" value={form.penaltyAmount} onChange={e => setForm(p => ({ ...p, penaltyAmount: e.target.value }))} data-testid="input-penalty-amount" />
              </div>
              <div>
                <Label className="text-xs">{isRtl ? "تاريخ المخالفة" : "Date"}</Label>
                <Input type="date" className="mt-1 h-9 text-sm" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="text-xs">{isRtl ? "وصف المخالفة" : "Description"}</Label>
              <Input className="mt-1 h-9 text-sm" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder={isRtl ? "تفاصيل المخالفة..." : "Violation details..."} />
            </div>
            <div>
              <Label className="text-xs">{isRtl ? "ملاحظات" : "Notes"}</Label>
              <Textarea className="mt-1 text-sm resize-none" rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>{isRtl ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={handleSave} disabled={saving} variant="destructive" className="gap-1.5">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
              {isRtl ? "تسجيل المخالفة" : "Record Violation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
