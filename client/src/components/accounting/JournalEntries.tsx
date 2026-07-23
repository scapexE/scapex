import { useState, useEffect, useCallback, useMemo } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  Search, Plus, CheckCircle2, Eye, Pencil, Trash2, Loader2, X, Scale,
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ExportMenu } from "@/components/shared/ExportMenu";

interface JournalEntry {
  id: number; entryNumber: string | null; date: string;
  descriptionAr: string | null; descriptionEn: string | null;
  reference: string | null; status: string | null;
  totalDebit: string | null; totalCredit: string | null;
}
interface JLine {
  accountId: string; descriptionAr: string; debit: string; credit: string;
}
interface Account {
  id: number; code: string; nameAr: string; nameEn: string | null; type: string; parentId: number | null;
}

const fmt = (v: string | number | null | undefined) =>
  (parseFloat(String(v ?? 0)) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const EMPTY_LINE: JLine = { accountId: "", descriptionAr: "", debit: "", credit: "" };

export function JournalEntries() {
  const { t, dir } = useLanguage();
  const isRtl = dir === "rtl";
  const { toast } = useToast();

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ date: "", descriptionAr: "", reference: "" });
  const [lines, setLines] = useState<JLine[]>([{ ...EMPTY_LINE }, { ...EMPTY_LINE }]);

  const [viewEntry, setViewEntry] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<JournalEntry | null>(null);
  const [postTarget, setPostTarget] = useState<JournalEntry | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [eRes, aRes] = await Promise.all([
        fetch("/api/journal-entries"),
        fetch("/api/chart-of-accounts"),
      ]);
      const eData = await eRes.json();
      const aData = await aRes.json();
      setEntries(Array.isArray(eData) ? eData : []);
      setAccounts(Array.isArray(aData) ? aData : []);
    } catch {
      toast({ title: isRtl ? "خطأ في التحميل" : "Load error", variant: "destructive" });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Only leaf accounts are postable
  const leafAccounts = useMemo(() => {
    const parentIds = new Set(accounts.map(a => a.parentId).filter(Boolean));
    return accounts.filter(a => !parentIds.has(a.id)).sort((a, b) => a.code.localeCompare(b.code));
  }, [accounts]);

  const accountLabel = (id: number | string | null) => {
    const acc = accounts.find(a => a.id === Number(id));
    return acc ? `${acc.code} — ${isRtl ? acc.nameAr : (acc.nameEn || acc.nameAr)}` : "—";
  };

  const filtered = useMemo(() => entries.filter(e => {
    const q = search.toLowerCase();
    const matchQ = !q
      || (e.entryNumber || "").toLowerCase().includes(q)
      || (e.descriptionAr || "").toLowerCase().includes(q)
      || (e.reference || "").toLowerCase().includes(q);
    const matchS = statusFilter === "all" || e.status === statusFilter;
    return matchQ && matchS;
  }), [entries, search, statusFilter]);

  const totals = useMemo(() => {
    let debit = 0, credit = 0;
    for (const l of lines) { debit += parseFloat(l.debit) || 0; credit += parseFloat(l.credit) || 0; }
    debit = Math.round(debit * 100) / 100; credit = Math.round(credit * 100) / 100;
    return { debit, credit, balanced: debit === credit && debit > 0 };
  }, [lines]);

  const resetForm = () => {
    setEditingId(null);
    setForm({ date: new Date().toISOString().slice(0, 10), descriptionAr: "", reference: "" });
    setLines([{ ...EMPTY_LINE }, { ...EMPTY_LINE }]);
  };

  const openCreate = () => { resetForm(); setShowForm(true); };

  const openEdit = async (entry: JournalEntry) => {
    try {
      const res = await fetch(`/api/journal-entries/${entry.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error();
      setEditingId(entry.id);
      setForm({ date: data.date || "", descriptionAr: data.descriptionAr || "", reference: data.reference || "" });
      setLines((data.lines || []).map((l: any) => ({
        accountId: l.accountId ? String(l.accountId) : "",
        descriptionAr: l.descriptionAr || "",
        debit: parseFloat(l.debit) > 0 ? String(parseFloat(l.debit)) : "",
        credit: parseFloat(l.credit) > 0 ? String(parseFloat(l.credit)) : "",
      })));
      setShowForm(true);
    } catch { toast({ title: isRtl ? "تعذر تحميل القيد" : "Failed to load entry", variant: "destructive" }); }
  };

  const openView = async (entry: JournalEntry) => {
    try {
      const res = await fetch(`/api/journal-entries/${entry.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error();
      setViewEntry(data);
    } catch { toast({ title: isRtl ? "تعذر تحميل القيد" : "Failed to load entry", variant: "destructive" }); }
  };

  const setLine = (i: number, patch: Partial<JLine>) =>
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, ...patch } : l));

  const handleSave = async () => {
    if (!form.date) { toast({ title: isRtl ? "التاريخ مطلوب" : "Date is required", variant: "destructive" }); return; }
    if (lines.some(l => !l.accountId)) { toast({ title: isRtl ? "اختر الحساب في كل سطر" : "Select an account for each line", variant: "destructive" }); return; }
    if (!totals.balanced) { toast({ title: isRtl ? "القيد غير متوازن — يجب أن يتساوى المدين والدائن" : "Entry not balanced — debit must equal credit", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const body = {
        date: form.date, descriptionAr: form.descriptionAr || null, reference: form.reference || null,
        lines: lines.map(l => ({ accountId: l.accountId, descriptionAr: l.descriptionAr || null, debit: l.debit || 0, credit: l.credit || 0 })),
      };
      const res = editingId
        ? await fetch(`/api/journal-entries/${editingId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        : await fetch("/api/journal-entries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { toast({ title: data.error || "Error", variant: "destructive" }); return; }
      toast({ title: editingId ? (isRtl ? "تم تحديث القيد" : "Entry updated") : (isRtl ? "تم إنشاء القيد" : "Entry created") });
      setShowForm(false); resetForm(); fetchAll();
    } catch { toast({ title: isRtl ? "خطأ" : "Error", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handlePost = async () => {
    if (!postTarget) return;
    try {
      const res = await fetch(`/api/journal-entries/${postTarget.id}/post`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const data = await res.json();
      if (!res.ok) { toast({ title: data.error || "Error", variant: "destructive" }); return; }
      toast({ title: isRtl ? "تم ترحيل القيد وتحديث أرصدة الحسابات" : "Entry posted; account balances updated" });
      fetchAll();
    } catch { toast({ title: isRtl ? "خطأ" : "Error", variant: "destructive" }); }
    finally { setPostTarget(null); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/journal-entries/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { toast({ title: data.error || "Error", variant: "destructive" }); return; }
      toast({ title: isRtl ? "تم حذف القيد" : "Entry deleted" });
      fetchAll();
    } catch { toast({ title: isRtl ? "خطأ" : "Error", variant: "destructive" }); }
    finally { setDeleteTarget(null); }
  };

  return (
    <Card className="flex-1 border-border/50 shadow-sm overflow-hidden flex flex-col h-full">
      <CardHeader className="p-4 border-b border-border/50 bg-card">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className={cn("absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground", isRtl ? "right-3" : "left-3")} />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('action.search')}
                className={cn("h-9 bg-secondary/50 border-0", isRtl ? "pr-9" : "pl-9")} data-testid="input-search-journal" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-32 shrink-0" data-testid="select-journal-status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRtl ? "الكل" : "All"}</SelectItem>
                <SelectItem value="draft">{isRtl ? "مسودة" : "Draft"}</SelectItem>
                <SelectItem value="posted">{isRtl ? "مُرحل" : "Posted"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <ExportMenu
              title={isRtl ? 'قيود اليومية' : 'Journal Entries'}
              filename="journal-entries"
              data={filtered}
              columns={[
                { key: 'entryNumber', header: isRtl ? 'رقم القيد' : 'Entry #', accessor: (e: any) => e.entryNumber || `#${e.id}` },
                { key: 'date', header: isRtl ? 'التاريخ' : 'Date', accessor: (e: any) => e.date },
                { key: 'desc', header: isRtl ? 'البيان' : 'Description', accessor: (e: any) => e.descriptionAr || '' },
                { key: 'ref', header: isRtl ? 'المرجع' : 'Reference', accessor: (e: any) => e.reference || '' },
                { key: 'amount', header: isRtl ? 'المبلغ' : 'Amount', accessor: (e: any) => fmt(e.totalDebit) },
                { key: 'status', header: isRtl ? 'الحالة' : 'Status', accessor: (e: any) => e.status === 'posted' ? (isRtl ? 'مُرحل' : 'Posted') : (isRtl ? 'مسودة' : 'Draft') },
              ]}
            />
            <Button size="sm" className="bg-primary hover:bg-primary/90 h-9" onClick={openCreate} data-testid="button-new-journal-entry">
              <Plus className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
              {isRtl ? 'قيد جديد' : 'New Entry'}
            </Button>
          </div>
        </div>
      </CardHeader>

      <div className="overflow-auto flex-1 bg-card">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Scale className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">{isRtl ? "لا توجد قيود بعد" : "No journal entries yet"}</p>
            <Button className="mt-3" size="sm" onClick={openCreate}>
              <Plus className="w-4 h-4 me-1" />{isRtl ? "إنشاء أول قيد" : "Create first entry"}
            </Button>
          </div>
        ) : (
        <Table>
          <TableHeader className="bg-secondary/50 sticky top-0 z-10">
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className={isRtl ? 'text-right' : 'text-left'}>{isRtl ? 'رقم القيد' : 'Entry #'}</TableHead>
              <TableHead className={isRtl ? 'text-right' : 'text-left'}>{isRtl ? 'التاريخ' : 'Date'}</TableHead>
              <TableHead className={isRtl ? 'text-right' : 'text-left'}>{isRtl ? 'البيان' : 'Description'}</TableHead>
              <TableHead className={isRtl ? 'text-right' : 'text-left'}>{isRtl ? 'المرجع' : 'Reference'}</TableHead>
              <TableHead className={isRtl ? 'text-right' : 'text-left'}>{isRtl ? 'المبلغ' : 'Amount'}</TableHead>
              <TableHead className={isRtl ? 'text-right' : 'text-left'}>{isRtl ? 'الحالة' : 'Status'}</TableHead>
              <TableHead className={isRtl ? 'text-left' : 'text-right'}>{t('action.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((entry) => (
              <TableRow key={entry.id} className="border-border/50 hover:bg-muted/30 transition-colors group" data-testid={`row-journal-${entry.id}`}>
                <TableCell className={cn("font-mono text-sm", isRtl ? 'text-right' : 'text-left')}>{entry.entryNumber || `#${entry.id}`}</TableCell>
                <TableCell className={isRtl ? 'text-right' : 'text-left'}>{entry.date}</TableCell>
                <TableCell className={cn("font-medium max-w-[260px] truncate", isRtl ? 'text-right' : 'text-left')}>{entry.descriptionAr || "—"}</TableCell>
                <TableCell className={isRtl ? 'text-right' : 'text-left'}>
                  {entry.reference
                    ? <span className="text-xs bg-muted px-2 py-1 rounded border border-border">{entry.reference}</span>
                    : <span className="text-muted-foreground text-xs">—</span>}
                </TableCell>
                <TableCell className={cn("font-semibold", isRtl ? 'text-right' : 'text-left')}>
                  <span dir="ltr">SAR {fmt(entry.totalDebit)}</span>
                </TableCell>
                <TableCell className={isRtl ? 'text-right' : 'text-left'}>
                  <Badge variant="outline" className={cn("font-normal border-transparent",
                    entry.status === 'posted' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400")}>
                    {entry.status === 'posted' ? (isRtl ? 'مُرحل' : 'Posted') : (isRtl ? 'مسودة' : 'Draft')}
                  </Badge>
                </TableCell>
                <TableCell className={isRtl ? 'text-left' : 'text-right'}>
                  <div className={cn("flex items-center gap-1", isRtl ? "justify-start" : "justify-end")}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => openView(entry)} title={isRtl ? "عرض" : "View"} data-testid={`button-view-journal-${entry.id}`}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {entry.status !== 'posted' && (
                      <>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={() => openEdit(entry)} title={isRtl ? "تعديل" : "Edit"} data-testid={`button-edit-journal-${entry.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-emerald-600"
                          onClick={() => setPostTarget(entry)} title={isRtl ? "ترحيل" : "Post"} data-testid={`button-post-journal-${entry.id}`}>
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500"
                          onClick={() => setDeleteTarget(entry)} title={isRtl ? "حذف" : "Delete"} data-testid={`button-delete-journal-${entry.id}`}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        )}
      </div>

      <div className="border-t border-border/50 p-3 flex items-center justify-between text-xs text-muted-foreground bg-card">
        <span>{isRtl ? `إجمالي القيود: ${filtered.length}` : `Total entries: ${filtered.length}`}</span>
        <span className="text-[10px]">{isRtl ? "نظام القيد المزدوج — المدين = الدائن" : "Double-entry — debit = credit"}</span>
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={showForm} onOpenChange={(o) => { setShowForm(o); if (!o) resetForm(); }}>
        <DialogContent dir={dir} className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-primary" />
              {editingId ? (isRtl ? "تعديل قيد" : "Edit Entry") : (isRtl ? "قيد يومية جديد" : "New Journal Entry")}
            </DialogTitle>
            <DialogDescription>
              {isRtl ? "أدخل سطور القيد — يجب أن يتساوى إجمالي المدين مع الدائن" : "Enter entry lines — total debit must equal total credit"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">{isRtl ? "التاريخ *" : "Date *"}</Label>
                <Input type="date" className="mt-1 h-9" value={form.date}
                  onChange={e => setForm(p => ({ ...p, date: e.target.value }))} data-testid="input-journal-date" />
              </div>
              <div>
                <Label className="text-xs">{isRtl ? "المرجع" : "Reference"}</Label>
                <Input className="mt-1 h-9" placeholder={isRtl ? "مثال: INV-2026-001" : "e.g. INV-2026-001"} value={form.reference}
                  onChange={e => setForm(p => ({ ...p, reference: e.target.value }))} data-testid="input-journal-reference" />
              </div>
            </div>
            <div>
              <Label className="text-xs">{isRtl ? "البيان" : "Description"}</Label>
              <Textarea className="mt-1 min-h-[56px]" value={form.descriptionAr}
                onChange={e => setForm(p => ({ ...p, descriptionAr: e.target.value }))} data-testid="input-journal-description" />
            </div>

            {/* Lines */}
            <div className="border border-border/50 rounded-lg overflow-hidden">
              <div className="grid grid-cols-[1fr_110px_110px_32px] gap-2 px-3 py-2 bg-secondary/50 text-xs font-medium">
                <span>{isRtl ? "الحساب" : "Account"}</span>
                <span>{isRtl ? "مدين" : "Debit"}</span>
                <span>{isRtl ? "دائن" : "Credit"}</span>
                <span />
              </div>
              <div className="divide-y divide-border/40">
                {lines.map((line, i) => (
                  <div key={i} className="px-3 py-2 space-y-1.5">
                    <div className="grid grid-cols-[1fr_110px_110px_32px] gap-2 items-center">
                      <Select value={line.accountId} onValueChange={v => setLine(i, { accountId: v })}>
                        <SelectTrigger className="h-8 text-xs" data-testid={`select-line-account-${i}`}>
                          <SelectValue placeholder={isRtl ? "اختر الحساب..." : "Select account..."} />
                        </SelectTrigger>
                        <SelectContent>
                          {leafAccounts.map(a => (
                            <SelectItem key={a.id} value={String(a.id)} className="text-xs">
                              {a.code} — {isRtl ? a.nameAr : (a.nameEn || a.nameAr)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input type="number" min="0" step="0.01" className="h-8 text-xs" placeholder="0.00"
                        value={line.debit} onChange={e => setLine(i, { debit: e.target.value, credit: e.target.value ? "" : line.credit })}
                        data-testid={`input-line-debit-${i}`} />
                      <Input type="number" min="0" step="0.01" className="h-8 text-xs" placeholder="0.00"
                        value={line.credit} onChange={e => setLine(i, { credit: e.target.value, debit: e.target.value ? "" : line.debit })}
                        data-testid={`input-line-credit-${i}`} />
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500"
                        disabled={lines.length <= 2} onClick={() => setLines(prev => prev.filter((_, idx) => idx !== i))}
                        data-testid={`button-remove-line-${i}`}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <Input className="h-7 text-xs bg-secondary/30 border-0" placeholder={isRtl ? "بيان السطر (اختياري)" : "Line description (optional)"}
                      value={line.descriptionAr} onChange={e => setLine(i, { descriptionAr: e.target.value })} />
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between px-3 py-2 bg-secondary/30 border-t border-border/50">
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1"
                  onClick={() => setLines(prev => [...prev, { ...EMPTY_LINE }])} data-testid="button-add-line">
                  <Plus className="w-3 h-3" />{isRtl ? "إضافة سطر" : "Add line"}
                </Button>
                <div className="flex items-center gap-4 text-xs">
                  <span>{isRtl ? "مدين:" : "Debit:"} <b dir="ltr">{fmt(totals.debit)}</b></span>
                  <span>{isRtl ? "دائن:" : "Credit:"} <b dir="ltr">{fmt(totals.credit)}</b></span>
                  <Badge variant="outline" className={cn("border-transparent font-normal",
                    totals.balanced ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400")} data-testid="badge-balance-status">
                    {totals.balanced ? (isRtl ? "متوازن ✓" : "Balanced ✓") : (isRtl ? "غير متوازن" : "Unbalanced")}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>{isRtl ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-1.5" data-testid="button-save-journal">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scale className="w-4 h-4" />}
              {editingId ? (isRtl ? "حفظ التعديلات" : "Save Changes") : (isRtl ? "حفظ القيد" : "Save Entry")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View dialog */}
      <Dialog open={!!viewEntry} onOpenChange={(o) => !o && setViewEntry(null)}>
        <DialogContent dir={dir} className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {viewEntry && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Scale className="w-5 h-5 text-primary" />
                  {viewEntry.entryNumber || `#${viewEntry.id}`}
                  <Badge variant="outline" className={cn("border-transparent font-normal",
                    viewEntry.status === 'posted' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400")}>
                    {viewEntry.status === 'posted' ? (isRtl ? 'مُرحل' : 'Posted') : (isRtl ? 'مسودة' : 'Draft')}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  {viewEntry.date}{viewEntry.reference ? ` · ${viewEntry.reference}` : ""}
                </DialogDescription>
              </DialogHeader>
              {viewEntry.descriptionAr && <p className="text-sm">{viewEntry.descriptionAr}</p>}
              <div className="border border-border/50 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-secondary/50">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className={isRtl ? 'text-right' : 'text-left'}>{isRtl ? "الحساب" : "Account"}</TableHead>
                      <TableHead className={isRtl ? 'text-right' : 'text-left'}>{isRtl ? "مدين" : "Debit"}</TableHead>
                      <TableHead className={isRtl ? 'text-right' : 'text-left'}>{isRtl ? "دائن" : "Credit"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(viewEntry.lines || []).map((l: any) => (
                      <TableRow key={l.id}>
                        <TableCell className="text-sm">
                          <div>{accountLabel(l.accountId)}</div>
                          {l.descriptionAr && <div className="text-xs text-muted-foreground">{l.descriptionAr}</div>}
                        </TableCell>
                        <TableCell dir="ltr" className="text-sm">{parseFloat(l.debit) > 0 ? fmt(l.debit) : "—"}</TableCell>
                        <TableCell dir="ltr" className="text-sm">{parseFloat(l.credit) > 0 ? fmt(l.credit) : "—"}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-secondary/30 font-semibold">
                      <TableCell className="text-sm">{isRtl ? "الإجمالي" : "Total"}</TableCell>
                      <TableCell dir="ltr" className="text-sm">{fmt(viewEntry.totalDebit)}</TableCell>
                      <TableCell dir="ltr" className="text-sm">{fmt(viewEntry.totalCredit)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Post confirm */}
      <AlertDialog open={!!postTarget} onOpenChange={(o) => !o && setPostTarget(null)}>
        <AlertDialogContent dir={dir}>
          <AlertDialogHeader>
            <AlertDialogTitle>{isRtl ? "ترحيل القيد؟" : "Post this entry?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isRtl
                ? "سيتم ترحيل القيد وتحديث أرصدة الحسابات في شجرة الحسابات. لا يمكن تعديل أو حذف القيد بعد الترحيل."
                : "The entry will be posted and account balances updated. Posted entries cannot be edited or deleted."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isRtl ? "إلغاء" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction onClick={handlePost} data-testid="button-confirm-post">{isRtl ? "ترحيل" : "Post"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent dir={dir}>
          <AlertDialogHeader>
            <AlertDialogTitle>{isRtl ? "حذف القيد؟" : "Delete this entry?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isRtl ? "سيتم حذف القيد وجميع سطوره نهائياً." : "The entry and all its lines will be permanently deleted."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isRtl ? "إلغاء" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700" data-testid="button-confirm-delete">
              {isRtl ? "حذف" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
