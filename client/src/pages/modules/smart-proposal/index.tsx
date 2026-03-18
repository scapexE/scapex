import { MainLayout } from "@/components/layout/MainLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { ProposalGenerator } from "@/components/proposals/ProposalGenerator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, Wand2 } from "lucide-react";

export default function SmartProposalModule() {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";

  return (
    <MainLayout>
      <div className="flex flex-col gap-6 pb-8">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold tracking-tight">
                {isRtl ? "العروض الذكية" : "Smart Proposals"}
              </h1>
              <Badge variant="outline" className="text-primary border-primary/30 bg-primary/5 gap-1 text-xs">
                <Bot className="w-3 h-3" />
                AI Powered
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm max-w-2xl">
              {isRtl
                ? "أنشئ عروض أسعار احترافية بالذكاء الاصطناعي. حدد نوع الخدمة ودع النظام يقترح البنود والأسعار، ثم حوّل العرض لعقد أو فاتورة بنقرة واحدة."
                : "Create professional proposals powered by AI. Select service type, let the system suggest items and prices, then convert to a contract or invoice in one click."}
            </p>
          </div>
        </div>

        <ProposalGenerator />
      </div>
    </MainLayout>
  );
}
