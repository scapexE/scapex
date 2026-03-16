import { MainLayout } from "@/components/layout/MainLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CRMDashboard } from "@/components/crm/CRMDashboard";
import { PipelineBoard } from "@/components/crm/PipelineBoard";
import { CustomersList } from "@/components/crm/CustomersList";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function CRMModule() {
  const { t } = useLanguage();

  return (
    <MainLayout>
      <div className="flex flex-col h-[calc(100vh-6rem)] gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t('nav.crm')}</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Manage leads, opportunities, customers, and sales activities.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
              New Lead
            </Button>
          </div>
        </div>

        <Tabs defaultValue="pipeline" className="flex-1 flex flex-col min-h-0">
          <TabsList className="w-full sm:w-auto self-start border-border/50 bg-secondary/50">
            <TabsTrigger value="pipeline" className="flex-1 sm:flex-none data-[state=active]:bg-background">Pipeline</TabsTrigger>
            <TabsTrigger value="customers" className="flex-1 sm:flex-none data-[state=active]:bg-background">Customers</TabsTrigger>
            <TabsTrigger value="dashboard" className="flex-1 sm:flex-none data-[state=active]:bg-background">Analytics</TabsTrigger>
          </TabsList>
          
          <div className="flex-1 mt-4 overflow-hidden relative">
            <TabsContent value="pipeline" className="h-full m-0 data-[state=active]:flex flex-col">
              <PipelineBoard />
            </TabsContent>
            
            <TabsContent value="customers" className="h-full m-0 data-[state=active]:flex flex-col">
              <CustomersList />
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
