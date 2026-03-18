import { MainLayout } from "@/components/layout/MainLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContractsList } from "@/components/sales/ContractsList";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Bot, CheckCircle2, Send, Clock, TrendingUp } from "lucide-react";
import { useLocation } from "wouter";
import { getProposals, STATUS_META, SERVICE_META, type Proposal } from "@/lib/proposals";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

function ProposalQuotationsList({ isRtl, onNewProposal }: {
  isRtl: boolean;
  onNewProposal: () => void;
}) {
  const [proposals, setProposals] = useState<Proposal[]>([]);

  useEffect(() => {
    setProposals(getProposals());
  }, []);

  const sentPending = proposals.filter((p) => p.status === "sent" || p.status === "under_review");
  const drafts = proposals.filter((p) => p.status === "draft");
  const total = proposals.reduce((s, p) => s + p.total, 0);

  if (proposals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-4 text-muted-foreground py-16">
        <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center">
          <FileText className="w-8 h-8 text-primary/40" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-foreground mb-1">{isRtl ? "لا توجد عروض أسعار" : "No Quotations Yet"}</p>
          <p className="text-sm">{isRtl ? "أنشئ عروض أسعار من قسم العروض الذكية أو من هنا" : "Create proposals from Smart Proposals or here"}</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={onNewProposal}>
          <Bot className="w-4 h-4" />
          {isRtl ? "إنشاء عرض سعر بالذكاء الاصطناعي" : "Create AI Proposal"}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4 shrink-0">
        <div className="bg-secondary/40 rounded-xl p-3 flex items-center gap-2.5 border border-border/50">
          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{isRtl ? "مُرسَلة / قيد المراجعة" : "Sent / Under Review"}</p>
            <p className="font-bold text-sm">{sentPending.length}</p>
          </div>
        </div>
        <div className="bg-secondary/40 rounded-xl p-3 flex items-center gap-2.5 border border-border/50">
          <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <FileText className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{isRtl ? "مسودات" : "Drafts"}</p>
            <p className="font-bold text-sm">{drafts.length}</p>
          </div>
        </div>
        <div className="bg-secondary/40 rounded-xl p-3 flex items-center gap-2.5 border border-border/50">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{isRtl ? "إجمالي القيمة" : "Total Value"}</p>
            <p className="font-bold text-sm font-mono">{(total / 1000).toFixed(0)}K</p>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {proposals.slice(0, 20).map((p) => {
          const svc = SERVICE_META[p.serviceType];
          const st = STATUS_META[p.status];
          return (
            <div key={p.id}
              className="flex items-center gap-3 p-3.5 rounded-xl border border-border/50 bg-card hover:border-primary/30 hover:shadow-sm transition-all">
              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0", `bg-${svc.color}-500`)}>
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono text-muted-foreground">{p.proposalNumber}</span>
                  <Badge className={cn("text-[10px] px-1.5 py-0 border", st.bg, st.color, st.border)}>
                    {isRtl ? st.labelAr : st.labelEn}
                  </Badge>
                  {p.aiGenerated && <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-primary border-primary/30"><Bot className="w-2.5 h-2.5 me-0.5" />AI</Badge>}
                </div>
                <p className="font-semibold text-sm mt-0.5 truncate">{p.clientName}</p>
                <p className="text-xs text-muted-foreground truncate">{isRtl ? svc.labelAr : svc.labelEn} — {p.projectName}</p>
              </div>
              <div className="text-end shrink-0">
                <p className="font-bold text-sm font-mono">{p.total.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">{p.currency}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SalesModule() {
  const { t, dir } = useLanguage();
  const isRtl = dir === "rtl";
  const [, navigate] = useLocation();

  const handleNewProposal = () => {
    navigate("/smart-proposal");
  };

  return (
    <MainLayout>
      <div className="flex flex-col h-[calc(100vh-6rem)] gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t('nav.sales')}</h1>
            <p className="text-muted-foreground mt-1 text-sm">{t('sales.desc')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="gap-1.5 border-primary/40 text-primary hover:bg-primary/5" onClick={handleNewProposal} data-testid="button-new-proposal-from-sales">
              <Bot className="w-4 h-4" />
              {isRtl ? "إنشاء عرض سعر" : "Create Proposal"}
            </Button>
            <Button size="sm" className="bg-primary hover:bg-primary/90" data-testid="button-new-sale">
              <Plus className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
              {t('action.create_new')}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="quotations" className="flex-1 flex flex-col min-h-0">
          <TabsList className="w-full sm:w-auto self-start border-border/50 bg-secondary/50">
            <TabsTrigger value="quotations" className="flex-1 sm:flex-none data-[state=active]:bg-background">{t('sales.tab.quotations')}</TabsTrigger>
            <TabsTrigger value="orders" className="flex-1 sm:flex-none data-[state=active]:bg-background">{t('sales.tab.orders')}</TabsTrigger>
            <TabsTrigger value="contracts" className="flex-1 sm:flex-none data-[state=active]:bg-background">{t('sales.tab.contracts')}</TabsTrigger>
          </TabsList>

          <div className="flex-1 mt-4 overflow-hidden relative">
            <TabsContent value="quotations" className="h-full m-0 data-[state=active]:flex flex-col">
              <ProposalQuotationsList isRtl={isRtl} onNewProposal={handleNewProposal} />
            </TabsContent>

            <TabsContent value="orders" className="h-full m-0 data-[state=active]:flex flex-col items-center justify-center border-2 border-dashed border-border/50 rounded-xl bg-card/50">
              <div className="text-muted-foreground">{isRtl ? "أوامر البيع قريباً" : "Sales orders coming soon"}</div>
            </TabsContent>

            <TabsContent value="contracts" className="h-full m-0 data-[state=active]:flex flex-col overflow-y-auto">
              <ContractsList />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </MainLayout>
  );
}
