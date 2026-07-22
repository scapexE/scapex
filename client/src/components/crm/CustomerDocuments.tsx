import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { scopedFetch } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import {
  Building2, Briefcase, Upload, Download, Trash2, Loader2, FileText, FolderOpen,
} from "lucide-react";
import type { ApiProject } from "@/lib/projectsApi";

const MAX_FILE_BYTES = 15 * 1024 * 1024;

export interface CustomerDoc {
  id: number;
  titleAr: string;
  titleEn: string | null;
  docNo: string | null;
  category: string | null;
  type: string | null;
  contactId: number | null;
  projectId: number | null;
  dealId: number | null;
  originalName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  hasFile: boolean;
  uploadedByName: string | null;
  createdAt: string | null;
}

const DOC_TYPES: { value: string; ar: string; en: string }[] = [
  { value: "general", ar: "عام", en: "General" },
  { value: "invoice", ar: "فاتورة", en: "Invoice" },
  { value: "proposal", ar: "عرض سعر", en: "Proposal" },
  { value: "contract", ar: "عقد", en: "Contract" },
  { value: "study", ar: "دراسة", en: "Study" },
  { value: "drawing", ar: "مخطط", en: "Drawing" },
  { value: "license", ar: "سجل / رخصة", en: "License / CR" },
  { value: "correspondence", ar: "مراسلات", en: "Correspondence" },
];

// Fetch the file through the authenticated fetch wrapper (adds x-session-token)
// then open/download it via a blob URL — direct window.open would 401.
async function openDocumentFile(id: number, filename?: string | null) {
  try {
    const res = await scopedFetch(`/api/documents/${id}/file`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "document";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch {}
}

function fmtSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CustomerDocuments({
  contactId, customerName, projects, isRtl, onCountChange,
}: {
  contactId: number;
  customerName: string;
  projects: ApiProject[];
  isRtl: boolean;
  onCountChange?: (n: number) => void;
}) {
  const { toast } = useToast();
  const [docs, setDocs] = useState<CustomerDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Upload form state
  const [upTitle, setUpTitle] = useState("");
  const [upScope, setUpScope] = useState<string>("company"); // "company" | project id
  const [upType, setUpType] = useState("general");
  const [upFile, setUpFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    setLoading(true);
    scopedFetch(`/api/documents?contactId=${contactId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: CustomerDoc[]) => {
        const list = Array.isArray(rows) ? rows : [];
        setDocs(list);
        onCountChange?.(list.length);
      })
      .catch(() => setDocs([]))
      .finally(() => setLoading(false));
  }, [contactId, onCountChange]);

  useEffect(() => { load(); }, [load]);

  const companyDocs = docs.filter((d) => d.projectId == null && d.dealId == null);
  const dealDocs = docs.filter((d) => d.projectId == null && d.dealId != null);
  const byProject = new Map<number, CustomerDoc[]>();
  for (const d of docs) {
    if (d.projectId != null) {
      if (!byProject.has(d.projectId)) byProject.set(d.projectId, []);
      byProject.get(d.projectId)!.push(d);
    }
  }

  const projectName = (pid: number) => {
    const p = projects.find((x) => x.id === pid);
    if (!p) return isRtl ? `مشروع #${pid}` : `Project #${pid}`;
    return isRtl ? (p.nameAr || p.nameEn || `#${pid}`) : (p.nameEn || p.nameAr || `#${pid}`);
  };

  const resetUpload = () => {
    setUpTitle(""); setUpScope("company"); setUpType("general"); setUpFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUpload = async () => {
    if (!upTitle.trim()) {
      toast({ title: isRtl ? "عنوان المستند مطلوب" : "Document title is required", variant: "destructive" });
      return;
    }
    if (!upFile) {
      toast({ title: isRtl ? "يرجى اختيار ملف" : "Please choose a file", variant: "destructive" });
      return;
    }
    if (upFile.size > MAX_FILE_BYTES) {
      toast({ title: isRtl ? "حجم الملف يتجاوز 15 ميجابايت" : "File exceeds the 15MB limit", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(upFile);
      });
      const body: Record<string, unknown> = {
        titleAr: upTitle.trim(),
        type: upType,
        category: upType,
        status: "active",
        contactId,
        fileUrl: dataUrl,
        fileSize: upFile.size,
        mimeType: upFile.type || null,
        originalName: upFile.name,
        description: isRtl ? `مستند عميل: ${customerName}` : `Customer document: ${customerName}`,
      };
      if (upScope !== "company") body.projectId = Number(upScope);
      const r = await scopedFetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || "upload failed");
      }
      toast({ title: isRtl ? "تم رفع المستند" : "Document uploaded" });
      setUploadOpen(false);
      resetUpload();
      load();
    } catch (e: any) {
      toast({ title: isRtl ? "تعذر رفع المستند" : "Upload failed", description: e?.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId == null) return;
    try {
      const r = await scopedFetch(`/api/documents/${deleteId}`, { method: "DELETE" });
      if (!r.ok) throw new Error();
      toast({ title: isRtl ? "تم حذف المستند" : "Document deleted" });
      setDocs((prev) => {
        const next = prev.filter((d) => d.id !== deleteId);
        onCountChange?.(next.length);
        return next;
      });
    } catch {
      toast({ title: isRtl ? "تعذر حذف المستند" : "Failed to delete", variant: "destructive" });
    } finally {
      setDeleteId(null);
    }
  };

  const DocRow = ({ d }: { d: CustomerDoc }) => {
    const typeMeta = DOC_TYPES.find((t) => t.value === (d.type || d.category));
    return (
      <div
        className="flex items-center gap-3 border border-border/50 rounded-lg px-3 py-2.5 bg-card hover:border-primary/30 transition-colors"
        data-testid={`row-customer-doc-${d.id}`}
      >
        <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{d.titleAr || d.titleEn}</p>
          <p className="text-[11px] text-muted-foreground truncate">
            {[d.docNo, fmtSize(d.fileSize), d.uploadedByName].filter(Boolean).join(" · ")}
          </p>
        </div>
        {typeMeta && (
          <Badge variant="secondary" className="text-[10px] shrink-0">
            {isRtl ? typeMeta.ar : typeMeta.en}
          </Badge>
        )}
        {d.hasFile && (
          <Button
            variant="ghost" size="icon" className="h-7 w-7 shrink-0"
            title={isRtl ? "تنزيل / عرض" : "Download / View"}
            onClick={() => openDocumentFile(d.id, d.originalName || d.titleAr)}
            data-testid={`button-download-doc-${d.id}`}
          >
            <Download className="w-3.5 h-3.5" />
          </Button>
        )}
        <Button
          variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-red-600"
          title={isRtl ? "حذف" : "Delete"}
          onClick={() => setDeleteId(d.id)}
          data-testid={`button-delete-doc-${d.id}`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {isRtl
            ? `${docs.length} مستند — مصدر واحد مشترك مع إدارة المستندات (بدون تكرار)`
            : `${docs.length} document(s) — shared with DMS (single source, no duplication)`}
        </p>
        <Button size="sm" className="gap-1.5" onClick={() => setUploadOpen(true)} data-testid="button-upload-customer-doc">
          <Upload className="w-3.5 h-3.5" />
          {isRtl ? "رفع مستند" : "Upload"}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          {/* Company-level documents */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              <h4 className="text-sm font-semibold">{isRtl ? "مستندات الشركة (عامة)" : "Company Documents (General)"}</h4>
              <Badge variant="secondary" className="text-[10px]">{companyDocs.length}</Badge>
            </div>
            {companyDocs.length === 0 ? (
              <p className="text-xs text-muted-foreground border border-dashed border-border/60 rounded-lg px-3 py-4 text-center">
                {isRtl ? "لا توجد مستندات عامة — مثل السجل التجاري وشهادة الضريبة" : "No general documents — e.g. CR, VAT certificate"}
              </p>
            ) : (
              <div className="space-y-2">{companyDocs.map((d) => <DocRow key={d.id} d={d} />)}</div>
            )}
          </div>

          {/* Sales pipeline (deal) documents */}
          {dealDocs.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-violet-600" />
                <h4 className="text-sm font-semibold">{isRtl ? "مستندات مسار المبيعات (الصفقات)" : "Sales Pipeline Documents (Deals)"}</h4>
                <Badge variant="secondary" className="text-[10px]">{dealDocs.length}</Badge>
              </div>
              <div className="space-y-2">{dealDocs.map((d) => <DocRow key={d.id} d={d} />)}</div>
            </div>
          )}

          {/* Per-project documents */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="w-4 h-4 text-emerald-600" />
              <h4 className="text-sm font-semibold">{isRtl ? "مستندات المشاريع" : "Project Documents"}</h4>
            </div>
            {projects.length === 0 && byProject.size === 0 ? (
              <p className="text-xs text-muted-foreground border border-dashed border-border/60 rounded-lg px-3 py-4 text-center">
                {isRtl ? "لا توجد مشاريع لهذا العميل بعد" : "No projects for this customer yet"}
              </p>
            ) : (
              <div className="space-y-3">
                {projects.map((p) => {
                  const list = byProject.get(p.id) || [];
                  return (
                    <div key={p.id} className="border border-border/40 rounded-xl p-3 bg-secondary/20">
                      <div className="flex items-center gap-2 mb-2">
                        <FolderOpen className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-xs font-semibold">{projectName(p.id)}</span>
                        <Badge variant="secondary" className="text-[10px]">{list.length}</Badge>
                      </div>
                      {list.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground px-1">
                          {isRtl ? "لا توجد مستندات لهذا المشروع" : "No documents for this project"}
                        </p>
                      ) : (
                        <div className="space-y-2">{list.map((d) => <DocRow key={d.id} d={d} />)}</div>
                      )}
                    </div>
                  );
                })}
                {/* Docs linked to projects not in the current list (e.g. archived) */}
                {[...byProject.keys()].filter((pid) => !projects.some((p) => p.id === pid)).map((pid) => (
                  <div key={pid} className="border border-border/40 rounded-xl p-3 bg-secondary/20">
                    <div className="flex items-center gap-2 mb-2">
                      <FolderOpen className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-xs font-semibold">{projectName(pid)}</span>
                    </div>
                    <div className="space-y-2">{byProject.get(pid)!.map((d) => <DocRow key={d.id} d={d} />)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Upload dialog */}
      <Dialog open={uploadOpen} onOpenChange={(v) => { setUploadOpen(v); if (!v) resetUpload(); }}>
        <DialogContent dir={isRtl ? "rtl" : "ltr"} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isRtl ? "رفع مستند جديد" : "Upload New Document"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{isRtl ? "عنوان المستند *" : "Document title *"}</Label>
              <Input value={upTitle} onChange={(e) => setUpTitle(e.target.value)} data-testid="input-doc-title" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{isRtl ? "النطاق" : "Scope"}</Label>
                <Select value={upScope} onValueChange={setUpScope}>
                  <SelectTrigger data-testid="select-doc-scope"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company">{isRtl ? "🏢 مستند شركة (عام)" : "🏢 Company (general)"}</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        📁 {isRtl ? (p.nameAr || p.nameEn) : (p.nameEn || p.nameAr)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{isRtl ? "النوع" : "Type"}</Label>
                <Select value={upType} onValueChange={setUpType}>
                  <SelectTrigger data-testid="select-doc-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DOC_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{isRtl ? t.ar : t.en}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{isRtl ? "الملف (حد أقصى 15MB) *" : "File (max 15MB) *"}</Label>
              <Input
                ref={fileInputRef}
                type="file"
                onChange={(e) => setUpFile(e.target.files?.[0] || null)}
                data-testid="input-doc-file"
              />
            </div>
          </div>
          <DialogFooter className={cn(isRtl && "flex-row-reverse")}>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>{isRtl ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={handleUpload} disabled={uploading} data-testid="button-confirm-upload">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isRtl ? "رفع" : "Upload")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteId != null} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent dir={isRtl ? "rtl" : "ltr"}>
          <AlertDialogHeader>
            <AlertDialogTitle>{isRtl ? "حذف المستند؟" : "Delete document?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isRtl
                ? "سيُحذف المستند نهائياً من النظام بالكامل (بطاقة العميل وإدارة المستندات) لأنه سجل واحد مشترك."
                : "The document will be permanently removed system-wide (customer card and DMS) since it is a single shared record."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isRtl ? "إلغاء" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700" data-testid="button-confirm-delete-doc">
              {isRtl ? "حذف" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
