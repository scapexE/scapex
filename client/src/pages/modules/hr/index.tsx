import { useState, useEffect, useCallback, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Plus, Search, Edit, Trash2, UserCheck, Calendar, TrendingUp, Building2, Download, Loader2, ClipboardList, Banknote, Layers, ShieldAlert, FileText, AlertTriangle, CheckCircle2, XCircle, Clock } from "lucide-react";
import { AdvancesTab } from "@/components/hr/AdvancesTab";
import { ViolationsTab } from "@/components/hr/ViolationsTab";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useActivityScope } from "@/hooks/useActivityScope";

interface Employee {
  id: string; empNo: string; nameAr: string; nameEn: string;
  department: string; jobTitle: string; jobTitleAr: string;
  nationality: string; iqama?: string; phone: string; email: string;
  hireDate: string; baseSalary: number; housingAllowance: number;
  transportAllowance: number; status: "active" | "inactive" | "on_leave";
  contractType: "permanent" | "contract" | "part_time";
  companyId?: number | null;
  activityIds?: string[];
  iqamaExpiry?: string;
  visaExpiry?: string;
  passportNumber?: string;
  passportExpiry?: string;
  medicalInsuranceExpiry?: string;
}

interface SimpleCompany { id: number; nameAr: string; nameEn: string; }
interface SimpleActivity { id: string; nameAr: string; nameEn: string; companyId: number; active: boolean; }

const DEPARTMENTS = [
  { id: "engineering", ar: "الهندسة", en: "Engineering" },
  { id: "safety", ar: "السلامة", en: "Safety & HSE" },
  { id: "environment", ar: "البيئة", en: "Environment" },
  { id: "finance", ar: "المالية", en: "Finance" },
  { id: "hr", ar: "الموارد البشرية", en: "Human Resources" },
  { id: "operations", ar: "العمليات", en: "Operations" },
  { id: "it", ar: "تقنية المعلومات", en: "IT" },
  { id: "admin", ar: "الإدارة", en: "Administration" },
];

const SEED: Employee[] = [
  { id: "s1", empNo: "EMP-001", nameAr: "أحمد محمد الغامدي", nameEn: "Ahmed Al-Ghamdi", department: "engineering", jobTitle: "Senior Engineer", jobTitleAr: "مهندس أول", nationality: "Saudi", phone: "+966501234567", email: "ahmed@scapex.sa", hireDate: "2021-03-15", baseSalary: 15000, housingAllowance: 3000, transportAllowance: 1000, status: "active", contractType: "permanent" },
  { id: "s2", empNo: "EMP-002", nameAr: "سارة علي القحطاني", nameEn: "Sara Al-Qahtani", department: "hr", jobTitle: "HR Manager", jobTitleAr: "مديرة موارد بشرية", nationality: "Saudi", phone: "+966509876543", email: "sara@scapex.sa", hireDate: "2020-06-01", baseSalary: 18000, housingAllowance: 4000, transportAllowance: 1200, status: "active", contractType: "permanent" },
  { id: "s3", empNo: "EMP-003", nameAr: "محمد خالد الزهراني", nameEn: "Mohammed Al-Zahrani", department: "safety", jobTitle: "HSE Officer", jobTitleAr: "مسؤول السلامة", nationality: "Saudi", phone: "+966555123456", email: "mohammed@scapex.sa", hireDate: "2022-01-10", baseSalary: 12000, housingAllowance: 2500, transportAllowance: 800, status: "active", contractType: "permanent" },
  { id: "s4", empNo: "EMP-004", nameAr: "Rajesh Kumar", nameEn: "Rajesh Kumar", department: "engineering", jobTitle: "Civil Engineer", jobTitleAr: "مهندس مدني", nationality: "Indian", iqama: "2456789012", phone: "+966561234567", email: "rajesh@scapex.sa", hireDate: "2021-09-20", baseSalary: 9000, housingAllowance: 2000, transportAllowance: 700, status: "active", contractType: "contract" },
  { id: "s5", empNo: "EMP-005", nameAr: "فاطمة عبدالله الشهري", nameEn: "Fatima Al-Shahri", department: "finance", jobTitle: "Accountant", jobTitleAr: "محاسبة", nationality: "Saudi", phone: "+966572345678", email: "fatima@scapex.sa", hireDate: "2022-07-05", baseSalary: 11000, housingAllowance: 2500, transportAllowance: 800, status: "on_leave", contractType: "permanent" },
];

function mapRow(r: any): Employee {
  return {
    id: String(r.id),
    empNo: r.employeeNumber || r.empNo || `EMP-${r.id}`,
    nameAr: r.nameAr || "",
    nameEn: r.nameEn || "",
    department: r.departmentName || r.department || "engineering",
    jobTitle: r.jobTitle || "",
    jobTitleAr: r.jobTitleAr || "",
    nationality: r.nationality || "Saudi",
    iqama: r.nationalId || r.iqama || "",
    phone: r.phone || "",
    email: r.email || "",
    hireDate: r.joinDate || r.hireDate || "",
    baseSalary: parseFloat(r.basicSalary || r.baseSalary || "0") || 0,
    housingAllowance: parseFloat(r.housingAllowance || "0") || 0,
    transportAllowance: parseFloat(r.transportAllowance || "0") || 0,
    status: r.status || "active",
    contractType: r.contractType || "permanent",
    companyId: r.companyId ?? null,
    activityIds: Array.isArray(r.activityIds) ? r.activityIds : [],
    iqamaExpiry: r.iqamaExpiry || "",
    visaExpiry: r.visaExpiry || "",
    passportNumber: r.passportNumber || "",
    passportExpiry: r.passportExpiry || "",
    medicalInsuranceExpiry: r.medicalInsuranceExpiry || "",
  };
}

function printEmployees(employees: Employee[], isRtl: boolean) {
  const html = `<!DOCTYPE html><html dir="${isRtl ? "rtl" : "ltr"}"><head><meta charset="UTF-8"><title>${isRtl ? "كشف الموظفين" : "Employee Roster"}</title>
  <style>body{font-family:Arial,sans-serif;font-size:11px;margin:20px}h2{text-align:center;color:#1e40af}table{width:100%;border-collapse:collapse;margin-top:15px}th{background:#1e40af;color:white;padding:6px;text-align:${isRtl ? "right" : "left"}}td{padding:5px;border-bottom:1px solid #e5e7eb}tr:nth-child(even){background:#f8fafc}.badge-active{color:#16a34a}.badge-leave{color:#d97706}.badge-inactive{color:#dc2626}</style></head>
  <body><h2>${isRtl ? "كشف الموظفين" : "Employee Roster"}</h2><p style="text-align:center;color:#6b7280">${new Date().toLocaleDateString("ar-SA")}</p>
  <table><thead><tr><th>${isRtl ? "الرقم" : "No."}</th><th>${isRtl ? "الاسم" : "Name"}</th><th>${isRtl ? "القسم" : "Department"}</th><th>${isRtl ? "المسمى الوظيفي" : "Job Title"}</th><th>${isRtl ? "الجنسية" : "Nationality"}</th><th>${isRtl ? "الراتب الأساسي" : "Basic Salary"}</th><th>${isRtl ? "الحالة" : "Status"}</th></tr></thead>
  <tbody>${employees.map(e => `<tr><td>${e.empNo}</td><td>${isRtl ? e.nameAr : e.nameEn}</td><td>${e.department}</td><td>${isRtl ? e.jobTitleAr : e.jobTitle}</td><td>${e.nationality}</td><td>${e.baseSalary.toLocaleString()} ${isRtl ? "ر.س" : "SAR"}</td><td class="badge-${e.status === "active" ? "active" : e.status === "on_leave" ? "leave" : "inactive"}">${e.status === "active" ? (isRtl ? "نشط" : "Active") : e.status === "on_leave" ? (isRtl ? "إجازة" : "On Leave") : (isRtl ? "غير نشط" : "Inactive")}</td></tr>`).join("")}</tbody>
  <tfoot><tr><td colspan="7" style="padding-top:10px;color:#6b7280">${isRtl ? `إجمالي الموظفين: ${employees.length}` : `Total Employees: ${employees.length}`}</td></tr></tfoot></table></body></html>`;
  const w = window.open("", "_blank");
  if (w) { w.document.write(html); w.document.close(); w.print(); }
}

/* ── Expiry helpers ── */
function daysDiff(dateStr: string): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

function expiryStatus(dateStr: string): "expired" | "critical" | "warning" | "ok" | "none" {
  const d = daysDiff(dateStr);
  if (d === null) return "none";
  if (d < 0) return "expired";
  if (d <= 30) return "critical";
  if (d <= 90) return "warning";
  return "ok";
}

function ExpiryBadge({ dateStr, isRtl }: { dateStr: string; isRtl: boolean }) {
  const status = expiryStatus(dateStr);
  const d = daysDiff(dateStr);
  if (status === "none") return <span className="text-xs text-muted-foreground">—</span>;
  const fmtDate = new Date(dateStr).toLocaleDateString(isRtl ? "ar-SA" : "en-US");
  const daysLabel = d !== null && d >= 0
    ? (isRtl ? `(${d} يوم)` : `(${d}d)`)
    : (isRtl ? "(منتهية)" : "(expired)");
  return (
    <div className="flex flex-col gap-0.5">
      <span className={cn("text-xs font-medium",
        status === "expired" ? "text-red-600 dark:text-red-400" :
        status === "critical" ? "text-orange-600 dark:text-orange-400" :
        status === "warning" ? "text-amber-600 dark:text-amber-400" :
        "text-emerald-600 dark:text-emerald-400"
      )}>{fmtDate}</span>
      <span className={cn("text-[10px]",
        status === "expired" ? "text-red-500" :
        status === "critical" ? "text-orange-500" :
        status === "warning" ? "text-amber-500" :
        "text-emerald-500"
      )}>{daysLabel}</span>
    </div>
  );
}

export default function HRModule() {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";
  const { toast } = useToast();
  const { activityId, isPrivileged, activeActivity } = useActivityScope();

  const [employeeList, setEmployeeList] = useState<Employee[]>([]);
  const [companies, setCompanies] = useState<SimpleCompany[]>([]);
  const [activities, setActivities] = useState<SimpleActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editEmp, setEditEmp] = useState<Employee | null>(null);
  const [form, setForm] = useState<Partial<Employee>>({});
  const [saving, setSaving] = useState(false);
  const [expandedDocEmpId, setExpandedDocEmpId] = useState<string | null>(null);
  const [docForm, setDocForm] = useState<{ iqamaExpiry: string; visaExpiry: string; passportNumber: string; passportExpiry: string; medicalInsuranceExpiry: string }>({ iqamaExpiry: "", visaExpiry: "", passportNumber: "", passportExpiry: "", medicalInsuranceExpiry: "" });
  const [savingDoc, setSavingDoc] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [empRes, compRes, actRes] = await Promise.all([
        fetch("/api/employees"),
        fetch("/api/companies"),
        fetch("/api/activities"),
      ]);
      const [empData, compData, actData] = await Promise.all([
        empRes.json(), compRes.json(), actRes.json(),
      ]);

      setCompanies(Array.isArray(compData) ? compData : []);
      setActivities(Array.isArray(actData) ? actData : []);

      if (Array.isArray(empData) && empData.length > 0) {
        setEmployeeList(empData.map(mapRow));
      } else {
        const legacy = localStorage.getItem("scapex_hr_employees");
        const source: Employee[] = legacy ? JSON.parse(legacy) : SEED;
        for (const emp of source) {
          await fetch("/api/employees", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ employeeNumber: emp.empNo, nameAr: emp.nameAr, nameEn: emp.nameEn, departmentName: emp.department, jobTitle: emp.jobTitle, jobTitleAr: emp.jobTitleAr, nationality: emp.nationality, nationalId: emp.iqama, phone: emp.phone, email: emp.email, joinDate: emp.hireDate, basicSalary: emp.baseSalary, housingAllowance: emp.housingAllowance, transportAllowance: emp.transportAllowance, status: emp.status, contractType: emp.contractType }),
          });
        }
        if (legacy) localStorage.removeItem("scapex_hr_employees");
        const res2 = await fetch("/api/employees");
        setEmployeeList((await res2.json()).map(mapRow));
      }
    } catch { toast({ title: isRtl ? "خطأ في تحميل البيانات" : "Load error", variant: "destructive" }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── Activity / Company scoping ── */
  const scopedEmployees = useMemo(() => {
    if (!activityId) return employeeList;
    return employeeList.filter(e => Array.isArray(e.activityIds) && e.activityIds.includes(activityId));
  }, [employeeList, activityId]);

  /* ── Filtered list (search + dept) within scoped pool ── */
  const filtered = useMemo(() => scopedEmployees.filter(e => {
    const q = search.toLowerCase();
    return (!q || e.nameAr.includes(q) || e.nameEn.toLowerCase().includes(q) || e.empNo.toLowerCase().includes(q) || e.email.toLowerCase().includes(q))
      && (deptFilter === "all" || e.department === deptFilter);
  }), [scopedEmployees, search, deptFilter]);

  /* ── Stats from scoped pool ── */
  const stats = useMemo(() => ({
    total: scopedEmployees.length,
    active: scopedEmployees.filter(e => e.status === "active").length,
    onLeave: scopedEmployees.filter(e => e.status === "on_leave").length,
    saudi: scopedEmployees.filter(e => e.nationality === "Saudi").length,
  }), [scopedEmployees]);

  /* ── Expiry summary from scoped pool ── */
  const expirySummary = useMemo(() => {
    let expired = 0, critical = 0, warning = 0;
    for (const emp of scopedEmployees) {
      const fields = [emp.iqamaExpiry, emp.visaExpiry, emp.passportExpiry, emp.medicalInsuranceExpiry];
      for (const f of fields) {
        if (!f) continue;
        const s = expiryStatus(f);
        if (s === "expired") expired++;
        else if (s === "critical") critical++;
        else if (s === "warning") warning++;
      }
    }
    return { expired, critical, warning };
  }, [scopedEmployees]);

  const openAdd = () => {
    setEditEmp(null);
    setForm({ status: "active", contractType: "permanent", nationality: "Saudi", department: "engineering", companyId: companies[0]?.id ?? null, activityIds: [] });
    setShowDialog(true);
  };
  const openEdit = (e: Employee) => { setEditEmp(e); setForm(e); setShowDialog(true); };
  const deptLabel = (id: string) => { const d = DEPARTMENTS.find(x => x.id === id); return d ? (isRtl ? d.ar : d.en) : id; };
  const statusColor = (s: string) => s === "active" ? "default" : s === "on_leave" ? "secondary" : "destructive";
  const statusLabel = (s: string) => s === "active" ? (isRtl ? "نشط" : "Active") : s === "on_leave" ? (isRtl ? "إجازة" : "On Leave") : (isRtl ? "غير نشط" : "Inactive");

  const companyName = (id?: number | null) => {
    if (!id) return null;
    const c = companies.find(x => x.id === id);
    return c ? (isRtl ? c.nameAr : c.nameEn) : null;
  };

  const activityName = (id: string) => {
    const a = activities.find(x => x.id === id);
    return a ? (isRtl ? a.nameAr : a.nameEn) : id;
  };

  const activitiesForCompany = useMemo(() => {
    if (!form.companyId) return activities.filter(a => a.active);
    return activities.filter(a => a.active && a.companyId === form.companyId);
  }, [activities, form.companyId]);

  const toggleActivity = (id: string) => {
    setForm(prev => {
      const current = prev.activityIds || [];
      const next = current.includes(id) ? current.filter(x => x !== id) : [...current, id];
      return { ...prev, activityIds: next };
    });
  };

  const handleSave = async () => {
    if (!form.nameAr || !form.nameEn || !form.email) {
      toast({ title: isRtl ? "يرجى ملء الحقول المطلوبة (الاسم، البريد)" : "Fill required fields (name, email)", variant: "destructive" });
      return;
    }
    if (!form.companyId) {
      toast({ title: isRtl ? "يرجى اختيار الشركة" : "Please select a company", variant: "destructive" });
      return;
    }
    if (!form.activityIds?.length) {
      toast({ title: isRtl ? "يرجى اختيار نشاط تجاري واحد على الأقل" : "Select at least one business activity", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        employeeNumber: form.empNo, nameAr: form.nameAr, nameEn: form.nameEn,
        departmentName: form.department, jobTitle: form.jobTitle, jobTitleAr: form.jobTitleAr,
        nationality: form.nationality, nationalId: form.iqama, phone: form.phone,
        email: form.email, joinDate: form.hireDate, basicSalary: form.baseSalary,
        housingAllowance: form.housingAllowance, transportAllowance: form.transportAllowance,
        status: form.status, contractType: form.contractType,
        companyId: form.companyId,
        activityIds: form.activityIds || [],
        iqamaExpiry: form.iqamaExpiry || null,
        visaExpiry: form.visaExpiry || null,
        passportNumber: form.passportNumber || null,
        passportExpiry: form.passportExpiry || null,
        medicalInsuranceExpiry: form.medicalInsuranceExpiry || null,
      };
      if (editEmp) {
        await fetch(`/api/employees/${editEmp.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        toast({ title: isRtl ? "تم تحديث الموظف" : "Employee updated" });
      } else {
        await fetch("/api/employees", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        toast({ title: isRtl ? "تم إضافة الموظف بنجاح" : "Employee added successfully" });
      }
      setShowDialog(false);
      fetchAll();
    } catch { toast({ title: isRtl ? "خطأ" : "Error", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const openDocEdit = (emp: Employee) => {
    if (expandedDocEmpId === emp.id) { setExpandedDocEmpId(null); return; }
    setDocForm({
      iqamaExpiry: emp.iqamaExpiry || "",
      visaExpiry: emp.visaExpiry || "",
      passportNumber: emp.passportNumber || "",
      passportExpiry: emp.passportExpiry || "",
      medicalInsuranceExpiry: emp.medicalInsuranceExpiry || "",
    });
    setExpandedDocEmpId(emp.id);
  };

  const handleSaveDocOnly = async (emp: Employee) => {
    setSavingDoc(true);
    try {
      const payload = {
        employeeNumber: emp.empNo, nameAr: emp.nameAr, nameEn: emp.nameEn,
        departmentName: emp.department, jobTitle: emp.jobTitle, jobTitleAr: emp.jobTitleAr,
        nationality: emp.nationality, nationalId: emp.iqama, phone: emp.phone,
        email: emp.email, joinDate: emp.hireDate, basicSalary: emp.baseSalary,
        housingAllowance: emp.housingAllowance, transportAllowance: emp.transportAllowance,
        status: emp.status, contractType: emp.contractType,
        companyId: emp.companyId, activityIds: emp.activityIds || [],
        iqamaExpiry: docForm.iqamaExpiry || null,
        visaExpiry: docForm.visaExpiry || null,
        passportNumber: docForm.passportNumber || null,
        passportExpiry: docForm.passportExpiry || null,
        medicalInsuranceExpiry: docForm.medicalInsuranceExpiry || null,
      };
      await fetch(`/api/employees/${emp.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      toast({ title: isRtl ? "تم حفظ الوثائق بنجاح" : "Documents saved" });
      setExpandedDocEmpId(null);
      fetchAll();
    } catch { toast({ title: isRtl ? "خطأ في الحفظ" : "Save error", variant: "destructive" }); }
    finally { setSavingDoc(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/employees/${id}`, { method: "DELETE" });
      toast({ title: isRtl ? "تم حذف الموظف" : "Employee deleted" });
      fetchAll();
    } catch { toast({ title: isRtl ? "خطأ" : "Error", variant: "destructive" }); }
  };

  /* ── Scope label ── */
  const scopeLabel = activityId && activeActivity
    ? (isRtl ? activeActivity.nameAr || activeActivity.id : activeActivity.nameEn || activeActivity.id)
    : null;

  return (
    <MainLayout>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{isRtl ? "الموارد البشرية" : "Human Resources"}</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {scopeLabel
                ? (isRtl ? `النشاط التجاري: ${scopeLabel}` : `Activity: ${scopeLabel}`)
                : (isRtl ? "إدارة الموظفين، العقود، والبيانات الوظيفية" : "Manage employees, contracts, and HR data")}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => printEmployees(filtered, isRtl)}><Download className="w-4 h-4 me-1.5" />{isRtl ? "طباعة PDF" : "Print PDF"}</Button>
            <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 me-1.5" />{isRtl ? "إضافة موظف" : "Add Employee"}</Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: isRtl ? "إجمالي الموظفين" : "Total Employees", value: stats.total, icon: Users, color: "text-blue-500" },
            { label: isRtl ? "نشطون" : "Active", value: stats.active, icon: UserCheck, color: "text-emerald-500" },
            { label: isRtl ? "في إجازة" : "On Leave", value: stats.onLeave, icon: Calendar, color: "text-amber-500" },
            { label: isRtl ? "سعوديون" : "Saudi Nationals", value: `${stats.saudi}/${stats.total}`, icon: TrendingUp, color: "text-purple-500" },
          ].map((s, i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-xl bg-secondary flex items-center justify-center", s.color)}><s.icon className="w-5 h-5" /></div>
                <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-xl font-bold">{s.value}</p></div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="employees">
          <TabsList className="bg-secondary/50 flex-wrap h-auto gap-1">
            <TabsTrigger value="employees"><Users className="w-3.5 h-3.5 me-1" />{isRtl ? "الموظفون" : "Employees"}</TabsTrigger>
            <TabsTrigger value="departments"><Building2 className="w-3.5 h-3.5 me-1" />{isRtl ? "الأقسام" : "Departments"}</TabsTrigger>
            <TabsTrigger value="documents" className="relative">
              <FileText className="w-3.5 h-3.5 me-1" />{isRtl ? "الوثائق والصلاحيات" : "Document Expiry"}
              {(expirySummary.expired + expirySummary.critical) > 0 && (
                <span className="absolute -top-1 -end-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">
                  {expirySummary.expired + expirySummary.critical}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="advances"><Banknote className="w-3.5 h-3.5 me-1" />{isRtl ? "السلف" : "Advances"}</TabsTrigger>
            <TabsTrigger value="violations"><ShieldAlert className="w-3.5 h-3.5 me-1" />{isRtl ? "المخالفات" : "Violations"}</TabsTrigger>
          </TabsList>

          {/* ── EMPLOYEES TAB ── */}
          <TabsContent value="employees" className="mt-4 space-y-3">
            {scopeLabel && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-950/20 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-400">
                <Layers className="w-3.5 h-3.5 shrink-0" />
                {isRtl
                  ? `يعرض ${stats.total} موظف مرتبط بالنشاط: ${scopeLabel}`
                  : `Showing ${stats.total} employees in activity: ${scopeLabel}`}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground", isRtl ? "right-3" : "left-3")} />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={isRtl ? "بحث..." : "Search..."} className={cn("h-9 bg-secondary/30", isRtl ? "pr-9" : "pl-9")} />
              </div>
              <Select value={deptFilter} onValueChange={setDeptFilter}>
                <SelectTrigger className="w-44 h-9 bg-secondary/30"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRtl ? "كل الأقسام" : "All Departments"}</SelectItem>
                  {DEPARTMENTS.map(d => <SelectItem key={d.id} value={d.id}>{isRtl ? d.ar : d.en}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
            ) : (
              <Card className="border-border/50 overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-secondary/40">
                      <TableRow>
                        <TableHead>{isRtl ? "الرقم الوظيفي" : "Emp No."}</TableHead>
                        <TableHead>{isRtl ? "الاسم" : "Name"}</TableHead>
                        <TableHead>{isRtl ? "الشركة / الأنشطة" : "Company / Activities"}</TableHead>
                        <TableHead>{isRtl ? "القسم" : "Department"}</TableHead>
                        <TableHead>{isRtl ? "المسمى الوظيفي" : "Job Title"}</TableHead>
                        <TableHead>{isRtl ? "الراتب الأساسي" : "Basic Salary"}</TableHead>
                        <TableHead>{isRtl ? "الحالة" : "Status"}</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.length === 0 ? (
                        <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">{isRtl ? "لا يوجد موظفون" : "No employees found"}</TableCell></TableRow>
                      ) : filtered.map(emp => (
                        <TableRow key={emp.id} className="hover:bg-muted/40" data-testid={`row-employee-${emp.id}`}>
                          <TableCell className="font-mono text-xs text-muted-foreground">{emp.empNo}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{(emp.nameAr || "?")[0]}</div>
                              <div><p className="font-medium text-sm">{isRtl ? emp.nameAr : emp.nameEn}</p><p className="text-xs text-muted-foreground">{emp.email}</p></div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {emp.companyId && companyName(emp.companyId) ? (
                                <Badge variant="outline" className="font-normal gap-1 border-blue-200 text-blue-700 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800 w-fit text-xs">
                                  <Building2 className="w-3 h-3" />
                                  {companyName(emp.companyId)}
                                </Badge>
                              ) : <span className="text-xs text-muted-foreground">—</span>}
                              {emp.activityIds && emp.activityIds.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {emp.activityIds.slice(0, 2).map(aid => (
                                    <Badge key={aid} variant="outline" className="font-normal gap-1 border-violet-200 text-violet-700 bg-violet-50 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-800 text-[10px] px-1.5 py-0 w-fit">
                                      <Layers className="w-2.5 h-2.5" />{activityName(aid)}
                                    </Badge>
                                  ))}
                                  {emp.activityIds.length > 2 && (
                                    <Badge variant="outline" className="font-normal text-muted-foreground text-[10px] px-1.5 py-0 w-fit">+{emp.activityIds.length - 2}</Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{deptLabel(emp.department)}</TableCell>
                          <TableCell className="text-sm">{isRtl ? emp.jobTitleAr : emp.jobTitle}</TableCell>
                          <TableCell className="text-sm font-medium">{emp.baseSalary.toLocaleString()} {isRtl ? "ر.س" : "SAR"}</TableCell>
                          <TableCell><Badge variant={statusColor(emp.status) as any}>{statusLabel(emp.status)}</Badge></TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-500" title={isRtl ? "سجل الحضور" : "Attendance"} onClick={() => window.location.href = `/attendance?emp=${encodeURIComponent(emp.empNo)}`} data-testid={`button-attendance-employee-${emp.id}`}><ClipboardList className="w-3.5 h-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600" title={isRtl ? "الرواتب" : "Payroll"} onClick={() => window.location.href = `/payroll?emp=${encodeURIComponent(emp.empNo)}`} data-testid={`button-payroll-employee-${emp.id}`}><Banknote className="w-3.5 h-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(emp)} data-testid={`button-edit-employee-${emp.id}`}><Edit className="w-3.5 h-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(emp.id)} data-testid={`button-delete-employee-${emp.id}`}><Trash2 className="w-3.5 h-3.5" /></Button>
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

          {/* ── DEPARTMENTS TAB (scoped by activity) ── */}
          <TabsContent value="departments" className="mt-4">
            {scopeLabel && (
              <div className="flex items-center gap-2 px-3 py-2 mb-3 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-950/20 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-400">
                <Layers className="w-3.5 h-3.5 shrink-0" />
                {isRtl ? `الأقسام مفلترة حسب النشاط: ${scopeLabel}` : `Departments filtered by activity: ${scopeLabel}`}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {DEPARTMENTS.map(dept => {
                const count = scopedEmployees.filter(e => e.department === dept.id && e.status === "active").length;
                const total = scopedEmployees.filter(e => e.department === dept.id).length;
                return (
                  <Card key={dept.id} className={cn("border-border/50 hover:border-primary/30 transition-colors", count === 0 && scopeLabel ? "opacity-50" : "")}>
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Building2 className="w-5 h-5 text-primary" /></div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{isRtl ? dept.ar : dept.en}</p>
                        <p className="text-xs text-muted-foreground">
                          {count} {isRtl ? "نشط" : "active"}
                          {total > count ? `, ${total - count} ${isRtl ? "غير نشط/إجازة" : "inactive/leave"}` : ""}
                        </p>
                      </div>
                      <Badge variant={count > 0 ? "secondary" : "outline"}>{count}</Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* ── DOCUMENT EXPIRY TAB ── */}
          <TabsContent value="documents" className="mt-4 space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: isRtl ? "منتهية الصلاحية" : "Expired", value: expirySummary.expired, icon: XCircle, cls: "text-red-500", bg: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800" },
                { label: isRtl ? "تنتهي خلال 30 يوم" : "Expiring ≤30d", value: expirySummary.critical, icon: AlertTriangle, cls: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800" },
                { label: isRtl ? "تنتهي خلال 90 يوم" : "Expiring ≤90d", value: expirySummary.warning, icon: Clock, cls: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800" },
                { label: isRtl ? "سارية المفعول" : "Valid", value: scopedEmployees.filter(e => [e.iqamaExpiry, e.visaExpiry, e.passportExpiry, e.medicalInsuranceExpiry].every(f => !f || expiryStatus(f) === "ok")).length, icon: CheckCircle2, cls: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800" },
              ].map((s, i) => (
                <Card key={i} className={cn("border", s.bg)}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <s.icon className={cn("w-6 h-6 shrink-0", s.cls)} />
                    <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-xl font-bold">{s.value}</p></div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Expiry table */}
            <Card className="border-border/50 overflow-hidden">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  {isRtl ? "جدول متابعة صلاحية الوثائق" : "Document Expiry Tracking"}
                </CardTitle>
              </CardHeader>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/40">
                    <TableRow>
                      <TableHead>{isRtl ? "الموظف" : "Employee"}</TableHead>
                      <TableHead>{isRtl ? "الجنسية" : "Nationality"}</TableHead>
                      <TableHead>
                        <div className="flex flex-col">
                          <span>{isRtl ? "الهوية / الإقامة" : "ID / Iqama"}</span>
                          <span className="text-[10px] font-normal text-muted-foreground">{isRtl ? "تاريخ الانتهاء" : "Expiry"}</span>
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex flex-col">
                          <span>{isRtl ? "التأشيرة" : "Visa"}</span>
                          <span className="text-[10px] font-normal text-muted-foreground">{isRtl ? "تاريخ الانتهاء" : "Expiry"}</span>
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex flex-col">
                          <span>{isRtl ? "جواز السفر" : "Passport"}</span>
                          <span className="text-[10px] font-normal text-muted-foreground">{isRtl ? "تاريخ الانتهاء" : "Expiry"}</span>
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex flex-col">
                          <span>{isRtl ? "التأمين الطبي" : "Medical Insurance"}</span>
                          <span className="text-[10px] font-normal text-muted-foreground">{isRtl ? "تاريخ الانتهاء" : "Expiry"}</span>
                        </div>
                      </TableHead>
                      <TableHead>{isRtl ? "الإجراء" : "Action"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
                    ) : scopedEmployees.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">{isRtl ? "لا يوجد موظفون" : "No employees found"}</TableCell></TableRow>
                    ) : scopedEmployees.map(emp => {
                      const anyAlert = [emp.iqamaExpiry, emp.visaExpiry, emp.passportExpiry, emp.medicalInsuranceExpiry]
                        .some(f => f && ["expired", "critical", "warning"].includes(expiryStatus(f)));
                      const isExpanded = expandedDocEmpId === emp.id;
                      return (
                        <>
                          <TableRow key={emp.id} className={cn("hover:bg-muted/40 transition-colors", anyAlert ? "bg-red-50/30 dark:bg-red-950/10" : "", isExpanded ? "bg-amber-50/40 dark:bg-amber-950/10 border-b-0" : "")}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{(emp.nameAr || "?")[0]}</div>
                                <div>
                                  <p className="text-sm font-medium">{isRtl ? emp.nameAr : emp.nameEn}</p>
                                  <p className="text-xs text-muted-foreground font-mono">{emp.empNo}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs">{emp.nationality}</TableCell>
                            <TableCell><ExpiryBadge dateStr={emp.iqamaExpiry || ""} isRtl={isRtl} /></TableCell>
                            <TableCell><ExpiryBadge dateStr={emp.visaExpiry || ""} isRtl={isRtl} /></TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-0.5">
                                {emp.passportNumber && <span className="text-[10px] text-muted-foreground font-mono">{emp.passportNumber}</span>}
                                <ExpiryBadge dateStr={emp.passportExpiry || ""} isRtl={isRtl} />
                              </div>
                            </TableCell>
                            <TableCell><ExpiryBadge dateStr={emp.medicalInsuranceExpiry || ""} isRtl={isRtl} /></TableCell>
                            <TableCell>
                              <Button
                                variant={isExpanded ? "secondary" : "ghost"}
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => openDocEdit(emp)}
                                title={isExpanded ? (isRtl ? "إغلاق" : "Close") : (isRtl ? "تعديل الوثائق" : "Edit Documents")}
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                          {isExpanded && (
                            <TableRow key={`${emp.id}-doc-edit`} className="bg-amber-50/40 dark:bg-amber-950/10 border-t border-amber-200/50 dark:border-amber-800/30">
                              <TableCell colSpan={7} className="py-3 px-4">
                                <div className="flex flex-col gap-3">
                                  <p className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                                    <FileText className="w-3.5 h-3.5" />
                                    {isRtl ? `تعديل وثائق: ${emp.nameAr}` : `Edit documents: ${emp.nameEn}`}
                                  </p>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                                    <div>
                                      <Label className="text-xs font-semibold text-muted-foreground">{isRtl ? "انتهاء الهوية / الإقامة" : "ID / Iqama Expiry"}</Label>
                                      <Input type="date" className="mt-1 h-8 text-sm" value={docForm.iqamaExpiry} onChange={e => setDocForm(p => ({ ...p, iqamaExpiry: e.target.value }))} />
                                    </div>
                                    <div>
                                      <Label className="text-xs font-semibold text-muted-foreground">{isRtl ? "انتهاء التأشيرة" : "Visa Expiry"}</Label>
                                      <Input type="date" className="mt-1 h-8 text-sm" value={docForm.visaExpiry} onChange={e => setDocForm(p => ({ ...p, visaExpiry: e.target.value }))} />
                                    </div>
                                    <div>
                                      <Label className="text-xs font-semibold text-muted-foreground">{isRtl ? "رقم جواز السفر" : "Passport No."}</Label>
                                      <Input type="text" className="mt-1 h-8 text-sm" value={docForm.passportNumber} onChange={e => setDocForm(p => ({ ...p, passportNumber: e.target.value }))} />
                                    </div>
                                    <div>
                                      <Label className="text-xs font-semibold text-muted-foreground">{isRtl ? "انتهاء جواز السفر" : "Passport Expiry"}</Label>
                                      <Input type="date" className="mt-1 h-8 text-sm" value={docForm.passportExpiry} onChange={e => setDocForm(p => ({ ...p, passportExpiry: e.target.value }))} />
                                    </div>
                                    <div>
                                      <Label className="text-xs font-semibold text-muted-foreground">{isRtl ? "انتهاء التأمين الطبي" : "Insurance Expiry"}</Label>
                                      <Input type="date" className="mt-1 h-8 text-sm" value={docForm.medicalInsuranceExpiry} onChange={e => setDocForm(p => ({ ...p, medicalInsuranceExpiry: e.target.value }))} />
                                    </div>
                                  </div>
                                  <div className="flex gap-2 justify-end">
                                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setExpandedDocEmpId(null)}>
                                      {isRtl ? "إلغاء" : "Cancel"}
                                    </Button>
                                    <Button size="sm" className="h-8 text-xs" onClick={() => handleSaveDocOnly(emp)} disabled={savingDoc}>
                                      {savingDoc ? <Loader2 className="w-3.5 h-3.5 animate-spin me-1" /> : null}
                                      {isRtl ? "حفظ الوثائق" : "Save Documents"}
                                    </Button>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>

            {/* Color legend */}
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground px-1">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" />{isRtl ? "منتهية" : "Expired"}</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-orange-500 inline-block" />{isRtl ? "تنتهي خلال 30 يوم" : "≤30 days"}</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />{isRtl ? "تنتهي خلال 90 يوم" : "≤90 days"}</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />{isRtl ? "سارية" : "Valid"}</span>
            </div>
          </TabsContent>

          <TabsContent value="advances" className="mt-4">
            <AdvancesTab />
          </TabsContent>

          <TabsContent value="violations" className="mt-4">
            <ViolationsTab />
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Add / Edit Employee Dialog ── */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editEmp ? (isRtl ? "تعديل بيانات الموظف" : "Edit Employee") : (isRtl ? "إضافة موظف جديد" : "Add New Employee")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">

            {/* Company & Activities */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/20">
              <div className="sm:col-span-2">
                <p className="text-xs font-bold text-blue-700 dark:text-blue-400 mb-2 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  {isRtl ? "الشركة والأنشطة التجارية *" : "Company & Business Activities *"}
                </p>
              </div>
              <div>
                <Label className="text-xs font-semibold">{isRtl ? "الشركة *" : "Company *"}</Label>
                <Select value={form.companyId ? String(form.companyId) : ""} onValueChange={v => setForm(p => ({ ...p, companyId: parseInt(v), activityIds: [] }))}>
                  <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue placeholder={isRtl ? "— اختر الشركة —" : "— Select Company —"} /></SelectTrigger>
                  <SelectContent>{companies.map(c => <SelectItem key={c.id} value={String(c.id)}>{isRtl ? c.nameAr : c.nameEn}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs font-semibold">{isRtl ? "الأنشطة التجارية * (اختر نشاطاً أو أكثر)" : "Business Activities * (select one or more)"}</Label>
                {!form.companyId ? (
                  <p className="text-xs text-muted-foreground mt-1.5">{isRtl ? "اختر الشركة أولاً لعرض أنشطتها." : "Select a company first to see its activities."}</p>
                ) : activitiesForCompany.length === 0 ? (
                  <p className="text-xs text-amber-600 mt-1.5">{isRtl ? "لا توجد أنشطة تجارية نشطة لهذه الشركة." : "No active activities found for this company."}</p>
                ) : (
                  <div className="mt-1.5 border border-border/60 rounded-md divide-y divide-border/40 max-h-40 overflow-y-auto">
                    {activitiesForCompany.map(act => (
                      <label key={act.id} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-accent/40 text-sm">
                        <input type="checkbox" className="accent-primary w-4 h-4 rounded" checked={(form.activityIds || []).includes(act.id)} onChange={() => toggleActivity(act.id)} />
                        <Layers className="w-3.5 h-3.5 text-violet-500" />
                        <span>{isRtl ? act.nameAr : act.nameEn}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Personal & HR fields */}
            <div className="grid grid-cols-2 gap-3">
              {([
                { label: isRtl ? "الاسم بالعربية *" : "Arabic Name *", field: "nameAr" },
                { label: isRtl ? "الاسم بالإنجليزية *" : "English Name *", field: "nameEn" },
                { label: isRtl ? "البريد الإلكتروني *" : "Email *", field: "email" },
                { label: isRtl ? "الهاتف" : "Phone", field: "phone" },
                { label: isRtl ? "المسمى الوظيفي (EN)" : "Job Title (EN)", field: "jobTitle" },
                { label: isRtl ? "المسمى الوظيفي (AR)" : "Job Title (AR)", field: "jobTitleAr" },
                { label: isRtl ? "تاريخ التعيين" : "Hire Date", field: "hireDate", type: "date" },
                { label: isRtl ? "الجنسية" : "Nationality", field: "nationality" },
                { label: isRtl ? "رقم الإقامة / الهوية" : "ID / Iqama No.", field: "iqama" },
                { label: isRtl ? "الراتب الأساسي" : "Basic Salary", field: "baseSalary", type: "number" },
                { label: isRtl ? "بدل السكن" : "Housing Allow.", field: "housingAllowance", type: "number" },
                { label: isRtl ? "بدل المواصلات" : "Transport Allow.", field: "transportAllowance", type: "number" },
              ] as any[]).map((f: any) => (
                <div key={f.field}>
                  <Label className="text-xs font-semibold">{f.label}</Label>
                  <Input type={f.type || "text"} className="mt-1 h-8 text-sm" value={(form as any)[f.field] || ""} onChange={e => setForm(p => ({ ...p, [f.field]: f.type === "number" ? Number(e.target.value) : e.target.value }))} />
                </div>
              ))}
              <div>
                <Label className="text-xs font-semibold">{isRtl ? "القسم" : "Department"}</Label>
                <Select value={form.department || "engineering"} onValueChange={v => setForm(p => ({ ...p, department: v }))}>
                  <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d.id} value={d.id}>{isRtl ? d.ar : d.en}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">{isRtl ? "نوع العقد" : "Contract Type"}</Label>
                <Select value={form.contractType || "permanent"} onValueChange={v => setForm(p => ({ ...p, contractType: v as any }))}>
                  <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="permanent">{isRtl ? "دائم" : "Permanent"}</SelectItem>
                    <SelectItem value="contract">{isRtl ? "عقد" : "Contract"}</SelectItem>
                    <SelectItem value="part_time">{isRtl ? "دوام جزئي" : "Part-time"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">{isRtl ? "الحالة" : "Status"}</Label>
                <Select value={form.status || "active"} onValueChange={v => setForm(p => ({ ...p, status: v as any }))}>
                  <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{isRtl ? "نشط" : "Active"}</SelectItem>
                    <SelectItem value="on_leave">{isRtl ? "إجازة" : "On Leave"}</SelectItem>
                    <SelectItem value="inactive">{isRtl ? "غير نشط" : "Inactive"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <p className="text-xs text-muted-foreground flex items-center gap-1.5 px-1">
              <FileText className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              {isRtl
                ? "لتحديث تواريخ انتهاء الوثائق (الهوية، التأشيرة، الجواز، التأمين) انتقل إلى تبويب «الوثائق والصلاحيات» بعد الحفظ."
                : "To update document expiry dates (ID, visa, passport, insurance) go to the «Document Expiry» tab after saving."}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>{isRtl ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin me-1" /> : null}
              {isRtl ? "حفظ" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
