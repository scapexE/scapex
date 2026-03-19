import { useLanguage } from "../../../contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Mail, Paperclip, Send } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface EmailActionProps {
  customerName?: string;
  email?: string;
  selectedCount?: number;
  isBulk?: boolean;
  trigger?: React.ReactNode;
}

export function EmailAction({ customerName, email, selectedCount, isBulk, trigger }: EmailActionProps) {
  const { dir } = useLanguage();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const handleSend = () => {
    toast({
      title: dir === 'rtl' ? "تم إرسال البريد الإلكتروني" : "Email Sent",
      description: dir === 'rtl' 
        ? (isBulk ? `تم إرسال البريد الإلكتروني إلى ${selectedCount} جهة اتصال` : `تم إرسال البريد الإلكتروني إلى ${customerName}`) 
        : (isBulk ? `Email sent to ${selectedCount} contacts` : `Email sent to ${customerName}`),
    });
    setOpen(false);
    setSubject("");
    setMessage("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Mail className="w-4 h-4 text-blue-500" />
            Email
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className={cn("flex items-center gap-2", dir === 'rtl' ? "text-right" : "text-left")}>
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <Mail className="w-4 h-4 text-blue-600" />
            </div>
            {dir === 'rtl' ? (isBulk ? "إرسال بريد إلكتروني جماعي" : "إرسال بريد إلكتروني") : (isBulk ? "Send Bulk Email" : "Send Email")}
          </DialogTitle>
          <DialogDescription className={dir === 'rtl' ? "text-right" : "text-left"}>
            {dir === 'rtl' 
              ? (isBulk ? `إرسال بريد إلكتروني إلى ${selectedCount} جهة اتصال محددة. استخدم {name} لتخصيص الرسالة بالاسم.` : `إرسال بريد إلكتروني إلى ${customerName}`) 
              : (isBulk ? `Send an email to ${selectedCount} selected contacts. Use {name} to personalize the message.` : `Send an email to ${customerName}`)}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4" dir={dir}>
          <div className="space-y-2">
            <Label>{dir === 'rtl' ? "إلى:" : "To:"}</Label>
            <Input value={isBulk ? `${selectedCount} ${dir === 'rtl' ? "مستلمين" : "recipients"}` : email} disabled className="bg-secondary/50" />
          </div>
          <div className="space-y-2">
            <Label>{dir === 'rtl' ? "الموضوع:" : "Subject:"}</Label>
            <Input 
              placeholder={dir === 'rtl' ? "أدخل موضوع الرسالة" : "Enter email subject"}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>{dir === 'rtl' ? "الرسالة:" : "Message:"}</Label>
            <Textarea
              placeholder={dir === 'rtl' ? "اكتب رسالتك هنا..." : "Type your message here..."}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[150px]"
            />
          </div>
          
          {/* Mock Template Selection */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setMessage(prev => prev + " {name}")} className="text-xs h-7">
              {dir === 'rtl' ? "+ إدراج الاسم" : "+ Insert Name"}
            </Button>
            <div className="w-px h-7 bg-border mx-1" />
            <Button variant="secondary" size="sm" onClick={() => {
              setSubject(dir === 'rtl' ? "عرض سعر: مشروع البنية التحتية" : "Proposal: Infrastructure Project");
              setMessage(dir === 'rtl' ? "عزيزي/عزيزتي {name}،\n\nتجدون مرفق طيه العرض الفني والمالي الخاص بالمشروع.\n\nمع التحية،\nفريق المبيعات" : "Dear {name},\n\nPlease find attached the technical and commercial proposal for the project.\n\nBest regards,\nSales Team");
            }} className="text-xs h-7">
              {dir === 'rtl' ? "نموذج عرض سعر" : "Proposal Template"}
            </Button>
            <Button variant="secondary" size="sm" className="text-xs h-7 gap-1">
              <Paperclip className="w-3 h-3" />
              {dir === 'rtl' ? "إرفاق ملف" : "Attach File"}
            </Button>
          </div>
        </div>
        <DialogFooter className={cn(dir === 'rtl' ? "sm:justify-start" : "")}>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {dir === 'rtl' ? "إلغاء" : "Cancel"}
          </Button>
          <Button onClick={handleSend} disabled={!subject.trim() || !message.trim()} className="bg-blue-600 hover:bg-blue-700">
            <Send className={cn("w-4 h-4", dir === 'rtl' ? "ml-2" : "mr-2")} />
            {dir === 'rtl' ? "إرسال" : "Send Email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
