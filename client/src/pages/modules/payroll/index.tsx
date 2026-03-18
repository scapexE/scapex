import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Banknote, Plus, Play, CheckCircle2, Clock, Download, Printer, Users, TrendingUp, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface PayrollBatch {
  id: string;
  batchNo: string;
  period: string;
  month: number;
  year: number;
  totalEmployees: number;
  totalBasic: number;
  totalAllowances: number;
  totalDeductions: number;
  netTotal: number;
  status: "draft" | "processing" | "approved" | "paid";
  createdAt: string;
  paidAt?: string;
}

interface PaySlip {
  id: string;
  batchId: string;
  empNo: string;
  empName: string;
  department: string;
  basicSalary: number;
  housingAllow: number;
  transportAllow: number;
  gosiDeduction: number;
  absenceDeduction: number;
  advance: number;
  netSalary: number;
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTHS_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

const SEED_BATCHES: PayrollBatch[] = [
  { id:"1", batchNo:"PAY-2026-001", period:"مارس 2026", month:3, year:2026, totalEmployees:6, totalBasic:75000, totalAllowances:20500, totalDeductions:7380, netTotal:88120, status:"draft", createdAt:"2026-03-01" },
  { id:"2", batchNo:"PAY-2026-002", period:"فبراير 2026", month:2, year:2026, totalEmployees:6, totalBasic:75000, totalAllowances:20500, totalDeductions:7380, netTotal:88120, status:"paid", createdAt:"2026-02-01", paidAt:"2026-02-28" },
  { id:"3", batchNo:"PAY-2026-003", period:"يناير 2026", month:1, year:2026, totalEmployees:6, totalBasic:75000, totalAllowances:20500, totalDeductions:7380, netTotal:88120, status:"paid", createdAt:"2026-01-01", paidAt:"2026-01-31" },
];

const SEED_SLIPS: PaySlip[] = [
  { id:"1", batchId:"1", empNo:"EMP-001", empName:"أحمد محمد الغامدي", department:"الهندسة", basicSalary:15000, housingAllow:3000, transportAllow:1000, gosiDeduction:1425, absenceDeduction:0, advance:0, netSalary:17575 },
  { id:"2", batchId:"1", empNo:"EMP-002", empName:"سارة علي القحطاني", department:"الموارد البشرية", basicSalary:18000, housingAllow:4000, transportAllow:1200, gosiDeduction:1710, absenceDeduction:0, advance:0, netSalary:21490 },
  { id:"3", batchId:"1", empNo:"EMP-003", empName:"محمد خالد الزهراني", department:"السلامة", basicSalary:12000, housingAllow:2500, transportAllow:800, gosiDeduction:1140, absenceDeduction:0, advance:0, netSalary:14160 },
  { id:"4", batchId:"1", empNo:"EMP-004", empName:"Rajesh Kumar", department:"الهندسة", basicSalary:9000, housingAllow:2000, transportAllow:700, gosiDeduction:855, absenceDeduction:0, advance:0, netSalary:10845 },
  { id:"5", batchId:"1", empNo:"EMP-005", empName:"فاطمة عبدالله الشهري", department:"المالية", basicSalary:11000, housingAllow:2500, transportAllow:800, gosiDeduction:1045, absenceDeduction:500, advance:0, netSalary:12755 },
  { id:"6", batchId:"1", empNo:"EMP-006", empName:"Abdullah Hassan Al-Otaibi", department:"العمليات", basicSalary:10000, housingAllow:2000, transportAllow:700, gosiDeduction:950, absenceDeduction:0, advance:0, netSalary:11750 },
];

const STORAGE_KEY = "scapex_payroll_batches";

function loadBatches(): PayrollBatch[] {
  try { const d = localStorage.getItem(STORAGE_KEY); return d ? JSON.parse(d) : SEED_BATCHES; } catch { return SEED_BATCHES; }
}
function saveBatches(b: PayrollBatch[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(b)); }

export default function PayrollModule() {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";
  const { toast } = useToast();
  const [batches, setBatches] = useState<PayrollBatch[]>(loadBatches);
  const [selectedBatch, setSelectedBatch] = useState<PayrollBatch | null>(null);
  const [slips] = useState<PaySlip[]>(SEED_SLIPS);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newMonth, setNewMonth] = useState(String(new Date().getMonth() + 1));
  const [newYear, setNewYear] = useState(String(new Date().getFullYear()));

  const totalPaid = batches.filter(b => b.status === "paid").reduce((s, b) => s + b.netTotal, 0);

  const handleCreate = () => {
    const m = Number(newMonth); const y = Number(newYear);
    const monthName = isRtl ? MONTHS_AR[m-1] : MONTHS[m-1];
    const newBatch: PayrollBatch = {
      id: Date.now().toString(), batchNo: `PAY-${y}-${String(batches.length + 1).padStart(3,"0")}`,
      period: `${monthName} ${y}`, month: m, year: y,
      totalEmployees: 6, totalBasic: 75000, totalAllowances: 20500, totalDeductions: 7380, netTotal: 88120,
      status: "draft", createdAt: new Date().toISOString().split("T")[0]
    };
    const updated = [newBatch, ...batches]; setBatches(updated); saveBatches(updated);
    setShowNewDialog(false);
    toast({ title: isRtl ? "تم إنشاء مسيرة الرواتب" : "Payroll batch created" });
  };

  const handleApprove = (batch: PayrollBatch) => {
    const updated = batches.map(b => b.id === batch.id ? { ...b, status: "approved" as const } : b);
    setBatches(updated); saveBatches(updated);
    toast({ title: isRtl ? "تمت الموافقة على المسيرة" : "Payroll approved" });
  };

  const handlePay = (batch: PayrollBatch) => {
    const updated = batches.map(b => b.id === batch.id ? { ...b, status: "paid" as const, paidAt: new Date().toISOString().split("T")[0] } : b);
    setBatches(updated); saveBatches(updated);
    toast({ title: isRtl ? "تم صرف الرواتب بنجاح" : "Salaries paid successfully" });
  };

  const statusColor = (s: string) => ({ draft: "secondary", processing: "default", approved: "default", paid: "default" }[s] || "secondary");
  const statusLabel = (s: string) => ({ draft: isRtl ? "مسودة" : "Draft", processing: isRtl ? "قيد المعالجة" : "Processing", approved: isRtl ? "معتمدة" : "Approved", paid: isRtl ? "مدفوعة" : "Paid" }[s] || s);

  const batchSlips = slips.filter(s => s.batchId === (selectedBatch?.id || "1"));

  return (
    <MainLayout>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{isRtl ? "مسيرات الرواتب" : "Payroll"}</h1>
            <p className="text-muted-foreground text-sm mt-1">{isRtl ? "معالجة رواتب الموظفين، الخصومات، وشرائح GOSI" : "Process salaries, deductions, and GOSI contributions"}</p>
          </div>
          <Button size="sm" onClick={() => setShowNewDialog(true)}><Plus className="w-4 h-4 me-1.5" />{isRtl ? "مسيرة جديدة" : "New Batch"}</Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: isRtl ? "إجمالي المصروف" : "Total Disbursed", value: `${(totalPaid/1000).toFixed(0)}K SAR`, icon: Banknote, color: "text-emerald-500" },
            { label: isRtl ? "الموظفون" : "Employees", value: "6", icon: Users, color: "text-blue-500" },
            { label: isRtl ? "مسيرات معلقة" : "Pending Batches", value: String(batches.filter(b => b.status === "draft").length), icon: Clock, color: "text-amber-500" },
            { label: isRtl ? "متوسط الراتب" : "Avg. Salary", value: "14,686 SAR", icon: TrendingUp, color: "text-purple-500" },
          ].map((s, i) => (
            <Card key={i} className="border-border/50"><CardContent className="p-4 flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-xl bg-secondary flex items-center justify-center", s.color)}><s.icon className="w-5 h-5" /></div>
              <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-lg font-bold">{s.value}</p></div>
            </CardContent></Card>
          ))}
        </div>

        <Tabs defaultValue="batches">
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="batches">{isRtl ? "المسيرات" : "Batches"}</TabsTrigger>
            <TabsTrigger value="slips">{isRtl ? "قسائم الرواتب" : "Pay Slips"}</TabsTrigger>
          </TabsList>

          <TabsContent value="batches" className="mt-4">
            <Card className="border-border/50 overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/40">
                    <TableRow>
                      <TableHead>{isRtl ? "رقم المسيرة" : "Batch No."}</TableHead>
                      <TableHead>{isRtl ? "الفترة" : "Period"}</TableHead>
                      <TableHead>{isRtl ? "عدد الموظفين" : "Employees"}</TableHead>
                      <TableHead>{isRtl ? "إجمالي الرواتب" : "Total Basic"}</TableHead>
                      <TableHead>{isRtl ? "الخصومات" : "Deductions"}</TableHead>
                      <TableHead>{isRtl ? "الصافي" : "Net Total"}</TableHead>
                      <TableHead>{isRtl ? "الحالة" : "Status"}</TableHead>
                      <TableHead>{isRtl ? "إجراءات" : "Actions"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batches.map(batch => (
                      <TableRow key={batch.id} className="hover:bg-muted/40 cursor-pointer" onClick={() => setSelectedBatch(batch)}>
                        <TableCell className="font-mono text-xs">{batch.batchNo}</TableCell>
                        <TableCell className="font-medium text-sm">{batch.period}</TableCell>
                        <TableCell>{batch.totalEmployees}</TableCell>
                        <TableCell>{batch.totalBasic.toLocaleString()}</TableCell>
                        <TableCell className="text-destructive">({batch.totalDeductions.toLocaleString()})</TableCell>
                        <TableCell className="font-bold text-emerald-600">{batch.netTotal.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={batch.status === "paid" ? "default" : "secondary"}
                            className={batch.status === "paid" ? "bg-emerald-500" : ""}>
                            {statusLabel(batch.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                            {batch.status === "draft" && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleApprove(batch)}><CheckCircle2 className="w-3 h-3 me-1" />{isRtl ? "اعتماد" : "Approve"}</Button>}
                            {batch.status === "approved" && <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => handlePay(batch)}><Play className="w-3 h-3 me-1" />{isRtl ? "صرف" : "Pay"}</Button>}
                            {batch.status === "paid" && <Button size="sm" variant="ghost" className="h-7 text-xs"><Download className="w-3 h-3 me-1" />{isRtl ? "تقرير" : "Report"}</Button>}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="slips" className="mt-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{isRtl ? "عرض قسائم:" : "Showing slips for:"}</span>
              <Select value={selectedBatch?.id || "1"} onValueChange={id => setSelectedBatch(batches.find(b => b.id === id) || null)}>
                <SelectTrigger className="w-48 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{batches.map(b => <SelectItem key={b.id} value={b.id}>{b.period}</SelectItem>)}</SelectContent>
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
                      <TableHead>{isRtl ? "GOSI" : "GOSI"}</TableHead>
                      <TableHead>{isRtl ? "خصومات أخرى" : "Other Ded."}</TableHead>
                      <TableHead>{isRtl ? "الصافي" : "Net"}</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batchSlips.map(slip => (
                      <TableRow key={slip.id} className="hover:bg-muted/40">
                        <TableCell>
                          <div><p className="font-medium text-sm">{slip.empName}</p><p className="text-xs text-muted-foreground">{slip.empNo}</p></div>
                        </TableCell>
                        <TableCell className="text-sm">{slip.department}</TableCell>
                        <TableCell>{slip.basicSalary.toLocaleString()}</TableCell>
                        <TableCell>{(slip.housingAllow + slip.transportAllow).toLocaleString()}</TableCell>
                        <TableCell className="text-red-500">({slip.gosiDeduction.toLocaleString()})</TableCell>
                        <TableCell className="text-red-500">({(slip.absenceDeduction + slip.advance).toLocaleString()})</TableCell>
                        <TableCell className="font-bold text-emerald-600">{slip.netSalary.toLocaleString()}</TableCell>
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
          <DialogHeader><DialogTitle>{isRtl ? "إنشاء مسيرة رواتب جديدة" : "Create New Payroll Batch"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div>
              <label className="text-xs font-semibold block mb-1">{isRtl ? "الشهر" : "Month"}</label>
              <Select value={newMonth} onValueChange={setNewMonth}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i+1} value={String(i+1)}>{isRtl ? MONTHS_AR[i] : m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">{isRtl ? "السنة" : "Year"}</label>
              <Select value={newYear} onValueChange={setNewYear}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2026">2026</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>{isRtl ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={handleCreate}>{isRtl ? "إنشاء المسيرة" : "Create Batch"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
