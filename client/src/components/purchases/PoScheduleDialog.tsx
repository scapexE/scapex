import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Loader2, Banknote, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { getRequestScope } from "@/lib/queryClient";

export interface PoLite {
  id: string;
  poNumber: string;
  vendor: string;
  vendorAr: string;
  total: number;
}

interface Installment {
  id: number;
  poId: number;
  installmentNumber: number;
  descriptionAr: string | null;
  descriptionEn: string | null;
  amount: string;
  dueDate: string | null;
  status: string;
  paidAmount: string;
  paidDate: string | null;
  notes: string | null;
}

interface Voucher {
  id: number;
  paymentNumber: string;
  type: string;
  amount: string;
  method: string;
  reference: string | null;
  date: string;
  poId: number | null;
  poScheduleId: number | null;
}

const METHODS = [
  { id: "bank_transfer", ar: "تحويل بنكي", en: "Bank Transfer" },
  { id: "cash", ar: "نقداً", en: "Cash" },
  { id: "cheque", ar: "شيك", en: "Cheque" },
  { id: "card", ar: "بطاقة", en: "Card" },
];

const today = () => new Date().toISOString().slice(0, 10);
const SAR = (v: string | number) => `${(typeof v === "string" ? parseFloat(v || "0") : v).toLocaleString(undefined, { maximumFractionDigits: 2 })} ر.س`;

export function PoScheduleDialog({ po, isRtl, onClose }: { po: PoLite | null; isRtl: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ descriptionAr: "", amount: "", dueDate: "", notes: "" });
  const [payFor, setPayFor] = useState<Installment | null>(null);
  const [payForm, setPayForm] = useState({ amount: "", method: "bank_transfer", reference: "", date: today(), notes: "" });

  const fetchAll = useCallback(async () => {
    if (!po) return;
    try {
      setLoading(true);
      const [sRes, pRes] = await Promise.all([
        fetch(`/api/po-payment-schedules?poId=${po.id}`),
        fetch("/api/payments"),
      ]);
      const [sData, pData] = await Promise.all([sRes.json(), pRes.json()]);
      setInstallments(Array.isArray(sData) ? sData : []);
      setVouchers(Array.isArray(pData) ? pData.filter((p: Voucher) => p.type === "paid" && String(p.poId) === po.id) : []);
    } catch { toast({ title: isRtl ? "خطأ في التحميل" : "Load error", variant: "destructive" }); }
    finally { setLoading(false); }
  }, [po?.id]);

  useEffect(() => { if (po) { fetchAll(); setShowAdd(false); setPayFor(null); } }, [po?.id, fetchAll]);

  const statusLabel = (s: string) => ({
    pending: isRtl ? "قيد الانتظار" : "Pending",
    partial: isRtl ? "مدفوعة جزئياً" : "Partial",
    paid: isRtl ? "مدفوعة" : "Paid",
    overdue: isRtl ? "متأخرة" : "Overdue",
    cancelled: isRtl ? "ملغاة" : "Cancelled",
  }[s] || s);
  const statusClass = (s: string) => ({
    pending: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    partial: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    overdue: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    cancelled: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  }[s] || "");

  const totalScheduled = installments.reduce((s, i) => s + parseFloat(i.amount || "0"), 0);
  const totalPaid = installments.reduce((s, i) => s + parseFloat(i.paidAmount || "0"), 0);
  const remaining = totalScheduled - totalPaid;

  const handleAdd = async () => {
    if (!po || !addForm.amount || parseFloat(addForm.amount) <= 0) {
      toast({ title: isRtl ? "يرجى إدخال مبلغ صحيح" : "Enter a valid amount", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      const nextNum = installments.reduce((m, i) => Math.max(m, i.installmentNumber), 0) + 1;
      const res = await fetch("/api/po-payment-schedules", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ poId: po.id, installmentNumber: nextNum, descriptionAr: addForm.descriptionAr || null, amount: parseFloat(addForm.amount), dueDate: addForm.dueDate || null, notes: addForm.notes || null }),
      });
      if (!res.ok) throw new Error();
      toast({ title: isRtl ? "تمت إضافة الدفعة" : "Installment added" });
      setAddForm({ descriptionAr: "", amount: "", dueDate: "", notes: "" });
      setShowAdd(false);
      fetchAll();
    } catch { toast({ title: isRtl ? "خطأ" : "Error", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleDeleteInstallment = async (id: number) => {
    try {
      const res = await fetch(`/api/po-payment-schedules/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast({ title: isRtl ? "تم الحذف" : "Deleted" });
      fetchAll();
    } catch { toast({ title: isRtl ? "خطأ" : "Error", variant: "destructive" }); }
  };

  const openPay = (inst: Installment) => {
    const bal = parseFloat(inst.amount || "0") - parseFloat(inst.paidAmount || "0");
    setPayForm({ amount: bal > 0 ? bal.toFixed(2) : "", method: "bank_transfer", reference: "", date: today(), notes: "" });
    setPayFor(inst);
  };

  const handlePay = async () => {
    if (!po || !payFor || !payForm.amount || parseFloat(payForm.amount) <= 0) {
      toast({ title: isRtl ? "يرجى إدخال المبلغ" : "Enter amount", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "paid", poId: po.id, poScheduleId: payFor.id,
          amount: parseFloat(payForm.amount), method: payForm.method,
          reference: payForm.reference || null, date: payForm.date,
          notes: payForm.notes || `${isRtl ? "سند صرف لأمر الشراء" : "Payment voucher for PO"} ${po.poNumber} — ${isRtl ? "قسط" : "installment"} ${payFor.installmentNumber}`,
          createdBy: getRequestScope().userId || null,
        }),
      });
      if (!res.ok) throw new Error();
      toast({ title: isRtl ? "تم إنشاء سند الصرف وربطه بالدفعة" : "Payment voucher created and linked" });
      setPayFor(null);
      fetchAll();
    } catch { toast({ title: isRtl ? "خطأ" : "Error", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleDeleteVoucher = async (id: number) => {
    try {
      const res = await fetch(`/api/payments/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast({ title: isRtl ? "تم حذف السند وإعادة احتساب الدفعة" : "Voucher deleted, installment recomputed" });
      fetchAll();
    } catch { toast({ title: isRtl ? "خطأ" : "Error", variant: "destructive" }); }
  };

  const methodLabel = (m: string) => { const x = METHODS.find(v => v.id === m); return x ? (isRtl ? x.ar : x.en) : m; };

  return (
    <Dialog open={!!po} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="w-5 h-5 text-emerald-600" />
            {isRtl ? "جدول دفعات المورد" : "Vendor Payment Schedule"} — {po?.poNumber}
          </DialogTitle>
        </DialogHeader>
        {po && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-secondary/50 p-2">
                <p className="text-[11px] text-muted-foreground">{isRtl ? "إجمالي الجدول" : "Scheduled"}</p>
                <p className="font-bold text-sm" data-testid="text-po-sched-total">{SAR(totalScheduled)}</p>
              </div>
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 p-2">
                <p className="text-[11px] text-muted-foreground">{isRtl ? "المدفوع" : "Paid"}</p>
                <p className="font-bold text-sm text-emerald-600" data-testid="text-po-sched-paid">{SAR(totalPaid)}</p>
              </div>
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-2">
                <p className="text-[11px] text-muted-foreground">{isRtl ? "المتبقي" : "Remaining"}</p>
                <p className="font-bold text-sm text-red-600" data-testid="text-po-sched-remaining">{SAR(remaining)}</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{isRtl ? "الدفعات المجدولة" : "Installments"}</p>
              <Button size="sm" variant="outline" onClick={() => setShowAdd(v => !v)} data-testid="button-add-installment">
                <Plus className="w-3.5 h-3.5 me-1" />{isRtl ? "إضافة دفعة" : "Add Installment"}
              </Button>
            </div>

            {showAdd && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-lg border bg-secondary/30">
                <div className="col-span-2 sm:col-span-1"><Label className="text-xs">{isRtl ? "الوصف" : "Description"}</Label><Input className="mt-1 h-8 text-sm" value={addForm.descriptionAr} onChange={e => setAddForm(p => ({ ...p, descriptionAr: e.target.value }))} data-testid="input-installment-desc" /></div>
                <div><Label className="text-xs">{isRtl ? "المبلغ *" : "Amount *"}</Label><Input type="number" className="mt-1 h-8 text-sm" value={addForm.amount} onChange={e => setAddForm(p => ({ ...p, amount: e.target.value }))} data-testid="input-installment-amount" /></div>
                <div><Label className="text-xs">{isRtl ? "تاريخ الاستحقاق" : "Due Date"}</Label><Input type="date" className="mt-1 h-8 text-sm" value={addForm.dueDate} onChange={e => setAddForm(p => ({ ...p, dueDate: e.target.value }))} data-testid="input-installment-due" /></div>
                <div className="flex items-end"><Button size="sm" className="h-8 w-full" onClick={handleAdd} disabled={saving} data-testid="button-save-installment">{saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (isRtl ? "حفظ" : "Save")}</Button></div>
              </div>
            )}

            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/40">
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>{isRtl ? "الوصف" : "Description"}</TableHead>
                      <TableHead>{isRtl ? "المبلغ" : "Amount"}</TableHead>
                      <TableHead>{isRtl ? "الاستحقاق" : "Due"}</TableHead>
                      <TableHead>{isRtl ? "المدفوع" : "Paid"}</TableHead>
                      <TableHead>{isRtl ? "الحالة" : "Status"}</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {installments.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">{isRtl ? "لا توجد دفعات مجدولة — أضف الدفعة الأولى" : "No installments yet"}</TableCell></TableRow>
                    ) : installments.map(inst => (
                      <TableRow key={inst.id} data-testid={`row-installment-${inst.id}`}>
                        <TableCell className="font-semibold text-xs">{inst.installmentNumber}</TableCell>
                        <TableCell className="text-sm">{inst.descriptionAr || inst.descriptionEn || "—"}</TableCell>
                        <TableCell className="text-sm font-medium">{SAR(inst.amount)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{inst.dueDate ? String(inst.dueDate).slice(0, 10) : "—"}</TableCell>
                        <TableCell className="text-sm text-emerald-600">{SAR(inst.paidAmount)}</TableCell>
                        <TableCell><span className={cn("inline-block px-2 py-0.5 rounded text-[11px] font-semibold", statusClass(inst.status))} data-testid={`status-installment-${inst.id}`}>{statusLabel(inst.status)}</span></TableCell>
                        <TableCell>
                          <div className="flex gap-1 justify-end">
                            {inst.status !== "paid" && inst.status !== "cancelled" && (
                              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => openPay(inst)} data-testid={`button-pay-installment-${inst.id}`}>
                                <Receipt className="w-3 h-3 me-1" />{isRtl ? "سند صرف" : "Pay"}
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteInstallment(inst.id)} data-testid={`button-delete-installment-${inst.id}`}><Trash2 className="w-3.5 h-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {payFor && (
              <div className="p-3 rounded-lg border-2 border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-900/10 space-y-2">
                <p className="text-sm font-semibold">{isRtl ? `سند صرف — قسط ${payFor.installmentNumber}` : `Payment voucher — installment ${payFor.installmentNumber}`}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div><Label className="text-xs">{isRtl ? "المبلغ *" : "Amount *"}</Label><Input type="number" className="mt-1 h-8 text-sm" value={payForm.amount} onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))} data-testid="input-voucher-amount" /></div>
                  <div>
                    <Label className="text-xs">{isRtl ? "طريقة الدفع" : "Method"}</Label>
                    <Select value={payForm.method} onValueChange={v => setPayForm(p => ({ ...p, method: v }))}>
                      <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>{METHODS.map(m => <SelectItem key={m.id} value={m.id}>{isRtl ? m.ar : m.en}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-xs">{isRtl ? "التاريخ" : "Date"}</Label><Input type="date" className="mt-1 h-8 text-sm" value={payForm.date} onChange={e => setPayForm(p => ({ ...p, date: e.target.value }))} data-testid="input-voucher-date" /></div>
                  <div><Label className="text-xs">{isRtl ? "المرجع" : "Reference"}</Label><Input className="mt-1 h-8 text-sm" value={payForm.reference} onChange={e => setPayForm(p => ({ ...p, reference: e.target.value }))} data-testid="input-voucher-reference" /></div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => setPayFor(null)}>{isRtl ? "إلغاء" : "Cancel"}</Button>
                  <Button size="sm" onClick={handlePay} disabled={saving} data-testid="button-save-voucher">{saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (isRtl ? "إنشاء السند" : "Create Voucher")}</Button>
                </div>
              </div>
            )}

            {vouchers.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2">{isRtl ? "سندات الصرف المرتبطة" : "Linked Vouchers"}</p>
                <div className="rounded-lg border overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-secondary/40">
                      <TableRow>
                        <TableHead>{isRtl ? "رقم السند" : "Voucher No."}</TableHead>
                        <TableHead>{isRtl ? "المبلغ" : "Amount"}</TableHead>
                        <TableHead>{isRtl ? "الطريقة" : "Method"}</TableHead>
                        <TableHead>{isRtl ? "التاريخ" : "Date"}</TableHead>
                        <TableHead>{isRtl ? "القسط" : "Installment"}</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vouchers.map(v => (
                        <TableRow key={v.id} data-testid={`row-voucher-${v.id}`}>
                          <TableCell className="font-mono text-xs font-semibold text-primary">{v.paymentNumber}</TableCell>
                          <TableCell className="text-sm font-medium text-red-600">{SAR(v.amount)}</TableCell>
                          <TableCell className="text-xs"><Badge variant="outline" className="font-normal">{methodLabel(v.method)}</Badge></TableCell>
                          <TableCell className="text-xs text-muted-foreground">{v.date}</TableCell>
                          <TableCell className="text-xs">{v.poScheduleId ? (installments.find(i => i.id === v.poScheduleId)?.installmentNumber ?? "—") : "—"}</TableCell>
                          <TableCell>
                            <div className="flex justify-end">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteVoucher(v.id)} data-testid={`button-delete-voucher-${v.id}`}><Trash2 className="w-3.5 h-3.5" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">{isRtl ? "يمكن طباعة السندات من قسم المحاسبة → سندات الدفع" : "Vouchers can be printed from Accounting → Payments"}</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
