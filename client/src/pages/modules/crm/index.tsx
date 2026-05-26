import { MainLayout } from "@/components/layout/MainLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CRMDashboard } from "@/components/crm/CRMDashboard";
import { PipelineBoard } from "@/components/crm/PipelineBoard";
import { CustomersList } from "@/components/crm/CustomersList";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useActivityScope } from "@/hooks/useActivityScope";
import { useLocation } from "wouter";
import { dbSetItem } from "@/lib/dbStorage";
import type { ProposalPrefill } from "@/components/crm/PipelineBoard";

export default function CRMModule() {
  const { t, dir } = useLanguage();
  const isRtl = dir === "rtl";
  const [activeTab, setActiveTab] = useState("pipeline");
  const [addLeadSignal, setAddLeadSignal] = useState(0);
  // Activity scope: data is filtered by the active activity automatically.
  // We only disable creation when no activity is selected (rare; admins on "All").
  const { activityId } = useActivityScope();
  const blockingForCreate = !activityId;
  const [, navigate] = useLocation();

  // Centralized handler: every "Request Quote" / "Create Proposal" entry point
  // funnels through here so the prefill payload is consistent.
  const goToProposal = (data: Partial<ProposalPrefill>) => {
    dbSetItem("scapex_proposal_prefill", JSON.stringify(data));
    navigate("/smart-proposal");
  };

  const handleNewLead = () => {
    if (blockingForCreate) return;
    setActiveTab("pipeline");
    setAddLeadSignal((n) => n + 1);
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
            <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={handleNewLead} disabled={blockingForCreate} data-testid="button-new-lead">
              <Plus className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
              {t('crm.new_lead')}
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="w-full sm:w-auto self-start border-border/50 bg-secondary/50">
            <TabsTrigger value="pipeline" className="flex-1 sm:flex-none data-[state=active]:bg-background">{t('crm.tab.pipeline')}</TabsTrigger>
            <TabsTrigger value="customers" className="flex-1 sm:flex-none data-[state=active]:bg-background">{t('crm.tab.customers')}</TabsTrigger>
            <TabsTrigger value="dashboard" className="flex-1 sm:flex-none data-[state=active]:bg-background">{t('crm.tab.analytics')}</TabsTrigger>
          </TabsList>

          <div className="flex-1 mt-4 overflow-hidden relative">
            <TabsContent value="pipeline" className="h-full m-0 data-[state=active]:flex flex-col">
              <PipelineBoard openAddDialogSignal={addLeadSignal} onCreateProposal={(d) => goToProposal(d)} />
            </TabsContent>

            <TabsContent value="customers" className="h-full m-0 data-[state=active]:flex flex-col">
              <CustomersList onCreateProposal={(clientName, clientEmail, clientContact, contactId) =>
                goToProposal({ clientName, clientEmail, clientContact, projectName: "", contactId: contactId ?? null })
              } />
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
