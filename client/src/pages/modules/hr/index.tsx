import { useState, useEffect } from "react";
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
import { Users, Plus, Search, Edit, Trash2, UserCheck, UserX, TrendingUp, Building2, MoreHorizontal, Phone, Mail, Calendar, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Employee {
  id: string;
  empNo: string;
  nameAr: string;
  nameEn: string;
  department: string;
  jobTitle: string;
  jobTitleAr: string;
  nationality: string;
  iqama?: string;
  phone: string;
  email: string;
  hireDate: string;
  baseSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  status: "active" | "inactive" | "on_leave";
  contractType: "permanent" | "contract" | "part_time";
}

const DEPARTMENTS = [
  { id: "engineering", ar: "الهندسة", en: "Engineering" },
  { id: "safety", ar: "السلامة", en: "Safety & HSE" },
  { id: "environment", ar: "البيئة", en: "Environment" },
  { id: "finance", ar: "المالية", en: "Finance" },
  { id: "hr", ar: "الموارد البشرية", en: "Human Resources" },
  { id: "operations", ar: "العمليات", en: "Operations" },
  { id: "it", ar: "تقنية المعلومات", en: "Information Technology" },
  { id: "admin", ar: "الإدارة", en: "Administration" },
];

const SEED_EMPLOYEES: Employee[] = [
  { id: "1", empNo: "EMP-001", nameAr: "أحمد محمد الغامدي", nameEn: "Ahmed Mohammed Al-Ghamdi", department: "engineering", jobTitle: "Senior Engineer", jobTitleAr: "مهندس أول", nationality: "Saudi", phone: "+966501234567", email: "ahmed@scapex.sa", hireDate: "2021-03-15", baseSalary: 15000, housingAllowance: 3000, transportAllowance: 1000, status: "active", contractType: "permanent" },
  { id: "2", empNo: "EMP-002", nameAr: "سارة علي القحطاني", nameEn: "Sara Ali Al-Qahtani", department: "hr", jobTitle: "HR Manager", jobTitleAr: "مديرة موارد بشرية", nationality: "Saudi", phone: "+966509876543", email: "sara@scapex.sa", hireDate: "2020-06-01", baseSalary: 18000, housingAllowance: 4000, transportAllowance: 1200, status: "active", contractType: "permanent" },
  { id: "3", empNo: "EMP-003", nameAr: "محمد خالد الزهراني", nameEn: "Mohammed Khalid Al-Zahrani", department: "safety", jobTitle: "HSE Officer", jobTitleAr: "مسؤول السلامة", nationality: "Saudi", phone: "+966555123456", email: "mohammed@scapex.sa", hireDate: "2022-01-10", baseSalary: 12000, housingAllowance: 2500, transportAllowance: 800, status: "active", contractType: "permanent" },
  { id: "4", empNo: "EMP-004", nameAr: "Rajesh Kumar", nameEn: "Rajesh Kumar", department: "engineering", jobTitle: "Civil Engineer", jobTitleAr: "مهندس مدني", nationality: "Indian", iqama: "2456789012", phone: "+966561234567", email: "rajesh@scapex.sa", hireDate: "2021-09-20", baseSalary: 9000, housingAllowance: 2000, transportAllowance: 700, status: "active", contractType: "contract" },
  { id: "5", empNo: "EMP-005", nameAr: "فاطمة عبدالله الشهري", nameEn: "Fatima Abdullah Al-Shahri", department: "finance", jobTitle: "Accountant", jobTitleAr: "محاسبة", nationality: "Saudi", phone: "+966572345678", email: "fatima@scapex.sa", hireDate: "2022-07-05", baseSalary: 11000, housingAllowance: 2500, transportAllowance: 800, status: "on_leave", contractType: "permanent" },
  { id: "6", empNo: "EMP-006", nameAr: "Abdullah Hassan Al-Otaibi", nameEn: "Abdullah Hassan Al-Otaibi", department: "operations", jobTitle: "Project Coordinator", jobTitleAr: "منسق مشاريع", nationality: "Saudi", phone: "+966583456789", email: "abdullah@scapex.sa", hireDate: "2023-02-14", baseSalary: 10000, housingAllowance: 2000, transportAllowance: 700, status: "active", contractType: "permanent" },
];

const STORAGE_KEY = "scapex_hr_employees";

function loadEmployees(): Employee[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : SEED_EMPLOYEES;
  } catch { return SEED_EMPLOYEES; }
}

function saveEmployees(emps: Employee[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(emps));
}

export default function HRModule() {
  const { dir, language } = useLanguage();
  const isRtl = dir === "rtl";
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>(loadEmployees);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editEmp, setEditEmp] = useState<Employee | null>(null);
  const [form, setForm] = useState<Partial<Employee>>({});

  const filtered = employees.filter(e => {
    const q = search.toLowerCase();
    const matchQ = !q || e.nameAr.includes(q) || e.nameEn.toLowerCase().includes(q) || e.empNo.toLowerCase().includes(q) || e.email.toLowerCase().includes(q);
    const matchDept = deptFilter === "all" || e.department === deptFilter;
    return matchQ && matchDept;
  });

  const stats = {
    total: employees.length,
    active: employees.filter(e => e.status === "active").length,
    onLeave: employees.filter(e => e.status === "on_leave").length,
    saudi: employees.filter(e => e.nationality === "Saudi").length,
  };

  const openAdd = () => { setEditEmp(null); setForm({ status: "active", contractType: "permanent", nationality: "Saudi", department: "engineering" }); setShowDialog(true); };
  const openEdit = (e: Employee) => { setEditEmp(e); setForm(e); setShowDialog(true); };

  const handleSave = () => {
    if (!form.nameAr || !form.nameEn || !form.email) { toast({ title: isRtl ? "يرجى ملء الحقول المطلوبة" : "Fill required fields", variant: "destructive" }); return; }
    if (editEmp) {
      const updated = employees.map(e => e.id === editEmp.id ? { ...editEmp, ...form } as Employee : e);
      setEmployees(updated); saveEmployees(updated);
      toast({ title: isRtl ? "تم تحديث بيانات الموظف" : "Employee updated" });
    } else {
      const newEmp: Employee = { ...form as Employee, id: Date.now().toString(), empNo: `EMP-${String(employees.length + 1).padStart(3, "0")}` };
      const updated = [...employees, newEmp]; setEmployees(updated); saveEmployees(updated);
      toast({ title: isRtl ? "تم إضافة الموظف بنجاح" : "Employee added" });
    }
    setShowDialog(false);
  };

  const handleDelete = (id: string) => {
    const updated = employees.filter(e => e.id !== id); setEmployees(updated); saveEmployees(updated);
    toast({ title: isRtl ? "تم حذف الموظف" : "Employee deleted" });
  };

  const statusColor = (s: string) => s === "active" ? "default" : s === "on_leave" ? "secondary" : "destructive";
  const statusLabel = (s: string) => s === "active" ? (isRtl ? "نشط" : "Active") : s === "on_leave" ? (isRtl ? "إجازة" : "On Leave") : (isRtl ? "غير نشط" : "Inactive");
  const deptLabel = (id: string) => { const d = DEPARTMENTS.find(x => x.id === id); return d ? (isRtl ? d.ar : d.en) : id; };

  return (
    <MainLayout>
      <div className="flex flex-col gap-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{isRtl ? "الموارد البشرية" : "Human Resources"}</h1>
            <p className="text-muted-foreground text-sm mt-1">{isRtl ? "إدارة الموظفين، العقود، والبيانات الوظيفية" : "Manage employees, contracts, and HR data"}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm"><Download className="w-4 h-4 me-1.5" />{isRtl ? "تصدير" : "Export"}</Button>
            <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 me-1.5" />{isRtl ? "إضافة موظف" : "Add Employee"}</Button>
          </div>
        </div>

        {/* Stats */}
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
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="employees">{isRtl ? "الموظفون" : "Employees"}</TabsTrigger>
            <TabsTrigger value="departments">{isRtl ? "الأقسام" : "Departments"}</TabsTrigger>
          </TabsList>

          <TabsContent value="employees" className="mt-4 space-y-3">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground", isRtl ? "right-3" : "left-3")} />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={isRtl ? "بحث..." : "Search..."} className={cn("h-9 bg-secondary/30", isRtl ? "pr-9" : "pl-9")} />
              </div>
              <Select value={deptFilter} onValueChange={setDeptFilter}>
                <SelectTrigger className="w-40 h-9 bg-secondary/30"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRtl ? "كل الأقسام" : "All Departments"}</SelectItem>
                  {DEPARTMENTS.map(d => <SelectItem key={d.id} value={d.id}>{isRtl ? d.ar : d.en}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <Card className="border-border/50 overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/40">
                    <TableRow>
                      <TableHead>{isRtl ? "الرقم الوظيفي" : "Emp No."}</TableHead>
                      <TableHead>{isRtl ? "الاسم" : "Name"}</TableHead>
                      <TableHead>{isRtl ? "القسم" : "Department"}</TableHead>
                      <TableHead>{isRtl ? "المسمى الوظيفي" : "Job Title"}</TableHead>
                      <TableHead>{isRtl ? "الجنسية" : "Nationality"}</TableHead>
                      <TableHead>{isRtl ? "الراتب الأساسي" : "Basic Salary"}</TableHead>
                      <TableHead>{isRtl ? "الحالة" : "Status"}</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(emp => (
                      <TableRow key={emp.id} className="hover:bg-muted/40">
                        <TableCell className="font-mono text-xs text-muted-foreground">{emp.empNo}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{emp.nameAr[0]}</div>
                            <div><p className="font-medium text-sm">{isRtl ? emp.nameAr : emp.nameEn}</p><p className="text-xs text-muted-foreground">{emp.email}</p></div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{deptLabel(emp.department)}</TableCell>
                        <TableCell className="text-sm">{isRtl ? emp.jobTitleAr : emp.jobTitle}</TableCell>
                        <TableCell className="text-sm">{emp.nationality === "Saudi" ? (isRtl ? "سعودي" : "Saudi") : emp.nationality}</TableCell>
                        <TableCell className="text-sm font-medium">{emp.baseSalary.toLocaleString()} {isRtl ? "ر.س" : "SAR"}</TableCell>
                        <TableCell><Badge variant={statusColor(emp.status) as any}>{statusLabel(emp.status)}</Badge></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(emp)}><Edit className="w-3.5 h-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(emp.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="departments" className="mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {DEPARTMENTS.map(dept => {
                const count = employees.filter(e => e.department === dept.id && e.status === "active").length;
                return (
                  <Card key={dept.id} className="border-border/50 hover:border-primary/30 transition-colors">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Building2 className="w-5 h-5 text-primary" /></div>
                      <div className="flex-1"><p className="font-semibold text-sm">{isRtl ? dept.ar : dept.en}</p><p className="text-xs text-muted-foreground">{count} {isRtl ? "موظف نشط" : "active employees"}</p></div>
                      <Badge variant="secondary">{count}</Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editEmp ? (isRtl ? "تعديل بيانات الموظف" : "Edit Employee") : (isRtl ? "إضافة موظف جديد" : "Add New Employee")}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            {[
              { label: isRtl ? "الاسم بالعربية *" : "Arabic Name *", field: "nameAr" },
              { label: isRtl ? "الاسم بالإنجليزية *" : "English Name *", field: "nameEn" },
              { label: isRtl ? "البريد الإلكتروني *" : "Email *", field: "email" },
              { label: isRtl ? "الهاتف" : "Phone", field: "phone" },
              { label: isRtl ? "المسمى الوظيفي (EN)" : "Job Title (EN)", field: "jobTitle" },
              { label: isRtl ? "المسمى الوظيفي (AR)" : "Job Title (AR)", field: "jobTitleAr" },
              { label: isRtl ? "تاريخ التعيين" : "Hire Date", field: "hireDate", type: "date" },
              { label: isRtl ? "الجنسية" : "Nationality", field: "nationality" },
              { label: isRtl ? "رقم الإقامة" : "Iqama No.", field: "iqama" },
              { label: isRtl ? "الراتب الأساسي" : "Basic Salary", field: "baseSalary", type: "number" },
              { label: isRtl ? "بدل السكن" : "Housing Allow.", field: "housingAllowance", type: "number" },
              { label: isRtl ? "بدل المواصلات" : "Transport Allow.", field: "transportAllowance", type: "number" },
            ].map(f => (
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>{isRtl ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={handleSave}>{isRtl ? "حفظ" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
