import { useState } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Building2, ShieldAlert, Leaf, Hammer, Bot, 
  Wand2, FileText, CheckCircle2, Calculator, ArrowRight, Save
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const SERVICE_TYPES = [
  { id: 'eng_consulting', icon: Building2, titleEn: 'Engineering Consulting', titleAr: 'الاستشارات الهندسية', color: 'bg-blue-500' },
  { id: 'environmental', icon: Leaf, titleEn: 'Environmental Services', titleAr: 'الخدمات البيئية', color: 'bg-emerald-500' },
  { id: 'safety', icon: ShieldAlert, titleEn: 'Safety & HSE', titleAr: 'أنظمة السلامة والصحة المهنية', color: 'bg-amber-500' },
  { id: 'contracting', icon: Hammer, titleEn: 'Contracting & Execution', titleAr: 'المقاولات والتنفيذ', color: 'bg-purple-500' },
];

export function ProposalGenerator() {
  const { t, dir } = useLanguage();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Form State
  const [clientName, setClientName] = useState("");
  const [projectDesc, setProjectDesc] = useState("");

  const handleGenerate = () => {
    if (!clientName || !projectDesc) {
      toast({
        title: dir === 'rtl' ? "بيانات مفقودة" : "Missing Information",
        description: dir === 'rtl' ? "يرجى إدخال اسم العميل ووصف المشروع." : "Please enter client name and project description.",
        variant: "destructive"
      });
      return;
    }
    
    setIsGenerating(true);
    // Simulate AI generation delay
    setTimeout(() => {
      setIsGenerating(false);
      setStep(3);
      toast({
        title: dir === 'rtl' ? "تم توليد المقترح بنجاح!" : "Proposal Generated!",
        description: dir === 'rtl' ? "قام الذكاء الاصطناعي بتحليل طلبك واقتراح التفاصيل." : "AI successfully analyzed your request and suggested details.",
      });
    }, 2500);
  };

  const handleSave = () => {
    toast({
      title: dir === 'rtl' ? "تم حفظ المقترح" : "Proposal Saved",
      description: dir === 'rtl' ? "تم حفظ المقترح ويمكن تحويله إلى عقد أو فاتورة." : "Proposal saved and can be converted to contract or invoice.",
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Left Column: Form & Controls */}
      <div className="lg:col-span-1 space-y-6">
        <Card className="border-primary/20 shadow-md">
          <CardHeader className="bg-primary/5 border-b border-primary/10 pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              {dir === 'rtl' ? "مساعد توليد المقترحات (AI)" : "AI Proposal Assistant"}
            </CardTitle>
            <CardDescription>
              {dir === 'rtl' ? "خطوة 1 من 3: اختيار الخدمة وإدخال المتطلبات" : "Step 1 of 3: Select service and input requirements"}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            
            {/* Service Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">{dir === 'rtl' ? "نوع الخدمة" : "Service Type"}</Label>
              <div className="grid grid-cols-2 gap-3">
                {SERVICE_TYPES.map((service) => {
                  const Icon = service.icon;
                  const isSelected = selectedService === service.id;
                  return (
                    <div 
                      key={service.id}
                      onClick={() => setSelectedService(service.id)}
                      className={cn(
                        "flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all gap-2 text-center",
                        isSelected 
                          ? "border-primary bg-primary/5 shadow-sm" 
                          : "border-border/50 hover:border-primary/30 hover:bg-secondary/50"
                      )}
                    >
                      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white", service.color)}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-medium">
                        {dir === 'rtl' ? service.titleAr : service.titleEn}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Client & Project Details */}
            <div className="space-y-4 pt-2 border-t border-border/50">
              <div className="space-y-2">
                <Label>{dir === 'rtl' ? "اسم العميل / الجهة" : "Client / Entity Name"}</Label>
                <Input 
                  placeholder={dir === 'rtl' ? "مثال: شركة نيوم، أمانة الرياض..." : "e.g. NEOM, Riyadh Municipality..."}
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="bg-secondary/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center justify-between">
                  <span>{dir === 'rtl' ? "متطلبات المشروع المختصرة" : "Brief Project Requirements"}</span>
                  <Badge variant="outline" className="text-[10px] text-primary bg-primary/5">
                    <Wand2 className="w-3 h-3 mr-1 rtl:ml-1 rtl:mr-0" />
                    AI Ready
                  </Badge>
                </Label>
                <Textarea 
                  placeholder={dir === 'rtl' ? "صف متطلبات المشروع، المساحة، نوع العمل المطلوب..." : "Describe project requirements, area, scope of work..."}
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
                  className="min-h-[120px] bg-secondary/30 resize-none"
                />
              </div>
            </div>

          </CardContent>
          <CardFooter className="bg-secondary/20 pt-4">
            <Button 
              className="w-full font-bold shadow-sm group" 
              onClick={handleGenerate}
              disabled={!selectedService || isGenerating}
            >
              {isGenerating ? (
                <>
                  <Bot className="w-5 h-5 mr-2 rtl:ml-2 rtl:mr-0 animate-bounce" />
                  {dir === 'rtl' ? "جاري التحليل والتوليد..." : "Analyzing & Generating..."}
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5 mr-2 rtl:ml-2 rtl:mr-0 text-amber-300" />
                  {dir === 'rtl' ? "توليد المقترح بالذكاء الاصطناعي" : "Generate Smart Proposal"}
                  <ArrowRight className="w-4 h-4 ml-auto rtl:mr-auto rtl:ml-0 opacity-50 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Right Column: AI Output Preview */}
      <div className="lg:col-span-2">
        {step === 1 ? (
          /* Empty State */
          <Card className="h-full min-h-[600px] border-dashed border-2 border-border/50 bg-transparent flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
            <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center mb-6">
              <FileText className="w-12 h-12 opacity-20" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {dir === 'rtl' ? "جاهز لتوليد المقترح الفني والمالي" : "Ready to Generate Technical & Financial Proposal"}
            </h3>
            <p className="max-w-md text-sm">
              {dir === 'rtl' 
                ? "قم بتعبئة البيانات في القائمة الجانبية، وسيقوم نظام SCAPE AI بتحليل المتطلبات، اقتراح بنود العمل (Scope of Work)، وتقدير التكلفة بناءً على بيانات المشاريع السابقة المشابهة." 
                : "Fill in the details on the side panel, and SCAPE AI will analyze requirements, suggest the Scope of Work, and estimate costs based on historical similar projects data."}
            </p>
          </Card>
        ) : (
          /* Generated Proposal Preview */
          <Card className="h-full min-h-[600px] shadow-lg border-primary/20 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-500">
            <CardHeader className="border-b border-border/50 bg-card">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="bg-emerald-500 hover:bg-emerald-600">{dir === 'rtl' ? "مسودة مقترح" : "Draft Proposal"}</Badge>
                    <Badge variant="outline" className="text-primary border-primary/30 bg-primary/5">
                      <Bot className="w-3 h-3 mr-1 rtl:ml-1 rtl:mr-0" />
                      AI Generated
                    </Badge>
                  </div>
                  <CardTitle className="text-2xl mt-2">{clientName || (dir === 'rtl' ? "عميل غير محدد" : "Unnamed Client")}</CardTitle>
                  <CardDescription className="mt-1">
                    {dir === 'rtl' ? "عرض فني ومالي لـ: " : "Technical & Commercial Proposal for: "} 
                    {selectedService ? SERVICE_TYPES.find(s => s.id === selectedService)?.[dir === 'rtl' ? 'titleAr' : 'titleEn'] : ""}
                  </CardDescription>
                </div>
                <div className="text-right rtl:text-left">
                  <div className="text-sm text-muted-foreground mb-1">{dir === 'rtl' ? "التكلفة التقديرية (AI)" : "AI Estimated Cost"}</div>
                  <div className="text-3xl font-bold text-primary font-mono" dir="ltr">SAR 145,000</div>
                  <div className="text-xs text-emerald-600 font-medium flex items-center justify-end rtl:justify-start mt-1 gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {dir === 'rtl' ? "هامش ربح متوقع: 32%" : "Exp. Margin: 32%"}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
              <ScrollArea className="h-full px-6 py-6">
                
                {/* AI Suggested Scope */}
                <div className="mb-8">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-b pb-2">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                    {dir === 'rtl' ? "نطاق العمل المقترح (Scope of Work)" : "Proposed Scope of Work"}
                  </h3>
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg border border-border/50 bg-secondary/10">
                      <p className="text-sm leading-relaxed text-foreground/80">
                        {dir === 'rtl' 
                          ? `بناءً على طلبكم بخصوص (${projectDesc || 'المشروع المذكور'})، نقترح تقديم الخدمات التالية لتغطية جميع المتطلبات الفنية والنظامية المطلوبة من الجهات الحكومية...`
                          : `Based on your request regarding (${projectDesc || 'the mentioned project'}), we propose providing the following services to cover all technical and regulatory requirements...`}
                      </p>
                    </div>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                        <span>{dir === 'rtl' ? "إعداد المخططات المعمارية والإنشائية التفصيلية (Phase 1)." : "Preparation of detailed architectural and structural drawings (Phase 1)."}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                        <span>{dir === 'rtl' ? "تنسيق واعتماد المخططات من الأمانة والدفاع المدني." : "Coordination and approval of drawings from Municipality and Civil Defense."}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                        <span>{dir === 'rtl' ? "الإشراف الهندسي الدوري على الموقع (بمعدل 3 زيارات أسبوعياً)." : "Periodic engineering site supervision (avg 3 visits/week)."}</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* AI Pricing Breakdown */}
                <div className="mb-8">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-b pb-2">
                    <Calculator className="w-5 h-5 text-muted-foreground" />
                    {dir === 'rtl' ? "الجدول المالي المقترح" : "Suggested Financial Breakdown"}
                  </h3>
                  <div className="rounded-lg border border-border/50 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-secondary/50 text-muted-foreground">
                        <tr>
                          <th className="px-4 py-2 text-start rtl:text-right font-medium">{dir === 'rtl' ? "البند" : "Item"}</th>
                          <th className="px-4 py-2 text-center font-medium">{dir === 'rtl' ? "الكمية" : "Qty"}</th>
                          <th className="px-4 py-2 text-end rtl:text-left font-medium">{dir === 'rtl' ? "الإجمالي (ر.س)" : "Total (SAR)"}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        <tr>
                          <td className="px-4 py-3">{dir === 'rtl' ? "التصميم وإعداد المخططات (Phase 1)" : "Design & Drawings Preparation"}</td>
                          <td className="px-4 py-3 text-center">1</td>
                          <td className="px-4 py-3 text-end rtl:text-left font-mono">45,000</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3">{dir === 'rtl' ? "استخراج التراخيص والموافقات الحكومية" : "Permits & Govt Approvals"}</td>
                          <td className="px-4 py-3 text-center">1</td>
                          <td className="px-4 py-3 text-end rtl:text-left font-mono">25,000</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3">{dir === 'rtl' ? "الإشراف الهندسي (عقد سنوي)" : "Engineering Supervision (Annual)"}</td>
                          <td className="px-4 py-3 text-center">12</td>
                          <td className="px-4 py-3 text-end rtl:text-left font-mono">75,000</td>
                        </tr>
                      </tbody>
                      <tfoot className="bg-secondary/20 font-bold border-t-2 border-border">
                        <tr>
                          <td colSpan={2} className="px-4 py-3 text-end rtl:text-left">{dir === 'rtl' ? "الإجمالي قبل الضريبة:" : "Subtotal:"}</td>
                          <td className="px-4 py-3 text-end rtl:text-left font-mono text-primary">145,000</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground p-3 bg-secondary/20 rounded-md">
                    <Bot className="w-4 h-4 text-primary shrink-0" />
                    {dir === 'rtl' 
                      ? "تم تسعير هذه البنود بناءً على تحليل 14 مشروعاً مشابهاً تم تنفيذها خلال الـ 12 شهراً الماضية."
                      : "These items were priced based on an analysis of 14 similar projects executed in the last 12 months."}
                  </div>
                </div>

              </ScrollArea>
            </CardContent>
            <CardFooter className="bg-secondary/10 border-t border-border/50 py-4 px-6 flex justify-between shrink-0">
              <Button variant="outline">
                {dir === 'rtl' ? "تعديل المسودة يدويًا" : "Edit Draft Manually"}
              </Button>
              <div className="flex gap-2">
                <Button variant="secondary" className="gap-2 bg-white dark:bg-slate-800">
                  <FileText className="w-4 h-4" />
                  {dir === 'rtl' ? "تحميل كـ PDF" : "Download PDF"}
                </Button>
                <Button className="bg-primary hover:bg-primary/90 gap-2" onClick={handleSave}>
                  <Save className="w-4 h-4" />
                  {dir === 'rtl' ? "حفظ واعتماد" : "Save & Approve"}
                </Button>
              </div>
            </CardFooter>
          </Card>
        )}
      </div>

    </div>
  );
}
