import { useState, useEffect, useCallback, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Edit, Trash2, ChevronRight, ChevronDown, Loader2, TreePine, TrendingUp, TrendingDown, Scale, Wallet, BarChart3, RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Account {
  id: number; code: string; nameAr: string; nameEn: string | null;
  type: string; parentId: number | null; balance: string | null;
  currency: string | null; isActive: boolean | null;
}

type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";

const TYPE_META: Record<AccountType, { arLabel: string; enLabel: string; color: string; bgColor: string; icon: React.ComponentType<any>; }> = {
  asset:     { arLabel: "أصول",          enLabel: "Assets",      color: "text-blue-600",   bgColor: "bg-blue-50 dark:bg-blue-950/30",   icon: Wallet },
  liability: { arLabel: "مطلوبات",       enLabel: "Liabilities", color: "text-red-600",    bgColor: "bg-red-50 dark:bg-red-950/30",     icon: TrendingDown },
  equity:    { arLabel: "حقوق ملكية",   enLabel: "Equity",      color: "text-purple-600", bgColor: "bg-purple-50 dark:bg-purple-950/30",icon: Scale },
  revenue:   { arLabel: "إيرادات",       enLabel: "Revenue",     color: "text-emerald-600",bgColor: "bg-emerald-50 dark:bg-emerald-950/30",icon: TrendingUp },
  expense:   { arLabel: "مصروفات",       enLabel: "Expenses",    color: "text-amber-600",  bgColor: "bg-amber-50 dark:bg-amber-950/30", icon: BarChart3 },
};

const SAR = (v: string | number | null) =>
  v ? `${parseFloat(String(v)).toLocaleString("ar-SA")} ر.س` : "—";

export function ChartOfAccountsTab() {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";
  const { toast } = useToast();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editAcc, setEditAcc] = useState<Account | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    code: "", nameAr: "", nameEn: "", type: "asset",
    parentId: "", balance: "0",
  });

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/chart-of-accounts");
      const data = await res.json();
      setAccounts(Array.isArray(data) ? data : []);
      // Auto-expand level 1 (single-char codes)
      const rootIds = data.filter((a: Account) => a.parentId === null).map((a: Account) => a.id);
      setExpanded(new Set(rootIds));
    } catch { toast({ title: isRtl ? "خطأ في التحميل" : "Load error", variant: "destructive" }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const toggle = (id: number) =>
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const expandAll = () => setExpanded(new Set(accounts.map(a => a.id)));
  const collapseAll = () => {
    const rootIds = accounts.filter(a => a.parentId === null).map(a => a.id);
    setExpanded(new Set(rootIds));
  };

  // Build tree structure
  const tree = useMemo(() => {
    const byParent: Record<number | string, Account[]> = {};
    for (const acc of accounts) {
      const key = acc.parentId ?? "root";
      if (!byParent[key]) byParent[key] = [];
      byParent[key].push(acc);
    }
    return byParent;
  }, [accounts]);

  const hasChildren = (id: number) => !!(tree[id]?.length);

  // Flat list for search mode
  const searchResults = useMemo(() => {
    if (!search && typeFilter === "all") return null;
    return accounts.filter(a => {
      const q = search.toLowerCase();
      const matchQ = !q || a.code.toLowerCase().includes(q) || a.nameAr.includes(q) || (a.nameEn || "").toLowerCase().includes(q);
      const matchT = typeFilter === "all" || a.type === typeFilter;
      return matchQ && matchT;
    });
  }, [accounts, search, typeFilter]);

  const openAdd = (parentId?: number, type?: string) => {
    setEditAcc(null);
    const parentAcc = parentId ? accounts.find(a => a.id === parentId) : null;
    setForm({
      code: "", nameAr: "", nameEn: "",
      type: type || parentAcc?.type || "asset",
      parentId: parentId ? String(parentId) : "",
      balance: "0",
    });
    setShowForm(true);
  };

  const openEdit = (acc: Account) => {
    setEditAcc(acc);
    setForm({
      code: acc.code, nameAr: acc.nameAr, nameEn: acc.nameEn || "",
      type: acc.type, parentId: acc.parentId ? String(acc.parentId) : "",
      balance: acc.balance || "0",
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.code || !form.nameAr) {
      toast({ title: isRtl ? "يرجى إدخال الرمز والاسم" : "Code and name required", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      const body = { code: form.code, nameAr: form.nameAr, nameEn: form.nameEn || null, type: form.type, parentId: form.parentId || null, balance: form.balance || "0" };
      if (editAcc) {
        await fetch(`/api/chart-of-accounts/${editAcc.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        toast({ title: isRtl ? "تم تحديث الحساب" : "Account updated" });
      } else {
        await fetch("/api/chart-of-accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        toast({ title: isRtl ? "تم إضافة الحساب" : "Account added" });
      }
      setShowForm(false);
      fetchAll();
    } catch { toast({ title: isRtl ? "خطأ" : "Error", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleDelete = async (acc: Account) => {
    try {
      const res = await fetch(`/api/chart-of-accounts/${acc.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { toast({ title: data.error || "Error", variant: "destructive" }); return; }
      toast({ title: isRtl ? "تم حذف الحساب" : "Account deleted" });
      fetchAll();
    } catch { toast({ title: isRtl ? "خطأ" : "Error", variant: "destructive" }); }
  };

  // Stats
  const stats = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const t of Object.keys(TYPE_META)) {
      totals[t] = accounts.filter(a => a.type === t).length;
    }
    return { total: accounts.length, ...totals };
  }, [accounts]);

  // Recursive tree renderer
  const renderNode = (acc: Account, depth: number = 0): React.ReactNode => {
    const meta = TYPE_META[acc.type as AccountType] || TYPE_META.asset;
    const Icon = meta.icon;
    const isExpanded = expanded.has(acc.id);
    const children = tree[acc.id] || [];
    const isRoot = acc.parentId === null;
    const isLevel2 = !isRoot && accounts.find(a => a.id === acc.parentId)?.parentId === null;

    return (
      <div key={acc.id}>
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg group hover:bg-muted/50 cursor-pointer transition-colors",
            isRoot && "bg-secondary/40 font-semibold mb-0.5 mt-2 first:mt-0",
            isLevel2 && "font-medium",
            depth > 0 && isRtl ? "mr-4" : "",
            depth > 0 && !isRtl ? "ml-4" : "",
          )}
          style={{ paddingInlineStart: `${12 + depth * 20}px` }}
          onClick={() => hasChildren(acc.id) && toggle(acc.id)}
          data-testid={`account-row-${acc.id}`}
        >
          {/* Expand icon */}
          <div className="w-4 shrink-0">
            {hasChildren(acc.id) ? (
              isExpanded
                ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            ) : null}
          </div>

          {/* Type icon */}
          <div className={cn("w-6 h-6 rounded flex items-center justify-center shrink-0", meta.bgColor)}>
            <Icon className={cn("w-3 h-3", meta.color)} />
          </div>

          {/* Code */}
          <span className={cn("font-mono text-xs shrink-0 w-16", isRoot ? "text-foreground font-bold text-sm" : "text-muted-foreground")}>
            {acc.code}
          </span>

          {/* Name */}
          <span className={cn("flex-1 text-sm truncate", isRoot ? "text-base" : "")}>
            {isRtl ? acc.nameAr : (acc.nameEn || acc.nameAr)}
          </span>

          {/* Arabic name if EN mode */}
          {!isRtl && acc.nameEn && (
            <span className="text-xs text-muted-foreground hidden lg:block truncate max-w-[140px]">{acc.nameAr}</span>
          )}

          {/* Balance (leaf only) */}
          {!hasChildren(acc.id) && acc.balance && parseFloat(acc.balance) !== 0 && (
            <span className={cn("text-xs font-medium shrink-0", parseFloat(acc.balance) >= 0 ? "text-emerald-600" : "text-red-600")}>
              {SAR(acc.balance)}
            </span>
          )}

          {/* Type badge */}
          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 border-0 font-normal shrink-0 hidden sm:flex", meta.bgColor, meta.color)}>
            {isRtl ? meta.arLabel : meta.enLabel}
          </Badge>

          {/* Actions */}
          <div className={cn("flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0")}
            onClick={e => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary"
              onClick={() => openAdd(acc.id, acc.type)} title={isRtl ? "إضافة حساب فرعي" : "Add sub-account"}>
              <Plus className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary"
              onClick={() => openEdit(acc)} title={isRtl ? "تعديل" : "Edit"}>
              <Edit className="w-3 h-3" />
            </Button>
            {!isRoot && (
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-500"
                onClick={() => handleDelete(acc)} title={isRtl ? "حذف" : "Delete"}>
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Children */}
        {isExpanded && children.length > 0 && (
          <div>{children.map(child => renderNode(child, depth + 1))}</div>
        )}
      </div>
    );
  };

  const rootAccounts = tree["root"] || [];

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 lg:grid-cols-5 gap-2">
        {(Object.entries(TYPE_META) as [AccountType, typeof TYPE_META[AccountType]][]).map(([type, meta]) => {
          const Icon = meta.icon;
          return (
            <Card key={type} className={cn("border-border/50 cursor-pointer transition-all", typeFilter === type && "ring-2 ring-primary")}
              onClick={() => setTypeFilter(prev => prev === type ? "all" : type)}>
              <CardContent className="p-3 flex items-center gap-2">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", meta.bgColor)}>
                  <Icon className={cn("w-4 h-4", meta.color)} />
                </div>
                <div className="min-w-0">
                  <p className={cn("text-xs font-semibold truncate", meta.color)}>{isRtl ? meta.arLabel : meta.enLabel}</p>
                  <p className="text-muted-foreground text-xs">{(stats as any)[type] || 0} {isRtl ? "حساب" : "accounts"}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground", isRtl ? "right-3" : "left-3")} />
          <Input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder={isRtl ? "بحث برمز الحساب أو الاسم..." : "Search by code or name..."}
            className={cn("h-9 bg-secondary/30", isRtl ? "pr-9" : "pl-9")}
          />
          {search && (
            <Button variant="ghost" size="icon" className="absolute top-1/2 -translate-y-1/2 h-6 w-6 end-2"
              onClick={() => setSearch("")}>
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
        {typeFilter !== "all" && (
          <Button variant="outline" size="sm" className="h-9 gap-1 text-xs" onClick={() => setTypeFilter("all")}>
            <X className="w-3 h-3" />{isRtl ? "إلغاء الفلتر" : "Clear filter"}
          </Button>
        )}
        <Button variant="outline" size="sm" className="h-9 gap-1" onClick={expandAll} title={isRtl ? "توسيع الكل" : "Expand all"}>
          <ChevronDown className="w-3.5 h-3.5" />{isRtl ? "توسيع" : "Expand"}
        </Button>
        <Button variant="outline" size="sm" className="h-9 gap-1" onClick={collapseAll} title={isRtl ? "طي الكل" : "Collapse all"}>
          <ChevronRight className="w-3.5 h-3.5" />{isRtl ? "طي" : "Collapse"}
        </Button>
        <Button variant="outline" size="sm" className="h-9 gap-1" onClick={fetchAll}>
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
        <Button size="sm" className="h-9 gap-1.5" onClick={() => openAdd()}>
          <Plus className="w-4 h-4" />{isRtl ? "حساب جديد" : "New Account"}
        </Button>
      </div>

      {/* Tree / Search results */}
      <Card className="border-border/50 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : searchResults !== null ? (
          /* Search / Filter flat list */
          <div className="divide-y divide-border/40">
            {searchResults.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">
                <TreePine className="w-8 h-8 mx-auto mb-2 opacity-30" />
                {isRtl ? "لا توجد نتائج" : "No results found"}
              </div>
            ) : searchResults.map(acc => {
              const meta = TYPE_META[acc.type as AccountType] || TYPE_META.asset;
              const Icon = meta.icon;
              const parent = accounts.find(a => a.id === acc.parentId);
              return (
                <div key={acc.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 group transition-colors">
                  <div className={cn("w-7 h-7 rounded flex items-center justify-center shrink-0", meta.bgColor)}>
                    <Icon className={cn("w-3.5 h-3.5", meta.color)} />
                  </div>
                  <span className="font-mono text-xs text-muted-foreground w-14 shrink-0">{acc.code}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{isRtl ? acc.nameAr : (acc.nameEn || acc.nameAr)}</p>
                    {parent && <p className="text-xs text-muted-foreground">{isRtl ? parent.nameAr : (parent.nameEn || parent.nameAr)}</p>}
                  </div>
                  <Badge variant="outline" className={cn("text-[10px] border-0 font-normal hidden sm:flex", meta.bgColor, meta.color)}>
                    {isRtl ? meta.arLabel : meta.enLabel}
                  </Badge>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(acc)}><Edit className="w-3 h-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 hover:text-red-500" onClick={() => handleDelete(acc)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Tree view */
          <div className="p-3">
            {rootAccounts.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <TreePine className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">{isRtl ? "لا توجد حسابات" : "No accounts yet"}</p>
                <Button className="mt-3" size="sm" onClick={() => openAdd()}>
                  <Plus className="w-4 h-4 me-1" />{isRtl ? "إضافة أول حساب" : "Add first account"}
                </Button>
              </div>
            ) : rootAccounts.map(root => renderNode(root, 0))}
          </div>
        )}
      </Card>

      {/* Summary bar */}
      {!loading && accounts.length > 0 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>{isRtl ? `إجمالي الحسابات: ${stats.total}` : `Total accounts: ${stats.total}`}</span>
          <span className="text-[10px]">{isRtl ? "وفق المعايير المحاسبية السعودية SOCPA" : "Per Saudi SOCPA Standards"}</span>
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent dir={dir}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TreePine className="w-5 h-5 text-primary" />
              {editAcc
                ? (isRtl ? "تعديل حساب" : "Edit Account")
                : (isRtl ? "إضافة حساب جديد" : "Add New Account")}
            </DialogTitle>
            <DialogDescription>
              {editAcc
                ? (isRtl ? `تعديل: ${editAcc.code} — ${editAcc.nameAr}` : `Editing: ${editAcc.code} — ${editAcc.nameEn || editAcc.nameAr}`)
                : (isRtl ? "أضف حساباً رئيسياً أو فرعياً في شجرة الحسابات" : "Add a parent or sub-account to the chart")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">{isRtl ? "رمز الحساب *" : "Account Code *"}</Label>
                <Input className="mt-1 h-9 font-mono text-sm" placeholder="e.g. 1101" value={form.code}
                  onChange={e => setForm(p => ({ ...p, code: e.target.value }))} data-testid="input-account-code" />
              </div>
              <div>
                <Label className="text-xs">{isRtl ? "نوع الحساب" : "Account Type"}</Label>
                <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                  <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(TYPE_META) as [string, any][]).map(([t, m]) => (
                      <SelectItem key={t} value={t}>{isRtl ? m.arLabel : m.enLabel}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs">{isRtl ? "الاسم بالعربية *" : "Arabic Name *"}</Label>
              <Input className="mt-1 h-9 text-sm" value={form.nameAr}
                onChange={e => setForm(p => ({ ...p, nameAr: e.target.value }))} placeholder="اسم الحساب بالعربية" data-testid="input-account-name-ar" />
            </div>

            <div>
              <Label className="text-xs">{isRtl ? "الاسم بالإنجليزية" : "English Name"}</Label>
              <Input className="mt-1 h-9 text-sm" value={form.nameEn}
                onChange={e => setForm(p => ({ ...p, nameEn: e.target.value }))} placeholder="Account name in English" />
            </div>

            <div>
              <Label className="text-xs">{isRtl ? "الحساب الأب (اختياري)" : "Parent Account (optional)"}</Label>
              <Select value={form.parentId} onValueChange={v => setForm(p => ({ ...p, parentId: v }))}>
                <SelectTrigger className="mt-1 h-9 text-sm">
                  <SelectValue placeholder={isRtl ? "— حساب رئيسي —" : "— Root account —"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{isRtl ? "— بدون حساب أب —" : "— No parent —"}</SelectItem>
                  {accounts
                    .filter(a => a.id !== editAcc?.id)
                    .sort((a, b) => a.code.localeCompare(b.code))
                    .map(a => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.code} — {isRtl ? a.nameAr : (a.nameEn || a.nameAr)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">{isRtl ? "الرصيد الافتراضي (ر.س)" : "Opening Balance (SAR)"}</Label>
              <Input type="number" className="mt-1 h-9 text-sm" value={form.balance}
                onChange={e => setForm(p => ({ ...p, balance: e.target.value }))} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>{isRtl ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <TreePine className="w-4 h-4" />}
              {editAcc ? (isRtl ? "حفظ التعديلات" : "Save Changes") : (isRtl ? "إضافة الحساب" : "Add Account")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
