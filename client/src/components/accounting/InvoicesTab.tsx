import { useState, useEffect, useCallback } from "react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Printer, Trash2, Eye, CheckCircle2, Send, FileText, Loader2, X, Mail, Pencil } from "lucide-react";
import { SendToClientDialog } from "@/components/shared/SendToClientDialog";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { getAboutData, getSystemSettings, getPrintFontCss } from "@/lib/companySettings";
import { dbGetItem, dbRemoveItem } from "@/lib/dbStorage";
import { watermarkHtml, preparedByHtml, zatcaQrBlockHtml } from "@/lib/printShared";
import { getRequestScope } from "@/lib/queryClient";
import { ExportMenu } from "@/components/shared/ExportMenu";

interface InvItem { descAr: string; descEn: string; qty: number; unit: string; unitPrice: number; total: number; }
interface Invoice {
  id: number; invoiceNumber: string; type: string;
  contactId: number | null; clientName: string | null;
  issueDate: string; dueDate: string | null;
  subtotal: string; vatAmount: string; total: string; paidAmount: string;
  currency: string; status: string; notes: string | null;
  createdBy?: string | null;
  items?: InvItem[];
}
interface Contact { id: number; nameAr: string | null; nameEn: string | null; }

const SAR = (v: string | number) => `${parseFloat(String(v)).toLocaleString("ar-SA")} ر.س`;
const today = () => new Date().toISOString().slice(0, 10);

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  sent: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  partial: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  void: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export function InvoicesTab() {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";
  const { toast } = useToast();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [sendInvoice, setSendInvoice] = useState<Invoice | null>(null);
  const [showDetail, setShowDetail] = useState<Invoice | null>(null);
  const [saving, setSaving] = useState(false);

  const EMPTY_FORM = {
    type: "sales", clientName: "", contactId: "", issueDate: today(),
    dueDate: "", notes: "", vatRate: 15,
    items: [{ descAr: "", descEn: "", qty: 1, unit: "عدد", unitPrice: 0, total: 0 }] as InvItem[],
  };

  const [form, setForm] = useState<{
    type: string; clientName: string; contactId: string;
    issueDate: string; dueDate: string; notes: string; vatRate: number;
    items: InvItem[];
  }>(EMPTY_FORM);

  const resetForm = () => { setForm({ ...EMPTY_FORM, issueDate: today(), items: [{ descAr: "", descEn: "", qty: 1, unit: "عدد", unitPrice: 0, total: 0 }] }); setEditingId(null); };

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [invRes, ctRes] = await Promise.all([fetch("/api/invoices"), fetch("/api/customers")]);
      const [invData, ctData] = await Promise.all([invRes.json(), ctRes.json()]);
      setInvoices(Array.isArray(invData) ? invData : []);
      setContacts(Array.isArray(ctData) ? ctData : []);
    } catch { toast({ title: isRtl ? "خطأ في التحميل" : "Load error", variant: "destructive" }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Prefill from CRM "Issue Invoice" button (deal drawer) — only when ?new=1
  useEffect(() => {
    try {
      if (new URLSearchParams(window.location.search).get("new") !== "1") return;
      const raw = dbGetItem("scapex_invoice_prefill");
      if (!raw) return;
      dbRemoveItem("scapex_invoice_prefill");
      const p = JSON.parse(raw);
      const value = parseFloat(String(p.value ?? 0)) || 0;
      const desc = p.dealTitleAr || p.dealTitleEn || "";
      setForm(f => ({
        ...f,
        type: "sales",
        clientName: p.clientName || "",
        contactId: p.contactId ? String(p.contactId) : "",
        items: [{
          descAr: p.dealTitleAr || desc, descEn: p.dealTitleEn || desc,
          qty: 1, unit: "عدد", unitPrice: value, total: value,
        }],
      }));
      setEditingId(null);
      setShowCreate(true);
    } catch {}
  }, []);

  const openEdit = async (inv: Invoice) => {
    try {
      const res = await fetch(`/api/invoices/${inv.id}`);
      if (!res.ok) throw new Error();
      const full = await res.json();
      const items: InvItem[] = Array.isArray(full.items) && full.items.length > 0
        ? full.items.map((it: any) => ({
            descAr: it.descAr || "", descEn: it.descEn || "",
            qty: parseFloat(String(it.qty)) || 1,
            unit: it.unit || "عدد",
            unitPrice: parseFloat(String(it.unitPrice)) || 0,
            total: parseFloat(String(it.total)) || 0,
          }))
        : [{ descAr: "", descEn: "", qty: 1, unit: "عدد", unitPrice: 0, total: 0 }];
      const sub = parseFloat(full.subtotal || "0");
      const vat = parseFloat(full.vatAmount || "0");
      const vatRate = sub > 0 ? Math.round((vat / sub) * 10000) / 100 : 15;
      setForm({
        type: full.type || "sales",
        clientName: full.clientName || "",
        contactId: full.contactId ? String(full.contactId) : "",
        issueDate: full.issueDate || today(),
        dueDate: full.dueDate || "",
        notes: full.notes || "",
        vatRate,
        items,
      });
      setEditingId(inv.id);
      setShowCreate(true);
    } catch {
      toast({ title: isRtl ? "تعذر تحميل الفاتورة" : "Failed to load invoice", variant: "destructive" });
    }
  };

  const subtotal = form.items.reduce((s, i) => s + i.total, 0);
  const vatAmount = parseFloat(((subtotal * form.vatRate) / 100).toFixed(2));
  const total = subtotal + vatAmount;

  const updateItem = (idx: number, field: keyof InvItem, value: any) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: value };
    if (field === "qty" || field === "unitPrice") {
      items[idx].total = parseFloat((items[idx].qty * items[idx].unitPrice).toFixed(2));
    }
    setForm(p => ({ ...p, items }));
  };

  const handleSave = async () => {
    if (!form.clientName && !form.contactId) {
      toast({ title: isRtl ? "يرجى إدخال اسم العميل" : "Enter client name", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      const body: Record<string, any> = {
        type: form.type, clientName: form.clientName || null,
        contactId: form.contactId || null,
        issueDate: form.issueDate, dueDate: form.dueDate || null,
        subtotal, vatAmount, total, vatRate: form.vatRate,
        notes: form.notes || null,
        items: form.items.filter(i => i.descAr || i.descEn),
      };
      if (editingId) {
        const res = await fetch(`/api/invoices/${editingId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (!res.ok) throw new Error();
        toast({ title: isRtl ? "تم تحديث الفاتورة" : "Invoice updated" });
      } else {
        body.status = "draft";
        body.createdBy = getRequestScope().userId || null;
        const res = await fetch("/api/invoices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (!res.ok) throw new Error();
        toast({ title: isRtl ? "تم إنشاء الفاتورة" : "Invoice created" });
      }
      setShowCreate(false);
      resetForm();
      fetchAll();
    } catch { toast({ title: isRtl ? "خطأ" : "Error", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const updateStatus = async (inv: Invoice, status: string) => {
    try {
      await fetch(`/api/invoices/${inv.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      toast({ title: isRtl ? "تم تحديث الحالة" : "Status updated" });
      fetchAll();
    } catch { toast({ title: isRtl ? "خطأ" : "Error", variant: "destructive" }); }
  };

  const handleDelete = async (id: number) => {
    try {
      await fetch(`/api/invoices/${id}`, { method: "DELETE" });
      toast({ title: isRtl ? "تم الحذف" : "Deleted" });
      fetchAll();
    } catch { toast({ title: isRtl ? "خطأ" : "Error", variant: "destructive" }); }
  };

  const buildInvoiceHtml = async (inv: Invoice) => {
    const sysCfg = getSystemSettings();
    const pd = sysCfg.printDesign;
    const about = getAboutData();
    const coNameAr = about.companyNameAr || "شركة سكابكس";
    const coNameEn = about.companyNameEn || "Scapex Company";
    const coVat = about.vatNumber || "310000000000003";
    let coLogoUrl = pd.headerLogo || "";
    if (!coLogoUrl) {
      try {
        const raw = dbGetItem("scapex_companies");
        if (raw) {
          const cos = JSON.parse(raw) as Array<{ id: string; logoUrl?: string }>;
          const aid = dbGetItem("scapex_active_company");
          const co = aid ? cos.find(c => c.id === aid) : cos[0];
          coLogoUrl = co?.logoUrl || "";
        }
      } catch {}
    }
    if (!coLogoUrl) coLogoUrl = sysCfg.brandLogo || "";
    const logoHtml = !pd.showLogo
      ? ""
      : coLogoUrl
      ? `<img src="${esc(coLogoUrl)}" style="width:56px;height:56px;object-fit:contain;border-radius:8px" />`
      : `<div style="font-size:22px;font-weight:900;color:${pd.accentColor}">${esc(coNameEn.charAt(0).toUpperCase() || "S")}</div>`;
    const headerNote = esc(isRtl ? pd.headerNoteAr : pd.headerNoteEn);
    const customFooter = esc(isRtl ? sysCfg.invoiceFooterAr : sysCfg.invoiceFooterEn);
    const contactBits = [about.address, about.phone1, about.email1, about.website].filter(Boolean).map(v => esc(String(v).split("\n").join(" — "))).join(" · ");
    const printFont = getPrintFontCss();
    const qrBlock = await zatcaQrBlockHtml({
      sellerName: coNameAr,
      vatNumber: coVat,
      timestamp: `${inv.issueDate}T00:00:00Z`,
      total: parseFloat(inv.total || "0").toFixed(2),
      vat: parseFloat(inv.vatAmount || "0").toFixed(2),
      labelAr: isRtl,
    });
    const wmark = watermarkHtml(pd, sysCfg);
    const preparedBy = preparedByHtml(inv.createdBy, isRtl ? "ar" : "en");
    const html = `<!DOCTYPE html><html dir="${isRtl ? "rtl" : "ltr"}"><head><meta charset="UTF-8"><title>${esc(inv.invoiceNumber)}</title>
    <style>${printFont.css}
    body{font-family:${printFont.family};font-size:12px;margin:0;padding:20px;color:#1a1a1a;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .header{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid ${pd.accentColor};padding-bottom:15px;margin-bottom:20px;background:${pd.headerBgColor};${pd.headerBgImage ? `background-image:url('${pd.headerBgImage}');background-size:cover;background-position:center;` : ""}${pd.headerBgColor !== "#ffffff" || pd.headerBgImage ? "padding:14px 16px;border-radius:8px;" : ""}color:${pd.headerTextColor}}
    .inv-title{font-size:16px;font-weight:700;color:${pd.accentColor};text-align:center;margin:10px 0}
    .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px;background:#f8fafc;padding:12px;border-radius:8px}
    .info-label{color:#64748b;font-size:10px}.info-value{font-weight:600;font-size:12px}
    table{width:100%;border-collapse:collapse;margin:15px 0}
    th{background:${pd.accentColor};color:white;padding:8px;text-align:${isRtl ? "right" : "left"};font-size:11px}
    td{padding:7px 8px;border-bottom:1px solid #e2e8f0;font-size:11px}tr:nth-child(even){background:#f8fafc}
    .totals{margin-top:15px;display:flex;flex-direction:column;align-items:${isRtl ? "flex-start" : "flex-end"};gap:5px}
    .total-row{display:flex;gap:20px;font-size:12px}.total-row.grand{font-weight:700;font-size:14px;color:${pd.accentColor};border-top:2px solid ${pd.accentColor};padding-top:8px}
    .badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600}
    .badge-draft{background:#f1f5f9;color:#475569}.badge-paid{background:#dcfce7;color:#166534}.badge-sent{background:#dbeafe;color:#1d4ed8}.badge-partial{background:#fef9c3;color:#854d0e}
    .footer{margin-top:30px;border-top:2px solid ${pd.accentColor};padding:10px 14px;text-align:center;color:${pd.footerTextColor};font-size:10px;background:${pd.footerBgColor};${pd.footerBgImage ? `background-image:url('${pd.footerBgImage}');background-size:cover;background-position:center;` : ""}border-radius:0 0 6px 6px}</style>
    </head><body>
    ${wmark}
    <div style="position:relative;z-index:1;">
    <div class="header">
      <div style="display:flex;align-items:center;gap:12px">
        ${logoHtml}
        <div>
          <div style="display:inline-block;text-align:center">
            <div style="font-size:15px;font-weight:700;color:${pd.headerTextColor}">${esc(isRtl ? coNameAr : coNameEn)}</div>
            <div style="font-size:10px;color:${pd.headerTextColor};opacity:0.75">${esc(isRtl ? coNameEn : coNameAr)}</div>
          </div>
          ${headerNote ? `<div style="font-size:10px;color:${pd.headerTextColor};opacity:0.85;margin-top:2px;white-space:pre-line">${headerNote}</div>` : ""}
        </div>
      </div>
      <div><span class="badge badge-${inv.status}">${inv.status.toUpperCase()}</span></div>
    </div>
    <div class="inv-title">${isRtl ? "فاتورة ضريبية" : "Tax Invoice"}</div>
    <div class="info-grid">
      <div><div class="info-label">${isRtl ? "رقم الفاتورة" : "Invoice No."}</div><div class="info-value">${esc(inv.invoiceNumber)}</div></div>
      <div><div class="info-label">${isRtl ? "التاريخ" : "Date"}</div><div class="info-value">${inv.issueDate}</div></div>
      <div><div class="info-label">${isRtl ? "العميل" : "Client"}</div><div class="info-value">${esc(inv.clientName || "—")}</div></div>
      <div><div class="info-label">${isRtl ? "تاريخ الاستحقاق" : "Due Date"}</div><div class="info-value">${inv.dueDate || "—"}</div></div>
    </div>
    <table><thead><tr>
      <th>${isRtl ? "البيان" : "Description"}</th>
      <th>${isRtl ? "الكمية" : "Qty"}</th>
      <th>${isRtl ? "الوحدة" : "Unit"}</th>
      <th>${isRtl ? "سعر الوحدة" : "Unit Price"}</th>
      <th>${isRtl ? "الإجمالي" : "Total"}</th>
    </tr></thead><tbody>
    ${(inv.items || []).map(i => `<tr><td>${esc(isRtl ? i.descAr : i.descEn)}</td><td>${i.qty}</td><td>${esc(i.unit)}</td><td>${parseFloat(String(i.unitPrice)).toLocaleString()}</td><td>${parseFloat(String(i.total)).toLocaleString()}</td></tr>`).join("")}
    </tbody></table>
    <div class="totals">
      <div class="total-row"><span>${isRtl ? "المجموع قبل الضريبة:" : "Subtotal:"}</span><span>${parseFloat(inv.subtotal).toLocaleString()} ${inv.currency}</span></div>
      <div class="total-row"><span>${isRtl ? "ضريبة القيمة المضافة (15%):" : "VAT (15%):"}</span><span>${parseFloat(inv.vatAmount).toLocaleString()} ${inv.currency}</span></div>
      <div class="total-row grand"><span>${isRtl ? "الإجمالي الكلي:" : "Grand Total:"}</span><span>${parseFloat(inv.total).toLocaleString()} ${inv.currency}</span></div>
      ${parseFloat(inv.paidAmount) > 0 ? `<div class="total-row"><span style="color:#16a34a">${isRtl ? "المدفوع:" : "Paid:"}</span><span style="color:#16a34a">${parseFloat(inv.paidAmount).toLocaleString()} ${inv.currency}</span></div>` : ""}
    </div>
    ${inv.notes ? `<div style="margin-top:15px;padding:10px;background:#f8fafc;border-radius:6px;font-size:11px;color:#475569">${esc(inv.notes)}</div>` : ""}
    ${qrBlock ? `<div style="margin-top:18px;display:flex;justify-content:${isRtl ? "flex-end" : "flex-start"};">${qrBlock}</div>` : ""}
    <div class="footer">
      <div>${esc(coNameAr)} · ${esc(coNameEn)} · ${isRtl ? "الرقم الضريبي" : "VAT No"}: ${esc(coVat)}</div>
      ${contactBits ? `<div style="margin-top:4px">${contactBits}</div>` : ""}
      ${customFooter ? `<div style="margin-top:6px;font-style:italic;opacity:0.9">${customFooter}</div>` : ""}
      ${preparedBy}
    </div>
    </div>
    </body></html>`;
    return html;
  };

  const withItems = async (inv: Invoice): Promise<Invoice> => {
    if (inv.items && inv.items.length > 0) return inv;
    try {
      const r = await fetch(`/api/invoices/${inv.id}`);
      if (r.ok) return await r.json();
    } catch {}
    return inv;
  };

  const printInvoice = (inv: Invoice) => {
    const w = window.open("", "_blank");
    if (!w) return;
    withItems(inv).then(buildInvoiceHtml).then((html) => {
      w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500);
    });
  };

  const filtered = invoices.filter(inv => {
    const q = search.toLowerCase();
    return (statusFilter === "all" || inv.status === statusFilter) &&
      (typeFilter === "all" || inv.type === typeFilter) &&
      (!q || (inv.invoiceNumber || "").toLowerCase().includes(q) || (inv.clientName || "").toLowerCase().includes(q));
  });

  const stats = {
    total: invoices.length,
    pending: invoices.filter(i => ["draft","sent"].includes(i.status)).length,
    paid: invoices.filter(i => i.status === "paid").length,
    totalValue: invoices.reduce((s, i) => s + parseFloat(i.total || "0"), 0),
  };

  const statusLabel = (s: string) => {
    const map: Record<string,string> = { draft: isRtl ? "مسودة" : "Draft", sent: isRtl ? "مرسلة" : "Sent", partial: isRtl ? "مدفوعة جزئياً" : "Partial", paid: isRtl ? "مدفوعة" : "Paid", void: isRtl ? "ملغاة" : "Void" };
    return map[s] || s;
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: isRtl ? "إجمالي الفواتير" : "Total Invoices", value: stats.total, color: "text-blue-500" },
          { label: isRtl ? "فواتير معلقة" : "Pending", value: stats.pending, color: "text-amber-500" },
          { label: isRtl ? "مدفوعة" : "Paid", value: stats.paid, color: "text-emerald-500" },
          { label: isRtl ? "إجمالي القيمة" : "Total Value", value: SAR(stats.totalValue), color: "text-primary" },
        ].map((s, i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={cn("text-lg font-bold mt-1", s.color)}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground", isRtl ? "right-3" : "left-3")} />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={isRtl ? "بحث برقم الفاتورة أو العميل..." : "Search by invoice no. or client..."} className={cn("h-9 bg-secondary/30", isRtl ? "pr-9" : "pl-9")} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-9 bg-secondary/30"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isRtl ? "كل الحالات" : "All Status"}</SelectItem>
            <SelectItem value="draft">{isRtl ? "مسودة" : "Draft"}</SelectItem>
            <SelectItem value="sent">{isRtl ? "مرسلة" : "Sent"}</SelectItem>
            <SelectItem value="partial">{isRtl ? "جزئية" : "Partial"}</SelectItem>
            <SelectItem value="paid">{isRtl ? "مدفوعة" : "Paid"}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36 h-9 bg-secondary/30"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isRtl ? "كل الأنواع" : "All Types"}</SelectItem>
            <SelectItem value="sales">{isRtl ? "فاتورة مبيعات" : "Sales"}</SelectItem>
            <SelectItem value="purchase">{isRtl ? "فاتورة مشتريات" : "Purchase"}</SelectItem>
          </SelectContent>
        </Select>
        <ExportMenu
          title={isRtl ? "قائمة الفواتير" : "Invoices List"}
          filename="invoices"
          data={filtered}
          columns={[
            { key: "no", header: isRtl ? "رقم الفاتورة" : "Invoice No.", accessor: (i: any) => i.invoiceNumber },
            { key: "client", header: isRtl ? "العميل" : "Client", accessor: (i: any) => i.clientName || "—" },
            { key: "type", header: isRtl ? "النوع" : "Type", accessor: (i: any) => i.type },
            { key: "date", header: isRtl ? "التاريخ" : "Date", accessor: (i: any) => i.issueDate || i.invoiceDate || i.date || "" },
            { key: "subtotal", header: isRtl ? "قبل الضريبة" : "Subtotal", accessor: (i: any) => i.subtotal },
            { key: "vat", header: isRtl ? "ض.ق.م" : "VAT", accessor: (i: any) => i.vatAmount },
            { key: "total", header: isRtl ? "الإجمالي" : "Total", accessor: (i: any) => `${i.total} ${i.currency || ""}` },
            { key: "paid", header: isRtl ? "المدفوع" : "Paid", accessor: (i: any) => i.paidAmount },
            { key: "status", header: isRtl ? "الحالة" : "Status", accessor: (i: any) => statusLabel(i.status) },
          ]}
        />
        <Button size="sm" className="gap-1.5" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" />{isRtl ? "فاتورة جديدة" : "New Invoice"}
        </Button>
      </div>

      {/* Table */}
      <Card className="border-border/50 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-secondary/40">
                <TableRow>
                  <TableHead>{isRtl ? "رقم الفاتورة" : "Invoice No."}</TableHead>
                  <TableHead>{isRtl ? "العميل" : "Client"}</TableHead>
                  <TableHead>{isRtl ? "التاريخ" : "Date"}</TableHead>
                  <TableHead>{isRtl ? "الإجمالي" : "Total"}</TableHead>
                  <TableHead>{isRtl ? "ضريبة القيمة المضافة" : "VAT"}</TableHead>
                  <TableHead>{isRtl ? "المدفوع" : "Paid"}</TableHead>
                  <TableHead>{isRtl ? "الحالة" : "Status"}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground"><FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />{isRtl ? "لا توجد فواتير" : "No invoices"}</TableCell></TableRow>
                ) : filtered.map(inv => (
                  <TableRow key={inv.id} className="hover:bg-muted/30" data-testid={`row-invoice-${inv.id}`}>
                    <TableCell className="font-mono text-xs font-semibold text-primary">{inv.invoiceNumber}</TableCell>
                    <TableCell className="font-medium">{inv.clientName || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{inv.issueDate}</TableCell>
                    <TableCell className="font-semibold">{SAR(inv.total)}</TableCell>
                    <TableCell className="text-amber-600">{SAR(inv.vatAmount)}</TableCell>
                    <TableCell className={parseFloat(inv.paidAmount) > 0 ? "text-emerald-600 font-medium" : "text-muted-foreground"}>{SAR(inv.paidAmount)}</TableCell>
                    <TableCell>
                      <Badge className={cn("text-xs font-normal border-0", STATUS_COLORS[inv.status] || "bg-slate-100 text-slate-700")}>
                        {statusLabel(inv.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className={cn("flex items-center gap-1", isRtl ? "justify-start" : "justify-end")}>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setShowDetail(inv); }} title={isRtl ? "عرض" : "View"}>
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-violet-600" onClick={() => openEdit(inv)} title={isRtl ? "تعديل" : "Edit"} data-testid={`button-edit-invoice-${inv.id}`}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600" onClick={() => printInvoice(inv)} title={isRtl ? "طباعة" : "Print"}>
                          <Printer className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-cyan-600" onClick={() => setSendInvoice(inv)} title={isRtl ? "إرسال نسخة للعميل" : "Send copy to client"} data-testid={`button-send-invoice-${inv.id}`}>
                          <Mail className="w-3.5 h-3.5" />
                        </Button>
                        {inv.status === "draft" && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600" onClick={() => updateStatus(inv, "sent")} title={isRtl ? "إرسال" : "Send"}>
                            <Send className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {inv.status === "sent" && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600" onClick={() => updateStatus(inv, "paid")} title={isRtl ? "تحديد كمدفوع" : "Mark paid"}>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDelete(inv.id)} title={isRtl ? "حذف" : "Delete"}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Create Invoice Dialog */}
      <Dialog open={showCreate} onOpenChange={(o) => { setShowCreate(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir={dir}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              {editingId
                ? (isRtl ? "تعديل الفاتورة" : "Edit Invoice")
                : (isRtl ? "إنشاء فاتورة ضريبية جديدة" : "Create New Tax Invoice")}
            </DialogTitle>
            <DialogDescription>{isRtl ? "تشمل ضريبة القيمة المضافة 15% وفق متطلبات هيئة الزكاة والضريبة" : "Includes 15% VAT per ZATCA requirements"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">{isRtl ? "نوع الفاتورة" : "Invoice Type"}</Label>
                <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                  <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales">{isRtl ? "فاتورة مبيعات" : "Sales Invoice"}</SelectItem>
                    <SelectItem value="purchase">{isRtl ? "فاتورة مشتريات" : "Purchase Invoice"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">{isRtl ? "العميل" : "Client"}</Label>
                <Select value={form.contactId} onValueChange={v => {
                  const ct = contacts.find(c => String(c.id) === v);
                  setForm(p => ({ ...p, contactId: v, clientName: ct ? (isRtl ? ct.nameAr || "" : ct.nameEn || "") : p.clientName }));
                }}>
                  <SelectTrigger className="mt-1 h-9"><SelectValue placeholder={isRtl ? "اختر من جهات الاتصال..." : "Pick from contacts..."} /></SelectTrigger>
                  <SelectContent>
                    {contacts.map(c => <SelectItem key={c.id} value={String(c.id)}>{isRtl ? c.nameAr : c.nameEn}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">{isRtl ? "اسم العميل (يدوي)" : "Client Name (manual)"}</Label>
                <Input className="mt-1 h-9 text-sm" value={form.clientName} onChange={e => setForm(p => ({ ...p, clientName: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">{isRtl ? "نسبة ضريبة القيمة المضافة (%)" : "VAT Rate (%)"}</Label>
                <Input type="number" className="mt-1 h-9 text-sm" value={form.vatRate} onChange={e => setForm(p => ({ ...p, vatRate: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div>
                <Label className="text-xs">{isRtl ? "تاريخ الفاتورة" : "Issue Date"}</Label>
                <Input type="date" className="mt-1 h-9 text-sm" value={form.issueDate} onChange={e => setForm(p => ({ ...p, issueDate: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">{isRtl ? "تاريخ الاستحقاق" : "Due Date"}</Label>
                <Input type="date" className="mt-1 h-9 text-sm" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} />
              </div>
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-semibold">{isRtl ? "بنود الفاتورة" : "Invoice Items"}</Label>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                  onClick={() => setForm(p => ({ ...p, items: [...p.items, { descAr: "", descEn: "", qty: 1, unit: "عدد", unitPrice: 0, total: 0 }] }))}>
                  <Plus className="w-3 h-3" />{isRtl ? "إضافة بند" : "Add Item"}
                </Button>
              </div>
              <div className="rounded-lg border border-border/50 overflow-hidden">
                <Table>
                  <TableHeader className="bg-secondary/40">
                    <TableRow>
                      <TableHead className="text-xs">{isRtl ? "البيان (ع)" : "Desc (AR)"}</TableHead>
                      <TableHead className="text-xs">{isRtl ? "البيان (ع)" : "Desc (EN)"}</TableHead>
                      <TableHead className="text-xs w-16">{isRtl ? "الكمية" : "Qty"}</TableHead>
                      <TableHead className="text-xs w-20">{isRtl ? "الوحدة" : "Unit"}</TableHead>
                      <TableHead className="text-xs w-28">{isRtl ? "سعر الوحدة" : "Unit Price"}</TableHead>
                      <TableHead className="text-xs w-28">{isRtl ? "الإجمالي" : "Total"}</TableHead>
                      <TableHead className="w-8"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {form.items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="p-1"><Input className="h-7 text-xs" value={item.descAr} onChange={e => updateItem(idx, "descAr", e.target.value)} /></TableCell>
                        <TableCell className="p-1"><Input className="h-7 text-xs" value={item.descEn} onChange={e => updateItem(idx, "descEn", e.target.value)} /></TableCell>
                        <TableCell className="p-1"><Input type="number" className="h-7 text-xs" value={item.qty} onChange={e => updateItem(idx, "qty", parseFloat(e.target.value) || 0)} /></TableCell>
                        <TableCell className="p-1"><Input className="h-7 text-xs" value={item.unit} onChange={e => updateItem(idx, "unit", e.target.value)} /></TableCell>
                        <TableCell className="p-1"><Input type="number" className="h-7 text-xs" value={item.unitPrice} onChange={e => updateItem(idx, "unitPrice", parseFloat(e.target.value) || 0)} /></TableCell>
                        <TableCell className="p-1 text-xs font-medium">{item.total.toLocaleString()}</TableCell>
                        <TableCell className="p-1">
                          {form.items.length > 1 && <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => setForm(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }))}><X className="w-3 h-3" /></Button>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Totals */}
            <div className={cn("space-y-1.5 text-sm", isRtl ? "text-right" : "text-right")}>
              <div className="flex justify-between"><span className="text-muted-foreground">{isRtl ? "المجموع قبل الضريبة:" : "Subtotal:"}</span><span className="font-medium">{SAR(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-amber-600">{isRtl ? `ضريبة القيمة المضافة (${form.vatRate}%):` : `VAT (${form.vatRate}%):`}</span><span className="font-medium text-amber-600">{SAR(vatAmount)}</span></div>
              <div className="flex justify-between border-t border-border/50 pt-2"><span className="font-bold text-base">{isRtl ? "الإجمالي الكلي:" : "Grand Total:"}</span><span className="font-bold text-base text-primary">{SAR(total)}</span></div>
            </div>

            <div>
              <Label className="text-xs">{isRtl ? "ملاحظات" : "Notes"}</Label>
              <Textarea className="mt-1 text-sm resize-none" rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); resetForm(); }}>{isRtl ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-1.5" data-testid="button-save-invoice">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              {editingId
                ? (isRtl ? "حفظ التعديلات" : "Save Changes")
                : (isRtl ? "إنشاء الفاتورة" : "Create Invoice")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail/Print Dialog */}
      {showDetail && (
        <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
          <DialogContent className="max-w-lg" dir={dir}>
            <DialogHeader>
              <DialogTitle>{showDetail.invoiceNumber}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground text-xs">{isRtl ? "العميل:" : "Client:"}</span><p className="font-medium">{showDetail.clientName || "—"}</p></div>
                <div><span className="text-muted-foreground text-xs">{isRtl ? "الحالة:" : "Status:"}</span><p><Badge className={cn("text-xs border-0", STATUS_COLORS[showDetail.status])}>{statusLabel(showDetail.status)}</Badge></p></div>
                <div><span className="text-muted-foreground text-xs">{isRtl ? "التاريخ:" : "Date:"}</span><p className="font-medium">{showDetail.issueDate}</p></div>
                <div><span className="text-muted-foreground text-xs">{isRtl ? "الإجمالي:" : "Total:"}</span><p className="font-semibold text-primary">{SAR(showDetail.total)}</p></div>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-3 flex justify-between">
                <span>{isRtl ? "ضريبة القيمة المضافة:" : "VAT:"}</span>
                <span className="font-semibold text-amber-600">{SAR(showDetail.vatAmount)}</span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDetail(null)}>{isRtl ? "إغلاق" : "Close"}</Button>
              <Button onClick={() => { printInvoice(showDetail); setShowDetail(null); }} className="gap-1.5">
                <Printer className="w-4 h-4" />{isRtl ? "طباعة الفاتورة" : "Print Invoice"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {sendInvoice && (
        <SendToClientDialog
          open={!!sendInvoice}
          onOpenChange={(o) => { if (!o) setSendInvoice(null); }}
          titleAr={`فاتورة ${sendInvoice.invoiceNumber}`}
          titleEn={`Invoice ${sendInvoice.invoiceNumber}`}
          category="invoice"
          buildHtml={async () => buildInvoiceHtml(await withItems(sendInvoice))}
          contactId={sendInvoice.contactId}
          allowPickContact={!sendInvoice.contactId}
        />
      )}
    </div>
  );
}
