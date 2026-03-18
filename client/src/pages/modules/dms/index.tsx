import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Plus, Search, Folder, Download, Eye, Upload, Lock, Globe, Edit, Trash2, File, FileImage, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Document {
  id: string; docNo: string; title: string; titleAr: string; category: string; folder: string;
  version: string; size: string; uploadedBy: string; uploadedAt: string;
  status: "active"|"archived"|"draft"; access: "public"|"private"|"restricted"; tags: string[];
}

const CATS = [{id:"contracts",ar:"عقود",en:"Contracts"},{id:"proposals",ar:"عروض أسعار",en:"Proposals"},{id:"engineering",ar:"وثائق هندسية",en:"Engineering"},{id:"hr",ar:"الموارد البشرية",en:"HR Documents"},{id:"legal",ar:"قانونية",en:"Legal"},{id:"financial",ar:"مالية",en:"Financial"},{id:"hse",ar:"السلامة",en:"HSE"},{id:"general",ar:"عامة",en:"General"}];
const FOLDERS = [{id:"root",ar:"الرئيسية",en:"Root"},{id:"projects",ar:"المشاريع",en:"Projects"},{id:"clients",ar:"العملاء",en:"Clients"},{id:"internal",ar:"داخلية",en:"Internal"}];

const SEED_DOCS: Document[] = [
  {id:"1",docNo:"DOC-2026-001",title:"Aramco Safety Inspection Contract",titleAr:"عقد تفتيش السلامة - أرامكو",category:"contracts",folder:"clients",version:"v2.1",size:"2.4 MB",uploadedBy:"سارة القحطاني",uploadedAt:"2026-03-01",status:"active",access:"restricted",tags:["عقد","أرامكو","سلامة"]},
  {id:"2",docNo:"DOC-2026-002",title:"Environmental Impact Assessment - Riyadh",titleAr:"دراسة الأثر البيئي - الرياض",category:"engineering",folder:"projects",version:"v1.0",size:"8.7 MB",uploadedBy:"أحمد الغامدي",uploadedAt:"2026-03-05",status:"active",access:"restricted",tags:["بيئة","رياض"]},
  {id:"3",docNo:"DOC-2026-003",title:"HSE Policy Manual 2026",titleAr:"دليل سياسة HSE 2026",category:"hse",folder:"internal",version:"v3.0",size:"1.2 MB",uploadedBy:"محمد الزهراني",uploadedAt:"2026-01-15",status:"active",access:"public",tags:["سلامة","سياسة"]},
  {id:"4",docNo:"DOC-2026-004",title:"Employee Handbook",titleAr:"دليل الموظف",category:"hr",folder:"internal",version:"v2.0",size:"3.1 MB",uploadedBy:"سارة القحطاني",uploadedAt:"2026-02-01",status:"active",access:"public",tags:["موارد بشرية"]},
  {id:"5",docNo:"DOC-2026-005",title:"Q1 Financial Report",titleAr:"التقرير المالي - الربع الأول",category:"financial",folder:"internal",version:"v1.0",size:"0.8 MB",uploadedBy:"فاطمة الشهري",uploadedAt:"2026-03-10",status:"draft",access:"private",tags:["مالية","تقارير"]},
];

const STORAGE_DMS = "scapex_documents";
function load<T>(k: string, s: T): T { try { const d=localStorage.getItem(k); return d?JSON.parse(d):s; } catch { return s; } }
function save(k: string, d: unknown) { localStorage.setItem(k,JSON.stringify(d)); }

export default function DMSModule() {
  const { dir } = useLanguage(); const isRtl = dir==="rtl";
  const { toast } = useToast();
  const [docs, setDocs] = useState<Document[]>(()=>load(STORAGE_DMS, SEED_DOCS));
  const [search, setSearch] = useState(""); const [catFilter, setCatFilter] = useState("all");
  const [showDialog, setShowDialog] = useState(false); const [editDoc, setEditDoc] = useState<Document|null>(null);
  const [form, setForm] = useState<Partial<Document>>({});

  const filtered = docs.filter(d => {
    const q=search.toLowerCase();
    return (!q||d.title.toLowerCase().includes(q)||d.titleAr.includes(q)||d.docNo.toLowerCase().includes(q)) && (catFilter==="all"||d.category===catFilter);
  });

  const stats = { total:docs.length, active:docs.filter(d=>d.status==="active").length, draft:docs.filter(d=>d.status==="draft").length, restricted:docs.filter(d=>d.access==="restricted").length };
  const catLabel = (id:string) => { const c=CATS.find(x=>x.id===id); return c?(isRtl?c.ar:c.en):id; };
  const folderLabel = (id:string) => { const f=FOLDERS.find(x=>x.id===id); return f?(isRtl?f.ar:f.en):id; };

  const getFileIcon = (title: string) => {
    if (title.includes("Report")||title.includes("تقرير")) return FileSpreadsheet;
    if (title.includes("Image")||title.includes("صورة")) return FileImage;
    return File;
  };

  const openAdd = () => { setEditDoc(null); setForm({category:"general",folder:"root",status:"draft",access:"private",version:"v1.0",size:"0 KB",tags:[]}); setShowDialog(true); };
  const openEdit = (d:Document) => { setEditDoc(d); setForm(d); setShowDialog(true); };

  const handleSave = () => {
    if (!form.title||!form.titleAr) { toast({title:isRtl?"ادخل اسم الوثيقة":"Enter document title",variant:"destructive"}); return; }
    if (editDoc) { const u=docs.map(d=>d.id===editDoc.id?{...editDoc,...form} as Document:d); setDocs(u); save(STORAGE_DMS,u); }
    else {
      const newDoc:Document={...form as Document,id:Date.now().toString(),docNo:`DOC-${new Date().getFullYear()}-${String(docs.length+1).padStart(3,"0")}`,uploadedBy:"المستخدم الحالي",uploadedAt:new Date().toISOString().split("T")[0]};
      const u=[newDoc,...docs]; setDocs(u); save(STORAGE_DMS,u);
    }
    setShowDialog(false); toast({title:isRtl?"تم الحفظ":"Saved"});
  };

  const handleDelete = (id:string) => { const u=docs.filter(d=>d.id!==id); setDocs(u); save(STORAGE_DMS,u); toast({title:isRtl?"تم الحذف":"Deleted"}); };

  return (
    <MainLayout>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{isRtl?"إدارة المستندات (DMS)":"Document Management"}</h1>
            <p className="text-muted-foreground text-sm mt-1">{isRtl?"تخزين الوثائق، الإصدارات، وصلاحيات الوصول":"Document storage, versioning, and access control"}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm"><Upload className="w-4 h-4 me-1.5"/>{isRtl?"رفع ملف":"Upload"}</Button>
            <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 me-1.5"/>{isRtl?"وثيقة جديدة":"New Document"}</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {label:isRtl?"إجمالي الوثائق":"Total Documents",value:stats.total,icon:FileText,color:"text-blue-500"},
            {label:isRtl?"نشطة":"Active",value:stats.active,icon:File,color:"text-emerald-500"},
            {label:isRtl?"مسودات":"Drafts",value:stats.draft,icon:Edit,color:"text-amber-500"},
            {label:isRtl?"سرية":"Restricted",value:stats.restricted,icon:Lock,color:"text-purple-500"},
          ].map((s,i)=>(
            <Card key={i} className="border-border/50"><CardContent className="p-4 flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-xl bg-secondary flex items-center justify-center",s.color)}><s.icon className="w-5 h-5"/></div>
              <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-xl font-bold">{s.value}</p></div>
            </CardContent></Card>
          ))}
        </div>

        <Tabs defaultValue="docs">
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="docs">{isRtl?"الوثائق":"Documents"}</TabsTrigger>
            <TabsTrigger value="folders">{isRtl?"المجلدات":"Folders"}</TabsTrigger>
          </TabsList>

          <TabsContent value="docs" className="mt-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground",isRtl?"right-3":"left-3")}/>
                <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder={isRtl?"بحث...":"Search..."} className={cn("h-9 bg-secondary/30",isRtl?"pr-9":"pl-9")}/>
              </div>
              <Select value={catFilter} onValueChange={setCatFilter}>
                <SelectTrigger className="w-40 h-9 bg-secondary/30"><SelectValue/></SelectTrigger>
                <SelectContent><SelectItem value="all">{isRtl?"الكل":"All"}</SelectItem>{CATS.map(c=><SelectItem key={c.id} value={c.id}>{isRtl?c.ar:c.en}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Card className="border-border/50 overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/40">
                    <TableRow>
                      <TableHead>{isRtl?"الوثيقة":"Document"}</TableHead>
                      <TableHead>{isRtl?"الفئة":"Category"}</TableHead>
                      <TableHead>{isRtl?"المجلد":"Folder"}</TableHead>
                      <TableHead>{isRtl?"الإصدار":"Version"}</TableHead>
                      <TableHead>{isRtl?"الحجم":"Size"}</TableHead>
                      <TableHead>{isRtl?"رُفع بواسطة":"Uploaded By"}</TableHead>
                      <TableHead>{isRtl?"الوصول":"Access"}</TableHead>
                      <TableHead>{isRtl?"الحالة":"Status"}</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(doc=>{
                      const Icon = getFileIcon(doc.title);
                      return (
                        <TableRow key={doc.id} className="hover:bg-muted/40">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Icon className="w-4 h-4 text-primary"/></div>
                              <div><p className="font-medium text-sm">{isRtl?doc.titleAr:doc.title}</p><p className="text-xs text-muted-foreground font-mono">{doc.docNo}</p></div>
                            </div>
                          </TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{catLabel(doc.category)}</Badge></TableCell>
                          <TableCell className="text-sm text-muted-foreground"><div className="flex items-center gap-1"><Folder className="w-3 h-3"/>{folderLabel(doc.folder)}</div></TableCell>
                          <TableCell><Badge variant="secondary" className="text-xs font-mono">{doc.version}</Badge></TableCell>
                          <TableCell className="text-xs text-muted-foreground">{doc.size}</TableCell>
                          <TableCell className="text-sm">{doc.uploadedBy}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-xs">
                              {doc.access==="public"?<Globe className="w-3 h-3 text-emerald-500"/>:<Lock className="w-3 h-3 text-amber-500"/>}
                              <span className={doc.access==="public"?"text-emerald-600":doc.access==="private"?"text-red-500":"text-amber-600"}>{doc.access==="public"?(isRtl?"عام":"Public"):doc.access==="private"?(isRtl?"خاص":"Private"):(isRtl?"مقيد":"Restricted")}</span>
                            </div>
                          </TableCell>
                          <TableCell><Badge variant={doc.status==="active"?"default":"secondary"} className={doc.status==="active"?"bg-emerald-500 text-white":""}>{doc.status==="active"?(isRtl?"نشط":"Active"):doc.status==="archived"?(isRtl?"مؤرشف":"Archived"):(isRtl?"مسودة":"Draft")}</Badge></TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7"><Download className="w-3.5 h-3.5"/></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={()=>openEdit(doc)}><Edit className="w-3.5 h-3.5"/></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={()=>handleDelete(doc.id)}><Trash2 className="w-3.5 h-3.5"/></Button>
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
              {FOLDERS.map(f=>{
                const count=docs.filter(d=>d.folder===f.id).length;
                return (
                  <Card key={f.id} className="border-border/50 hover:border-primary/30 transition-colors cursor-pointer">
                    <CardContent className="p-5 text-center">
                      <Folder className="w-10 h-10 text-amber-500 mx-auto mb-2"/>
                      <p className="font-semibold text-sm">{isRtl?f.ar:f.en}</p>
                      <p className="text-xs text-muted-foreground mt-1">{count} {isRtl?"وثيقة":"documents"}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editDoc?(isRtl?"تعديل الوثيقة":"Edit Document"):(isRtl?"وثيقة جديدة":"New Document")}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            {[{label:isRtl?"العنوان (AR) *":"Title (AR) *",field:"titleAr"},{label:isRtl?"العنوان (EN)":"Title (EN)",field:"title"},{label:isRtl?"الإصدار":"Version",field:"version"}].map(f=>(
              <div key={f.field}><Label className="text-xs font-semibold">{f.label}</Label><Input className="mt-1 h-8 text-sm" value={(form as any)[f.field]||""} onChange={e=>setForm(p=>({...p,[f.field]:e.target.value}))}/></div>
            ))}
            <div><Label className="text-xs font-semibold">{isRtl?"الفئة":"Category"}</Label>
              <Select value={form.category||"general"} onValueChange={v=>setForm(p=>({...p,category:v}))}>
                <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue/></SelectTrigger>
                <SelectContent>{CATS.map(c=><SelectItem key={c.id} value={c.id}>{isRtl?c.ar:c.en}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs font-semibold">{isRtl?"المجلد":"Folder"}</Label>
              <Select value={form.folder||"root"} onValueChange={v=>setForm(p=>({...p,folder:v}))}>
                <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue/></SelectTrigger>
                <SelectContent>{FOLDERS.map(f=><SelectItem key={f.id} value={f.id}>{isRtl?f.ar:f.en}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs font-semibold">{isRtl?"صلاحية الوصول":"Access"}</Label>
              <Select value={form.access||"private"} onValueChange={v=>setForm(p=>({...p,access:v as any}))}>
                <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue/></SelectTrigger>
                <SelectContent><SelectItem value="public">{isRtl?"عام":"Public"}</SelectItem><SelectItem value="private">{isRtl?"خاص":"Private"}</SelectItem><SelectItem value="restricted">{isRtl?"مقيد":"Restricted"}</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setShowDialog(false)}>{isRtl?"إلغاء":"Cancel"}</Button>
            <Button onClick={handleSave}>{isRtl?"حفظ":"Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
