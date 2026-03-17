import { useState, useRef } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PenTool, CheckCircle2, FileSignature, Clock, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
// @ts-ignore
import SignatureCanvas from 'react-signature-canvas';
import { useToast } from "@/hooks/use-toast";

interface ContractSignatureProps {
  contractId: string;
  contractTitle: string;
  clientName: string;
  status: 'pending' | 'signed';
  onSignComplete?: () => void;
}

export function ContractSignature({ contractId, contractTitle, clientName, status: initialStatus, onSignComplete }: ContractSignatureProps) {
  const { t, dir } = useLanguage();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(initialStatus);
  const [signMethod, setSignMethod] = useState<'draw' | 'type'>('draw');
  const [typedSignature, setTypedSignature] = useState("");
  const sigCanvas = useRef<any>(null);

  const handleClear = () => {
    if (sigCanvas.current) {
      sigCanvas.current.clear();
    }
    setTypedSignature("");
  };

  const handleSign = () => {
    let hasSignature = false;
    
    if (signMethod === 'draw' && sigCanvas.current && !sigCanvas.current.isEmpty()) {
      hasSignature = true;
    } else if (signMethod === 'type' && typedSignature.trim().length > 2) {
      hasSignature = true;
    }

    if (!hasSignature) {
      toast({
        title: dir === 'rtl' ? "توقيع مفقود" : "Missing Signature",
        description: dir === 'rtl' ? "الرجاء رسم أو كتابة توقيعك قبل الاعتماد." : "Please draw or type your signature before confirming.",
        variant: "destructive"
      });
      return;
    }

    setStatus('signed');
    setOpen(false);
    toast({
      title: dir === 'rtl' ? "تم توقيع العقد بنجاح" : "Contract Signed Successfully",
      description: dir === 'rtl' 
        ? "تم توقيع العقد وحفظه وختمه بوقت التوقيع." 
        : "The contract has been signed, saved, and timestamped.",
    });
    
    if (onSignComplete) onSignComplete();
  };

  if (status === 'signed') {
    return (
      <Badge className="bg-emerald-500 hover:bg-emerald-600 gap-1.5 py-1 px-3">
        <Lock className="w-3 h-3" />
        {t('sales.contract.signed')}
      </Badge>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90">
          <FileSignature className="w-4 h-4" />
          {t('sales.contract.sign')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className={cn("flex items-center gap-2", dir === 'rtl' ? "text-right" : "text-left")}>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <PenTool className="w-4 h-4 text-primary" />
            </div>
            {t('sales.contract.sign')}
          </DialogTitle>
          <DialogDescription className={dir === 'rtl' ? "text-right" : "text-left"}>
            {dir === 'rtl' 
              ? `أنت تقوم بتوقيع ${contractTitle} بصفتك الممثل المفوض لـ ${clientName}.` 
              : `You are signing ${contractTitle} as the authorized representative for ${clientName}.`}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4" dir={dir}>
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-3 mb-6 text-sm text-amber-800 dark:text-amber-200 flex items-start gap-2">
            <Clock className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              {dir === 'rtl' 
                ? "بالنقر على تأكيد، أنت توافق على أن هذا التوقيع الإلكتروني يُلزمك قانونياً بمحتويات هذا العقد. سيتم تسجيل عنوان IP الخاص بك ووقت التوقيع."
                : "By clicking confirm, you agree that this electronic signature is legally binding. Your IP address and timestamp will be recorded."}
            </p>
          </div>

          <Tabs defaultValue="draw" onValueChange={(v) => setSignMethod(v as 'draw' | 'type')}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="draw">{t('sales.contract.draw')}</TabsTrigger>
              <TabsTrigger value="type">{t('sales.contract.type')}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="draw" className="space-y-4">
              <div className="border-2 border-dashed border-border/60 rounded-xl overflow-hidden bg-card flex flex-col relative">
                <SignatureCanvas 
                  ref={sigCanvas}
                  penColor="blue"
                  canvasProps={{
                    className: 'signature-canvas w-full h-[200px]',
                    style: { width: '100%', height: '200px' }
                  }}
                />
                <div className="absolute bottom-2 left-2 right-2 flex justify-end">
                  <Button variant="secondary" size="sm" onClick={handleClear} className="h-7 text-xs">
                    {t('sales.contract.clear')}
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="type" className="space-y-4">
              <div className="border-2 border-dashed border-border/60 rounded-xl h-[200px] bg-card p-6 flex flex-col justify-center gap-4">
                <Input 
                  placeholder={dir === 'rtl' ? "اكتب اسمك الكامل هنا..." : "Type your full name here..."}
                  value={typedSignature}
                  onChange={(e) => setTypedSignature(e.target.value)}
                  className="text-xl text-center border-0 border-b-2 border-primary/20 rounded-none focus-visible:ring-0 px-0"
                />
                <div 
                  className="text-4xl text-center text-blue-600 opacity-80 min-h-[50px] overflow-hidden" 
                  style={{ fontFamily: "'Architects Daughter', cursive" }}
                >
                  {typedSignature || (dir === 'rtl' ? "توقيعك سيظهر هنا" : "Your signature here")}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className={cn(dir === 'rtl' ? "sm:justify-start" : "")}>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {dir === 'rtl' ? "إلغاء" : "Cancel"}
          </Button>
          <Button onClick={handleSign} className="bg-primary hover:bg-primary/90 gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {t('sales.contract.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
