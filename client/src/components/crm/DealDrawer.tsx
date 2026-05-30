import { useState, useEffect, useRef, useCallback } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useActiveRole } from "@/contexts/ActiveRoleContext";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Upload, FileText, Trash2, Download, Loader2, FolderOpen,
  Building2, User, Phone, Mail, Calendar, DollarSign,
  Image, FileSpreadsheet, BookOpen, FlaskConical, ScrollText,
  Receipt, File, Plus, X, Eye, EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { scopedFetch, apiRequest } from "@/lib/queryClient";

interface DbDeal {
  id: number;
  contactId: number | null;
  titleAr: string | null;
  titleEn: string | null;
  value: string | null;
  currency: string | null;
  expectedClose: string | null;
  notes: string | null;
  nextAction: string | null;
  stage: string | null;
  priority: string | null;
  status: string | null;
  activityId: string | null;
  assignedTo: string | null;
  createdBy: string | null;
}

interface DbCustomer {
  id: number;
  nameAr: string | null;
  nameEn: string | null;
  email: string | null;
  phone: string | null;
  organization?: string | null;
  city?: string | null;
}

interface SimpleUser {
  id: string;
  name: string;
  role?: string;
}

interface CrmDocument {
  id: number;
  titleAr: string;
  titleEn: string | null;
  category: string;
  originalName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  uploadedByName: string | null;
  createdAt: string;
  contactId: number | null;
  dealId: number | null;
  clientVisible?: boolean;
  folder?: string | null;
}

const DOC_CATEGORIES = [
  { id: "drawing",  arLabel: "مخطط",       enLabel: "Drawing",   icon: ScrollText },
  { id: "study",    arLabel: "دراسة",       enLabel: "Study",     icon: BookOpen },
  { id: "report",   arLabel: "تقرير",       enLabel: "Report",    icon: FileSpreadsheet },
  { id: "test",     arLabel: "اختبار",      enLabel: "Test",      icon: FlaskConical },
  { id: "photo",    arLabel: "صورة",        enLabel: "Photo",     icon: Image },
  { id: "contract", arLabel: "عقد",         enLabel: "Contract",  icon: FileText },
  { id: "invoice",  arLabel: "فاتورة",      enLabel: "Invoice",   icon: Receipt },
  { id: "other",    arLabel: "أخرى",        enLabel: "Other",     icon: File },
];

const STAGE_META: Record<string, { label: string; labelEn: string; color: string }> = {
  new:         { label: "عملاء جدد",       labelEn: "New",         color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  qualified:   { label: "مؤهلون",          labelEn: "Qualified",   color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  proposal:    { label: "تم إرسال المقترح", labelEn: "Proposal",   color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  negotiation: { label: "تفاوض",           labelEn: "Negotiation", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" },
  won:         { label: "مكتسب 🏆",         labelEn: "Won 🏆",      color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
};

const avatarColor = (name: string) => {
  const colors = ["bg-blue-500","bg-violet-500","bg-emerald-500","bg-amber-500","bg-rose-500","bg-cyan-500","bg-indigo-500","bg-teal-500"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const initials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatValue = (v: string | null, currency: string | null) => {
  const n = parseFloat(v || "0");
  if (!n) return `0 ${currency || "SAR"}`;
  return `${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${currency || "SAR"}`;
};

const getCategoryIcon = (cat: string) => {
  const found = DOC_CATEGORIES.find(c => c.id === cat);
  return found ? found.icon : File;
};

const getCategoryLabel = (cat: string, isRtl: boolean) => {
  const found = DOC_CATEGORIES.find(c => c.id === cat);
  if (!found) return cat;
  return isRtl ? found.arLabel : found.enLabel;
};

// ─── Component ──────────────────────────────────────────────────────────────

export function DealDrawer({
  deal,
  customer,
  assignedUser,
  onClose,
  onCreateProposal,
}: {
  deal: DbDeal | null;
  customer: DbCustomer | null;
  assignedUser: SimpleUser | null;
  onClose: () => void;
  onCreateProposal?: (deal: DbDeal, customer: DbCustomer | null) => void;
}) {
  const { dir } = useLanguage();
  const { toast } = useToast();
  const { currentUser } = useActiveRole();
  const isRtl = dir === "rtl";

  const [tab, setTab] = useState("details");
  const [contactDocs, setContactDocs] = useState<CrmDocument[]>([]);
  const [dealDocs, setDealDocs] = useState<CrmDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState<"contact" | "deal" | null>(null);
  const [uploadForm, setUploadForm] = useState({ titleAr: "", titleEn: "", category: "report", clientVisible: true });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clientName = customer
    ? (isRtl ? customer.nameAr : customer.nameEn) || customer.nameEn || customer.nameAr || "—"
    : (isRtl ? "عميل غير محدد" : "Unknown");
  const dealTitle = deal
    ? (isRtl ? deal.titleAr : deal.titleEn) || deal.titleEn || deal.titleAr || "—"
    : "—";

  const fetchDocs = useCallback(async () => {
    if (!deal) return;
    setLoadingDocs(true);
    try {
      const [cRes, dRes] = await Promise.all([
        deal.contactId
          ? scopedFetch(`/api/crm-documents?contactId=${deal.contactId}`).then(r => r.json())
          : Promise.resolve([]),
        scopedFetch(`/api/crm-documents?dealId=${deal.id}`).then(r => r.json()),
      ]);
      setContactDocs(Array.isArray(cRes) ? cRes : []);
      setDealDocs(Array.isArray(dRes) ? dRes : []);
    } catch {
      toast({ title: isRtl ? "تعذر تحميل المستندات" : "Failed to load documents", variant: "destructive" });
    } finally { setLoadingDocs(false); }
  }, [deal, isRtl, toast]);

  useEffect(() => {
    if (deal && (tab === "contact-docs" || tab === "deal-docs")) {
      fetchDocs();
    }
  }, [deal, tab, fetchDocs]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      toast({ title: isRtl ? "الملف كبير جداً (الحد 15MB)" : "File too large (max 15MB)", variant: "destructive" });
      return;
    }
    setSelectedFile(file);
    if (!uploadForm.titleAr) setUploadForm(f => ({ ...f, titleAr: file.name.replace(/\.[^.]+$/, "") }));
  };

  const handleUpload = async (scope: "contact" | "deal") => {
    if (!deal || !selectedFile) {
      toast({ title: isRtl ? "اختر ملفاً أولاً" : "Select a file first", variant: "destructive" });
      return;
    }
    if (!uploadForm.titleAr.trim()) {
      toast({ title: isRtl ? "العنوان مطلوب" : "Title is required", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });

      const payload = {
        titleAr: uploadForm.titleAr,
        titleEn: uploadForm.titleEn || null,
        category: uploadForm.category,
        contactId: scope === "contact" ? deal.contactId : null,
        dealId: scope === "deal" ? deal.id : null,
        fileContent: base64,
        originalName: selectedFile.name,
        mimeType: selectedFile.type,
        fileSize: selectedFile.size,
        activityId: deal.activityId || null,
        uploadedBy: currentUser?.id || null,
        uploadedByName: currentUser?.name || null,
        clientVisible: uploadForm.clientVisible,
      };

      const res = await apiRequest("POST", "/api/crm-documents", payload);
      if (!res.ok) throw new Error();
      toast({ title: isRtl ? "تم رفع المستند ✓" : "Document uploaded ✓" });
      setShowUploadForm(null);
      setSelectedFile(null);
      setUploadForm({ titleAr: "", titleEn: "", category: "report", clientVisible: true });
      if (fileInputRef.current) fileInputRef.current.value = "";
      await fetchDocs();
    } catch {
      toast({ title: isRtl ? "تعذر رفع الملف" : "Upload failed", variant: "destructive" });
    } finally { setUploading(false); }
  };

  const handleDownload = async (doc: CrmDocument) => {
    try {
      const res = await scopedFetch(`/api/crm-documents/${doc.id}/file`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.originalName || `${doc.titleAr}.bin`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: isRtl ? "تعذر تحميل الملف" : "Download failed", variant: "destructive" });
    }
  };

  const handlePreview = async (doc: CrmDocument) => {
    try {
      const res = await scopedFetch(`/api/crm-documents/${doc.id}/file`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch {
      toast({ title: isRtl ? "تعذر فتح الملف" : "Preview failed", variant: "destructive" });
    }
  };

  const handleDelete = async (docId: number, scope: "contact" | "deal") => {
    try {
      const res = await apiRequest("DELETE", `/api/crm-documents/${docId}`);
      if (!res.ok) throw new Error();
      toast({ title: isRtl ? "تم الحذف" : "Deleted" });
      if (scope === "contact") setContactDocs(prev => prev.filter(d => d.id !== docId));
      else setDealDocs(prev => prev.filter(d => d.id !== docId));
    } catch {
      toast({ title: isRtl ? "تعذر الحذف" : "Delete failed", variant: "destructive" });
    }
  };

  const handleToggleVisible = async (doc: CrmDocument, scope: "contact" | "deal") => {
    const next = doc.clientVisible === false;
    try {
      const res = await apiRequest("PATCH", `/api/crm-documents/${doc.id}`, { clientVisible: next });
      if (!res.ok) throw new Error();
      const update = (prev: CrmDocument[]) => prev.map(d => d.id === doc.id ? { ...d, clientVisible: next } : d);
      if (scope === "contact") setContactDocs(update);
      else setDealDocs(update);
      toast({ title: next ? (isRtl ? "ظاهر للعميل" : "Visible to client") : (isRtl ? "مخفي عن العميل" : "Hidden from client") });
    } catch {
      toast({ title: isRtl ? "تعذر التحديث" : "Update failed", variant: "destructive" });
    }
  };

  const renderUploadForm = (scope: "contact" | "deal") => (
    <div className="border border-dashed border-primary/30 rounded-xl p-4 bg-primary/3 space-y-3 mt-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-primary">
          {isRtl ? "رفع مستند جديد" : "Upload New Document"}
        </p>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setShowUploadForm(null); setSelectedFile(null); }}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 space-y-1">
          <Label className="text-xs">{isRtl ? "اسم المستند *" : "Document Name *"}</Label>
          <Input className="h-8 text-sm" value={uploadForm.titleAr}
            onChange={e => setUploadForm(f => ({ ...f, titleAr: e.target.value }))}
            placeholder={isRtl ? "مثال: مخطط الموقع 2025" : "e.g. Site Drawing 2025"} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{isRtl ? "التصنيف" : "Category"}</Label>
          <select className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
            value={uploadForm.category} onChange={e => setUploadForm(f => ({ ...f, category: e.target.value }))}>
            {DOC_CATEGORIES.map(c => (
              <option key={c.id} value={c.id}>{isRtl ? c.arLabel : c.enLabel}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{isRtl ? "الاسم بالإنجليزي" : "English Name"}</Label>
          <Input className="h-8 text-sm" value={uploadForm.titleEn}
            onChange={e => setUploadForm(f => ({ ...f, titleEn: e.target.value }))}
            placeholder="Optional" />
        </div>
      </div>

      <div
        className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/3 transition-colors"
        onClick={() => fileInputRef.current?.click()}
      >
        {selectedFile ? (
          <div className="flex items-center justify-center gap-2 text-sm">
            <FileText className="w-4 h-4 text-primary" />
            <span className="font-medium text-foreground">{selectedFile.name}</span>
            <span className="text-muted-foreground text-xs">({formatFileSize(selectedFile.size)})</span>
          </div>
        ) : (
          <>
            <Upload className="w-5 h-5 text-muted-foreground mx-auto mb-1.5" />
            <p className="text-xs text-muted-foreground">
              {isRtl ? "انقر لاختيار ملف (PDF، صورة، Excel، Word...)" : "Click to select file (PDF, Image, Excel, Word...)"}
            </p>
            <p className="text-[10px] text-muted-foreground/70 mt-1">{isRtl ? "الحد الأقصى: 15 MB" : "Max: 15 MB"}</p>
          </>
        )}
      </div>
      <input ref={fileInputRef} type="file" className="hidden"
        accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.xlsx,.xls,.docx,.doc,.dwg,.dxf,.csv,.zip,.rar,.mp4,.mp3,.txt"
        onChange={handleFileSelect} />
      <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
        <input type="checkbox" className="h-3.5 w-3.5 accent-primary"
          checked={uploadForm.clientVisible}
          onChange={e => setUploadForm(f => ({ ...f, clientVisible: e.target.checked }))} />
        <span className="text-muted-foreground">
          {isRtl ? "ظاهر للعميل في البوابة" : "Visible to client in portal"}
        </span>
      </label>
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setShowUploadForm(null); setSelectedFile(null); }}>
          {isRtl ? "إلغاء" : "Cancel"}
        </Button>
        <Button size="sm" className="h-7 text-xs" onClick={() => handleUpload(scope)} disabled={uploading || !selectedFile}>
          {uploading ? <Loader2 className="w-3 h-3 animate-spin me-1" /> : <Upload className="w-3 h-3 me-1" />}
          {isRtl ? "رفع" : "Upload"}
        </Button>
      </div>
    </div>
  );

  const renderDocList = (docs: CrmDocument[], scope: "contact" | "deal") => (
    <div className="space-y-2">
      {docs.map(doc => {
        const CatIcon = getCategoryIcon(doc.category);
        const isImage = doc.mimeType?.startsWith("image/");
        const isPdf = doc.mimeType === "application/pdf";
        return (
          <div key={doc.id}
            className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-card hover:bg-secondary/30 transition-colors group">
            <div className={cn(
              "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
              isPdf ? "bg-red-100 dark:bg-red-900/30 text-red-600" :
              isImage ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600" :
              "bg-secondary text-muted-foreground"
            )}>
              <CatIcon className="w-4.5 h-4.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{doc.titleAr}</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-[10px] bg-secondary/80 text-muted-foreground px-1.5 py-0.5 rounded-full">
                  {getCategoryLabel(doc.category, isRtl)}
                </span>
                {doc.folder === "portal-upload" && (
                  <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 px-1.5 py-0.5 rounded-full">
                    {isRtl ? "رفع العميل" : "Client upload"}
                  </span>
                )}
                {doc.clientVisible === false ? (
                  <span className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 px-1.5 py-0.5 rounded-full">
                    {isRtl ? "مخفي عن العميل" : "Hidden"}
                  </span>
                ) : (
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 px-1.5 py-0.5 rounded-full">
                    {isRtl ? "ظاهر للعميل" : "Visible"}
                  </span>
                )}
                {doc.originalName && (
                  <span className="text-[10px] text-muted-foreground/70 truncate">{doc.originalName}</span>
                )}
                <span className="text-[10px] text-muted-foreground/60 ms-auto shrink-0">{formatFileSize(doc.fileSize)}</span>
              </div>
              <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                {doc.uploadedByName} • {new Date(doc.createdAt).toLocaleDateString(isRtl ? "ar-SA" : "en-US", { year: "numeric", month: "short", day: "numeric" })}
              </p>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <Button variant="ghost" size="icon"
                className={cn("h-7 w-7", doc.clientVisible === false ? "text-amber-600 hover:text-amber-700" : "text-emerald-600 hover:text-emerald-700")}
                title={doc.clientVisible === false ? (isRtl ? "إظهار للعميل" : "Show to client") : (isRtl ? "إخفاء عن العميل" : "Hide from client")}
                onClick={() => handleToggleVisible(doc, scope)}>
                {doc.clientVisible === false ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </Button>
              {(isImage || isPdf) && (
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-blue-600"
                  title={isRtl ? "معاينة" : "Preview"} onClick={() => handlePreview(doc)}>
                  <Eye className="w-3.5 h-3.5" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary"
                title={isRtl ? "تحميل" : "Download"} onClick={() => handleDownload(doc)}>
                <Download className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-600"
                title={isRtl ? "حذف" : "Delete"} onClick={() => handleDelete(doc.id, scope)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        );
      })}
      {docs.length === 0 && !loadingDocs && (
        <div className="text-center py-10">
          <FolderOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground/60">
            {isRtl ? "لا توجد مستندات بعد" : "No documents yet"}
          </p>
          <p className="text-xs text-muted-foreground/40 mt-1">
            {isRtl ? "ارفع مستندات للشركة مثل المخططات والدراسات والتقارير" : "Upload drawings, studies, reports and more"}
          </p>
        </div>
      )}
      {loadingDocs && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );

  const stage = deal?.stage || "new";
  const stageMeta = STAGE_META[stage] || STAGE_META.new;

  return (
    <Sheet open={!!deal} onOpenChange={o => { if (!o) onClose(); }}>
      <SheetContent
        side={isRtl ? "right" : "left"}
        className="w-full sm:max-w-lg p-0 flex flex-col"
        dir={dir}
      >
        {deal && (
          <>
            {/* ─── Header ─────────────────────────────────────────── */}
            <div className="p-5 border-b border-border/50 bg-card/80 shrink-0">
              <div className="flex items-start gap-3">
                <div className={cn(
                  "w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-sm shrink-0",
                  avatarColor(clientName)
                )}>
                  {clientName !== (isRtl ? "عميل غير محدد" : "Unknown")
                    ? initials(clientName)
                    : <Building2 className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <SheetTitle className="text-base font-bold leading-tight">{clientName}</SheetTitle>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{dealTitle}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <Badge className={cn("text-xs font-medium border-0", stageMeta.color)}>
                      {isRtl ? stageMeta.label : stageMeta.labelEn}
                    </Badge>
                    {deal.priority === "high" && (
                      <Badge variant="outline" className="text-[10px] border-red-300 text-red-600 dark:border-red-700 dark:text-red-400">
                        {isRtl ? "⭐⭐⭐ عالية" : "⭐⭐⭐ High Priority"}
                      </Badge>
                    )}
                    <span className="text-sm font-bold text-primary ms-auto">
                      {formatValue(deal.value, deal.currency)}
                    </span>
                  </div>
                </div>
              </div>
              {onCreateProposal && (
                <Button size="sm" className="w-full mt-3 h-8 text-xs" variant="outline"
                  onClick={() => onCreateProposal(deal, customer)}>
                  <FileText className="w-3.5 h-3.5 me-1.5" />
                  {isRtl ? "إنشاء عرض سعر" : "Create Proposal"}
                </Button>
              )}
            </div>

            {/* ─── Tabs ────────────────────────────────────────────── */}
            <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col min-h-0">
              <TabsList className="w-full rounded-none border-b border-border/50 bg-transparent h-10 px-4 shrink-0 justify-start gap-1">
                <TabsTrigger value="details" className="text-xs h-8 px-3 data-[state=active]:bg-secondary rounded-lg">
                  {isRtl ? "التفاصيل" : "Details"}
                </TabsTrigger>
                <TabsTrigger value="contact-docs" className="text-xs h-8 px-3 data-[state=active]:bg-secondary rounded-lg relative"
                  onClick={() => { if (tab !== "contact-docs") fetchDocs(); }}>
                  {isRtl ? "مستندات الشركة" : "Company Docs"}
                  {contactDocs.length > 0 && (
                    <span className="ms-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                      {contactDocs.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="deal-docs" className="text-xs h-8 px-3 data-[state=active]:bg-secondary rounded-lg relative"
                  onClick={() => { if (tab !== "deal-docs") fetchDocs(); }}>
                  {isRtl ? "مستندات الصفقة" : "Deal Docs"}
                  {dealDocs.length > 0 && (
                    <span className="ms-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                      {dealDocs.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* ── Details Tab ───────────────────────────────── */}
              <TabsContent value="details" className="flex-1 overflow-auto m-0">
                <ScrollArea className="h-full">
                  <div className="p-5 space-y-4">
                    {/* Customer info */}
                    {customer && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {isRtl ? "بيانات الشركة / العميل" : "Company / Client Info"}
                        </p>
                        <div className="rounded-xl border border-border/60 bg-secondary/20 divide-y divide-border/40">
                          {customer.organization && (
                            <div className="flex items-center gap-3 px-3 py-2">
                              <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                              <span className="text-sm">{customer.organization}</span>
                            </div>
                          )}
                          {customer.phone && (
                            <div className="flex items-center gap-3 px-3 py-2">
                              <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                              <span className="text-sm font-mono" dir="ltr">{customer.phone}</span>
                            </div>
                          )}
                          {customer.email && (
                            <div className="flex items-center gap-3 px-3 py-2">
                              <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                              <span className="text-sm">{customer.email}</span>
                            </div>
                          )}
                          {customer.city && (
                            <div className="flex items-center gap-3 px-3 py-2">
                              <span className="text-muted-foreground shrink-0 text-sm">📍</span>
                              <span className="text-sm">{customer.city}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <Separator />

                    {/* Deal info */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {isRtl ? "بيانات الفرصة" : "Deal Information"}
                      </p>
                      <div className="rounded-xl border border-border/60 bg-secondary/20 divide-y divide-border/40">
                        <div className="flex items-center justify-between px-3 py-2">
                          <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <DollarSign className="w-4 h-4" />
                            {isRtl ? "القيمة" : "Value"}
                          </div>
                          <span className="font-bold text-primary text-sm">{formatValue(deal.value, deal.currency)}</span>
                        </div>
                        {deal.expectedClose && (
                          <div className="flex items-center justify-between px-3 py-2">
                            <div className="flex items-center gap-2 text-muted-foreground text-sm">
                              <Calendar className="w-4 h-4" />
                              {isRtl ? "تاريخ الإغلاق" : "Close Date"}
                            </div>
                            <span className="text-sm">{new Date(deal.expectedClose).toLocaleDateString(isRtl ? "ar-SA" : "en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
                          </div>
                        )}
                        {assignedUser && (
                          <div className="flex items-center justify-between px-3 py-2">
                            <div className="flex items-center gap-2 text-muted-foreground text-sm">
                              <User className="w-4 h-4" />
                              {isRtl ? "المسؤول" : "Assigned To"}
                            </div>
                            <span className="text-sm font-medium">{assignedUser.name}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {deal.nextAction && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {isRtl ? "الإجراء التالي" : "Next Action"}
                          </p>
                          <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-900/10 px-3 py-2.5 text-sm">
                            {deal.nextAction}
                          </div>
                        </div>
                      </>
                    )}

                    {deal.notes && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {isRtl ? "ملاحظات" : "Notes"}
                          </p>
                          <div className="rounded-xl border border-border/60 bg-secondary/20 px-3 py-2.5 text-sm text-muted-foreground leading-relaxed">
                            {deal.notes}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* ── Company Docs Tab ──────────────────────────── */}
              <TabsContent value="contact-docs" className="flex-1 overflow-auto m-0">
                <ScrollArea className="h-full">
                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">{isRtl ? "مستندات الشركة" : "Company Documents"}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {isRtl
                            ? "مشتركة بين جميع صفقات هذا العميل"
                            : "Shared across all deals for this client"}
                        </p>
                      </div>
                      {deal.contactId && (
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                          onClick={() => setShowUploadForm(showUploadForm === "contact" ? null : "contact")}>
                          <Plus className="w-3 h-3" />
                          {isRtl ? "إضافة" : "Add"}
                        </Button>
                      )}
                    </div>
                    {!deal.contactId && (
                      <div className="text-center py-8 text-sm text-muted-foreground/70">
                        <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        {isRtl ? "لا يوجد عميل مرتبط بهذه الصفقة" : "No client linked to this deal"}
                      </div>
                    )}
                    {deal.contactId && showUploadForm === "contact" && renderUploadForm("contact")}
                    {deal.contactId && renderDocList(contactDocs, "contact")}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* ── Deal Docs Tab ────────────────────────────── */}
              <TabsContent value="deal-docs" className="flex-1 overflow-auto m-0">
                <ScrollArea className="h-full">
                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">{isRtl ? "مستندات الصفقة" : "Deal Documents"}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {isRtl
                            ? "خاصة بهذه الفرصة فقط"
                            : "Specific to this deal only"}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                        onClick={() => setShowUploadForm(showUploadForm === "deal" ? null : "deal")}>
                        <Plus className="w-3 h-3" />
                        {isRtl ? "إضافة" : "Add"}
                      </Button>
                    </div>
                    {showUploadForm === "deal" && renderUploadForm("deal")}
                    {renderDocList(dealDocs, "deal")}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
