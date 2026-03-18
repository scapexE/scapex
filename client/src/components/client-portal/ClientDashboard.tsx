import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Briefcase, Calendar, CheckCircle2, Clock, FileText, MessageSquare,
  Download, Upload, Building2, FileCheck, TrendingUp, Receipt, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { getProposals, getContracts, STATUS_META, type Proposal, type Contract } from "@/lib/proposals";
import { getProjects, type Project } from "@/lib/projects";
import { Separator } from "@/components/ui/separator";
import { PORTAL_THEMES, type PortalTheme } from "@/pages/modules/client-portal/index";

const CLIENT_NAME = "NEOM Co.";

const cardClass = "border-border/40 shadow-sm dark:border-border dark:shadow-none";
const cardHeaderClass = "border-b border-border/40 dark:border-border";

export function ClientDashboard({ portalTheme }: { portalTheme: PortalTheme }) {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";
  const [chatMessage, setChatMessage] = useState("");
  const [messages, setMessages] = useState([
    { id: 1, sender: isRtl ? "أحمد (سكابكس)" : "Ahmed (SCAPE)", role: "support", text: isRtl ? "مرحباً، تم تحديث المخططات الهندسية للمشروع في قسم المستندات." : "Hello, the engineering drawings have been updated in the documents section.", time: "10:30 AM" },
    { id: 2, sender: isRtl ? "أنت" : "You", role: "client", text: isRtl ? "شكراً لك. هل تم اعتمادها من البلدية؟" : "Thank you. Have they been approved by the municipality?", time: "10:45 AM" },
    { id: 3, sender: isRtl ? "أحمد (سكابكس)" : "Ahmed (SCAPE)", role: "support", text: isRtl ? "نعم، تم الاعتماد وصدرت رخصة البناء." : "Yes, approved and the building permit has been issued.", time: "11:00 AM" },
  ]);

  const theme = PORTAL_THEMES.find(t => t.id === portalTheme) || PORTAL_THEMES[0];

  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    const name = CLIENT_NAME.toLowerCase();
    const allProposals = getProposals();
    const allContracts = getContracts();
    const allProjects = getProjects();
    setProposals(allProposals.filter(p => p.clientName.toLowerCase().includes(name) || name.includes(p.clientName.toLowerCase())));
    setContracts(allContracts.filter(c => c.clientName.toLowerCase().includes(name) || name.includes(c.clientName.toLowerCase())));
    setProjects(allProjects.filter(p => p.clientName.toLowerCase().includes(name) || name.includes(p.clientName.toLowerCase())));
  }, []);

  const handleSendMessage = () => {
    if (!chatMessage.trim()) return;
    setMessages(prev => [...prev, {
      id: Date.now(),
      sender: isRtl ? "أنت" : "You",
      role: "client",
      text: chatMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }]);
    setChatMessage("");
  };

  const activeProjects = projects.filter(p => p.status === "active" || p.status === "planning");
  const pendingProposals = proposals.filter(p => p.status === "sent" || p.status === "under_review");
  const totalContractValue = contracts.reduce((s, c) => s + c.total, 0);
  const fmt = (n: number) => n.toLocaleString(isRtl ? "ar-SA" : "en-US", { maximumFractionDigits: 0 });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" dir={dir}>

      <div className="lg:col-span-2 space-y-6">

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className={cn("sm:col-span-4 border-2 rounded-xl overflow-hidden", theme.welcomeBg, "border-transparent dark:border-border")}>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <h2 className={cn("text-2xl font-bold mb-1", theme.welcomeText)}>
                  {isRtl ? `مرحباً بك، ${CLIENT_NAME}` : `Welcome back, ${CLIENT_NAME}`}
                </h2>
                <p className="text-muted-foreground text-sm">
                  {isRtl ? "إليك ملخص لمشاريعك وعروضك وعقودك الحالية." : "Here is a summary of your active projects, proposals, and contracts."}
                </p>
              </div>
              <div className={cn("w-16 h-16 rounded-2xl hidden sm:flex items-center justify-center shrink-0", theme.welcomeBg)}>
                <Building2 className={cn("w-8 h-8", theme.welcomeText)} />
              </div>
            </CardContent>
          </Card>

          <Card className={cardClass}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"><Briefcase className="w-5 h-5" /></div>
                <p className="text-xs font-medium text-muted-foreground">{isRtl ? "المشاريع النشطة" : "Active Projects"}</p>
              </div>
              <p className="text-3xl font-bold">{activeProjects.length}</p>
            </CardContent>
          </Card>

          <Card className={cardClass}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"><FileCheck className="w-5 h-5" /></div>
                <p className="text-xs font-medium text-muted-foreground">{isRtl ? "العقود النشطة" : "Active Contracts"}</p>
              </div>
              <p className="text-3xl font-bold">{contracts.length}</p>
            </CardContent>
          </Card>

          <Card className={cardClass}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"><Clock className="w-5 h-5" /></div>
                <p className="text-xs font-medium text-muted-foreground">{isRtl ? "عروض معلقة" : "Pending Proposals"}</p>
              </div>
              <p className="text-3xl font-bold">{pendingProposals.length}</p>
            </CardContent>
          </Card>

          <Card className={cardClass}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"><TrendingUp className="w-5 h-5" /></div>
                <p className="text-xs font-medium text-muted-foreground">{isRtl ? "إجمالي العقود" : "Total Contract Value"}</p>
              </div>
              <p className="text-xl font-bold">{fmt(totalContractValue)} <span className="text-sm text-muted-foreground">SAR</span></p>
            </CardContent>
          </Card>
        </div>

        <Card className={cardClass}>
          <CardHeader className={cn("p-5", cardHeaderClass)}>
            <CardTitle className="text-lg flex items-center justify-between">
              {isRtl ? "متابعة المشاريع" : "Project Tracking"}
              <Badge variant="secondary">{projects.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {projects.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                {isRtl ? "لا توجد مشاريع حتى الآن. سيظهر مشروعك هنا فور توقيع العقد." : "No projects yet. Your project will appear here once a contract is signed."}
              </div>
            ) : (
              <div className="divide-y divide-border/40 dark:divide-border">
                {projects.map(proj => (
                  <div key={proj.id} className="p-5 hover:bg-muted/20 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                      <div>
                        <h3 className="font-semibold text-base flex items-center gap-2 flex-wrap">
                          {proj.name}
                          <Badge className={cn("text-xs",
                            proj.status === "active" ? "bg-emerald-500 hover:bg-emerald-600" :
                            proj.status === "planning" ? "bg-blue-500 hover:bg-blue-600" :
                            proj.status === "completed" ? "bg-slate-500 hover:bg-slate-600" :
                            "bg-amber-500 hover:bg-amber-600"
                          )}>
                            {proj.status === "active" ? (isRtl ? "قيد التنفيذ" : "In Progress") :
                             proj.status === "planning" ? (isRtl ? "تخطيط" : "Planning") :
                             proj.status === "completed" ? (isRtl ? "مكتمل" : "Completed") :
                             (isRtl ? "متوقف" : "On Hold")}
                          </Badge>
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5" />
                          {isRtl ? `الانتهاء المتوقع: ${proj.deadline}` : `Expected Completion: ${proj.deadline}`}
                        </p>
                      </div>
                      <div className={cn("text-right", isRtl ? "text-left" : "text-right")}>
                        <p className="text-sm font-medium mb-1">{proj.progress}% {isRtl ? "مكتمل" : "Complete"}</p>
                        <div className="w-full sm:w-32">
                          <Progress value={proj.progress} className="h-2.5" />
                        </div>
                      </div>
                    </div>
                    <div className="relative pt-5 pb-1">
                      <div className="absolute top-7 left-0 right-0 h-0.5 bg-border z-0" />
                      <div className="relative z-10 flex justify-between">
                        {["Planning", "Design", "Construction", "Handover"].map((phase, i) => {
                          const phases = ["Planning", "Design", "Construction", "Handover"];
                          const currentIdx = phases.indexOf(proj.phase);
                          const done = i < currentIdx;
                          const current = i === currentIdx;
                          return (
                            <div key={phase} className="flex flex-col items-center gap-2">
                              <div className={cn("w-4 h-4 rounded-full ring-4",
                                done ? "bg-emerald-500 ring-background" :
                                current ? "bg-primary ring-primary/20" :
                                "bg-secondary border-2 border-border ring-background"
                              )} />
                              <span className={cn("text-[10px] font-medium", current ? "text-primary" : "text-muted-foreground")}>
                                {isRtl ?
                                  (phase === "Planning" ? "تخطيط" : phase === "Design" ? "تصميم" : phase === "Construction" ? "تنفيذ" : "تسليم") :
                                  phase}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {(proj.proposalNumber || proj.contractNumber) && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {proj.proposalNumber && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 font-mono">
                            <FileText className="w-3 h-3" /> {proj.proposalNumber}
                          </span>
                        )}
                        {proj.contractNumber && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400 font-mono">
                            <FileCheck className="w-3 h-3" /> {proj.contractNumber}
                          </span>
                        )}
                        {proj.contractValue > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400">
                            <Receipt className="w-3 h-3" /> {proj.contractValue.toLocaleString()} {proj.currency}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {proposals.length > 0 && (
          <Card className={cardClass}>
            <CardHeader className={cn("p-5", cardHeaderClass)}>
              <CardTitle className="text-lg flex items-center justify-between">
                {isRtl ? "عروض الأسعار" : "Proposals"}
                <Badge variant="secondary">{proposals.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/40 dark:divide-border">
                {proposals.slice(0, 4).map(p => {
                  const sm = STATUS_META[p.status];
                  return (
                    <div key={p.id} className="p-4 flex items-center justify-between hover:bg-muted/20 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{p.projectName}</p>
                          <p className="text-xs text-muted-foreground font-mono">{p.proposalNumber}</p>
                        </div>
                      </div>
                      <div className={cn("flex items-center gap-2", isRtl ? "flex-row-reverse" : "")}>
                        <span className="text-sm font-medium text-primary">{p.total.toLocaleString()} {p.currency}</span>
                        <Badge variant="outline" className={cn("text-xs border", sm.border, sm.bg, sm.color)}>
                          {isRtl ? sm.labelAr : sm.labelEn}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

      </div>

      <div className="space-y-6">

        <Card className={cardClass}>
          <CardHeader className={cn("p-5 pb-4", cardHeaderClass)}>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-violet-600" />
              {isRtl ? "العقود" : "Contracts"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {contracts.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {isRtl ? "لا توجد عقود حتى الآن" : "No contracts yet"}
              </div>
            ) : (
              <div className="divide-y divide-border/40 dark:divide-border">
                {contracts.map(c => (
                  <div key={c.id} className="p-4 hover:bg-muted/20 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{c.projectName}</p>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">{c.contractNumber}</p>
                      </div>
                      <Badge variant="outline" className={cn("text-[10px] shrink-0",
                        c.status === "active" ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" : ""
                      )}>
                        {c.status === "active" ? (isRtl ? "نشط" : "Active") : c.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {c.startDate}
                      </span>
                      <span className="text-sm font-bold text-primary">{c.total.toLocaleString()} {c.currency}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={cardClass}>
          <CardHeader className={cn("p-5 pb-4", cardHeaderClass)}>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              {isRtl ? "أحدث المستندات" : "Recent Documents"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/40 dark:divide-border">
              <div className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors group">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 rounded bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{isRtl ? "المخططات الإنشائية V2.pdf" : "Structural_Drawings_V2.pdf"}</p>
                    <p className="text-xs text-muted-foreground">4.2 MB • {isRtl ? "اليوم" : "Today"}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="shrink-0 opacity-0 group-hover:opacity-100">
                  <Download className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
              {contracts.length > 0 && (
                <div className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors group">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400 flex items-center justify-center shrink-0">
                      <FileCheck className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{isRtl ? "عقد الخدمات.pdf" : "Service_Contract.pdf"}</p>
                      <p className="text-xs flex items-center gap-1 mt-0.5">
                        <Badge variant="outline" className="text-[10px] h-4 px-1 border-amber-200 text-amber-600 bg-amber-50">
                          {isRtl ? "بانتظار توقيعك" : "Pending Signature"}
                        </Badge>
                      </p>
                    </div>
                  </div>
                  <Button size="sm" className="shrink-0 h-7 text-xs bg-primary hover:bg-primary/90">
                    {isRtl ? "توقيع" : "Sign"}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="p-3 border-t border-border/40 dark:border-border bg-muted/10 justify-center">
            <Button variant="outline" size="sm" className="w-full gap-2 border-dashed">
              <Upload className="w-4 h-4" />
              {isRtl ? "رفع مستند جديد" : "Upload Document"}
            </Button>
          </CardFooter>
        </Card>

        <Card className={cn(cardClass, "flex flex-col h-[380px]")}>
          <CardHeader className={cn("p-4 pb-3", cardHeaderClass)}>
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 border border-primary/20">
                <AvatarFallback className="bg-primary/10 text-primary">SC</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-base">{isRtl ? "مدير حسابك" : "Account Manager"}</CardTitle>
                <CardDescription className="text-xs flex items-center gap-1 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  {isRtl ? "متصل الآن - أحمد (سكابكس)" : "Online - Ahmed (SCAPE)"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-hidden">
            <ScrollArea className="h-full p-4">
              <div className="space-y-4">
                <div className="text-center text-xs text-muted-foreground my-2">{isRtl ? "اليوم" : "Today"}</div>
                {messages.map(msg => (
                  <div key={msg.id} className={cn("flex max-w-[85%]", msg.role === "client" ? (isRtl ? "mr-auto flex-row-reverse" : "ml-auto") : "")}>
                    <div className={cn("rounded-2xl px-4 py-2 text-sm",
                      msg.role === "client" ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted text-foreground rounded-tl-sm"
                    )}>
                      <p>{msg.text}</p>
                      <span className={cn("text-[10px] mt-1 block opacity-70", isRtl ? "text-left" : "text-right")}>{msg.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
          <CardFooter className="p-3 border-t border-border/40 dark:border-border">
            <form className="flex w-full gap-2" onSubmit={e => { e.preventDefault(); handleSendMessage(); }}>
              <Input
                placeholder={isRtl ? "اكتب رسالة..." : "Type a message..."}
                className="flex-1 bg-secondary/50 focus-visible:ring-1"
                value={chatMessage}
                onChange={e => setChatMessage(e.target.value)}
                data-testid="input-chat-message"
              />
              <Button type="submit" size="icon" className="shrink-0 bg-primary hover:bg-primary/90">
                <MessageSquare className="w-4 h-4" />
              </Button>
            </form>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
