import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrainCircuit, Bot, Zap, TrendingUp, AlertTriangle, CheckCircle2, RefreshCw, Lightbulb, Settings, BarChart3, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIInsight {
  id: string; category: string; title: string; titleAr: string; description: string; descriptionAr: string;
  confidence: number; impact: "high"|"medium"|"low"; status: "active"|"resolved"|"dismissed"; date: string;
}

interface AutomationRule {
  id: string; nameAr: string; nameEn: string; trigger: string; action: string; runs: number; status: "active"|"paused";
}

const SEED_INSIGHTS: AIInsight[] = [
  {id:"1",category:"finance",title:"Revenue Growth Opportunity",titleAr:"فرصة نمو في الإيرادات",description:"Engineering consulting projects show 23% higher margins than average. Recommend increasing focus on this service type.",descriptionAr:"مشاريع الاستشارات الهندسية تُظهر هامش ربح أعلى بنسبة 23% من المتوسط. يُوصى بزيادة التركيز على هذا النوع من الخدمات.",confidence:87,impact:"high",status:"active",date:"2026-03-18"},
  {id:"2",category:"hr",title:"Attendance Pattern Alert",titleAr:"تنبيه نمط الحضور",description:"3 employees show consistent late arrivals on Sundays. Consider schedule adjustment or coaching.",descriptionAr:"3 موظفين يُظهرون تأخراً متكرراً يوم الأحد. يُنصح بمراجعة الجدول أو إجراء جلسة توجيه.",confidence:92,impact:"medium",status:"active",date:"2026-03-15"},
  {id:"3",category:"inventory",title:"Stock Depletion Risk",titleAr:"خطر نفاد المخزون",description:"Safety gloves stock will reach critical level in ~12 days based on current consumption rate.",descriptionAr:"مخزون قفازات السلامة سيصل لمستوى حرج خلال ~12 يوماً بناءً على معدل الاستهلاك الحالي.",confidence:95,impact:"high",status:"active",date:"2026-03-14"},
  {id:"4",category:"crm",title:"High-Value Lead Identified",titleAr:"عميل محتمل ذو قيمة عالية",description:"Al-Rajhi Construction has 3 pending RFQs matching your service capabilities. Probability of conversion: 78%.",descriptionAr:"شركة الراجحي للإنشاءات لديها 3 طلبات عروض معلقة تتوافق مع خدماتك. احتمالية التحويل: 78%.",confidence:78,impact:"high",status:"active",date:"2026-03-12"},
  {id:"5",category:"hse",title:"Safety Inspection Overdue",titleAr:"تجاوز موعد التفتيش",description:"Jeddah site safety inspection is 5 days overdue. Risk of non-compliance increases daily.",descriptionAr:"تفتيش السلامة لموقع جدة تأخر 5 أيام. تزداد مخاطر عدم الامتثال يومياً.",confidence:100,impact:"high",status:"resolved",date:"2026-03-10"},
];

const SEED_RULES: AutomationRule[] = [
  {id:"1",nameAr:"تنبيه انتهاء التراخيص",nameEn:"Permit Expiry Alert",trigger:"ترخيص قارب على الانتهاء (30 يوم)",action:"إرسال تنبيه لمسؤول الامتثال",runs:12,status:"active"},
  {id:"2",nameAr:"إنشاء فاتورة تلقائي",nameEn:"Auto Invoice Generation",trigger:"موافقة العميل على عرض السعر",action:"إنشاء فاتورة مسودة في المحاسبة",runs:34,status:"active"},
  {id:"3",nameAr:"تنبيه المخزون المنخفض",nameEn:"Low Stock Alert",trigger:"وصول المخزون للحد الأدنى",action:"إنشاء أمر شراء تلقائي",runs:7,status:"paused"},
  {id:"4",nameAr:"تقرير الحضور الأسبوعي",nameEn:"Weekly Attendance Report",trigger:"كل يوم أحد 08:00",action:"إرسال تقرير الحضور للإدارة",runs:52,status:"active"},
];

export default function AIControlModule() {
  const { dir } = useLanguage(); const isRtl = dir==="rtl";
  const [insights, setInsights] = useState<AIInsight[]>(SEED_INSIGHTS);
  const [rules, setRules] = useState<AutomationRule[]>(SEED_RULES);

  const activeInsights = insights.filter(i=>i.status==="active");
  const highImpact = activeInsights.filter(i=>i.impact==="high");

  const dismiss = (id:string) => setInsights(prev=>prev.map(i=>i.id===id?{...i,status:"dismissed" as const}:i));
  const resolve = (id:string) => setInsights(prev=>prev.map(i=>i.id===id?{...i,status:"resolved" as const}:i));
  const toggleRule = (id:string) => setRules(prev=>prev.map(r=>r.id===id?{...r,status:r.status==="active"?"paused" as const:"active" as const}:r));

  const impactColor = (i:string) => ({high:"text-red-500 bg-red-50 dark:bg-red-950/30",medium:"text-amber-600 bg-amber-50 dark:bg-amber-950/30",low:"text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30"}[i]||"");
  const impactLabel = (i:string) => ({high:isRtl?"عالي":"High",medium:isRtl?"متوسط":"Medium",low:isRtl?"منخفض":"Low"}[i]||i);
  const catIcon = (c:string) => ({finance:BarChart3,hr:TrendingUp,inventory:AlertTriangle,crm:Lightbulb,hse:AlertTriangle}[c]||Bot);

  return (
    <MainLayout>
      <div className="flex flex-col gap-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{isRtl?"مركز تحكم الذكاء الاصطناعي":"AI Control Center"}</h1>
            <p className="text-muted-foreground text-sm mt-1">{isRtl?"رؤى مدعومة بالذكاء الاصطناعي وأتمتة العمليات التجارية":"AI-powered insights and business process automation"}</p>
          </div>
          <Button variant="outline" size="sm"><RefreshCw className="w-4 h-4 me-1.5"/>{isRtl?"تحديث التحليلات":"Refresh Analysis"}</Button>
        </div>

        {/* AI Overview */}
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-purple-500/5 to-blue-500/5 p-5">
          <div className="absolute top-0 end-0 w-48 h-48 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"/>
          <div className="flex items-start gap-4 relative">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shrink-0">
              <BrainCircuit className="w-7 h-7 text-white"/>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-base font-bold">{isRtl?"محرك الذكاء الاصطناعي - Scapex AI":"Scapex AI Engine"}</h2>
                <Badge className="bg-emerald-500 text-white text-xs"><Zap className="w-2.5 h-2.5 me-0.5"/>{isRtl?"نشط":"Active"}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{isRtl?"يحلل بيانات جميع الوحدات في الوقت الحقيقي لتقديم رؤى استراتيجية وتنبيهات استباقية":"Analyzing data across all modules in real-time to deliver strategic insights and proactive alerts"}</p>
              <div className="flex flex-wrap gap-3 mt-3">
                {[
                  {label:isRtl?"رؤى نشطة":"Active Insights",value:activeInsights.length,color:"text-blue-500"},
                  {label:isRtl?"أولوية عالية":"High Priority",value:highImpact.length,color:"text-red-500"},
                  {label:isRtl?"قواعد الأتمتة":"Automation Rules",value:rules.filter(r=>r.status==="active").length,color:"text-emerald-500"},
                  {label:isRtl?"دقة التنبؤ":"Avg. Confidence",value:`${Math.round(activeInsights.reduce((s,i)=>s+i.confidence,0)/Math.max(1,activeInsights.length))}%`,color:"text-purple-500"},
                ].map((s,i)=>(
                  <div key={i} className="bg-background/60 rounded-xl px-3 py-2">
                    <p className={cn("text-lg font-bold",s.color)}>{s.value}</p>
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="insights">
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="insights">{isRtl?"الرؤى والتنبيهات":"AI Insights"}</TabsTrigger>
            <TabsTrigger value="automation">{isRtl?"الأتمتة":"Automation"}</TabsTrigger>
          </TabsList>

          <TabsContent value="insights" className="mt-4 space-y-3">
            {insights.filter(i=>i.status!=="dismissed").map(insight=>{
              const Icon = catIcon(insight.category);
              return (
                <Card key={insight.id} className={cn("border-border/50",insight.status==="resolved"?"opacity-60":"")}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0",insight.impact==="high"?"bg-red-100 dark:bg-red-950/30":"bg-secondary")}>
                        <Icon className={cn("w-5 h-5",insight.impact==="high"?"text-red-500":"text-muted-foreground")}/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-sm">{isRtl?insight.titleAr:insight.title}</h3>
                            <Badge className={cn("text-xs",impactColor(insight.impact))} variant="secondary">{impactLabel(insight.impact)} {isRtl?"تأثير":"Impact"}</Badge>
                            {insight.status==="resolved" && <Badge className="text-xs bg-emerald-500 text-white">{isRtl?"تم الحل":"Resolved"}</Badge>}
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">{insight.date}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{isRtl?insight.descriptionAr:insight.description}</p>
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-24 bg-secondary rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full" style={{width:`${insight.confidence}%`}}/></div>
                            <span className="text-xs text-muted-foreground">{insight.confidence}% {isRtl?"دقة":"confidence"}</span>
                          </div>
                          {insight.status==="active" && (
                            <div className="flex gap-1.5">
                              <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={()=>resolve(insight.id)}><CheckCircle2 className="w-3 h-3 me-1"/>{isRtl?"تم":"Resolved"}</Button>
                              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={()=>dismiss(insight.id)}>{isRtl?"تجاهل":"Dismiss"}</Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="automation" className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{isRtl?"قواعد الأتمتة الآلية تعمل على مدار الساعة دون تدخل بشري":"Automation rules run 24/7 without human intervention"}</p>
              <Button size="sm" variant="outline"><Settings className="w-4 h-4 me-1.5"/>{isRtl?"إعدادات":"Settings"}</Button>
            </div>
            {rules.map(rule=>(
              <Card key={rule.id} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0",rule.status==="active"?"bg-emerald-100 dark:bg-emerald-950/30":"bg-secondary")}>
                      <Zap className={cn("w-5 h-5",rule.status==="active"?"text-emerald-600":"text-muted-foreground")}/>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-sm">{isRtl?rule.nameAr:rule.nameEn}</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{rule.runs} {isRtl?"تشغيل":"runs"}</span>
                          <Button size="sm" variant={rule.status==="active"?"default":"outline"} className={cn("h-7 text-xs",rule.status==="active"?"bg-emerald-600 hover:bg-emerald-700":"")} onClick={()=>toggleRule(rule.id)}>
                            {rule.status==="active"?(isRtl?"إيقاف":"Pause"):(isRtl?"تفعيل":"Activate")}
                          </Button>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="font-medium text-foreground">{isRtl?"المشغّل:":"Trigger:"}</span>{rule.trigger}</div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="font-medium text-foreground">{isRtl?"الإجراء:":"Action:"}</span>{rule.action}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
