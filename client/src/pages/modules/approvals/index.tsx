import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckSquare, Search, CheckCircle2, XCircle, Clock, AlertTriangle, Eye, ThumbsUp, ThumbsDown, MessageSquare, RotateCcw, FileText, ShoppingCart, DollarSign, Users, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface ApprovalRequest {
  id: string;
  requestNumber: string;
  module: string;
  type: string;
  titleAr: string;
  titleEn: string;
  requestedBy: string;
  requestedByAr: string;
  date: string;
  amount?: number;
  currentStep: number;
  totalSteps: number;
  status: "pending" | "approved" | "rejected" | "returned";
  priority: "low" | "medium" | "high" | "urgent";
  steps: ApprovalStep[];
  notes: string;
}

interface ApprovalStep {
  order: number;
  titleAr: string;
  titleEn: string;
  approver: string;
  approverAr: string;
  status: "pending" | "approved" | "rejected" | "skipped";
  date?: string;
  comments?: string;
}

interface WorkflowTemplate {
  id: string;
  nameAr: string;
  nameEn: string;
  module: string;
  steps: { titleAr: string; titleEn: string; role: string }[];
  isActive: boolean;
}

const SEED_REQUESTS: ApprovalRequest[] = [
  {
    id: "1", requestNumber: "APR-2026-001", module: "purchases", type: "purchase_order", titleAr: "طلب شراء معدات سلامة", titleEn: "Safety Equipment Purchase Order", requestedBy: "Ahmed Al-Ghamdi", requestedByAr: "أحمد الغامدي", date: "2026-03-15", amount: 45000, currentStep: 2, totalSteps: 3, status: "pending", priority: "high",
    steps: [
      { order: 1, titleAr: "موافقة المدير المباشر", titleEn: "Direct Manager Approval", approver: "Mohammed Al-Qahtani", approverAr: "محمد القحطاني", status: "approved", date: "2026-03-15", comments: "Approved - within budget" },
      { order: 2, titleAr: "موافقة المدير المالي", titleEn: "Finance Manager Approval", approver: "Fatima Al-Shahri", approverAr: "فاطمة الشهري", status: "pending" },
      { order: 3, titleAr: "موافقة المدير العام", titleEn: "General Manager Approval", approver: "Admin", approverAr: "المدير العام", status: "pending" },
    ], notes: ""
  },
  {
    id: "2", requestNumber: "APR-2026-002", module: "hr", type: "leave_request", titleAr: "طلب إجازة سنوية - محمد الزهراني", titleEn: "Annual Leave Request - Mohammed Al-Zahrani", requestedBy: "Mohammed Al-Zahrani", requestedByAr: "محمد الزهراني", date: "2026-03-14", currentStep: 1, totalSteps: 2, status: "pending", priority: "medium",
    steps: [
      { order: 1, titleAr: "موافقة مدير القسم", titleEn: "Dept. Manager Approval", approver: "Ahmed Al-Ghamdi", approverAr: "أحمد الغامدي", status: "pending" },
      { order: 2, titleAr: "موافقة الموارد البشرية", titleEn: "HR Approval", approver: "Sara Al-Qahtani", approverAr: "سارة القحطاني", status: "pending" },
    ], notes: ""
  },
  {
    id: "3", requestNumber: "APR-2026-003", module: "sales", type: "proposal", titleAr: "اعتماد عرض سعر - مشروع إنشاء مبنى", titleEn: "Price Quotation Approval - Building Construction", requestedBy: "Rajesh Kumar", requestedByAr: "راجيش كومار", date: "2026-03-13", amount: 2500000, currentStep: 3, totalSteps: 3, status: "approved", priority: "high",
    steps: [
      { order: 1, titleAr: "مراجعة فنية", titleEn: "Technical Review", approver: "Ahmed Al-Ghamdi", approverAr: "أحمد الغامدي", status: "approved", date: "2026-03-13", comments: "Technical specs verified" },
      { order: 2, titleAr: "مراجعة مالية", titleEn: "Financial Review", approver: "Fatima Al-Shahri", approverAr: "فاطمة الشهري", status: "approved", date: "2026-03-14", comments: "Margins acceptable" },
      { order: 3, titleAr: "اعتماد نهائي", titleEn: "Final Approval", approver: "Admin", approverAr: "المدير العام", status: "approved", date: "2026-03-15", comments: "Approved - proceed" },
    ], notes: ""
  },
  {
    id: "4", requestNumber: "APR-2026-004", module: "accounting", type: "payment", titleAr: "صرف دفعة مستخلص رقم 3", titleEn: "Payment Release - Progress Certificate #3", requestedBy: "Fatima Al-Shahri", requestedByAr: "فاطمة الشهري", date: "2026-03-12", amount: 180000, currentStep: 1, totalSteps: 2, status: "rejected", priority: "urgent",
    steps: [
      { order: 1, titleAr: "مراجعة مستندات", titleEn: "Document Review", approver: "Mohammed Al-Qahtani", approverAr: "محمد القحطاني", status: "rejected", date: "2026-03-13", comments: "Missing supporting documents - please resubmit" },
      { order: 2, titleAr: "اعتماد الصرف", titleEn: "Payment Release", approver: "Admin", approverAr: "المدير العام", status: "pending" },
    ], notes: ""
  },
  {
    id: "5", requestNumber: "APR-2026-005", module: "engineering", type: "drawing_approval", titleAr: "اعتماد مخططات إنشائية - مشروع 102", titleEn: "Structural Drawings Approval - Project 102", requestedBy: "Rajesh Kumar", requestedByAr: "راجيش كومار", date: "2026-03-11", currentStep: 2, totalSteps: 3, status: "pending", priority: "medium",
    steps: [
      { order: 1, titleAr: "مراجعة هندسية", titleEn: "Engineering Review", approver: "Ahmed Al-Ghamdi", approverAr: "أحمد الغامدي", status: "approved", date: "2026-03-12" },
      { order: 2, titleAr: "فحص السلامة", titleEn: "Safety Check", approver: "Mohammed Al-Zahrani", approverAr: "محمد الزهراني", status: "pending" },
      { order: 3, titleAr: "اعتماد نهائي", titleEn: "Final Sign-off", approver: "Admin", approverAr: "المدير العام", status: "pending" },
    ], notes: ""
  },
];

const SEED_WORKFLOWS: WorkflowTemplate[] = [
  { id: "1", nameAr: "اعتماد أوامر الشراء", nameEn: "Purchase Order Approval", module: "purchases", steps: [{ titleAr: "المدير المباشر", titleEn: "Direct Manager", role: "manager" }, { titleAr: "المدير المالي", titleEn: "Finance Manager", role: "finance" }, { titleAr: "المدير العام", titleEn: "General Manager", role: "admin" }], isActive: true },
  { id: "2", nameAr: "اعتماد الإجازات", nameEn: "Leave Approval", module: "hr", steps: [{ titleAr: "مدير القسم", titleEn: "Dept. Manager", role: "manager" }, { titleAr: "الموارد البشرية", titleEn: "HR", role: "hr" }], isActive: true },
  { id: "3", nameAr: "اعتماد عروض الأسعار", nameEn: "Quotation Approval", module: "sales", steps: [{ titleAr: "مراجعة فنية", titleEn: "Technical Review", role: "engineer" }, { titleAr: "مراجعة مالية", titleEn: "Financial Review", role: "finance" }, { titleAr: "اعتماد نهائي", titleEn: "Final Approval", role: "admin" }], isActive: true },
  { id: "4", nameAr: "اعتماد المدفوعات", nameEn: "Payment Approval", module: "accounting", steps: [{ titleAr: "مراجعة مستندات", titleEn: "Document Review", role: "accountant" }, { titleAr: "اعتماد الصرف", titleEn: "Payment Release", role: "admin" }], isActive: true },
  { id: "5", nameAr: "اعتماد المخططات", nameEn: "Drawing Approval", module: "engineering", steps: [{ titleAr: "مراجعة هندسية", titleEn: "Engineering Review", role: "engineer" }, { titleAr: "فحص السلامة", titleEn: "Safety Check", role: "hse" }, { titleAr: "اعتماد نهائي", titleEn: "Final Sign-off", role: "admin" }], isActive: true },
];

const STORAGE_REQ = "scapex_approval_requests";
const STORAGE_WF = "scapex_approval_workflows";
function load<T>(key: string, seed: T): T { try { const d = localStorage.getItem(key); return d ? JSON.parse(d) : seed; } catch { return seed; } }
function save(key: string, data: unknown) { localStorage.setItem(key, JSON.stringify(data)); }

const MODULE_ICONS: Record<string, any> = { purchases: ShoppingCart, hr: Users, sales: DollarSign, accounting: DollarSign, engineering: FileText };
const MODULE_COLORS: Record<string, string> = { purchases: "text-blue-600", hr: "text-green-600", sales: "text-purple-600", accounting: "text-orange-600", engineering: "text-cyan-600" };

export default function ApprovalsModule() {
  const { dir, language } = useLanguage();
  const isRtl = dir === "rtl";
  const { toast } = useToast();
  const [requests, setRequests] = useState<ApprovalRequest[]>(() => load(STORAGE_REQ, SEED_REQUESTS));
  const [workflows] = useState<WorkflowTemplate[]>(() => load(STORAGE_WF, SEED_WORKFLOWS));
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [actionComment, setActionComment] = useState("");

  const t = (ar: string, en: string) => isRtl ? ar : en;

  const pending = requests.filter(r => r.status === "pending").length;
  const approved = requests.filter(r => r.status === "approved").length;
  const rejected = requests.filter(r => r.status === "rejected").length;

  const filtered = requests.filter(r => {
    const q = search.toLowerCase();
    const matchQ = !q || r.titleAr.includes(q) || r.titleEn.toLowerCase().includes(q) || r.requestNumber.toLowerCase().includes(q);
    const matchS = statusFilter === "all" || r.status === statusFilter;
    const matchM = moduleFilter === "all" || r.module === moduleFilter;
    return matchQ && matchS && matchM;
  });

  function handleAction(req: ApprovalRequest, action: "approve" | "reject" | "return") {
    const updated = requests.map(r => {
      if (r.id !== req.id) return r;
      const steps = [...r.steps];
      const currentIdx = steps.findIndex(s => s.status === "pending");
      if (currentIdx >= 0) {
        steps[currentIdx] = {
          ...steps[currentIdx],
          status: action === "approve" ? "approved" : action === "reject" ? "rejected" : "pending",
          date: new Date().toISOString().split("T")[0],
          comments: actionComment || undefined,
        };
      }
      const allApproved = steps.every(s => s.status === "approved");
      const anyRejected = steps.some(s => s.status === "rejected");
      return {
        ...r,
        steps,
        currentStep: action === "approve" ? Math.min(r.currentStep + 1, r.totalSteps) : r.currentStep,
        status: allApproved ? "approved" as const : anyRejected ? "rejected" as const : action === "return" ? "returned" as const : "pending" as const,
      };
    });
    setRequests(updated);
    save(STORAGE_REQ, updated);
    setActionComment("");
    setSelectedRequest(null);
    const msgs = { approve: t("تمت الموافقة", "Approved"), reject: t("تم الرفض", "Rejected"), return: t("تمت الإعادة", "Returned") };
    toast({ title: msgs[action] });
  }

  const statusBadge = (s: string) => {
    const map: Record<string, { label: [string, string]; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pending: { label: ["قيد الانتظار", "Pending"], variant: "outline" },
      approved: { label: ["معتمد", "Approved"], variant: "default" },
      rejected: { label: ["مرفوض", "Rejected"], variant: "destructive" },
      returned: { label: ["مُعاد", "Returned"], variant: "secondary" },
    };
    const item = map[s] || map.pending;
    return <Badge variant={item.variant}>{t(item.label[0], item.label[1])}</Badge>;
  };

  const priorityBadge = (p: string) => {
    const map: Record<string, { label: [string, string]; cls: string }> = {
      low: { label: ["منخفض", "Low"], cls: "bg-gray-100 text-gray-600" },
      medium: { label: ["متوسط", "Medium"], cls: "bg-blue-100 text-blue-600" },
      high: { label: ["عالي", "High"], cls: "bg-orange-100 text-orange-600" },
      urgent: { label: ["عاجل", "Urgent"], cls: "bg-red-100 text-red-600" },
    };
    const item = map[p] || map.medium;
    return <Badge className={item.cls} variant="secondary">{t(item.label[0], item.label[1])}</Badge>;
  };

  const moduleLabel = (m: string) => {
    const map: Record<string, [string, string]> = { purchases: ["المشتريات", "Purchases"], hr: ["الموارد البشرية", "HR"], sales: ["المبيعات", "Sales"], accounting: ["المحاسبة", "Accounting"], engineering: ["الهندسة", "Engineering"] };
    return t(map[m]?.[0] || m, map[m]?.[1] || m);
  };

  return (
    <MainLayout>
      <div className="p-4 md:p-6 space-y-6" dir={dir}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-approvals-title">
              <CheckSquare className="h-7 w-7 text-green-600" />
              {t("مركز الموافقات", "Approvals Center")}
            </h1>
            <p className="text-muted-foreground mt-1">{t("إدارة مركزية لجميع طلبات الاعتماد والموافقات", "Centralized hub for all approval workflows")}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-3 rounded-xl bg-yellow-100 dark:bg-yellow-900/30"><Clock className="h-6 w-6 text-yellow-600" /></div><div><p className="text-sm text-muted-foreground">{t("قيد الانتظار", "Pending")}</p><p className="text-2xl font-bold" data-testid="text-pending-count">{pending}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/30"><CheckCircle2 className="h-6 w-6 text-green-600" /></div><div><p className="text-sm text-muted-foreground">{t("معتمدة", "Approved")}</p><p className="text-2xl font-bold" data-testid="text-approved-count">{approved}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-3 rounded-xl bg-red-100 dark:bg-red-900/30"><XCircle className="h-6 w-6 text-red-600" /></div><div><p className="text-sm text-muted-foreground">{t("مرفوضة", "Rejected")}</p><p className="text-2xl font-bold" data-testid="text-rejected-count">{rejected}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30"><FileText className="h-6 w-6 text-blue-600" /></div><div><p className="text-sm text-muted-foreground">{t("إجمالي الطلبات", "Total Requests")}</p><p className="text-2xl font-bold" data-testid="text-total-requests">{requests.length}</p></div></div></CardContent></Card>
        </div>

        <Tabs defaultValue="requests" dir={dir}>
          <TabsList>
            <TabsTrigger value="requests">{t("الطلبات", "Requests")}</TabsTrigger>
            <TabsTrigger value="my_pending">{t("بانتظار موافقتي", "My Pending")}</TabsTrigger>
            <TabsTrigger value="workflows">{t("سلاسل الموافقة", "Workflows")}</TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className={cn("absolute top-2.5 h-4 w-4 text-muted-foreground", isRtl ? "right-3" : "left-3")} />
                <Input placeholder={t("بحث...", "Search...")} value={search} onChange={e => setSearch(e.target.value)} className={cn(isRtl ? "pr-9" : "pl-9")} data-testid="input-search-approvals" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]" data-testid="select-status-filter"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("كل الحالات", "All Status")}</SelectItem>
                  <SelectItem value="pending">{t("قيد الانتظار", "Pending")}</SelectItem>
                  <SelectItem value="approved">{t("معتمد", "Approved")}</SelectItem>
                  <SelectItem value="rejected">{t("مرفوض", "Rejected")}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={moduleFilter} onValueChange={setModuleFilter}>
                <SelectTrigger className="w-[150px]" data-testid="select-module-filter"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("كل الوحدات", "All Modules")}</SelectItem>
                  <SelectItem value="purchases">{t("المشتريات", "Purchases")}</SelectItem>
                  <SelectItem value="hr">{t("الموارد البشرية", "HR")}</SelectItem>
                  <SelectItem value="sales">{t("المبيعات", "Sales")}</SelectItem>
                  <SelectItem value="accounting">{t("المحاسبة", "Accounting")}</SelectItem>
                  <SelectItem value="engineering">{t("الهندسة", "Engineering")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("رقم الطلب", "Request #")}</TableHead>
                    <TableHead>{t("الوحدة", "Module")}</TableHead>
                    <TableHead>{t("الطلب", "Request")}</TableHead>
                    <TableHead>{t("مقدم الطلب", "Requester")}</TableHead>
                    <TableHead>{t("المرحلة", "Stage")}</TableHead>
                    <TableHead>{t("الأولوية", "Priority")}</TableHead>
                    <TableHead>{t("الحالة", "Status")}</TableHead>
                    <TableHead>{t("إجراءات", "Actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(r => (
                    <TableRow key={r.id} data-testid={`row-approval-${r.id}`}>
                      <TableCell className="font-mono text-sm">{r.requestNumber}</TableCell>
                      <TableCell><Badge variant="outline">{moduleLabel(r.module)}</Badge></TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{isRtl ? r.titleAr : r.titleEn}</p>
                          {r.amount && <p className="text-xs text-muted-foreground">{r.amount.toLocaleString()} SAR</p>}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{isRtl ? r.requestedByAr : r.requestedBy}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-medium">{r.currentStep}/{r.totalSteps}</span>
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(r.currentStep / r.totalSteps) * 100}%` }} />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{priorityBadge(r.priority)}</TableCell>
                      <TableCell>{statusBadge(r.status)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => setSelectedRequest(r)} data-testid={`button-view-approval-${r.id}`}><Eye className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="my_pending" className="space-y-4">
            <div className="space-y-3">
              {requests.filter(r => r.status === "pending").map(r => (
                <Card key={r.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-3">
                        <div className={cn("p-2 rounded-lg bg-muted", MODULE_COLORS[r.module])}>
                          {(() => { const Icon = MODULE_ICONS[r.module] || FileText; return <Icon className="h-5 w-5" />; })()}
                        </div>
                        <div>
                          <p className="font-medium">{isRtl ? r.titleAr : r.titleEn}</p>
                          <p className="text-sm text-muted-foreground">{r.requestNumber} • {isRtl ? r.requestedByAr : r.requestedBy} • {r.date}</p>
                          {r.amount && <p className="text-sm font-medium mt-1">{r.amount.toLocaleString()} SAR</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {priorityBadge(r.priority)}
                        <Button size="sm" variant="outline" onClick={() => setSelectedRequest(r)} data-testid={`button-review-${r.id}`}>{t("مراجعة", "Review")}</Button>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      {r.steps.map((s, i) => (
                        <div key={i} className="flex items-center gap-1">
                          <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                            s.status === "approved" ? "bg-green-500 text-white" :
                            s.status === "rejected" ? "bg-red-500 text-white" :
                            s.status === "pending" ? "bg-yellow-100 text-yellow-700 border border-yellow-300" :
                            "bg-gray-100 text-gray-400"
                          )}>{s.order}</div>
                          {i < r.steps.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {requests.filter(r => r.status === "pending").length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-300" />
                  <p>{t("لا توجد طلبات بانتظار الموافقة", "No pending approval requests")}</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="workflows" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {workflows.map(wf => (
                <Card key={wf.id} data-testid={`card-workflow-${wf.id}`}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold">{isRtl ? wf.nameAr : wf.nameEn}</h3>
                        <Badge variant="outline" className="mt-1">{moduleLabel(wf.module)}</Badge>
                      </div>
                      <Badge variant={wf.isActive ? "default" : "secondary"}>{wf.isActive ? t("نشط", "Active") : t("غير نشط", "Inactive")}</Badge>
                    </div>
                    <div className="space-y-2">
                      {wf.steps.map((s, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-medium text-blue-600">{i + 1}</div>
                          <span className="text-sm">{isRtl ? s.titleAr : s.titleEn}</span>
                          {i < wf.steps.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground ms-auto" />}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
          <DialogContent className="max-w-2xl" dir={dir}>
            {selectedRequest && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <CheckSquare className="h-5 w-5" />
                    {selectedRequest.requestNumber} - {isRtl ? selectedRequest.titleAr : selectedRequest.titleEn}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-muted-foreground">{t("مقدم الطلب:", "Requester:")}</span> <span className="font-medium">{isRtl ? selectedRequest.requestedByAr : selectedRequest.requestedBy}</span></div>
                    <div><span className="text-muted-foreground">{t("التاريخ:", "Date:")}</span> <span className="font-medium">{selectedRequest.date}</span></div>
                    <div><span className="text-muted-foreground">{t("الوحدة:", "Module:")}</span> <Badge variant="outline">{moduleLabel(selectedRequest.module)}</Badge></div>
                    {selectedRequest.amount && <div><span className="text-muted-foreground">{t("المبلغ:", "Amount:")}</span> <span className="font-bold">{selectedRequest.amount.toLocaleString()} SAR</span></div>}
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3">{t("مراحل الاعتماد", "Approval Steps")}</h4>
                    <div className="space-y-3">
                      {selectedRequest.steps.map((s, i) => (
                        <div key={i} className={cn("p-3 rounded-lg border", s.status === "approved" ? "bg-green-50 dark:bg-green-900/10 border-green-200" : s.status === "rejected" ? "bg-red-50 dark:bg-red-900/10 border-red-200" : "bg-muted/30")}>
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold",
                                s.status === "approved" ? "bg-green-500 text-white" : s.status === "rejected" ? "bg-red-500 text-white" : "bg-yellow-100 text-yellow-700"
                              )}>{s.status === "approved" ? "✓" : s.status === "rejected" ? "✗" : s.order}</div>
                              <div>
                                <p className="font-medium text-sm">{isRtl ? s.titleAr : s.titleEn}</p>
                                <p className="text-xs text-muted-foreground">{isRtl ? s.approverAr : s.approver}</p>
                              </div>
                            </div>
                            <div className="text-end">
                              {s.date && <p className="text-xs text-muted-foreground">{s.date}</p>}
                              {statusBadge(s.status)}
                            </div>
                          </div>
                          {s.comments && <p className="mt-2 text-sm text-muted-foreground bg-background p-2 rounded">{s.comments}</p>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {selectedRequest.status === "pending" && (
                    <div className="space-y-3 border-t pt-4">
                      <Label>{t("ملاحظات", "Comments")}</Label>
                      <Input value={actionComment} onChange={e => setActionComment(e.target.value)} placeholder={t("أضف ملاحظاتك...", "Add your comments...")} data-testid="input-action-comment" />
                      <div className="flex gap-2">
                        <Button onClick={() => handleAction(selectedRequest, "approve")} className="flex-1 bg-green-600 hover:bg-green-700" data-testid="button-approve">
                          <ThumbsUp className="h-4 w-4 me-2" /> {t("موافقة", "Approve")}
                        </Button>
                        <Button onClick={() => handleAction(selectedRequest, "reject")} variant="destructive" className="flex-1" data-testid="button-reject">
                          <ThumbsDown className="h-4 w-4 me-2" /> {t("رفض", "Reject")}
                        </Button>
                        <Button onClick={() => handleAction(selectedRequest, "return")} variant="outline" className="flex-1" data-testid="button-return">
                          <RotateCcw className="h-4 w-4 me-2" /> {t("إعادة", "Return")}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
