import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SignaturePad } from "@/components/ui/signature-pad";
import {
  type SignatureRecord,
  getDocumentSignatures,
  saveSignature,
  deleteSignature,
  getSavedSignatureImage,
  saveDefaultSignature,
} from "@/lib/signatures";
import { logAction } from "@/lib/auditLog";
import { useToast } from "@/hooks/use-toast";
import { PenLine, Trash2, CheckCircle2, Upload, User, Pencil, Save } from "lucide-react";
import { cn } from "@/lib/utils";

interface SignatureDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  documentType: "proposal" | "contract" | "invoice" | "letter";
  documentId: string;
  documentNumber: string;
  clientName: string;
  isRtl: boolean;
  onSignaturesChange?: () => void;
}

export function SignatureDialog({
  open,
  onOpenChange,
  documentType,
  documentId,
  documentNumber,
  clientName,
  isRtl,
  onSignaturesChange,
}: SignatureDialogProps) {
  const t = (ar: string, en: string) => (isRtl ? ar : en);
  const { toast } = useToast();
  const [activeParty, setActiveParty] = useState<"first" | "second">("first");
  const [signerName, setSignerName] = useState("");
  const [signerRole, setSignerRole] = useState("");
  const [showPad, setShowPad] = useState(false);
  const [editingParty, setEditingParty] = useState<"first" | "second" | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const sigs = getDocumentSignatures(documentId);

  const docTypeLabel = {
    proposal: t("عرض السعر", "Proposal"),
    contract: t("العقد", "Contract"),
    invoice: t("الفاتورة", "Invoice"),
    letter: t("الخطاب", "Letter"),
  }[documentType];

  const handleSaveSignature = (dataUrl: string) => {
    const name = signerName.trim() || (activeParty === "first" ? "Scapex" : clientName);
    const role = signerRole.trim() || (activeParty === "first" ? t("مدير", "Manager") : t("عميل", "Client"));

    const record: SignatureRecord = {
      id: `sig-${Date.now()}`,
      signerName: name,
      signerRole: role,
      signatureDataUrl: dataUrl,
      documentType,
      documentId,
      documentNumber,
      party: activeParty,
      signedAt: new Date().toISOString(),
    };

    saveSignature(record);
    if (activeParty === "first") saveDefaultSignature(dataUrl);
    setShowPad(false);
    setRefreshKey((k) => k + 1);
    onSignaturesChange?.();

    logAction(
      "sign",
      documentType === "contract" ? "contracts" : documentType === "proposal" ? "proposals" : documentType,
      `${activeParty === "first" ? "First" : "Second"} party signed ${documentType} ${documentNumber}`,
      `${activeParty === "first" ? "الطرف الأول" : "الطرف الثاني"} وقّع على ${docTypeLabel} ${documentNumber}`,
    );

    toast({
      title: t("تم التوقيع بنجاح", "Signed Successfully"),
      description: t(
        `تم توقيع ${docTypeLabel} من ${activeParty === "first" ? "الطرف الأول" : "الطرف الثاني"}`,
        `${docTypeLabel} signed by ${activeParty === "first" ? "First Party" : "Second Party"}`,
      ),
    });
  };

  const handleDelete = (party: "first" | "second") => {
    deleteSignature(documentId, party);
    setRefreshKey((k) => k + 1);
    onSignaturesChange?.();
    toast({ title: t("تم حذف التوقيع", "Signature Removed") });
  };

  const handleUseDefault = () => {
    const defaultSig = getSavedSignatureImage();
    if (defaultSig) handleSaveSignature(defaultSig);
  };

  const openPadForParty = (party: "first" | "second") => {
    setActiveParty(party);
    const existingSig = party === "first" ? sigs.first : sigs.second;
    setSignerName(existingSig?.signerName || (party === "first" ? "Scapex" : clientName));
    setSignerRole(existingSig?.signerRole || (party === "first" ? t("مدير", "Manager") : t("عميل", "Client")));
    setShowPad(true);
  };

  const startEditPartyInfo = (party: "first" | "second") => {
    const sig = party === "first" ? sigs.first : sigs.second;
    if (!sig) return;
    setEditingParty(party);
    setEditName(sig.signerName);
    setEditRole(sig.signerRole);
  };

  const saveEditPartyInfo = () => {
    if (!editingParty) return;
    const sig = editingParty === "first" ? sigs.first : sigs.second;
    if (!sig) return;
    const updated: SignatureRecord = {
      ...sig,
      signerName: editName.trim() || sig.signerName,
      signerRole: editRole.trim() || sig.signerRole,
    };
    saveSignature(updated);
    setEditingParty(null);
    setRefreshKey((k) => k + 1);
    onSignaturesChange?.();
    toast({ title: t("تم تحديث البيانات", "Info Updated") });
  };

  const SignatureCard = ({
    party,
    label,
    sig,
  }: {
    party: "first" | "second";
    label: string;
    sig?: SignatureRecord;
  }) => {
    const isEditing = editingParty === party;

    return (
      <div
        className={cn(
          "rounded-xl border-2 p-4 transition-all",
          sig
            ? "border-green-300 bg-green-50/50 dark:bg-green-950/20 dark:border-green-800"
            : "border-dashed border-muted-foreground/20 hover:border-primary/30",
        )}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold">{label}</span>
          </div>
          {sig && (
            <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px] gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {t("موقّع", "Signed")}
            </Badge>
          )}
        </div>

        {sig ? (
          <div className="space-y-2">
            <div className="bg-white rounded-lg border border-green-200 p-2 flex items-center justify-center">
              <img
                src={sig.signatureDataUrl}
                alt={`${sig.signerName} signature`}
                className="max-h-[80px] object-contain"
              />
            </div>

            {isEditing ? (
              <div className="space-y-2 p-2 rounded-lg bg-secondary/30 border border-border/50">
                <div className="space-y-1">
                  <Label className="text-[10px]">{t("اسم الموقّع", "Signer Name")}</Label>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-7 text-xs" data-testid={`input-edit-name-${party}`} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">{t("المسمى / الصفة", "Title / Role")}</Label>
                  <Input value={editRole} onChange={(e) => setEditRole(e.target.value)} className="h-7 text-xs" data-testid={`input-edit-role-${party}`} />
                </div>
                <div className="flex gap-1.5 justify-end">
                  <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => setEditingParty(null)}>
                    {t("إلغاء", "Cancel")}
                  </Button>
                  <Button size="sm" className="h-6 text-[10px] px-2 gap-1" onClick={saveEditPartyInfo} data-testid={`button-save-edit-${party}`}>
                    <Save className="w-2.5 h-2.5" />{t("حفظ", "Save")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{sig.signerName} — {sig.signerRole}</span>
                <span dir="ltr">
                  {new Date(sig.signedAt).toLocaleDateString(isRtl ? "ar-SA" : "en-US", {
                    year: "numeric", month: "short", day: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </span>
              </div>
            )}

            {!isEditing && (
              <div className="flex gap-1.5 justify-end flex-wrap">
                <Button
                  size="sm" variant="outline"
                  className="h-7 text-xs gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                  onClick={() => startEditPartyInfo(party)}
                  data-testid={`button-edit-info-${party}`}
                >
                  <Pencil className="w-3 h-3" />{t("تعديل البيانات", "Edit Info")}
                </Button>
                <Button
                  size="sm" variant="outline"
                  className="h-7 text-xs gap-1 text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => handleDelete(party)}
                  data-testid={`button-delete-sig-${party}`}
                >
                  <Trash2 className="w-3 h-3" />{t("حذف", "Remove")}
                </Button>
                <Button
                  size="sm" variant="outline"
                  className="h-7 text-xs gap-1"
                  onClick={() => openPadForParty(party)}
                  data-testid={`button-resign-${party}`}
                >
                  <PenLine className="w-3 h-3" />{t("إعادة توقيع", "Re-sign")}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="h-[80px] rounded-lg border-2 border-dashed border-muted-foreground/15 flex items-center justify-center">
              <p className="text-xs text-muted-foreground/50">
                {t("لم يتم التوقيع بعد", "Not signed yet")}
              </p>
            </div>
            <div className="flex gap-1.5 justify-center">
              <Button
                size="sm"
                className="gap-1.5 h-8 text-xs"
                onClick={() => openPadForParty(party)}
                data-testid={`button-sign-${party}`}
              >
                <PenLine className="w-3.5 h-3.5" />
                {t("توقيع الآن", "Sign Now")}
              </Button>
              {party === "first" && getSavedSignatureImage() && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 h-8 text-xs"
                  onClick={handleUseDefault}
                  data-testid="button-use-default-sig"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {t("توقيع محفوظ", "Saved Signature")}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        dir={isRtl ? "rtl" : "ltr"}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenLine className="w-5 h-5 text-primary" />
            {t("التوقيع الإلكتروني", "Electronic Signature")}
            <Badge variant="outline" className="text-xs font-mono">
              {documentNumber}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {showPad ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{t("اسم الموقّع", "Signer Name")}</Label>
                <Input
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  className="h-8 text-sm"
                  data-testid="input-signer-name"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("المسمى / الصفة", "Title / Role")}</Label>
                <Input
                  value={signerRole}
                  onChange={(e) => setSignerRole(e.target.value)}
                  className="h-8 text-sm"
                  data-testid="input-signer-role"
                />
              </div>
            </div>
            <SignaturePad
              onSave={handleSaveSignature}
              onCancel={() => setShowPad(false)}
              isRtl={isRtl}
            />
          </div>
        ) : (
          <div className="space-y-4" key={refreshKey}>
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
              <PenLine className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                {t(
                  "وقّع على المستند إلكترونياً. يمكنك تعديل بيانات كل طرف (الاسم والصفة) بعد التوقيع. سيظهر التوقيع تلقائياً عند الطباعة.",
                  "Sign the document electronically. You can edit each party's info (name & role) after signing. Signatures appear automatically when printed.",
                )}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SignatureCard
                party="first"
                label={t("الطرف الأول — مقدم الخدمة", "First Party — Service Provider")}
                sig={sigs.first}
              />
              <SignatureCard
                party="second"
                label={t(`الطرف الثاني — ${clientName}`, `Second Party — ${clientName}`)}
                sig={sigs.second}
              />
            </div>

            {sigs.first && sigs.second && (
              <div className="p-3 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 text-center">
                <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-300">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm font-semibold">
                    {t("تم توقيع المستند بالكامل من الطرفين", "Document fully signed by both parties")}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
