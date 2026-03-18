import { MainLayout } from "@/components/layout/MainLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { ProposalGenerator } from "@/components/proposals/ProposalGenerator";
import { Badge } from "@/components/ui/badge";
import { Bot, Sparkles, FileText, TrendingUp } from "lucide-react";

export default function SmartProposalModule() {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";

  return (
    <MainLayout>
      <div className="flex flex-col gap-6 pb-8">
        {/* ── Premium Header ── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/15 px-6 py-5">
          {/* background glow */}
          <div className="absolute -top-8 -end-8 w-48 h-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 start-0 w-32 h-32 rounded-full bg-violet-500/8 blur-2xl pointer-events-none" />

          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              {/* Icon block */}
              <div className="shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/25">
                <Bot className="w-6 h-6 text-white" />
              </div>

              <div>
                <div className="flex items-center gap-2.5 mb-1">
                  <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-primary via-primary/80 to-violet-500 bg-clip-text text-transparent">
                    {isRtl ? "منشئ العروض الذكي" : "Smart Proposal Studio"}
                  </h1>
                  <Badge className="bg-primary/10 text-primary border-primary/25 gap-1 text-[10px] font-semibold px-2 py-0.5">
                    <Sparkles className="w-3 h-3" />
                    AI Powered
                  </Badge>
                </div>
                <p className="text-muted-foreground text-sm max-w-2xl leading-relaxed">
                  {isRtl
                    ? "أنشئ عروض أسعار احترافية بالذكاء الاصطناعي وأسعار السوق السعودي. حدد نوع الخدمة والمنطقة، ودع النظام يقترح البنود والأسعار، ثم حوّل العرض لعقد أو فاتورة."
                    : "Build professional proposals powered by AI and Saudi market benchmarks. Select service type and region, let the system suggest items and prices, then convert to contract or invoice."}
                </p>
              </div>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-4 shrink-0">
              <div className="text-center">
                <div className="flex items-center gap-1 text-primary">
                  <FileText className="w-3.5 h-3.5" />
                  <span className="text-xs font-semibold">{isRtl ? "6 خدمات" : "6 Services"}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{isRtl ? "أنواع مدعومة" : "Supported"}</p>
              </div>
              <div className="w-px h-8 bg-border/60" />
              <div className="text-center">
                <div className="flex items-center gap-1 text-emerald-600">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span className="text-xs font-semibold">{isRtl ? "6 مناطق" : "6 Regions"}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{isRtl ? "أسعار محلية" : "Local Prices"}</p>
              </div>
            </div>
          </div>
        </div>

        <ProposalGenerator />
      </div>
    </MainLayout>
  );
}
