import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Send, Mail, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { scopedFetch } from "@/lib/queryClient";
import { sendDocumentToClient } from "@/lib/sendToClient";

interface ContactLite { id: number; nameAr: string | null; nameEn: string | null; email: string | null; }

export interface SendToClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Document title (Arabic) — email subject + portal doc title. */
  titleAr: string;
  titleEn?: string;
  /** documents.category, e.g. "proposal" | "contract" | "invoice" | "voucher" | "letter". */
  category: string;
  /** Builds the printable HTML of the document at send time. */
  buildHtml: () => string;
  /** Known client email (prefill). */
  defaultEmail?: string;
  /** Known CRM contact id — enables the portal option without picking a contact. */
  contactId?: number | null;
  /** When true, shows a contact picker (used when contactId is unknown). */
  allowPickContact?: boolean;
}

export function SendToClientDialog(props: SendToClientDialogProps) {
  const { open, onOpenChange, titleAr, titleEn, category, buildHtml, defaultEmail, contactId, allowPickContact } = props;
  const { dir } = useLanguage();
  const t = (arText: string, enText: string) => (dir === "rtl" ? arText : enText);
  const { toast } = useToast();

  const [email, setEmail] = useState(defaultEmail || "");
  const [viaEmail, setViaEmail] = useState(true);
  const [viaPortal, setViaPortal] = useState(true);
  const [contacts, setContacts] = useState<ContactLite[]>([]);
  const [pickedContact, setPickedContact] = useState<string>(contactId ? String(contactId) : "");
  const [sending, setSending] = useState(false);

  const needPicker = allowPickContact || !contactId;

  useEffect(() => {
    if (!open) return;
    setEmail(defaultEmail || "");
    setPickedContact(contactId ? String(contactId) : "");
    if (needPicker) {
      scopedFetch("/api/contacts").then(r => r.json()).then((rows: any[]) => {
        setContacts(Array.isArray(rows) ? rows.map(c => ({ id: c.id, nameAr: c.nameAr, nameEn: c.nameEn, email: c.email })) : []);
      }).catch(() => {});
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const effectiveContactId = pickedContact ? Number(pickedContact) : (contactId || null);

  const onPickContact = (v: string) => {
    setPickedContact(v);
    if (!defaultEmail) {
      const c = contacts.find(x => String(x.id) === v);
      if (c?.email) setEmail(c.email);
    }
  };

  const handleSend = async () => {
    if (!viaEmail && !viaPortal) return;
    if (viaEmail && !email.trim()) {
      toast({ title: t("أدخل البريد الإلكتروني للعميل", "Enter the client's email"), variant: "destructive" });
      return;
    }
    if (viaPortal && !effectiveContactId) {
      toast({ title: t("اختر العميل لإرسال نسخة إلى بوابته", "Pick the client to share to their portal"), variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const html = buildHtml();
      const res = await sendDocumentToClient({
        email: email.trim(),
        contactId: effectiveContactId,
        titleAr, titleEn, category, html,
        sendEmail: viaEmail,
        sendPortal: viaPortal,
      });
      const parts: string[] = [];
      if (viaEmail) parts.push(res.emailOk ? t("✓ البريد الإلكتروني", "✓ Email") : t("✗ البريد الإلكتروني", "✗ Email"));
      if (viaPortal) parts.push(res.portalOk ? t("✓ بوابة العميل", "✓ Client portal") : t("✗ بوابة العميل", "✗ Client portal"));
      const allOk = (!viaEmail || res.emailOk) && (!viaPortal || res.portalOk);
      toast({
        title: allOk ? t("تم إرسال النسخة بنجاح", "Copy sent successfully") : t("اكتمل الإرسال جزئياً", "Partially sent"),
        description: parts.join(" · ") + (res.errors.length ? ` — ${res.errors.join("; ")}` : ""),
        variant: allOk ? "default" : "destructive",
      });
      if (allOk) onOpenChange(false);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir={dir}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Send className="w-4 h-4 text-primary" />{t("إرسال نسخة للعميل", "Send copy to client")}</DialogTitle>
          <DialogDescription className="truncate">{titleAr}{titleEn ? ` — ${titleEn}` : ""}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {needPicker && (
            <div className="space-y-1.5">
              <Label className="text-xs">{t("العميل", "Client")}</Label>
              <Select value={pickedContact} onValueChange={onPickContact}>
                <SelectTrigger data-testid="select-send-contact"><SelectValue placeholder={t("اختر العميل...", "Pick a client...")} /></SelectTrigger>
                <SelectContent>
                  {contacts.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>{dir === "rtl" ? (c.nameAr || c.nameEn) : (c.nameEn || c.nameAr)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex items-start gap-3 rounded-lg border border-border/60 p-3">
            <Checkbox checked={viaEmail} onCheckedChange={(v) => setViaEmail(!!v)} id="send-via-email" data-testid="checkbox-send-email" className="mt-0.5" />
            <div className="flex-1 space-y-2">
              <Label htmlFor="send-via-email" className="flex items-center gap-1.5 cursor-pointer"><Mail className="w-3.5 h-3.5 text-blue-600" />{t("إرسال إلى البريد الإلكتروني", "Send to email")}</Label>
              {viaEmail && (
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="client@email.com" dir="ltr" data-testid="input-send-email" />
              )}
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg border border-border/60 p-3">
            <Checkbox checked={viaPortal} onCheckedChange={(v) => setViaPortal(!!v)} id="send-via-portal" data-testid="checkbox-send-portal" className="mt-0.5" />
            <div className="flex-1">
              <Label htmlFor="send-via-portal" className="flex items-center gap-1.5 cursor-pointer"><Globe className="w-3.5 h-3.5 text-emerald-600" />{t("نشر في بوابة العميل (ضمن المستندات)", "Share to client portal (under Documents)")}</Label>
              <div className="text-[11px] text-muted-foreground mt-1">{t("سيظهر المستند للعميل عند تسجيل دخوله إلى البوابة.", "The document appears when the client signs in to the portal.")}</div>
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-send-cancel">{t("إلغاء", "Cancel")}</Button>
          <Button onClick={handleSend} disabled={sending || (!viaEmail && !viaPortal)} className="gap-1.5" data-testid="button-send-confirm">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {t("إرسال", "Send")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
