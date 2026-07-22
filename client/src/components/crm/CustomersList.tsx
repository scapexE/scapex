import { useState, useEffect, useCallback, useMemo } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useActiveRole } from "@/contexts/ActiveRoleContext";
import { useBusinessActivity } from "@/contexts/BusinessActivityContext";
import { scopedFetch, apiRequest } from "@/lib/queryClient";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  Search, Filter, Mail, Phone, MapPin, Plus, Trash2, Loader2,
  MoreVertical, Building, Star, MessageSquare, Download, Copy, FileText,
  ClipboardCheck, UserCog, User as UserIcon, Users, CircleDollarSign
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { WhatsAppAction } from "./actions/WhatsAppAction";
import { EmailAction } from "./actions/EmailAction";
import { SurveyAction } from "./actions/SurveyAction";
import { CustomerCard, type Customer } from "./CustomerCard";
import { useToast } from "@/hooks/use-toast";
import { ExportMenu } from "@/components/shared/ExportMenu";
import type { ExportColumn } from "@/lib/exportUtils";

interface DbContact {
  id: number;
  nameAr: string | null;
  nameEn: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  organization: string | null;
  position: string | null;
  source: string | null;
  address: string | null;
  city: string | null;
  notes: string | null;
  isActive: boolean | null;
  activityId: string | null;
  assignedTo: string | null;
  createdBy: string | null;
  serviceEmployeeIds: string[] | null;
}

interface SimpleUser {
  id: string;
  name: string;
  email?: string;
  role?: string;
  roles?: string[];
}

interface PaymentAlert {
  contactId: number;
  overdue: number;
  dueSoon: number;
  nextDueDate: string | null;
  totalRemaining: string;
}

function toCustomer(c: DbContact, isRtl: boolean): Customer {
  const name = (isRtl ? c.nameAr : c.nameEn) || c.nameEn || c.nameAr || "—";
  return {
    id: String(c.id),
    name,
    industry: c.organization || (isRtl ? "غير محدد" : "N/A"),
    contact: c.position || name,
    email: c.email || "",
    phone: c.phone || c.mobile || "",
    status: c.isActive === false ? "inactive" : (c.source === "lead" ? "lead" : "active"),
    rating: 4,
    assignedTo: c.assignedTo || null,
    serviceEmployeeIds: Array.isArray(c.serviceEmployeeIds) ? c.serviceEmployeeIds : null,
  };
}

export function CustomersList({
  onCreateProposal,
  openAddDialogSignal,
}: {
  onCreateProposal?: (clientName: string, email: string, phone: string, contactId?: number) => void;
  openAddDialogSignal?: number;
}) {
  const { t, dir } = useLanguage();
  const { toast } = useToast();
  const { currentUser } = useActiveRole();
  const { activeActivity, activities, getActivityUserIds } = useBusinessActivity();
  const isAdmin = currentUser?.role === "admin" || (currentUser?.roles ?? []).includes("admin");
  const isManager = currentUser?.role === "manager" || (currentUser?.roles ?? []).includes("manager");
  const canSeeAll = isAdmin || isManager;
  const isRtl = dir === "rtl";

  const [rows, setRows] = useState<DbContact[]>([]);
  const [users, setUsers] = useState<SimpleUser[]>([]);
  const [payAlerts, setPayAlerts] = useState<Map<number, PaymentAlert>>(new Map());
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(canSeeAll);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [cardCustomer, setCardCustomer] = useState<Customer | null>(null);
  const [cardOpen, setCardOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [assignTarget, setAssignTarget] = useState<DbContact | null>(null);
  const [assignTo, setAssignTo] = useState<string>("");
  const [assignActivity, setAssignActivity] = useState<string>("");
  const [assignServiceIds, setAssignServiceIds] = useState<string[]>([]);
  const [form, setForm] = useState({
    nameAr: "", nameEn: "", organization: "", position: "",
    email: "", phone: "", city: "", address: "", source: "active", notes: "", crNumber: "", nationalId: "",
  });


  const fetchData = useCallback(async () => {
    const isPriv = isAdmin || isManager;
    if (!activeActivity && !isPriv) {
      setRows([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (activeActivity?.id) params.set("activityId", activeActivity.id);
      // "Mine" mode: any user can filter to only their own assigned customers
      if (!showAll && currentUser?.id) params.set("assignedTo", currentUser.id);
      const url = `/api/customers${params.toString() ? `?${params.toString()}` : ""}`;
      const [r, u, pa] = await Promise.all([
        scopedFetch(url).then(x => x.json()),
        scopedFetch("/api/users").then(x => x.json()),
        scopedFetch("/api/crm/payment-alerts").then(x => x.json()).catch(() => []),
      ]);
      setRows(Array.isArray(r) ? r : []);
      setUsers(Array.isArray(u) ? u : []);
      setPayAlerts(new Map((Array.isArray(pa) ? pa : []).map((a: PaymentAlert) => [a.contactId, a])));
    } catch (err) {
      console.error("Failed to load customers:", err);
      toast({
        title: isRtl ? "تعذر تحميل العملاء" : "Failed to load customers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, isRtl, activeActivity, isAdmin, isManager, showAll, currentUser?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (openAddDialogSignal !== undefined && openAddDialogSignal > 0) {
      setAddOpen(true);
    }
  }, [openAddDialogSignal]);

  const userById = (id: string | null | undefined) =>
    id ? users.find(u => u.id === id) : null;

  // Server now enforces ownership — rows already contain only what this user may see.
  // For privileged users, showAll/Mine is also server-enforced via ?assignedTo=.
  const visibleRows = rows;

  const customers = visibleRows.map((r) => toCustomer(r, isRtl));

  const filtered = search.trim()
    ? customers.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.contact.toLowerCase().includes(search.toLowerCase()) ||
        c.industry.toLowerCase().includes(search.toLowerCase())
      )
    : customers;

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedIds(e.target.checked ? filtered.map(c => c.id) : []);
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectedCustomers = customers.filter(c => selectedIds.includes(c.id));

  const handleExportCSV = () => {
    if (!selectedIds.length) return;
    const headers = ['Company', 'Contact', 'Email', 'Phone', 'Industry', 'Status'];
    const csvContent = [
      headers.join(','),
      ...selectedCustomers.map(c => `"${c.name}","${c.contact}","${c.email}","${c.phone}","${c.industry}","${c.status}"`)
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', 'customers_export.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({
      title: isRtl ? 'تم التصدير بنجاح' : 'Export Successful',
      description: isRtl ? `تم تصدير ${selectedIds.length} عميل إلى ملف CSV.` : `Exported ${selectedIds.length} customers to CSV.`,
    });
  };

  const handleCopyData = () => {
    if (!selectedIds.length) return;
    const header = isRtl
      ? "الاسم\t\tجهة الاتصال\t\tالبريد الإلكتروني\t\tالهاتف\t\tالمدينة\t\tالحالة"
      : "Name\t\tContact\t\tEmail\t\tPhone\t\tCity\t\tStatus";
    const csvRows = selectedCustomers.map(c => {
      const dbRow = rows.find(r => String(r.id) === c.id);
      return [c.name, c.contact, c.email || "—", c.phone || "—", dbRow?.city || "—", c.status].join("\t\t");
    });
    const text = [header, ...csvRows].join("\n");
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: isRtl ? "✅ تم النسخ" : "✅ Copied",
        description: isRtl
          ? `تم نسخ بيانات ${selectedIds.length} عميل — يمكنك لصقها في Excel أو Word`
          : `Copied ${selectedIds.length} customer(s) — paste into Excel or Word`,
      });
    });
  };

  const openCard = (customer: Customer) => {
    setCardCustomer(customer);
    setCardOpen(true);
  };

  const resetForm = () => setForm({
    nameAr: "", nameEn: "", organization: "", position: "",
    email: "", phone: "", city: "", address: "", source: "active", notes: "", crNumber: "", nationalId: "",
  });

  const handleSave = async () => {
    if (!form.nameAr.trim() && !form.nameEn.trim()) {
      toast({ title: isRtl ? "الاسم مطلوب" : "Name is required", variant: "destructive" });
      return;
    }
    try {
      setSaving(true);
      const res = await apiRequest("POST", "/api/customers", {
        ...form,
        ...(activeActivity ? { activityId: activeActivity.id } : {}),
        createdBy: currentUser?.id || null,
        assignedTo: currentUser?.id || null,
      });
      if (!res.ok) throw new Error("save failed");
      const data = await res.json();
      if (data._linked) {
        // CR number matched an existing company — linked instead of duplicated
        toast({
          title: isRtl ? "✅ شركة موجودة مسبقاً — تم الربط" : "✅ Company already exists — linked",
          description: isRtl
            ? "السجل التجاري موجود في النظام، تم ربطك بالملف الموجود لتجنب التكرار."
            : "CR number already in the system. You were linked to the existing profile.",
        });
      } else if (data._portalInvited) {
        toast({
          title: isRtl ? "✅ تم إضافة العميل وتفعيل بوابة العملاء" : "✅ Customer added & portal activated",
          description: isRtl
            ? "تم إرسال بيانات الدخول المؤقتة إلى بريد العميل الإلكتروني."
            : "Temporary login credentials were emailed to the client.",
        });
      } else {
        toast({ title: isRtl ? "تم إضافة العميل وإسناده لك" : "Customer added and assigned to you" });
      }
      setAddOpen(false);
      resetForm();
      await fetchData();
    } catch {
      toast({ title: isRtl ? "تعذر حفظ العميل" : "Failed to save customer", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await apiRequest("DELETE", `/api/customers/${deleteId}`);
      if (!res.ok) throw new Error("delete failed");
      toast({ title: isRtl ? "تم حذف العميل" : "Customer deleted" });
      setSelectedIds(prev => prev.filter(id => id !== deleteId));
      setDeleteId(null);
      await fetchData();
    } catch {
      toast({ title: isRtl ? "تعذر حذف العميل" : "Failed to delete customer", variant: "destructive" });
    }
  };

  // Owner = currently assigned employee. After a transfer the original holder
  // loses ownership, so we only check assignedTo (not createdBy).
  const canReassign = (c: DbContact) => {
    if (isAdmin || isManager) return true;
    return c.assignedTo === currentUser?.id;
  };

  const openAssignDialog = (c: DbContact) => {
    setAssignTarget(c);
    setAssignTo(c.assignedTo || "");
    setAssignActivity(c.activityId || activeActivity?.id || "");
    setAssignServiceIds(Array.isArray(c.serviceEmployeeIds) ? c.serviceEmployeeIds : []);
  };

  // Users that belong to a given activity (for the dialog dropdown)
  const usersForActivity = useMemo(() => {
    if (!assignActivity) return [] as SimpleUser[];
    const ids = new Set(getActivityUserIds(assignActivity));
    const base = users.filter(u => {
      if (!ids.has(u.id)) return false;
      const roles = new Set<string>([u.role || "", ...(u.roles || [])]);
      if (roles.has("client") || roles.has("viewer")) return false;
      return true;
    });
    // Always include the current assignee even if removed from this activity
    const currentAssigneeId = assignTarget?.assignedTo;
    if (currentAssigneeId && !base.some(u => u.id === currentAssigneeId)) {
      const cur = users.find(u => u.id === currentAssigneeId);
      if (cur) return [cur, ...base];
    }
    return base;
  }, [assignActivity, users, getActivityUserIds, assignTarget?.assignedTo]);

  const handleAssign = async () => {
    if (!assignTarget) return;
    const canChangeActivity = isAdmin || isManager;
    const activityChanged = canChangeActivity && assignActivity && assignActivity !== assignTarget.activityId;
    if (!assignTo) {
      toast({ title: isRtl ? "اختر موظفاً" : "Choose an employee", variant: "destructive" });
      return;
    }
    try {
      const body: any = { assignedTo: assignTo };
      if (activityChanged) body.activityId = assignActivity;
      // Manager/admin can also update the service team
      if (isAdmin || isManager) body.serviceEmployeeIds = assignServiceIds.filter(id => id !== assignTo);
      const res = await apiRequest("PATCH", `/api/customers/${assignTarget.id}`, body);
      if (!res.ok) throw new Error("assign failed");
      const targetUser = userById(assignTo);
      toast({
        title: isRtl ? "تم تحديث إسناد العميل" : "Customer assignment updated",
        description: targetUser ? (isRtl ? `المسؤول الأساسي: ${targetUser.name}` : `Primary owner: ${targetUser.name}`) : "",
      });
      setAssignTarget(null);
      await fetchData();
    } catch {
      toast({ title: isRtl ? "تعذر الحفظ" : "Failed to save", variant: "destructive" });
    }
  };

  return (
    <>
      <Card className="flex-1 border-border/50 shadow-sm overflow-hidden flex flex-col h-full relative">
        <CardHeader className="p-4 border-b border-border/50 bg-card">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-80">
                <Search className={cn("absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground", isRtl ? "right-3" : "left-3")} />
                <Input
                  placeholder={t('crm.cust.search')}
                  className={cn("h-9 bg-secondary/50 border-0", isRtl ? "pr-9" : "pl-9")}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  data-testid="input-search-customers"
                />
              </div>
              <Button variant="outline" size="icon" className="h-9 w-9 shrink-0">
                <Filter className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1 text-xs">
                <Button
                  size="sm"
                  variant={showAll ? "default" : "outline"}
                  className="h-9 px-2"
                  onClick={() => setShowAll(true)}
                  data-testid="button-filter-all"
                >
                  {isRtl ? "الكل" : "All"}
                </Button>
                <Button
                  size="sm"
                  variant={!showAll ? "default" : "outline"}
                  className="h-9 px-2"
                  onClick={() => setShowAll(false)}
                  data-testid="button-filter-mine"
                >
                  {isRtl ? "عملائي" : "Mine"}
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm text-muted-foreground font-medium">
                {filtered.length} {t('crm.cust.total')}
                {activeActivity && (
                  <span className="ms-2 text-xs text-primary">· {isRtl ? activeActivity.nameAr : activeActivity.nameEn}</span>
                )}
              </div>
              {filtered.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => {
                    if (selectedIds.length === filtered.length) {
                      setSelectedIds([]);
                    } else {
                      setSelectedIds(filtered.map(c => c.id));
                    }
                  }}
                  data-testid="button-select-all-customers"
                >
                  <input
                    type="checkbox"
                    readOnly
                    className="w-3.5 h-3.5 accent-primary pointer-events-none"
                    checked={selectedIds.length === filtered.length && filtered.length > 0}
                    ref={el => { if (el) el.indeterminate = selectedIds.length > 0 && selectedIds.length < filtered.length; }}
                  />
                  {selectedIds.length === filtered.length && filtered.length > 0
                    ? (isRtl ? "إلغاء التحديد" : "Deselect all")
                    : (isRtl ? "تحديد الكل" : "Select all")}
                </Button>
              )}
              <ExportMenu
                title={isRtl ? "قائمة العملاء" : "Customers List"}
                filename="customers"
                data={filtered}
                columns={[
                  { key: "name", header: isRtl ? "الاسم" : "Name", accessor: (c: Customer) => c.name },
                  { key: "industry", header: isRtl ? "الشركة" : "Company", accessor: (c: Customer) => c.industry },
                  { key: "contact", header: isRtl ? "جهة الاتصال" : "Contact", accessor: (c: Customer) => c.contact },
                  { key: "email", header: isRtl ? "البريد الإلكتروني" : "Email", accessor: (c: Customer) => c.email },
                  { key: "phone", header: isRtl ? "الهاتف" : "Phone", accessor: (c: Customer) => c.phone },
                  { key: "mobile", header: isRtl ? "الجوال" : "Mobile", accessor: (c: Customer) => rows.find(r => String(r.id) === c.id)?.mobile || "" },
                  { key: "nationalId", header: isRtl ? "رقم الهوية" : "National ID", accessor: (c: Customer) => (rows.find(r => String(r.id) === c.id) as any)?.nationalId || "" },
                  { key: "crNumber", header: isRtl ? "السجل التجاري" : "CR Number", accessor: (c: Customer) => (rows.find(r => String(r.id) === c.id) as any)?.crNumber || "" },
                  { key: "city", header: isRtl ? "المدينة" : "City", accessor: (c: Customer) => rows.find(r => String(r.id) === c.id)?.city || "" },
                  { key: "address", header: isRtl ? "العنوان" : "Address", accessor: (c: Customer) => rows.find(r => String(r.id) === c.id)?.address || "" },
                  { key: "status", header: isRtl ? "الحالة" : "Status", accessor: (c: Customer) => c.status === "active" ? (isRtl ? "نشط" : "Active") : c.status === "inactive" ? (isRtl ? "غير نشط" : "Inactive") : (isRtl ? "عميل محتمل" : "Lead") },
                  { key: "notes", header: isRtl ? "ملاحظات" : "Notes", accessor: (c: Customer) => rows.find(r => String(r.id) === c.id)?.notes || "" },
                ] as ExportColumn<Customer>[]}
              />
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90 gap-1.5"
                onClick={() => setAddOpen(true)}
                disabled={!activeActivity}
                data-testid="button-add-customer"
              >
                <Plus className="w-4 h-4" />
                {isRtl ? "إضافة عميل" : "Add Customer"}
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Bulk Actions */}
        {selectedIds.length > 0 && (
          <div className="bg-primary/5 border-b border-primary/20 p-2 flex items-center justify-between animate-in fade-in slide-in-from-top-2 px-4">
            <Badge variant="secondary" className="bg-primary/20 text-primary hover:bg-primary/20">
              {selectedIds.length} {t('crm.cust.selected')}
            </Badge>
            <div className="flex items-center gap-2">
              <WhatsAppAction
                selectedCount={selectedIds.length} isBulk
                customers={selectedCustomers.map(c => ({ name: c.name, phone: c.phone || "" }))}
                trigger={<Button size="sm" variant="outline" className="h-8 gap-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950"><MessageSquare className="w-3 h-3" /><span className="hidden sm:inline">{t('crm.cust.bulk_whatsapp')}</span></Button>}
              />
              <EmailAction
                selectedCount={selectedIds.length} isBulk
                customers={selectedCustomers.map(c => ({ name: c.name, email: c.email || "" }))}
                trigger={<Button size="sm" variant="outline" className="h-8 gap-1 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950"><Mail className="w-3 h-3" /><span className="hidden sm:inline">{t('crm.cust.bulk_email')}</span></Button>}
              />
              <SurveyAction selectedCount={selectedIds.length} isBulk
                selectedCustomers={selectedCustomers.map(c => ({ id: c.id, name: c.name, email: c.email, phone: c.phone }))}
                trigger={<Button size="sm" variant="outline" className="h-8 gap-1 border-orange-200 text-orange-700 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-400 dark:hover:bg-orange-950" data-testid="button-bulk-survey"><ClipboardCheck className="w-3 h-3" /><span className="hidden sm:inline">{isRtl ? "استطلاع رضا" : "Survey"}</span></Button>}
              />
              <div className="w-px h-4 bg-border mx-1" />
              <Button size="sm" variant="ghost" className="h-8 gap-1" onClick={handleCopyData}><Copy className="w-3 h-3" /><span className="hidden sm:inline">{t('crm.cust.copy')}</span></Button>
              <Button size="sm" variant="ghost" className="h-8 gap-1" onClick={handleExportCSV}><Download className="w-3 h-3" /><span className="hidden sm:inline">{t('crm.cust.export')}</span></Button>
            </div>
          </div>
        )}

        <div className="overflow-auto flex-1 bg-card">
          {loading ? (
            <div className="flex items-center justify-center h-full p-12 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2 rtl:ml-2 rtl:mr-0" />
              {isRtl ? "جاري التحميل..." : "Loading..."}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-12 text-center text-muted-foreground gap-3">
              <Building className="w-12 h-12 opacity-30" />
              <div className="font-medium">
                {!activeActivity
                  ? (isRtl ? "لا يوجد نشاط مختار" : "No activity selected")
                  : (canSeeAll && showAll
                    ? (isRtl ? "لا يوجد عملاء في هذا النشاط بعد" : "No customers in this activity yet")
                    : (isRtl ? "لا يوجد عملاء مسندون إليك" : "No customers assigned to you"))}
              </div>
              {activeActivity && (
                <Button size="sm" onClick={() => setAddOpen(true)} data-testid="button-add-first-customer">
                  <Plus className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
                  {isRtl ? "أضف عميل" : "Add customer"}
                </Button>
              )}
            </div>
          ) : (
          <Table>
            <TableHeader className="bg-secondary/50 sticky top-0 z-10 shadow-sm">
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="w-12 text-center p-0 align-middle">
                  <div className="flex items-center justify-center h-full w-full">
                    <input type="checkbox" className="rounded border-border w-4 h-4 accent-primary cursor-pointer"
                      checked={selectedIds.length === filtered.length && filtered.length > 0}
                      onChange={handleSelectAll} />
                  </div>
                </TableHead>
                <TableHead className={isRtl ? 'text-right' : 'text-left'}>{t('crm.cust.col.company')}</TableHead>
                <TableHead className={isRtl ? 'text-right' : 'text-left'}>{t('crm.cust.col.contact')}</TableHead>
                <TableHead className={isRtl ? 'text-right' : 'text-left'}>{isRtl ? "الموظف المسؤول" : "Assigned to"}</TableHead>
                <TableHead className={isRtl ? 'text-right' : 'text-left'}>{t('crm.cust.col.status')}</TableHead>
                <TableHead className={isRtl ? 'text-left' : 'text-right'}>{t('crm.cust.col.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((customer) => {
                const dbRow = rows.find(r => String(r.id) === customer.id)!;
                const assignedUser = userById(dbRow?.assignedTo);
                const isSelected = selectedIds.includes(customer.id);
                return (
                  <TableRow
                    key={customer.id}
                    data-testid={`row-customer-${customer.id}`}
                    className={cn("border-border/50 transition-colors group cursor-pointer", isSelected ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/30")}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).tagName === 'INPUT') return;
                      openCard(customer);
                    }}
                  >
                    <TableCell className="text-center p-0 align-middle">
                      <div className="flex items-center justify-center h-full w-full">
                        <input type="checkbox" className="rounded border-border w-4 h-4 accent-primary cursor-pointer"
                          checked={isSelected} onChange={() => handleSelectOne(customer.id)} />
                      </div>
                    </TableCell>
                    <TableCell className={isRtl ? 'text-right' : 'text-left'}>
                      <div className="flex items-center gap-3">
                        <div className={cn("w-10 h-10 rounded flex items-center justify-center shrink-0 border transition-colors", isSelected ? "bg-primary/20 border-primary/30" : "bg-primary/10 border-primary/20")}>
                          <Building className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-semibold text-foreground flex items-center gap-2 flex-wrap">
                            {customer.name}
                            {customer.rating === 5 && <Star className="w-3 h-3 fill-amber-400 text-amber-400" />}
                            {(dbRow as any)?.crNumber && (
                              <span className="text-[10px] font-mono font-normal bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded px-1.5 py-0.5">
                                CR {(dbRow as any).crNumber}
                              </span>
                            )}
                            {(dbRow as any)?.nationalId && (
                              <span className="text-[10px] font-mono font-normal bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded px-1.5 py-0.5" data-testid={`text-national-id-${customer.id}`}>
                                {isRtl ? "هوية" : "ID"} {(dbRow as any).nationalId}
                              </span>
                            )}
                            {(() => {
                              const alert = payAlerts.get(dbRow.id);
                              if (!alert) return null;
                              const hasOverdue = alert.overdue > 0;
                              const title = isRtl
                                ? `${hasOverdue ? `${alert.overdue} دفعة متأخرة` : ""}${hasOverdue && alert.dueSoon > 0 ? " + " : ""}${alert.dueSoon > 0 ? `${alert.dueSoon} دفعة قريبة الاستحقاق` : ""} — المتبقي ${Number(alert.totalRemaining).toLocaleString()} ر.س${alert.nextDueDate ? ` — أقرب استحقاق ${alert.nextDueDate}` : ""}`
                                : `${hasOverdue ? `${alert.overdue} overdue` : ""}${hasOverdue && alert.dueSoon > 0 ? " + " : ""}${alert.dueSoon > 0 ? `${alert.dueSoon} due soon` : ""} — remaining ${Number(alert.totalRemaining).toLocaleString()} SAR${alert.nextDueDate ? ` — next due ${alert.nextDueDate}` : ""}`;
                              return (
                                <span
                                  title={title}
                                  data-testid={`badge-payment-alert-${customer.id}`}
                                  className={cn(
                                    "inline-flex items-center gap-1 text-[10px] font-normal rounded px-1.5 py-0.5 border",
                                    hasOverdue
                                      ? "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 animate-pulse"
                                      : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                                  )}
                                >
                                  <CircleDollarSign className="w-3 h-3" />
                                  {isRtl
                                    ? (hasOverdue ? "دفعة متأخرة" : "دفعة مستحقة")
                                    : (hasOverdue ? "Overdue" : "Due soon")}
                                </span>
                              );
                            })()}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" />
                            {dbRow?.city || (isRtl ? "غير محدد" : "—")}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className={isRtl ? 'text-right' : 'text-left'}>
                      <div className="text-sm font-medium">{customer.contact}</div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        {customer.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {customer.email}</span>}
                        {customer.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /><span dir="ltr">{customer.phone}</span></span>}
                      </div>
                    </TableCell>
                    <TableCell className={isRtl ? 'text-right' : 'text-left'}>
                      <div className="flex flex-col gap-1">
                        {assignedUser ? (
                          <Badge variant="outline" className="font-normal gap-1 border-primary/30 text-primary bg-primary/5 w-fit">
                            <UserIcon className="w-3 h-3" />
                            {assignedUser.name}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="font-normal text-muted-foreground w-fit">
                            {isRtl ? "غير مسند" : "Unassigned"}
                          </Badge>
                        )}
                        {Array.isArray(dbRow.serviceEmployeeIds) && dbRow.serviceEmployeeIds.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {dbRow.serviceEmployeeIds.slice(0, 3).map(sid => {
                              const su = userById(sid);
                              if (!su) return null;
                              return (
                                <Badge key={sid} variant="outline" className="font-normal gap-1 border-indigo-200 text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-800 text-[10px] px-1.5 py-0 w-fit">
                                  <Users className="w-2.5 h-2.5" />
                                  {su.name}
                                </Badge>
                              );
                            })}
                            {dbRow.serviceEmployeeIds.length > 3 && (
                              <Badge variant="outline" className="font-normal text-muted-foreground text-[10px] px-1.5 py-0 w-fit">
                                +{dbRow.serviceEmployeeIds.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className={isRtl ? 'text-right' : 'text-left'}>
                      <Badge variant="outline" className={cn("font-normal border-transparent",
                        customer.status === 'active' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                        customer.status === 'lead' ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                        "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                      )}>
                        {customer.status.charAt(0).toUpperCase() + customer.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className={isRtl ? 'text-left' : 'text-right'}>
                      <div className={cn("flex items-center gap-1", isRtl ? "justify-start" : "justify-end")}>
                        <WhatsAppAction customerName={customer.contact} phoneNumber={customer.phone}
                          trigger={<Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100"><MessageSquare className="h-4 w-4" /></Button>}
                        />
                        <EmailAction customerName={customer.contact} email={customer.email}
                          trigger={<Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-100"><Mail className="h-4 w-4" /></Button>}
                        />
                        <SurveyAction
                          customerId={customer.id} customerName={customer.name}
                          email={customer.email} phone={customer.phone}
                          trigger={<Button variant="ghost" size="icon" className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-100" title={isRtl ? "استطلاع رضا" : "Survey"} data-testid={`button-survey-${customer.id}`}><ClipboardCheck className="h-4 w-4" /></Button>}
                        />
                        {onCreateProposal && (
                          <Button variant="ghost" size="icon"
                            className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                            title={isRtl ? 'طلب عرض سعر' : 'Request Quote'}
                            data-testid={`button-quote-${customer.id}`}
                            onClick={() => onCreateProposal(customer.name, customer.email, customer.phone, parseInt(customer.id) || undefined)}>
                            <FileText className="h-4 w-4" />
                          </Button>
                        )}
                        {canReassign(dbRow) && (
                          <Button variant="ghost" size="icon"
                            className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-100"
                            title={isRtl ? "نقل / إسناد لموظف آخر" : "Transfer / Assign to another employee"}
                            data-testid={`button-assign-customer-${customer.id}`}
                            onClick={() => openAssignDialog(dbRow)}>
                            <UserCog className="h-4 w-4" />
                          </Button>
                        )}
                        {isAdmin && (
                          <Button variant="ghost" size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-100"
                            title={isRtl ? "حذف العميل" : "Delete customer"}
                            data-testid={`button-delete-customer-${customer.id}`}
                            onClick={() => setDeleteId(customer.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => openCard(customer)} data-testid={`button-view-${customer.id}`}>
                          <MoreVertical className="h-4 w-4" />
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

        <div className="border-t border-border/50 p-3 flex items-center justify-between text-xs text-muted-foreground bg-card">
          <span>{t('action.showing')} 1 {t('action.to')} {filtered.length} {t('action.of')} {filtered.length} {t('action.entries')}</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled className="h-7 px-2 text-xs">{t('action.previous')}</Button>
            <Button variant="outline" size="sm" className="h-7 w-7 p-0 bg-primary text-primary-foreground border-primary">1</Button>
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs">{t('action.next')}</Button>
          </div>
        </div>
      </Card>

      {/* Customer Detail Card */}
      <CustomerCard
        customer={cardCustomer}
        open={cardOpen}
        onClose={() => setCardOpen(false)}
        onCreateProposal={(name, email, phone) => {
          if (onCreateProposal) onCreateProposal(name, email, phone);
        }}
      />

      {/* Add Customer Dialog */}
      <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-2xl" dir={dir} data-testid="dialog-add-customer">
          <DialogHeader>
            <DialogTitle>{isRtl ? "إضافة عميل جديد" : "Add New Customer"}</DialogTitle>
            <DialogDescription>
              {activeActivity
                ? (isRtl
                    ? `سيتم حفظ العميل ضمن نشاط "${activeActivity.nameAr}" وإسناده لك مباشرة.`
                    : `Customer will be saved under "${activeActivity.nameEn}" activity and assigned to you.`)
                : (isRtl ? "اختر نشاطاً تجارياً أولاً." : "Select a business activity first.")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="cust-name-ar">{isRtl ? "اسم الشركة / العميل (عربي)" : "Company / Client Name (Arabic)"} *</Label>
              <Input id="cust-name-ar" value={form.nameAr} onChange={e => setForm({ ...form, nameAr: e.target.value })} data-testid="input-customer-name-ar" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cust-name-en">{isRtl ? "اسم الشركة / العميل (إنجليزي)" : "Company / Client Name (English)"}</Label>
              <Input id="cust-name-en" value={form.nameEn} onChange={e => setForm({ ...form, nameEn: e.target.value })} data-testid="input-customer-name-en" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cust-cr-number" className="flex items-center gap-1.5">
                {isRtl ? "السجل التجاري / الرقم الموحد" : "CR Number / Unified ID"}
                <span className="text-[10px] font-normal text-muted-foreground border border-border rounded px-1">
                  {isRtl ? "يمنع التكرار" : "prevents duplicates"}
                </span>
              </Label>
              <Input
                id="cust-cr-number"
                value={form.crNumber}
                onChange={e => setForm({ ...form, crNumber: e.target.value })}
                placeholder={isRtl ? "مثال: 1010XXXXXX" : "e.g. 1010XXXXXX"}
                dir="ltr"
                data-testid="input-customer-cr-number"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cust-national-id">{isRtl ? "رقم الهوية (لبوابة العميل)" : "National ID (for client portal)"}</Label>
              <Input
                id="cust-national-id"
                value={form.nationalId}
                onChange={e => setForm({ ...form, nationalId: e.target.value })}
                placeholder={isRtl ? "10 أرقام" : "10 digits"}
                dir="ltr"
                data-testid="input-customer-national-id"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cust-org">{isRtl ? "القطاع / الصناعة" : "Industry / Sector"}</Label>
              <Input id="cust-org" value={form.organization} onChange={e => setForm({ ...form, organization: e.target.value })} data-testid="input-customer-organization" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cust-position">{isRtl ? "اسم جهة الاتصال" : "Contact Person"}</Label>
              <Input id="cust-position" value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} data-testid="input-customer-contact" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cust-email">{isRtl ? "البريد الإلكتروني" : "Email"}</Label>
              <Input id="cust-email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} data-testid="input-customer-email" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cust-phone">{isRtl ? "الجوال" : "Phone"}</Label>
              <Input id="cust-phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} dir="ltr" data-testid="input-customer-phone" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cust-city">{isRtl ? "المدينة" : "City"}</Label>
              <Input id="cust-city" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} data-testid="input-customer-city" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cust-source">{isRtl ? "الحالة" : "Status"}</Label>
              <select
                id="cust-source"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.source}
                onChange={e => setForm({ ...form, source: e.target.value })}
                data-testid="select-customer-source"
              >
                <option value="active">{isRtl ? "نشط" : "Active"}</option>
                <option value="lead">{isRtl ? "محتمل" : "Lead"}</option>
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="cust-address">{isRtl ? "العنوان" : "Address"}</Label>
              <Input id="cust-address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} data-testid="input-customer-address" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="cust-notes">{isRtl ? "ملاحظات" : "Notes"}</Label>
              <Textarea id="cust-notes" rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} data-testid="input-customer-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} data-testid="button-cancel-customer">
              {isRtl ? "إلغاء" : "Cancel"}
            </Button>
            <Button onClick={handleSave} disabled={saving || !activeActivity} data-testid="button-save-customer">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2 rtl:ml-2 rtl:mr-0" /> : null}
              {isRtl ? "حفظ" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign / Transfer Dialog */}
      <Dialog open={!!assignTarget} onOpenChange={(o) => { if (!o) setAssignTarget(null); }}>
        <DialogContent dir={dir} data-testid="dialog-assign-customer">
          <DialogHeader>
            <DialogTitle>{isRtl ? "نقل / إسناد العميل" : "Transfer / Assign Customer"}</DialogTitle>
            <DialogDescription>
              {assignTarget && (isAdmin
                ? (isRtl
                    ? `بصفتك مدير النظام يمكنك تغيير النشاط والموظف المسؤول عن العميل "${assignTarget.nameAr || assignTarget.nameEn}".`
                    : `As system admin you can change the activity and the responsible employee for "${assignTarget.nameEn || assignTarget.nameAr}".`)
                : (isRtl
                    ? `اختر الموظف المسؤول عن متابعة العميل "${assignTarget.nameAr || assignTarget.nameEn}".`
                    : `Choose the employee responsible for "${assignTarget.nameEn || assignTarget.nameAr}".`))}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-3">
            {/* Activity picker: visible to admin and manager */}
            {(isAdmin || isManager) && (
              <div className="space-y-1.5">
                <Label htmlFor="assign-activity">{isRtl ? "النشاط التجاري" : "Business activity"}</Label>
                <select
                  id="assign-activity"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={assignActivity}
                  onChange={(e) => { setAssignActivity(e.target.value); setAssignTo(""); }}
                  data-testid="select-assign-activity"
                >
                  <option value="">{isRtl ? "— اختر نشاطاً —" : "— Choose —"}</option>
                  {activities.filter(a => a.active).map(a => (
                    <option key={a.id} value={a.id}>
                      {isRtl ? a.nameAr : a.nameEn}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="assign-to">{isRtl ? "الموظف المسؤول الجديد" : "New responsible employee"}</Label>
              <select
                id="assign-to"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={assignTo}
                onChange={(e) => setAssignTo(e.target.value)}
                data-testid="select-assign-to"
              >
                <option value="">{isRtl ? "— اختر موظفاً —" : "— Choose —"}</option>
                {usersForActivity.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} {u.role ? `(${u.role})` : ""}
                  </option>
                ))}
              </select>
              {usersForActivity.length === 0 && (
                <p className="text-xs text-amber-600">
                  {isRtl ? "لا يوجد موظفون مرتبطون بهذا النشاط." : "No employees assigned to this activity."}
                </p>
              )}
            </div>
            {/* Service Team: admin/manager can assign extra employees */}
            {(isAdmin || isManager) && usersForActivity.length > 0 && (
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  {isRtl ? "فريق الخدمة (اختياري)" : "Service Team (optional)"}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {isRtl
                    ? "الموظفون المضافون هنا يمكنهم الاطلاع على بيانات العميل لأغراض الخدمة والمتابعة."
                    : "Employees added here can view customer details for service and follow-up purposes."}
                </p>
                <div className="max-h-36 overflow-y-auto border border-border/60 rounded-md divide-y divide-border/40">
                  {usersForActivity.filter(u => u.id !== assignTo).map(u => (
                    <label
                      key={u.id}
                      className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-accent/40 text-sm"
                    >
                      <input
                        type="checkbox"
                        className="accent-primary w-4 h-4 rounded"
                        checked={assignServiceIds.includes(u.id)}
                        onChange={e => setAssignServiceIds(prev =>
                          e.target.checked ? [...prev, u.id] : prev.filter(id => id !== u.id)
                        )}
                      />
                      <span>{u.name}</span>
                      {u.role && <span className="text-xs text-muted-foreground">({u.role})</span>}
                    </label>
                  ))}
                </div>
              </div>
            )}
            {/* Warning for regular employees: transfer is one-way */}
            {!isAdmin && !isManager && (
              <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-2">
                {isRtl
                  ? "⚠️ بعد النقل لن تتمكن من رؤية هذا العميل أو تعديل بياناته — يصبح مسؤولية الموظف الجديد."
                  : "⚠️ After transfer you will no longer have access to this customer — ownership moves to the new employee."}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignTarget(null)} data-testid="button-cancel-assign">
              {isRtl ? "إلغاء" : "Cancel"}
            </Button>
            <Button onClick={handleAssign} data-testid="button-confirm-assign">
              {isRtl ? "نقل" : "Transfer"}
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
              {isRtl
                ? "سيتم حذف العميل نهائياً من قاعدة البيانات. هل أنت متأكد؟"
                : "This will permanently delete the customer from the database. Are you sure?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-customer">{isRtl ? "إلغاء" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700" data-testid="button-confirm-delete-customer">
              {isRtl ? "حذف" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
