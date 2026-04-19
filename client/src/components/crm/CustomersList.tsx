import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useActiveRole } from "@/contexts/ActiveRoleContext";
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
  MoreVertical, Building, Star, MessageSquare, Download, Copy, FileText, ClipboardCheck
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
import { seedDemoSurveys } from "@/lib/surveys";

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
  };
}

export interface CustomersListHandle {
  openAddDialog: () => void;
}

export function CustomersList({
  onCreateProposal,
  openAddDialogSignal,
}: {
  onCreateProposal?: (clientName: string, email: string, phone: string) => void;
  openAddDialogSignal?: number;
}) {
  const { t, dir } = useLanguage();
  const { toast } = useToast();
  const { currentUser } = useActiveRole();
  const isAdmin = currentUser?.role === "admin" || (currentUser?.roles ?? []).includes("admin");
  const isRtl = dir === "rtl";

  const [rows, setRows] = useState<DbContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [cardCustomer, setCardCustomer] = useState<Customer | null>(null);
  const [cardOpen, setCardOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    nameAr: "", nameEn: "", organization: "", position: "",
    email: "", phone: "", city: "", address: "", source: "active", notes: "",
  });

  useEffect(() => { seedDemoSurveys(); }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const r = await fetch("/api/customers");
      if (!r.ok) throw new Error("fetch failed");
      const data = await r.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load customers:", err);
      toast({
        title: isRtl ? "تعذر تحميل العملاء" : "Failed to load customers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, isRtl]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (openAddDialogSignal !== undefined && openAddDialogSignal > 0) {
      setAddOpen(true);
    }
  }, [openAddDialogSignal]);

  const customers = rows.map((r) => toCustomer(r, isRtl));

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
    navigator.clipboard.writeText(selectedCustomers.map(c => `${c.name} | ${c.contact} | ${c.email} | ${c.phone}`).join('\n')).then(() => {
      toast({ title: isRtl ? 'تم النسخ' : 'Copied', description: isRtl ? `تم نسخ ${selectedIds.length} عميل.` : `Copied ${selectedIds.length} customers.` });
    });
  };

  const openCard = (customer: Customer) => {
    setCardCustomer(customer);
    setCardOpen(true);
  };

  const resetForm = () => setForm({
    nameAr: "", nameEn: "", organization: "", position: "",
    email: "", phone: "", city: "", address: "", source: "active", notes: "",
  });

  const handleSave = async () => {
    if (!form.nameAr.trim() && !form.nameEn.trim()) {
      toast({
        title: isRtl ? "الاسم مطلوب" : "Name is required",
        variant: "destructive",
      });
      return;
    }
    try {
      setSaving(true);
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          createdBy: currentUser?.id || null,
        }),
      });
      if (!res.ok) throw new Error("save failed");
      toast({
        title: isRtl ? "تم إضافة العميل" : "Customer added",
      });
      setAddOpen(false);
      resetForm();
      await fetchData();
    } catch (err) {
      toast({
        title: isRtl ? "تعذر حفظ العميل" : "Failed to save customer",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/customers/${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      toast({ title: isRtl ? "تم حذف العميل" : "Customer deleted" });
      setSelectedIds(prev => prev.filter(id => id !== deleteId));
      setDeleteId(null);
      await fetchData();
    } catch (err) {
      toast({
        title: isRtl ? "تعذر حذف العميل" : "Failed to delete customer",
        variant: "destructive",
      });
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
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm text-muted-foreground font-medium">
                {filtered.length} {t('crm.cust.total')}
              </div>
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90 gap-1.5"
                onClick={() => setAddOpen(true)}
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
              <WhatsAppAction selectedCount={selectedIds.length} isBulk
                trigger={<Button size="sm" variant="outline" className="h-8 gap-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950"><MessageSquare className="w-3 h-3" /><span className="hidden sm:inline">{t('crm.cust.bulk_whatsapp')}</span></Button>}
              />
              <EmailAction selectedCount={selectedIds.length} isBulk
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
              <div className="font-medium">{isRtl ? "لا يوجد عملاء بعد" : "No customers yet"}</div>
              <Button size="sm" onClick={() => setAddOpen(true)} data-testid="button-add-first-customer">
                <Plus className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
                {isRtl ? "أضف أول عميل" : "Add first customer"}
              </Button>
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
                <TableHead className={isRtl ? 'text-right' : 'text-left'}>{t('crm.cust.col.industry')}</TableHead>
                <TableHead className={isRtl ? 'text-right' : 'text-left'}>{t('crm.cust.col.status')}</TableHead>
                <TableHead className={isRtl ? 'text-left' : 'text-right'}>{t('crm.cust.col.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((customer) => {
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
                          <div className="font-semibold text-foreground flex items-center gap-2">
                            {customer.name}
                            {customer.rating === 5 && <Star className="w-3 h-3 fill-amber-400 text-amber-400" />}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" />
                            {rows.find(r => String(r.id) === customer.id)?.city || (isRtl ? "غير محدد" : "—")}
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
                      <Badge variant="secondary" className="font-normal bg-secondary/80">{customer.industry}</Badge>
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
                            onClick={() => onCreateProposal(customer.name, customer.email, customer.phone)}>
                            <FileText className="h-4 w-4" />
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
              {isRtl ? "أدخل بيانات العميل ليتم حفظها في قاعدة البيانات." : "Enter customer information to save it to the database."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="cust-name-ar">{isRtl ? "الاسم (عربي)" : "Name (Arabic)"} *</Label>
              <Input id="cust-name-ar" value={form.nameAr} onChange={e => setForm({ ...form, nameAr: e.target.value })} data-testid="input-customer-name-ar" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cust-name-en">{isRtl ? "الاسم (إنجليزي)" : "Name (English)"}</Label>
              <Input id="cust-name-en" value={form.nameEn} onChange={e => setForm({ ...form, nameEn: e.target.value })} data-testid="input-customer-name-en" />
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
            <Button onClick={handleSave} disabled={saving} data-testid="button-save-customer">
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
