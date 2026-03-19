import { useState, useEffect } from "react";
import { useLanguage } from "../../../contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { ClipboardCheck, Mail, MessageSquare, Send, Star, Pencil, Check, Plus, Trash2, X, GripVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { addSurvey, simulateResponse, type Survey } from "@/lib/surveys";
import { logAction } from "@/lib/auditLog";

interface SurveyQuestion {
  id: string;
  labelAr: string;
  labelEn: string;
  isCustom?: boolean;
}

const DEFAULT_QUESTIONS: SurveyQuestion[] = [
  { id: "overall", labelAr: "التقييم العام للخدمة (1-5 نجوم)", labelEn: "Overall Service Rating (1-5 stars)" },
  { id: "serviceQuality", labelAr: "جودة الخدمة المقدمة", labelEn: "Service Quality" },
  { id: "communication", labelAr: "مستوى التواصل والاستجابة", labelEn: "Communication & Responsiveness" },
  { id: "timeliness", labelAr: "الالتزام بالمواعيد والجدول الزمني", labelEn: "Timeliness & Schedule Adherence" },
  { id: "valueForMoney", labelAr: "القيمة مقابل السعر", labelEn: "Value for Money" },
  { id: "recommendation", labelAr: "هل توصي بالتعامل معنا؟", labelEn: "Would you recommend us?" },
  { id: "feedback", labelAr: "ملاحظات وتعليقات إضافية (نص حر)", labelEn: "Additional Comments & Feedback (free text)" },
];

const QUESTIONS_STORAGE_KEY = "scapex_survey_questions";

function loadQuestions(): SurveyQuestion[] {
  try {
    const saved = localStorage.getItem(QUESTIONS_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return DEFAULT_QUESTIONS;
}

function saveQuestions(questions: SurveyQuestion[]): void {
  localStorage.setItem(QUESTIONS_STORAGE_KEY, JSON.stringify(questions));
}

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
  const [questions, setQuestions] = useState<SurveyQuestion[]>(loadQuestions());
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [editingMessage, setEditingMessage] = useState(false);
  const [sending, setSending] = useState(false);

  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editAr, setEditAr] = useState("");
  const [editEn, setEditEn] = useState("");

  const [addingNew, setAddingNew] = useState(false);
  const [newAr, setNewAr] = useState("");
  const [newEn, setNewEn] = useState("");

  const getDefaultMessage = () => {
    if (isRtl) {
      return "عزيزي العميل،\n\nنقدر تعاملكم معنا ونود الاستماع لرأيكم حول جودة خدماتنا.\n\nيرجى تقييم تجربتكم معنا من خلال الرابط التالي.\n\nشكراً لوقتكم،\nفريق سكابكس";
    }
    return "Dear Customer,\n\nWe value your partnership and would like to hear your feedback about our services.\n\nPlease rate your experience through the following link.\n\nThank you for your time,\nScapex Team";
  };

  const getPostProjectMessage = () => {
    if (isRtl) {
      return "عزيزي العميل،\n\nبعد إتمام المشروع، نود معرفة رأيكم في أدائنا وجودة العمل المقدم.\n\nتقييمكم يساعدنا على التطوير والتحسين المستمر.\n\nشكراً لثقتكم،\nفريق سكابكس";
    }
    return "Dear Customer,\n\nAfter completing the project, we would like to know your opinion about our performance and work quality.\n\nYour feedback helps us continuously improve.\n\nThank you for your trust,\nScapex Team";
  };

  useEffect(() => {
    if (open) {
      const loaded = loadQuestions();
      setQuestions(loaded);
      setSelectedQuestions(loaded.map(q => q.id));
      setMessage(getDefaultMessage());
      setEditingMessage(false);
      setEditingQuestionId(null);
      setAddingNew(false);
    }
  }, [open, isRtl]);

  const updateAndSave = (updated: SurveyQuestion[]) => {
    setQuestions(updated);
    saveQuestions(updated);
  };

  const toggleQuestion = (id: string) => {
    setSelectedQuestions(prev =>
      prev.includes(id) ? prev.filter(q => q !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedQuestions(questions.map(q => q.id));
  const deselectAll = () => setSelectedQuestions([]);

  const startEditing = (q: SurveyQuestion) => {
    setEditingQuestionId(q.id);
    setEditAr(q.labelAr);
    setEditEn(q.labelEn);
    setAddingNew(false);
  };

  const saveEdit = () => {
    if (!editingQuestionId || (!editAr.trim() && !editEn.trim())) return;
    const updated = questions.map(q =>
      q.id === editingQuestionId ? { ...q, labelAr: editAr.trim() || q.labelAr, labelEn: editEn.trim() || q.labelEn } : q
    );
    updateAndSave(updated);
    setEditingQuestionId(null);
    toast({ title: isRtl ? "تم تعديل السؤال" : "Question Updated" });
  };

  const cancelEdit = () => {
    setEditingQuestionId(null);
  };

  const deleteQuestion = (id: string) => {
    const updated = questions.filter(q => q.id !== id);
    updateAndSave(updated);
    setSelectedQuestions(prev => prev.filter(q => q !== id));
    toast({ title: isRtl ? "تم حذف السؤال" : "Question Deleted" });
  };

  const startAdding = () => {
    setAddingNew(true);
    setNewAr("");
    setNewEn("");
    setEditingQuestionId(null);
  };

  const saveNewQuestion = () => {
    if (!newAr.trim() && !newEn.trim()) return;
    const newId = `custom_${Date.now()}`;
    const newQ: SurveyQuestion = {
      id: newId,
      labelAr: newAr.trim() || newEn.trim(),
      labelEn: newEn.trim() || newAr.trim(),
      isCustom: true,
    };
    const updated = [...questions, newQ];
    updateAndSave(updated);
    setSelectedQuestions(prev => [...prev, newId]);
    setAddingNew(false);
    setNewAr("");
    setNewEn("");
    toast({ title: isRtl ? "تم إضافة السؤال" : "Question Added" });
  };

  const resetToDefaults = () => {
    updateAndSave(DEFAULT_QUESTIONS);
    setSelectedQuestions(DEFAULT_QUESTIONS.map(q => q.id));
    toast({ title: isRtl ? "تم إعادة الأسئلة الافتراضية" : "Questions Reset to Defaults" });
  };

  const handleSend = () => {
    if (isBulk && (!selectedCustomers || selectedCustomers.length === 0)) return;
    if (!isBulk && (!customerId || !customerName)) return;
    if (selectedQuestions.length === 0) return;
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
        isBulk ? `Bulk survey to ${selectedCount} customers via ${channel} (${selectedQuestions.length} questions)` : `Survey to ${customerName} via ${channel} (${selectedQuestions.length} questions)`,
        isBulk ? `إرسال استطلاع جماعي إلى ${selectedCount} عميل عبر ${channel === "email" ? "البريد" : "واتساب"} (${selectedQuestions.length} أسئلة)` : `إرسال استطلاع إلى ${customerName} عبر ${channel === "email" ? "البريد" : "واتساب"} (${selectedQuestions.length} أسئلة)`
      );

      toast({
        title: isRtl ? "تم إرسال الاستطلاع" : "Survey Sent",
        description: isRtl
          ? (isBulk ? `تم إرسال استطلاع (${selectedQuestions.length} أسئلة) إلى ${selectedCount} عميل عبر ${channel === "email" ? "البريد الإلكتروني" : "واتساب"}` : `تم إرسال استطلاع (${selectedQuestions.length} أسئلة) إلى ${customerName} عبر ${channel === "email" ? "البريد الإلكتروني" : "واتساب"}`)
          : (isBulk ? `Survey (${selectedQuestions.length} questions) sent to ${selectedCount} customers via ${channel}` : `Survey (${selectedQuestions.length} questions) sent to ${customerName} via ${channel}`),
      });

      setSending(false);
      setOpen(false);
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
      <DialogContent className="sm:max-w-[580px] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
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
          {/* Channel Selection */}
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

          {/* Questions with Edit/Add/Delete */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500" />
                {isRtl ? "أسئلة الاستطلاع:" : "Survey Questions:"}
              </Label>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-muted-foreground hover:text-primary" onClick={selectAll} data-testid="button-select-all-questions">
                  {isRtl ? "تحديد الكل" : "Select All"}
                </Button>
                <span className="text-muted-foreground/40 text-xs">|</span>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-muted-foreground hover:text-primary" onClick={deselectAll} data-testid="button-deselect-all-questions">
                  {isRtl ? "إلغاء الكل" : "Deselect All"}
                </Button>
                <span className="text-muted-foreground/40 text-xs">|</span>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-muted-foreground hover:text-orange-600" onClick={resetToDefaults} data-testid="button-reset-questions">
                  {isRtl ? "افتراضي" : "Reset"}
                </Button>
              </div>
            </div>

            <div className="bg-secondary/50 border border-border/50 rounded-xl p-2 space-y-1">
              {questions.map((q) => {
                const checked = selectedQuestions.includes(q.id);
                const isEditing = editingQuestionId === q.id;

                if (isEditing) {
                  return (
                    <div key={q.id} className="p-3 rounded-lg border-2 border-orange-400 bg-orange-50/50 dark:bg-orange-950/20 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-medium text-orange-700 dark:text-orange-400">
                        <Pencil className="w-3 h-3" />
                        {isRtl ? "تعديل السؤال" : "Edit Question"}
                      </div>
                      <div className="space-y-2">
                        <div>
                          <Label className="text-[11px] text-muted-foreground mb-1 block">{isRtl ? "النص العربي:" : "Arabic Text:"}</Label>
                          <Input
                            value={editAr}
                            onChange={(e) => setEditAr(e.target.value)}
                            className="h-8 text-sm"
                            dir="rtl"
                            data-testid={`input-edit-ar-${q.id}`}
                          />
                        </div>
                        <div>
                          <Label className="text-[11px] text-muted-foreground mb-1 block">{isRtl ? "النص الإنجليزي:" : "English Text:"}</Label>
                          <Input
                            value={editEn}
                            onChange={(e) => setEditEn(e.target.value)}
                            className="h-8 text-sm"
                            dir="ltr"
                            data-testid={`input-edit-en-${q.id}`}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 justify-end">
                        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={cancelEdit}>
                          <X className="w-3 h-3" />
                          {isRtl ? "إلغاء" : "Cancel"}
                        </Button>
                        <Button size="sm" className="h-7 text-xs gap-1 bg-orange-600 hover:bg-orange-700 text-white" onClick={saveEdit} disabled={!editAr.trim() && !editEn.trim()}>
                          <Check className="w-3 h-3" />
                          {isRtl ? "حفظ" : "Save"}
                        </Button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={q.id}
                    className={cn(
                      "flex items-center gap-2 p-2.5 rounded-lg transition-all group/item",
                      checked
                        ? "bg-orange-50 dark:bg-orange-950/20 border border-orange-200/60 dark:border-orange-800/40"
                        : "hover:bg-muted/50 border border-transparent"
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleQuestion(q.id)}
                      className={cn(
                        "shrink-0",
                        checked ? "border-orange-500 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500" : ""
                      )}
                      data-testid={`checkbox-question-${q.id}`}
                    />
                    <span className={cn("text-sm flex-1 min-w-0", checked ? "text-foreground font-medium" : "text-muted-foreground")}>
                      {isRtl ? q.labelAr : q.labelEn}
                    </span>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0">
                      <Button
                        variant="ghost" size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-orange-600 hover:bg-orange-100 dark:hover:bg-orange-950/30"
                        onClick={(e) => { e.stopPropagation(); startEditing(q); }}
                        data-testid={`button-edit-question-${q.id}`}
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-950/30"
                        onClick={(e) => { e.stopPropagation(); deleteQuestion(q.id); }}
                        data-testid={`button-delete-question-${q.id}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}

              {/* Add New Question Form */}
              {addingNew ? (
                <div className="p-3 rounded-lg border-2 border-dashed border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-2 mt-1">
                  <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    <Plus className="w-3 h-3" />
                    {isRtl ? "إضافة سؤال جديد" : "Add New Question"}
                  </div>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-[11px] text-muted-foreground mb-1 block">{isRtl ? "النص العربي:" : "Arabic Text:"}</Label>
                      <Input
                        value={newAr}
                        onChange={(e) => setNewAr(e.target.value)}
                        placeholder={isRtl ? "اكتب السؤال بالعربي..." : "Enter question in Arabic..."}
                        className="h-8 text-sm"
                        dir="rtl"
                        data-testid="input-new-question-ar"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-muted-foreground mb-1 block">{isRtl ? "النص الإنجليزي:" : "English Text:"}</Label>
                      <Input
                        value={newEn}
                        onChange={(e) => setNewEn(e.target.value)}
                        placeholder={isRtl ? "اكتب السؤال بالإنجليزي..." : "Enter question in English..."}
                        className="h-8 text-sm"
                        dir="ltr"
                        data-testid="input-new-question-en"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => setAddingNew(false)}>
                      <X className="w-3 h-3" />
                      {isRtl ? "إلغاء" : "Cancel"}
                    </Button>
                    <Button size="sm" className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={saveNewQuestion} disabled={!newAr.trim() && !newEn.trim()} data-testid="button-save-new-question">
                      <Check className="w-3 h-3" />
                      {isRtl ? "إضافة" : "Add"}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  className="w-full h-9 mt-1 border-2 border-dashed border-border hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 text-muted-foreground hover:text-emerald-700 gap-2 text-sm transition-all"
                  onClick={startAdding}
                  data-testid="button-add-new-question"
                >
                  <Plus className="w-4 h-4" />
                  {isRtl ? "إضافة سؤال جديد" : "Add New Question"}
                </Button>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              {isRtl
                ? `تم اختيار ${selectedQuestions.length} من ${questions.length} أسئلة`
                : `${selectedQuestions.length} of ${questions.length} questions selected`}
            </p>
          </div>

          {/* Message Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">{isRtl ? "نص الرسالة:" : "Message Text:"}</Label>
              <Button
                variant="ghost"
                size="sm"
                className={cn("h-7 gap-1.5 text-xs", editingMessage ? "text-emerald-600" : "text-muted-foreground")}
                onClick={() => setEditingMessage(!editingMessage)}
                data-testid="button-toggle-edit-message"
              >
                {editingMessage ? (
                  <><Check className="w-3.5 h-3.5" />{isRtl ? "تم التعديل" : "Done"}</>
                ) : (
                  <><Pencil className="w-3.5 h-3.5" />{isRtl ? "تعديل الرسالة" : "Edit Message"}</>
                )}
              </Button>
            </div>

            {editingMessage ? (
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[120px] resize-none text-sm"
                data-testid="textarea-survey-message"
              />
            ) : (
              <div
                className="bg-secondary/50 border border-border/50 rounded-xl p-4 text-sm whitespace-pre-line text-muted-foreground min-h-[80px] cursor-pointer hover:border-primary/30 transition-colors"
                onClick={() => setEditingMessage(true)}
              >
                {message}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" className="text-xs h-7" onClick={() => setMessage(getDefaultMessage())} data-testid="button-template-default">
                {isRtl ? "نموذج افتراضي" : "Default Template"}
              </Button>
              <Button variant="secondary" size="sm" className="text-xs h-7" onClick={() => setMessage(getPostProjectMessage())} data-testid="button-template-post-project">
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
            disabled={sending || selectedQuestions.length === 0 || !message.trim()}
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
                {isRtl ? `إرسال الاستطلاع (${selectedQuestions.length})` : `Send Survey (${selectedQuestions.length})`}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
