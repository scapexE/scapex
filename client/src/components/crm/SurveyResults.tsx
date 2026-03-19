import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Star, ClipboardCheck, MessageSquare, Mail, Clock,
  CheckCircle2, AlertCircle, TrendingUp, ThumbsUp, Send,
} from "lucide-react";
import {
  getSurveysByCustomer, getSurveyStats, simulateResponse,
  type Survey,
} from "@/lib/surveys";
import { SurveyAction } from "./actions/SurveyAction";

interface SurveyResultsProps {
  customerId: string;
  customerName: string;
  email: string;
  phone: string;
}

export function SurveyResults({ customerId, customerName, email, phone }: SurveyResultsProps) {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setSurveys(getSurveysByCustomer(customerId));
  }, [customerId, refreshKey]);

  useEffect(() => {
    const handler = () => setRefreshKey(k => k + 1);
    window.addEventListener("scapex_surveys_update", handler);
    return () => window.removeEventListener("scapex_surveys_update", handler);
  }, []);

  const stats = getSurveyStats(customerId);

  const handleSimulateResponse = (surveyId: string) => {
    simulateResponse(surveyId);
    setRefreshKey(k => k + 1);
  };

  const renderStars = (rating: number, size = "w-3.5 h-3.5") => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
          <Star
            key={i}
            className={cn(
              size,
              i <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
            )}
          />
        ))}
      </div>
    );
  };

  const ratingBar = (label: string, value: number) => (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-24 shrink-0 truncate">{label}</span>
      <Progress
        value={(value / 5) * 100}
        className={cn("h-2 flex-1", value >= 4 ? "[&>div]:bg-emerald-500" : value >= 3 ? "[&>div]:bg-amber-500" : "[&>div]:bg-red-500")}
      />
      <span className="text-xs font-medium w-8 text-end">{value}/5</span>
    </div>
  );

  if (surveys.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center mb-4">
          <ClipboardCheck className="w-8 h-8 text-orange-400" />
        </div>
        <p className="text-sm text-muted-foreground mb-1">
          {isRtl ? "لم يتم إرسال استطلاعات لهذا العميل بعد" : "No surveys sent to this customer yet"}
        </p>
        <p className="text-xs text-muted-foreground/70 mb-4">
          {isRtl ? "أرسل استطلاع رضا لمعرفة رأي العميل" : "Send a satisfaction survey to get customer feedback"}
        </p>
        <SurveyAction
          customerId={customerId}
          customerName={customerName}
          email={email}
          phone={phone}
          onSurveySent={() => setRefreshKey(k => k + 1)}
          trigger={
            <Button size="sm" className="gap-1.5 bg-orange-600 hover:bg-orange-700" data-testid="button-send-first-survey">
              <Send className="w-3.5 h-3.5" />
              {isRtl ? "إرسال استطلاع" : "Send Survey"}
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="px-6 pb-6 space-y-5">
        {stats.responded > 0 && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-200/50 dark:border-orange-800/30">
                <div className="text-2xl font-bold text-orange-600">{stats.avgRating}</div>
                <div className="mt-1">{renderStars(Math.round(stats.avgRating), "w-3 h-3")}</div>
                <p className="text-[10px] text-muted-foreground mt-1">{isRtl ? "التقييم العام" : "Avg Rating"}</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/30">
                <div className="text-2xl font-bold text-emerald-600">{stats.responseRate}%</div>
                <p className="text-[10px] text-muted-foreground mt-1">{isRtl ? "معدل الاستجابة" : "Response Rate"}</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/30">
                <div className="text-2xl font-bold text-blue-600">{stats.recommendRate}%</div>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <ThumbsUp className="w-3 h-3 text-blue-500" />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{isRtl ? "نسبة التوصية" : "Recommend"}</p>
              </div>
            </div>

            <div className="bg-secondary/40 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <TrendingUp className="w-4 h-4 text-primary" />
                {isRtl ? "تفاصيل التقييم" : "Rating Breakdown"}
              </div>
              {ratingBar(isRtl ? "جودة الخدمة" : "Service Quality", stats.avgService)}
              {ratingBar(isRtl ? "التواصل" : "Communication", stats.avgComm)}
              {ratingBar(isRtl ? "المواعيد" : "Timeliness", stats.avgTime)}
              {ratingBar(isRtl ? "القيمة / السعر" : "Value / Price", stats.avgValue)}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-muted-foreground" />
            {isRtl ? "سجل الاستطلاعات" : "Survey History"} ({surveys.length})
          </h4>
          <SurveyAction
            customerId={customerId}
            customerName={customerName}
            email={email}
            phone={phone}
            onSurveySent={() => setRefreshKey(k => k + 1)}
            trigger={
              <Button size="sm" variant="outline" className="h-7 gap-1 text-xs border-orange-200 text-orange-700 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-400 dark:hover:bg-orange-950" data-testid="button-send-another-survey">
                <Send className="w-3 h-3" />
                {isRtl ? "إرسال استطلاع جديد" : "Send New Survey"}
              </Button>
            }
          />
        </div>

        <div className="space-y-3">
          {surveys.map(survey => (
            <div
              key={survey.id}
              className={cn(
                "border rounded-xl p-4 bg-card transition-colors",
                survey.status === "responded" ? "border-emerald-200/50 dark:border-emerald-800/30" :
                survey.status === "sent" ? "border-orange-200/50 dark:border-orange-800/30" :
                "border-border/50"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  {survey.sentVia === "email" ? (
                    <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Mail className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium">
                      {isRtl
                        ? `عبر ${survey.sentVia === "email" ? "البريد" : "واتساب"}`
                        : `Via ${survey.sentVia === "email" ? "Email" : "WhatsApp"}`}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {new Date(survey.sentAt).toLocaleDateString(isRtl ? "ar-SA" : "en-SA", { year: "numeric", month: "short", day: "numeric" })}
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs border-transparent shrink-0",
                    survey.status === "responded" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                    survey.status === "sent" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                    "bg-slate-100 text-slate-600"
                  )}
                >
                  {survey.status === "responded"
                    ? (isRtl ? "تم الرد" : "Responded")
                    : survey.status === "sent"
                    ? (isRtl ? "بانتظار الرد" : "Pending")
                    : (isRtl ? "منتهي" : "Expired")}
                </Badge>
              </div>

              {survey.status === "responded" && (
                <div className="mt-3 pt-3 border-t border-border/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{isRtl ? "التقييم العام:" : "Overall Rating:"}</span>
                    <div className="flex items-center gap-2">
                      {renderStars(survey.rating || 0)}
                      <span className="text-sm font-bold">{survey.rating}/5</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center justify-between bg-secondary/40 rounded-lg px-2.5 py-1.5">
                      <span className="text-muted-foreground">{isRtl ? "جودة الخدمة" : "Service"}</span>
                      <span className="font-medium">{survey.serviceQuality}/5</span>
                    </div>
                    <div className="flex items-center justify-between bg-secondary/40 rounded-lg px-2.5 py-1.5">
                      <span className="text-muted-foreground">{isRtl ? "التواصل" : "Communication"}</span>
                      <span className="font-medium">{survey.communication}/5</span>
                    </div>
                    <div className="flex items-center justify-between bg-secondary/40 rounded-lg px-2.5 py-1.5">
                      <span className="text-muted-foreground">{isRtl ? "المواعيد" : "Timeliness"}</span>
                      <span className="font-medium">{survey.timeliness}/5</span>
                    </div>
                    <div className="flex items-center justify-between bg-secondary/40 rounded-lg px-2.5 py-1.5">
                      <span className="text-muted-foreground">{isRtl ? "القيمة / السعر" : "Value"}</span>
                      <span className="font-medium">{survey.valueForMoney}/5</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{isRtl ? "التوصية:" : "Recommend:"}</span>
                    <Badge variant="outline" className={cn("text-xs",
                      survey.recommendation === "yes" ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20" :
                      survey.recommendation === "maybe" ? "border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-900/20" :
                      "border-red-200 bg-red-50 text-red-700 dark:bg-red-900/20"
                    )}>
                      {survey.recommendation === "yes" ? (isRtl ? "نعم ✓" : "Yes ✓") :
                       survey.recommendation === "maybe" ? (isRtl ? "ربما" : "Maybe") :
                       (isRtl ? "لا" : "No")}
                    </Badge>
                  </div>

                  {(survey.feedback || survey.feedbackEn) && (
                    <div className="bg-secondary/40 rounded-xl p-3">
                      <p className="text-xs text-muted-foreground mb-1 font-medium">{isRtl ? "تعليق العميل:" : "Customer Feedback:"}</p>
                      <p className="text-sm leading-relaxed" dir={isRtl ? "rtl" : "ltr"}>"{isRtl ? survey.feedback : (survey.feedbackEn || survey.feedback)}"</p>
                      {survey.respondedAt && (
                        <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          {isRtl ? "تم الرد في" : "Responded on"}{" "}
                          {new Date(survey.respondedAt).toLocaleDateString(isRtl ? "ar-SA" : "en-SA", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {survey.status === "sent" && (
                <div className="mt-3 pt-3 border-t border-border/40">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-orange-500" />
                      {isRtl ? "لم يتم الرد بعد" : "No response yet"}
                    </span>
                    <Button
                      size="sm" variant="ghost"
                      className="h-7 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                      onClick={() => handleSimulateResponse(survey.id)}
                      data-testid={`button-simulate-response-${survey.id}`}
                    >
                      {isRtl ? "محاكاة الرد" : "Simulate Response"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}
