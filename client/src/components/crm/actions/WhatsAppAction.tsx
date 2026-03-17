import { useLanguage } from "../../../contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Send, Phone } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface WhatsAppActionProps {
  customerName: string;
  phoneNumber: string;
  trigger?: React.ReactNode;
}

export function WhatsAppAction({ customerName, phoneNumber, trigger }: WhatsAppActionProps) {
  const { t, dir } = useLanguage();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");

  const handleSend = () => {
    toast({
      title: dir === 'rtl' ? "تم إرسال الرسالة" : "Message Sent",
      description: dir === 'rtl' 
        ? `تم إرسال رسالة WhatsApp إلى ${customerName}` 
        : `WhatsApp message sent to ${customerName}`,
    });
    setOpen(false);
    setMessage("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Phone className="w-4 h-4 text-emerald-500" />
            WhatsApp
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className={cn("flex items-center gap-2", dir === 'rtl' ? "text-right" : "text-left")}>
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
              <Phone className="w-4 h-4 text-emerald-600" />
            </div>
            {dir === 'rtl' ? "إرسال رسالة WhatsApp" : "Send WhatsApp Message"}
          </DialogTitle>
          <DialogDescription className={dir === 'rtl' ? "text-right" : "text-left"}>
            {dir === 'rtl' 
              ? `إرسال رسالة مباشرة إلى ${customerName} (${phoneNumber})` 
              : `Send a direct message to ${customerName} (${phoneNumber})`}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4" dir={dir}>
          <div className="space-y-2">
            <Textarea
              placeholder={dir === 'rtl' ? "اكتب رسالتك هنا..." : "Type your message here..."}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[100px] resize-none"
            />
            <div className="flex gap-2 mt-2">
              <Button variant="secondary" size="sm" onClick={() => setMessage(dir === 'rtl' ? "مرحباً، أود متابعة حالة المشروع معكم." : "Hello, I would like to follow up on the project status.")} className="text-xs">
                {dir === 'rtl' ? "متابعة" : "Follow up"}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setMessage(dir === 'rtl' ? "مرفق لكم العرض الفني والمالي للمراجعة." : "Attached is the technical and commercial proposal for your review.")} className="text-xs">
                {dir === 'rtl' ? "عرض سعر" : "Proposal"}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setMessage(dir === 'rtl' ? "نود تذكيركم بموعد الاجتماع القادم." : "We would like to remind you of the upcoming meeting.")} className="text-xs">
                {dir === 'rtl' ? "تذكير" : "Reminder"}
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter className={cn(dir === 'rtl' ? "sm:justify-start" : "")}>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {dir === 'rtl' ? "إلغاء" : "Cancel"}
          </Button>
          <Button onClick={handleSend} disabled={!message.trim()} className="bg-emerald-600 hover:bg-emerald-700">
            <Send className={cn("w-4 h-4", dir === 'rtl' ? "ml-2" : "mr-2")} />
            {dir === 'rtl' ? "إرسال" : "Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
