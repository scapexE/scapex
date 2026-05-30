import { useState, useEffect, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { esc } from "@/lib/htmlEscape";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldAlert, Plus, Search, AlertTriangle, CheckCircle2, ClipboardList, Activity, Loader2, Download, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Incident {
  id: string; incidentNo: string; date: string; type: string;
  severity: "near_miss" | "minor" | "major" | "fatality";
  location: string; reportedBy: string; description: string;
  injured?: string; status: "open" | "investigating" | "closed"; correctiveAction: string;
}

interface Inspection {
  id: string; inspectionNo: string; date: string; site: string; inspector: string;
  type: string; score: number; findings: number; status: "scheduled" | "completed" | "overdue";
}

const INC_TYPES = [
  { id: "fall", ar: "سقوط", en: "Fall" }, { id: "electrical", ar: "كهرباء", en: "Electrical" },
  { id: "chemical", ar: "مواد كيميائية", en: "Chemical" }, { id: "fire", ar: "حريق", en: "Fire" },
  { id: "vehicle", ar: "مركبة", en: "Vehicle" }, { id: "other", ar: "أخرى", en: "Other" },
];

const SEED_INCIDENTS: Incident[] = [
  { id: "s1", incidentNo: "INC-2026-001", date: "2026-03-05", type: "fall", severity: "minor", location: "موقع الرياض", reportedBy: "محمد الزهراني", description: "انزلاق عامل من سلم بارتفاع 1.5م", injured: "عامل - كدمات طفيفة", status: "closed", correctiveAction: "تركيب حواجز وقاية" },
  { id: "s2", incidentNo: "INC-2026-002", date: "2026-03-12", type: "electrical", severity: "near_miss", location: "المقر الرئيسي", reportedBy: "أحمد الغامدي", description: "اتصال غير مباشر بسلك كهربائي", injured: "", status: "investigating", correctiveAction: "قيد المعالجة" },
];

const SEED_INSPECTIONS: Inspection[] = [
  { id: "s1", inspectionNo: "INS-2026-001", date: "2026-03-01", site: "موقع الرياض", inspector: "محمد الزهراني", type: "شهرية", score: 87, findings: 3, status: "completed" },
  { id: "s2", inspectionNo: "INS-2026-002", date: "2026-03-15", site: "موقع جدة", inspector: "محمد الزهراني", type: "أسبوعية", score: 92, findings: 1, status: "completed" },
  { id: "s3", inspectionNo: "INS-2026-003", date: "2026-04-01", site: "موقع الرياض", inspector: "محمد الزهراني", type: "شهرية", score: 0, findings: 0, status: "scheduled" },
];

function mapIncident(r: any): Incident {
  return {
    id: String(r.id),
    incidentNo: r.incidentNumber || r.incidentNo || `INC-${r.id}`,
    date: r.date || (r.createdAt ? r.createdAt.split("T")[0] : ""),
    type: r.type || "other",
    severity: r.severity || "minor",
    location: r.location || "",
    reportedBy: r.reportedBy || "",
    description: r.description || "",
    injured: r.injured || "",
    status: r.status || "open",
    correctiveAction: r.correctiveAction || "",
  };
}

function mapInspection(r: any): Inspection {
  return {
    id: String(r.id),
    inspectionNo: r.inspectionNumber || r.inspectionNo || `INS-${r.id}`,
    date: r.date || "",
    site: r.location || r.site || "",
    inspector: r.inspectorId || r.inspector || "",
    type: r.type || "",
    score: r.score || 0,
    findings: r.findings ? (typeof r.findings === "string" ? r.findings.split(",").length : r.findings) : 0,
    status: r.status || "scheduled",
  };
}

function printHSEReport(incidents: Incident[], inspections: Inspection[], isRtl: boolean) {
  const avgScore = inspections.filter(i => i.score > 0).reduce((s, i) => s + i.score, 0) / Math.max(1, inspections.filter(i => i.score > 0).length);
  const html = `<!DOCTYPE html><html dir="${isRtl ? "rtl" : "ltr"}"><head><meta charset="UTF-8"><title>${isRtl ? "تقرير السلامة" : "HSE Report"}</title>
  <style>body{font-family:Arial,sans-serif;font-size:11px;margin:20px}h2{text-align:center;color:#dc2626}h3{color:#374151;border-bottom:1px solid #e5e7eb;padding-bottom:5px}table{width:100%;border-collapse:collapse;margin:10px 0}th{background:#dc2626;color:white;padding:6px}td{padding:5px;border-bottom:1px solid #e5e7eb}.near_miss{color:#d97706}.minor{color:#ea580c}.major,.fatality{color:#dc2626;font-weight:bold}</style></head>
  <body><h2>${isRtl ? "تقرير السلامة والصحة المهنية" : "HSE Safety Report"}</h2><p style="text-align:center;color:#6b7280">${new Date().toLocaleDateString("ar-SA")} — ${isRtl ? `معدل السلامة: ${avgScore.toFixed(0)}%` : `Safety Score: ${avgScore.toFixed(0)}%`}</p>
  <h3>${isRtl ? "الحوادث" : "Incidents"}</h3>
  <table><thead><tr><th>${isRtl ? "الرقم" : "No."}</th><th>${isRtl ? "التاريخ" : "Date"}</th><th>${isRtl ? "النوع" : "Type"}</th><th>${isRtl ? "الخطورة" : "Severity"}</th><th>${isRtl ? "الموقع" : "Location"}</th><th>${isRtl ? "الحالة" : "Status"}</th></tr></thead>
  <tbody>${incidents.map(i => `<tr><td>${esc(i.incidentNo)}</td><td>${i.date}</td><td>${esc(i.type)}</td><td class="${i.severity}">${esc(i.severity)}</td><td>${esc(i.location)}</td><td>${esc(i.status)}</td></tr>`).join("")}</tbody></table>
  <h3>${isRtl ? "التفتيشات" : "Inspections"}</h3>
  <table><thead><tr><th>${isRtl ? "الرقم" : "No."}</th><th>${isRtl ? "الموقع" : "Site"}</th><th>${isRtl ? "النوع" : "Type"}</th><th>${isRtl ? "الدرجة" : "Score"}</th><th>${isRtl ? "الحالة" : "Status"}</th></tr></thead>
  <tbody>${inspections.map(i => `<tr><td>${esc(i.inspectionNo)}</td><td>${esc(i.site)}</td><td>${esc(i.type)}</td><td>${i.score > 0 ? i.score + "%" : "—"}</td><td>${esc(i.status)}</td></tr>`).join("")}</tbody></table></body></html>`;
  const w = window.open("", "_blank");
  if (w) { w.document.write(html); w.document.close(); w.print(); }
}

export default function HSEModule() {
  const { dir } = useLanguage(); const isRtl = dir === "rtl";
  const { toast } = useToast();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showInspDialog, setShowInspDialog] = useState(false);
  const [form, setForm] = useState<Partial<Incident>>({});
  const [inspForm, setInspForm] = useState<Partial<Inspection>>({});
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [iRes, insRes] = await Promise.all([fetch("/api/incidents"), fetch("/api/inspections")]);
      const iData = await iRes.json();
      const insData = await insRes.json();

      if (Array.isArray(iData) && iData.length > 0) {
        setIncidents(iData.map(mapIncident));
      } else {
        const legacy = localStorage.getItem("scapex_incidents");
        const src = legacy ? JSON.parse(legacy) : SEED_INCIDENTS;
        for (const inc of src) await fetch("/api/incidents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ incidentNumber: inc.incidentNo, type: inc.type, severity: inc.severity, date: inc.date, location: inc.location, description: inc.description, correctiveAction: inc.correctiveAction, status: inc.status }) });
        if (legacy) localStorage.removeItem("scapex_incidents");
        const r2 = await fetch("/api/incidents");
        setIncidents((await r2.json()).map(mapIncident));
      }

      if (Array.isArray(insData) && insData.length > 0) {
        setInspections(insData.map(mapInspection));
      } else {
        const legacyIns = localStorage.getItem("scapex_inspections");
        const src = legacyIns ? JSON.parse(legacyIns) : SEED_INSPECTIONS;
        for (const ins of src) await fetch("/api/inspections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inspectionNumber: ins.inspectionNo, type: ins.type, date: ins.date, location: ins.site, score: ins.score, status: ins.status }) });
        if (legacyIns) localStorage.removeItem("scapex_inspections");
        const r2 = await fetch("/api/inspections");
        setInspections((await r2.json()).map(mapInspection));
      }
    } catch { toast({ title: isRtl ? "خطأ في التحميل" : "Load error", variant: "destructive" }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const stats = {
    total: incidents.length, open: incidents.filter(i => i.status === "open" || i.status === "investigating").length,
    nearMiss: incidents.filter(i => i.severity === "near_miss").length,
    safetyScore: Math.round(inspections.filter(i => i.score > 0).reduce((s, i) => s + i.score, 0) / Math.max(1, inspections.filter(i => i.score > 0).length)),
  };

  const severityLabel = (s: string) => ({ near_miss: isRtl ? "بالكاد سلم" : "Near Miss", minor: isRtl ? "طفيف" : "Minor", major: isRtl ? "خطير" : "Major", fatality: isRtl ? "وفاة" : "Fatality" }[s] || s);
  const severityClass = (s: string) => ({ near_miss: "bg-yellow-400 text-black", minor: "bg-orange-400 text-white", major: "bg-red-500 text-white", fatality: "bg-red-900 text-white" }[s] || "");
  const statusLabel = (s: string) => ({ open: isRtl ? "مفتوح" : "Open", investigating: isRtl ? "تحقيق" : "Investigating", closed: isRtl ? "مغلق" : "Closed" }[s] || s);

  const handleSaveIncident = async () => {
    if (!form.description || !form.location) { toast({ title: isRtl ? "ادخل البيانات" : "Fill required fields", variant: "destructive" }); return; }
    setSaving(true);
    try {
      await fetch("/api/incidents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: form.type || "other", severity: form.severity || "minor", date: form.date || new Date().toISOString().split("T")[0], location: form.location, description: form.description, correctiveAction: form.correctiveAction || "", status: "open" }) });
      setShowDialog(false); setForm({});
      toast({ title: isRtl ? "تم تسجيل الحادث" : "Incident reported" });
      fetchData();
    } catch { toast({ title: isRtl ? "خطأ" : "Error", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await fetch(`/api/incidents/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      toast({ title: isRtl ? "تم تحديث الحالة" : "Status updated" });
      fetchData();
    } catch { toast({ title: isRtl ? "خطأ" : "Error", variant: "destructive" }); }
  };

  const handleDeleteIncident = async (id: string) => {
    try {
      await fetch(`/api/incidents/${id}`, { method: "DELETE" });
      toast({ title: isRtl ? "تم الحذف" : "Deleted" });
      fetchData();
    } catch { toast({ title: isRtl ? "خطأ" : "Error", variant: "destructive" }); }
  };

  const handleSaveInspection = async () => {
    if (!inspForm.site || !inspForm.date) { toast({ title: isRtl ? "ادخل البيانات" : "Fill required fields", variant: "destructive" }); return; }
    setSaving(true);
    try {
      await fetch("/api/inspections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: inspForm.type || "شهرية", date: inspForm.date, location: inspForm.site, score: inspForm.score || 0, status: inspForm.status || "scheduled" }) });
      setShowInspDialog(false); setInspForm({});
      toast({ title: isRtl ? "تم تسجيل التفتيش" : "Inspection recorded" });
      fetchData();
    } catch { toast({ title: isRtl ? "خطأ" : "Error", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  return (
    <MainLayout>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{isRtl ? "السلامة والصحة المهنية (HSE)" : "Health, Safety & Environment"}</h1>
            <p className="text-muted-foreground text-sm mt-1">{isRtl ? "تتبع الحوادث، التفتيشات، وإجراءات السلامة" : "Track incidents, inspections, and safety measures"}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => printHSEReport(incidents, inspections, isRtl)}><Download className="w-4 h-4 me-1.5" />{isRtl ? "تقرير PDF" : "HSE Report"}</Button>
            <Button variant="outline" size="sm" onClick={() => { setInspForm({ status: "scheduled" }); setShowInspDialog(true); }}><ClipboardList className="w-4 h-4 me-1.5" />{isRtl ? "تفتيش جديد" : "New Inspection"}</Button>
            <Button size="sm" onClick={() => { setForm({ severity: "minor", status: "open" }); setShowDialog(true); }}><Plus className="w-4 h-4 me-1.5" />{isRtl ? "تسجيل حادث" : "Report Incident"}</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: isRtl ? "إجمالي الحوادث" : "Total Incidents", value: stats.total, icon: ShieldAlert, color: "text-red-500" },
            { label: isRtl ? "قيد التحقيق" : "Open Cases", value: stats.open, icon: AlertTriangle, color: "text-amber-500" },
            { label: isRtl ? "حوادث وشيكة" : "Near Misses", value: stats.nearMiss, icon: Activity, color: "text-orange-500" },
            { label: isRtl ? "معدل السلامة" : "Safety Score", value: `${stats.safetyScore}%`, icon: CheckCircle2, color: "text-emerald-500" },
          ].map((s, i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-xl bg-secondary flex items-center justify-center", s.color)}><s.icon className="w-5 h-5" /></div>
                <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-xl font-bold">{s.value}</p></div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="incidents">
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="incidents">{isRtl ? "الحوادث" : "Incidents"}</TabsTrigger>
            <TabsTrigger value="inspections">{isRtl ? "التفتيشات" : "Inspections"}</TabsTrigger>
          </TabsList>

          <TabsContent value="incidents" className="mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
            ) : (
              <Card className="border-border/50 overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-secondary/40">
                      <TableRow>
                        <TableHead>{isRtl ? "الرقم" : "No."}</TableHead>
                        <TableHead>{isRtl ? "التاريخ" : "Date"}</TableHead>
                        <TableHead>{isRtl ? "النوع" : "Type"}</TableHead>
                        <TableHead>{isRtl ? "الخطورة" : "Severity"}</TableHead>
                        <TableHead>{isRtl ? "الموقع" : "Location"}</TableHead>
                        <TableHead>{isRtl ? "الوصف" : "Description"}</TableHead>
                        <TableHead>{isRtl ? "الحالة" : "Status"}</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {incidents.length === 0 ? (
                        <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">{isRtl ? "لا توجد حوادث مسجلة" : "No incidents recorded"}</TableCell></TableRow>
                      ) : incidents.map(inc => (
                        <TableRow key={inc.id} className="hover:bg-muted/40" data-testid={`row-incident-${inc.id}`}>
                          <TableCell className="font-mono text-xs">{inc.incidentNo}</TableCell>
                          <TableCell className="text-sm">{inc.date}</TableCell>
                          <TableCell className="text-sm">{INC_TYPES.find(t => t.id === inc.type)?.[isRtl ? "ar" : "en"] || inc.type}</TableCell>
                          <TableCell><Badge className={severityClass(inc.severity)}>{severityLabel(inc.severity)}</Badge></TableCell>
                          <TableCell className="text-sm">{inc.location}</TableCell>
                          <TableCell className="text-sm max-w-[180px] truncate">{inc.description}</TableCell>
                          <TableCell><Badge variant={inc.status === "closed" ? "default" : inc.status === "open" ? "destructive" : "secondary"}>{statusLabel(inc.status)}</Badge></TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {inc.status === "open" && <Button variant="ghost" size="icon" className="h-7 w-7" title={isRtl ? "فتح تحقيق" : "Investigate"} onClick={() => handleUpdateStatus(inc.id, "investigating")}><Search className="w-3.5 h-3.5 text-amber-600" /></Button>}
                              {inc.status === "investigating" && <Button variant="ghost" size="icon" className="h-7 w-7" title={isRtl ? "إغلاق" : "Close"} onClick={() => handleUpdateStatus(inc.id, "closed")}><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /></Button>}
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteIncident(inc.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="inspections" className="mt-4">
            <Card className="border-border/50 overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/40">
                    <TableRow>
                      <TableHead>{isRtl ? "الرقم" : "No."}</TableHead>
                      <TableHead>{isRtl ? "الموقع" : "Site"}</TableHead>
                      <TableHead>{isRtl ? "النوع" : "Type"}</TableHead>
                      <TableHead>{isRtl ? "التاريخ" : "Date"}</TableHead>
                      <TableHead>{isRtl ? "الدرجة" : "Score"}</TableHead>
                      <TableHead>{isRtl ? "الملاحظات" : "Findings"}</TableHead>
                      <TableHead>{isRtl ? "الحالة" : "Status"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inspections.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">{isRtl ? "لا توجد تفتيشات" : "No inspections"}</TableCell></TableRow>
                    ) : inspections.map(ins => (
                      <TableRow key={ins.id} className="hover:bg-muted/40">
                        <TableCell className="font-mono text-xs">{ins.inspectionNo}</TableCell>
                        <TableCell className="text-sm">{ins.site}</TableCell>
                        <TableCell className="text-sm">{ins.type}</TableCell>
                        <TableCell className="text-sm">{ins.date}</TableCell>
                        <TableCell>
                          {ins.score > 0 && (
                            <div className="flex items-center gap-1">
                              <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                                <div className={cn("h-full rounded-full", ins.score >= 80 ? "bg-emerald-500" : ins.score >= 60 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${ins.score}%` }} />
                              </div>
                              <span className="text-xs font-medium">{ins.score}%</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{ins.findings > 0 ? `${ins.findings} ${isRtl ? "ملاحظة" : "findings"}` : "—"}</TableCell>
                        <TableCell><Badge variant={ins.status === "completed" ? "default" : ins.status === "overdue" ? "destructive" : "secondary"}>{ins.status === "completed" ? (isRtl ? "منجز" : "Completed") : ins.status === "overdue" ? (isRtl ? "متأخر" : "Overdue") : (isRtl ? "مجدول" : "Scheduled")}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{isRtl ? "تسجيل حادث جديد" : "Report New Incident"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div>
              <Label className="text-xs">{isRtl ? "نوع الحادث" : "Incident Type"}</Label>
              <Select value={form.type || "other"} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{INC_TYPES.map(t => <SelectItem key={t.id} value={t.id}>{isRtl ? t.ar : t.en}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">{isRtl ? "مستوى الخطورة" : "Severity"}</Label>
              <Select value={form.severity || "minor"} onValueChange={v => setForm(p => ({ ...p, severity: v as any }))}>
                <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="near_miss">{isRtl ? "بالكاد سلم" : "Near Miss"}</SelectItem>
                  <SelectItem value="minor">{isRtl ? "طفيف" : "Minor"}</SelectItem>
                  <SelectItem value="major">{isRtl ? "خطير" : "Major"}</SelectItem>
                  <SelectItem value="fatality">{isRtl ? "وفاة" : "Fatality"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">{isRtl ? "التاريخ" : "Date"}</Label><Input type="date" className="mt-1 h-8 text-sm" value={form.date || new Date().toISOString().split("T")[0]} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} /></div>
            <div><Label className="text-xs">{isRtl ? "الموقع *" : "Location *"}</Label><Input className="mt-1 h-8 text-sm" value={form.location || ""} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} /></div>
            <div><Label className="text-xs">{isRtl ? "المُبلِّغ" : "Reported By"}</Label><Input className="mt-1 h-8 text-sm" value={form.reportedBy || ""} onChange={e => setForm(p => ({ ...p, reportedBy: e.target.value }))} /></div>
            <div><Label className="text-xs">{isRtl ? "المصاب (إن وجد)" : "Injured (if any)"}</Label><Input className="mt-1 h-8 text-sm" value={form.injured || ""} onChange={e => setForm(p => ({ ...p, injured: e.target.value }))} /></div>
            <div className="col-span-2"><Label className="text-xs">{isRtl ? "وصف الحادث *" : "Description *"}</Label><Input className="mt-1 h-8 text-sm" value={form.description || ""} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
            <div className="col-span-2"><Label className="text-xs">{isRtl ? "الإجراء التصحيحي" : "Corrective Action"}</Label><Input className="mt-1 h-8 text-sm" value={form.correctiveAction || ""} onChange={e => setForm(p => ({ ...p, correctiveAction: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>{isRtl ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={handleSaveIncident} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (isRtl ? "تسجيل" : "Report")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showInspDialog} onOpenChange={setShowInspDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{isRtl ? "تسجيل تفتيش" : "Log Inspection"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label className="text-xs">{isRtl ? "الموقع *" : "Site *"}</Label><Input className="mt-1 h-8 text-sm" value={inspForm.site || ""} onChange={e => setInspForm(p => ({ ...p, site: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">{isRtl ? "التاريخ *" : "Date *"}</Label><Input type="date" className="mt-1 h-8 text-sm" value={inspForm.date || ""} onChange={e => setInspForm(p => ({ ...p, date: e.target.value }))} /></div>
              <div><Label className="text-xs">{isRtl ? "نوع التفتيش" : "Type"}</Label><Input className="mt-1 h-8 text-sm" value={inspForm.type || ""} onChange={e => setInspForm(p => ({ ...p, type: e.target.value }))} placeholder={isRtl ? "شهرية، أسبوعية..." : "Monthly, Weekly..."} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">{isRtl ? "المفتش" : "Inspector"}</Label><Input className="mt-1 h-8 text-sm" value={inspForm.inspector || ""} onChange={e => setInspForm(p => ({ ...p, inspector: e.target.value }))} /></div>
              <div><Label className="text-xs">{isRtl ? "الدرجة (0-100)" : "Score (0-100)"}</Label><Input type="number" min={0} max={100} className="mt-1 h-8 text-sm" value={inspForm.score || 0} onChange={e => setInspForm(p => ({ ...p, score: Number(e.target.value) }))} /></div>
            </div>
            <div>
              <Label className="text-xs">{isRtl ? "الحالة" : "Status"}</Label>
              <Select value={inspForm.status || "scheduled"} onValueChange={v => setInspForm(p => ({ ...p, status: v as any }))}>
                <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">{isRtl ? "مجدول" : "Scheduled"}</SelectItem>
                  <SelectItem value="completed">{isRtl ? "منجز" : "Completed"}</SelectItem>
                  <SelectItem value="overdue">{isRtl ? "متأخر" : "Overdue"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInspDialog(false)}>{isRtl ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={handleSaveInspection} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (isRtl ? "حفظ" : "Save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

