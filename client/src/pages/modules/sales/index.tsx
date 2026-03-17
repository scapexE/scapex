import { MainLayout } from "@/components/layout/MainLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContractsList } from "@/components/sales/ContractsList";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function SalesModule() {
  const { t, dir } = useLanguage();

  return (
    <MainLayout>
      <div className="flex flex-col h-[calc(100vh-6rem)] gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t('nav.sales')}</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {t('sales.desc')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
              {t('action.create_new')}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="contracts" className="flex-1 flex flex-col min-h-0">
          <TabsList className="w-full sm:w-auto self-start border-border/50 bg-secondary/50">
            <TabsTrigger value="quotations" className="flex-1 sm:flex-none data-[state=active]:bg-background">{t('sales.tab.quotations')}</TabsTrigger>
            <TabsTrigger value="orders" className="flex-1 sm:flex-none data-[state=active]:bg-background">{t('sales.tab.orders')}</TabsTrigger>
            <TabsTrigger value="contracts" className="flex-1 sm:flex-none data-[state=active]:bg-background">{t('sales.tab.contracts')}</TabsTrigger>
          </TabsList>
          
          <div className="flex-1 mt-4 overflow-hidden relative">
            <TabsContent value="quotations" className="h-full m-0 data-[state=active]:flex flex-col items-center justify-center border-2 border-dashed border-border/50 rounded-xl bg-card/50">
              <div className="text-muted-foreground">Quotations list coming soon</div>
            </TabsContent>
            
            <TabsContent value="orders" className="h-full m-0 data-[state=active]:flex flex-col items-center justify-center border-2 border-dashed border-border/50 rounded-xl bg-card/50">
              <div className="text-muted-foreground">Sales orders list coming soon</div>
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
