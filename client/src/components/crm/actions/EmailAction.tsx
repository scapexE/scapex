import { useLanguage } from "../../../contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mail, Send, AlertCircle, Loader2, CheckCircle2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { scopedFetch } from "@/lib/queryClient";
import { logAction } from "@/lib/auditLog";

export interface CustomerEmail {
  name: string;
  email: string;
}

interface EmailActionProps {
  customerName?: string;
  email?: string;
  selectedCount?: number;
  isBulk?: boolean;
  customers?: CustomerEmail[];
  trigger?: React.ReactNode;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function renderHtml(message: string, isRtl: boolean): string {
  const safe = escapeHtml(message).replace(/\n/g, "<br/>");
  const dir = isRtl ? "rtl" : "ltr";
  return `<div dir="${dir}" style="font-family:'Segoe UI',Tahoma,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#f8fafc">
    <div style="background:#fff;border-radius:12px;padding:28px;border:1px solid #e2e8f0;color:#0f172a;font-size:14px;line-height:1.7">${safe}</div>
    <p style="text-align:center;color:#94a3b8;font-size:11px;margin-top:12px">Scapex</p>
  </div>`;
}

export function EmailAction({
  customerName, email, selectedCount, isBulk, customers = [], trigger,
}: EmailActionProps) {
  const { dir } = useLanguage();
  const { toast } = useToast();
  const isRtl = dir === "rtl";
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const validCustomers = customers.filter(c => c.email?.trim());
  const noEmail = customers.length - validCustomers.length;

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) return;
    setSending(true);
    try {
      let payload: any;
      if (isBulk) {
        if (!validCustomers.length) return;
        // Bulk: server uses BCC for privacy; {name} is not personalizable in a single send.
        payload = {
          isBulk: true,
          recipients: validCustomers.map(c => c.email),
          subject,
          html: renderHtml(message.replace(/\{name\}/g, isRtl ? "عميلنا الكريم" : "Valued Customer"), isRtl),
          text: message.replace(/\{name\}/g, isRtl ? "عميلنا الكريم" : "Valued Customer"),
          category: "crm_bulk",
        };
      } else {
        if (!email) return;
        const personalized = message.replace(/\{name\}/g, customerName || "");
        payload = {
          to: email,
          subject,
          html: renderHtml(personalized, isRtl),
          text: personalized,
          category: "crm_single",
        };
      }
      const res = await scopedFetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Send failed");

      logAction(
        "create", "crm",
        isBulk ? `Bulk email to ${validCustomers.length} via Resend` : `Email to ${customerName} via Resend`,
        isBulk ? `إرسال بريد جماعي إلى ${validCustomers.length} عميل` : `إرسال بريد إلى ${customerName}`,
      );

      toast({
        title: isRtl ? "تم الإرسال بنجاح" : "Email Sent",
        description: isRtl
          ? `تم إرسال البريد إلى ${isBulk ? validCustomers.length + " مستلم" : email} عبر Resend`
          : `Sent to ${isBulk ? validCustomers.length + " recipient(s)" : email} via Resend`,
      });
      setOpen(false);
      setSubject("");
      setMessage("");
    } catch (e: any) {
      toast({
        title: isRtl ? "تعذّر الإرسال" : "Send Failed",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const onClose = () => { if (sending) return; setOpen(false); setSubject(""); setMessage(""); };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); else setOpen(true); }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Mail className="w-4 h-4 text-blue-500" />Email
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px]" onClick={e => e.stopPropagation()} dir={dir}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center shrink-0">
              <Mail className="w-4 h-4 text-blue-600" />
            </div>
            {isBulk
              ? (isRtl ? "إرسال بريد إلكتروني جماعي" : "Bulk Email")
              : (isRtl ? `بريد إلكتروني — ${customerName}` : `Email — ${customerName}`)}
          </DialogTitle>
          <DialogDescription>
            {isBulk
              ? (isRtl
                ? `${validCustomers.length} مستلم${noEmail > 0 ? ` · ${noEmail} بدون بريد` : ""}`
                : `${validCustomers.length} recipient(s)${noEmail > 0 ? ` · ${noEmail} without` : ""}`)
              : (isRtl ? `إلى: ${email || "—"}` : `To: ${email || "—"}`)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {isBulk && validCustomers.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 p-2.5 text-xs">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-blue-900 dark:text-blue-200 leading-relaxed">
                {isRtl
                  ? "للحفاظ على الخصوصية، يتم وضع جميع المستلمين في حقل BCC المخفي ولن يرى أحدٌ منهم عناوين الآخرين."
                  : "For privacy, all recipients are placed in BCC — none of them will see each other's addresses."}
              </p>
            </div>
          )}

          {isBulk && validCustomers.length > 0 && (
            <ScrollArea className="h-24 rounded-lg border border-border/50">
              <div className="divide-y divide-border/40">
                {validCustomers.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-1.5 text-xs">
                    <span className="font-medium truncate">{c.name}</span>
                    <span className="text-muted-foreground truncate" dir="ltr">{c.email}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">{isRtl ? "الموضوع:" : "Subject:"}</Label>
            <Input
              placeholder={isRtl ? "أدخل موضوع الرسالة" : "Enter email subject"}
              value={subject}
              onChange={e => setSubject(e.target.value)}
              data-testid="input-email-subject"
              disabled={sending}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">
              {isRtl ? "نص الرسالة:" : "Message:"}
              {!isBulk && (
                <span className="text-muted-foreground/70 ms-2">
                  ({isRtl ? "{name} يُستبدل تلقائياً" : "{name} is auto-replaced"})
                </span>
              )}
            </Label>
            <Textarea
              placeholder={isRtl
                ? "اكتب رسالتك هنا..."
                : "Write your message..."}
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="min-h-[120px] text-sm resize-none"
              data-testid="input-email-message"
              disabled={sending}
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {!isBulk && (
              <Button variant="outline" size="sm" className="text-xs h-7"
                onClick={() => setMessage(p => p + "{name}")}>
                {isRtl ? "+ اسم العميل" : "+ Name"}
              </Button>
            )}
            <Button variant="secondary" size="sm" className="text-xs h-7"
              onClick={() => {
                setSubject(isRtl ? "متابعة — نرحب باستفساراتكم" : "Following up — we'd love to hear from you");
                setMessage(isRtl
                  ? "عزيزي/عزيزتي {name}،\n\nأتمنى أن تكونوا بخير. أودّ متابعة مناقشتنا السابقة والتأكد من تلبية احتياجاتكم.\n\nبانتظار ردكم الكريم،\nفريق سكابكس"
                  : "Dear {name},\n\nHope you're well. I wanted to follow up on our previous discussion and ensure your needs are being met.\n\nLooking forward to your reply,\nScapex Team");
              }}>
              {isRtl ? "متابعة" : "Follow-up"}
            </Button>
            <Button variant="secondary" size="sm" className="text-xs h-7"
              onClick={() => {
                setSubject(isRtl ? "عرض سعر جديد من سكابكس" : "New Proposal from Scapex");
                setMessage(isRtl
                  ? "عزيزي/عزيزتي {name}،\n\nنسعد بتقديم عرضنا الفني والمالي المتكامل لمشروعكم.\n\nيرجى مراجعة المرفقات وإعلامنا بأي استفسار.\n\nمع تحيات فريق سكابكس"
                  : "Dear {name},\n\nWe are pleased to present our comprehensive technical and commercial proposal for your project.\n\nPlease review the attachments and let us know if you have any questions.\n\nBest regards,\nScapex Team");
              }}>
              {isRtl ? "عرض سعر" : "Proposal"}
            </Button>
          </div>

          {noEmail > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {isRtl ? `${noEmail} عميل بدون بريد إلكتروني — سيتم تخطيهم` : `${noEmail} customer(s) without email — will be skipped`}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 pt-1">
          <Button variant="outline" onClick={onClose} disabled={sending}>{isRtl ? "إلغاء" : "Cancel"}</Button>
          <Button
            onClick={handleSend}
            disabled={sending || !subject.trim() || !message.trim() || (isBulk ? !validCustomers.length : !email)}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
            data-testid="button-send-email"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {isBulk
              ? (isRtl ? `إرسال (${validCustomers.length})` : `Send (${validCustomers.length})`)
              : (isRtl ? "إرسال الآن" : "Send Now")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
