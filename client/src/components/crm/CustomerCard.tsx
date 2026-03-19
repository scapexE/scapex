import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Building, Mail, Phone, MapPin, Star, FileText, Briefcase,
  Receipt, CheckCircle2, Clock, AlertTriangle, ExternalLink,
  Plus, TrendingUp, Calendar, ArrowRight, Shield, FileCheck, ClipboardCheck,
} from "lucide-react";
import { getProposals, getContracts, STATUS_META, SERVICE_META, type Proposal, type Contract } from "@/lib/proposals";
import { getProjects, type Project } from "@/lib/projects";
import { getSurveysByCustomer } from "@/lib/surveys";
import { SurveyResults } from "./SurveyResults";
import { useLocation } from "wouter";

export interface Customer {
  id: string;
  name: string;
  industry: string;
  contact: string;
  email: string;
  phone: string;
  status: string;
  rating: number;
}

interface CustomerCardProps {
  customer: Customer | null;
  open: boolean;
  onClose: () => void;
  onCreateProposal: (clientName: string, email: string, phone: string) => void;
}

export function CustomerCard({ customer, open, onClose, onCreateProposal }: CustomerCardProps) {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";
  const [, navigate] = useLocation();

  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [surveyCount, setSurveyCount] = useState(0);

  useEffect(() => {
    if (!customer || !open) return;
    const allProposals = getProposals();
    const allContracts = getContracts();
    const allProjects = getProjects();

    const name = customer.name.toLowerCase();
    setProposals(allProposals.filter(p => p.clientName.toLowerCase().includes(name) || name.includes(p.clientName.toLowerCase())));
    setContracts(allContracts.filter(c => c.clientName.toLowerCase().includes(name) || name.includes(c.clientName.toLowerCase())));
    setProjects(allProjects.filter(p => p.clientName.toLowerCase().includes(name) || name.includes(p.clientName.toLowerCase())));
    setSurveyCount(getSurveysByCustomer(customer.id).length);
  }, [customer, open]);

  useEffect(() => {
    if (!customer || !open) return;
    const handler = () => setSurveyCount(getSurveysByCustomer(customer.id).length);
    window.addEventListener("scapex_surveys_update", handler);
    return () => window.removeEventListener("scapex_surveys_update", handler);
  }, [customer, open]);

  if (!customer) return null;

  const totalContractValue = contracts.reduce((s, c) => s + c.total, 0);
  const activeProjects = projects.filter(p => p.status === "active" || p.status === "planning");

  const fmt = (n: number) => n.toLocaleString("ar-SA", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent
        side={isRtl ? "right" : "left"}
        className={cn("w-full sm:max-w-2xl p-0 flex flex-col gap-0", isRtl ? "rtl" : "ltr")}
      >
        {/* Header */}
        <SheetHeader className="p-6 pb-4 border-b border-border/50 bg-gradient-to-br from-primary/5 to-transparent shrink-0">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Building className="w-7 h-7 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-xl font-bold flex items-center gap-2 flex-wrap">
                {customer.name}
                {customer.rating === 5 && <Star className="w-4 h-4 fill-amber-400 text-amber-400" />}
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs border-transparent",
                    customer.status === "active" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                    customer.status === "lead" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  )}
                >
                  {customer.status === "active" ? (isRtl ? "عميل نشط" : "Active") :
                   customer.status === "lead" ? (isRtl ? "عميل محتمل" : "Lead") :
                   (isRtl ? "غير نشط" : "Inactive")}
                </Badge>
              </SheetTitle>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><Building className="w-3.5 h-3.5" />{customer.industry}</span>
                <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{customer.email}</span>
                <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /><span dir="ltr">{customer.phone}</span></span>
                <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />Riyadh, KSA</span>
              </div>
            </div>
          </div>

          {/* KPI Strip */}
          <div className="grid grid-cols-4 gap-3 mt-4">
            <KPIBox icon={<FileText className="w-4 h-4" />} label={isRtl ? "العروض" : "Proposals"} value={proposals.length} color="blue" />
            <KPIBox icon={<FileCheck className="w-4 h-4" />} label={isRtl ? "العقود" : "Contracts"} value={contracts.length} color="violet" />
            <KPIBox icon={<Briefcase className="w-4 h-4" />} label={isRtl ? "المشاريع" : "Projects"} value={projects.length} color="emerald" />
            <KPIBox
              icon={<TrendingUp className="w-4 h-4" />}
              label={isRtl ? "إجمالي العقود" : "Total Value"}
              value={totalContractValue > 0 ? `${fmt(totalContractValue)}` : "—"}
              color="amber"
              small
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              className="gap-1.5 bg-primary hover:bg-primary/90 flex-1"
              data-testid={`button-create-proposal-${customer.id}`}
              onClick={() => { onClose(); onCreateProposal(customer.name, customer.email, customer.phone); }}
            >
              <Plus className="w-4 h-4" />
              {isRtl ? "طلب عرض سعر" : "Request Quote"}
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { onClose(); navigate("/projects"); }}>
              <ArrowRight className="w-4 h-4" />
              {isRtl ? "المشاريع" : "Projects"}
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { onClose(); navigate("/accounting"); }}>
              <Receipt className="w-4 h-4" />
              {isRtl ? "المالية" : "Finance"}
            </Button>
          </div>
        </SheetHeader>

        {/* Tabs */}
        <Tabs defaultValue="proposals" className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-6 mt-4 w-auto self-start bg-secondary/50 border border-border/50 shrink-0">
            <TabsTrigger value="proposals" className="text-xs data-[state=active]:bg-background">
              {isRtl ? "عروض الأسعار" : "Proposals"}
              {proposals.length > 0 && <Badge variant="secondary" className="ms-1.5 text-[10px] h-4 px-1">{proposals.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="contracts" className="text-xs data-[state=active]:bg-background">
              {isRtl ? "العقود" : "Contracts"}
              {contracts.length > 0 && <Badge variant="secondary" className="ms-1.5 text-[10px] h-4 px-1">{contracts.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="projects" className="text-xs data-[state=active]:bg-background">
              {isRtl ? "المشاريع" : "Projects"}
              {projects.length > 0 && <Badge variant="secondary" className="ms-1.5 text-[10px] h-4 px-1">{projects.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="surveys" className="text-xs data-[state=active]:bg-background">
              {isRtl ? "الاستطلاعات" : "Surveys"}
              {surveyCount > 0 && <Badge variant="secondary" className="ms-1.5 text-[10px] h-4 px-1">{surveyCount}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="finance" className="text-xs data-[state=active]:bg-background">
              {isRtl ? "المالية" : "Finance"}
            </TabsTrigger>
          </TabsList>

          {/* ── Proposals ── */}
          <TabsContent value="proposals" className="flex-1 min-h-0 m-0 mt-3">
            <ScrollArea className="h-full px-6 pb-4">
              {proposals.length === 0 ? (
                <EmptyState
                  icon={<FileText className="w-10 h-10 text-muted-foreground/40" />}
                  label={isRtl ? "لا توجد عروض أسعار لهذا العميل" : "No proposals for this customer"}
                  action={
                    <Button size="sm" className="mt-3 gap-1.5" onClick={() => { onClose(); onCreateProposal(customer.name, customer.email, customer.phone); }}>
                      <Plus className="w-3.5 h-3.5" />
                      {isRtl ? "إنشاء عرض سعر" : "Create Proposal"}
                    </Button>
                  }
                />
              ) : (
                <div className="space-y-3">
                  {proposals.map(p => {
                    const sm = STATUS_META[p.status];
                    const svc = SERVICE_META[p.serviceType];
                    return (
                      <div key={p.id} className="border border-border/50 rounded-xl p-4 bg-card hover:border-primary/30 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-sm">{p.projectName}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{p.proposalNumber}</p>
                          </div>
                          <Badge variant="outline" className={cn("text-xs border", sm.border, sm.bg, sm.color)}>
                            {isRtl ? sm.labelAr : sm.labelEn}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/40">
                          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Calendar className="w-3 h-3" />
                            {new Date(p.createdAt).toLocaleDateString(isRtl ? "ar-SA" : "en-SA")}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-primary">{p.total.toLocaleString()} {p.currency}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary"
                              onClick={() => { onClose(); navigate("/smart-proposal"); }}>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                        {p.convertedToContractId && (
                          <div className="mt-2 flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400">
                            <FileCheck className="w-3.5 h-3.5" />
                            {isRtl ? "تحوّل إلى عقد" : "Converted to Contract"}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* ── Contracts ── */}
          <TabsContent value="contracts" className="flex-1 min-h-0 m-0 mt-3">
            <ScrollArea className="h-full px-6 pb-4">
              {contracts.length === 0 ? (
                <EmptyState
                  icon={<FileCheck className="w-10 h-10 text-muted-foreground/40" />}
                  label={isRtl ? "لا توجد عقود لهذا العميل" : "No contracts for this customer"}
                />
              ) : (
                <div className="space-y-3">
                  {contracts.map(c => (
                    <div key={c.id} className="border border-border/50 rounded-xl p-4 bg-card hover:border-violet-300/50 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-sm">{c.projectName}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 font-mono">{c.contractNumber}</p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            c.status === "active" ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" :
                            c.status === "completed" ? "border-blue-200 bg-blue-50 text-blue-700" :
                            c.status === "cancelled" ? "border-red-200 bg-red-50 text-red-700" :
                            "border-gray-200 bg-gray-50 text-gray-700"
                          )}
                        >
                          {c.status === "active" ? (isRtl ? "نشط" : "Active") :
                           c.status === "completed" ? (isRtl ? "مكتمل" : "Completed") :
                           c.status === "cancelled" ? (isRtl ? "ملغى" : "Cancelled") :
                           (isRtl ? "مسودة" : "Draft")}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border/40 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {c.startDate}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {c.endDate}</span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400 font-medium">
                          <FileCheck className="w-3.5 h-3.5" />
                          {isRtl ? "مرتبط بعرض:" : "Linked to:"} {c.proposalNumber}
                        </div>
                        <span className="text-sm font-bold text-primary">{c.total.toLocaleString()} {c.currency}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* ── Projects ── */}
          <TabsContent value="projects" className="flex-1 min-h-0 m-0 mt-3">
            <ScrollArea className="h-full px-6 pb-4">
              {projects.length === 0 ? (
                <EmptyState
                  icon={<Briefcase className="w-10 h-10 text-muted-foreground/40" />}
                  label={isRtl ? "لا توجد مشاريع لهذا العميل" : "No projects for this customer"}
                  sub={isRtl ? "سيُنشأ المشروع تلقائياً عند تحويل عرض الأسعار إلى عقد" : "A project is auto-created when a proposal is converted to a contract"}
                />
              ) : (
                <div className="space-y-3">
                  {projects.map(proj => (
                    <div key={proj.id} className="border border-border/50 rounded-xl p-4 bg-card hover:border-emerald-300/50 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-sm">{proj.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 font-mono">{proj.code}</p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs border-transparent",
                            proj.status === "active" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                            proj.status === "planning" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                            proj.status === "completed" ? "bg-slate-100 text-slate-700 dark:bg-slate-800" :
                            proj.status === "on_hold" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                            "bg-red-100 text-red-700"
                          )}
                        >
                          {proj.status === "active" ? (isRtl ? "نشط" : "Active") :
                           proj.status === "planning" ? (isRtl ? "تخطيط" : "Planning") :
                           proj.status === "completed" ? (isRtl ? "مكتمل" : "Completed") :
                           proj.status === "on_hold" ? (isRtl ? "متوقف" : "On Hold") :
                           (isRtl ? "ملغى" : "Cancelled")}
                        </Badge>
                      </div>
                      {/* Progress */}
                      <div className="mt-3 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{proj.phase}</span>
                          <span className="font-medium">{proj.progress}%</span>
                        </div>
                        <Progress
                          value={proj.progress}
                          className={cn("h-1.5", proj.status === "completed" ? "[&>div]:bg-emerald-500" : "")}
                        />
                      </div>
                      {/* Links */}
                      {(proj.contractNumber || proj.proposalNumber) && (
                        <div className="mt-3 pt-3 border-t border-border/40 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {proj.proposalNumber && (
                            <span className="flex items-center gap-1 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full">
                              <FileText className="w-3 h-3" /> {proj.proposalNumber}
                            </span>
                          )}
                          {proj.contractNumber && (
                            <span className="flex items-center gap-1 bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400 px-2 py-0.5 rounded-full">
                              <FileCheck className="w-3 h-3" /> {proj.contractNumber}
                            </span>
                          )}
                          {proj.contractValue > 0 && (
                            <span className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full">
                              <Receipt className="w-3 h-3" /> {proj.contractValue.toLocaleString()} {proj.currency}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {proj.startDate}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {proj.deadline}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* ── Surveys ── */}
          <TabsContent value="surveys" className="flex-1 min-h-0 m-0 mt-3">
            <SurveyResults
              customerId={customer.id}
              customerName={customer.name}
              email={customer.email}
              phone={customer.phone}
            />
          </TabsContent>

          {/* ── Finance ── */}
          <TabsContent value="finance" className="flex-1 min-h-0 m-0 mt-3">
            <ScrollArea className="h-full px-6 pb-4">
              <div className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-2 gap-3">
                  <FinanceBox
                    label={isRtl ? "إجمالي قيمة العقود" : "Total Contract Value"}
                    value={`${fmt(totalContractValue)} SAR`}
                    color="emerald"
                    icon={<TrendingUp className="w-5 h-5" />}
                  />
                  <FinanceBox
                    label={isRtl ? "عدد العقود" : "Contracts Count"}
                    value={contracts.length.toString()}
                    color="violet"
                    icon={<FileCheck className="w-5 h-5" />}
                  />
                  <FinanceBox
                    label={isRtl ? "عروض معتمدة" : "Approved Quotes"}
                    value={proposals.filter(p => p.status === "approved" || p.status === "converted_contract").length.toString()}
                    color="blue"
                    icon={<CheckCircle2 className="w-5 h-5" />}
                  />
                  <FinanceBox
                    label={isRtl ? "مشاريع نشطة" : "Active Projects"}
                    value={activeProjects.length.toString()}
                    color="amber"
                    icon={<Briefcase className="w-5 h-5" />}
                  />
                </div>

                <Separator />

                {/* Contract value breakdown */}
                {contracts.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-muted-foreground" />
                      {isRtl ? "تفاصيل العقود المالية" : "Contract Financial Details"}
                    </h4>
                    <div className="space-y-2">
                      {contracts.map(c => (
                        <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/40 text-sm">
                          <div>
                            <p className="font-medium">{c.contractNumber}</p>
                            <p className="text-xs text-muted-foreground">{c.projectName}</p>
                          </div>
                          <div className={cn("text-right", isRtl ? "text-left" : "text-right")}>
                            <p className="font-bold text-primary">{c.total.toLocaleString()} {c.currency}</p>
                            <p className="text-xs text-muted-foreground">VAT: {c.vatAmount.toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={() => { onClose(); navigate("/accounting"); }}>
                    <Receipt className="w-4 h-4" />
                    {isRtl ? "فتح المحاسبة" : "Open Accounting"}
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={() => { onClose(); navigate("/sales"); }}>
                    <FileCheck className="w-4 h-4" />
                    {isRtl ? "فتح العقود" : "Open Contracts"}
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function KPIBox({ icon, label, value, color, small }: {
  icon: React.ReactNode; label: string; value: number | string;
  color: "blue" | "violet" | "emerald" | "amber"; small?: boolean;
}) {
  const colors = {
    blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    violet: "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400",
    emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
    amber: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  };
  return (
    <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-secondary/50 border border-border/50">
      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", colors[color])}>
        {icon}
      </div>
      <p className={cn("font-bold", small ? "text-sm" : "text-xl")}>{value}</p>
      <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
    </div>
  );
}

function FinanceBox({ label, value, color, icon }: {
  label: string; value: string;
  color: "blue" | "violet" | "emerald" | "amber"; icon: React.ReactNode;
}) {
  const colors = {
    blue: "from-blue-500/10 to-blue-500/5 border-blue-200/50 dark:border-blue-800/50",
    violet: "from-violet-500/10 to-violet-500/5 border-violet-200/50 dark:border-violet-800/50",
    emerald: "from-emerald-500/10 to-emerald-500/5 border-emerald-200/50 dark:border-emerald-800/50",
    amber: "from-amber-500/10 to-amber-500/5 border-amber-200/50 dark:border-amber-800/50",
  };
  const iconColors = {
    blue: "text-blue-600 dark:text-blue-400",
    violet: "text-violet-600 dark:text-violet-400",
    emerald: "text-emerald-600 dark:text-emerald-400",
    amber: "text-amber-600 dark:text-amber-400",
  };
  return (
    <div className={cn("p-4 rounded-xl border bg-gradient-to-br", colors[color])}>
      <div className={cn("mb-2", iconColors[color])}>{icon}</div>
      <p className="font-bold text-lg">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function EmptyState({ icon, label, sub, action }: { icon: React.ReactNode; label: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon}
      <p className="mt-4 text-sm font-medium text-muted-foreground">{label}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground/70 max-w-xs">{sub}</p>}
      {action}
    </div>
  );
}
