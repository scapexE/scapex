import { MainLayout } from "@/components/layout/MainLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AccountingDashboard } from "@/components/accounting/AccountingDashboard";
import { JournalEntries } from "@/components/accounting/JournalEntries";
import { Button } from "@/components/ui/button";
import { Plus, Download } from "lucide-react";

export default function AccountingModule() {
  const { t, dir } = useLanguage();

  return (
    <MainLayout>
      <div className="flex flex-col h-[calc(100vh-6rem)] gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t('nav.accounting')}</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {t('acc.desc')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" className="h-9">
              <Download className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
              {dir === 'rtl' ? 'تصدير التقارير' : 'Export Reports'}
            </Button>
            <Button size="sm" className="bg-primary hover:bg-primary/90 h-9">
              <Plus className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
              {t('action.create_new')}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="dashboard" className="flex-1 flex flex-col min-h-0">
          <TabsList className="w-full sm:w-auto self-start border-border/50 bg-secondary/50 overflow-x-auto flex-nowrap justify-start">
            <TabsTrigger value="dashboard" className="flex-1 sm:flex-none data-[state=active]:bg-background whitespace-nowrap">{t('acc.tab.dashboard')}</TabsTrigger>
            <TabsTrigger value="journal" className="flex-1 sm:flex-none data-[state=active]:bg-background whitespace-nowrap">{t('acc.tab.journal')}</TabsTrigger>
            <TabsTrigger value="coa" className="flex-1 sm:flex-none data-[state=active]:bg-background whitespace-nowrap">{t('acc.tab.coa')}</TabsTrigger>
            <TabsTrigger value="reports" className="flex-1 sm:flex-none data-[state=active]:bg-background whitespace-nowrap">{t('acc.tab.reports')}</TabsTrigger>
            <TabsTrigger value="taxes" className="flex-1 sm:flex-none data-[state=active]:bg-background whitespace-nowrap">{t('acc.tab.taxes')}</TabsTrigger>
          </TabsList>
          
          <div className="flex-1 mt-4 overflow-hidden relative">
            <TabsContent value="dashboard" className="h-full m-0 data-[state=active]:flex flex-col overflow-y-auto pb-6">
              <AccountingDashboard />
            </TabsContent>
            
            <TabsContent value="journal" className="h-full m-0 data-[state=active]:flex flex-col overflow-y-auto">
              <JournalEntries />
            </TabsContent>
            
            <TabsContent value="coa" className="h-full m-0 data-[state=active]:flex flex-col items-center justify-center border-2 border-dashed border-border/50 rounded-xl bg-card/50">
              <div className="text-muted-foreground">{dir === 'rtl' ? 'شجرة الحسابات قريباً' : 'Chart of Accounts coming soon'}</div>
            </TabsContent>
            
            <TabsContent value="reports" className="h-full m-0 data-[state=active]:flex flex-col items-center justify-center border-2 border-dashed border-border/50 rounded-xl bg-card/50">
              <div className="text-muted-foreground">{dir === 'rtl' ? 'التقارير المالية والميزانية العمومية قريباً' : 'Financial Reports & Balance Sheet coming soon'}</div>
            </TabsContent>

            <TabsContent value="taxes" className="h-full m-0 data-[state=active]:flex flex-col items-center justify-center border-2 border-dashed border-border/50 rounded-xl bg-card/50">
              <div className="text-muted-foreground">{dir === 'rtl' ? 'إدارة الضرائب والقيمة المضافة قريباً' : 'Tax & VAT Management coming soon'}</div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </MainLayout>
  );
}
