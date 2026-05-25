import { useLanguage } from "../../contexts/LanguageContext";
import { useActiveRole } from "@/contexts/ActiveRoleContext";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Search, FileText, Download, ShieldCheck, Clock,
  Loader2, RefreshCw, Trash2, Building2, CalendarDays, DollarSign,
  Handshake, CheckCircle2,
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ContractSignature } from "./ContractSignature";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { printContract, type Contract as LSContract } from "@/lib/proposals";

// ─── DB contract shape ─────────────────────────────────────────────────────────
export interface DBContract {
  id: number;
  companyId: number;
  contractNumber: string;
  clientName: string;
  projectName: string | null;
  serviceType: string | null;
  subtotal: string;
  vatRate: string;
  vatAmount: string;
  total: string;
  currency: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  signedAt: string | null;
  signedBy: string | null;
  createdAt: string;
  localId?: string;
  proposalNumber?: string;
  clientContact?: string;
  clientEmail?: string;
  projectDesc?: string;
  clauses?: any[];
  paymentSchedule?: any[];
  items?: any[];
}

const SAR = (v: string | number) => {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return n.toLocaleString("ar-SA", { minimumFractionDigits: 0 }) + " ر.س";
};

const STATUS_CFG: Record<string, { labelAr: string; labelEn: string; icon: any; cls: string }> = {
  draft:      { labelAr: "مسودة",      labelEn: "Draft",      icon: Clock,       cls: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400" },
  active:     { labelAr: "نشط",        labelEn: "Active",     icon: ShieldCheck, cls: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" },
  completed:  { labelAr: "منتهي",      labelEn: "Completed",  icon: ShieldCheck, cls: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" },
  cancelled:  { labelAr: "ملغي",       labelEn: "Cancelled",  icon: Clock,       cls: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" },
  converted_contract: { labelAr: "تم التعاقد", labelEn: "Contracted", icon: ShieldCheck, cls: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700" },
};

const CONTRACT_TYPES = [
  "عقد صيانة", "توريد وتركيب", "عقد توريد", "عقد تركيب",
  "عقد مقاولة", "عقد استشارات", "عقد خدمات", "أخرى",
];
const PAYMENT_METHODS = [
  { value: "cash",     labelAr: "كاش",   labelEn: "Cash" },
  { value: "transfer", labelAr: "تحويل", labelEn: "Transfer" },
  { value: "check",    labelAr: "شيك",   labelEn: "Check" },
];

// ─── Partnership Link Dialog ──────────────────────────────────────────────────
function PartnerLinkDialog({ contract, open, onClose, onSaved, isRtl }: {
  contract: DBContract | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  isRtl: boolean;
}) {
  const { toast } = useToast();
  const lbl = (ar: string, en: string) => isRtl ? ar : en;

  const [form, setForm] = useState({
    contractType: "عقد صيانة",
    companySharePct: "30",
    receivedAmount: "",
    receivedDate: "",
    paymentMethod: "cash",
    notes: "",
    status: "pending",
  });
  const [saving, setSaving] = useState(false);

  // Pre-fill from contract type when contract changes
  useEffect(() => {
    if (!contract) return;
    const svc = contract.serviceType || "";
    let type = "عقد صيانة";
    if (svc.includes("supply")) type = "عقد توريد";
    else if (svc.includes("contracting")) type = "عقد مقاولة";
    else if (svc.includes("consulting") || svc.includes("consult")) type = "عقد استشارات";
    setForm(p => ({ ...p, contractType: type }));
  }, [contract]);

  const f = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }));

  const contractValue = parseFloat(contract?.total || "0");
  const companyAmt = contractValue * parseFloat(form.companySharePct || "0") / 100;
  const partnerAmt = contractValue - companyAmt;

  const handleSave = async () => {
    if (!contract) return;
    setSaving(true);
    try {
      const res = await fetch("/api/partner-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: contract.companyId,
          contractNumber: contract.contractNumber,
          clientName: contract.clientName,
          contractType: form.contractType,
          contractValue: contract.total,
          companySharePct: form.companySharePct,
          receivedAmount: form.receivedAmount || "0",
          receivedDate: form.receivedDate || null,
          paymentMethod: form.paymentMethod,
          notes: form.notes,
          status: form.status,
          contractId: contract.id,
        }),
      });
      if (res.ok) {
        toast({ title: lbl("تم ربط العقد كشراكة ✓", "Contract linked as partnership ✓") });
        onSaved();
        onClose();
      } else {
        const err = await res.json();
        toast({ title: err.error || lbl("خطأ في الحفظ", "Save error"), variant: "destructive" });
      }
    } catch {
      toast({ title: lbl("خطأ في الاتصال", "Connection error"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!contract) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Handshake className="w-5 h-5 text-violet-500" />
            {lbl("تسجيل عقد شراكة", "Register as Partnership")}
          </DialogTitle>
        </DialogHeader>

        {/* Contract summary */}
        <div className="bg-secondary/50 rounded-xl p-4 border border-border/50 space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{lbl("رقم العقد", "Contract No.")}</span>
            <span className="font-mono font-bold text-primary">{contract.contractNumber}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{lbl("العميل / البيان", "Client")}</span>
            <span className="font-medium">{contract.clientName}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{lbl("قيمة العقد", "Contract Value")}</span>
            <span className="font-mono font-bold text-emerald-600">{SAR(contract.total)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label className="text-xs">{lbl("نوع العقد", "Contract Type")}</Label>
            <Select value={form.contractType} onValueChange={v => f("contractType", v)}>
              <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CONTRACT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">{lbl("نسبة الشركة %", "Company Share %")}</Label>
            <Input className="mt-1 h-9" type="number" min="0" max="100" step="0.5"
              value={form.companySharePct} onChange={e => f("companySharePct", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">{lbl("نسبة الشريك %", "Partner Share %")}</Label>
            <div className="mt-1 h-9 px-3 rounded-md border bg-secondary/50 flex items-center text-sm font-semibold text-violet-600">
              {(100 - parseFloat(form.companySharePct || "0")).toFixed(1)}%
            </div>
          </div>

          {/* Live amounts preview */}
          <div className="col-span-2 grid grid-cols-2 gap-3">
            <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 text-center border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-600 dark:text-blue-400">{lbl("مبلغ الشركة", "Company Amount")}</p>
              <p className="text-sm font-bold text-blue-700 dark:text-blue-300 font-mono">
                {companyAmt.toLocaleString("ar-SA", { minimumFractionDigits: 0 })} ر.س
              </p>
            </div>
            <div className="bg-violet-50 dark:bg-violet-950/20 rounded-lg p-3 text-center border border-violet-200 dark:border-violet-800">
              <p className="text-xs text-violet-600 dark:text-violet-400">{lbl("مبلغ الشريك", "Partner Amount")}</p>
              <p className="text-sm font-bold text-violet-700 dark:text-violet-300 font-mono">
                {partnerAmt.toLocaleString("ar-SA", { minimumFractionDigits: 0 })} ر.س
              </p>
            </div>
          </div>

          <div>
            <Label className="text-xs">{lbl("المبلغ المستلم (ر.س)", "Received Amount")}</Label>
            <Input className="mt-1 h-9" type="number" min="0" step="0.01"
              value={form.receivedAmount} onChange={e => f("receivedAmount", e.target.value)}
              placeholder="0" />
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
              onChange={e => f("notes", e.target.value)}
              placeholder={lbl("مستلم جزئياً / في انتظار التحويل...", "Partial / Pending transfer...")} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>{lbl("إلغاء", "Cancel")}</Button>
          <Button size="sm" className="bg-violet-600 hover:bg-violet-700 gap-1.5" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Handshake className="w-3.5 h-3.5" />}
            {lbl("تسجيل كشراكة", "Register Partnership")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main ContractsList ────────────────────────────────────────────────────────
export function ContractsList() {
  const { t, dir } = useLanguage();
  const isRtl = dir === "rtl";
  const { toast } = useToast();
  const { currentUser } = useActiveRole();

  const isAdmin = currentUser?.role === "admin" || (currentUser?.roles ?? []).includes("admin");
  const isManager = currentUser?.role === "manager" || (currentUser?.roles ?? []).includes("manager");
  const canLinkPartner = isAdmin || isManager;

  const [contracts, setContracts] = useState<DBContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const [search, setSearch] = useState("");
  const [migratedCount, setMigratedCount] = useState<number | null>(null);
  const [linkedMap, setLinkedMap] = useState<Record<number, number>>({});
  const [partnerTarget, setPartnerTarget] = useState<DBContract | null>(null);

  const fetchContracts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/contracts");
      if (res.ok) setContracts(Array.isArray(await res.json().then(d => { setContracts(Array.isArray(d) ? d : []); return d; })) ? [] : []);
    } catch { toast({ title: isRtl ? "خطأ في التحميل" : "Load error", variant: "destructive" }); }
    finally { setLoading(false); }
  }, []);

  const fetchLinked = useCallback(async () => {
    if (!canLinkPartner) return;
    try {
      const res = await fetch("/api/partner-accounts/linked-contracts");
      if (res.ok) setLinkedMap(await res.json());
    } catch { /* silent */ }
  }, [canLinkPartner]);

  // One-time migration
  const migrateFromLocalStorage = useCallback(async () => {
    if (localStorage.getItem("scapex_contracts_migrated")) return;
    try {
      const raw = localStorage.getItem("scapex_contracts");
      if (!raw) { localStorage.setItem("scapex_contracts_migrated", "1"); return; }
      const list = JSON.parse(raw);
      if (!list?.length) { localStorage.setItem("scapex_contracts_migrated", "1"); return; }
      setMigrating(true);
      const res = await fetch("/api/contracts/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contracts: list, companyId: 1 }),
      });
      if (res.ok) {
        const result = await res.json();
        localStorage.setItem("scapex_contracts_migrated", "1");
        if (result.imported > 0) {
          setMigratedCount(result.imported);
          toast({ title: isRtl ? `تم نقل ${result.imported} عقد ✓` : `Migrated ${result.imported} contracts ✓` });
        }
      }
    } catch { /* retry next load */ }
    finally { setMigrating(false); }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [contractsRes] = await Promise.all([
        fetch("/api/contracts"),
        fetchLinked(),
      ]);
      if (contractsRes.ok) {
        const data = await contractsRes.json();
        setContracts(Array.isArray(data) ? data : []);
      }
    } catch { toast({ title: isRtl ? "خطأ في التحميل" : "Load error", variant: "destructive" }); }
    finally { setLoading(false); }
  }, [fetchLinked]);

  useEffect(() => {
    migrateFromLocalStorage().then(() => loadAll());
  }, []);

  const handleSign = async (contract: DBContract) => {
    try {
      const res = await fetch(`/api/contracts/${contract.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active", signedAt: new Date().toISOString(), signedBy: "First Party" }),
      });
      if (res.ok) { toast({ title: isRtl ? "تم التوقيع ✓" : "Signed ✓" }); loadAll(); }
    } catch { toast({ variant: "destructive", title: isRtl ? "خطأ" : "Error" }); }
  };

  const handleDelete = async (contract: DBContract) => {
    if (!confirm(isRtl ? `حذف العقد ${contract.contractNumber}؟` : `Delete ${contract.contractNumber}?`)) return;
    try {
      await fetch(`/api/contracts/${contract.id}`, { method: "DELETE" });
      toast({ title: isRtl ? "تم الحذف" : "Deleted" });
      loadAll();
    } catch { toast({ variant: "destructive", title: isRtl ? "خطأ" : "Error" }); }
  };

  const handlePrint = (contract: DBContract) => {
    const lsContract: LSContract = {
      id: contract.localId || String(contract.id),
      contractNumber: contract.contractNumber,
      proposalId: contract.proposalNumber || "",
      proposalNumber: contract.proposalNumber || "",
      clientName: contract.clientName,
      clientContact: contract.clientContact,
      clientEmail: contract.clientEmail,
      projectName: contract.projectName || "",
      projectDesc: contract.projectDesc || "",
      serviceType: (contract.serviceType as any) || "contracting",
      items: contract.items || [],
      subtotal: parseFloat(contract.subtotal),
      vatRate: parseFloat(contract.vatRate),
      vatAmount: parseFloat(contract.vatAmount),
      total: parseFloat(contract.total),
      currency: contract.currency,
      status: contract.status as any,
      clauses: contract.clauses || [],
      paymentSchedule: contract.paymentSchedule || [],
      startDate: contract.startDate || "",
      endDate: contract.endDate || "",
      createdAt: contract.createdAt,
      updatedAt: contract.createdAt,
      createdBy: "",
    };
    printContract(lsContract, isRtl);
  };

  const filtered = contracts.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.contractNumber.toLowerCase().includes(q)
      || c.clientName.toLowerCase().includes(q)
      || (c.projectName || "").toLowerCase().includes(q);
  });

  return (
    <>
      <Card className="flex-1 border-border/50 shadow-sm overflow-hidden flex flex-col h-full">
        <CardHeader className="p-4 border-b border-border/50 bg-card shrink-0">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className={cn("absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground", isRtl ? "right-3" : "left-3")} />
                <Input placeholder={t('action.search')} className={cn("h-9 bg-secondary/50 border-0", isRtl ? "pr-9" : "pl-9")}
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={loadAll}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {migrating && <span className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />{isRtl ? "جاري النقل..." : "Migrating..."}</span>}
              {migratedCount !== null && migratedCount > 0 && (
                <Badge className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 border-0">
                  {isRtl ? `نُقل ${migratedCount} عقد` : `${migratedCount} migrated`}
                </Badge>
              )}
              <span className="text-sm text-muted-foreground font-medium">{filtered.length} {isRtl ? "عقد" : "contracts"}</span>
            </div>
          </div>
        </CardHeader>

        <div className="overflow-auto flex-1 bg-card">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <FileText className="w-10 h-10 mb-3 opacity-20" />
              <p className="font-medium">{isRtl ? "لا توجد عقود" : "No contracts yet"}</p>
              <p className="text-sm mt-1">{isRtl ? "حوّل عرض سعر معتمد إلى عقد من قسم العروض الذكية" : "Convert an approved proposal to a contract from Smart Proposals"}</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-secondary/50 sticky top-0 z-10">
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className={isRtl ? "text-right" : "text-left"}>{isRtl ? "رقم العقد" : "Contract No."}</TableHead>
                  <TableHead className={isRtl ? "text-right" : "text-left"}>{isRtl ? "المشروع" : "Project"}</TableHead>
                  <TableHead className={isRtl ? "text-right" : "text-left"}>{isRtl ? "العميل" : "Client"}</TableHead>
                  <TableHead className={isRtl ? "text-right" : "text-left"}>{isRtl ? "القيمة" : "Value"}</TableHead>
                  <TableHead className={isRtl ? "text-right" : "text-left"}>{isRtl ? "المدة" : "Period"}</TableHead>
                  <TableHead className={isRtl ? "text-right" : "text-left"}>{isRtl ? "الحالة" : "Status"}</TableHead>
                  <TableHead className={isRtl ? "text-left" : "text-right"}>{isRtl ? "الإجراءات" : "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(contract => {
                  const cfg = STATUS_CFG[contract.status] ?? STATUS_CFG.draft;
                  const Icon = cfg.icon;
                  const isLinked = !!linkedMap[contract.id];
                  return (
                    <TableRow key={contract.id} className="border-border/50 hover:bg-muted/30 transition-colors group">
                      <TableCell className={cn("font-mono text-sm font-semibold", isRtl ? "text-right" : "text-left")}>
                        <div className="flex flex-col gap-1">
                          <span className="text-primary">{contract.contractNumber}</span>
                          {contract.proposalNumber && (
                            <span className="text-[10px] font-normal text-muted-foreground">{contract.proposalNumber}</span>
                          )}
                          {isLinked && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30 px-1.5 py-0.5 rounded-full w-fit border border-violet-200 dark:border-violet-800">
                              <Handshake className="w-2.5 h-2.5" />
                              {isRtl ? "شراكة" : "Partnership"}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className={cn("font-medium", isRtl ? "text-right" : "text-left")}>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate max-w-[160px]">{contract.projectName || "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell className={cn(isRtl ? "text-right" : "text-left")}>
                        <p className="font-medium text-sm">{contract.clientName}</p>
                        {contract.clientEmail && <p className="text-[10px] text-muted-foreground">{contract.clientEmail}</p>}
                      </TableCell>
                      <TableCell className={cn("font-mono font-semibold", isRtl ? "text-right" : "text-left")}>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3 text-emerald-600" />
                          {SAR(contract.total)}
                        </div>
                        <p className="text-[10px] text-muted-foreground font-normal">+{SAR(contract.vatAmount)} {isRtl ? "ض.ق.م" : "VAT"}</p>
                      </TableCell>
                      <TableCell className={cn(isRtl ? "text-right" : "text-left")}>
                        {contract.startDate ? (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <CalendarDays className="w-3 h-3" />
                            {contract.startDate} → {contract.endDate || "—"}
                          </div>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>
                      <TableCell className={cn(isRtl ? "text-right" : "text-left")}>
                        <Badge className={cn("gap-1 border-0 font-normal text-xs", cfg.cls)}>
                          <Icon className="w-3 h-3" />
                          {isRtl ? cfg.labelAr : cfg.labelEn}
                        </Badge>
                        {contract.signedAt && (
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {new Date(contract.signedAt).toLocaleDateString(isRtl ? "ar-SA" : "en-GB")}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className={cn(isRtl ? "text-left" : "text-right")}>
                        <div className={cn("flex items-center gap-1", isRtl ? "justify-start" : "justify-end")}>
                          {contract.status === "draft" && (
                            <ContractSignature
                              contractId={String(contract.id)}
                              contractTitle={contract.projectName || contract.contractNumber}
                              clientName={contract.clientName}
                              status="pending"
                              onSignComplete={() => handleSign(contract)}
                            />
                          )}

                          {/* Partnership button — manager/admin only */}
                          {canLinkPartner && (
                            isLinked ? (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-violet-500 cursor-default"
                                title={isRtl ? "تم التسجيل كشراكة" : "Registered as partnership"}>
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-violet-600"
                                onClick={() => setPartnerTarget(contract)}
                                title={isRtl ? "تسجيل كعقد شراكة" : "Register as partnership"}
                                data-testid={`button-link-partner-${contract.id}`}>
                                <Handshake className="h-4 w-4" />
                              </Button>
                            )
                          )}

                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => handlePrint(contract)} title={isRtl ? "طباعة العقد" : "Print contract"}>
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600"
                            onClick={() => handleDelete(contract)} title={isRtl ? "حذف" : "Delete"}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>

      {/* Partnership dialog */}
      <PartnerLinkDialog
        contract={partnerTarget}
        open={!!partnerTarget}
        onClose={() => setPartnerTarget(null)}
        onSaved={() => { setPartnerTarget(null); loadAll(); }}
        isRtl={isRtl}
      />
    </>
  );
}
