import { useState, useEffect, useCallback } from "react";
import { ExportMenu } from "@/components/shared/ExportMenu";
import { useLanguage } from "@/contexts/LanguageContext";
import { esc } from "@/lib/htmlEscape";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Printer, Trash2, ArrowDownCircle, ArrowUpCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Payment {
  id: number; paymentNumber: string; type: string;
  invoiceId: number | null; contactId: number | null;
  amount: string; currency: string; method: string;
  reference: string | null; date: string; notes: string | null;
  scheduleId: number | null; contractRef: string | null;
  createdAt: string;
}
interface Contact { id: number; nameAr: string | null; nameEn: string | null; }
interface Invoice { id: number; invoiceNumber: string; clientName: string | null; total: string; }
interface ScheduleInstallment {
  id: number; contractRef: string; contractName: string; installmentNumber: number;
  amount: string; paidAmount: string; status: string;
}

const SAR = (v: string | number) => `${parseFloat(String(v || 0)).toLocaleString("ar-SA")} ر.س`;
const today = () => new Date().toISOString().slice(0, 10);

const METHODS_AR: Record<string,string> = {
  bank_transfer: "حوالة بنكية", cash: "نقداً", check: "شيك", sadad: "سداد", stc_pay: "STC Pay", other: "أخرى",
};
const METHODS_EN: Record<string,string> = {
  bank_transfer: "Bank Transfer", cash: "Cash", check: "Check", sadad: "SADAD", stc_pay: "STC Pay", other: "Other",
};

function printVoucher(pmt: Payment, contacts: Contact[], isRtl: boolean) {
  const isReceipt = pmt.type === "received";
  const methodLabel = isRtl ? (METHODS_AR[pmt.method] || pmt.method) : (METHODS_EN[pmt.method] || pmt.method);
  const contact = contacts.find(c => c.id === pmt.contactId);
  const contactName = contact ? (isRtl ? contact.nameAr : contact.nameEn) : "—";

  const html = `<!DOCTYPE html><html dir="${isRtl ? "rtl" : "ltr"}"><head><meta charset="UTF-8"><title>${esc(pmt.paymentNumber)}</title>
  <style>body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;margin:30px;color:#1a1a1a;max-width:600px}
  .header{display:flex;justify-content:space-between;border-bottom:3px solid ${isReceipt ? "#166534" : "#991b1b"};padding-bottom:12px;margin-bottom:20px}
  .logo{font-size:20px;font-weight:900;color:${isReceipt ? "#166534" : "#991b1b"}}
  .type-badge{background:${isReceipt ? "#dcfce7" : "#fee2e2"};color:${isReceipt ? "#166534" : "#991b1b"};padding:4px 14px;border-radius:6px;font-weight:700;font-size:14px}
  .amount-box{background:${isReceipt ? "#f0fdf4" : "#fff1f2"};border:2px solid ${isReceipt ? "#166534" : "#991b1b"};border-radius:10px;padding:16px;text-align:center;margin:20px 0}
  .amount{font-size:28px;font-weight:900;color:${isReceipt ? "#166534" : "#991b1b"}}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:15px 0}
  .field{padding:8px;background:#f8fafc;border-radius:6px}
  .field-label{font-size:10px;color:#64748b;margin-bottom:3px}
  .field-value{font-weight:600;font-size:12px}
  .sig{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:40px;padding-top:15px;border-top:1px solid #e2e8f0}
  .sig-line{border-top:1px solid #1a1a1a;margin-top:30px;padding-top:4px;text-align:center;font-size:10px;color:#64748b}
  .footer{text-align:center;margin-top:20px;color:#94a3b8;font-size:10px;border-top:1px solid #e2e8f0;padding-top:10px}</style>
  </head><body>
  <div class="header">
    <div class="logo">Scapex</div>
    <span class="type-badge">${isRtl ? (isReceipt ? "سند قبض" : "سند صرف") : (isReceipt ? "Receipt Voucher" : "Payment Voucher")}</span>
  </div>
  <div class="amount-box">
    <div style="font-size:11px;color:#64748b;margin-bottom:6px">${isRtl ? "المبلغ" : "Amount"}</div>
    <div class="amount">${SAR(pmt.amount)}</div>
  </div>
  <div class="grid">
    <div class="field"><div class="field-label">${isRtl ? "رقم السند" : "Voucher No."}</div><div class="field-value">${esc(pmt.paymentNumber)}</div></div>
    <div class="field"><div class="field-label">${isRtl ? "التاريخ" : "Date"}</div><div class="field-value">${pmt.date}</div></div>
    <div class="field"><div class="field-label">${isRtl ? (isReceipt ? "المستلم من" : "المدفوع لـ") : (isReceipt ? "Received from" : "Paid to")}</div><div class="field-value">${esc(contactName)}</div></div>
    <div class="field"><div class="field-label">${isRtl ? "طريقة الدفع" : "Method"}</div><div class="field-value">${methodLabel}</div></div>
    ${pmt.reference ? `<div class="field" style="grid-column:1/-1"><div class="field-label">${isRtl ? "المرجع" : "Reference"}</div><div class="field-value">${esc(pmt.reference)}</div></div>` : ""}
    ${pmt.notes ? `<div class="field" style="grid-column:1/-1"><div class="field-label">${isRtl ? "ملاحظات" : "Notes"}</div><div class="field-value">${esc(pmt.notes)}</div></div>` : ""}
  </div>
  <div class="sig">
    <div><div class="sig-line">${isRtl ? "توقيع المستلم" : "Received by"}</div></div>
    <div><div class="sig-line">${isRtl ? "توقيع المسؤول" : "Authorized by"}</div></div>
  </div>
  <div class="footer">شركة سكابكس · Scapex Company</div>
  </body></html>`;
  const w = window.open("", "_blank");
  if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 400); }
}

export function PaymentsTab() {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";
  const { toast } = useToast();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [installments, setInstallments] = useState<ScheduleInstallment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [voucherType, setVoucherType] = useState<"received" | "paid">("received");
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    contactId: "", invoiceId: "", amount: "", method: "bank_transfer",
    reference: "", date: today(), notes: "", scheduleId: "", contractRef: "",
  });

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [pmtRes, ctRes, invRes, schRes] = await Promise.all([
        fetch("/api/payments"), fetch("/api/customers"), fetch("/api/invoices"), fetch("/api/contract-payment-schedules"),
      ]);
      const [pmtData, ctData, invData, schData] = await Promise.all([pmtRes.json(), ctRes.json(), invRes.json(), schRes.json()]);
      setPayments(Array.isArray(pmtData) ? pmtData : []);
      setContacts(Array.isArray(ctData) ? ctData : []);
      setInvoices(Array.isArray(invData) ? invData : []);
      setInstallments(Array.isArray(schData) ? schData : []);
    } catch { toast({ title: isRtl ? "خطأ" : "Error", variant: "destructive" }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openCreate = (type: "received" | "paid") => {
    setVoucherType(type);
    setForm({ contactId: "", invoiceId: "", amount: "", method: "bank_transfer", reference: "", date: today(), notes: "", scheduleId: "", contractRef: "" });
    setShowCreate(true);
  };

  const handleSave = async () => {
    if (!form.amount || parseFloat(form.amount) <= 0) {
      toast({ title: isRtl ? "يرجى إدخال المبلغ" : "Enter amount", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      await fetch("/api/payments", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: voucherType, contactId: form.contactId || null, invoiceId: form.invoiceId || null, amount: parseFloat(form.amount), method: form.method, reference: form.reference || null, date: form.date, notes: form.notes || null, scheduleId: form.scheduleId || null, contractRef: form.contractRef || null }),
      });
      toast({ title: isRtl ? "تم إنشاء السند" : "Voucher created" });
      setShowCreate(false);
      fetchAll();
    } catch { toast({ title: isRtl ? "خطأ" : "Error", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    try {
      await fetch(`/api/payments/${id}`, { method: "DELETE" });
      toast({ title: isRtl ? "تم الحذف" : "Deleted" });
      fetchAll();
    } catch { toast({ title: isRtl ? "خطأ" : "Error", variant: "destructive" }); }
  };

  const received = payments.filter(p => p.type === "received");
  const paid = payments.filter(p => p.type === "paid");
  const contactName = (id: number | null) => {
    if (!id) return "—";
    const c = contacts.find(x => x.id === id);
    return c ? (isRtl ? c.nameAr || "—" : c.nameEn || "—") : "—";
  };

  const methodLabel = (m: string) => isRtl ? (METHODS_AR[m] || m) : (METHODS_EN[m] || m);

  const totalReceived = received.reduce((s, p) => s + parseFloat(p.amount || "0"), 0);
  const totalPaid = paid.reduce((s, p) => s + parseFloat(p.amount || "0"), 0);

  const PaymentTable = ({ rows }: { rows: Payment[] }) => (
    <Card className="border-border/50 overflow-hidden">
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-secondary/40">
              <TableRow>
                <TableHead>{isRtl ? "رقم السند" : "Voucher No."}</TableHead>
                <TableHead>{isRtl ? "العميل / المورد" : "Party"}</TableHead>
                <TableHead>{isRtl ? "التاريخ" : "Date"}</TableHead>
                <TableHead>{isRtl ? "المبلغ" : "Amount"}</TableHead>
                <TableHead>{isRtl ? "طريقة الدفع" : "Method"}</TableHead>
                <TableHead>{isRtl ? "المرجع" : "Reference"}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">{isRtl ? "لا توجد سندات" : "No vouchers"}</TableCell></TableRow>
              ) : rows.map(pmt => (
                <TableRow key={pmt.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-xs font-semibold text-primary">
                    {pmt.paymentNumber}
                    {pmt.contractRef && <span className="block text-[10px] text-muted-foreground font-normal">{isRtl ? "عقد: " : "Contract: "}{pmt.contractRef}</span>}
                  </TableCell>
                  <TableCell className="font-medium">{contactName(pmt.contactId)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{pmt.date}</TableCell>
                  <TableCell className={cn("font-bold", pmt.type === "received" ? "text-emerald-600" : "text-red-600")}>{SAR(pmt.amount)}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs font-normal">{methodLabel(pmt.method)}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{pmt.reference || "—"}</TableCell>
                  <TableCell>
                    <div className={cn("flex items-center gap-1", isRtl ? "justify-start" : "justify-end")}>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600" onClick={() => printVoucher(pmt, contacts, isRtl)}><Printer className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDelete(pmt.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: isRtl ? "إجمالي سندات القبض" : "Total Receipts", value: received.length, color: "text-emerald-600" },
          { label: isRtl ? "إجمالي سندات الصرف" : "Total Payments", value: paid.length, color: "text-red-500" },
          { label: isRtl ? "مجموع المقبوض" : "Total Received", value: SAR(totalReceived), color: "text-emerald-600" },
          { label: isRtl ? "مجموع المصروف" : "Total Paid Out", value: SAR(totalPaid), color: "text-red-500" },
        ].map((s, i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-4"><p className="text-xs text-muted-foreground">{s.label}</p><p className={cn("text-lg font-bold mt-1", s.color)}>{s.value}</p></CardContent>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2 items-center flex-wrap">
        <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => openCreate("received")}>
          <ArrowDownCircle className="w-4 h-4" />{isRtl ? "سند قبض جديد" : "New Receipt Voucher"}
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950" onClick={() => openCreate("paid")}>
          <ArrowUpCircle className="w-4 h-4" />{isRtl ? "سند صرف جديد" : "New Payment Voucher"}
        </Button>
        <div className="ms-auto">
          <ExportMenu
            title={isRtl ? "قائمة السندات" : "Vouchers List"}
            filename="payments"
            data={payments}
            columns={[
              { key: "no", header: isRtl ? "رقم السند" : "Voucher No.", accessor: (p: Payment) => p.paymentNumber },
              { key: "type", header: isRtl ? "النوع" : "Type", accessor: (p: Payment) => p.type === "received" ? (isRtl ? "قبض" : "Received") : (isRtl ? "صرف" : "Paid") },
              { key: "party", header: isRtl ? "العميل/المورد" : "Party", accessor: (p: Payment) => contactName(p.contactId) },
              { key: "date", header: isRtl ? "التاريخ" : "Date", accessor: (p: Payment) => p.date },
              { key: "amount", header: isRtl ? "المبلغ" : "Amount", accessor: (p: Payment) => p.amount },
              { key: "method", header: isRtl ? "طريقة الدفع" : "Method", accessor: (p: Payment) => methodLabel(p.method) },
              { key: "reference", header: isRtl ? "المرجع" : "Reference", accessor: (p: Payment) => p.reference || "" },
            ]}
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="received">
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="received" className="gap-1.5">
            <ArrowDownCircle className="w-3.5 h-3.5 text-emerald-600" />
            {isRtl ? `سندات القبض (${received.length})` : `Receipts (${received.length})`}
          </TabsTrigger>
          <TabsTrigger value="paid" className="gap-1.5">
            <ArrowUpCircle className="w-3.5 h-3.5 text-red-500" />
            {isRtl ? `سندات الصرف (${paid.length})` : `Payments (${paid.length})`}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="received" className="mt-3"><PaymentTable rows={received} /></TabsContent>
        <TabsContent value="paid" className="mt-3"><PaymentTable rows={paid} /></TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent dir={dir}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {voucherType === "received"
                ? <ArrowDownCircle className="w-5 h-5 text-emerald-600" />
                : <ArrowUpCircle className="w-5 h-5 text-red-500" />}
              {isRtl
                ? (voucherType === "received" ? "سند قبض جديد" : "سند صرف جديد")
                : (voucherType === "received" ? "New Receipt Voucher" : "New Payment Voucher")}
            </DialogTitle>
            <DialogDescription>
              {isRtl
                ? (voucherType === "received" ? "تسجيل مبلغ مقبوض من عميل أو جهة" : "تسجيل مبلغ مصروف لمورد أو جهة")
                : (voucherType === "received" ? "Record payment received from a client" : "Record payment made to a supplier")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">{isRtl ? (voucherType === "received" ? "المستلم من" : "المدفوع لـ") : (voucherType === "received" ? "Received from" : "Paid to")}</Label>
                <Select value={form.contactId} onValueChange={v => setForm(p => ({ ...p, contactId: v }))}>
                  <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue placeholder={isRtl ? "اختر..." : "Select..."} /></SelectTrigger>
                  <SelectContent>
                    {contacts.map(c => <SelectItem key={c.id} value={String(c.id)}>{isRtl ? c.nameAr : c.nameEn}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">{isRtl ? "ربط بفاتورة (اختياري)" : "Link to Invoice (opt.)"}</Label>
                <Select value={form.invoiceId} onValueChange={v => setForm(p => ({ ...p, invoiceId: v }))}>
                  <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue placeholder={isRtl ? "اختر..." : "Select..."} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{isRtl ? "— بدون ربط —" : "— None —"}</SelectItem>
                    {invoices.map(i => <SelectItem key={i.id} value={String(i.id)}>{i.invoiceNumber} — {i.clientName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {voucherType === "received" && (
                <div className="col-span-2">
                  <Label className="text-xs">{isRtl ? "ربط بدفعة عقد (اختياري)" : "Link to Contract Installment (opt.)"}</Label>
                  <Select value={form.scheduleId} onValueChange={v => {
                    const inst = installments.find(x => String(x.id) === v);
                    const bal = inst ? Math.max(0, parseFloat(inst.amount || "0") - parseFloat(inst.paidAmount || "0")) : 0;
                    setForm(p => ({ ...p, scheduleId: v, contractRef: inst?.contractRef || "", amount: inst ? bal.toFixed(2) : p.amount }));
                  }}>
                    <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue placeholder={isRtl ? "اختر دفعة..." : "Select installment..."} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">{isRtl ? "— بدون ربط —" : "— None —"}</SelectItem>
                      {installments.filter(x => x.status !== "paid" && x.status !== "cancelled").map(x => {
                        const bal = Math.max(0, parseFloat(x.amount || "0") - parseFloat(x.paidAmount || "0"));
                        return <SelectItem key={x.id} value={String(x.id)}>{x.contractName} — #{x.installmentNumber} ({SAR(bal)})</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label className="text-xs">{isRtl ? "المبلغ (ر.س)" : "Amount (SAR)"}</Label>
                <Input type="number" className="mt-1 h-9 text-sm" placeholder="0.00" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} data-testid="input-payment-amount" />
              </div>
              <div>
                <Label className="text-xs">{isRtl ? "طريقة الدفع" : "Payment Method"}</Label>
                <Select value={form.method} onValueChange={v => setForm(p => ({ ...p, method: v }))}>
                  <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(isRtl ? METHODS_AR : METHODS_EN).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">{isRtl ? "التاريخ" : "Date"}</Label>
                <Input type="date" className="mt-1 h-9 text-sm" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">{isRtl ? "رقم المرجع / الشيك" : "Reference / Cheque No."}</Label>
                <Input className="mt-1 h-9 text-sm" value={form.reference} onChange={e => setForm(p => ({ ...p, reference: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="text-xs">{isRtl ? "ملاحظات" : "Notes"}</Label>
              <Textarea className="mt-1 text-sm resize-none" rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>{isRtl ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={handleSave} disabled={saving}
              className={cn("gap-1.5", voucherType === "received" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700")}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (voucherType === "received" ? <ArrowDownCircle className="w-4 h-4" /> : <ArrowUpCircle className="w-4 h-4" />)}
              {isRtl ? "حفظ السند" : "Save Voucher"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
