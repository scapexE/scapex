import { useLanguage } from "../../contexts/LanguageContext";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Search, Filter, FileText, Download, Eye, ShieldCheck, Clock,
  Loader2, RefreshCw, Trash2, Building2, CalendarDays, DollarSign
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ContractSignature } from "./ContractSignature";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { printContract, type Contract as LSContract } from "@/lib/proposals";

// ─── DB contract shape (after API parse) ──────────────────────────────────────
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
  // from terms JSON
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

export function ContractsList() {
  const { t, dir } = useLanguage();
  const isRtl = dir === "rtl";
  const { toast } = useToast();

  const [contracts, setContracts] = useState<DBContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const [search, setSearch] = useState("");
  const [migratedCount, setMigratedCount] = useState<number | null>(null);

  const fetchContracts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/contracts");
      if (res.ok) {
        const data = await res.json();
        setContracts(Array.isArray(data) ? data : []);
      }
    } catch { toast({ title: isRtl ? "خطأ في التحميل" : "Load error", variant: "destructive" }); }
    finally { setLoading(false); }
  }, []);

  // One-time migration from localStorage on first load
  const migrateFromLocalStorage = useCallback(async () => {
    const migrationDone = localStorage.getItem("scapex_contracts_migrated");
    if (migrationDone) return;
    try {
      const raw = localStorage.getItem("scapex_contracts");
      if (!raw) { localStorage.setItem("scapex_contracts_migrated", "1"); return; }
      const list = JSON.parse(raw);
      if (!list || list.length === 0) { localStorage.setItem("scapex_contracts_migrated", "1"); return; }
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
          toast({ title: isRtl ? `تم نقل ${result.imported} عقد إلى قاعدة البيانات ✓` : `Migrated ${result.imported} contracts to database ✓` });
        }
      }
    } catch { /* silent fail — will retry next load */ }
    finally { setMigrating(false); }
  }, []);

  useEffect(() => {
    migrateFromLocalStorage().then(() => fetchContracts());
  }, []);

  const handleSign = async (contract: DBContract) => {
    try {
      const res = await fetch(`/api/contracts/${contract.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active", signedAt: new Date().toISOString(), signedBy: "First Party" }),
      });
      if (res.ok) { toast({ title: isRtl ? "تم التوقيع ✓" : "Signed ✓" }); fetchContracts(); }
    } catch { toast({ variant: "destructive", title: isRtl ? "خطأ" : "Error" }); }
  };

  const handleDelete = async (contract: DBContract) => {
    if (!confirm(isRtl ? `حذف العقد ${contract.contractNumber}؟` : `Delete ${contract.contractNumber}?`)) return;
    try {
      await fetch(`/api/contracts/${contract.id}`, { method: "DELETE" });
      toast({ title: isRtl ? "تم الحذف" : "Deleted" });
      fetchContracts();
    } catch { toast({ variant: "destructive", title: isRtl ? "خطأ" : "Error" }); }
  };

  const handlePrint = (contract: DBContract) => {
    // Build a Contract object compatible with printContract
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
    <Card className="flex-1 border-border/50 shadow-sm overflow-hidden flex flex-col h-full">
      <CardHeader className="p-4 border-b border-border/50 bg-card shrink-0">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className={cn("absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground", isRtl ? "right-3" : "left-3")} />
              <Input placeholder={t('action.search')} className={cn("h-9 bg-secondary/50 border-0", isRtl ? "pr-9" : "pl-9")}
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={fetchContracts}>
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
                return (
                  <TableRow key={contract.id} className="border-border/50 hover:bg-muted/30 transition-colors group">
                    <TableCell className={cn("font-mono text-sm font-semibold text-primary", isRtl ? "text-right" : "text-left")}>
                      {contract.contractNumber}
                      {contract.proposalNumber && (
                        <p className="text-[10px] font-normal text-muted-foreground mt-0.5">{contract.proposalNumber}</p>
                      )}
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
  );
}
