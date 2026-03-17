import { MainLayout } from "@/components/layout/MainLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { ProposalGenerator } from "@/components/proposals/ProposalGenerator";
import { Button } from "@/components/ui/button";
import { History } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SmartProposalModule() {
  const { t, dir } = useLanguage();

  return (
    <MainLayout>
      <div className="flex flex-col gap-6 pb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('nav.smart_proposal')}</h1>
            <p className="text-muted-foreground mt-1 text-sm max-w-2xl">
              {dir === 'rtl' 
                ? 'نظام توليد المقترحات الذكي باستخدام الذكاء الاصطناعي. اختر نوع الخدمة، ودع النظام يقترح الأسعار، بنود العمل، والمسودات بناءً على بيانات المشاريع السابقة.' 
                : 'AI-powered smart proposal generation system. Select service type, and let the system suggest pricing, scope items, and drafts based on historical project data.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2">
              <History className="w-4 h-4" />
              {dir === 'rtl' ? 'سجل المقترحات' : 'Proposal History'}
            </Button>
          </div>
        </div>

        <ProposalGenerator />
      </div>
    </MainLayout>
  );
}
