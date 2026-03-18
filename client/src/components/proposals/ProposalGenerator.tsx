import { useState, useCallback, useEffect } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
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
  Save, Send, FilePlus2, Trash2, Plus, X, Clock, User, Phone,
  Mail, Percent, FileSignature, Printer, TrendingUp, BarChart2,
  ChevronDown, ChevronUp, Eye, ClipboardList, CreditCard, Lightbulb,
  AlertCircle, CheckCheck, FileCheck, Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  type ServiceType, type Proposal, type ProposalItem,
  type ProposalStatus, type Contract,
  type PriceRegion, type ProjectSize, type ProposalPriceAnalysis,
  SERVICE_META, STATUS_META, REGION_META, SIZE_META,
  generateAITemplate, generateId, generateProposalNumber,
  saveProposal, getProposals, deleteProposal,
  generateContractFromProposal, saveContract, getContracts,
  getPriceSuggestions, analyzeProposalPrices, getSmartPricing,
  printProposal, printContract,
} from "@/lib/proposals";
import { getActiveCompany } from "@/lib/company-services";
import { PhoneInput } from "@/components/ui/phone-input";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  HardHat, Leaf, ShieldAlert, Flame, Building2, RefreshCcw,
};
const SERVICE_TYPES = Object.entries(SERVICE_META).map(([id, meta]) => ({ id: id as ServiceType, ...meta }));
type View = "list" | "create" | "detail" | "contract";

// ─── Proposal List ────────────────────────────────────────────────────────────
function ProposalList({ proposals, isRtl, onNew, onView, onDelete }: {
  proposals: Proposal[]; isRtl: boolean;
  onNew: () => void; onView: (p: Proposal) => void; onDelete: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<ProposalStatus | "all">("all");
  const filtered = proposals.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = p.clientName.toLowerCase().includes(q) || p.proposalNumber.toLowerCase().includes(q) || p.projectName.toLowerCase().includes(q);
    const matchStatus = filterStatus === "all" || p.status === filterStatus;
    return matchSearch && matchStatus;
  });
  const totalVal = filtered.reduce((s, p) => s + p.total, 0);
  const approvedVal = proposals.filter((p) => p.status === "approved" || p.status === "converted_contract" || p.status === "converted_invoice").reduce((s, p) => s + p.total, 0);

  return (
    <div className="space-y-5">
      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["draft", "sent", "approved", "rejected"] as ProposalStatus[]).map((s) => {
          const cnt = proposals.filter((p) => p.status === s).length;
          const m = STATUS_META[s];
          return (
            <button key={s} onClick={() => setFilterStatus(filterStatus === s ? "all" : s)}
              className={cn("flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition-all", m.bg, m.border, filterStatus === s ? "ring-2 ring-primary shadow-sm" : "hover:shadow-sm")}>
              <span className={cn("text-2xl font-bold font-mono", m.color)}>{cnt}</span>
              <span className={cn("text-xs mt-0.5 font-medium", m.color)}>{isRtl ? m.labelAr : m.labelEn}</span>
            </button>
          );
        })}
      </div>

      {/* Revenue summary */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[160px] bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><TrendingUp className="w-4 h-4 text-primary" /></div>
          <div>
            <p className="text-xs text-muted-foreground">{isRtl ? "إجمالي الأعمال (معتمدة)" : "Approved Revenue"}</p>
            <p className="font-bold text-sm font-mono text-primary">{approvedVal.toLocaleString()} {isRtl ? "ر.س" : "SAR"}</p>
          </div>
        </div>
        <div className="flex-1 min-w-[160px] bg-secondary/40 border border-border/50 rounded-xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center"><BarChart2 className="w-4 h-4 text-muted-foreground" /></div>
          <div>
            <p className="text-xs text-muted-foreground">{isRtl ? "إجمالي العروض المعروضة" : "Total Proposals Value"}</p>
            <p className="font-bold text-sm font-mono">{totalVal.toLocaleString()} {isRtl ? "ر.س" : "SAR"}</p>
          </div>
        </div>
      </div>

      {/* Search + new */}
      <div className="flex gap-3 items-center">
        <Input placeholder={isRtl ? "بحث باسم العميل أو رقم العرض أو المشروع..." : "Search by client, proposal no. or project..."}
          value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 bg-secondary/30" />
        <Button size="sm" className="gap-1.5 shrink-0 h-9" onClick={onNew}>
          <Plus className="w-4 h-4" />{isRtl ? "عرض جديد" : "New Proposal"}
        </Button>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <FileText className="w-14 h-14 mb-3 opacity-15" />
          <p className="font-medium text-base">{isRtl ? "لا توجد عروض" : "No proposals found"}</p>
          <p className="text-sm mt-1">{isRtl ? "ابدأ بإنشاء أول عرض سعر" : "Create your first proposal to get started"}</p>
          <Button size="sm" className="mt-4 gap-1.5" onClick={onNew}><Plus className="w-4 h-4" />{isRtl ? "إنشاء عرض سعر" : "Create Proposal"}</Button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground px-1">{isRtl ? `${filtered.length} عرض` : `${filtered.length} proposal(s)`}</p>
          {filtered.map((proposal) => {
            const svc = SERVICE_META[proposal.serviceType];
            const st = STATUS_META[proposal.status];
            const Icon = ICONS[svc.iconName] ?? FileText;
            return (
              <div key={proposal.id}
                className="flex items-center gap-3 p-3.5 rounded-xl border border-border/50 bg-card hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer group"
                onClick={() => onView(proposal)}>
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white", `bg-${svc.color}-500`)}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-muted-foreground">{proposal.proposalNumber}</span>
                    <Badge className={cn("text-[10px] px-1.5 py-0 border", st.bg, st.color, st.border)}>{isRtl ? st.labelAr : st.labelEn}</Badge>
                    {proposal.aiGenerated && <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-primary border-primary/30 bg-primary/5"><Bot className="w-2.5 h-2.5 me-0.5" />AI</Badge>}
                    {(proposal.status === "converted_contract" && proposal.convertedToContractId) && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-violet-600 border-violet-300 bg-violet-50"><FileSignature className="w-2.5 h-2.5 me-0.5" />{isRtl ? "عقد" : "Contract"}</Badge>
                    )}
                  </div>
                  <p className="font-semibold text-sm mt-0.5 truncate">{proposal.clientName}</p>
                  <p className="text-xs text-muted-foreground truncate">{proposal.projectName}</p>
                </div>
                <div className="text-end shrink-0">
                  <p className="font-bold text-sm font-mono">{proposal.total.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">{proposal.currency}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(proposal.createdAt).toLocaleDateString(isRtl ? "ar-SA" : "en-US")}</p>
                </div>
                <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 text-muted-foreground"
                  onClick={(e) => { e.stopPropagation(); onDelete(proposal.id); }}>
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

// ─── Item Row ─────────────────────────────────────────────────────────────────
function ItemRow({ item, isRtl, onChange, onDelete }: {
  item: ProposalItem; isRtl: boolean;
  onChange: (u: ProposalItem) => void; onDelete: () => void;
}) {
  const upd = (field: keyof ProposalItem, val: string | number) => {
    const u = { ...item, [field]: val };
    if (field === "qty" || field === "unitPrice") u.total = Number(u.qty) * Number(u.unitPrice);
    onChange(u);
  };
  return (
    <tr className="border-b border-border/40 hover:bg-secondary/20 group">
      <td className="px-2 py-2">
        <input value={isRtl ? item.descAr : item.descEn} onChange={(e) => upd(isRtl ? "descAr" : "descEn", e.target.value)}
          className="w-full bg-transparent text-sm outline-none focus:bg-secondary/30 rounded px-1 py-0.5 min-w-[150px]" />
      </td>
      <td className="px-2 py-2">
        <input type="number" value={item.qty} onChange={(e) => upd("qty", Number(e.target.value))}
          className="w-14 bg-transparent text-sm outline-none focus:bg-secondary/30 rounded px-1 py-0.5 text-center" />
      </td>
      <td className="px-2 py-2">
        <input value={item.unit} onChange={(e) => upd("unit", e.target.value)}
          className="w-24 bg-transparent text-xs outline-none focus:bg-secondary/30 rounded px-1 py-0.5 text-muted-foreground" />
      </td>
      <td className="px-2 py-2">
        <input type="number" value={item.unitPrice} onChange={(e) => upd("unitPrice", Number(e.target.value))}
          className="w-24 bg-transparent text-sm outline-none focus:bg-secondary/30 rounded px-1 py-0.5 text-end font-mono" />
      </td>
      <td className="px-2 py-2 text-end font-mono text-sm font-semibold text-primary">{item.total.toLocaleString()}</td>
      <td className="px-1 py-2">
        <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50 hover:text-red-600 text-muted-foreground">
          <X className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
  );
}

// ─── Price Suggestion Panel ────────────────────────────────────────────────────
function PriceSuggestionPanel({ serviceType, isRtl, onApply }: {
  serviceType: ServiceType; isRtl: boolean;
  onApply: (price: number) => void;
}) {
  const sugg = getPriceSuggestions(serviceType);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Lightbulb className="w-4 h-4 text-amber-500" />
        {isRtl ? "اقتراحات أسعار ذكية" : "Smart Price Suggestions"}
      </div>
      <div className="text-xs text-muted-foreground">
        {sugg.sampleCount > 0
          ? (isRtl ? `بناءً على ${sugg.sampleCount} مشروع سابق` : `Based on ${sugg.sampleCount} past projects`)
          : (isRtl ? "نماذج أسعار افتراضية للسوق السعودي" : "Default market price references")
        }
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: isRtl ? "الحد الأدنى" : "Min", val: sugg.minTotal, color: "text-emerald-600" },
          { label: isRtl ? "المتوسط" : "Avg", val: sugg.avgTotal, color: "text-primary" },
          { label: isRtl ? "الحد الأعلى" : "Max", val: sugg.maxTotal, color: "text-violet-600" },
        ].map((r) => (
          <button key={r.label} onClick={() => onApply(r.val)}
            className="flex flex-col items-center p-2.5 rounded-lg bg-secondary/40 border border-border/50 hover:border-primary/40 hover:bg-secondary transition-all">
            <span className="text-[10px] text-muted-foreground mb-1">{r.label}</span>
            <span className={cn("text-sm font-bold font-mono", r.color)}>{(r.val / 1000).toFixed(0)}K</span>
            <span className="text-[9px] text-muted-foreground">{isRtl ? "ر.س" : "SAR"}</span>
          </button>
        ))}
      </div>
      {sugg.itemSuggestions.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground">{isRtl ? "أسعار البنود الشائعة:" : "Common Item Prices:"}</p>
          {sugg.itemSuggestions.slice(0, 5).map((item, i) => (
            <div key={i} className="flex items-center justify-between text-xs p-1.5 rounded bg-secondary/30">
              <span className="text-muted-foreground truncate flex-1 pe-2">{isRtl ? item.descAr.slice(0, 28) : item.descEn.slice(0, 28)}…</span>
              <span className="font-mono font-semibold shrink-0">{item.avgPrice.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Smart Price Analyzer ─────────────────────────────────────────────────────
function SmartPriceAnalyzer({ proposal, isRtl }: { proposal: Proposal; isRtl: boolean }) {
  const [region, setRegion] = useState<PriceRegion>("riyadh");
  const [size, setSize]     = useState<ProjectSize>("medium");
  const [analysis, setAnalysis] = useState<ProposalPriceAnalysis | null>(null);

  const run = () => setAnalysis(analyzeProposalPrices(proposal, region, size));

  const levelColor = (l: string) =>
    l === "fair"    ? "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800"
    : l === "low"   ? "text-amber-600  bg-amber-50  border-amber-200  dark:bg-amber-950/30  dark:border-amber-800"
    : l === "high"  ? "text-red-600    bg-red-50    border-red-200    dark:bg-red-950/30    dark:border-red-800"
    : "text-muted-foreground bg-secondary/30 border-border/40";
  const levelIcon = (l: string) => l === "fair" ? "✓" : l === "low" ? "↓" : l === "high" ? "↑" : "?";
  const levelLabelAr = (l: string) => l === "fair" ? "تنافسي" : l === "low" ? "منخفض" : l === "high" ? "مرتفع" : "غير محدد";
  const levelLabelEn = (l: string) => l === "fair" ? "Competitive" : l === "low" ? "Low" : l === "high" ? "High" : "Unknown";

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        <div className="flex-1 min-w-[140px]">
          <Label className="text-xs text-muted-foreground">{isRtl ? "المنطقة" : "Region"}</Label>
          <div className="mt-1 flex flex-wrap gap-1">
            {(Object.entries(REGION_META) as [PriceRegion, {labelAr:string;labelEn:string}][]).map(([k,m]) => (
              <button key={k} onClick={() => { setRegion(k); setAnalysis(null); }}
                className={cn("px-2 py-0.5 rounded text-[10px] border font-medium transition-all",
                  region === k ? "border-primary bg-primary/10 text-primary" : "border-border/50 text-muted-foreground hover:border-primary/30")}>
                {isRtl ? m.labelAr : m.labelEn}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 min-w-[140px]">
          <Label className="text-xs text-muted-foreground">{isRtl ? "حجم المشروع" : "Project Size"}</Label>
          <div className="mt-1 flex flex-wrap gap-1">
            {(Object.entries(SIZE_META) as [ProjectSize, {labelAr:string;labelEn:string;descAr:string;descEn:string}][]).map(([k,m]) => (
              <button key={k} onClick={() => { setSize(k); setAnalysis(null); }}
                className={cn("px-2 py-0.5 rounded text-[10px] border font-medium transition-all",
                  size === k ? "border-primary bg-primary/10 text-primary" : "border-border/50 text-muted-foreground hover:border-primary/30")}>
                {isRtl ? m.labelAr : m.labelEn}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button onClick={run}
        className="w-full py-2 rounded-lg border-2 border-primary bg-primary/5 text-primary text-sm font-bold hover:bg-primary/10 transition-colors flex items-center justify-center gap-2">
        <BarChart2 className="w-4 h-4" />
        {isRtl ? "تحليل الأسعار الآن" : "Analyze Prices Now"}
      </button>

      {analysis && (
        <div className="space-y-3 animate-in fade-in duration-300">
          {/* Overall score */}
          <div className={cn("rounded-xl border p-3", levelColor(analysis.totalLevel))}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold">{isRtl ? "التقييم الكلي للعرض" : "Overall Proposal Rating"}</span>
              <span className="text-lg font-bold">{analysis.competitiveScore}%</span>
            </div>
            <p className="text-xs leading-relaxed">{isRtl ? analysis.summaryAr : analysis.summaryEn}</p>
            <div className="mt-2 flex gap-3 text-[10px]">
              <span>{isRtl ? "أدنى سوق:" : "Market Min:"} <strong>{analysis.marketMin.toLocaleString()}</strong></span>
              <span>{isRtl ? "متوسط:" : "Mid:"} <strong>{analysis.marketMid.toLocaleString()}</strong></span>
              <span>{isRtl ? "أعلى سوق:" : "Max:"} <strong>{analysis.marketMax.toLocaleString()}</strong></span>
            </div>
          </div>
          {/* Per-item analysis */}
          {analysis.items.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">{isRtl ? "تحليل البنود" : "Item Analysis"}</p>
              {analysis.items.map((item, i) => (
                <div key={i} className="rounded-lg border border-border/40 p-2.5 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium truncate flex-1">{isRtl ? item.descAr : item.descEn}</span>
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-bold shrink-0", levelColor(item.level))}>
                      {levelIcon(item.level)} {isRtl ? levelLabelAr(item.level) : levelLabelEn(item.level)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>{isRtl ? "السعر:" : "Price:"} <strong className="text-foreground font-mono">{item.unitPrice.toLocaleString()}</strong></span>
                    <span>|</span>
                    <span>{isRtl ? "سوق:" : "Market:"} {item.marketLow.toLocaleString()} – {item.marketHigh.toLocaleString()}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{isRtl ? item.suggestionAr : item.suggestionEn}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Create Proposal ──────────────────────────────────────────────────────────
function CreateProposal({ isRtl, onCreated, onCancel }: {
  isRtl: boolean; onCreated: (p: Proposal) => void; onCancel: () => void;
}) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientContact, setClientContact] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [useAI, setUseAI] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPrices, setShowPrices] = useState(false);
  const [region, setRegion] = useState<PriceRegion>("riyadh");
  const [projectSize, setProjectSize] = useState<ProjectSize>("medium");

  // Read CRM/Sales prefill
  useEffect(() => {
    try {
      const raw = localStorage.getItem("scapex_proposal_prefill");
      if (raw) {
        const data = JSON.parse(raw);
        if (data.clientName)    setClientName(data.clientName);
        if (data.clientContact) setClientContact(data.clientContact);
        if (data.clientEmail)   setClientEmail(data.clientEmail);
        if (data.projectName)   setProjectName(data.projectName);
        localStorage.removeItem("scapex_proposal_prefill");
        // إذا جاءت البيانات كاملة (من Pipeline) نقفز مباشرة لخطوة 3
        if (data.clientName && data.projectName) setStep(3);
        else if (data.clientName) setStep(2);
      }
    } catch {}
  }, []);

  const handleCreate = useCallback(() => {
    if (!selectedService || !clientName.trim() || !projectDesc.trim()) {
      toast({ title: isRtl ? "بيانات مفقودة" : "Missing Information", description: isRtl ? "يرجى تعبئة جميع الحقول الإلزامية." : "Please fill all required fields.", variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    setTimeout(() => {
      const template = useAI ? getSmartPricing(selectedService, region, projectSize) : null;
      const subtotal = template ? template.items.reduce((s, i) => s + i.total, 0) : 0;
      const vatAmount = Math.round(subtotal * 15 / 100);
      const now = new Date().toISOString();
      const newProposal: Proposal = {
        id: generateId(),
        proposalNumber: generateProposalNumber(),
        clientName: clientName.trim(),
        clientContact: clientContact.trim() || undefined,
        clientEmail: clientEmail.trim() || undefined,
        projectName: projectName.trim() || (isRtl ? `مشروع ${clientName.trim()}` : `${clientName.trim()} Project`),
        projectDesc: projectDesc.trim(),
        introduction: template
          ? (isRtl ? template.introAr : template.introEn)
          : (isRtl
            ? `يسعدنا تقديم عرض أسعارنا لمشروعكم الكريم (${projectDesc.trim()})، ونأمل أن يلبي تطلعاتكم ويرقى إلى مستوى ثقتكم بنا.`
            : `We are pleased to submit our proposal for your esteemed project (${projectDesc.trim()}), and we hope it meets your expectations.`),
        scopeAr: template?.scopeAr,
        scopeEn: template?.scopeEn,
        serviceType: selectedService,
        items: template ? template.items.map((item) => ({ ...item, id: generateId() })) : [],
        subtotal, vatRate: 15, vatAmount, total: subtotal + vatAmount,
        currency: "SAR", status: "draft", notes: "",
        validity: SERVICE_META[selectedService].defaultValidity,
        aiGenerated: useAI, createdAt: now, updatedAt: now,
        createdBy: JSON.parse(localStorage.getItem("user") || "{}").name || "Admin",
      };
      setIsGenerating(false);
      onCreated(newProposal);
      toast({ title: useAI ? (isRtl ? "تم توليد العرض بالذكاء الاصطناعي!" : "AI Proposal Generated!") : (isRtl ? "تم إنشاء العرض" : "Proposal Created"), description: isRtl ? "يمكنك الآن مراجعة البنود وتعديلها." : "Review and edit the items as needed." });
    }, useAI ? 2200 : 400);
  }, [selectedService, clientName, clientContact, clientEmail, projectName, projectDesc, useAI, isRtl, onCreated, toast]);

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel} className="gap-1.5 h-8">
          {isRtl ? <ArrowRight className="w-4 h-4" /> : <ArrowRight className="w-4 h-4 rotate-180" />}
          {isRtl ? "العروض" : "Proposals"}
        </Button>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium">{isRtl ? "عرض جديد" : "New Proposal"}</span>
      </div>

      {/* Step tabs */}
      <div className="flex gap-1 bg-secondary/40 rounded-xl p-1">
        {[
          { n: 1, label: isRtl ? "نوع الخدمة" : "Service Type" },
          { n: 2, label: isRtl ? "بيانات العميل" : "Client Info" },
          { n: 3, label: isRtl ? "تفاصيل المشروع" : "Project Details" },
        ].map((s) => (
          <button key={s.n} onClick={() => s.n < step || (s.n === 2 && selectedService) || (s.n === 3) ? setStep(s.n) : null}
            className={cn("flex-1 py-2 text-xs font-semibold rounded-lg transition-all", step === s.n ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
            <span className={cn("inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] me-1.5", step === s.n ? "bg-primary text-white" : step > s.n ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground")}>
              {step > s.n ? <CheckCheck className="w-3 h-3" /> : s.n}
            </span>
            {s.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          {/* Step 1: Service type */}
          {step === 1 && (
            <Card className="border-border/50">
              <CardHeader className="pb-3 border-b border-border/40 bg-secondary/20">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-muted-foreground" />
                  {isRtl ? "اختر نوع الخدمة أو النشاط" : "Select Service / Activity Type"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {SERVICE_TYPES.map((svc) => {
                    const Icon = ICONS[svc.iconName] ?? FileText;
                    const isSel = selectedService === svc.id;
                    return (
                      <button key={svc.id} onClick={() => { setSelectedService(svc.id); setStep(2); }}
                        className={cn("flex flex-col items-start p-3.5 rounded-xl border-2 cursor-pointer transition-all gap-2 text-start", isSel ? "border-primary bg-primary/5 shadow-sm" : "border-border/50 hover:border-primary/40 hover:bg-secondary/50")}>
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0", `bg-${svc.color}-500`)}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold leading-tight">{isRtl ? svc.labelAr : svc.labelEn}</p>
                          <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{isRtl ? svc.descAr : svc.descEn}</p>
                        </div>
                        {isSel && <CheckCircle2 className="w-4 h-4 text-primary absolute top-2 end-2" />}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Client info */}
          {step === 2 && (
            <Card className="border-border/50">
              <CardHeader className="pb-3 border-b border-border/40 bg-secondary/20">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  {isRtl ? "معلومات العميل" : "Client Information"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div>
                  <Label className="text-xs font-semibold">{isRtl ? "اسم العميل / الجهة *" : "Client / Entity Name *"}</Label>
                  <Input className="mt-1.5 bg-secondary/30"
                    placeholder={isRtl ? "مثال: شركة نيوم، أمانة الرياض، أرامكو..." : "e.g. NEOM, Riyadh Municipality, Aramco..."}
                    value={clientName} onChange={(e) => setClientName(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold flex items-center gap-1"><Phone className="w-3 h-3" />{isRtl ? "رقم التواصل" : "Contact No."}</Label>
                    <PhoneInput
                      className="mt-1.5"
                      inputClassName="bg-secondary/30"
                      value={clientContact}
                      onChange={setClientContact}
                      isRtl={isRtl}
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold flex items-center gap-1"><Mail className="w-3 h-3" />{isRtl ? "البريد الإلكتروني" : "Email"}</Label>
                    <Input className="mt-1.5 bg-secondary/30" dir="ltr" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
                  </div>
                </div>
                <Button className="w-full mt-2 gap-1.5" onClick={() => setStep(3)} disabled={!clientName.trim()}>
                  {isRtl ? "التالي: تفاصيل المشروع" : "Next: Project Details"} <ArrowRight className={cn("w-4 h-4", isRtl ? "rotate-180" : "")} />
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Project details */}
          {step === 3 && (
            <Card className="border-border/50">
              <CardHeader className="pb-3 border-b border-border/40 bg-secondary/20">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Bot className="w-4 h-4 text-primary" />
                  {isRtl ? "تفاصيل المشروع وإعدادات الذكاء الاصطناعي" : "Project Details & AI Settings"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div>
                  <Label className="text-xs font-semibold">{isRtl ? "اسم المشروع" : "Project Name"}</Label>
                  <Input className="mt-1.5 bg-secondary/30"
                    placeholder={isRtl ? "اترك فارغاً لتوليده تلقائياً..." : "Leave blank to auto-generate..."}
                    value={projectName} onChange={(e) => setProjectName(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs font-semibold flex items-center justify-between">
                    <span>{isRtl ? "متطلبات ووصف المشروع *" : "Project Requirements & Description *"}</span>
                    <Badge variant="outline" className="text-[10px] text-primary bg-primary/5 border-primary/30">
                      <Wand2 className="w-3 h-3 me-0.5" />{isRtl ? "يُغذّي الذكاء الاصطناعي" : "Feeds AI Engine"}
                    </Badge>
                  </Label>
                  <Textarea className="mt-1.5 bg-secondary/30 min-h-[100px] resize-none"
                    placeholder={isRtl ? "صف المشروع: المساحة، نوع الأعمال، المتطلبات الخاصة، المدة المطلوبة..." : "Describe the project: area, scope, special requirements, duration..."}
                    value={projectDesc} onChange={(e) => setProjectDesc(e.target.value)} />
                </div>

                {/* Smart AI Settings */}
                <div className="rounded-xl border border-primary/20 bg-primary/3 p-3 space-y-3">
                  <p className="text-xs font-bold text-primary flex items-center gap-1.5">
                    <Wand2 className="w-3.5 h-3.5" />
                    {isRtl ? "إعدادات الأسعار الذكية" : "Smart Pricing Settings"}
                  </p>
                  {/* Region */}
                  <div>
                    <Label className="text-xs text-muted-foreground">{isRtl ? "منطقة المشروع" : "Project Region"}</Label>
                    <div className="mt-1.5 grid grid-cols-3 gap-1">
                      {(Object.entries(REGION_META) as [PriceRegion, {labelAr:string;labelEn:string}][]).map(([k, m]) => (
                        <button key={k} type="button" onClick={() => setRegion(k)}
                          className={cn("py-1.5 px-2 rounded-lg border text-xs font-medium transition-all",
                            region === k ? "border-primary bg-primary/10 text-primary" : "border-border/50 bg-secondary/20 text-muted-foreground hover:border-primary/40")}>
                          {isRtl ? m.labelAr : m.labelEn}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Project size */}
                  <div>
                    <Label className="text-xs text-muted-foreground">{isRtl ? "حجم / قيمة المشروع" : "Project Size / Value"}</Label>
                    <div className="mt-1.5 grid grid-cols-2 gap-1">
                      {(Object.entries(SIZE_META) as [ProjectSize, {labelAr:string;labelEn:string;descAr:string;descEn:string}][]).map(([k, m]) => (
                        <button key={k} type="button" onClick={() => setProjectSize(k)}
                          className={cn("py-1.5 px-2 rounded-lg border text-start transition-all",
                            projectSize === k ? "border-primary bg-primary/10" : "border-border/50 bg-secondary/20 hover:border-primary/40")}>
                          <p className={cn("text-xs font-semibold", projectSize === k ? "text-primary" : "text-foreground")}>{isRtl ? m.labelAr : m.labelEn}</p>
                          <p className="text-[10px] text-muted-foreground">{isRtl ? m.descAr : m.descEn}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* AI Toggle */}
                <div className={cn("flex items-center justify-between p-3.5 rounded-xl border-2 cursor-pointer transition-all", useAI ? "border-primary bg-primary/5" : "border-border/40 bg-secondary/20")}
                  onClick={() => setUseAI(!useAI)}>
                  <div className="flex items-center gap-2.5">
                    <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", useAI ? "bg-primary text-white" : "bg-secondary")}>
                      <Bot className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{isRtl ? "توليد البنود بالذكاء الاصطناعي" : "AI-Generated Items & Pricing"}</p>
                      <p className="text-xs text-muted-foreground">{isRtl ? "أسعار مُعدَّلة حسب المنطقة وحجم المشروع" : "Prices adjusted per region & project size"}</p>
                    </div>
                  </div>
                  <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0", useAI ? "border-primary bg-primary" : "border-border")}>
                    {useAI && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-secondary/20 border-t border-border/40 py-4">
                <Button className="w-full h-11 font-bold gap-2" onClick={handleCreate} disabled={isGenerating || !projectDesc.trim()}>
                  {isGenerating ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {isRtl ? "جاري التوليد الذكي..." : "Generating with Smart AI..."}</>
                  ) : (
                    <>{useAI ? <Bot className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                      {useAI ? (isRtl ? "توليد عرض سعر ذكي" : "Generate Smart Proposal") : (isRtl ? "إنشاء عرض سعر" : "Create Proposal")}</>
                  )}
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>

        {/* Right: Price suggestions */}
        <div className="space-y-4">
          {selectedService && (
            <Card className="border-amber-200/60 bg-amber-50/30 dark:bg-amber-950/10 dark:border-amber-800/30">
              <CardContent className="p-4">
                <PriceSuggestionPanel serviceType={selectedService} isRtl={isRtl}
                  onApply={() => toast({ title: isRtl ? "السعر للمرجعية فقط" : "Reference Price", description: isRtl ? "يمكن تعديل الأسعار في جدول البنود بعد الإنشاء." : "Prices can be adjusted in the items table after creation." })} />
              </CardContent>
            </Card>
          )}
          {selectedService && (
            <Card className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm font-semibold mb-3">
                  <Eye className="w-4 h-4 text-muted-foreground" />
                  {isRtl ? "معاينة القالب" : "Template Preview"}
                </div>
                <div className="space-y-1.5">
                  {generateAITemplate(selectedService, "…", isRtl).items.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", `bg-${SERVICE_META[selectedService].color}-500`)} />
                      <span className="text-muted-foreground truncate">{isRtl ? item.descAr : item.descEn}</span>
                      <span className="ms-auto font-mono text-muted-foreground shrink-0">{(item.total / 1000).toFixed(0)}K</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Proposal Detail / Editor ─────────────────────────────────────────────────
function ProposalDetail({ proposal: init, isRtl, onBack, onSave, onViewContract }: {
  proposal: Proposal; isRtl: boolean;
  onBack: () => void; onSave: (p: Proposal) => void;
  onViewContract: (c: Contract) => void;
}) {
  const { toast } = useToast();
  const [proposal, setProposal] = useState<Proposal>(init);
  const [showPriceSugg, setShowPriceSugg] = useState(false);
  const [priceTab, setPriceTab] = useState<"suggest"|"analyze">("suggest");
  const [showScope, setShowScope] = useState(true);
  const [showServicePicker, setShowServicePicker] = useState(false);
  const svc = SERVICE_META[proposal.serviceType];

  // Map serviceType index to company activity services
  const activityServices = (() => {
    try {
      const acts = getActiveCompany().activities;
      const idx = SERVICE_TYPES.findIndex((s) => s.id === proposal.serviceType);
      if (idx >= 0 && idx < acts.length) return acts[idx].services;
    } catch {}
    return [];
  })();
  const st = STATUS_META[proposal.status];

  const upd = (field: keyof Proposal, val: unknown) => {
    setProposal((prev) => {
      const u = { ...prev, [field]: val };
      if (field === "items") {
        const items = val as ProposalItem[];
        const subtotal = items.reduce((s, i) => s + i.total, 0);
        const vatAmount = Math.round(subtotal * u.vatRate / 100);
        u.subtotal = subtotal; u.vatAmount = vatAmount; u.total = subtotal + vatAmount;
      }
      if (field === "vatRate") {
        u.vatAmount = Math.round(u.subtotal * (val as number) / 100);
        u.total = u.subtotal + u.vatAmount;
      }
      return u;
    });
  };

  const addItem = () => {
    upd("items", [...proposal.items, { id: generateId(), descAr: isRtl ? "بند جديد" : "New Item", descEn: "New Item", qty: 1, unit: isRtl ? "مقطوع / Lump Sum" : "Lump Sum", unitPrice: 0, total: 0 }]);
  };
  const updateItem = (idx: number, u: ProposalItem) => { const items = [...proposal.items]; items[idx] = u; upd("items", items); };
  const deleteItem = (idx: number) => upd("items", proposal.items.filter((_, i) => i !== idx));

  const changeStatus = (status: ProposalStatus) => {
    const now = new Date().toISOString();
    const updates: Partial<Proposal> = { status };
    if (status === "sent") updates.sentAt = now;
    if (status === "approved") updates.approvedAt = now;
    if (status === "rejected") updates.rejectedAt = now;
    setProposal((prev) => ({ ...prev, ...updates }));
  };

  const handleSave = () => {
    const u = { ...proposal, updatedAt: new Date().toISOString() };
    onSave(u);
    toast({ title: isRtl ? "تم الحفظ ✓" : "Saved ✓", description: isRtl ? "تم حفظ العرض بنجاح." : "Proposal saved successfully." });
  };

  const handleConvertContract = () => {
    const saved = { ...proposal, status: "converted_contract" as ProposalStatus, updatedAt: new Date().toISOString() };
    const contract = generateContractFromProposal(saved);
    saved.convertedToContractId = contract.id;
    saveContract(contract);
    onSave(saved);
    setProposal(saved);
    toast({ title: isRtl ? "تم توليد العقد!" : "Contract Generated!", description: isRtl ? `رقم العقد: ${contract.contractNumber}` : `Contract No: ${contract.contractNumber}` });
    onViewContract(contract);
  };

  const handleConvertInvoice = () => {
    const invNum = `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, "0")}`;
    const saved = { ...proposal, status: "converted_invoice" as ProposalStatus, convertedToInvoiceId: invNum, updatedAt: new Date().toISOString() };
    onSave(saved);
    setProposal(saved);
    toast({ title: isRtl ? "تم التحويل إلى فاتورة!" : "Converted to Invoice!", description: isRtl ? `رقم الفاتورة: ${invNum} — ستظهر في وحدة المحاسبة` : `Invoice No: ${invNum} — Will appear in Accounting module` });
  };

  const existingContract = proposal.convertedToContractId
    ? getContracts().find((c) => c.id === proposal.convertedToContractId) ?? null
    : null;

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={onBack}
            className="gap-1.5 h-8 border-border/60 hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-all group">
            {isRtl
              ? <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              : <ArrowRight className="w-3.5 h-3.5 rotate-180 group-hover:-translate-x-0.5 transition-transform" />}
            <span className="text-xs font-medium">{isRtl ? "العروض" : "All Proposals"}</span>
          </Button>
          <span className="text-muted-foreground/40 text-xs">/</span>
          <span className="text-sm font-mono font-semibold text-foreground/80">{proposal.proposalNumber}</span>
          <Badge className={cn("text-[10px] px-1.5 border", st.bg, st.color, st.border)}>{isRtl ? st.labelAr : st.labelEn}</Badge>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Status actions */}
          {proposal.status === "draft" && (
            <Button size="sm" variant="outline" className="gap-1.5 h-8 text-blue-600 border-blue-300" onClick={() => changeStatus("sent")}>
              <Send className="w-3.5 h-3.5" />{isRtl ? "إرسال للعميل" : "Send to Client"}
            </Button>
          )}
          {proposal.status === "sent" && (<>
            <Button size="sm" variant="outline" className="gap-1.5 h-8 text-emerald-600 border-emerald-300" onClick={() => changeStatus("approved")}>
              <CheckCircle2 className="w-3.5 h-3.5" />{isRtl ? "اعتماد" : "Approve"}
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 h-8 text-red-600 border-red-300" onClick={() => changeStatus("rejected")}>
              <X className="w-3.5 h-3.5" />{isRtl ? "رفض" : "Reject"}
            </Button>
          </>)}
          {proposal.status === "approved" && (<>
            <Button size="sm" className="gap-1.5 h-8 bg-violet-600 hover:bg-violet-700" onClick={handleConvertContract}>
              <FileSignature className="w-3.5 h-3.5" />{isRtl ? "توليد عقد" : "Generate Contract"}
            </Button>
            <Button size="sm" className="gap-1.5 h-8 bg-cyan-600 hover:bg-cyan-700" onClick={handleConvertInvoice}>
              <CreditCard className="w-3.5 h-3.5" />{isRtl ? "تحويل لفاتورة" : "Convert to Invoice"}
            </Button>
          </>)}
          {existingContract && (
            <Button size="sm" variant="outline" className="gap-1.5 h-8 text-violet-600 border-violet-300" onClick={() => onViewContract(existingContract)}>
              <FileSignature className="w-3.5 h-3.5" />{isRtl ? "عرض العقد" : "View Contract"}
            </Button>
          )}
          {/* Print — saves first to ensure latest data */}
          <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={() => {
            const saved = { ...proposal, updatedAt: new Date().toISOString() };
            onSave(saved);
            printProposal(saved, isRtl);
          }}>
            <Printer className="w-3.5 h-3.5" />{isRtl ? "طباعة PDF" : "Print PDF"}
          </Button>
          {/* Price analysis toggle */}
          <Button size="sm" variant="outline"
            className={cn("gap-1.5 h-8 transition-colors", showPriceSugg && priceTab === "suggest" ? "text-amber-600 border-amber-400 bg-amber-50 dark:bg-amber-950/20" : "text-amber-600 border-amber-300")}
            onClick={() => { setPriceTab("suggest"); setShowPriceSugg(prev => priceTab === "suggest" ? !prev : true); }}>
            <Lightbulb className="w-3.5 h-3.5" />{isRtl ? "اقتراحات" : "Suggest"}
          </Button>
          <Button size="sm" variant="outline"
            className={cn("gap-1.5 h-8 transition-colors", showPriceSugg && priceTab === "analyze" ? "text-primary border-primary/40 bg-primary/5" : "text-primary/70 border-primary/30")}
            onClick={() => { setPriceTab("analyze"); setShowPriceSugg(prev => priceTab === "analyze" ? !prev : true); }}>
            <BarChart2 className="w-3.5 h-3.5" />{isRtl ? "تحليل ذكي" : "Analyze"}
          </Button>
          <Button size="sm" className="gap-1.5 h-8" onClick={handleSave}>
            <Save className="w-3.5 h-3.5" />{isRtl ? "حفظ" : "Save"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Left col */}
        <div className="space-y-4">
          {/* Client */}
          <Card className="border-border/50">
            <CardHeader className="py-3 px-4 border-b border-border/40 bg-secondary/20">
              <CardTitle className="text-sm flex items-center gap-2"><User className="w-4 h-4 text-muted-foreground" />{isRtl ? "معلومات العميل" : "Client Information"}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">{isRtl ? "اسم العميل / الجهة" : "Client / Entity"}</Label>
                <Input value={proposal.clientName} onChange={(e) => upd("clientName", e.target.value)} className="mt-1 h-8 text-sm bg-secondary/20" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{isRtl ? "رقم التواصل" : "Contact"}</Label>
                <PhoneInput
                  className="mt-1"
                  inputClassName="bg-secondary/20 text-sm"
                  size="sm"
                  value={proposal.clientContact || ""}
                  onChange={(v) => upd("clientContact", v)}
                  isRtl={isRtl}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" />{isRtl ? "البريد الإلكتروني" : "Email"}</Label>
                <Input value={proposal.clientEmail || ""} onChange={(e) => upd("clientEmail", e.target.value)} className="mt-1 h-8 text-sm bg-secondary/20" dir="ltr" />
              </div>
            </CardContent>
          </Card>

          {/* Proposal info */}
          <Card className="border-border/50">
            <CardHeader className="py-3 px-4 border-b border-border/40 bg-secondary/20">
              <CardTitle className="text-sm flex items-center gap-2"><FileText className="w-4 h-4 text-muted-foreground" />{isRtl ? "معلومات العرض" : "Proposal Details"}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">

              {/* Service type selector */}
              <div>
                <Label className="text-xs text-muted-foreground">{isRtl ? "نوع الخدمة / النشاط" : "Service / Activity Type"}</Label>
                <div className="mt-1 grid grid-cols-2 gap-1.5">
                  {SERVICE_TYPES.map((s) => {
                    const Icon = ICONS[s.iconName] ?? HardHat;
                    const active = proposal.serviceType === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => upd("serviceType", s.id)}
                        className={cn(
                          "flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs font-medium transition-all text-start",
                          active
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border/50 bg-secondary/20 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        )}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{isRtl ? s.labelAr : s.labelEn}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">{isRtl ? "اسم المشروع" : "Project Name"}</Label>
                <Input value={proposal.projectName} onChange={(e) => upd("projectName", e.target.value)} className="mt-1 h-8 text-sm bg-secondary/20" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{isRtl ? "وصف المشروع" : "Project Description"}</Label>
                <Textarea value={proposal.projectDesc} onChange={(e) => upd("projectDesc", e.target.value)} className="mt-1 text-sm bg-secondary/20 resize-none min-h-[72px]" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{isRtl ? "صلاحية (أيام)" : "Valid (days)"}</Label>
                  <Input type="number" value={proposal.validity} onChange={(e) => upd("validity", Number(e.target.value))} className="mt-1 h-8 text-sm bg-secondary/20" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground flex items-center gap-1"><Percent className="w-3 h-3" />{isRtl ? "ضريبة %" : "VAT %"}</Label>
                  <Input type="number" value={proposal.vatRate} onChange={(e) => upd("vatRate", Number(e.target.value))} className="mt-1 h-8 text-sm bg-secondary/20" />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{isRtl ? "ملاحظات" : "Notes"}</Label>
                <Textarea value={proposal.notes || ""} onChange={(e) => upd("notes", e.target.value)} className="mt-1 text-sm bg-secondary/20 resize-none min-h-[56px]" />
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
                <span className="text-muted-foreground">{isRtl ? `ضريبة ${proposal.vatRate}%` : `VAT ${proposal.vatRate}%`}</span>
                <span className="font-mono">{proposal.vatAmount.toLocaleString()} {proposal.currency}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-base">
                <span>{isRtl ? "الإجمالي الكلي" : "Grand Total"}</span>
                <span className="text-primary font-mono">{proposal.total.toLocaleString()} {proposal.currency}</span>
              </div>
            </CardContent>
          </Card>

          {/* Price analysis panel */}
          {showPriceSugg && (
            <Card className={cn("transition-colors", priceTab === "suggest" ? "border-amber-200/60 bg-amber-50/30 dark:bg-amber-950/10" : "border-primary/20 bg-primary/3")}>
              <CardHeader className="py-2 px-4 border-b border-border/30">
                <div className="flex gap-1">
                  <button onClick={() => setPriceTab("suggest")}
                    className={cn("flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-all", priceTab === "suggest" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" : "text-muted-foreground hover:bg-secondary/40")}>
                    <Lightbulb className="w-3 h-3" />{isRtl ? "اقتراحات الأسعار" : "Price Suggestions"}
                  </button>
                  <button onClick={() => setPriceTab("analyze")}
                    className={cn("flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-all", priceTab === "analyze" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary/40")}>
                    <BarChart2 className="w-3 h-3" />{isRtl ? "المحلل الذكي" : "Smart Analyzer"}
                  </button>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {priceTab === "suggest" ? (
                  <PriceSuggestionPanel serviceType={proposal.serviceType} isRtl={isRtl}
                    onApply={(price) => toast({ title: isRtl ? "ملاحظة" : "Note", description: isRtl ? `متوسط السعر: ${price.toLocaleString()} ر.س — عدّل البنود يدوياً` : `Avg price: SAR ${price.toLocaleString()} — Edit items manually` })} />
                ) : (
                  <SmartPriceAnalyzer proposal={proposal} isRtl={isRtl} />
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right col: scope + items */}
        <div className="xl:col-span-2 space-y-4">
          {/* Scope */}
          <Card className="border-border/50">
            <CardHeader className="py-3 px-4 border-b border-border/40 bg-secondary/20 cursor-pointer" onClick={() => setShowScope(!showScope)}>
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2"><FileText className="w-4 h-4 text-muted-foreground" />{isRtl ? "نطاق العمل (Scope of Work)" : "Scope of Work"}</span>
                {showScope ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </CardTitle>
            </CardHeader>
            {showScope && (
              <CardContent className="p-4 space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                    {isRtl ? "المقدمة / التحية الافتتاحية" : "Introduction / Opening"}
                  </Label>
                  <Textarea
                    value={proposal.introduction || ""}
                    onChange={(e) => upd("introduction", e.target.value)}
                    className="mt-1 text-sm bg-secondary/20 resize-none min-h-[72px]"
                    placeholder={isRtl
                      ? "يسعدنا تقديم عرض أسعارنا لمشروعكم الكريم..."
                      : "We are pleased to submit our proposal for your esteemed project..."}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                    {isRtl ? "نطاق العمل" : "Scope of Work"}
                  </Label>
                  <Textarea value={proposal.projectDesc} onChange={(e) => upd("projectDesc", e.target.value)}
                    className="mt-1 text-sm bg-secondary/20 resize-none min-h-[100px]"
                    placeholder={isRtl ? "وصف تفصيلي لنطاق العمل والمتطلبات..." : "Detailed scope of work and requirements..."} />
                </div>
              </CardContent>
            )}
          </Card>

          {/* Items table */}
          <Card className="border-border/50">
            <CardHeader className="py-3 px-4 border-b border-border/40 bg-secondary/20">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2"><Calculator className="w-4 h-4 text-muted-foreground" />{isRtl ? "جدول بنود الأعمال والأسعار" : "Work Items & Pricing"}</span>
                <div className="flex items-center gap-1.5 relative">
                  {/* Add Services button */}
                  {activityServices.length > 0 && (
                    <div className="relative">
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                        onClick={() => setShowServicePicker(!showServicePicker)}>
                        <Briefcase className="w-3 h-3" />{isRtl ? "إضافة خدمات" : "Add Services"}
                        <ChevronDown className="w-3 h-3" />
                      </Button>
                      {showServicePicker && (
                        <div className="absolute top-full mt-1 z-50 bg-background border border-border/50 rounded-xl shadow-xl w-72 p-2 space-y-1" style={{ [isRtl ? "right" : "left"]: 0 }}>
                          <p className="text-[10px] text-muted-foreground px-2 py-1 font-semibold uppercase tracking-wide">
                            {isRtl ? `خدمات ${svc.labelAr}` : `${svc.labelEn} Services`}
                          </p>
                          {activityServices.map((service) => (
                            <div key={service.id}>
                              <button
                                className="w-full text-start px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary/60 rounded-lg transition-colors"
                                onClick={() => {
                                  upd("items", [...proposal.items, {
                                    id: generateId(),
                                    descAr: service.nameAr,
                                    descEn: service.nameEn,
                                    qty: 1, unit: isRtl ? "مقطوع / Lump Sum" : "Lump Sum",
                                    unitPrice: 0, total: 0,
                                  }]);
                                  setShowServicePicker(false);
                                }}
                              >
                                + {isRtl ? service.nameAr : service.nameEn}
                              </button>
                              {service.specializations.map((spec) => (
                                <button key={spec.id}
                                  className="w-full text-start px-4 py-1 text-xs text-muted-foreground hover:bg-secondary/40 rounded-lg transition-colors"
                                  onClick={() => {
                                    upd("items", [...proposal.items, {
                                      id: generateId(),
                                      descAr: spec.nameAr,
                                      descEn: spec.nameEn,
                                      qty: 1, unit: isRtl ? "مقطوع / Lump Sum" : "Lump Sum",
                                      unitPrice: 0, total: 0,
                                    }]);
                                    setShowServicePicker(false);
                                  }}
                                >
                                  ↳ {isRtl ? spec.nameAr : spec.nameEn}
                                </button>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={addItem}><Plus className="w-3 h-3" />{isRtl ? "إضافة بند" : "Add Item"}</Button>
                </div>
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
                      <ItemRow key={item.id} item={item} isRtl={isRtl}
                        onChange={(u) => updateItem(idx, u)} onDelete={() => deleteItem(idx)} />
                    ))}
                    {proposal.items.length === 0 && (
                      <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground text-sm">
                        <div className="flex flex-col items-center gap-2">
                          <AlertCircle className="w-8 h-8 opacity-20" />
                          {isRtl ? "لا توجد بنود — أضف بنداً أو فعّل الذكاء الاصطناعي عند الإنشاء" : "No items — Add items or enable AI when creating"}
                        </div>
                      </td></tr>
                    )}
                  </tbody>
                  <tfoot className="border-t-2 border-border bg-secondary/20">
                    <tr>
                      <td colSpan={4} className="px-3 py-2 text-end font-semibold text-sm">{isRtl ? "المجموع قبل الضريبة:" : "Subtotal:"}</td>
                      <td className="px-2 py-2 text-end font-bold font-mono text-primary">{proposal.subtotal.toLocaleString()}</td>
                      <td />
                    </tr>
                    <tr>
                      <td colSpan={4} className="px-3 py-1.5 text-end text-xs text-muted-foreground">{isRtl ? `ضريبة (${proposal.vatRate}%):` : `VAT (${proposal.vatRate}%):`}</td>
                      <td className="px-2 py-1.5 text-end font-mono text-xs text-muted-foreground">{proposal.vatAmount.toLocaleString()}</td>
                      <td />
                    </tr>
                    <tr className="bg-primary/5">
                      <td colSpan={4} className="px-3 py-2.5 text-end font-bold">{isRtl ? "الإجمالي الكلي شامل الضريبة:" : "Grand Total incl. VAT:"}</td>
                      <td className="px-2 py-2.5 text-end font-bold font-mono text-primary text-base">{proposal.total.toLocaleString()}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Status timeline */}
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-xs">
                {(["draft", "sent", "approved"] as ProposalStatus[]).map((s, i) => {
                  const m = STATUS_META[s];
                  const done = ["draft", "sent", "under_review", "approved", "converted_contract", "converted_invoice"].indexOf(proposal.status) >= i;
                  return (
                    <div key={s} className="flex items-center gap-2">
                      {i > 0 && <div className={cn("flex-1 h-0.5 w-6", done ? "bg-primary" : "bg-border")} />}
                      <div className={cn("flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium", done ? m.bg + " " + m.color + " " + m.border + " border" : "bg-secondary text-muted-foreground")}>
                        {done && <CheckCircle2 className="w-3 h-3" />}
                        {isRtl ? m.labelAr : m.labelEn}
                      </div>
                    </div>
                  );
                })}
                {(proposal.status === "converted_contract" || proposal.status === "converted_invoice") && (
                  <><div className="h-0.5 w-6 bg-primary" />
                    <div className={cn("flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium border", STATUS_META[proposal.status].bg, STATUS_META[proposal.status].color, STATUS_META[proposal.status].border)}>
                      <FileCheck className="w-3 h-3" />{isRtl ? STATUS_META[proposal.status].labelAr : STATUS_META[proposal.status].labelEn}
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Contract View ────────────────────────────────────────────────────────────
function ContractView({ contract: init, isRtl, onBack }: {
  contract: Contract; isRtl: boolean; onBack: () => void;
}) {
  const [contract, setContract] = useState<Contract>(init);
  const [expandedClauses, setExpandedClauses] = useState<Set<string>>(new Set(["1", "2", "3"]));
  const { toast } = useToast();

  const toggleClause = (id: string) => {
    setExpandedClauses((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const handleSave = () => {
    saveContract({ ...contract, updatedAt: new Date().toISOString() });
    toast({ title: isRtl ? "تم حفظ العقد ✓" : "Contract Saved ✓" });
  };

  const svc = SERVICE_META[contract.serviceType];
  const Icon = ICONS[svc.iconName] ?? FileSignature;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onBack}
            className="gap-1.5 h-8 border-border/60 hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-all group">
            {isRtl
              ? <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              : <ArrowRight className="w-3.5 h-3.5 rotate-180 group-hover:-translate-x-0.5 transition-transform" />}
            <span className="text-xs font-medium">{isRtl ? "العروض" : "All Proposals"}</span>
          </Button>
          <span className="text-muted-foreground/40 text-xs">/</span>
          <span className="text-sm font-mono font-semibold text-violet-600">{contract.contractNumber}</span>
          <Badge className="text-[10px] px-1.5 bg-violet-50 text-violet-700 border-violet-200">{isRtl ? "عقد" : "Contract"}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={() => printContract(contract, isRtl)}>
            <Printer className="w-3.5 h-3.5" />{isRtl ? "طباعة العقد PDF" : "Print Contract PDF"}
          </Button>
          <Button size="sm" className="gap-1.5 h-8" onClick={handleSave}>
            <Save className="w-3.5 h-3.5" />{isRtl ? "حفظ" : "Save"}
          </Button>
        </div>
      </div>

      {/* Contract header card */}
      <Card className="border-violet-200/60 bg-violet-50/30 dark:bg-violet-950/10">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0", `bg-${svc.color}-500`)}>
              <Icon className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-lg font-bold text-violet-700 dark:text-violet-400">{contract.contractNumber}</span>
                <Badge className="bg-violet-100 text-violet-700 border-violet-200 border text-xs">{isRtl ? svc.labelAr : svc.labelEn}</Badge>
              </div>
              <p className="font-semibold mt-1">{contract.projectName}</p>
              <p className="text-sm text-muted-foreground">{contract.clientName}</p>
            </div>
            <div className="text-end shrink-0">
              <p className="text-2xl font-bold font-mono text-violet-700 dark:text-violet-400">{contract.total.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{contract.currency} {isRtl ? "شامل الضريبة" : "incl. VAT"}</p>
              <p className="text-xs text-muted-foreground mt-1">{isRtl ? "صادر من:" : "From:"} {contract.proposalNumber}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-violet-200/50">
            {[
              { label: isRtl ? "المقاول" : "Contractor", val: "Scapex" },
              { label: isRtl ? "العميل" : "Client", val: contract.clientName },
              { label: isRtl ? "تاريخ البدء" : "Start Date", val: contract.startDate },
              { label: isRtl ? "تاريخ الانتهاء" : "End Date", val: contract.endDate },
            ].map((r) => (
              <div key={r.label}>
                <p className="text-[10px] text-muted-foreground">{r.label}</p>
                <p className="text-xs font-semibold">{r.val}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Clauses */}
        <div className="xl:col-span-2 space-y-3">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            {isRtl ? "بنود العقد والمواد القانونية" : "Contract Articles & Legal Clauses"}
          </h3>
          {contract.clauses.map((clause) => (
            <Card key={clause.id} className="border-border/50 overflow-hidden">
              <button className="w-full" onClick={() => toggleClause(clause.id)}>
                <CardHeader className="py-3 px-4 bg-secondary/20 hover:bg-secondary/40 transition-colors">
                  <CardTitle className="text-sm flex items-center justify-between text-start">
                    <span className="font-semibold">{isRtl ? clause.titleAr : clause.titleEn}</span>
                    {expandedClauses.has(clause.id) ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                  </CardTitle>
                </CardHeader>
              </button>
              {expandedClauses.has(clause.id) && (
                <CardContent className="p-4">
                  <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">{isRtl ? clause.bodyAr : clause.bodyEn}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        {/* Right: Payment schedule + items summary */}
        <div className="space-y-4">
          {/* Payment schedule */}
          <Card className="border-border/50">
            <CardHeader className="py-3 px-4 border-b border-border/40 bg-secondary/20">
              <CardTitle className="text-sm flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                {isRtl ? "جدول الدفعات" : "Payment Schedule"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {contract.paymentSchedule.map((m, i) => (
                <div key={m.id} className="flex items-center gap-3 px-4 py-3 border-b border-border/30 last:border-0 hover:bg-secondary/20">
                  <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium leading-tight">{isRtl ? m.milestoneAr : m.milestoneEn}</p>
                    <p className="text-[10px] text-muted-foreground">{m.percentage}%</p>
                  </div>
                  <div className="text-end shrink-0">
                    <p className="text-sm font-bold font-mono">{m.amount.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">{contract.currency}</p>
                  </div>
                </div>
              ))}
              <div className="px-4 py-3 bg-primary/5 flex justify-between items-center">
                <span className="text-sm font-bold">{isRtl ? "الإجمالي:" : "Total:"}</span>
                <span className="font-bold font-mono text-primary">{contract.total.toLocaleString()} {contract.currency}</span>
              </div>
            </CardContent>
          </Card>

          {/* Items summary */}
          <Card className="border-border/50">
            <CardHeader className="py-3 px-4 border-b border-border/40 bg-secondary/20">
              <CardTitle className="text-sm flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-muted-foreground" />
                {isRtl ? "ملخص بنود الأعمال" : "Work Items Summary"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              {contract.items.map((item, i) => (
                <div key={item.id} className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground shrink-0">{i + 1}.</span>
                  <span className="flex-1 text-muted-foreground truncate">{isRtl ? item.descAr : item.descEn}</span>
                  <span className="font-mono font-semibold shrink-0">{item.total.toLocaleString()}</span>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between font-semibold text-xs pt-1">
                <span>{isRtl ? "الإجمالي شامل الضريبة:" : "Total incl. VAT:"}</span>
                <span className="font-mono text-primary">{contract.total.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          {/* Print reminder */}
          <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground mb-1">{isRtl ? "لطباعة العقد:" : "To print the contract:"}</p>
            <p>{isRtl ? "اضغط على زر \"طباعة العقد PDF\" أعلاه. سيُفتح ملف PDF جاهز للتوقيع والختم." : "Click the \"Print Contract PDF\" button above. A PDF ready for signatures will open."}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main ProposalGenerator ────────────────────────────────────────────────────
export function ProposalGenerator() {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";
  const { toast } = useToast();
  const [view, setView] = useState<View>("list");
  const [proposals, setProposals] = useState<Proposal[]>(() => getProposals());
  const [selected, setSelected] = useState<Proposal | null>(null);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

  const reload = () => setProposals(getProposals());

  const handleNew = () => { setSelected(null); setView("create"); };

  const handleView = (p: Proposal) => { setSelected(p); setView("detail"); };

  const handleDelete = (id: string) => {
    deleteProposal(id);
    reload();
    toast({ title: isRtl ? "تم الحذف" : "Deleted", description: isRtl ? "تم حذف العرض." : "Proposal deleted." });
  };

  const handleCreated = (p: Proposal) => {
    saveProposal(p);
    reload();
    setSelected(p);
    setView("detail");
  };

  const handleSave = (p: Proposal) => {
    saveProposal(p);
    setSelected(p);
    reload();
  };

  const handleViewContract = (c: Contract) => {
    setSelectedContract(c);
    setView("contract");
  };

  const handleBackToList = () => {
    setView("list");
    setSelected(null);
    setSelectedContract(null);
    reload();
  };

  return (
    <div className="space-y-4">
      {view === "list" && (
        <ProposalList proposals={proposals} isRtl={isRtl} onNew={handleNew} onView={handleView} onDelete={handleDelete} />
      )}
      {view === "create" && (
        <CreateProposal isRtl={isRtl} onCreated={handleCreated} onCancel={handleBackToList} />
      )}
      {view === "detail" && selected && (
        <ProposalDetail proposal={selected} isRtl={isRtl} onBack={handleBackToList} onSave={handleSave} onViewContract={handleViewContract} />
      )}
      {view === "contract" && selectedContract && (
        <ContractView contract={selectedContract} isRtl={isRtl} onBack={() => { setView("detail"); }} />
      )}
    </div>
  );
}
