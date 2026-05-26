import { useState, useEffect, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Banknote, Plus, Play, CheckCircle2, Clock, Printer, Users, TrendingUp, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { scopedFetch } from "@/lib/queryClient";

interface PayrollBatch {
  id: number;
  month: number;
  year: number;
  status: string;
  totalGross: string | number;
  totalDeductions: string | number;
  totalNet: string | number;
  employeeCount: number;
  paidAt?: string | null;
  createdAt: string;
}

interface PayrollItem {
  id: number;
  batchId: number;
  employeeId: number;
  basicSalary: string | number;
  allowances: string | number;
  deductions: string | number;
  gosiEmployee: string | number;
  gosiCompany: string | number;
  netSalary: string | number;
  notes?: string;
  employeeName?: string;
  employeeNumber?: string;
  departmentName?: string;
}

interface Employee {
  id: number;
  nameAr: string;
  nameEn?: string;
  employeeNumber?: string;
  departmentName?: string;
  basicSalary?: string | number;
  housingAllowance?: string | number;
  transportAllowance?: string | number;
  otherAllowance?: string | number;
  status?: string;
}

const MONTHS_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const MONTHS_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const n = (v: string | number | undefined): number => Number(v ?? 0);

const statusMeta = (s: string, isRtl: boolean) => ({
  draft:    { label: isRtl ? "مسودة"        : "Draft",      cls: "" },
  approved: { label: isRtl ? "معتمدة"       : "Approved",   cls: "bg-blue-500 text-white" },
  paid:     { label: isRtl ? "مدفوعة"       : "Paid",       cls: "bg-emerald-500 text-white" },
}[s] ?? { label: s, cls: "" });

export default function PayrollModule() {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";
  const { toast } = useToast();

  const [batches, setBatches] = useState<PayrollBatch[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [items, setItems] = useState<PayrollItem[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newMonth, setNewMonth] = useState(String(new Date().getMonth() + 1));
  const [newYear, setNewYear] = useState(String(new Date().getFullYear()));
  const [saving, setSaving] = useState(false);

  const fetchBatches = useCallback(async () => {
    try {
      const res = await scopedFetch("/api/payroll-batches");
      if (res.ok) {
        const data = await res.json();
        setBatches(data);
        if (data.length > 0 && !selectedBatchId) setSelectedBatchId(data[0].id);
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [selectedBatchId]);

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await scopedFetch("/api/employees");
      if (res.ok) setEmployees(await res.json());
    } catch { /* silent */ }
  }, []);

  const fetchItems = useCallback(async (batchId: number) => {
    setItemsLoading(true);
    try {
      const res = await scopedFetch(`/api/payroll-batches/${batchId}/items`);
      if (res.ok) {
        const raw: PayrollItem[] = await res.json();
        const enriched = raw.map(item => {
          const emp = employees.find(e => e.id === item.employeeId);
          return { ...item, employeeName: emp?.nameAr || emp?.nameEn, employeeNumber: emp?.employeeNumber, departmentName: emp?.departmentName };
        });
        setItems(enriched);
      }
    } catch { /* silent */ } finally {
      setItemsLoading(false);
    }
  }, [employees]);

  useEffect(() => { fetchBatches(); fetchEmployees(); }, []);

  useEffect(() => {
    if (selectedBatchId && employees.length >= 0) fetchItems(selectedBatchId);
  }, [selectedBatchId, employees]);

  const handleCreate = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const m = Number(newMonth); const y = Number(newYear);
      const activeEmps = employees.filter(e => e.status !== "terminated" && e.status !== "inactive");

      let totalGross = 0; let totalDed = 0; let totalNet = 0;
      activeEmps.forEach(emp => {
        const basic = n(emp.basicSalary);
        const allow = n(emp.housingAllowance) + n(emp.transportAllowance) + n(emp.otherAllowance);
        const gosi = (basic * 0.095);
        totalGross += basic + allow;
        totalDed += gosi;
        totalNet += basic + allow - gosi;
      });

      const res = await scopedFetch("/api/payroll-batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: m, year: y, status: "draft", totalGross: totalGross.toFixed(2), totalDeductions: totalDed.toFixed(2), totalNet: totalNet.toFixed(2), employeeCount: activeEmps.length }),
      });
      if (!res.ok) throw new Error("Failed");
      const batch = await res.json();

      for (const emp of activeEmps) {
        const basic = n(emp.basicSalary);
        const allow = n(emp.housingAllowance) + n(emp.transportAllowance) + n(emp.otherAllowance);
        const gosiEmp = basic * 0.095;
        const gosiComp = basic * 0.12;
        const net = basic + allow - gosiEmp;
        await scopedFetch("/api/payroll-items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ batchId: batch.id, employeeId: emp.id, basicSalary: basic.toFixed(2), allowances: allow.toFixed(2), deductions: "0", gosiEmployee: gosiEmp.toFixed(2), gosiCompany: gosiComp.toFixed(2), netSalary: net.toFixed(2) }),
        });
      }

      toast({ title: isRtl ? "تم إنشاء مسيرة الرواتب" : "Payroll batch created" });
      setShowNewDialog(false);
      fetchBatches();
      setSelectedBatchId(batch.id);
    } catch {
      toast({ title: isRtl ? "حدث خطأ" : "Error occurred", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (batch: PayrollBatch, newStatus: string) => {
    try {
      const res = await scopedFetch(`/api/payroll-batches/${batch.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, totalGross: batch.totalGross, totalDeductions: batch.totalDeductions, totalNet: batch.totalNet, employeeCount: batch.employeeCount }),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: newStatus === "approved" ? (isRtl ? "تمت الموافقة" : "Approved") : (isRtl ? "تم الصرف" : "Paid") });
      fetchBatches();
    } catch {
      toast({ title: isRtl ? "حدث خطأ" : "Error", variant: "destructive" });
    }
  };

  const handleDelete = async (batch: PayrollBatch) => {
    if (batch.status === "paid") { toast({ title: isRtl ? "لا يمكن حذف مسيرة مدفوعة" : "Cannot delete paid batch", variant: "destructive" }); return; }
    try {
      await scopedFetch(`/api/payroll-batches/${batch.id}`, { method: "DELETE" });
      toast({ title: isRtl ? "تم الحذف" : "Deleted" });
      fetchBatches();
      if (selectedBatchId === batch.id) setSelectedBatchId(null);
    } catch { /* silent */ }
  };

  const periodLabel = (b: PayrollBatch) => `${isRtl ? MONTHS_AR[b.month - 1] : MONTHS_EN[b.month - 1]} ${b.year}`;
  const batchNo = (b: PayrollBatch) => `PAY-${b.year}-${String(b.id).padStart(3, "0")}`;

  const totalPaid = batches.filter(b => b.status === "paid").reduce((s, b) => s + n(b.totalNet), 0);
  const avgSalary = employees.length ? employees.reduce((s, e) => s + n(e.basicSalary), 0) / employees.length : 0;

  return (
    <MainLayout>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{isRtl ? "مسيرات الرواتب" : "Payroll"}</h1>
            <p className="text-muted-foreground text-sm mt-1">{isRtl ? "معالجة رواتب الموظفين، الخصومات، وشرائح GOSI" : "Process salaries, deductions, and GOSI contributions"}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchBatches}><RefreshCw className="w-4 h-4 me-1.5" />{isRtl ? "تحديث" : "Refresh"}</Button>
            <Button size="sm" onClick={() => setShowNewDialog(true)}><Plus className="w-4 h-4 me-1.5" />{isRtl ? "مسيرة جديدة" : "New Batch"}</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: isRtl ? "إجمالي المصروف" : "Total Disbursed", value: `${(totalPaid / 1000).toFixed(0)}K SAR`, icon: Banknote, color: "text-emerald-500" },
            { label: isRtl ? "الموظفون" : "Employees", value: String(employees.length), icon: Users, color: "text-blue-500" },
            { label: isRtl ? "مسيرات معلقة" : "Pending Batches", value: String(batches.filter(b => b.status === "draft").length), icon: Clock, color: "text-amber-500" },
            { label: isRtl ? "متوسط الراتب" : "Avg. Salary", value: `${avgSalary.toLocaleString(undefined, { maximumFractionDigits: 0 })} SAR`, icon: TrendingUp, color: "text-purple-500" },
          ].map((s, i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-xl bg-secondary flex items-center justify-center", s.color)}><s.icon className="w-5 h-5" /></div>
                <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-lg font-bold">{s.value}</p></div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="batches">
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="batches">{isRtl ? "المسيرات" : "Batches"}</TabsTrigger>
            <TabsTrigger value="slips">{isRtl ? "قسائم الرواتب" : "Pay Slips"}</TabsTrigger>
          </TabsList>

          <TabsContent value="batches" className="mt-4">
            {loading ? (
              <div className="flex items-center justify-center h-40 gap-2 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin" />{isRtl ? "جاري التحميل..." : "Loading..."}</div>
            ) : (
              <Card className="border-border/50 overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-secondary/40">
                      <TableRow>
                        <TableHead>{isRtl ? "رقم المسيرة" : "Batch No."}</TableHead>
                        <TableHead>{isRtl ? "الفترة" : "Period"}</TableHead>
                        <TableHead>{isRtl ? "عدد الموظفين" : "Employees"}</TableHead>
                        <TableHead>{isRtl ? "إجمالي الرواتب" : "Gross"}</TableHead>
                        <TableHead>{isRtl ? "الخصومات" : "Deductions"}</TableHead>
                        <TableHead>{isRtl ? "الصافي" : "Net Total"}</TableHead>
                        <TableHead>{isRtl ? "الحالة" : "Status"}</TableHead>
                        <TableHead>{isRtl ? "إجراءات" : "Actions"}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {batches.length === 0 && (
                        <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">{isRtl ? "لا توجد مسيرات رواتب. انشئ مسيرة جديدة." : "No payroll batches. Create a new batch."}</TableCell></TableRow>
                      )}
                      {batches.map(batch => {
                        const meta = statusMeta(batch.status, isRtl);
                        return (
                          <TableRow key={batch.id} className={cn("hover:bg-muted/40 cursor-pointer", selectedBatchId === batch.id && "bg-primary/5")} onClick={() => setSelectedBatchId(batch.id)}>
                            <TableCell className="font-mono text-xs text-muted-foreground">{batchNo(batch)}</TableCell>
                            <TableCell className="font-semibold text-sm">{periodLabel(batch)}</TableCell>
                            <TableCell>{batch.employeeCount}</TableCell>
                            <TableCell>{n(batch.totalGross).toLocaleString(undefined, { maximumFractionDigits: 0 })}</TableCell>
                            <TableCell className="text-destructive">({n(batch.totalDeductions).toLocaleString(undefined, { maximumFractionDigits: 0 })})</TableCell>
                            <TableCell className="font-bold text-emerald-600">{n(batch.totalNet).toLocaleString(undefined, { maximumFractionDigits: 0 })}</TableCell>
                            <TableCell><Badge className={meta.cls}>{meta.label}</Badge></TableCell>
                            <TableCell>
                              <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                                {batch.status === "draft" && (
                                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleUpdateStatus(batch, "approved")}>
                                    <CheckCircle2 className="w-3 h-3 me-1" />{isRtl ? "اعتماد" : "Approve"}
                                  </Button>
                                )}
                                {batch.status === "approved" && (
                                  <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => handleUpdateStatus(batch, "paid")}>
                                    <Play className="w-3 h-3 me-1" />{isRtl ? "صرف" : "Pay"}
                                  </Button>
                                )}
                                {batch.status !== "paid" && (
                                  <Button size="sm" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(batch)}>
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="slips" className="mt-4">
            <div className="mb-3 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">{isRtl ? "عرض قسائم:" : "Batch:"}</span>
              <Select value={String(selectedBatchId ?? "")} onValueChange={v => setSelectedBatchId(Number(v))}>
                <SelectTrigger className="w-52 h-8 text-xs"><SelectValue placeholder={isRtl ? "اختر مسيرة" : "Select batch"} /></SelectTrigger>
                <SelectContent>{batches.map(b => <SelectItem key={b.id} value={String(b.id)}>{periodLabel(b)} — {batchNo(b)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Card className="border-border/50 overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/40">
                    <TableRow>
                      <TableHead>{isRtl ? "الموظف" : "Employee"}</TableHead>
                      <TableHead>{isRtl ? "القسم" : "Dept."}</TableHead>
                      <TableHead>{isRtl ? "الأساسي" : "Basic"}</TableHead>
                      <TableHead>{isRtl ? "البدلات" : "Allowances"}</TableHead>
                      <TableHead>{isRtl ? "GOSI موظف" : "GOSI Emp."}</TableHead>
                      <TableHead>{isRtl ? "GOSI شركة" : "GOSI Co."}</TableHead>
                      <TableHead>{isRtl ? "الصافي" : "Net"}</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemsLoading && (
                      <TableRow><TableCell colSpan={8} className="text-center py-8"><Loader2 className="w-4 h-4 animate-spin mx-auto" /></TableCell></TableRow>
                    )}
                    {!itemsLoading && items.length === 0 && (
                      <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">{isRtl ? "لا توجد قسائم رواتب لهذه المسيرة" : "No payslips for this batch"}</TableCell></TableRow>
                    )}
                    {!itemsLoading && items.map(item => (
                      <TableRow key={item.id} className="hover:bg-muted/40">
                        <TableCell>
                          <p className="font-medium text-sm">{item.employeeName ?? `ID-${item.employeeId}`}</p>
                          <p className="text-xs text-muted-foreground">{item.employeeNumber}</p>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{item.departmentName ?? "—"}</TableCell>
                        <TableCell>{n(item.basicSalary).toLocaleString(undefined, { maximumFractionDigits: 0 })}</TableCell>
                        <TableCell>{n(item.allowances).toLocaleString(undefined, { maximumFractionDigits: 0 })}</TableCell>
                        <TableCell className="text-red-500">({n(item.gosiEmployee).toLocaleString(undefined, { maximumFractionDigits: 0 })})</TableCell>
                        <TableCell className="text-orange-500">({n(item.gosiCompany).toLocaleString(undefined, { maximumFractionDigits: 0 })})</TableCell>
                        <TableCell className="font-bold text-emerald-600">{n(item.netSalary).toLocaleString(undefined, { maximumFractionDigits: 0 })}</TableCell>
                        <TableCell><Button variant="ghost" size="icon" className="h-7 w-7"><Printer className="w-3.5 h-3.5" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{isRtl ? "إنشاء مسيرة رواتب جديدة" : "New Payroll Batch"}</DialogTitle></DialogHeader>
          <div className="text-sm text-muted-foreground mb-2">
            {isRtl ? `سيتم احتساب رواتب ${employees.filter(e => e.status !== "terminated").length} موظف تلقائياً من بيانات الموارد البشرية.` : `Will compute salaries for ${employees.filter(e => e.status !== "terminated").length} active employees from HR data.`}
          </div>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div>
              <label className="text-xs font-semibold block mb-1">{isRtl ? "الشهر" : "Month"}</label>
              <Select value={newMonth} onValueChange={setNewMonth}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{MONTHS_EN.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{isRtl ? MONTHS_AR[i] : m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">{isRtl ? "السنة" : "Year"}</label>
              <Select value={newYear} onValueChange={setNewYear}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[2026, 2025, 2024].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>{isRtl ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin me-2" />}
              {isRtl ? "إنشاء المسيرة" : "Create Batch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
