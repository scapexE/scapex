import { useState, useEffect, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Plus, Search, Folder, Download, Lock, Globe, Edit, Trash2, File, FileImage, FileSpreadsheet, Link as LinkIcon, Users, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

interface Doc {
  id: number;
  titleAr: string;
  titleEn: string | null;
  docNo: string | null;
  category: string | null;
  folder: string | null;
  status: string | null;
  version: number | null;
  accessLevel: string | null;
  tags: string[];
  description: string | null;
  uploadedBy: string | null;
  uploadedByName: string | null;
  fileSize: number | null;
  projectId: number | null;
  companyId: number | null;
  createdAt: string;
}

interface FormState {
  titleAr: string; titleEn: string; category: string; folder: string;
  status: string; version: string; accessLevel: string; description: string;
  tags: string;
}

const EMPTY_FORM: FormState = {
  titleAr: "", titleEn: "", category: "general", folder: "root",
  status: "draft", version: "1", accessLevel: "internal", description: "", tags: "",
};

const CATS = [
  { id: "contracts", ar: "عقود", en: "Contracts", link: "/sales" },
  { id: "hr", ar: "الموارد البشرية", en: "HR Documents", link: "/hr" },
  { id: "legal", ar: "قانونية", en: "Legal", link: null },
  { id: "financial", ar: "مالية", en: "Financial", link: "/accounting" },
  { id: "hse", ar: "السلامة", en: "HSE", link: "/hse" },
  { id: "crm", ar: "علاقات العملاء", en: "CRM", link: "/crm" },
  { id: "general", ar: "عامة", en: "General", link: null },
];

const FOLDERS = [
  { id: "root", ar: "الرئيسية", en: "Root" },
  { id: "projects", ar: "المشاريع", en: "Projects" },
  { id: "clients", ar: "العملاء", en: "Clients" },
  { id: "internal", ar: "داخلية", en: "Internal" },
  { id: "legal", ar: "قانونية", en: "Legal" },
];

const ACCESS_OPTS = [
  { id: "public", ar: "عام", en: "Public" },
  { id: "internal", ar: "داخلي", en: "Internal" },
  { id: "restricted", ar: "مقيد", en: "Restricted" },
  { id: "private", ar: "خاص", en: "Private" },
];

const STATUS_OPTS = [
  { id: "draft", ar: "مسودة", en: "Draft" },
  { id: "active", ar: "نشط", en: "Active" },
  { id: "archived", ar: "مؤرشف", en: "Archived" },
];

function catLabel(id: string, isRtl: boolean) {
  const c = CATS.find((x) => x.id === id);
  return c ? (isRtl ? c.ar : c.en) : id;
}
function folderLabel(id: string, isRtl: boolean) {
  const f = FOLDERS.find((x) => x.id === id);
  return f ? (isRtl ? f.ar : f.en) : id;
}
function accessLabel(id: string, isRtl: boolean) {
  const a = ACCESS_OPTS.find((x) => x.id === id);
  return a ? (isRtl ? a.ar : a.en) : id;
}
function statusLabel(id: string, isRtl: boolean) {
  const s = STATUS_OPTS.find((x) => x.id === id);
  return s ? (isRtl ? s.ar : s.en) : id;
}

export default function DMSModule() {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";
  const { toast } = useToast();

  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [folderFilter, setFolderFilter] = useState("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editDoc, setEditDoc] = useState<Doc | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchDocs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (catFilter !== "all") params.set("category", catFilter);
      if (folderFilter !== "all") params.set("folder", folderFilter);
      const res = await fetch(`/api/documents?${params}`);
      if (res.ok) setDocs(await res.json());
    } catch {
      toast({ title: isRtl ? "خطأ في تحميل المستندات" : "Error loading documents", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [catFilter, folderFilter, isRtl, toast]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const filtered = docs.filter((d) => {
    const q = search.toLowerCase();
    return !q || (d.titleAr || "").includes(q) || (d.titleEn || "").toLowerCase().includes(q) || (d.docNo || "").toLowerCase().includes(q);
  });

  const stats = {
    total: docs.length,
    active: docs.filter((d) => d.status === "active").length,
    draft: docs.filter((d) => d.status === "draft").length,
    restricted: docs.filter((d) => d.accessLevel === "restricted" || d.accessLevel === "private").length,
  };

  const openAdd = () => {
    setEditDoc(null);
    setForm(EMPTY_FORM);
    setShowDialog(true);
  };

  const openEdit = (d: Doc) => {
    setEditDoc(d);
    setForm({
      titleAr: d.titleAr,
      titleEn: d.titleEn || "",
      category: d.category || "general",
      folder: d.folder || "root",
      status: d.status || "draft",
      version: String(d.version || 1),
      accessLevel: d.accessLevel || "internal",
      description: d.description || "",
      tags: Array.isArray(d.tags) ? d.tags.join(", ") : "",
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.titleAr.trim()) {
      toast({ title: isRtl ? "اسم الوثيقة مطلوب" : "Document title required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const body = {
        titleAr: form.titleAr,
        titleEn: form.titleEn || null,
        category: form.category,
        folder: form.folder,
        status: form.status,
        version: Number(form.version) || 1,
        accessLevel: form.accessLevel,
        description: form.description || null,
        tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      };
      let res: Response;
      if (editDoc) {
        res = await fetch(`/api/documents/${editDoc.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      } else {
        res = await fetch("/api/documents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      }
      if (!res.ok) throw new Error();
      toast({ title: isRtl ? "تم الحفظ بنجاح" : "Saved successfully" });
      setShowDialog(false);
      await fetchDocs();
    } catch {
      toast({ title: isRtl ? "فشل الحفظ" : "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast({ title: isRtl ? "تم الحذف" : "Deleted" });
      setDocs((prev) => prev.filter((d) => d.id !== id));
    } catch {
      toast({ title: isRtl ? "فشل الحذف" : "Delete failed", variant: "destructive" });
    }
  };

  const getFileIcon = (d: Doc) => {
    const cat = d.category || "";
    if (cat === "financial" || cat === "hr") return FileSpreadsheet;
    if (cat === "engineering") return FileImage;
    return File;
  };

  const f = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));

  return (
    <MainLayout>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{isRtl ? "إدارة المستندات (DMS)" : "Document Management"}</h1>
            <p className="text-muted-foreground text-sm mt-1">{isRtl ? "تخزين الوثائق والإصدارات وصلاحيات الوصول في قاعدة البيانات" : "Document storage, versioning, and access control — stored in database"}</p>
          </div>
          <Button size="sm" onClick={openAdd} data-testid="button-add-document">
            <Plus className="w-4 h-4 me-1.5" />{isRtl ? "وثيقة جديدة" : "New Document"}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: isRtl ? "إجمالي الوثائق" : "Total Documents", value: stats.total, icon: FileText, color: "text-blue-500" },
            { label: isRtl ? "نشطة" : "Active", value: stats.active, icon: File, color: "text-emerald-500" },
            { label: isRtl ? "مسودات" : "Drafts", value: stats.draft, icon: Edit, color: "text-amber-500" },
            { label: isRtl ? "سرية / مقيدة" : "Restricted", value: stats.restricted, icon: Lock, color: "text-purple-500" },
          ].map((s, i) => (
            <Card key={i} className="border-border/50"><CardContent className="p-4 flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-xl bg-secondary flex items-center justify-center", s.color)}><s.icon className="w-5 h-5" /></div>
              <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-xl font-bold">{s.value}</p></div>
            </CardContent></Card>
          ))}
        </div>

        {/* Cross-module quick links */}
        <div className="flex flex-wrap gap-2">
          {CATS.filter((c) => c.link).map((c) => (
            <Link key={c.id} href={c.link!}>
              <div
                className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/50 bg-secondary/30 hover:bg-secondary/60 transition-colors cursor-pointer text-xs",
                  catFilter === c.id && "border-primary/50 bg-primary/10 text-primary")}
                onClick={() => setCatFilter(catFilter === c.id ? "all" : c.id)}
              >
                <LinkIcon className="w-3 h-3" />
                {isRtl ? c.ar : c.en}
              </div>
            </Link>
          ))}
        </div>

        <Tabs defaultValue="docs">
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="docs">{isRtl ? "الوثائق" : "Documents"}</TabsTrigger>
            <TabsTrigger value="folders">{isRtl ? "المجلدات" : "Folders"}</TabsTrigger>
            <TabsTrigger value="linked">{isRtl ? "الروابط المتقاطعة" : "Cross Links"}</TabsTrigger>
          </TabsList>

          <TabsContent value="docs" className="mt-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground", isRtl ? "right-3" : "left-3")} />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={isRtl ? "بحث..." : "Search..."} className={cn("h-9 bg-secondary/30", isRtl ? "pr-9" : "pl-9")} />
              </div>
              <Select value={catFilter} onValueChange={setCatFilter}>
                <SelectTrigger className="w-44 h-9 bg-secondary/30"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRtl ? "كل الفئات" : "All Categories"}</SelectItem>
                  {CATS.map((c) => <SelectItem key={c.id} value={c.id}>{isRtl ? c.ar : c.en}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={folderFilter} onValueChange={setFolderFilter}>
                <SelectTrigger className="w-36 h-9 bg-secondary/30"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRtl ? "كل المجلدات" : "All Folders"}</SelectItem>
                  {FOLDERS.map((f) => <SelectItem key={f.id} value={f.id}>{isRtl ? f.ar : f.en}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <Card className="border-border/50 overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/40">
                    <TableRow>
                      <TableHead>{isRtl ? "الوثيقة" : "Document"}</TableHead>
                      <TableHead>{isRtl ? "رقم الوثيقة" : "Doc No."}</TableHead>
                      <TableHead>{isRtl ? "الفئة" : "Category"}</TableHead>
                      <TableHead>{isRtl ? "المجلد" : "Folder"}</TableHead>
                      <TableHead>{isRtl ? "الإصدار" : "Version"}</TableHead>
                      <TableHead>{isRtl ? "رُفع بواسطة" : "Uploaded By"}</TableHead>
                      <TableHead>{isRtl ? "الوصول" : "Access"}</TableHead>
                      <TableHead>{isRtl ? "الحالة" : "Status"}</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">{isRtl ? "جارٍ التحميل..." : "Loading..."}</TableCell></TableRow>
                    ) : filtered.length === 0 ? (
                      <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p>{isRtl ? "لا توجد وثائق" : "No documents yet"}</p>
                        <Button size="sm" variant="outline" className="mt-2" onClick={openAdd}>{isRtl ? "أضف وثيقة" : "Add document"}</Button>
                      </TableCell></TableRow>
                    ) : filtered.map((doc) => {
                      const Icon = getFileIcon(doc);
                      return (
                        <TableRow key={doc.id} className="hover:bg-muted/40" data-testid={`row-doc-${doc.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Icon className="w-4 h-4 text-primary" /></div>
                              <div>
                                <p className="font-medium text-sm">{isRtl ? doc.titleAr : (doc.titleEn || doc.titleAr)}</p>
                                {doc.description && <p className="text-xs text-muted-foreground truncate max-w-[180px]">{doc.description}</p>}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell><span className="text-xs font-mono text-muted-foreground">{doc.docNo || `DOC-${doc.id}`}</span></TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Badge variant="outline" className="text-xs">{catLabel(doc.category || "general", isRtl)}</Badge>
                              {CATS.find((c) => c.id === doc.category)?.link && (
                                <Link href={CATS.find((c) => c.id === doc.category)!.link!}>
                                  <div className="text-muted-foreground hover:text-primary cursor-pointer"><LinkIcon className="w-3 h-3" /></div>
                                </Link>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            <div className="flex items-center gap-1"><Folder className="w-3 h-3" />{folderLabel(doc.folder || "root", isRtl)}</div>
                          </TableCell>
                          <TableCell><Badge variant="secondary" className="text-xs font-mono">v{doc.version || 1}</Badge></TableCell>
                          <TableCell className="text-sm">{doc.uploadedByName || doc.uploadedBy || "—"}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-xs">
                              {doc.accessLevel === "public" ? <Globe className="w-3 h-3 text-emerald-500" /> : <Lock className="w-3 h-3 text-amber-500" />}
                              <span className={doc.accessLevel === "public" ? "text-emerald-600" : doc.accessLevel === "internal" ? "text-blue-600" : "text-amber-600"}>
                                {accessLabel(doc.accessLevel || "internal", isRtl)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={doc.status === "active" ? "default" : "secondary"} className={doc.status === "active" ? "bg-emerald-500 text-white text-xs" : "text-xs"}>
                              {statusLabel(doc.status || "draft", isRtl)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(doc)} data-testid={`button-edit-doc-${doc.id}`}><Edit className="w-3.5 h-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(doc.id)} data-testid={`button-delete-doc-${doc.id}`}><Trash2 className="w-3.5 h-3.5" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="folders" className="mt-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {FOLDERS.map((f) => {
                const count = docs.filter((d) => d.folder === f.id).length;
                return (
                  <Card key={f.id} className="border-border/50 hover:border-primary/30 transition-colors cursor-pointer" onClick={() => { setFolderFilter(f.id); }}>
                    <CardContent className="p-5 text-center">
                      <Folder className="w-10 h-10 text-amber-500 mx-auto mb-2" />
                      <p className="font-semibold text-sm">{isRtl ? f.ar : f.en}</p>
                      <p className="text-xs text-muted-foreground mt-1">{count} {isRtl ? "وثيقة" : "documents"}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="linked" className="mt-4">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { icon: Users, label: isRtl ? "الموارد البشرية" : "HR Documents", cat: "hr", link: "/hr", count: docs.filter((d) => d.category === "hr").length, color: "text-purple-500" },
                { icon: Briefcase, label: isRtl ? "عقود العملاء" : "Client Contracts", cat: "contracts", link: "/sales", count: docs.filter((d) => d.category === "contracts").length, color: "text-blue-500" },
                { icon: FileSpreadsheet, label: isRtl ? "التقارير المالية" : "Financial Reports", cat: "financial", link: "/accounting", count: docs.filter((d) => d.category === "financial").length, color: "text-rose-500" },
                { icon: Lock, label: isRtl ? "وثائق السلامة (HSE)" : "HSE Documents", cat: "hse", link: "/hse", count: docs.filter((d) => d.category === "hse").length, color: "text-orange-500" },
              ].map((item) => (
                <Card key={item.cat} className="border-border/50 hover:border-primary/30 transition-colors">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0", item.color)}>
                      <item.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.count} {isRtl ? "وثيقة" : "documents"}</p>
                    </div>
                    <Link href={item.link}>
                      <div className="flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer">
                        <LinkIcon className="w-3 h-3" />{isRtl ? "فتح" : "Open"}
                      </div>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editDoc ? (isRtl ? "تعديل الوثيقة" : "Edit Document") : (isRtl ? "وثيقة جديدة" : "New Document")}</DialogTitle>
            <DialogDescription>{isRtl ? "أدخل بيانات الوثيقة" : "Enter document details"}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2">
              <Label className="text-xs font-semibold">{isRtl ? "العنوان (عربي) *" : "Title (Arabic) *"}</Label>
              <Input className="mt-1 h-8 text-sm" value={form.titleAr} onChange={f("titleAr")} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs font-semibold">{isRtl ? "العنوان (إنجليزي)" : "Title (English)"}</Label>
              <Input className="mt-1 h-8 text-sm" value={form.titleEn} onChange={f("titleEn")} />
            </div>
            <div>
              <Label className="text-xs font-semibold">{isRtl ? "الفئة" : "Category"}</Label>
              <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}>
                <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{CATS.map((c) => <SelectItem key={c.id} value={c.id}>{isRtl ? c.ar : c.en}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold">{isRtl ? "المجلد" : "Folder"}</Label>
              <Select value={form.folder} onValueChange={(v) => setForm((p) => ({ ...p, folder: v }))}>
                <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{FOLDERS.map((fl) => <SelectItem key={fl.id} value={fl.id}>{isRtl ? fl.ar : fl.en}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold">{isRtl ? "الحالة" : "Status"}</Label>
              <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
                <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS_OPTS.map((s) => <SelectItem key={s.id} value={s.id}>{isRtl ? s.ar : s.en}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold">{isRtl ? "صلاحية الوصول" : "Access Level"}</Label>
              <Select value={form.accessLevel} onValueChange={(v) => setForm((p) => ({ ...p, accessLevel: v }))}>
                <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{ACCESS_OPTS.map((a) => <SelectItem key={a.id} value={a.id}>{isRtl ? a.ar : a.en}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold">{isRtl ? "رقم الإصدار" : "Version"}</Label>
              <Input className="mt-1 h-8 text-sm" type="number" min={1} value={form.version} onChange={f("version")} />
            </div>
            <div>
              <Label className="text-xs font-semibold">{isRtl ? "الوسوم (مفصولة بفاصلة)" : "Tags (comma separated)"}</Label>
              <Input className="mt-1 h-8 text-sm" value={form.tags} onChange={f("tags")} placeholder="tag1, tag2" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs font-semibold">{isRtl ? "الوصف" : "Description"}</Label>
              <Input className="mt-1 h-8 text-sm" value={form.description} onChange={f("description")} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>{isRtl ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? (isRtl ? "جارٍ الحفظ..." : "Saving...") : (isRtl ? "حفظ" : "Save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
