import { MainLayout } from "@/components/layout/MainLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AccountingDashboard } from "@/components/accounting/AccountingDashboard";
import { JournalEntries } from "@/components/accounting/JournalEntries";
import { InvoicesTab } from "@/components/accounting/InvoicesTab";
import { PaymentsTab } from "@/components/accounting/PaymentsTab";
import { ChartOfAccountsTab } from "@/components/accounting/ChartOfAccountsTab";
import { FinancialReportsTab } from "@/components/accounting/FinancialReportsTab";
import { Button } from "@/components/ui/button";
import { Download, FileText, ArrowDownCircle, TreePine, BarChart3 } from "lucide-react";

export default function AccountingModule() {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";

  return (
    <MainLayout>
      <div className="flex flex-col h-[calc(100vh-6rem)] gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {isRtl ? "المالية والمحاسبة" : "Finance & Accounting"}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {isRtl
                ? "الفواتير الضريبية، سندات القبض والصرف، القيود المحاسبية"
                : "Tax invoices, receipt & payment vouchers, journal entries"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" className="h-9 gap-1.5">
              <Download className="w-4 h-4" />
              {isRtl ? "تصدير التقارير" : "Export Reports"}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="dashboard" className="flex-1 flex flex-col min-h-0">
          <TabsList className="w-full sm:w-auto self-start border-border/50 bg-secondary/50 overflow-x-auto flex-nowrap justify-start">
            <TabsTrigger value="dashboard" className="flex-1 sm:flex-none data-[state=active]:bg-background whitespace-nowrap">
              {isRtl ? "الملخص" : "Dashboard"}
            </TabsTrigger>
            <TabsTrigger value="invoices" className="flex-1 sm:flex-none data-[state=active]:bg-background whitespace-nowrap gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              {isRtl ? "الفواتير الضريبية" : "Tax Invoices"}
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex-1 sm:flex-none data-[state=active]:bg-background whitespace-nowrap gap-1.5">
              <ArrowDownCircle className="w-3.5 h-3.5" />
              {isRtl ? "سندات القبض / الصرف" : "Vouchers"}
            </TabsTrigger>
            <TabsTrigger value="journal" className="flex-1 sm:flex-none data-[state=active]:bg-background whitespace-nowrap">
              {isRtl ? "القيود" : "Journal"}
            </TabsTrigger>
            <TabsTrigger value="coa" className="flex-1 sm:flex-none data-[state=active]:bg-background whitespace-nowrap">
              {isRtl ? "شجرة الحسابات" : "Chart of Accounts"}
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex-1 sm:flex-none data-[state=active]:bg-background whitespace-nowrap">
              {isRtl ? "التقارير" : "Reports"}
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 mt-4 overflow-hidden relative">
            <TabsContent value="dashboard" className="h-full m-0 data-[state=active]:flex flex-col overflow-y-auto pb-6">
              <AccountingDashboard />
            </TabsContent>

            <TabsContent value="invoices" className="h-full m-0 data-[state=active]:flex flex-col overflow-y-auto pb-6">
              <InvoicesTab />
            </TabsContent>

            <TabsContent value="payments" className="h-full m-0 data-[state=active]:flex flex-col overflow-y-auto pb-6">
              <PaymentsTab />
            </TabsContent>

            <TabsContent value="journal" className="h-full m-0 data-[state=active]:flex flex-col overflow-y-auto">
              <JournalEntries />
            </TabsContent>

            <TabsContent value="coa" className="h-full m-0 data-[state=active]:flex flex-col overflow-y-auto pb-6">
              <ChartOfAccountsTab />
            </TabsContent>

            <TabsContent value="reports" className="h-full m-0 data-[state=active]:flex flex-col overflow-y-auto pb-6">
              <FinancialReportsTab />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </MainLayout>
  );
}
