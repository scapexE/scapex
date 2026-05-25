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
import { Plus, CheckCircle2, XCircle, Trash2, Loader2, Banknote, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Advance {
  id: number; employeeId: number; amount: string;
  reason: string | null; requestDate: string | null;
  deductionMonths: number; deductedSoFar: string;
  status: string; notes: string | null; createdAt: string;
}
interface Employee { id: number; nameAr: string; nameEn: string; employeeNumber: string; }

const SAR = (v: string | number) => `${parseFloat(String(v || 0)).toLocaleString("ar-SA")} ر.س`;
const today = () => new Date().toISOString().slice(0, 10);

const STATUS_MAP: Record<string,{ ar: string; en: string; cls: string }> = {
  pending: { ar: "بانتظار الموافقة", en: "Pending", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  approved: { ar: "موافق عليه", en: "Approved", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  rejected: { ar: "مرفوض", en: "Rejected", cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  paid: { ar: "تم الصرف", en: "Paid", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  deducting: { ar: "يُخصم", en: "Deducting", cls: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
};

export function AdvancesTab() {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";
  const { toast } = useToast();

  const [advances, setAdvances] = useState<Advance[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    employeeId: "", amount: "", reason: "",
    requestDate: today(), deductionMonths: "1", notes: "",
  });

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [advRes, empRes] = await Promise.all([fetch("/api/employee-advances"), fetch("/api/employees")]);
      const [advData, empData] = await Promise.all([advRes.json(), empRes.json()]);
      setAdvances(Array.isArray(advData) ? advData : []);
      setEmployees(Array.isArray(empData) ? empData : []);
    } catch { toast({ title: isRtl ? "خطأ" : "Error", variant: "destructive" }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const empName = (id: number) => {
    const e = employees.find(x => x.id === id);
    return e ? (isRtl ? e.nameAr : e.nameEn) : `#${id}`;
  };

  const handleSave = async () => {
    if (!form.employeeId || !form.amount) {
      toast({ title: isRtl ? "يرجى تحديد الموظف والمبلغ" : "Select employee and amount", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      await fetch("/api/employee-advances", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: form.employeeId, amount: parseFloat(form.amount), reason: form.reason || null, requestDate: form.requestDate, deductionMonths: parseInt(form.deductionMonths), notes: form.notes || null }),
      });
      toast({ title: isRtl ? "تم تسجيل طلب السلفة" : "Advance request submitted" });
      setShowCreate(false);
      fetchAll();
    } catch { toast({ title: isRtl ? "خطأ" : "Error", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      await fetch(`/api/employee-advances/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      toast({ title: isRtl ? "تم تحديث الحالة" : "Status updated" });
      fetchAll();
    } catch { toast({ title: isRtl ? "خطأ" : "Error", variant: "destructive" }); }
  };

  const handleDelete = async (id: number) => {
    try {
      await fetch(`/api/employee-advances/${id}`, { method: "DELETE" });
      toast({ title: isRtl ? "تم الحذف" : "Deleted" });
      fetchAll();
    } catch { toast({ title: isRtl ? "خطأ" : "Error", variant: "destructive" }); }
  };

  const stats = {
    total: advances.length,
    pending: advances.filter(a => a.status === "pending").length,
    approved: advances.filter(a => ["approved","paid","deducting"].includes(a.status)).length,
    totalAmount: advances.filter(a => a.status !== "rejected").reduce((s, a) => s + parseFloat(a.amount || "0"), 0),
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: isRtl ? "إجمالي الطلبات" : "Total Requests", value: stats.total, icon: Banknote, color: "text-blue-500" },
          { label: isRtl ? "بانتظار الموافقة" : "Pending", value: stats.pending, icon: Clock, color: "text-amber-500" },
          { label: isRtl ? "موافق عليها" : "Approved", value: stats.approved, icon: CheckCircle2, color: "text-emerald-500" },
          { label: isRtl ? "إجمالي المبالغ" : "Total Amount", value: SAR(stats.totalAmount), icon: Banknote, color: "text-primary" },
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
        <h3 className="font-semibold">{isRtl ? "سلف الموظفين" : "Employee Advances"}</h3>
        <Button size="sm" className="gap-1.5" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" />{isRtl ? "طلب سلفة" : "Request Advance"}
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
                  <TableHead>{isRtl ? "المبلغ" : "Amount"}</TableHead>
                  <TableHead>{isRtl ? "السبب" : "Reason"}</TableHead>
                  <TableHead>{isRtl ? "تاريخ الطلب" : "Request Date"}</TableHead>
                  <TableHead>{isRtl ? "أقساط الخصم" : "Deduct Months"}</TableHead>
                  <TableHead>{isRtl ? "المخصوم" : "Deducted"}</TableHead>
                  <TableHead>{isRtl ? "الحالة" : "Status"}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {advances.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">{isRtl ? "لا توجد سلف" : "No advances"}</TableCell></TableRow>
                ) : advances.map(adv => {
                  const st = STATUS_MAP[adv.status] || { ar: adv.status, en: adv.status, cls: "" };
                  const remaining = parseFloat(adv.amount) - parseFloat(adv.deductedSoFar || "0");
                  return (
                    <TableRow key={adv.id} className="hover:bg-muted/30" data-testid={`row-advance-${adv.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{empName(adv.employeeId)[0]}</div>
                          <span className="font-medium text-sm">{empName(adv.employeeId)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-primary">{SAR(adv.amount)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">{adv.reason || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{adv.requestDate || "—"}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-xs">{adv.deductionMonths} {isRtl ? "شهر" : "mo."}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <span className="text-red-600 font-medium">{SAR(adv.deductedSoFar || 0)}</span>
                          {remaining > 0 && <span className="text-muted-foreground"> / {SAR(remaining)} {isRtl ? "متبقي" : "left"}</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("text-xs border-0 font-normal", st.cls)}>{isRtl ? st.ar : st.en}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className={cn("flex items-center gap-1", isRtl ? "justify-start" : "justify-end")}>
                          {adv.status === "pending" && (
                            <>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600 hover:bg-emerald-50" onClick={() => updateStatus(adv.id, "approved")} title={isRtl ? "موافقة" : "Approve"}>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50" onClick={() => updateStatus(adv.id, "rejected")} title={isRtl ? "رفض" : "Reject"}>
                                <XCircle className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                          {adv.status === "approved" && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600 hover:bg-blue-50" onClick={() => updateStatus(adv.id, "paid")} title={isRtl ? "تم الصرف" : "Mark Paid"}>
                              <Banknote className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:bg-red-50" onClick={() => handleDelete(adv.id)}>
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
              <Banknote className="w-5 h-5 text-primary" />
              {isRtl ? "طلب سلفة للموظف" : "Employee Advance Request"}
            </DialogTitle>
            <DialogDescription>{isRtl ? "سيتم خصم السلفة على دفعات من الراتب الشهري" : "The advance will be deducted in installments from monthly salary"}</DialogDescription>
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
                <Label className="text-xs">{isRtl ? "مبلغ السلفة (ر.س) *" : "Advance Amount (SAR) *"}</Label>
                <Input type="number" className="mt-1 h-9 text-sm" placeholder="0.00" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} data-testid="input-advance-amount" />
              </div>
              <div>
                <Label className="text-xs">{isRtl ? "عدد أشهر الخصم" : "Deduction Months"}</Label>
                <Select value={form.deductionMonths} onValueChange={v => setForm(p => ({ ...p, deductionMonths: v }))}>
                  <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,9,12].map(n => <SelectItem key={n} value={String(n)}>{n} {isRtl ? (n === 1 ? "شهر" : "أشهر") : "month(s)"}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">{isRtl ? "تاريخ الطلب" : "Request Date"}</Label>
                <Input type="date" className="mt-1 h-9 text-sm" value={form.requestDate} onChange={e => setForm(p => ({ ...p, requestDate: e.target.value }))} />
              </div>
            </div>
            {form.amount && form.deductionMonths && (
              <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4 text-blue-500 shrink-0" />
                <span className="text-blue-700 dark:text-blue-400">
                  {isRtl
                    ? `سيتم خصم ${SAR(parseFloat(form.amount || "0") / parseInt(form.deductionMonths || "1"))} شهرياً لمدة ${form.deductionMonths} شهر`
                    : `Monthly deduction: ${SAR(parseFloat(form.amount || "0") / parseInt(form.deductionMonths || "1"))} for ${form.deductionMonths} month(s)`}
                </span>
              </div>
            )}
            <div>
              <Label className="text-xs">{isRtl ? "سبب السلفة" : "Reason"}</Label>
              <Input className="mt-1 h-9 text-sm" value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} placeholder={isRtl ? "أدخل سبب طلب السلفة..." : "Enter reason..."} />
            </div>
            <div>
              <Label className="text-xs">{isRtl ? "ملاحظات" : "Notes"}</Label>
              <Textarea className="mt-1 text-sm resize-none" rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>{isRtl ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />}
              {isRtl ? "تقديم الطلب" : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
