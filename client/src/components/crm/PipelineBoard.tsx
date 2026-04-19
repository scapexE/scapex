import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useActiveRole } from "@/contexts/ActiveRoleContext";
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
  Clock, Calendar, AlertCircle, FileText, Mail
} from "lucide-react";
import { cn } from "@/lib/utils";

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
}

interface DbCustomer {
  id: number;
  nameAr: string | null;
  nameEn: string | null;
  email: string | null;
  phone: string | null;
}

export interface ProposalPrefill {
  clientName: string;
  clientEmail: string;
  clientContact: string;
  projectName: string;
}

const formatValue = (v: string | null, currency: string | null) => {
  const n = parseFloat(v || "0");
  if (!n) return `0 ${currency || "SAR"}`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M ${currency || "SAR"}`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K ${currency || "SAR"}`;
  return `${n.toFixed(0)} ${currency || "SAR"}`;
};

const formatDate = (s: string | null, isRtl: boolean) => {
  if (!s) return "—";
  try {
    const d = new Date(s);
    return d.toLocaleDateString(isRtl ? "ar-SA" : "en-US", { month: "short", day: "numeric" });
  } catch { return s; }
};

export function PipelineBoard({ onCreateProposal, openAddDialogSignal }: {
  onCreateProposal?: (data: ProposalPrefill) => void;
  openAddDialogSignal?: number;
}) {
  const { t, dir } = useLanguage();
  const { toast } = useToast();
  const { currentUser } = useActiveRole();
  const isAdmin = currentUser?.role === "admin" || (currentUser?.roles ?? []).includes("admin");
  const isRtl = dir === 'rtl';

  const [deals, setDeals] = useState<DbDeal[]>([]);
  const [customers, setCustomers] = useState<DbCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [addStage, setAddStage] = useState<string>("new");
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({
    titleAr: "", titleEn: "", contactId: "", value: "",
    priority: "medium", nextAction: "", expectedClose: "", notes: "",
  });

  const STAGES = [
    { id: 'new',         title: t('crm.pipe.stage.new'),         color: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300', border: 'border-slate-300 dark:border-slate-700', stripe: 'bg-slate-400 dark:bg-slate-500' },
    { id: 'qualified',   title: t('crm.pipe.stage.qualified'),   color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800', stripe: 'bg-blue-500' },
    { id: 'proposal',    title: t('crm.pipe.stage.proposal'),    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800', stripe: 'bg-amber-500' },
    { id: 'negotiation', title: t('crm.pipe.stage.negotiation'), color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800', stripe: 'bg-purple-500' },
    { id: 'won',         title: t('crm.pipe.stage.won'),         color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800', stripe: 'bg-emerald-500' },
  ];

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [dr, cr] = await Promise.all([
        fetch("/api/deals").then(r => r.json()),
        fetch("/api/customers").then(r => r.json()),
      ]);
      setDeals(Array.isArray(dr) ? dr : []);
      setCustomers(Array.isArray(cr) ? cr : []);
    } catch (err) {
      console.error("Failed to load pipeline:", err);
      toast({ title: isRtl ? "تعذر تحميل المسار" : "Failed to load pipeline", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast, isRtl]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (openAddDialogSignal !== undefined && openAddDialogSignal > 0) {
      setAddStage("new");
      setForm({
        titleAr: "", titleEn: "", contactId: "", value: "",
        priority: "medium", nextAction: "", expectedClose: "", notes: "",
      });
      setAddOpen(true);
    }
  }, [openAddDialogSignal]);

  const customerById = (id: number | null) => id ? customers.find(c => c.id === id) : null;
  const dealClientName = (d: DbDeal) => {
    const c = customerById(d.contactId);
    if (!c) return isRtl ? "عميل غير محدد" : "Unknown client";
    return (isRtl ? c.nameAr : c.nameEn) || c.nameEn || c.nameAr || "—";
  };

  const filtered = search.trim()
    ? deals.filter(d => {
        const title = (isRtl ? d.titleAr : d.titleEn) || d.titleEn || d.titleAr || "";
        const cn = dealClientName(d);
        return title.toLowerCase().includes(search.toLowerCase()) ||
               cn.toLowerCase().includes(search.toLowerCase());
      })
    : deals;

  const totalValue = deals.reduce((sum, d) => sum + parseFloat(d.value || "0"), 0);

  const handleDragStart = (e: React.DragEvent, id: number) => e.dataTransfer.setData("dealId", String(id));
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = async (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    const dealId = parseInt(e.dataTransfer.getData("dealId"));
    if (!dealId) return;
    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, stage: stageId } : d));
    try {
      await fetch(`/api/deals/${dealId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: stageId }),
      });
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
    });
  };

  const openAdd = (stageId: string) => {
    setAddStage(stageId);
    setForm({
      titleAr: "", titleEn: "", contactId: "", value: "",
      priority: "medium", nextAction: "", expectedClose: "", notes: "",
    });
    setAddOpen(true);
  };

  const handleSave = async () => {
    if (!form.titleAr.trim() && !form.titleEn.trim()) {
      toast({ title: isRtl ? "عنوان الفرصة مطلوب" : "Title is required", variant: "destructive" });
      return;
    }
    try {
      setSaving(true);
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titleAr: form.titleAr,
          titleEn: form.titleEn,
          contactId: form.contactId ? parseInt(form.contactId) : null,
          value: form.value || "0",
          priority: form.priority,
          nextAction: form.nextAction,
          expectedClose: form.expectedClose || null,
          notes: form.notes,
          stage: addStage,
          createdBy: currentUser?.id || null,
        }),
      });
      if (!res.ok) throw new Error("save failed");
      toast({ title: isRtl ? "تم إضافة الفرصة" : "Lead added" });
      setAddOpen(false);
      await fetchData();
    } catch {
      toast({ title: isRtl ? "تعذر حفظ الفرصة" : "Failed to save lead", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/deals/${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      toast({ title: isRtl ? "تم حذف الفرصة" : "Lead deleted" });
      setDeleteId(null);
      await fetchData();
    } catch {
      toast({ title: isRtl ? "تعذر الحذف" : "Failed to delete", variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between pb-4 shrink-0">
        <div className="flex items-center gap-2 w-full max-w-md">
          <div className="relative w-full">
            <Search className={cn("absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground", isRtl ? "right-3" : "left-3")} />
            <Input
              placeholder={t('crm.pipe.search')}
              className={cn("h-9 bg-card", isRtl ? "pr-9" : "pl-9")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-pipeline-search"
            />
          </div>
          <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 bg-card">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-sm font-medium text-muted-foreground hidden sm:block">
          {t('crm.pipe.total_value')} <span className="text-foreground" data-testid="text-pipeline-total">{formatValue(String(totalValue), "SAR")}</span>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2 rtl:ml-2 rtl:mr-0" />
          {isRtl ? "جاري التحميل..." : "Loading..."}
        </div>
      ) : (
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-4 h-full min-w-max pb-2 px-1">
          {STAGES.map(stage => {
            const stageDeals = filtered.filter(d => (d.stage || "new") === stage.id);
            return (
              <div
                key={stage.id}
                className="flex flex-col w-80 shrink-0 bg-secondary/30 rounded-xl border border-border/50"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.id)}
              >
                <div className="p-3 shrink-0 flex items-center justify-between border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold", stage.color)}>
                      {stage.title}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">{stageDeals.length}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => openAdd(stage.id)}
                    title={isRtl ? "إضافة فرصة جديدة" : "Add new lead"}
                    data-testid={`button-add-lead-${stage.id}`}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <ScrollArea className="flex-1 p-2">
                  <div className="space-y-2 pb-2">
                    {stageDeals.length === 0 && (
                      <div className="text-xs text-muted-foreground/60 text-center py-6">
                        {isRtl ? "لا توجد فرص" : "No leads"}
                      </div>
                    )}
                    {stageDeals.map(d => {
                      const customer = customerById(d.contactId);
                      const title = (isRtl ? d.titleAr : d.titleEn) || d.titleEn || d.titleAr || "—";
                      return (
                        <div
                          key={d.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, d.id)}
                          className={cn(
                            "bg-card rounded-lg border shadow-sm cursor-grab hover:shadow-md transition-shadow overflow-hidden flex flex-col",
                            stage.border,
                          )}
                          data-testid={`card-deal-${d.id}`}
                        >
                          <div className={cn("h-1.5 w-full shrink-0", stage.stripe)} />
                          <div className="p-3">
                            <div className="flex justify-between items-start mb-1.5">
                              <div className="font-semibold text-sm line-clamp-2 leading-tight flex-1 pe-1">{title}</div>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0 -me-1 -mt-1 text-muted-foreground" data-testid={`button-deal-menu-${d.id}`}>
                                    <MoreHorizontal className="h-3 w-3" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent align="end" className="w-40 p-1">
                                  {isAdmin ? (
                                    <button
                                      className="flex items-center gap-2 w-full text-left px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded"
                                      onClick={() => setDeleteId(d.id)}
                                      data-testid={`button-delete-deal-${d.id}`}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      {isRtl ? "حذف" : "Delete"}
                                    </button>
                                  ) : (
                                    <div className="text-xs text-muted-foreground px-2 py-1.5">
                                      {isRtl ? "لا توجد إجراءات" : "No actions"}
                                    </div>
                                  )}
                                </PopoverContent>
                              </Popover>
                            </div>

                            <div className="text-xs font-medium text-muted-foreground mb-0.5">
                              {dealClientName(d)}
                            </div>

                            <div className="flex items-center gap-3 text-[10px] text-muted-foreground/70 mb-2.5">
                              {customer?.email && (
                                <span className="flex items-center gap-0.5 truncate max-w-[110px]">
                                  <Mail className="w-2.5 h-2.5 shrink-0" />
                                  {customer.email}
                                </span>
                              )}
                              {customer?.phone && (
                                <span className="flex items-center gap-0.5 shrink-0" dir="ltr">
                                  <Phone className="w-2.5 h-2.5" />
                                  {customer.phone}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center justify-between text-sm mb-2.5">
                              <span className="font-bold text-primary">{formatValue(d.value, d.currency)}</span>
                              <Badge variant="outline" className={cn(
                                "text-[10px] px-1.5 py-0",
                                d.priority === 'high' ? "text-destructive border-destructive/30 bg-destructive/10" :
                                d.priority === 'medium' ? "text-amber-600 border-amber-600/30 bg-amber-600/10" : "",
                              )}>
                                {d.priority || "medium"}
                              </Badge>
                            </div>

                            {d.nextAction && (
                              <div className="pt-2 border-t border-border/50 border-dashed flex items-start gap-1.5 text-xs text-muted-foreground mb-2">
                                {d.priority === 'high'
                                  ? <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                                  : <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
                                <span className="line-clamp-1">{d.nextAction}</span>
                              </div>
                            )}

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
                                <Calendar className="w-3 h-3" />
                                {formatDate(d.expectedClose, isRtl)}
                              </div>
                              {onCreateProposal && (
                                <button
                                  data-testid={`button-create-proposal-${d.id}`}
                                  className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 font-semibold bg-primary/8 hover:bg-primary/15 border border-primary/20 hover:border-primary/40 px-2 py-1 rounded-md transition-all"
                                  onClick={() => handleProposal(d)}
                                  title={isRtl ? 'إنشاء عرض سعر بيانات العميل' : 'Create Proposal with client data'}
                                >
                                  <FileText className="w-3 h-3" />
                                  {isRtl ? 'عرض سعر' : 'Proposal'}
                                </button>
                              )}
                            </div>
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

      {/* Add Lead Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl" dir={dir} data-testid="dialog-add-lead">
          <DialogHeader>
            <DialogTitle>{isRtl ? "إضافة فرصة جديدة" : "Add New Lead"}</DialogTitle>
            <DialogDescription>
              {isRtl ? `سيتم إضافة الفرصة في عمود: ${STAGES.find(s => s.id === addStage)?.title}` : `Lead will be added under: ${STAGES.find(s => s.id === addStage)?.title}`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="lead-title-ar">{isRtl ? "عنوان الفرصة (عربي)" : "Title (Arabic)"} *</Label>
              <Input id="lead-title-ar" value={form.titleAr} onChange={e => setForm({ ...form, titleAr: e.target.value })} data-testid="input-lead-title-ar" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-title-en">{isRtl ? "عنوان الفرصة (إنجليزي)" : "Title (English)"}</Label>
              <Input id="lead-title-en" value={form.titleEn} onChange={e => setForm({ ...form, titleEn: e.target.value })} data-testid="input-lead-title-en" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="lead-customer">{isRtl ? "العميل" : "Customer"}</Label>
              <select
                id="lead-customer"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.contactId}
                onChange={e => setForm({ ...form, contactId: e.target.value })}
                data-testid="select-lead-customer"
              >
                <option value="">{isRtl ? "— بدون عميل —" : "— No customer —"}</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {(isRtl ? c.nameAr : c.nameEn) || c.nameEn || c.nameAr}
                  </option>
                ))}
              </select>
              {customers.length === 0 && (
                <p className="text-xs text-amber-600">
                  {isRtl ? "لا يوجد عملاء بعد. أضف عميلاً من تبويب العملاء أولاً." : "No customers yet. Add a customer from the Customers tab first."}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-value">{isRtl ? "القيمة (ر.س)" : "Value (SAR)"}</Label>
              <Input id="lead-value" type="number" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} data-testid="input-lead-value" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-priority">{isRtl ? "الأولوية" : "Priority"}</Label>
              <select
                id="lead-priority"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.priority}
                onChange={e => setForm({ ...form, priority: e.target.value })}
                data-testid="select-lead-priority"
              >
                <option value="low">{isRtl ? "منخفضة" : "Low"}</option>
                <option value="medium">{isRtl ? "متوسطة" : "Medium"}</option>
                <option value="high">{isRtl ? "عالية" : "High"}</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-close">{isRtl ? "تاريخ الإغلاق المتوقع" : "Expected Close"}</Label>
              <Input id="lead-close" type="date" value={form.expectedClose} onChange={e => setForm({ ...form, expectedClose: e.target.value })} data-testid="input-lead-close" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="lead-action">{isRtl ? "الإجراء التالي" : "Next Action"}</Label>
              <Input id="lead-action" value={form.nextAction} onChange={e => setForm({ ...form, nextAction: e.target.value })} data-testid="input-lead-action" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="lead-notes">{isRtl ? "ملاحظات" : "Notes"}</Label>
              <Textarea id="lead-notes" rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} data-testid="input-lead-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} data-testid="button-cancel-lead">
              {isRtl ? "إلغاء" : "Cancel"}
            </Button>
            <Button onClick={handleSave} disabled={saving} data-testid="button-save-lead">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2 rtl:ml-2 rtl:mr-0" /> : null}
              {isRtl ? "حفظ" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent dir={dir}>
          <AlertDialogHeader>
            <AlertDialogTitle>{isRtl ? "تأكيد الحذف" : "Confirm Delete"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isRtl ? "سيتم حذف الفرصة نهائياً. هل أنت متأكد؟" : "This will permanently delete the lead. Are you sure?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-deal">{isRtl ? "إلغاء" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700" data-testid="button-confirm-delete-deal">
              {isRtl ? "حذف" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
