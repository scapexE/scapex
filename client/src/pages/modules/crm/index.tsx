import { MainLayout } from "@/components/layout/MainLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CRMDashboard } from "@/components/crm/CRMDashboard";
import { PipelineBoard, type ProposalPrefill } from "@/components/crm/PipelineBoard";
import { CustomersList } from "@/components/crm/CustomersList";
import { Button } from "@/components/ui/button";
import { Plus, FileText } from "lucide-react";
import { useLocation } from "wouter";

export default function CRMModule() {
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
            <h1 className="text-2xl font-bold tracking-tight">{t('nav.crm')}</h1>
            <p className="text-muted-foreground mt-1 text-sm">{t('crm.desc')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="gap-1.5 border-primary/40 text-primary hover:bg-primary/5" onClick={handleNewProposal} data-testid="button-new-proposal-from-crm">
              <FileText className="w-4 h-4" />
              {isRtl ? "إنشاء عرض سعر" : "Create Proposal"}
            </Button>
            <Button size="sm" className="bg-primary hover:bg-primary/90" data-testid="button-new-lead">
              <Plus className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
              {t('crm.new_lead')}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="pipeline" className="flex-1 flex flex-col min-h-0">
          <TabsList className="w-full sm:w-auto self-start border-border/50 bg-secondary/50">
            <TabsTrigger value="pipeline" className="flex-1 sm:flex-none data-[state=active]:bg-background">{t('crm.tab.pipeline')}</TabsTrigger>
            <TabsTrigger value="customers" className="flex-1 sm:flex-none data-[state=active]:bg-background">{t('crm.tab.customers')}</TabsTrigger>
            <TabsTrigger value="dashboard" className="flex-1 sm:flex-none data-[state=active]:bg-background">{t('crm.tab.analytics')}</TabsTrigger>
          </TabsList>

          <div className="flex-1 mt-4 overflow-hidden relative">
            <TabsContent value="pipeline" className="h-full m-0 data-[state=active]:flex flex-col">
              <PipelineBoard onCreateProposal={(data: ProposalPrefill) => {
                try {
                  localStorage.setItem("scapex_proposal_prefill", JSON.stringify({
                    clientName:    data.clientName,
                    clientEmail:   data.clientEmail,
                    clientContact: data.clientContact,
                    projectName:   data.projectName,
                  }));
                } catch {}
                navigate("/smart-proposal");
              }} />
            </TabsContent>

            <TabsContent value="customers" className="h-full m-0 data-[state=active]:flex flex-col">
              <CustomersList onCreateProposal={(clientName, email, phone) => {
                try {
                  localStorage.setItem("scapex_proposal_prefill", JSON.stringify({ clientName, clientEmail: email, clientContact: phone }));
                } catch {}
                navigate("/smart-proposal");
              }} />
            </TabsContent>

            <TabsContent value="dashboard" className="h-full m-0 data-[state=active]:flex flex-col overflow-y-auto pr-2">
              <CRMDashboard />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </MainLayout>
  );
}
