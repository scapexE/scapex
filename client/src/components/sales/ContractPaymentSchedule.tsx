import { useState, useEffect, useCallback, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { esc } from "@/lib/htmlEscape";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Plus, Pencil, Trash2, Loader2, ChevronDown, ChevronRight,
  CheckCircle2, Clock, AlertTriangle, XCircle, DollarSign,
  CalendarCheck, TrendingUp, Wallet, FileText, Printer,
  CreditCard, Search, RefreshCw, Ban, Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Installment {
  id: number;
  contractRef: string;
  contractName: string;
  clientName: string;
  contractTotal: string;
  installmentNumber: number;
  descriptionAr: string | null;
  descriptionEn: string | null;
  percentage: string;
  amount: string;
  dueDate: string | null;
  status: string;
  paidAmount: string;
  paidDate: string | null;
  notes: string | null;
  invoiceRef: string | null;
  createdAt: string;
}

interface ContractSummary {
  contractRef: string;
  contractName: string;
  clientName: string;
  contractTotal: number;
  installments: Installment[];
  totalAmount: number;
  totalPaid: number;
}

interface LocalContract {
  id: string | number;
  contractNumber?: string;
  proposalNumber?: string;
  clientName: string;
  projectName?: string;
  total: number | string;
  currency?: string;
  serviceType?: string;
  status?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { labelAr: string; labelEn: string; color: string; bg: string; icon: any }> = {
  pending:  { labelAr: "لم تُستلم",  labelEn: "Pending",  color: "text-slate-600 dark:text-slate-400",  bg: "bg-slate-100 dark:bg-slate-800",    icon: Clock },
  partial:  { labelAr: "مدفوعة جزئياً", labelEn: "Partial", color: "text-blue-700 dark:text-blue-400",   bg: "bg-blue-100 dark:bg-blue-900/30",   icon: Wallet },
  paid:     { labelAr: "مدفوعة بالكامل",  labelEn: "Paid",    color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-900/30", icon: CheckCircle2 },
  overdue:  { labelAr: "متأخرة",     labelEn: "Overdue", color: "text-red-700 dark:text-red-400",     bg: "bg-red-100 dark:bg-red-900/30",     icon: AlertTriangle },
  cancelled:{ labelAr: "ملغاة",      labelEn: "Cancelled",color:"text-gray-600 dark:text-gray-400",    bg: "bg-gray-100 dark:bg-gray-800",      icon: Ban },
};

const fmt = (v: number) => v.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const SAR = (v: number) => `${fmt(v)} ر.س`;
const today = () => new Date().toISOString().slice(0, 10);
const daysUntil = (d: string | null) => d ? Math.ceil((new Date(d).getTime() - Date.now()) / 86400000) : null;

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status, isRtl }: { status: string; isRtl: boolean }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.pending;
  const Icon = cfg.icon;
  return (
    <Badge className={cn("gap-1 border-0 font-normal text-xs", cfg.bg, cfg.color)}>
      <Icon className="w-3 h-3" />
      {isRtl ? cfg.labelAr : cfg.labelEn}
    </Badge>
  );
}

// ─── Progress Ring ────────────────────────────────────────────────────────────
function ProgressRing({ pct, size = 48, stroke = 4 }: { pct: number; size?: number; stroke?: number }) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ - (Math.min(pct, 100) / 100) * circ;
  const color = pct >= 100 ? "#16a34a" : pct > 50 ? "#2563eb" : pct > 0 ? "#d97706" : "#94a3b8";
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-border/30" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={dash} strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.5s ease" }} />
    </svg>
  );
}

// ─── Print helper ─────────────────────────────────────────────────────────────
function printSchedule(summary: ContractSummary, isRtl: boolean) {
  const remaining = summary.contractTotal - summary.totalPaid;
  const pct = summary.contractTotal > 0 ? (summary.totalPaid / summary.contractTotal * 100).toFixed(1) : "0";
  const html = `<!DOCTYPE html><html dir="${isRtl?"rtl":"ltr"}"><head><meta charset="UTF-8">
  <title>${esc(summary.contractName)}</title>
  <style>
    body{font-family:'Segoe UI',Arial,sans-serif;font-size:11px;margin:0;padding:24px;color:#1a1a1a}
    .logo{font-size:22px;font-weight:900;color:#1e40af}
    .header{display:flex;justify-content:space-between;border-bottom:2px solid #1e40af;padding-bottom:12px;margin-bottom:20px;align-items:flex-end}
    h1{font-size:16px;font-weight:900;color:#1e3a8a;margin:0 0 4px}
    .meta{color:#64748b;font-size:10px}
    .kpi{display:flex;gap:16px;margin:16px 0;flex-wrap:wrap}
    .kpi-box{border:1px solid #e2e8f0;border-radius:8px;padding:10px 16px;min-width:120px}
    .kpi-label{font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:.5px}
    .kpi-value{font-size:15px;font-weight:900;margin-top:4px}
    table{width:100%;border-collapse:collapse;margin:12px 0}
    th{background:#1e40af;color:#fff;padding:7px 10px;text-align:${isRtl?"right":"left"};font-size:10px}
    td{padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:11px}
    tr:nth-child(even){background:#f8fafc}
    .paid{color:#166534;font-weight:700}.overdue{color:#dc2626;font-weight:700}.partial{color:#1d4ed8}.pending{color:#475569}
    .footer{margin-top:20px;border-top:1px solid #e2e8f0;padding-top:8px;text-align:center;color:#94a3b8;font-size:9px}
    .progress-bar{height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden;margin-top:8px}
    .progress-fill{height:100%;background:#1e40af;border-radius:4px}
  </style></head><body>
  <div class="header">
    <div class="logo">Scapex</div>
    <div style="text-align:${isRtl?"left":"right"}">
      <h1>${isRtl?"جدول الدفعات — ":"Payment Schedule — "}${esc(summary.contractName)}</h1>
      <div class="meta">${isRtl?"العميل:":"Client:"} ${esc(summary.clientName)} &nbsp;|&nbsp; ${isRtl?"تاريخ الطباعة:":"Printed:"} ${new Date().toLocaleDateString(isRtl?"ar-SA":"en-GB")}</div>
    </div>
  </div>
  <div class="kpi">
    <div class="kpi-box"><div class="kpi-label">${isRtl?"قيمة العقد":"Contract Value"}</div><div class="kpi-value">${SAR(summary.contractTotal)}</div></div>
    <div class="kpi-box"><div class="kpi-label">${isRtl?"إجمالي المستلم":"Total Received"}</div><div class="kpi-value paid">${SAR(summary.totalPaid)}</div></div>
    <div class="kpi-box"><div class="kpi-label">${isRtl?"المتبقي":"Remaining"}</div><div class="kpi-value overdue">${SAR(remaining)}</div></div>
    <div class="kpi-box"><div class="kpi-label">${isRtl?"نسبة التحصيل":"Collection %"}</div><div class="kpi-value">${pct}%</div>
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
    </div>
  </div>
  <table>
    <thead><tr>
      <th>#</th><th>${isRtl?"البيان":"Description"}</th><th>${isRtl?"النسبة":"Pct"}</th>
      <th>${isRtl?"المبلغ":"Amount"}</th><th>${isRtl?"تاريخ الاستحقاق":"Due Date"}</th>
      <th>${isRtl?"المستلم":"Paid"}</th><th>${isRtl?"المتبقي":"Balance"}</th><th>${isRtl?"الحالة":"Status"}</th>
    </tr></thead>
    <tbody>
    ${summary.installments.map(inst => {
      const bal = parseFloat(inst.amount) - parseFloat(inst.paidAmount);
      const cfg = STATUS_CFG[inst.status] ?? STATUS_CFG.pending;
      return `<tr>
        <td>${inst.installmentNumber}</td>
        <td>${esc(isRtl ? (inst.descriptionAr || "—") : (inst.descriptionEn || inst.descriptionAr || "—"))}</td>
        <td>${parseFloat(inst.percentage).toFixed(1)}%</td>
        <td style="font-weight:600">${SAR(parseFloat(inst.amount))}</td>
        <td>${inst.dueDate || "—"}</td>
        <td class="${inst.status}">${SAR(parseFloat(inst.paidAmount))}</td>
        <td class="${bal > 0 ? "overdue" : "paid"}">${SAR(Math.max(0, bal))}</td>
        <td class="${inst.status}">${isRtl ? cfg.labelAr : cfg.labelEn}</td>
      </tr>`;
    }).join("")}
    </tbody>
  </table>
  <div class="footer">Scapex ERP · ${isRtl?"جدول مدفوعات العقود":"Contract Payment Schedule"} · ${new Date().getFullYear()}</div>
  </body></html>`;
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 500);
}

// ═══════════════════════════════════════════════════════════════════════════════
// INSTALLMENT FORM DIALOG
// ═══════════════════════════════════════════════════════════════════════════════
interface InstallmentFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  editItem?: Installment | null;
  contractRef?: string;
  contractName?: string;
  clientName?: string;
  contractTotal?: number;
  nextInstallmentNumber?: number;
  isRtl: boolean;
}

function InstallmentFormDialog({ open, onClose, onSave, editItem, contractRef, contractName, clientName, contractTotal, nextInstallmentNumber, isRtl }: InstallmentFormProps) {
  const [form, setForm] = useState({
    descriptionAr: "", descriptionEn: "", percentage: "",
    amount: "", dueDate: "", status: "pending",
    paidAmount: "0", paidDate: "", notes: "", invoiceRef: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editItem) {
      setForm({
        descriptionAr: editItem.descriptionAr ?? "",
        descriptionEn: editItem.descriptionEn ?? "",
        percentage: editItem.percentage,
        amount: editItem.amount,
        dueDate: editItem.dueDate ?? "",
        status: editItem.status,
        paidAmount: editItem.paidAmount,
        paidDate: editItem.paidDate ?? "",
        notes: editItem.notes ?? "",
        invoiceRef: editItem.invoiceRef ?? "",
      });
    } else {
      setForm({ descriptionAr: "", descriptionEn: "", percentage: "", amount: "", dueDate: "", status: "pending", paidAmount: "0", paidDate: "", notes: "", invoiceRef: "" });
    }
  }, [editItem, open]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  // Auto-calculate amount from percentage
  const onPctChange = (pct: string) => {
    set("percentage", pct);
    if (contractTotal && pct) {
      const amt = (parseFloat(pct) / 100) * contractTotal;
      if (!isNaN(amt)) set("amount", amt.toFixed(2));
    }
  };
  const onAmtChange = (amt: string) => {
    set("amount", amt);
    if (contractTotal && amt) {
      const pct = (parseFloat(amt) / contractTotal) * 100;
      if (!isNaN(pct)) set("percentage", pct.toFixed(2));
    }
  };

  const handleSave = async () => {
    if (!form.amount || parseFloat(form.amount) <= 0) return;
    setSaving(true);
    try {
      await onSave({ ...form, contractRef, contractName, clientName, contractTotal });
      onClose();
    } finally { setSaving(false); }
  };

  const lbl = (ar: string, en: string) => isRtl ? ar : en;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            {editItem ? lbl("تعديل الدفعة", "Edit Installment") : lbl("إضافة دفعة جديدة", "Add New Installment")}
          </DialogTitle>
        </DialogHeader>

        {(contractName || editItem?.contractName) && (
          <div className="bg-secondary/40 rounded-lg px-3 py-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{contractName || editItem?.contractName}</span>
            {contractTotal ? <span className="ms-2 text-xs">— {SAR(contractTotal)}</span> : null}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label className="text-xs">{lbl("وصف الدفعة (عربي)", "Description (Arabic)")}</Label>
            <Input className="mt-1 h-8" value={form.descriptionAr} onChange={e => set("descriptionAr", e.target.value)}
              placeholder={lbl("مثال: دفعة الدخول (30%)", "e.g. Mobilization (30%)")} />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">{lbl("وصف الدفعة (إنجليزي)", "Description (English)")}</Label>
            <Input className="mt-1 h-8" value={form.descriptionEn} onChange={e => set("descriptionEn", e.target.value)}
              placeholder="e.g. Mobilization Payment" />
          </div>

          <div>
            <Label className="text-xs">{lbl("النسبة %", "Percentage %")}</Label>
            <div className="relative mt-1">
              <Input className="h-8 pe-8" type="number" min="0" max="100" step="0.01"
                value={form.percentage} onChange={e => onPctChange(e.target.value)} />
              <span className="absolute end-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
            </div>
          </div>
          <div>
            <Label className="text-xs">{lbl("المبلغ", "Amount")}</Label>
            <div className="relative mt-1">
              <Input className="h-8 pe-12" type="number" min="0" step="0.01"
                value={form.amount} onChange={e => onAmtChange(e.target.value)} />
              <span className="absolute end-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">ر.س</span>
            </div>
          </div>

          <div>
            <Label className="text-xs">{lbl("تاريخ الاستحقاق", "Due Date")}</Label>
            <Input className="mt-1 h-8" type="date" value={form.dueDate} onChange={e => set("dueDate", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">{lbl("الحالة", "Status")}</Label>
            <Select value={form.status} onValueChange={v => set("status", v)}>
              <SelectTrigger className="mt-1 h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_CFG).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{isRtl ? v.labelAr : v.labelEn}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">{lbl("المبلغ المستلم", "Amount Paid")}</Label>
            <div className="relative mt-1">
              <Input className="h-8 pe-12" type="number" min="0" step="0.01"
                value={form.paidAmount} onChange={e => set("paidAmount", e.target.value)} />
              <span className="absolute end-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">ر.س</span>
            </div>
          </div>
          <div>
            <Label className="text-xs">{lbl("تاريخ الاستلام", "Date Received")}</Label>
            <Input className="mt-1 h-8" type="date" value={form.paidDate} onChange={e => set("paidDate", e.target.value)} />
          </div>

          <div className="col-span-2">
            <Label className="text-xs">{lbl("رقم الفاتورة المرتبطة", "Linked Invoice Ref")}</Label>
            <Input className="mt-1 h-8" value={form.invoiceRef} onChange={e => set("invoiceRef", e.target.value)}
              placeholder="INV-2026-001" />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">{lbl("ملاحظات", "Notes")}</Label>
            <Textarea className="mt-1 text-sm resize-none" rows={2} value={form.notes}
              onChange={e => set("notes", e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>{lbl("إلغاء", "Cancel")}</Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !form.amount}>
            {saving && <Loader2 className="w-3.5 h-3.5 me-1.5 animate-spin" />}
            {lbl("حفظ", "Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADD CONTRACT DIALOG
// ═══════════════════════════════════════════════════════════════════════════════
function AddContractDialog({ open, onClose, onAdd, localContracts, isRtl }: {
  open: boolean; onClose: () => void;
  onAdd: (data: { contractRef: string; contractName: string; clientName: string; contractTotal: number }) => void;
  localContracts: LocalContract[]; isRtl: boolean;
}) {
  const [mode, setMode] = useState<"local" | "manual">("local");
  const [selectedId, setSelectedId] = useState("");
  const [manual, setManual] = useState({ contractRef: "", contractName: "", clientName: "", contractTotal: "" });

  const handleAdd = () => {
    if (mode === "local") {
      const c = localContracts.find(x => String(x.id) === selectedId);
      if (!c) return;
      const ref = c.contractNumber || String(c.id);
      onAdd({ contractRef: ref, contractName: c.projectName || ref, clientName: c.clientName, contractTotal: typeof c.total === "string" ? parseFloat(c.total) : c.total });
    } else {
      if (!manual.contractRef || !manual.contractName || !manual.clientName) return;
      onAdd({ contractRef: manual.contractRef, contractName: manual.contractName, clientName: manual.clientName, contractTotal: parseFloat(manual.contractTotal || "0") });
    }
    onClose();
  };

  const lbl = (ar: string, en: string) => isRtl ? ar : en;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            {lbl("ربط عقد بجدول دفعات", "Link Contract to Payment Schedule")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 p-1 bg-secondary/50 rounded-lg">
          <button onClick={() => setMode("local")} className={cn("flex-1 text-xs py-1.5 rounded-md transition-all", mode === "local" ? "bg-background shadow font-semibold" : "text-muted-foreground hover:text-foreground")}>
            {lbl("من العقود الموجودة", "From Existing Contracts")}
          </button>
          <button onClick={() => setMode("manual")} className={cn("flex-1 text-xs py-1.5 rounded-md transition-all", mode === "manual" ? "bg-background shadow font-semibold" : "text-muted-foreground hover:text-foreground")}>
            {lbl("إدخال يدوي", "Manual Entry")}
          </button>
        </div>

        {mode === "local" ? (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {localContracts.length === 0
              ? <p className="text-center text-sm text-muted-foreground py-6">{lbl("لا توجد عقود من العروض", "No contracts from proposals")}</p>
              : localContracts.map(c => (
                <div key={String(c.id)} onClick={() => setSelectedId(String(c.id))}
                  className={cn("flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all", selectedId === String(c.id) ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/30")}>
                  <div className={cn("w-2 h-2 rounded-full border-2 flex-shrink-0", selectedId === String(c.id) ? "bg-primary border-primary" : "border-border")} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.projectName || c.contractNumber || String(c.id)}</p>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-mono text-primary">{c.contractNumber}</span>
                      {" · "}{c.clientName}
                      {" · "}<span className="font-mono">{(typeof c.total === "number" ? c.total : parseFloat(c.total as string) || 0).toLocaleString()} {c.currency || "SAR"}</span>
                    </p>
                  </div>
                </div>
              ))
            }
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">{lbl("رقم العقد", "Contract Ref")}</Label>
              <Input className="mt-1 h-8" value={manual.contractRef} onChange={e => setManual(m => ({ ...m, contractRef: e.target.value }))} placeholder="CTR-2026-001" />
            </div>
            <div>
              <Label className="text-xs">{lbl("اسم المشروع / العقد", "Contract / Project Name")}</Label>
              <Input className="mt-1 h-8" value={manual.contractName} onChange={e => setManual(m => ({ ...m, contractName: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">{lbl("اسم العميل", "Client Name")}</Label>
              <Input className="mt-1 h-8" value={manual.clientName} onChange={e => setManual(m => ({ ...m, clientName: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">{lbl("قيمة العقد (ر.س)", "Contract Total (SAR)")}</Label>
              <Input className="mt-1 h-8" type="number" value={manual.contractTotal} onChange={e => setManual(m => ({ ...m, contractTotal: e.target.value }))} />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>{lbl("إلغاء", "Cancel")}</Button>
          <Button size="sm" onClick={handleAdd} disabled={mode === "local" ? !selectedId : !manual.contractRef}>
            {lbl("إضافة", "Add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRACT CARD
// ═══════════════════════════════════════════════════════════════════════════════
function ContractCard({ summary, isRtl, onAddInstallment, onEditInstallment, onDeleteInstallment, onRecordPayment, onPrint }:
  { summary: ContractSummary; isRtl: boolean;
    onAddInstallment: () => void;
    onEditInstallment: (inst: Installment) => void;
    onDeleteInstallment: (id: number) => void;
    onRecordPayment: (inst: Installment) => void;
    onPrint: () => void;
  }) {
  const [expanded, setExpanded] = useState(true);

  const remaining = summary.contractTotal - summary.totalPaid;
  const pct = summary.contractTotal > 0 ? (summary.totalPaid / summary.contractTotal) * 100 : 0;
  const overdue = summary.installments.filter(i => i.status === "overdue").length;
  const upcoming = summary.installments.filter(i => {
    if (i.status !== "pending") return false;
    const days = daysUntil(i.dueDate);
    return days !== null && days >= 0 && days <= 14;
  });

  return (
    <Card className={cn("border-border/50 shadow-sm overflow-hidden", overdue > 0 && "border-red-200 dark:border-red-900/50")}>
      {/* Contract Header */}
      <CardHeader className="p-0">
        <div
          className={cn("flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/20 transition-colors",
            overdue > 0 && "bg-red-50/40 dark:bg-red-950/10")}
          onClick={() => setExpanded(e => !e)}
        >
          {/* Expand icon */}
          <div className="text-muted-foreground shrink-0">
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>

          {/* Progress Ring */}
          <div className="relative shrink-0">
            <ProgressRing pct={pct} size={52} stroke={4} />
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">{Math.round(pct)}%</span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm truncate">{summary.contractName}</span>
              <span className="font-mono text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{summary.contractRef}</span>
              {overdue > 0 && <Badge className="gap-1 text-[10px] bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-0">
                <AlertTriangle className="w-2.5 h-2.5" />{overdue} {isRtl ? "متأخرة" : "overdue"}
              </Badge>}
              {upcoming.length > 0 && <Badge className="gap-1 text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-0">
                <Clock className="w-2.5 h-2.5" />{upcoming.length} {isRtl ? "قريبة" : "due soon"}
              </Badge>}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{summary.clientName}</p>
            {/* Progress bar */}
            <div className="mt-2 flex items-center gap-2">
              <Progress value={pct} className="h-1.5 flex-1" />
              <span className="text-[10px] text-muted-foreground shrink-0">{summary.installments.length} {isRtl ? "دفعة" : "installments"}</span>
            </div>
          </div>

          {/* Amounts summary */}
          <div className="hidden sm:grid grid-cols-3 gap-4 shrink-0 text-end">
            <div>
              <p className="text-[10px] text-muted-foreground">{isRtl ? "قيمة العقد" : "Contract"}</p>
              <p className="font-bold text-sm font-mono">{SAR(summary.contractTotal)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">{isRtl ? "المستلم" : "Received"}</p>
              <p className="font-bold text-sm font-mono text-emerald-600">{SAR(summary.totalPaid)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">{isRtl ? "المتبقي" : "Remaining"}</p>
              <p className={cn("font-bold text-sm font-mono", remaining > 0 ? "text-red-600" : "text-emerald-600")}>{SAR(Math.max(0, remaining))}</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
            <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={onPrint} title={isRtl ? "طباعة" : "Print"}>
              <Printer className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" className="h-7 gap-1 text-xs" onClick={onAddInstallment}>
              <Plus className="w-3 h-3" />{isRtl ? "دفعة" : "Add"}
            </Button>
          </div>
        </div>

        {/* Mobile amounts */}
        <div className="sm:hidden grid grid-cols-3 gap-0 border-t border-border/30 bg-secondary/20">
          {[
            { label: isRtl ? "قيمة العقد" : "Contract", value: SAR(summary.contractTotal), cls: "" },
            { label: isRtl ? "المستلم" : "Received", value: SAR(summary.totalPaid), cls: "text-emerald-600" },
            { label: isRtl ? "المتبقي" : "Remaining", value: SAR(Math.max(0, remaining)), cls: remaining > 0 ? "text-red-600" : "text-emerald-600" },
          ].map((item, i) => (
            <div key={i} className={cn("text-center py-2", i > 0 && "border-s border-border/30")}>
              <p className="text-[9px] text-muted-foreground">{item.label}</p>
              <p className={cn("font-bold text-xs font-mono", item.cls)}>{item.value}</p>
            </div>
          ))}
        </div>
      </CardHeader>

      {/* Installments Table */}
      {expanded && (
        <CardContent className="p-0">
          <div className="border-t border-border/30">
            {summary.installments.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                <CreditCard className="w-8 h-8 opacity-20" />
                <p className="text-sm">{isRtl ? "لا توجد دفعات — اضغط «دفعة» لإضافة جدول" : "No installments — click «Add» to set up schedule"}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30 bg-secondary/30 text-xs text-muted-foreground">
                      <th className="py-2 px-4 text-start font-medium w-8">#</th>
                      <th className="py-2 px-3 text-start font-medium">{isRtl ? "البيان" : "Description"}</th>
                      <th className="py-2 px-3 text-end font-medium">{isRtl ? "النسبة" : "Pct%"}</th>
                      <th className="py-2 px-3 text-end font-medium">{isRtl ? "المبلغ" : "Amount"}</th>
                      <th className="py-2 px-3 text-start font-medium">{isRtl ? "الاستحقاق" : "Due Date"}</th>
                      <th className="py-2 px-3 text-end font-medium">{isRtl ? "المستلم" : "Received"}</th>
                      <th className="py-2 px-3 text-end font-medium">{isRtl ? "المتبقي" : "Balance"}</th>
                      <th className="py-2 px-3 text-start font-medium">{isRtl ? "الحالة" : "Status"}</th>
                      <th className="py-2 px-3 text-end font-medium">{isRtl ? "إجراء" : "Action"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.installments.map((inst, idx) => {
                      const balance = parseFloat(inst.amount) - parseFloat(inst.paidAmount);
                      const days = daysUntil(inst.dueDate);
                      const isPastDue = days !== null && days < 0 && inst.status !== "paid" && inst.status !== "cancelled";
                      const isDueSoon = days !== null && days >= 0 && days <= 7 && inst.status === "pending";

                      return (
                        <tr key={inst.id}
                          className={cn("border-b border-border/20 hover:bg-muted/20 transition-colors",
                            inst.status === "paid" && "bg-emerald-50/30 dark:bg-emerald-950/10",
                            inst.status === "overdue" || isPastDue ? "bg-red-50/40 dark:bg-red-950/10" : "",
                            isDueSoon && "bg-amber-50/40 dark:bg-amber-950/10",
                          )}>
                          <td className="py-3 px-4 text-muted-foreground font-mono text-xs">{inst.installmentNumber}</td>
                          <td className="py-3 px-3">
                            <p className="font-medium text-sm">{isRtl ? (inst.descriptionAr || "—") : (inst.descriptionEn || inst.descriptionAr || "—")}</p>
                            {inst.invoiceRef && <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{inst.invoiceRef}</p>}
                            {inst.notes && <p className="text-[10px] text-muted-foreground mt-0.5 italic">{inst.notes}</p>}
                          </td>
                          <td className="py-3 px-3 text-end font-mono text-sm">{parseFloat(inst.percentage).toFixed(1)}%</td>
                          <td className="py-3 px-3 text-end font-mono font-semibold">{SAR(parseFloat(inst.amount))}</td>
                          <td className="py-3 px-3">
                            {inst.dueDate ? (
                              <div>
                                <p className={cn("text-sm", isPastDue && "text-red-600 font-semibold")}>{inst.dueDate}</p>
                                {days !== null && inst.status !== "paid" && inst.status !== "cancelled" && (
                                  <p className={cn("text-[10px] mt-0.5", days < 0 ? "text-red-500" : days <= 7 ? "text-amber-600" : "text-muted-foreground")}>
                                    {days < 0 ? `${Math.abs(days)} ${isRtl ? "يوم تأخر" : "days overdue"}` :
                                     days === 0 ? (isRtl ? "اليوم!" : "Today!") :
                                     `${isRtl ? "بعد" : "in"} ${days} ${isRtl ? "يوم" : "days"}`}
                                  </p>
                                )}
                              </div>
                            ) : <span className="text-muted-foreground text-xs">—</span>}
                          </td>
                          <td className="py-3 px-3 text-end">
                            <p className="font-mono font-semibold text-emerald-600">{SAR(parseFloat(inst.paidAmount))}</p>
                            {inst.paidDate && <p className="text-[10px] text-muted-foreground">{inst.paidDate}</p>}
                          </td>
                          <td className="py-3 px-3 text-end">
                            <p className={cn("font-mono font-bold", balance <= 0 ? "text-emerald-600" : "text-red-600")}>
                              {SAR(Math.max(0, balance))}
                            </p>
                          </td>
                          <td className="py-3 px-3">
                            <StatusBadge status={inst.status} isRtl={isRtl} />
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center justify-end gap-1">
                              {inst.status !== "paid" && inst.status !== "cancelled" && (
                                <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                                  onClick={() => onRecordPayment(inst)}>
                                  <DollarSign className="w-3 h-3" />
                                  {isRtl ? "استلام" : "Pay"}
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" onClick={() => onEditInstallment(inst)}>
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600" onClick={() => onDeleteInstallment(inst.id)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// RECORD PAYMENT DIALOG (Quick)
// ═══════════════════════════════════════════════════════════════════════════════
function RecordPaymentDialog({ open, onClose, installment, onSave, isRtl }: {
  open: boolean; onClose: () => void; installment: Installment | null;
  onSave: (id: number, paidAmount: number, paidDate: string) => Promise<void>; isRtl: boolean;
}) {
  const balance = installment ? parseFloat(installment.amount) - parseFloat(installment.paidAmount) : 0;
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (installment) { setAmount(Math.max(0, balance).toFixed(2)); setDate(today()); }
  }, [installment]);

  const handleSave = async () => {
    if (!installment) return;
    setSaving(true);
    try {
      const newTotal = parseFloat(installment.paidAmount) + parseFloat(amount);
      await onSave(installment.id, Math.min(newTotal, parseFloat(installment.amount)), date);
      onClose();
    } finally { setSaving(false); }
  };

  if (!installment) return null;
  const lbl = (ar: string, en: string) => isRtl ? ar : en;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            {lbl("تسجيل استلام دفعة", "Record Payment Receipt")}
          </DialogTitle>
        </DialogHeader>

        <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-lg p-3 text-sm">
          <p className="font-semibold">{isRtl ? (installment.descriptionAr || "دفعة") : (installment.descriptionEn || installment.descriptionAr || "Installment")}</p>
          <p className="text-xs text-muted-foreground mt-1">{lbl("المتبقي من الدفعة:", "Remaining balance:")} <span className="font-bold text-red-600">{SAR(Math.max(0, balance))}</span></p>
        </div>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">{lbl("المبلغ المستلم", "Amount Received")}</Label>
            <div className="relative mt-1">
              <Input className="h-9 pe-12 text-base font-bold" type="number" min="0" max={balance} step="0.01"
                value={amount} onChange={e => setAmount(e.target.value)} />
              <span className="absolute end-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">ر.س</span>
            </div>
          </div>
          <div>
            <Label className="text-xs">{lbl("تاريخ الاستلام", "Date Received")}</Label>
            <Input className="mt-1 h-8" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>{lbl("إلغاء", "Cancel")}</Button>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSave} disabled={saving || !amount || parseFloat(amount) <= 0}>
            {saving && <Loader2 className="w-3.5 h-3.5 me-1.5 animate-spin" />}
            {lbl("تأكيد الاستلام", "Confirm Receipt")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export function ContractPaymentSchedule() {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";
  const { toast } = useToast();

  const [summaries, setSummaries] = useState<ContractSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showAddContract, setShowAddContract] = useState(false);
  const [showInstForm, setShowInstForm] = useState(false);
  const [editInst, setEditInst] = useState<Installment | null>(null);
  const [activeContract, setActiveContract] = useState<ContractSummary | null>(null);
  const [showPaymentDlg, setShowPaymentDlg] = useState(false);
  const [paymentInst, setPaymentInst] = useState<Installment | null>(null);

  // Load contracts from DB API
  const [localContracts, setLocalContracts] = useState<LocalContract[]>([]);
  useEffect(() => {
    fetch("/api/contracts").then(r => r.ok ? r.json() : []).then(data => {
      if (Array.isArray(data)) {
        setLocalContracts(data.map((c: any) => ({
          id: c.id,
          contractNumber: c.contractNumber,
          proposalNumber: c.proposalNumber,
          clientName: c.clientName,
          projectName: c.projectName,
          total: parseFloat(c.total) || 0,
          currency: c.currency,
          serviceType: c.serviceType,
          status: c.status,
        })));
      }
    }).catch(() => {});
  }, []);

  // Fetch all summaries
  const fetchSummaries = useCallback(async () => {
    try {
      const res = await fetch("/api/contract-payment-schedules/summary");
      const data = await res.json();
      setSummaries(Array.isArray(data) ? data : []);
    } catch { toast({ title: isRtl ? "خطأ في التحميل" : "Load Error", variant: "destructive" }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSummaries(); }, [fetchSummaries]);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpi = useMemo(() => {
    const totalContract = summaries.reduce((s, c) => s + c.contractTotal, 0);
    const totalPaid = summaries.reduce((s, c) => s + c.totalPaid, 0);
    const totalOverdue = summaries.reduce((s, c) => s + c.installments.filter(i => i.status === "overdue").reduce((a, i) => a + (parseFloat(i.amount) - parseFloat(i.paidAmount)), 0), 0);
    const dueSoon = summaries.flatMap(c => c.installments).filter(i => {
      if (i.status !== "pending") return false;
      const days = daysUntil(i.dueDate);
      return days !== null && days >= 0 && days <= 30;
    }).length;
    return { totalContract, totalPaid, remaining: totalContract - totalPaid, totalOverdue, dueSoon };
  }, [summaries]);

  const filtered = useMemo(() => {
    if (!search) return summaries;
    const q = search.toLowerCase();
    return summaries.filter(c => c.contractRef.toLowerCase().includes(q) || c.contractName.toLowerCase().includes(q) || c.clientName.toLowerCase().includes(q));
  }, [summaries, search]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleAddContract = (data: { contractRef: string; contractName: string; clientName: string; contractTotal: number }) => {
    if (summaries.find(s => s.contractRef === data.contractRef)) {
      toast({ title: isRtl ? "العقد موجود بالفعل" : "Contract already added", variant: "destructive" }); return;
    }
    setSummaries(prev => [...prev, { ...data, installments: [], totalAmount: 0, totalPaid: 0 }]);
  };

  const handleSaveInstallment = async (formData: any) => {
    const contract = activeContract;
    if (!contract) return;
    const nextNum = editInst ? editInst.installmentNumber : (contract.installments.length > 0 ? Math.max(...contract.installments.map(i => i.installmentNumber)) + 1 : 1);

    if (editInst) {
      const res = await fetch(`/api/contract-payment-schedules/${editInst.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) { toast({ title: isRtl ? "تم التحديث" : "Updated" }); fetchSummaries(); }
    } else {
      const res = await fetch("/api/contract-payment-schedules", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, installmentNumber: nextNum }),
      });
      if (res.ok) { toast({ title: isRtl ? "تمت الإضافة" : "Added" }); fetchSummaries(); }
    }
    setEditInst(null);
  };

  const handleDeleteInstallment = async (id: number) => {
    if (!confirm(isRtl ? "حذف هذه الدفعة؟" : "Delete this installment?")) return;
    await fetch(`/api/contract-payment-schedules/${id}`, { method: "DELETE" });
    toast({ title: isRtl ? "تم الحذف" : "Deleted" });
    fetchSummaries();
  };

  const handleRecordPayment = async (id: number, paidAmount: number, paidDate: string) => {
    const inst = summaries.flatMap(c => c.installments).find(i => i.id === id);
    if (!inst) return;
    const newStatus = paidAmount >= parseFloat(inst.amount) ? "paid" : "partial";
    await fetch(`/api/contract-payment-schedules/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...inst, paidAmount, paidDate, status: newStatus }),
    });
    toast({ title: isRtl ? "تم تسجيل الاستلام ✓" : "Payment recorded ✓", className: "bg-emerald-600 text-white" });
    fetchSummaries();
  };

  const lbl = (ar: string, en: string) => isRtl ? ar : en;

  return (
    <div className="space-y-5">
      {/* ── KPI Bar ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: lbl("إجمالي العقود", "Total Contract Value"), value: SAR(kpi.totalContract), icon: FileText, color: "text-primary", bg: "bg-primary/5" },
          { label: lbl("إجمالي المستلم", "Total Collected"), value: SAR(kpi.totalPaid), icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/20" },
          { label: lbl("الإجمالي المتبقي", "Total Remaining"), value: SAR(kpi.remaining), icon: Wallet, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/20" },
          { label: lbl("دفعات متأخرة", "Overdue Amount"), value: SAR(kpi.totalOverdue), icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/20" },
          { label: lbl("مستحقة خلال 30 يوم", "Due in 30 Days"), value: `${kpi.dueSoon} ${lbl("دفعة", "inst.")}`, icon: CalendarCheck, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/20" },
        ].map((item, i) => {
          const Icon = item.icon;
          return (
            <div key={i} className={cn("rounded-xl p-4 border border-border/40", item.bg)}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">{item.label}</span>
                <Icon className={cn("w-4 h-4 opacity-60", item.color)} />
              </div>
              <p className={cn("text-lg font-bold", item.color)}>{item.value}</p>
            </div>
          );
        })}
      </div>

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input className="h-8 ps-9 text-sm" placeholder={lbl("بحث عن عقد...", "Search contracts...")}
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={fetchSummaries}>
            <RefreshCw className="w-3.5 h-3.5" />{lbl("تحديث", "Refresh")}
          </Button>
          <Button size="sm" className="h-8 gap-1.5" onClick={() => setShowAddContract(true)}>
            <Plus className="w-3.5 h-3.5" />{lbl("إضافة عقد", "Add Contract")}
          </Button>
        </div>
      </div>

      {/* ── Contract Cards ─────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border-2 border-dashed border-border/50 rounded-xl">
          <TrendingUp className="w-10 h-10 mb-3 opacity-20" />
          <p className="font-semibold">{lbl("لا توجد عقود بعد", "No contracts yet")}</p>
          <p className="text-sm mt-1">{lbl("أضف عقداً وابدأ في إعداد جدول دفعاته", "Add a contract and set up its payment schedule")}</p>
          <Button size="sm" className="mt-4 gap-1.5" onClick={() => setShowAddContract(true)}>
            <Plus className="w-3.5 h-3.5" />{lbl("إضافة أول عقد", "Add First Contract")}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(summary => (
            <ContractCard
              key={summary.contractRef}
              summary={summary}
              isRtl={isRtl}
              onPrint={() => printSchedule(summary, isRtl)}
              onAddInstallment={() => {
                setActiveContract(summary);
                setEditInst(null);
                setShowInstForm(true);
              }}
              onEditInstallment={inst => {
                setActiveContract(summary);
                setEditInst(inst);
                setShowInstForm(true);
              }}
              onDeleteInstallment={handleDeleteInstallment}
              onRecordPayment={inst => {
                setPaymentInst(inst);
                setShowPaymentDlg(true);
              }}
            />
          ))}
        </div>
      )}

      {/* ── Dialogs ───────────────────────────────────────────────────── */}
      <AddContractDialog
        open={showAddContract}
        onClose={() => setShowAddContract(false)}
        onAdd={handleAddContract}
        localContracts={localContracts}
        isRtl={isRtl}
      />

      <InstallmentFormDialog
        open={showInstForm}
        onClose={() => { setShowInstForm(false); setEditInst(null); }}
        onSave={handleSaveInstallment}
        editItem={editInst}
        contractRef={activeContract?.contractRef}
        contractName={activeContract?.contractName}
        clientName={activeContract?.clientName}
        contractTotal={activeContract?.contractTotal}
        nextInstallmentNumber={activeContract ? activeContract.installments.length + 1 : 1}
        isRtl={isRtl}
      />

      <RecordPaymentDialog
        open={showPaymentDlg}
        onClose={() => { setShowPaymentDlg(false); setPaymentInst(null); }}
        installment={paymentInst}
        onSave={handleRecordPayment}
        isRtl={isRtl}
      />
    </div>
  );
}
