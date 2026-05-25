import { useState, useEffect, useCallback, useMemo } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useActiveRole } from "@/contexts/ActiveRoleContext";
import { useBusinessActivity } from "@/contexts/BusinessActivityContext";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  MoreHorizontal, Plus, Search, Filter, Phone, Loader2, Trash2,
  Clock, Calendar, AlertCircle, FileText, Mail, UserCog, User as UserIcon,
  Star, TrendingUp, Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { scopedFetch, apiRequest } from "@/lib/queryClient";
import { DealDrawer } from "./DealDrawer";

interface DbDeal {
  id: number;
  contactId: number | null;
  titleAr: string | null;
  titleEn: string | null;
  value: string | null;
  currency: string | null;
  expectedClose: string | null;
  notes: string | null;
  nextAction: string | null;
  stage: string | null;
  priority: string | null;
  status: string | null;
  activityId: string | null;
  assignedTo: string | null;
  createdBy: string | null;
}

interface DbCustomer {
  id: number;
  nameAr: string | null;
  nameEn: string | null;
  email: string | null;
  phone: string | null;
}

interface SimpleUser {
  id: string;
  name: string;
  email?: string;
  role?: string;
  roles?: string[];
}

export interface ProposalPrefill {
  clientName: string;
  clientEmail: string;
  clientContact: string;
  projectName: string;
  contactId?: number | null;
  dealId?: number | null;
}

const formatValue = (v: string | null, currency: string | null) => {
  const n = parseFloat(v || "0");
  if (!n) return `0 ${currency || "SAR"}`;
  return `${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${currency || "SAR"}`;
};

const formatDate = (s: string | null, isRtl: boolean) => {
  if (!s) return null;
  try {
    const d = new Date(s);
    const now = new Date();
    const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return {
      label: d.toLocaleDateString(isRtl ? "ar-SA" : "en-US", { month: "short", day: "numeric" }),
      overdue: diff < 0,
      soon: diff >= 0 && diff <= 7,
    };
  } catch { return null; }
};

// Generate a consistent color from a string
const avatarColor = (name: string) => {
  const colors = [
    "bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500",
    "bg-rose-500", "bg-cyan-500", "bg-indigo-500", "bg-teal-500",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const initials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const PriorityStars = ({ priority }: { priority: string | null }) => {
  const count = priority === "high" ? 3 : priority === "medium" ? 2 : 1;
  return (
    <div className="flex gap-px">
      {[1, 2, 3].map(i => (
        <Star
          key={i}
          className={cn("w-3 h-3", i <= count
            ? priority === "high" ? "text-red-500 fill-red-500"
            : priority === "medium" ? "text-amber-500 fill-amber-500"
            : "text-slate-400 fill-slate-400"
            : "text-slate-200 dark:text-slate-700"
          )}
        />
      ))}
    </div>
  );
};

export function PipelineBoard({ onCreateProposal, openAddDialogSignal }: {
  onCreateProposal?: (data: ProposalPrefill) => void;
  openAddDialogSignal?: number;
}) {
  const { t, dir } = useLanguage();
  const { toast } = useToast();
  const { currentUser } = useActiveRole();
  const { activeActivity, getActivityUserIds } = useBusinessActivity();
  const isAdmin = currentUser?.role === "admin" || (currentUser?.roles ?? []).includes("admin");
  const isManager = currentUser?.role === "manager" || (currentUser?.roles ?? []).includes("manager");
  const canSeeAll = isAdmin || isManager;
  const isRtl = dir === 'rtl';

  const [deals, setDeals] = useState<DbDeal[]>([]);
  const [customers, setCustomers] = useState<DbCustomer[]>([]);
  const [users, setUsers] = useState<SimpleUser[]>([]);
  const [showAll, setShowAll] = useState(canSeeAll);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [addStage, setAddStage] = useState<string>("new");
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [assignTarget, setAssignTarget] = useState<DbDeal | null>(null);
  const [assignTo, setAssignTo] = useState<string>("");
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<DbDeal | null>(null);
  const [form, setForm] = useState({
    titleAr: "", titleEn: "", contactId: "", value: "",
    priority: "medium", nextAction: "", expectedClose: "", notes: "",
  });

  const STAGES = [
    {
      id: 'new',
      title: t('crm.pipe.stage.new'),
      color: 'text-slate-600 dark:text-slate-400',
      bg: 'bg-slate-100 dark:bg-slate-800/60',
      topBar: 'bg-slate-400',
      dot: 'bg-slate-400',
      dropBg: 'bg-slate-50 dark:bg-slate-800/30',
      icon: '🆕',
    },
    {
      id: 'qualified',
      title: t('crm.pipe.stage.qualified'),
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      topBar: 'bg-blue-500',
      dot: 'bg-blue-500',
      dropBg: 'bg-blue-50/50 dark:bg-blue-900/10',
      icon: '✅',
    },
    {
      id: 'proposal',
      title: t('crm.pipe.stage.proposal'),
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      topBar: 'bg-amber-500',
      dot: 'bg-amber-500',
      dropBg: 'bg-amber-50/50 dark:bg-amber-900/10',
      icon: '📋',
    },
    {
      id: 'negotiation',
      title: t('crm.pipe.stage.negotiation'),
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      topBar: 'bg-purple-500',
      dot: 'bg-purple-500',
      dropBg: 'bg-purple-50/50 dark:bg-purple-900/10',
      icon: '🤝',
    },
    {
      id: 'won',
      title: t('crm.pipe.stage.won'),
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      topBar: 'bg-emerald-500',
      dot: 'bg-emerald-500',
      dropBg: 'bg-emerald-50/50 dark:bg-emerald-900/10',
      icon: '🏆',
    },
  ];

  const fetchData = useCallback(async () => {
    const isPriv = isAdmin || isManager;
    if (!activeActivity && !isPriv) {
      setDeals([]); setCustomers([]); setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (activeActivity?.id) params.set("activityId", activeActivity.id);
      const qs = params.toString() ? `?${params.toString()}` : "";
      const [dr, cr, ur] = await Promise.all([
        scopedFetch(`/api/deals${qs}`).then(r => r.json()),
        scopedFetch(`/api/customers${qs}`).then(r => r.json()),
        scopedFetch("/api/users").then(r => r.json()),
      ]);
      setDeals(Array.isArray(dr) ? dr : []);
      setCustomers(Array.isArray(cr) ? cr : []);
      setUsers(Array.isArray(ur) ? ur : []);
    } catch {
      toast({ title: isRtl ? "تعذر تحميل المسار" : "Failed to load pipeline", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast, isRtl, activeActivity]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (openAddDialogSignal !== undefined && openAddDialogSignal > 0) {
      setAddStage("new");
      setForm({ titleAr: "", titleEn: "", contactId: "", value: "", priority: "medium", nextAction: "", expectedClose: "", notes: "" });
      setAddOpen(true);
    }
  }, [openAddDialogSignal]);

  const customerById = (id: number | null) => id ? customers.find(c => c.id === id) : null;
  const userById = (id: string | null | undefined) => id ? users.find(u => u.id === id) : null;
  const dealClientName = (d: DbDeal) => {
    const c = customerById(d.contactId);
    if (!c) return isRtl ? "عميل غير محدد" : "Unknown client";
    return (isRtl ? c.nameAr : c.nameEn) || c.nameEn || c.nameAr || "—";
  };

  const activityUserIds = useMemo(() => {
    if (!activeActivity) return new Set<string>();
    return new Set(getActivityUserIds(activeActivity.id));
  }, [activeActivity, getActivityUserIds]);

  const assignableUsers = useMemo(() => {
    const base = users.filter(u => {
      if (!activityUserIds.has(u.id)) return false;
      const roles = new Set<string>([u.role || "", ...(u.roles || [])]);
      if (roles.has("client") || roles.has("viewer")) return false;
      return true;
    });
    const cur = assignTarget?.assignedTo;
    if (cur && !base.some(u => u.id === cur)) {
      const found = users.find(u => u.id === cur);
      if (found) return [found, ...base];
    }
    return base;
  }, [users, activityUserIds, assignTarget?.assignedTo]);

  const visibleDeals = useMemo(() => {
    if (canSeeAll && showAll) return deals;
    if (!currentUser?.id) return [];
    return deals.filter(d => d.assignedTo === currentUser.id || d.createdBy === currentUser.id);
  }, [deals, canSeeAll, showAll, currentUser?.id]);

  const filtered = search.trim()
    ? visibleDeals.filter(d => {
        const title = (isRtl ? d.titleAr : d.titleEn) || d.titleEn || d.titleAr || "";
        const cn = dealClientName(d);
        return title.toLowerCase().includes(search.toLowerCase()) || cn.toLowerCase().includes(search.toLowerCase());
      })
    : visibleDeals;

  const totalValue = visibleDeals.reduce((sum, d) => sum + parseFloat(d.value || "0"), 0);
  const wonValue = visibleDeals.filter(d => d.stage === "won").reduce((sum, d) => sum + parseFloat(d.value || "0"), 0);
  const winRate = visibleDeals.length > 0 ? Math.round((visibleDeals.filter(d => d.stage === "won").length / visibleDeals.length) * 100) : 0;

  const canEdit = (d: DbDeal) => {
    if (isAdmin || isManager) return true;
    return d.assignedTo === currentUser?.id || d.createdBy === currentUser?.id;
  };

  const handleDragStart = (e: React.DragEvent, d: DbDeal) => {
    if (!canEdit(d)) { e.preventDefault(); return; }
    e.dataTransfer.setData("dealId", String(d.id));
  };
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = async (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    const dealId = parseInt(e.dataTransfer.getData("dealId"));
    if (!dealId) return;
    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, stage: stageId } : d));
    try {
      const res = await apiRequest("PATCH", `/api/deals/${dealId}`, { stage: stageId });
      if (!res.ok) throw new Error();
    } catch {
      toast({ title: isRtl ? "تعذر نقل البطاقة" : "Failed to move card", variant: "destructive" });
      fetchData();
    }
  };

  const handleProposal = (d: DbDeal) => {
    const c = customerById(d.contactId);
    onCreateProposal?.({
      clientName: dealClientName(d),
      clientEmail: c?.email || "",
      clientContact: c?.phone || "",
      projectName: (isRtl ? d.titleAr : d.titleEn) || d.titleEn || d.titleAr || "",
      contactId: d.contactId ?? null,
      dealId: d.id ?? null,
    });
  };

  const openAdd = (stageId: string) => {
    setAddStage(stageId);
    setForm({ titleAr: "", titleEn: "", contactId: "", value: "", priority: "medium", nextAction: "", expectedClose: "", notes: "" });
    setAddOpen(true);
  };

  const handleSave = async () => {
    if (!form.titleAr.trim() && !form.titleEn.trim()) {
      toast({ title: isRtl ? "عنوان الفرصة مطلوب" : "Title is required", variant: "destructive" });
      return;
    }
    try {
      setSaving(true);
      const res = await apiRequest("POST", "/api/deals", {
        titleAr: form.titleAr, titleEn: form.titleEn,
        contactId: form.contactId ? parseInt(form.contactId) : null,
        value: form.value || "0", priority: form.priority,
        nextAction: form.nextAction, expectedClose: form.expectedClose || null,
        notes: form.notes, stage: addStage,
        ...(activeActivity ? { activityId: activeActivity.id } : {}),
        createdBy: currentUser?.id || null,
        assignedTo: currentUser?.id || null,
      });
      if (!res.ok) throw new Error();
      toast({ title: isRtl ? "تم إضافة الفرصة ✓" : "Lead added ✓" });
      setAddOpen(false);
      await fetchData();
    } catch {
      toast({ title: isRtl ? "تعذر حفظ الفرصة" : "Failed to save lead", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await apiRequest("DELETE", `/api/deals/${deleteId}`);
      if (!res.ok) throw new Error();
      toast({ title: isRtl ? "تم الحذف" : "Deleted" });
      setDeleteId(null);
      await fetchData();
    } catch {
      toast({ title: isRtl ? "تعذر الحذف" : "Failed to delete", variant: "destructive" });
    }
  };

  const handleAssign = async () => {
    if (!assignTarget || !assignTo) return;
    try {
      const res = await apiRequest("PATCH", `/api/deals/${assignTarget.id}`, { assignedTo: assignTo });
      if (!res.ok) throw new Error();
      const u = userById(assignTo);
      toast({ title: isRtl ? "تم الإسناد ✓" : "Assigned ✓", description: u?.name });
      setAssignTarget(null);
      await fetchData();
    } catch {
      toast({ title: isRtl ? "تعذر النقل" : "Failed to transfer", variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden gap-3">
      {/* ─── Pipeline Summary Bar ───────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 shrink-0">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative flex-1">
            <Search className={cn("absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground", isRtl ? "right-3" : "left-3")} />
            <Input placeholder={t('crm.pipe.search')} className={cn("h-9 bg-card", isRtl ? "pr-9" : "pl-9")}
              value={search} onChange={e => setSearch(e.target.value)} data-testid="input-pipeline-search" />
          </div>
          <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 bg-card"><Filter className="h-4 w-4" /></Button>
          {canSeeAll && (
            <div className="flex gap-1">
              <Button size="sm" variant={showAll ? "default" : "outline"} className="h-9 px-3 text-xs" onClick={() => setShowAll(true)} data-testid="button-pipeline-filter-all">
                {isRtl ? "الكل" : "All"}
              </Button>
              <Button size="sm" variant={!showAll ? "default" : "outline"} className="h-9 px-3 text-xs" onClick={() => setShowAll(false)} data-testid="button-pipeline-filter-mine">
                {isRtl ? "صفقاتي" : "Mine"}
              </Button>
            </div>
          )}
        </div>

        {/* KPI chips */}
        <div className="flex items-center gap-2 ms-auto flex-wrap">
          {activeActivity && (
            <span className="text-xs text-primary font-medium bg-primary/8 px-2.5 py-1 rounded-full border border-primary/20">
              {isRtl ? activeActivity.nameAr : activeActivity.nameEn}
            </span>
          )}
          <div className="flex items-center gap-1.5 text-xs bg-secondary/50 rounded-full px-3 py-1.5 border border-border/50">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-muted-foreground">{isRtl ? "الإجمالي" : "Pipeline"}:</span>
            <span className="font-bold text-foreground" data-testid="text-pipeline-total">{formatValue(String(totalValue), "SAR")}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs bg-emerald-50 dark:bg-emerald-900/20 rounded-full px-3 py-1.5 border border-emerald-200 dark:border-emerald-800">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">🏆 {formatValue(String(wonValue), "SAR")}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs bg-secondary/50 rounded-full px-3 py-1.5 border border-border/50">
            <span className="text-muted-foreground">{isRtl ? "معدل الفوز" : "Win rate"}:</span>
            <span className={cn("font-bold", winRate >= 50 ? "text-emerald-600" : "text-amber-600")}>{winRate}%</span>
          </div>
        </div>
      </div>

      {/* ─── Kanban Board ───────────────────────────────────── */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin me-2" />
          {isRtl ? "جاري التحميل..." : "Loading..."}
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex gap-3 h-full min-w-max pb-2">
            {STAGES.map(stage => {
              const stageDeals = filtered.filter(d => (d.stage || "new") === stage.id);
              const stageTotal = stageDeals.reduce((s, d) => s + parseFloat(d.value || "0"), 0);

              return (
                <div
                  key={stage.id}
                  className="flex flex-col w-72 shrink-0 rounded-xl border border-border/50 overflow-hidden bg-secondary/20 dark:bg-secondary/10"
                  onDragOver={handleDragOver}
                  onDrop={e => handleDrop(e, stage.id)}
                >
                  {/* Column header with colored top bar */}
                  <div className={cn("h-1 w-full shrink-0", stage.topBar)} />
                  <div className="px-3 py-2.5 shrink-0 bg-card/80 border-b border-border/50">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{stage.icon}</span>
                        <span className={cn("font-semibold text-sm", stage.color)}>{stage.title}</span>
                        <span className={cn("text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center", stage.bg, stage.color)}>
                          {stageDeals.length}
                        </span>
                      </div>
                      <Button
                        variant="ghost" size="icon" className={cn("h-6 w-6 rounded-lg hover:bg-primary/10 hover:text-primary", stage.color)}
                        onClick={() => openAdd(stage.id)} disabled={!activeActivity}
                        title={isRtl ? "إضافة فرصة" : "Add lead"}
                        data-testid={`button-add-lead-${stage.id}`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {stageTotal > 0 && (
                      <p className="text-xs font-mono font-semibold text-muted-foreground">
                        {formatValue(String(stageTotal), "SAR")}
                      </p>
                    )}
                  </div>

                  {/* Cards */}
                  <ScrollArea className="flex-1 px-2 py-2">
                    <div className="space-y-2 pb-2">
                      {stageDeals.length === 0 && (
                        <div className="border-2 border-dashed border-border/40 rounded-lg p-5 text-center">
                          <p className="text-xs text-muted-foreground/50">{isRtl ? "اسحب بطاقة هنا" : "Drop a card here"}</p>
                        </div>
                      )}
                      {stageDeals.map(d => {
                        const customer = customerById(d.contactId);
                        const assignedUser = userById(d.assignedTo);
                        const title = (isRtl ? d.titleAr : d.titleEn) || d.titleEn || d.titleAr || "—";
                        const clientName = dealClientName(d);
                        const editable = canEdit(d);
                        const dateInfo = formatDate(d.expectedClose, isRtl);
                        const isHovered = hoveredCard === d.id;

                        return (
                          <div
                            key={d.id}
                            draggable={editable}
                            onDragStart={e => handleDragStart(e, d)}
                            onMouseEnter={() => setHoveredCard(d.id)}
                            onMouseLeave={() => setHoveredCard(null)}
                            onClick={() => setSelectedDeal(d)}
                            className={cn(
                              "group bg-card rounded-xl border shadow-sm transition-all duration-200 overflow-hidden",
                              "hover:shadow-md hover:-translate-y-0.5",
                              editable ? "cursor-pointer active:cursor-grabbing" : "cursor-pointer opacity-90",
                              d.priority === "high" ? "border-red-200 dark:border-red-800" : "border-border/60",
                            )}
                            data-testid={`card-deal-${d.id}`}
                          >
                            <div className="p-3">
                              {/* Card Top: Avatar + Client + Menu */}
                              <div className="flex items-start gap-2.5 mb-2.5">
                                {/* Company Avatar */}
                                <div className={cn(
                                  "w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm",
                                  avatarColor(clientName)
                                )}>
                                  {clientName !== (isRtl ? "عميل غير محدد" : "Unknown client")
                                    ? initials(clientName)
                                    : <Building2 className="w-4 h-4" />}
                                </div>

                                <div className="flex-1 min-w-0">
                                  {/* Company Name — primary */}
                                  <p className="font-bold text-sm text-foreground leading-tight truncate">{clientName}</p>
                                  {/* Deal Title — secondary */}
                                  <p className="text-xs text-muted-foreground truncate mt-0.5 leading-tight">{title}</p>
                                </div>

                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button variant="ghost" size="icon"
                                      className="h-6 w-6 shrink-0 -me-1 -mt-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                      data-testid={`button-deal-menu-${d.id}`}
                                      onClick={e => e.stopPropagation()}>
                                      <MoreHorizontal className="h-3.5 w-3.5" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent align="end" className="w-44 p-1">
                                    {editable && (
                                      <button className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded"
                                        onClick={() => { setAssignTarget(d); setAssignTo(d.assignedTo || ""); }}
                                        data-testid={`button-assign-deal-${d.id}`}>
                                        <UserCog className="w-3.5 h-3.5" />
                                        {isRtl ? "نقل / إسناد" : "Transfer / Assign"}
                                      </button>
                                    )}
                                    {(isAdmin || isManager) && (
                                      <button className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded"
                                        onClick={() => setDeleteId(d.id)}
                                        data-testid={`button-delete-deal-${d.id}`}>
                                        <Trash2 className="w-3.5 h-3.5" />
                                        {isRtl ? "حذف" : "Delete"}
                                      </button>
                                    )}
                                  </PopoverContent>
                                </Popover>
                              </div>

                              {/* Contact chips */}
                              {(customer?.email || customer?.phone) && (
                                <div className="flex flex-wrap gap-1.5 mb-2.5">
                                  {customer?.phone && (
                                    <span className="flex items-center gap-1 text-[10px] bg-secondary/60 rounded-full px-2 py-0.5 text-muted-foreground font-mono" dir="ltr">
                                      <Phone className="w-2.5 h-2.5" />{customer.phone}
                                    </span>
                                  )}
                                  {customer?.email && (
                                    <span className="flex items-center gap-1 text-[10px] bg-secondary/60 rounded-full px-2 py-0.5 text-muted-foreground truncate max-w-[140px]">
                                      <Mail className="w-2.5 h-2.5 shrink-0" />{customer.email}
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Value + Priority */}
                              <div className="flex items-center justify-between mb-2.5">
                                <span className="font-bold text-primary text-base leading-none">{formatValue(d.value, d.currency)}</span>
                                <PriorityStars priority={d.priority} />
                              </div>

                              {/* Next action */}
                              {d.nextAction && (
                                <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground bg-secondary/40 rounded-lg px-2 py-1.5 mb-2.5">
                                  {d.priority === "high"
                                    ? <AlertCircle className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
                                    : <Clock className="w-3 h-3 shrink-0 mt-0.5" />}
                                  <span className="line-clamp-1">{d.nextAction}</span>
                                </div>
                              )}

                              {/* Footer: date + assigned + proposal */}
                              <div className="flex items-center gap-1.5">
                                {/* Date badge */}
                                {dateInfo && (
                                  <span className={cn(
                                    "flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium",
                                    dateInfo.overdue ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" :
                                    dateInfo.soon ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" :
                                    "bg-secondary/60 text-muted-foreground"
                                  )}>
                                    <Calendar className="w-2.5 h-2.5" />
                                    {dateInfo.label}
                                  </span>
                                )}

                                {/* Assigned user */}
                                {assignedUser && (
                                  <span className="flex items-center gap-1 text-[10px] bg-primary/8 border border-primary/20 rounded-full px-2 py-0.5 text-primary font-medium ms-auto">
                                    <div className={cn("w-3.5 h-3.5 rounded-full text-white flex items-center justify-center text-[8px] font-bold", avatarColor(assignedUser.name))}>
                                      {assignedUser.name[0]}
                                    </div>
                                    {assignedUser.name.split(" ")[0]}
                                  </span>
                                )}
                              </div>

                              {/* Proposal button — appears on hover */}
                              {onCreateProposal && (
                                <div className={cn("mt-2 transition-all duration-200", isHovered ? "opacity-100 h-7" : "opacity-0 h-0 overflow-hidden")}>
                                  <button
                                    data-testid={`button-create-proposal-${d.id}`}
                                    className="w-full flex items-center justify-center gap-1.5 text-[11px] text-primary hover:text-primary/80 font-semibold bg-primary/8 hover:bg-primary/15 border border-primary/25 hover:border-primary/50 px-2 py-1.5 rounded-lg transition-all"
                                    onClick={e => { e.stopPropagation(); handleProposal(d); }}
                                  >
                                    <FileText className="w-3 h-3" />
                                    {isRtl ? "إنشاء عرض سعر" : "Create Proposal"}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Add Lead Dialog ─────────────────────────────────── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl" dir={dir} data-testid="dialog-add-lead">
          <DialogHeader>
            <DialogTitle>{isRtl ? "إضافة فرصة جديدة" : "Add New Lead"}</DialogTitle>
            <DialogDescription>
              {activeActivity
                ? (isRtl
                    ? `الفرصة ستُضاف في عمود: ${STAGES.find(s => s.id === addStage)?.title} ضمن نشاط "${activeActivity.nameAr}"`
                    : `Lead will be added under ${STAGES.find(s => s.id === addStage)?.title} in "${activeActivity.nameEn}"`)
                : (isRtl ? "اختر نشاطاً تجارياً أولاً." : "Select a business activity first.")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5">
              <Label>{isRtl ? "عنوان الفرصة (عربي)" : "Title (Arabic)"} *</Label>
              <Input value={form.titleAr} onChange={e => setForm({ ...form, titleAr: e.target.value })} data-testid="input-lead-title-ar" />
            </div>
            <div className="space-y-1.5">
              <Label>{isRtl ? "عنوان الفرصة (إنجليزي)" : "Title (English)"}</Label>
              <Input value={form.titleEn} onChange={e => setForm({ ...form, titleEn: e.target.value })} data-testid="input-lead-title-en" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>{isRtl ? "الشركة / العميل" : "Company / Customer"}</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.contactId} onChange={e => setForm({ ...form, contactId: e.target.value })} data-testid="select-lead-customer">
                <option value="">{isRtl ? "— بدون عميل —" : "— No customer —"}</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{(isRtl ? c.nameAr : c.nameEn) || c.nameEn || c.nameAr}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>{isRtl ? "القيمة (ر.س)" : "Value (SAR)"}</Label>
              <Input type="number" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} data-testid="input-lead-value" />
            </div>
            <div className="space-y-1.5">
              <Label>{isRtl ? "الأولوية" : "Priority"}</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} data-testid="select-lead-priority">
                <option value="low">{isRtl ? "⭐ منخفضة" : "⭐ Low"}</option>
                <option value="medium">{isRtl ? "⭐⭐ متوسطة" : "⭐⭐ Medium"}</option>
                <option value="high">{isRtl ? "⭐⭐⭐ عالية" : "⭐⭐⭐ High"}</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>{isRtl ? "تاريخ الإغلاق المتوقع" : "Expected Close"}</Label>
              <Input type="date" value={form.expectedClose} onChange={e => setForm({ ...form, expectedClose: e.target.value })} data-testid="input-lead-close" />
            </div>
            <div className="space-y-1.5">
              <Label>{isRtl ? "الإجراء التالي" : "Next Action"}</Label>
              <Input value={form.nextAction} onChange={e => setForm({ ...form, nextAction: e.target.value })} data-testid="input-lead-action" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>{isRtl ? "ملاحظات" : "Notes"}</Label>
              <Textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} data-testid="input-lead-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} data-testid="button-cancel-lead">{isRtl ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={handleSave} disabled={saving || !activeActivity} data-testid="button-save-lead">
              {saving && <Loader2 className="w-4 h-4 animate-spin me-2" />}
              {isRtl ? "حفظ" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Assign Dialog ────────────────────────────────────── */}
      <Dialog open={!!assignTarget} onOpenChange={o => { if (!o) setAssignTarget(null); }}>
        <DialogContent dir={dir} data-testid="dialog-assign-deal">
          <DialogHeader>
            <DialogTitle>{isRtl ? "نقل / إسناد الفرصة" : "Transfer / Assign Lead"}</DialogTitle>
            <DialogDescription>
              {assignTarget && (isRtl
                ? `اختر الموظف المسؤول عن "${assignTarget.titleAr || assignTarget.titleEn}"`
                : `Choose responsible for "${assignTarget.titleEn || assignTarget.titleAr}"`)}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <Label>{isRtl ? "الموظف المسؤول" : "Responsible employee"}</Label>
            <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={assignTo} onChange={e => setAssignTo(e.target.value)} data-testid="select-assign-deal-to">
              <option value="">{isRtl ? "— اختر —" : "— Choose —"}</option>
              {assignableUsers.map(u => <option key={u.id} value={u.id}>{u.name} {u.role ? `(${u.role})` : ""}</option>)}
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignTarget(null)}>{isRtl ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={handleAssign} data-testid="button-confirm-assign-deal">{isRtl ? "نقل" : "Transfer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirm ───────────────────────────────────── */}
      <AlertDialog open={!!deleteId} onOpenChange={o => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent dir={dir}>
          <AlertDialogHeader>
            <AlertDialogTitle>{isRtl ? "تأكيد الحذف" : "Confirm Delete"}</AlertDialogTitle>
            <AlertDialogDescription>{isRtl ? "سيتم حذف الفرصة نهائياً. هل أنت متأكد؟" : "This will permanently delete the lead. Are you sure?"}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isRtl ? "إلغاء" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700" data-testid="button-confirm-delete-deal">{isRtl ? "حذف" : "Delete"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Deal Drawer ─────────────────────────────────────── */}
      <DealDrawer
        deal={selectedDeal}
        customer={selectedDeal ? customerById(selectedDeal.contactId) || null : null}
        assignedUser={selectedDeal ? userById(selectedDeal.assignedTo) || null : null}
        onClose={() => setSelectedDeal(null)}
        onCreateProposal={onCreateProposal ? (d, c) => {
          setSelectedDeal(null);
          onCreateProposal({
            clientName: c ? (isRtl ? c.nameAr : c.nameEn) || c.nameEn || c.nameAr || "" : "",
            clientEmail: c?.email || "",
            clientContact: c?.phone || "",
            projectName: (isRtl ? d.titleAr : d.titleEn) || d.titleEn || d.titleAr || "",
            contactId: d.contactId ?? null,
            dealId: d.id ?? null,
          });
        } : undefined}
      />
    </div>
  );
}
