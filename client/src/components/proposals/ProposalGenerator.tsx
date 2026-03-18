import { useState, useCallback } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  HardHat, Leaf, ShieldAlert, Flame, Building2, RefreshCcw,
  Bot, Wand2, FileText, CheckCircle2, Calculator, ArrowRight,
  Save, Send, FilePlus2, Trash2, Plus, Pencil, ChevronDown, ChevronUp,
  Clock, User, Phone, Mail, Percent, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  type ServiceType, type Proposal, type ProposalItem, type ProposalStatus,
  SERVICE_META, STATUS_META,
  generateAITemplate, generateId, generateProposalNumber, saveProposal, getProposals, deleteProposal,
} from "@/lib/proposals";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  HardHat, Leaf, ShieldAlert, Flame, Building2, RefreshCcw,
};

const SERVICE_TYPES = Object.entries(SERVICE_META).map(([id, meta]) => ({
  id: id as ServiceType,
  ...meta,
}));

type View = "create" | "list" | "detail";

// ─── Proposal List ────────────────────────────────────────────────────────────
function ProposalList({
  proposals, isRtl,
  onNew, onView, onDelete,
}: {
  proposals: Proposal[]; isRtl: boolean;
  onNew: () => void; onView: (p: Proposal) => void; onDelete: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<ProposalStatus | "all">("all");

  const filtered = proposals.filter((p) => {
    const matchesSearch =
      p.clientName.toLowerCase().includes(search.toLowerCase()) ||
      p.proposalNumber.toLowerCase().includes(search.toLowerCase()) ||
      p.projectName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === "all" || p.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const totalValue = filtered.reduce((s, p) => s + p.total, 0);

  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["draft","sent","approved","rejected"] as ProposalStatus[]).map((s) => {
          const count = proposals.filter((p) => p.status === s).length;
          const meta = STATUS_META[s];
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(filterStatus === s ? "all" : s)}
              className={cn(
                "flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all",
                meta.bg, meta.border,
                filterStatus === s ? "ring-2 ring-primary" : "hover:shadow-sm"
              )}
            >
              <span className={cn("text-2xl font-bold", meta.color)}>{count}</span>
              <span className={cn("text-xs mt-0.5", meta.color)}>
                {isRtl ? meta.labelAr : meta.labelEn}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search + filter */}
      <div className="flex gap-3 items-center">
        <Input
          placeholder={isRtl ? "بحث باسم العميل أو رقم العرض..." : "Search by client or proposal number..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-secondary/30"
        />
        <Button size="sm" className="gap-1.5 shrink-0" onClick={onNew}>
          <Plus className="w-4 h-4" />
          {isRtl ? "عرض جديد" : "New Proposal"}
        </Button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <FileText className="w-12 h-12 mb-3 opacity-20" />
          <p className="font-medium">{isRtl ? "لا توجد عروض" : "No proposals found"}</p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground flex justify-between px-1">
            <span>{isRtl ? `${filtered.length} عرض` : `${filtered.length} proposal(s)`}</span>
            <span>{isRtl ? `الإجمالي: ${totalValue.toLocaleString()} ر.س` : `Total: SAR ${totalValue.toLocaleString()}`}</span>
          </div>
          {filtered.map((proposal) => {
            const svc = SERVICE_META[proposal.serviceType];
            const st = STATUS_META[proposal.status];
            const Icon = ICONS[svc.iconName] ?? FileText;
            return (
              <div
                key={proposal.id}
                className="flex items-center gap-3 p-3.5 rounded-xl border border-border/50 bg-card hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer group"
                onClick={() => onView(proposal)}
              >
                <div className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-white",
                  `bg-${svc.color}-500`
                )}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-muted-foreground">{proposal.proposalNumber}</span>
                    <Badge className={cn("text-[10px] px-1.5 py-0 border", st.bg, st.color, st.border)}>
                      {isRtl ? st.labelAr : st.labelEn}
                    </Badge>
                    {proposal.aiGenerated && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-primary border-primary/30 bg-primary/5">
                        <Bot className="w-2.5 h-2.5 me-0.5" /> AI
                      </Badge>
                    )}
                  </div>
                  <p className="font-semibold text-sm mt-0.5 truncate">{proposal.clientName}</p>
                  <p className="text-xs text-muted-foreground truncate">{proposal.projectName}</p>
                </div>
                <div className="text-end shrink-0">
                  <p className="font-bold text-sm font-mono">{proposal.total.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">{proposal.currency}</p>
                </div>
                <button
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 text-muted-foreground"
                  onClick={(e) => { e.stopPropagation(); onDelete(proposal.id); }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Item Editor Row ──────────────────────────────────────────────────────────
function ItemRow({
  item, isRtl, onChange, onDelete,
}: {
  item: ProposalItem; isRtl: boolean;
  onChange: (updated: ProposalItem) => void;
  onDelete: () => void;
}) {
  const update = (field: keyof ProposalItem, value: string | number) => {
    const updated = { ...item, [field]: value };
    if (field === "qty" || field === "unitPrice") {
      updated.total = Number(updated.qty) * Number(updated.unitPrice);
    }
    onChange(updated);
  };

  return (
    <tr className="border-b border-border/40 hover:bg-secondary/20 group">
      <td className="px-2 py-2">
        <input
          value={isRtl ? item.descAr : item.descEn}
          onChange={(e) => update(isRtl ? "descAr" : "descEn", e.target.value)}
          className="w-full bg-transparent text-sm outline-none focus:bg-secondary/30 rounded px-1 py-0.5 min-w-[160px]"
        />
      </td>
      <td className="px-2 py-2">
        <input
          type="number" value={item.qty}
          onChange={(e) => update("qty", Number(e.target.value))}
          className="w-16 bg-transparent text-sm outline-none focus:bg-secondary/30 rounded px-1 py-0.5 text-center"
        />
      </td>
      <td className="px-2 py-2 text-xs text-muted-foreground">{item.unit}</td>
      <td className="px-2 py-2">
        <input
          type="number" value={item.unitPrice}
          onChange={(e) => update("unitPrice", Number(e.target.value))}
          className="w-24 bg-transparent text-sm outline-none focus:bg-secondary/30 rounded px-1 py-0.5 text-end font-mono"
        />
      </td>
      <td className="px-2 py-2 text-end font-mono text-sm font-medium">
        {item.total.toLocaleString()}
      </td>
      <td className="px-2 py-2">
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50 hover:text-red-600 text-muted-foreground"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
  );
}

// ─── Proposal Detail / Editor ─────────────────────────────────────────────────
function ProposalDetail({
  proposal: initialProposal, isRtl,
  onBack, onSave,
}: {
  proposal: Proposal; isRtl: boolean;
  onBack: () => void; onSave: (p: Proposal) => void;
}) {
  const { toast } = useToast();
  const [proposal, setProposal] = useState<Proposal>(initialProposal);
  const [showScope, setShowScope] = useState(true);
  const svc = SERVICE_META[proposal.serviceType];
  const st = STATUS_META[proposal.status];

  const update = (field: keyof Proposal, value: unknown) => {
    setProposal((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === "items") {
        const items = value as ProposalItem[];
        const subtotal = items.reduce((s, i) => s + i.total, 0);
        const vatAmount = Math.round(subtotal * updated.vatRate / 100);
        updated.subtotal = subtotal;
        updated.vatAmount = vatAmount;
        updated.total = subtotal + vatAmount;
      }
      return updated;
    });
  };

  const addItem = () => {
    const newItem: ProposalItem = {
      id: generateId(),
      descAr: "بند جديد",
      descEn: "New Item",
      qty: 1,
      unit: "مقطوع / Lump Sum",
      unitPrice: 0,
      total: 0,
    };
    update("items", [...proposal.items, newItem]);
  };

  const updateItem = (idx: number, updated: ProposalItem) => {
    const items = [...proposal.items];
    items[idx] = updated;
    update("items", items);
  };

  const deleteItem = (idx: number) => {
    update("items", proposal.items.filter((_, i) => i !== idx));
  };

  const handleStatusChange = (status: ProposalStatus) => {
    const now = new Date().toISOString();
    const updates: Partial<Proposal> = { status };
    if (status === "sent") updates.sentAt = now;
    if (status === "approved") updates.approvedAt = now;
    if (status === "rejected") updates.rejectedAt = now;
    setProposal((prev) => ({ ...prev, ...updates }));
  };

  const handleSave = () => {
    const updated = { ...proposal, updatedAt: new Date().toISOString() };
    onSave(updated);
    toast({
      title: isRtl ? "تم الحفظ" : "Saved",
      description: isRtl ? "تم حفظ العرض بنجاح." : "Proposal saved successfully.",
    });
  };

  const handleConvert = (target: "contract" | "invoice") => {
    const newStatus: ProposalStatus = target === "contract" ? "converted_contract" : "converted_invoice";
    handleStatusChange(newStatus);
    toast({
      title: isRtl
        ? (target === "contract" ? "تم التحويل إلى عقد" : "تم التحويل إلى فاتورة")
        : (target === "contract" ? "Converted to Contract" : "Converted to Invoice"),
      description: isRtl ? "سيظهر في الوحدة المعنية قريباً." : "Will appear in the relevant module soon.",
    });
  };

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 h-8">
            {isRtl ? <ArrowRight className="w-4 h-4" /> : <ArrowRight className="w-4 h-4 rotate-180" />}
            {isRtl ? "العروض" : "Proposals"}
          </Button>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm font-mono font-medium">{proposal.proposalNumber}</span>
          <Badge className={cn("text-[10px] px-1.5 border", st.bg, st.color, st.border)}>
            {isRtl ? st.labelAr : st.labelEn}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {proposal.status === "draft" && (
            <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={() => handleStatusChange("sent")}>
              <Send className="w-3.5 h-3.5" />
              {isRtl ? "إرسال للعميل" : "Send to Client"}
            </Button>
          )}
          {proposal.status === "sent" && (
            <>
              <Button size="sm" variant="outline" className="gap-1.5 h-8 text-emerald-600 border-emerald-300" onClick={() => handleStatusChange("approved")}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isRtl ? "اعتماد" : "Approve"}
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5 h-8 text-red-600 border-red-300" onClick={() => handleStatusChange("rejected")}>
                <X className="w-3.5 h-3.5" />
                {isRtl ? "رفض" : "Reject"}
              </Button>
            </>
          )}
          {proposal.status === "approved" && (
            <>
              <Button size="sm" className="gap-1.5 h-8 bg-violet-600 hover:bg-violet-700" onClick={() => handleConvert("contract")}>
                <FilePlus2 className="w-3.5 h-3.5" />
                {isRtl ? "تحويل لعقد" : "Convert to Contract"}
              </Button>
              <Button size="sm" className="gap-1.5 h-8 bg-cyan-600 hover:bg-cyan-700" onClick={() => handleConvert("invoice")}>
                <FilePlus2 className="w-3.5 h-3.5" />
                {isRtl ? "تحويل لفاتورة" : "Convert to Invoice"}
              </Button>
            </>
          )}
          <Button size="sm" className="gap-1.5 h-8" onClick={handleSave}>
            <Save className="w-3.5 h-3.5" />
            {isRtl ? "حفظ" : "Save"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Left: Client + Project Info */}
        <div className="space-y-4">
          <Card className="border-border/50">
            <CardHeader className="py-3 px-4 border-b border-border/40 bg-secondary/20">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                {isRtl ? "معلومات العميل" : "Client Information"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">{isRtl ? "اسم العميل / الجهة" : "Client / Entity"}</Label>
                <Input value={proposal.clientName} onChange={(e) => update("clientName", e.target.value)} className="mt-1 h-8 text-sm bg-secondary/20" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> {isRtl ? "رقم التواصل" : "Contact"}</Label>
                <Input value={proposal.clientContact || ""} onChange={(e) => update("clientContact", e.target.value)} className="mt-1 h-8 text-sm bg-secondary/20" placeholder="+966 5x xxx xxxx" dir="ltr" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" /> {isRtl ? "البريد الإلكتروني" : "Email"}</Label>
                <Input value={proposal.clientEmail || ""} onChange={(e) => update("clientEmail", e.target.value)} className="mt-1 h-8 text-sm bg-secondary/20" dir="ltr" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="py-3 px-4 border-b border-border/40 bg-secondary/20">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                {isRtl ? "معلومات العرض" : "Proposal Details"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">{isRtl ? "اسم المشروع" : "Project Name"}</Label>
                <Input value={proposal.projectName} onChange={(e) => update("projectName", e.target.value)} className="mt-1 h-8 text-sm bg-secondary/20" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{isRtl ? "وصف المشروع" : "Project Description"}</Label>
                <Textarea value={proposal.projectDesc} onChange={(e) => update("projectDesc", e.target.value)} className="mt-1 text-sm bg-secondary/20 resize-none min-h-[80px]" />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> {isRtl ? "صلاحية (أيام)" : "Valid (days)"}</Label>
                  <Input type="number" value={proposal.validity} onChange={(e) => update("validity", Number(e.target.value))} className="mt-1 h-8 text-sm bg-secondary/20" />
                </div>
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1"><Percent className="w-3 h-3" /> {isRtl ? "ضريبة القيمة المضافة" : "VAT %"}</Label>
                  <Input type="number" value={proposal.vatRate} onChange={(e) => update("vatRate", Number(e.target.value))} className="mt-1 h-8 text-sm bg-secondary/20" />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{isRtl ? "ملاحظات" : "Notes"}</Label>
                <Textarea value={proposal.notes || ""} onChange={(e) => update("notes", e.target.value)} className="mt-1 text-sm bg-secondary/20 resize-none min-h-[60px]" />
              </div>
            </CardContent>
          </Card>

          {/* Financial summary */}
          <Card className="border-primary/20 bg-primary/3">
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{isRtl ? "المجموع قبل الضريبة" : "Subtotal"}</span>
                <span className="font-mono">{proposal.subtotal.toLocaleString()} {proposal.currency}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{isRtl ? `ضريبة القيمة المضافة (${proposal.vatRate}%)` : `VAT (${proposal.vatRate}%)`}</span>
                <span className="font-mono">{proposal.vatAmount.toLocaleString()} {proposal.currency}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-base">
                <span>{isRtl ? "الإجمالي الكلي" : "Grand Total"}</span>
                <span className="text-primary font-mono">{proposal.total.toLocaleString()} {proposal.currency}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Scope + Items */}
        <div className="xl:col-span-2 space-y-4">
          {/* Scope of Work */}
          <Card className="border-border/50">
            <CardHeader
              className="py-3 px-4 border-b border-border/40 bg-secondary/20 cursor-pointer"
              onClick={() => setShowScope(!showScope)}
            >
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  {isRtl ? "نطاق العمل (Scope of Work)" : "Scope of Work"}
                </span>
                {showScope ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </CardTitle>
            </CardHeader>
            {showScope && (
              <CardContent className="p-4">
                <Textarea
                  value={isRtl ? (proposal.notes ?? "") : (proposal.projectDesc ?? "")}
                  onChange={(e) => update(isRtl ? "notes" : "projectDesc", e.target.value)}
                  className="text-sm bg-secondary/20 resize-none min-h-[100px]"
                  placeholder={isRtl ? "وصف تفصيلي لنطاق العمل..." : "Detailed scope of work description..."}
                />
              </CardContent>
            )}
          </Card>

          {/* Line Items */}
          <Card className="border-border/50">
            <CardHeader className="py-3 px-4 border-b border-border/40 bg-secondary/20">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-muted-foreground" />
                  {isRtl ? "بنود الأعمال والأسعار" : "Work Items & Pricing"}
                </span>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={addItem}>
                  <Plus className="w-3 h-3" />
                  {isRtl ? "إضافة بند" : "Add Item"}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/40 border-b border-border/40">
                    <tr>
                      <th className="px-3 py-2 text-start font-medium text-muted-foreground">{isRtl ? "الوصف" : "Description"}</th>
                      <th className="px-2 py-2 text-center font-medium text-muted-foreground w-14">{isRtl ? "الكمية" : "Qty"}</th>
                      <th className="px-2 py-2 text-center font-medium text-muted-foreground w-24">{isRtl ? "الوحدة" : "Unit"}</th>
                      <th className="px-2 py-2 text-end font-medium text-muted-foreground w-28">{isRtl ? "سعر الوحدة" : "Unit Price"}</th>
                      <th className="px-2 py-2 text-end font-medium text-muted-foreground w-28">{isRtl ? "الإجمالي (ر.س)" : "Total (SAR)"}</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {proposal.items.map((item, idx) => (
                      <ItemRow
                        key={item.id}
                        item={item}
                        isRtl={isRtl}
                        onChange={(updated) => updateItem(idx, updated)}
                        onDelete={() => deleteItem(idx)}
                      />
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-border bg-secondary/20">
                    <tr>
                      <td colSpan={4} className="px-3 py-2 text-end font-semibold text-sm">
                        {isRtl ? "المجموع قبل الضريبة:" : "Subtotal:"}
                      </td>
                      <td className="px-2 py-2 text-end font-bold font-mono text-primary">
                        {proposal.subtotal.toLocaleString()}
                      </td>
                      <td />
                    </tr>
                    <tr>
                      <td colSpan={4} className="px-3 py-1.5 text-end text-xs text-muted-foreground">
                        {isRtl ? `ضريبة القيمة المضافة (${proposal.vatRate}%):` : `VAT (${proposal.vatRate}%):`}
                      </td>
                      <td className="px-2 py-1.5 text-end font-mono text-xs text-muted-foreground">
                        {proposal.vatAmount.toLocaleString()}
                      </td>
                      <td />
                    </tr>
                    <tr className="bg-primary/5">
                      <td colSpan={4} className="px-3 py-2.5 text-end font-bold">
                        {isRtl ? "الإجمالي الكلي شامل الضريبة:" : "Grand Total incl. VAT:"}
                      </td>
                      <td className="px-2 py-2.5 text-end font-bold font-mono text-primary text-base">
                        {proposal.total.toLocaleString()}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Create / Generate ────────────────────────────────────────────────────────
function CreateProposal({
  isRtl, onCreated, onCancel,
}: {
  isRtl: boolean;
  onCreated: (p: Proposal) => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientContact, setClientContact] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [useAI, setUseAI] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleCreate = useCallback(() => {
    if (!selectedService || !clientName || !projectDesc) {
      toast({
        title: isRtl ? "بيانات مفقودة" : "Missing Information",
        description: isRtl ? "يرجى اختيار نوع الخدمة وإدخال بيانات العميل والمشروع." : "Please select service type and fill client & project details.",
        variant: "destructive",
      });
      return;
    }
    setIsGenerating(true);
    setTimeout(() => {
      const template = useAI ? generateAITemplate(selectedService, projectDesc, isRtl) : null;
      const subtotal = template ? template.items.reduce((s, i) => s + i.total, 0) : 0;
      const vatAmount = Math.round(subtotal * 15 / 100);
      const now = new Date().toISOString();
      const newProposal: Proposal = {
        id: generateId(),
        proposalNumber: generateProposalNumber(),
        clientName,
        clientContact,
        clientEmail,
        projectName: projectName || (isRtl ? `مشروع ${clientName}` : `${clientName} Project`),
        projectDesc,
        serviceType: selectedService,
        items: template
          ? template.items.map((item) => ({ ...item, id: generateId() }))
          : [],
        subtotal,
        vatRate: 15,
        vatAmount,
        total: subtotal + vatAmount,
        currency: "SAR",
        status: "draft",
        notes: "",
        validity: SERVICE_META[selectedService].defaultValidity,
        aiGenerated: useAI,
        createdAt: now,
        updatedAt: now,
        createdBy: JSON.parse(localStorage.getItem("user") || "{}").name || "Admin",
      };
      setIsGenerating(false);
      onCreated(newProposal);
      toast({
        title: useAI
          ? (isRtl ? "تم توليد العرض بالذكاء الاصطناعي!" : "AI Proposal Generated!")
          : (isRtl ? "تم إنشاء العرض" : "Proposal Created"),
        description: isRtl ? "يمكنك الآن مراجعة البنود وتعديلها." : "You can now review and edit the items.",
      });
    }, useAI ? 2000 : 400);
  }, [selectedService, clientName, clientContact, clientEmail, projectName, projectDesc, useAI, isRtl, onCreated, toast]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel} className="gap-1.5 h-8">
          {isRtl ? <ArrowRight className="w-4 h-4" /> : <ArrowRight className="w-4 h-4 rotate-180" />}
          {isRtl ? "العروض" : "Proposals"}
        </Button>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium">{isRtl ? "عرض جديد" : "New Proposal"}</span>
      </div>

      <Card className="border-primary/20 shadow-md">
        <CardHeader className="bg-primary/5 border-b border-primary/10">
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            {isRtl ? "إنشاء عرض سعر جديد" : "Create New Proposal"}
          </CardTitle>
          <CardDescription>
            {isRtl ? "اختر نوع الخدمة وأدخل بيانات العميل والمشروع" : "Select service type and enter client & project details"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">

          {/* Service selection */}
          <div className="space-y-3">
            <Label className="font-semibold">{isRtl ? "نوع الخدمة *" : "Service Type *"}</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {SERVICE_TYPES.map((svc) => {
                const Icon = ICONS[svc.iconName] ?? FileText;
                const isSelected = selectedService === svc.id;
                return (
                  <button
                    key={svc.id}
                    onClick={() => setSelectedService(svc.id)}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all gap-2 text-center",
                      isSelected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border/50 hover:border-primary/30 hover:bg-secondary/50"
                    )}
                  >
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white", `bg-${svc.color}-500`)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-medium leading-tight">
                      {isRtl ? svc.labelAr : svc.labelEn}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Client info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label>{isRtl ? "اسم العميل / الجهة *" : "Client / Entity Name *"}</Label>
              <Input
                className="mt-1.5 bg-secondary/30"
                placeholder={isRtl ? "مثال: شركة نيوم، أمانة الرياض..." : "e.g. NEOM, Riyadh Municipality..."}
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </div>
            <div>
              <Label className="flex items-center gap-1"><Phone className="w-3 h-3" /> {isRtl ? "رقم التواصل" : "Contact"}</Label>
              <Input className="mt-1.5 bg-secondary/30" placeholder="+966 5x xxx xxxx" dir="ltr" value={clientContact} onChange={(e) => setClientContact(e.target.value)} />
            </div>
            <div>
              <Label className="flex items-center gap-1"><Mail className="w-3 h-3" /> {isRtl ? "البريد الإلكتروني" : "Email"}</Label>
              <Input className="mt-1.5 bg-secondary/30" dir="ltr" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>{isRtl ? "اسم المشروع" : "Project Name"}</Label>
            <Input
              className="mt-1.5 bg-secondary/30"
              placeholder={isRtl ? "اترك فارغاً لتوليده تلقائياً..." : "Leave blank to auto-generate..."}
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
          </div>

          <div>
            <Label className="flex items-center justify-between">
              <span>{isRtl ? "متطلبات المشروع (مختصرة) *" : "Brief Project Requirements *"}</span>
              <Badge variant="outline" className="text-[10px] text-primary bg-primary/5 border-primary/30">
                <Wand2 className="w-3 h-3 me-0.5" />
                {isRtl ? "يُغذّي الذكاء الاصطناعي" : "Feeds AI Engine"}
              </Badge>
            </Label>
            <Textarea
              className="mt-1.5 bg-secondary/30 min-h-[100px] resize-none"
              placeholder={isRtl
                ? "صف المشروع: المساحة، نوع الأعمال، المتطلبات الخاصة، الموقع..."
                : "Describe the project: area, work type, special requirements, location..."}
              value={projectDesc}
              onChange={(e) => setProjectDesc(e.target.value)}
            />
          </div>

          {/* AI toggle */}
          <div
            className={cn(
              "flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all",
              useAI ? "border-primary bg-primary/5" : "border-border/40 bg-secondary/20"
            )}
            onClick={() => setUseAI(!useAI)}
          >
            <div className="flex items-center gap-2.5">
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", useAI ? "bg-primary text-white" : "bg-secondary")}>
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">{isRtl ? "توليد البنود بالذكاء الاصطناعي" : "AI-Generated Items"}</p>
                <p className="text-xs text-muted-foreground">
                  {isRtl ? "تلقائي بناءً على نوع الخدمة والوصف" : "Auto-generated based on service type & description"}
                </p>
              </div>
            </div>
            <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center", useAI ? "border-primary bg-primary" : "border-border")}>
              {useAI && <CheckCircle2 className="w-3 h-3 text-white" />}
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-secondary/20 border-t border-border/40 py-4">
          <Button
            className="w-full font-bold shadow-sm h-11 group"
            onClick={handleCreate}
            disabled={!selectedService || isGenerating}
          >
            {isGenerating ? (
              <>
                <Bot className="w-5 h-5 me-2 animate-bounce" />
                {useAI
                  ? (isRtl ? "الذكاء الاصطناعي يحلّل ويولّد البنود..." : "AI is analyzing & generating items...")
                  : (isRtl ? "جارٍ الإنشاء..." : "Creating...")}
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5 me-2 text-amber-300" />
                {useAI
                  ? (isRtl ? "توليد عرض السعر بالذكاء الاصطناعي" : "Generate AI Proposal")
                  : (isRtl ? "إنشاء عرض فارغ" : "Create Blank Proposal")}
                <ArrowRight className="w-4 h-4 ms-auto opacity-50 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

// ─── Main ProposalGenerator ───────────────────────────────────────────────────
export function ProposalGenerator() {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";
  const { toast } = useToast();

  const [view, setView] = useState<View>("list");
  const [proposals, setProposals] = useState<Proposal[]>(() => getProposals());
  const [activeProposal, setActiveProposal] = useState<Proposal | null>(null);

  const handleCreated = (p: Proposal) => {
    saveProposal(p);
    setProposals(getProposals());
    setActiveProposal(p);
    setView("detail");
  };

  const handleSave = (p: Proposal) => {
    saveProposal(p);
    setProposals(getProposals());
    setActiveProposal(p);
  };

  const handleDelete = (id: string) => {
    deleteProposal(id);
    setProposals(getProposals());
    toast({ title: isRtl ? "تم الحذف" : "Deleted", description: isRtl ? "تم حذف العرض." : "Proposal deleted." });
  };

  const handleView = (p: Proposal) => {
    setActiveProposal(p);
    setView("detail");
  };

  if (view === "create") {
    return (
      <CreateProposal
        isRtl={isRtl}
        onCreated={handleCreated}
        onCancel={() => setView("list")}
      />
    );
  }

  if (view === "detail" && activeProposal) {
    return (
      <ProposalDetail
        proposal={activeProposal}
        isRtl={isRtl}
        onBack={() => setView("list")}
        onSave={handleSave}
      />
    );
  }

  return (
    <ProposalList
      proposals={proposals}
      isRtl={isRtl}
      onNew={() => setView("create")}
      onView={handleView}
      onDelete={handleDelete}
    />
  );
}
