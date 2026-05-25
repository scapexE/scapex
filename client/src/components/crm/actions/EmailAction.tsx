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
import { Mail, Send, ExternalLink, AlertCircle } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

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

export function EmailAction({
  customerName, email, selectedCount, isBulk, customers = [], trigger,
}: EmailActionProps) {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const validCustomers = customers.filter(c => c.email?.trim());
  const noEmail = customers.length - validCustomers.length;

  const buildMailto = () => {
    if (!isBulk) {
      const body = message.replace(/\{name\}/g, customerName || "");
      return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }
    const allEmails = validCustomers.map(c => c.email).join(",");
    return `mailto:${allEmails}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
  };

  const handleSend = () => {
    const url = buildMailto();
    window.location.href = url;
    setOpen(false);
    setSubject("");
    setMessage("");
  };

  const onClose = () => { setOpen(false); setSubject(""); setMessage(""); };

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
                ? `${validCustomers.length} جهة اتصال لديها بريد إلكتروني${noEmail > 0 ? ` · ${noEmail} بدون بريد` : ""}`
                : `${validCustomers.length} contact(s) with email${noEmail > 0 ? ` · ${noEmail} without` : ""}`)
              : (isRtl ? `إلى: ${email || "—"}` : `To: ${email || "—"}`)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label className="text-xs">{isRtl ? "إلى:" : "To:"}</Label>
            <div className="w-full min-h-9 rounded-md border border-input bg-secondary/40 px-3 py-1.5 text-sm text-muted-foreground">
              {isBulk
                ? (validCustomers.length > 0
                  ? <span className="text-foreground">{validCustomers.slice(0, 3).map(c => c.email).join(", ")}{validCustomers.length > 3 ? ` +${validCustomers.length - 3}` : ""}</span>
                  : <span className="italic">{isRtl ? "لا يوجد عناوين" : "No addresses"}</span>)
                : email || "—"}
            </div>
          </div>

          {isBulk && validCustomers.length > 3 && (
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
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">{isRtl ? "نص الرسالة:" : "Message:"}</Label>
            <Textarea
              placeholder={isRtl
                ? "اكتب رسالتك هنا... استخدم {name} لإدراج اسم العميل"
                : "Write your message... use {name} to insert customer name"}
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="min-h-[120px] text-sm resize-none"
              data-testid="input-email-message"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Button variant="outline" size="sm" className="text-xs h-7"
              onClick={() => setMessage(p => p + "{name}")}>
              {isRtl ? "+ اسم العميل" : "+ Name"}
            </Button>
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
          <Button variant="outline" onClick={onClose}>{isRtl ? "إلغاء" : "Cancel"}</Button>
          <Button
            onClick={handleSend}
            disabled={!subject.trim() || !message.trim() || (isBulk ? !validCustomers.length : !email)}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
            data-testid="button-send-email"
          >
            <ExternalLink className="w-4 h-4" />
            {isBulk
              ? (isRtl ? `فتح تطبيق البريد (${validCustomers.length})` : `Open Mail App (${validCustomers.length})`)
              : (isRtl ? "فتح تطبيق البريد" : "Open Mail App")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
