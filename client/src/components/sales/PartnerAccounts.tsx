import { useState, useEffect, useCallback, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useActiveRole } from "@/contexts/ActiveRoleContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Pencil, Trash2, Loader2, Printer, RefreshCw,
  ShieldAlert, TrendingUp, Wallet, CheckCircle2, Clock, Search, Handshake,
} from "lucide-react";
import { getAboutData } from "@/lib/companySettings";

// ─── Types ────────────────────────────────────────────────────────────────────
interface PartnerAccount {
  id: number;
  companyId: number;
  contractNumber: string;
  clientName: string;
  contractType: string;
  contractValue: string;
  companySharePct: string;
  receivedAmount: string;
  receivedDate: string | null;
  paymentMethod: string;
  notes: string | null;
  status: string;
  contractId: number | null;
  createdAt: string;
}

const CONTRACT_TYPES = [
  "عقد صيانة", "توريد وتركيب", "عقد توريد", "عقد تركيب",
  "عقد مقاولة", "عقد استشارات", "عقد خدمات", "أخرى",
];

const PAYMENT_METHODS = [
  { value: "cash",     labelAr: "كاش",     labelEn: "Cash" },
  { value: "transfer", labelAr: "تحويل",   labelEn: "Transfer" },
  { value: "check",    labelAr: "شيك",     labelEn: "Check" },
];

const TYPE_COLORS: Record<string, string> = {
  "عقد صيانة":    "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300",
  "توريد وتركيب": "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300",
  "عقد توريد":    "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300",
  "عقد تركيب":    "bg-violet-100 dark:bg-violet-900/40 text-violet-800 dark:text-violet-300",
  "عقد مقاولة":   "bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300",
  "عقد استشارات": "bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-300",
};

const fmt = (v: string | number) => {
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (isNaN(n)) return "0";
  return n.toLocaleString("ar-SA", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};
const SAR = (v: string | number) => `${fmt(v)} ر.س`;

const calcCompanyAmount = (value: string, pct: string) =>
  parseFloat(value || "0") * parseFloat(pct || "0") / 100;
const calcPartnerAmount = (value: string, pct: string) =>
  parseFloat(value || "0") * (100 - parseFloat(pct || "0")) / 100;

// ─── Print ────────────────────────────────────────────────────────────────────
function printPartnerAccounts(rows: PartnerAccount[], isRtl: boolean) {
  const about = getAboutData();
  const coName = isRtl ? (about.companyNameAr || "شركة سكيبكس") : (about.companyNameEn || "Scapex");
  const date = new Date().toLocaleDateString(isRtl ? "ar-SA" : "en-GB", { year: "numeric", month: "long", day: "numeric" });
  const totals = {
    value: rows.reduce((s, r) => s + parseFloat(r.contractValue || "0"), 0),
    company: rows.reduce((s, r) => s + calcCompanyAmount(r.contractValue, r.companySharePct), 0),
    partner: rows.reduce((s, r) => s + calcPartnerAmount(r.contractValue, r.companySharePct), 0),
    received: rows.reduce((s, r) => s + parseFloat(r.receivedAmount || "0"), 0),
  };
  const pm = (v: string) => PAYMENT_METHODS.find(m => m.value === v)?.[isRtl ? "labelAr" : "labelEn"] ?? v;
  const rows_html = rows.map((r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${r.contractNumber}</td>
      <td>${r.clientName}</td>
      <td><span class="badge" style="background:${r.contractType === "عقد صيانة" ? "#d1fae5" : r.contractType === "توريد وتركيب" ? "#fef3c7" : "#dbeafe"}">${r.contractType}</span></td>
      <td>${fmt(r.contractValue)}</td>
      <td class="pct">${parseFloat(r.companySharePct || "0").toFixed(0)}%</td>
      <td class="money">${fmt(calcCompanyAmount(r.contractValue, r.companySharePct))}</td>
      <td class="money partner">${fmt(calcPartnerAmount(r.contractValue, r.companySharePct))}</td>
      <td class="money received">${fmt(r.receivedAmount)}</td>
      <td>${r.notes || ""}</td>
      <td>${pm(r.paymentMethod)}</td>
    </tr>
  `).join("");
  const html = `<!DOCTYPE html><html dir="rtl" lang="ar">
<head><meta charset="utf-8"><title>حسابات الشركاء</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600;700&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Noto Sans Arabic',Arial,sans-serif; font-size:12px; color:#111; }
  .page { max-width:1100px; margin:0 auto; padding:24px; }
  h1 { text-align:center; font-size:16px; font-weight:700; margin-bottom:4px; }
  .meta { text-align:center; font-size:11px; color:#555; margin-bottom:16px; }
  table { width:100%; border-collapse:collapse; margin-bottom:16px; }
  th { background:#1e40af; color:#fff; padding:6px 8px; text-align:center; font-size:11px; }
  td { border:1px solid #d1d5db; padding:5px 8px; text-align:center; }
  tr:nth-child(even) { background:#f9fafb; }
  .badge { padding:2px 8px; border-radius:4px; font-size:11px; }
  .pct { color:#1e40af; font-weight:700; }
  .money { font-family:monospace; }
  .partner { color:#7c3aed; }
  .received { color:#059669; font-weight:600; }
  .totals { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-top:12px; }
  .kpi { background:#f0f9ff; border:1px solid #bae6fd; border-radius:8px; padding:10px; text-align:center; }
  .kpi label { font-size:10px; color:#64748b; display:block; }
  .kpi span { font-size:14px; font-weight:700; color:#1e40af; }
  @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
</style></head>
<body><div class="page">
  <h1>حسابات الشركاء</h1>
  <p class="meta">${coName} — ${date}</p>
  <table>
    <thead><tr>
      <th>م</th><th>رقم العقد</th><th>البيان</th><th>نوع العقد</th>
      <th>قيمة العقد</th><th>نسبة الشركة%</th><th>مبلغ الشركة</th>
      <th>مبلغ الشريك</th><th>المستلم</th><th>ملاحظات</th><th>الاستلام</th>
    </tr></thead>
    <tbody>${rows_html}</tbody>
    <tfoot><tr>
      <td colspan="4" style="font-weight:700;text-align:right;padding-right:12px">الإجمالي</td>
      <td style="font-weight:700">${fmt(totals.value)}</td>
      <td>—</td>
      <td style="font-weight:700;color:#1e40af">${fmt(totals.company)}</td>
      <td style="font-weight:700;color:#7c3aed">${fmt(totals.partner)}</td>
      <td style="font-weight:700;color:#059669">${fmt(totals.received)}</td>
      <td colspan="2"></td>
    </tr></tfoot>
  </table>
  <div class="totals">
    <div class="kpi"><label>إجمالي قيمة العقود</label><span>${SAR(totals.value)}</span></div>
    <div class="kpi"><label>إجمالي الشركة</label><span>${SAR(totals.company)}</span></div>
    <div class="kpi"><label>إجمالي الشريك</label><span>${SAR(totals.partner)}</span></div>
    <div class="kpi" style="background:#f0fdf4;border-color:#bbf7d0"><label>إجمالي المستلم</label><span style="color:#059669">${SAR(totals.received)}</span></div>
  </div>
</div><script>window.onload=()=>window.print();</script></body></html>`;
  const w = window.open("", "_blank");
  if (w) { w.document.write(html); w.document.close(); }
}

// ─── Entry Form Dialog ─────────────────────────────────────────────────────────
const EMPTY_FORM = {
  contractNumber: "", clientName: "", contractType: "عقد صيانة",
  contractValue: "", companySharePct: "30", receivedAmount: "",
  receivedDate: "", paymentMethod: "cash", notes: "", status: "pending",
};

function EntryDialog({ open, onClose, onSave, editing, isRtl }: {
  open: boolean; onClose: () => void;
  onSave: (data: typeof EMPTY_FORM) => Promise<void>;
  editing: PartnerAccount | null; isRtl: boolean;
}) {
  const lbl = (ar: string, en: string) => isRtl ? ar : en;
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) {
      setForm({
        contractNumber: editing.contractNumber,
        clientName: editing.clientName,
        contractType: editing.contractType,
        contractValue: editing.contractValue,
        companySharePct: editing.companySharePct,
        receivedAmount: editing.receivedAmount || "",
        receivedDate: editing.receivedDate || "",
        paymentMethod: editing.paymentMethod || "cash",
        notes: editing.notes || "",
        status: editing.status,
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [editing, open]);

  const f = (k: keyof typeof EMPTY_FORM, v: string) => setForm(p => ({ ...p, [k]: v }));

  // Calculated preview
  const companyAmt = calcCompanyAmount(form.contractValue, form.companySharePct);
  const partnerAmt = calcPartnerAmount(form.contractValue, form.companySharePct);

  const handleSave = async () => {
    if (!form.contractNumber || !form.clientName || !form.contractValue) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            {editing ? lbl("تعديل السجل", "Edit Record") : lbl("إضافة سجل جديد", "Add New Record")}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">{lbl("رقم العقد", "Contract No.")}</Label>
            <Input className="mt-1 h-9" value={form.contractNumber}
              onChange={e => f("contractNumber", e.target.value)} placeholder="126" />
          </div>
          <div>
            <Label className="text-xs">{lbl("نوع العقد", "Contract Type")}</Label>
            <Select value={form.contractType} onValueChange={v => f("contractType", v)}>
              <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CONTRACT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label className="text-xs">{lbl("البيان (اسم العميل / الجهة)", "Description (Client / Entity)")}</Label>
            <Input className="mt-1 h-9" value={form.clientName}
              onChange={e => f("clientName", e.target.value)} placeholder={lbl("مركز رواد القلم", "Al Rowad Center")} />
          </div>
          <div>
            <Label className="text-xs">{lbl("قيمة العقد (ر.س)", "Contract Value (SAR)")}</Label>
            <Input className="mt-1 h-9" type="number" min="0" step="0.01"
              value={form.contractValue} onChange={e => f("contractValue", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">{lbl("نسبة الشركة %", "Company Share %")}</Label>
            <div className="flex gap-2 mt-1">
              <Input className="h-9 flex-1" type="number" min="0" max="100" step="0.5"
                value={form.companySharePct} onChange={e => f("companySharePct", e.target.value)} />
              <div className="h-9 px-3 rounded-md border bg-secondary/50 flex items-center text-xs text-muted-foreground whitespace-nowrap">
                {lbl("الشريك", "Partner")}: {(100 - parseFloat(form.companySharePct || "0")).toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Live preview */}
          {form.contractValue && (
            <div className="col-span-2 grid grid-cols-2 gap-3">
              <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 text-center border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-blue-600 dark:text-blue-400">{lbl("مبلغ الشركة", "Company Amount")}</p>
                <p className="text-base font-bold text-blue-700 dark:text-blue-300">{SAR(companyAmt)}</p>
              </div>
              <div className="bg-violet-50 dark:bg-violet-950/20 rounded-lg p-3 text-center border border-violet-200 dark:border-violet-800">
                <p className="text-xs text-violet-600 dark:text-violet-400">{lbl("مبلغ الشريك", "Partner Amount")}</p>
                <p className="text-base font-bold text-violet-700 dark:text-violet-300">{SAR(partnerAmt)}</p>
              </div>
            </div>
          )}

          <div>
            <Label className="text-xs">{lbl("المبلغ المستلم (ر.س)", "Received Amount (SAR)")}</Label>
            <Input className="mt-1 h-9" type="number" min="0" step="0.01"
              value={form.receivedAmount} onChange={e => f("receivedAmount", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">{lbl("تاريخ الاستلام", "Receipt Date")}</Label>
            <Input className="mt-1 h-9" type="date"
              value={form.receivedDate} onChange={e => f("receivedDate", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">{lbl("طريقة الاستلام", "Payment Method")}</Label>
            <Select value={form.paymentMethod} onValueChange={v => f("paymentMethod", v)}>
              <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map(m => (
                  <SelectItem key={m.value} value={m.value}>{isRtl ? m.labelAr : m.labelEn}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">{lbl("الحالة", "Status")}</Label>
            <Select value={form.status} onValueChange={v => f("status", v)}>
              <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">{lbl("معلق", "Pending")}</SelectItem>
                <SelectItem value="partial">{lbl("مستلم جزئياً", "Partial")}</SelectItem>
                <SelectItem value="received">{lbl("مستلم", "Received")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label className="text-xs">{lbl("ملاحظات", "Notes")}</Label>
            <Input className="mt-1 h-9" value={form.notes}
              onChange={e => f("notes", e.target.value)} placeholder={lbl("مستلم 500 / مستلم", "Received 500 / Received")} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>{lbl("إلغاء", "Cancel")}</Button>
          <Button size="sm" onClick={handleSave}
            disabled={saving || !form.contractNumber || !form.clientName || !form.contractValue}>
            {saving && <Loader2 className="w-3.5 h-3.5 me-1.5 animate-spin" />}
            {editing ? lbl("حفظ التعديلات", "Save Changes") : lbl("إضافة السجل", "Add Record")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Access Denied ─────────────────────────────────────────────────────────────
function AccessDenied({ isRtl }: { isRtl: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
      <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/20 flex items-center justify-center">
        <ShieldAlert className="w-8 h-8 text-red-500" />
      </div>
      <div className="text-center">
        <p className="font-semibold text-foreground mb-1">
          {isRtl ? "هذا القسم للمدير فقط" : "Manager Access Only"}
        </p>
        <p className="text-sm">
          {isRtl ? "يمكن للمدير تخويل المستخدمين الآخرين من خلال صلاحيات المستخدمين" : "Manager can authorize other users via User Management"}
        </p>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function PartnerAccounts() {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";
  const { currentUser } = useActiveRole();
  const { toast } = useToast();
  const lbl = (ar: string, en: string) => isRtl ? ar : en;

  const isAdmin = currentUser?.role === "admin" || (currentUser?.roles ?? []).includes("admin");
  const isManager = currentUser?.role === "manager" || (currentUser?.roles ?? []).includes("manager");
  const hasAccess = isAdmin || isManager;

  const [rows, setRows] = useState<PartnerAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<PartnerAccount | null>(null);

  const fetchRows = useCallback(async () => {
    if (!hasAccess) { setLoading(false); return; }
    try {
      setLoading(true);
      const res = await fetch("/api/partner-accounts");
      if (res.ok) setRows(await res.json());
    } catch { toast({ title: lbl("خطأ في التحميل", "Load error"), variant: "destructive" }); }
    finally { setLoading(false); }
  }, [hasAccess]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const handleSave = async (form: typeof EMPTY_FORM) => {
    const method = editing ? "PUT" : "POST";
    const url = editing ? `/api/partner-accounts/${editing.id}` : "/api/partner-accounts";
    try {
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, companyId: 1 }),
      });
      if (res.ok) {
        toast({ title: editing ? lbl("تم التعديل ✓", "Updated ✓") : lbl("تمت الإضافة ✓", "Added ✓") });
        setShowDialog(false); setEditing(null); fetchRows();
      } else {
        const err = await res.json();
        toast({ title: err.error || lbl("خطأ", "Error"), variant: "destructive" });
      }
    } catch { toast({ title: lbl("خطأ في الحفظ", "Save error"), variant: "destructive" }); }
  };

  const handleDelete = async (row: PartnerAccount) => {
    if (!confirm(lbl(`حذف سجل العقد ${row.contractNumber}؟`, `Delete contract ${row.contractNumber}?`))) return;
    try {
      await fetch(`/api/partner-accounts/${row.id}`, { method: "DELETE" });
      toast({ title: lbl("تم الحذف", "Deleted") });
      fetchRows();
    } catch { toast({ title: lbl("خطأ", "Error"), variant: "destructive" }); }
  };

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(r =>
      r.contractNumber.toLowerCase().includes(q) ||
      r.clientName.toLowerCase().includes(q) ||
      r.contractType.toLowerCase().includes(q)
    );
  }, [rows, search]);

  // KPIs
  const kpi = useMemo(() => ({
    totalValue: rows.reduce((s, r) => s + parseFloat(r.contractValue || "0"), 0),
    companyTotal: rows.reduce((s, r) => s + calcCompanyAmount(r.contractValue, r.companySharePct), 0),
    partnerTotal: rows.reduce((s, r) => s + calcPartnerAmount(r.contractValue, r.companySharePct), 0),
    received: rows.reduce((s, r) => s + parseFloat(r.receivedAmount || "0"), 0),
    pending: rows.filter(r => r.status === "pending").length,
  }), [rows]);

  if (!hasAccess) return <AccessDenied isRtl={isRtl} />;

  return (
    <div className="space-y-5">
      {/* ── KPI Bar ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: lbl("إجمالي قيمة العقود", "Total Contract Value"), value: SAR(kpi.totalValue), icon: TrendingUp, color: "text-primary", bg: "bg-primary/5 border-primary/20" },
          { label: lbl("نصيب الشركة الإجمالي", "Total Company Share"), value: SAR(kpi.companyTotal), icon: Wallet, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800" },
          { label: lbl("نصيب الشريك الإجمالي", "Total Partner Share"), value: SAR(kpi.partnerTotal), icon: Wallet, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-800" },
          { label: lbl("إجمالي المستلم", "Total Received"), value: SAR(kpi.received), icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800" },
          { label: lbl("سجلات معلقة", "Pending Records"), value: `${kpi.pending} ${lbl("عقد", "contracts")}`, icon: Clock, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800" },
        ].map((item, i) => {
          const Icon = item.icon;
          return (
            <div key={i} className={cn("rounded-xl p-4 border", item.bg)}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground leading-tight">{item.label}</span>
                <Icon className={cn("w-4 h-4 opacity-60 shrink-0", item.color)} />
              </div>
              <p className={cn("text-sm font-bold font-mono", item.color)}>{item.value}</p>
            </div>
          );
        })}
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input className="h-9 ps-9 text-sm" placeholder={lbl("بحث عن عقد أو عميل...", "Search...")}
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={fetchRows}>
            <RefreshCw className="w-3.5 h-3.5" />{lbl("تحديث", "Refresh")}
          </Button>
          <Button variant="outline" size="sm" className="h-9 gap-1.5"
            onClick={() => printPartnerAccounts(filtered, isRtl)} disabled={filtered.length === 0}>
            <Printer className="w-3.5 h-3.5" />{lbl("طباعة", "Print")}
          </Button>
          <Button size="sm" className="h-9 gap-1.5" onClick={() => { setEditing(null); setShowDialog(true); }}>
            <Plus className="w-3.5 h-3.5" />{lbl("إضافة سجل", "Add Record")}
          </Button>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border-2 border-dashed border-border/50 rounded-xl">
          <TrendingUp className="w-10 h-10 mb-3 opacity-20" />
          <p className="font-semibold">{lbl("لا توجد سجلات بعد", "No records yet")}</p>
          <p className="text-sm mt-1">{lbl("أضف سجل عقد شريك جديد", "Add a new partner contract record")}</p>
          <Button size="sm" className="mt-4 gap-1.5" onClick={() => setShowDialog(true)}>
            <Plus className="w-3.5 h-3.5" />{lbl("إضافة أول سجل", "Add First Record")}
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border/50 overflow-hidden bg-card shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-[#1e40af] [&_th]:text-white [&_th]:font-semibold sticky top-0 z-10">
                <TableRow className="border-0 hover:bg-transparent">
                  <TableHead className="text-center text-white w-10">م</TableHead>
                  <TableHead className="text-center text-white">{lbl("رقم العقد", "Contract No.")}</TableHead>
                  <TableHead className="text-center text-white">{lbl("البيان", "Description")}</TableHead>
                  <TableHead className="text-center text-white">{lbl("نوع العقد", "Type")}</TableHead>
                  <TableHead className="text-center text-white">{lbl("قيمة العقد", "Value")}</TableHead>
                  <TableHead className="text-center text-white">{lbl("نسبة الشركة%", "Co. Share%")}</TableHead>
                  <TableHead className="text-center text-white">{lbl("مبلغ الشركة", "Co. Amount")}</TableHead>
                  <TableHead className="text-center text-white">{lbl("مبلغ الشريك", "Partner Amt.")}</TableHead>
                  <TableHead className="text-center text-white">{lbl("المستلم", "Received")}</TableHead>
                  <TableHead className="text-center text-white">{lbl("ملاحظات", "Notes")}</TableHead>
                  <TableHead className="text-center text-white">{lbl("الاستلام", "Method")}</TableHead>
                  <TableHead className="text-center text-white w-20">{lbl("إجراء", "Action")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row, i) => {
                  const compAmt = calcCompanyAmount(row.contractValue, row.companySharePct);
                  const partAmt = calcPartnerAmount(row.contractValue, row.companySharePct);
                  const pm = PAYMENT_METHODS.find(m => m.value === row.paymentMethod);
                  const typeCls = TYPE_COLORS[row.contractType] || "bg-gray-100 dark:bg-gray-800 text-gray-700";
                  const isPaid = parseFloat(row.receivedAmount || "0") >= compAmt && compAmt > 0;
                  const isPartial = parseFloat(row.receivedAmount || "0") > 0 && !isPaid;
                  return (
                    <TableRow key={row.id} className="border-border/40 hover:bg-muted/30 transition-colors">
                      <TableCell className="text-center text-muted-foreground text-xs">{i + 1}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="font-mono text-sm font-semibold text-primary">{row.contractNumber}</span>
                          {row.contractId && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30 px-1.5 py-0.5 rounded-full border border-violet-200 dark:border-violet-800">
                              <Handshake className="w-2 h-2" />
                              {lbl("من عقد", "from contract")}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-medium text-sm">{row.clientName}</TableCell>
                      <TableCell className="text-center">
                        <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium", typeCls)}>
                          {row.contractType}
                        </span>
                      </TableCell>
                      <TableCell className="text-center font-mono font-semibold">{fmt(row.contractValue)}</TableCell>
                      <TableCell className="text-center font-bold text-blue-600 dark:text-blue-400">
                        {parseFloat(row.companySharePct || "0").toFixed(0)}%
                      </TableCell>
                      <TableCell className="text-center font-mono font-semibold text-blue-700 dark:text-blue-300">
                        {fmt(compAmt)}
                      </TableCell>
                      <TableCell className="text-center font-mono font-semibold text-violet-700 dark:text-violet-300">
                        {fmt(partAmt)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className={cn("font-mono font-semibold text-sm",
                          isPaid ? "text-emerald-600" : isPartial ? "text-amber-600" : "text-muted-foreground")}>
                          {parseFloat(row.receivedAmount || "0") > 0 ? fmt(row.receivedAmount) : "—"}
                        </div>
                        {row.receivedDate && (
                          <div className="text-[10px] text-muted-foreground">{row.receivedDate}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-xs text-muted-foreground max-w-[100px] truncate">
                        {row.notes || "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        {pm && (
                          <Badge className={cn("text-xs border-0",
                            pm.value === "cash" ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700" :
                            pm.value === "transfer" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700" :
                            "bg-amber-100 dark:bg-amber-900/30 text-amber-700"
                          )}>
                            {isRtl ? pm.labelAr : pm.labelEn}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => { setEditing(row); setShowDialog(true); }}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-600"
                            onClick={() => handleDelete(row)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              {/* Totals row */}
              <tfoot>
                <tr className="bg-muted/50 border-t-2 border-border font-bold">
                  <td colSpan={4} className="px-4 py-2.5 text-sm text-end pe-4">{lbl("الإجمالي", "Total")}</td>
                  <td className="text-center py-2.5 font-mono text-sm">{fmt(kpi.totalValue)}</td>
                  <td></td>
                  <td className="text-center py-2.5 font-mono text-sm text-blue-700 dark:text-blue-300">{fmt(kpi.companyTotal)}</td>
                  <td className="text-center py-2.5 font-mono text-sm text-violet-700 dark:text-violet-300">{fmt(kpi.partnerTotal)}</td>
                  <td className="text-center py-2.5 font-mono text-sm text-emerald-600">{fmt(kpi.received)}</td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </Table>
          </div>
        </div>
      )}

      <EntryDialog
        open={showDialog}
        onClose={() => { setShowDialog(false); setEditing(null); }}
        onSave={handleSave}
        editing={editing}
        isRtl={isRtl}
      />
    </div>
  );
}
