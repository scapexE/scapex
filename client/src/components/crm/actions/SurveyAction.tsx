import { useState } from "react";
import { useLanguage } from "../../../contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ClipboardCheck, Mail, MessageSquare, Send, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { addSurvey, simulateResponse, type Survey } from "@/lib/surveys";
import { logAction } from "@/lib/auditLog";

interface SurveyActionProps {
  customerId?: string;
  customerName?: string;
  email?: string;
  phone?: string;
  selectedCount?: number;
  isBulk?: boolean;
  selectedCustomers?: { id: string; name: string; email: string; phone: string }[];
  trigger?: React.ReactNode;
  onSurveySent?: (survey: Survey) => void;
}

export function SurveyAction({
  customerId, customerName, email, phone,
  selectedCount, isBulk, selectedCustomers,
  trigger, onSurveySent,
}: SurveyActionProps) {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<"email" | "whatsapp">("email");
  const [customMessage, setCustomMessage] = useState("");
  const [sending, setSending] = useState(false);

  const defaultMessageAr = "عزيزي العميل،\n\nنقدر تعاملكم معنا ونود الاستماع لرأيكم حول جودة خدماتنا.\n\nيرجى تقييم تجربتكم معنا من خلال الرابط التالي:\n\n🔗 [رابط الاستطلاع]\n\nشكراً لوقتكم،\nفريق سكابكس";
  const defaultMessageEn = "Dear Customer,\n\nWe value your partnership and would like to hear your feedback about our services.\n\nPlease rate your experience through the following link:\n\n🔗 [Survey Link]\n\nThank you for your time,\nScapex Team";

  const handleSend = () => {
    if (isBulk && (!selectedCustomers || selectedCustomers.length === 0)) return;
    if (!isBulk && (!customerId || !customerName)) return;
    setSending(true);

    setTimeout(() => {
      if (isBulk && selectedCustomers) {
        selectedCustomers.forEach(c => {
          const survey = addSurvey({
            customerId: c.id,
            customerName: c.name,
            sentVia: channel,
            sentAt: new Date().toISOString(),
            status: "sent",
          });
          if (Math.random() > 0.5) {
            setTimeout(() => simulateResponse(survey.id), 1500 + Math.random() * 2000);
          }
          if (onSurveySent) onSurveySent(survey);
        });
      } else if (customerId && customerName) {
        const survey = addSurvey({
          customerId,
          customerName,
          sentVia: channel,
          sentAt: new Date().toISOString(),
          status: "sent",
        });
        setTimeout(() => {
          simulateResponse(survey.id);
        }, 2000);
        if (onSurveySent) onSurveySent(survey);
      }

      logAction(
        "create",
        "crm",
        isBulk ? `Bulk survey to ${selectedCount} customers via ${channel}` : `Survey to ${customerName} via ${channel}`,
        isBulk ? `إرسال استطلاع جماعي إلى ${selectedCount} عميل عبر ${channel === "email" ? "البريد" : "واتساب"}` : `إرسال استطلاع إلى ${customerName} عبر ${channel === "email" ? "البريد" : "واتساب"}`
      );

      toast({
        title: isRtl ? "تم إرسال الاستطلاع" : "Survey Sent",
        description: isRtl
          ? (isBulk ? `تم إرسال استطلاع رضا العملاء إلى ${selectedCount} عميل عبر ${channel === "email" ? "البريد الإلكتروني" : "واتساب"}` : `تم إرسال استطلاع رضا العملاء إلى ${customerName} عبر ${channel === "email" ? "البريد الإلكتروني" : "واتساب"}`)
          : (isBulk ? `Satisfaction survey sent to ${selectedCount} customers via ${channel}` : `Satisfaction survey sent to ${customerName} via ${channel}`),
      });

      setSending(false);
      setOpen(false);
      setCustomMessage("");
    }, 800);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <ClipboardCheck className="w-4 h-4 text-orange-500" />
            {isRtl ? "استطلاع" : "Survey"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className={cn("flex items-center gap-2", isRtl ? "text-right" : "text-left")}>
            <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <ClipboardCheck className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </div>
            {isRtl
              ? (isBulk ? "إرسال استطلاع رضا جماعي" : "إرسال استطلاع رضا العملاء")
              : (isBulk ? "Send Bulk Satisfaction Survey" : "Send Satisfaction Survey")}
          </DialogTitle>
          <DialogDescription className={isRtl ? "text-right" : "text-left"}>
            {isRtl
              ? (isBulk
                ? `إرسال استطلاع رضا إلى ${selectedCount} عميل لتقييم جودة الخدمة.`
                : `إرسال استطلاع رضا إلى ${customerName} لتقييم جودة الخدمة المقدمة.`)
              : (isBulk
                ? `Send a satisfaction survey to ${selectedCount} customers to rate service quality.`
                : `Send a satisfaction survey to ${customerName} to rate your service quality.`)}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-4" dir={dir}>
          <div className="space-y-3">
            <Label className="text-sm font-semibold">{isRtl ? "طريقة الإرسال:" : "Send Via:"}</Label>
            <RadioGroup
              value={channel}
              onValueChange={(v) => setChannel(v as "email" | "whatsapp")}
              className="flex gap-3"
            >
              <label
                className={cn(
                  "flex-1 flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all",
                  channel === "email"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                    : "border-border hover:border-blue-200"
                )}
              >
                <RadioGroupItem value="email" id="ch-email" />
                <Mail className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium">{isRtl ? "بريد إلكتروني" : "Email"}</p>
                  <p className="text-xs text-muted-foreground">{isBulk ? (isRtl ? `${selectedCount} مستلم` : `${selectedCount} recipients`) : email}</p>
                </div>
              </label>
              <label
                className={cn(
                  "flex-1 flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all",
                  channel === "whatsapp"
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                    : "border-border hover:border-emerald-200"
                )}
              >
                <RadioGroupItem value="whatsapp" id="ch-wa" />
                <MessageSquare className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="text-sm font-medium">{isRtl ? "واتساب" : "WhatsApp"}</p>
                  <p className="text-xs text-muted-foreground">{isBulk ? (isRtl ? `${selectedCount} جهة اتصال` : `${selectedCount} contacts`) : phone}</p>
                </div>
              </label>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">{isRtl ? "محتوى الاستطلاع:" : "Survey Content:"}</Label>
            <div className="bg-secondary/50 border border-border/50 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Star className="w-4 h-4 text-amber-500" />
                {isRtl ? "أسئلة التقييم:" : "Rating Questions:"}
              </div>
              <ul className="text-xs text-muted-foreground space-y-1.5 list-none">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  {isRtl ? "التقييم العام للخدمة (1-5 نجوم)" : "Overall Service Rating (1-5 stars)"}
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  {isRtl ? "جودة الخدمة المقدمة" : "Service Quality"}
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  {isRtl ? "مستوى التواصل" : "Communication Level"}
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  {isRtl ? "الالتزام بالمواعيد" : "Timeliness"}
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  {isRtl ? "القيمة مقابل السعر" : "Value for Money"}
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  {isRtl ? "هل توصي بالتعامل معنا؟" : "Would you recommend us?"}
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  {isRtl ? "ملاحظات وتعليقات إضافية" : "Additional Comments & Feedback"}
                </li>
              </ul>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">{isRtl ? "رسالة مخصصة (اختياري):" : "Custom Message (optional):"}</Label>
            <Textarea
              placeholder={isRtl ? defaultMessageAr : defaultMessageEn}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="min-h-[100px] resize-none text-sm"
            />
            <div className="flex flex-wrap gap-2 mt-1">
              <Button variant="secondary" size="sm" className="text-xs h-7" onClick={() => setCustomMessage(isRtl ? defaultMessageAr : defaultMessageEn)}>
                {isRtl ? "نموذج افتراضي" : "Default Template"}
              </Button>
              <Button variant="secondary" size="sm" className="text-xs h-7" onClick={() => setCustomMessage(isRtl
                ? "عزيزي العميل،\n\nبعد إتمام المشروع، نود معرفة رأيكم في أدائنا وجودة العمل المقدم.\n\nتقييمكم يساعدنا على التطوير والتحسين المستمر.\n\nشكراً لثقتكم،\nفريق سكابكس"
                : "Dear Customer,\n\nAfter completing the project, we would like to know your opinion about our performance and work quality.\n\nYour feedback helps us continuously improve.\n\nThank you for your trust,\nScapex Team"
              )}>
                {isRtl ? "نموذج ما بعد المشروع" : "Post-Project Template"}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className={cn(isRtl ? "sm:justify-start" : "")}>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {isRtl ? "إلغاء" : "Cancel"}
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending}
            className="bg-orange-600 hover:bg-orange-700 text-white"
            data-testid="button-send-survey"
          >
            {sending ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {isRtl ? "جارٍ الإرسال..." : "Sending..."}
              </span>
            ) : (
              <>
                <Send className={cn("w-4 h-4", isRtl ? "ml-2" : "mr-2")} />
                {isRtl ? "إرسال الاستطلاع" : "Send Survey"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
