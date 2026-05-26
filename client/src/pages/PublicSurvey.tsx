import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { Star, CheckCircle2, AlertCircle, Loader2, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface PublicQuestion {
  id: string;
  labelAr: string;
  labelEn: string;
  type?: "rating" | "text" | "recommendation";
}

interface PublicSurveyData {
  id: number;
  customerName: string;
  message: string | null;
  questions: PublicQuestion[];
  status: string;
  alreadyResponded: boolean;
  existing: any;
}

function detectType(q: PublicQuestion): "rating" | "text" | "recommendation" {
  if (q.type) return q.type;
  const id = q.id.toLowerCase();
  if (id === "feedback" || id.includes("comment") || id.includes("note")) return "text";
  if (id === "recommendation" || id.includes("recommend")) return "recommendation";
  return "rating";
}

export default function PublicSurvey() {
  const [, params] = useRoute<{ token: string }>("/survey/:token");
  const token = params?.token || "";
  const [isRtl, setIsRtl] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PublicSurveyData | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [feedback, setFeedback] = useState("");
  const [recommendation, setRecommendation] = useState<"yes" | "maybe" | "no" | "">("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    document.documentElement.dir = isRtl ? "rtl" : "ltr";
  }, [isRtl]);

  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        const res = await fetch(`/api/public/survey/${encodeURIComponent(token)}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          if (!abort) setError(body.error || (res.status === 404 ? "Survey not found" : "Failed to load survey"));
          return;
        }
        const json = await res.json();
        if (!abort) {
          setData(json);
          if (json.alreadyResponded) setSubmitted(true);
        }
      } catch (e: any) {
        if (!abort) setError(e.message || "Network error");
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => { abort = true; };
  }, [token]);

  function setRating(qid: string, value: number) {
    setAnswers(prev => ({ ...prev, [qid]: value }));
  }
  function setText(qid: string, value: string) {
    setAnswers(prev => ({ ...prev, [qid]: value }));
  }

  async function handleSubmit() {
    if (!data) return;
    setSubmitting(true);
    setError(null);
    try {
      const overallQ = data.questions.find(q => q.id === "overall" || detectType(q) === "rating");
      const rating = overallQ ? Number(answers[overallQ.id] || 0) || null : null;
      const res = await fetch(`/api/public/survey/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers,
          rating,
          feedback: feedback || (answers["feedback"] as string) || null,
          recommendation: recommendation || (answers["recommendation"] as string) || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Submission failed");
      }
      setSubmitted(true);
    } catch (e: any) {
      setError(e.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl border border-red-200 dark:border-red-900/40 p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h1 className="text-xl font-bold mb-2">{isRtl ? "تعذّر تحميل الاستطلاع" : "Cannot load survey"}</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 p-8 text-center">
          <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-3" />
          <h1 className="text-2xl font-bold mb-2">{isRtl ? "شكراً لك!" : "Thank you!"}</h1>
          <p className="text-sm text-muted-foreground">
            {isRtl ? "تم استلام تقييمك بنجاح. آراؤك تساعدنا على التحسين المستمر." : "Your feedback has been received successfully. Your input helps us improve."}
          </p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4" dir={isRtl ? "rtl" : "ltr"}>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">Scapex</h2>
              <p className="text-[11px] text-muted-foreground">{isRtl ? "تقييم الخدمة" : "Service Survey"}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsRtl(v => !v)} data-testid="button-toggle-lang">
            {isRtl ? "English" : "العربية"}
          </Button>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-border p-6 sm:p-8 space-y-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">
              {isRtl ? `مرحباً ${data.customerName}` : `Hello ${data.customerName}`}
            </h1>
            {data.message && (
              <p className="text-sm text-muted-foreground mt-2 whitespace-pre-line leading-relaxed">{data.message}</p>
            )}
          </div>

          <div className="space-y-5">
            {data.questions.map((q, idx) => {
              const type = detectType(q);
              const label = isRtl ? q.labelAr : q.labelEn;
              if (type === "text") {
                return (
                  <div key={q.id} className="space-y-2">
                    <Label className="text-sm font-medium">{idx + 1}. {label}</Label>
                    <Textarea
                      value={(answers[q.id] as string) || feedback}
                      onChange={(e) => { setText(q.id, e.target.value); setFeedback(e.target.value); }}
                      placeholder={isRtl ? "اكتب ملاحظاتك هنا..." : "Write your comments here..."}
                      className="min-h-[90px] resize-none"
                      data-testid={`textarea-${q.id}`}
                    />
                  </div>
                );
              }
              if (type === "recommendation") {
                return (
                  <div key={q.id} className="space-y-2">
                    <Label className="text-sm font-medium">{idx + 1}. {label}</Label>
                    <div className="flex gap-2">
                      {(["yes", "maybe", "no"] as const).map(v => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => { setText(q.id, v); setRecommendation(v); }}
                          className={cn(
                            "flex-1 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-colors",
                            (recommendation === v || answers[q.id] === v)
                              ? v === "yes" ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40"
                              : v === "maybe" ? "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/40"
                              : "border-red-500 bg-red-50 text-red-700 dark:bg-red-950/40"
                              : "border-border hover:border-muted-foreground/40"
                          )}
                          data-testid={`button-rec-${v}`}
                        >
                          {v === "yes" ? (isRtl ? "نعم" : "Yes") : v === "maybe" ? (isRtl ? "ربما" : "Maybe") : (isRtl ? "لا" : "No")}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              }
              const current = Number(answers[q.id] || 0);
              return (
                <div key={q.id} className="space-y-2">
                  <Label className="text-sm font-medium">{idx + 1}. {label}</Label>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setRating(q.id, v)}
                        className="p-1 hover:scale-110 transition-transform"
                        data-testid={`star-${q.id}-${v}`}
                        aria-label={`${v}/5`}
                      >
                        <Star className={cn("w-7 h-7", v <= current ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
                      </button>
                    ))}
                    {current > 0 && <span className="ml-2 text-sm text-muted-foreground">{current}/5</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 rounded-lg p-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}

          <div className="flex justify-end pt-2 border-t">
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              size="lg"
              className="bg-orange-600 hover:bg-orange-700 text-white gap-2 min-w-[160px]"
              data-testid="button-submit-survey"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isRtl ? "إرسال التقييم" : "Submit Feedback"}
            </Button>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Scapex · {isRtl ? "منصة إدارة الأعمال الذكية" : "Smart Business Management"}
        </p>
      </div>
    </div>
  );
}
