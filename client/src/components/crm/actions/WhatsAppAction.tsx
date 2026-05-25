import { useLanguage } from "../../../contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Phone, ExternalLink, CheckCircle2, AlertCircle } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export interface CustomerContact {
  name: string;
  phone: string;
}

interface WhatsAppActionProps {
  customerName?: string;
  phoneNumber?: string;
  selectedCount?: number;
  isBulk?: boolean;
  customers?: CustomerContact[];
  trigger?: React.ReactNode;
}

function cleanPhone(phone: string): string {
  let p = (phone || "").replace(/\D/g, "");
  if (p.startsWith("00")) p = p.slice(2);
  if (p.startsWith("0")) p = "966" + p.slice(1);
  if (p.length === 9) p = "966" + p;
  return p;
}

export function WhatsAppAction({
  customerName, phoneNumber, selectedCount, isBulk, customers = [], trigger,
}: WhatsAppActionProps) {
  const { dir } = useLanguage();
  const { toast } = useToast();
  const isRtl = dir === "rtl";
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sentSet, setSentSet] = useState<Set<number>>(new Set());

  const validCustomers = customers.filter(c => c.phone?.trim());
  const noPhone = customers.length - validCustomers.length;

  const waUrl = (name: string, phone: string) => {
    const text = message.replace(/\{name\}/g, name);
    return `https://wa.me/${cleanPhone(phone)}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
  };

  const handleSendSingle = () => {
    if (!phoneNumber) return;
    window.open(waUrl(customerName || "", phoneNumber), "_blank", "noopener");
    setOpen(false);
    setMessage("");
  };

  const handleOpenAll = () => {
    if (!validCustomers.length) return;
    validCustomers.forEach((c, i) => {
      setTimeout(() => {
        window.open(waUrl(c.name, c.phone), "_blank", "noopener");
        setSentSet(prev => new Set([...prev, i]));
      }, i * 700);
    });
    toast({
      title: isRtl ? "جارِ فتح المحادثات" : "Opening chats",
      description: isRtl
        ? `سيتم فتح ${validCustomers.length} محادثة واتساب تباعاً`
        : `Opening ${validCustomers.length} WhatsApp chats one by one`,
    });
  };

  const handleOpenOne = (c: CustomerContact, idx: number) => {
    window.open(waUrl(c.name, c.phone), "_blank", "noopener");
    setSentSet(prev => new Set([...prev, idx]));
  };

  const onClose = () => { setOpen(false); setMessage(""); setSentSet(new Set()); };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); else setOpen(true); }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Phone className="w-4 h-4 text-emerald-500" />WhatsApp
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]" onClick={e => e.stopPropagation()} dir={dir}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center shrink-0">
              <Phone className="w-4 h-4 text-emerald-600" />
            </div>
            {isBulk
              ? (isRtl ? "إرسال واتساب جماعي" : "Bulk WhatsApp")
              : (isRtl ? `واتساب — ${customerName}` : `WhatsApp — ${customerName}`)}
          </DialogTitle>
          <DialogDescription>
            {isBulk
              ? (isRtl
                ? `${validCustomers.length} جهة اتصال لديها رقم هاتف${noPhone > 0 ? ` · ${noPhone} بدون رقم` : ""}`
                : `${validCustomers.length} contact(s) with phone${noPhone > 0 ? ` · ${noPhone} without` : ""}`)
              : (isRtl ? `الرقم: ${phoneNumber || "—"}` : `Number: ${phoneNumber || "—"}`)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <Textarea
            placeholder={isRtl
              ? "اكتب الرسالة... استخدم {name} لإدراج اسم العميل تلقائياً"
              : "Write message... use {name} to auto-insert customer name"}
            value={message}
            onChange={e => setMessage(e.target.value)}
            className="min-h-[90px] resize-none text-sm"
            data-testid="input-whatsapp-message"
          />
          <div className="flex flex-wrap gap-1.5">
            <Button variant="outline" size="sm" className="text-xs h-7"
              onClick={() => setMessage(p => p + "{name}")}>
              {isRtl ? "+ اسم العميل" : "+ Name"}
            </Button>
            <Button variant="secondary" size="sm" className="text-xs h-7"
              onClick={() => setMessage(isRtl
                ? "مرحباً {name}،\nأود الاطمئنان عليكم ومتابعة آخر المستجدات 🙏"
                : "Hello {name},\nJust checking in and following up. 🙏")}>
              {isRtl ? "متابعة" : "Follow up"}
            </Button>
            <Button variant="secondary" size="sm" className="text-xs h-7"
              onClick={() => setMessage(isRtl
                ? "مرحباً {name}،\nلدينا عرض سعر جديد يتناسب مع احتياجاتكم. هل يمكنني إرسال التفاصيل؟"
                : "Hi {name},\nWe have a new proposal tailored to your needs. May I send the details?")}>
              {isRtl ? "عرض سعر" : "Proposal"}
            </Button>
            <Button variant="secondary" size="sm" className="text-xs h-7"
              onClick={() => setMessage(isRtl
                ? "السيد/ة {name}،\nنذكّركم بموعد الاجتماع القادم. نرجو التأكيد. 📅"
                : "Dear {name},\nReminding you of the upcoming meeting. Please confirm. 📅")}>
              {isRtl ? "تذكير" : "Reminder"}
            </Button>
          </div>

          {isBulk && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">
                {isRtl ? "قائمة جهات الاتصال:" : "Contact list:"}
              </p>
              <ScrollArea className="h-44 rounded-lg border border-border/50">
                <div className="divide-y divide-border/40">
                  {validCustomers.map((c, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        {sentSet.has(i)
                          ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          : <div className="w-3.5 h-3.5 rounded-full border-2 border-muted-foreground/30 shrink-0" />}
                        <span className="truncate font-medium text-sm">{c.name}</span>
                        <span className="text-muted-foreground text-xs shrink-0" dir="ltr">{c.phone}</span>
                      </div>
                      <Button size="sm" variant="ghost"
                        className="h-6 w-6 p-0 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 shrink-0"
                        onClick={() => handleOpenOne(c, i)}
                        data-testid={`button-open-wa-${i}`}
                        title={isRtl ? "فتح هذه المحادثة" : "Open this chat"}>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                  {noPhone > 0 && customers.filter(c => !c.phone?.trim()).map((c, i) => (
                    <div key={`np-${i}`} className="flex items-center gap-2 px-3 py-2 text-sm opacity-40">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="truncate">{c.name}</span>
                      <span className="text-xs text-muted-foreground">{isRtl ? "بدون رقم" : "No phone"}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              {noPhone > 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {isRtl ? `${noPhone} عميل بدون رقم هاتف — سيتم تخطيهم` : `${noPhone} customer(s) without phone — will be skipped`}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>{isRtl ? "إغلاق" : "Close"}</Button>
          {isBulk ? (
            <Button
              onClick={handleOpenAll}
              disabled={!validCustomers.length}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              data-testid="button-send-bulk-whatsapp"
            >
              <Send className="w-4 h-4" />
              {isRtl ? `فتح ${validCustomers.length} محادثة` : `Open ${validCustomers.length} chat(s)`}
            </Button>
          ) : (
            <Button
              onClick={handleSendSingle}
              disabled={!phoneNumber}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              data-testid="button-send-whatsapp"
            >
              <ExternalLink className="w-4 h-4" />
              {isRtl ? "فتح واتساب" : "Open WhatsApp"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
