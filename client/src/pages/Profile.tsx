import { useState, useEffect, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  User, Phone, Lock, IdCard, Mail, Building2, ShieldCheck,
  Eye, EyeOff, Save, RefreshCw, CheckCircle2, Link2,
  Calendar, Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { dbGetItem, dbSetItem } from "@/lib/dbStorage";
import { type SystemUser, ROLE_LABELS } from "@/lib/permissions";

function rl(role: string) {
  return ROLE_LABELS[role as keyof typeof ROLE_LABELS] || ROLE_LABELS.viewer;
}

interface LinkedEmployee {
  id: string | number;
  name: string;
  nameEn?: string;
  department?: string;
  position?: string;
  phone?: string;
  email?: string;
  nationalId?: string;
  employeeNumber?: string;
  joinDate?: string;
  status?: string;
}

export default function Profile() {
  const { toast } = useToast();
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";

  const currentUser: SystemUser | null = JSON.parse(dbGetItem("user") || "null");

  // ── Phone Change ──────────────────────────────────────────────────────────
  const [phone, setPhone] = useState(currentUser?.phone || "");
  const [savingPhone, setSavingPhone] = useState(false);

  // ── Password Change ───────────────────────────────────────────────────────
  const [pwForm, setPwForm] = useState({ current: "", newPw: "", confirm: "" });
  const [showPw, setShowPw] = useState({ current: false, newPw: false, confirm: false });
  const [savingPw, setSavingPw] = useState(false);

  // ── Linked Employee ───────────────────────────────────────────────────────
  const [linkedEmployee, setLinkedEmployee] = useState<LinkedEmployee | null>(null);
  const [loadingEmployee, setLoadingEmployee] = useState(false);

  const fetchLinkedEmployee = useCallback(async () => {
    if (!currentUser?.nationalId && !currentUser?.email) return;
    setLoadingEmployee(true);
    try {
      const res = await fetch("/api/employees");
      if (!res.ok) return;
      const employees: any[] = await res.json();
      const match = employees.find((e) => {
        if (currentUser.nationalId && e.nationalId && e.nationalId === currentUser.nationalId) return true;
        if (currentUser.email && e.email && e.email.toLowerCase() === currentUser.email.toLowerCase()) return true;
        return false;
      });
      if (match) {
        setLinkedEmployee({
          id: match.id,
          name: match.name || match.nameAr || "",
          nameEn: match.nameEn || "",
          department: match.department || "",
          position: match.position || "",
          phone: match.phone || "",
          email: match.email || "",
          nationalId: match.nationalId || "",
          employeeNumber: match.employeeNumber || match.employee_number || "",
          joinDate: match.joinDate || match.join_date || "",
          status: match.status || "",
        });
      }
    } catch {}
    setLoadingEmployee(false);
  }, [currentUser?.nationalId, currentUser?.email]);

  useEffect(() => { fetchLinkedEmployee(); }, [fetchLinkedEmployee]);

  const handlePhoneSave = async () => {
    if (!currentUser) return;
    const cleaned = phone.replace(/\s/g, "");
    if (cleaned && !/^[+\d]{7,15}$/.test(cleaned)) {
      toast({ title: isRtl ? "رقم جوال غير صحيح" : "Invalid phone", description: isRtl ? "أدخل رقم جوال صحيح" : "Enter a valid phone number", variant: "destructive" });
      return;
    }
    setSavingPhone(true);
    try {
      const res = await fetch(`/api/users/${currentUser.id}/phone`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleaned }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast({ title: isRtl ? "فشل التحديث" : "Update failed", description: err.error || "", variant: "destructive" });
        return;
      }
      const updated = { ...currentUser, phone: cleaned };
      dbSetItem("user", JSON.stringify(updated));
      toast({ title: isRtl ? "تم تحديث الجوال" : "Phone updated", description: isRtl ? "تم حفظ رقم الجوال بنجاح" : "Phone number saved successfully" });
    } catch {
      toast({ title: isRtl ? "خطأ في الاتصال" : "Network error", variant: "destructive" });
    }
    setSavingPhone(false);
  };

  const handlePasswordSave = async () => {
    if (!currentUser) return;
    if (!pwForm.current) {
      toast({ title: isRtl ? "مطلوب" : "Required", description: isRtl ? "أدخل كلمة المرور الحالية" : "Enter your current password", variant: "destructive" });
      return;
    }
    if (pwForm.newPw.length < 6) {
      toast({ title: isRtl ? "كلمة مرور قصيرة" : "Too short", description: isRtl ? "يجب أن تكون 6 أحرف على الأقل" : "Must be at least 6 characters", variant: "destructive" });
      return;
    }
    if (pwForm.newPw !== pwForm.confirm) {
      toast({ title: isRtl ? "كلمتا المرور لا تتطابقان" : "Passwords don't match", variant: "destructive" });
      return;
    }
    setSavingPw(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id, currentPassword: pwForm.current, newPassword: pwForm.newPw }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast({ title: isRtl ? "فشل تغيير كلمة المرور" : "Failed", description: isRtl && err.error === "Current password is incorrect" ? "كلمة المرور الحالية غير صحيحة" : err.error || "", variant: "destructive" });
        return;
      }
      setPwForm({ current: "", newPw: "", confirm: "" });
      toast({ title: isRtl ? "تم تغيير كلمة المرور" : "Password changed", description: isRtl ? "تم تغيير كلمة المرور بنجاح" : "Your password has been changed successfully" });
    } catch {
      toast({ title: isRtl ? "خطأ في الاتصال" : "Network error", variant: "destructive" });
    }
    setSavingPw(false);
  };

  if (!currentUser) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">{isRtl ? "غير مسجّل الدخول" : "Not logged in"}</p>
        </div>
      </MainLayout>
    );
  }

  const allRoles = (currentUser.roles && currentUser.roles.length > 0 ? currentUser.roles : [currentUser.role]) as string[];

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto flex flex-col gap-6" dir={dir}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{isRtl ? "ملفي الشخصي" : "My Profile"}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {isRtl ? "عرض بياناتك وتعديل معلومات الدخول" : "View your profile and update login information"}
          </p>
        </div>

        {/* ── Profile Card ───────────────────────────────────────────────── */}
        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center">
              {/* Avatar */}
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold text-2xl border border-primary/20">
                {currentUser.name?.charAt(0).toUpperCase() ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold">{currentUser.name}</h2>
                <p className="text-sm text-muted-foreground">{currentUser.email}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {allRoles.map((r) => (
                    <Badge key={r} variant="outline" className={cn("border-transparent text-xs", rl(r).color)}>
                      {isRtl ? rl(r).ar : rl(r).en}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1 text-xs text-muted-foreground shrink-0">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(currentUser.createdAt || Date.now()).toLocaleDateString(isRtl ? "ar-SA" : "en-GB")}
                </span>
                <span className={cn("flex items-center gap-1.5", currentUser.active ? "text-emerald-600" : "text-destructive")}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {isRtl ? (currentUser.active ? "حساب نشط" : "حساب موقوف") : (currentUser.active ? "Active" : "Inactive")}
                </span>
              </div>
            </div>

            <Separator className="my-5" />

            {/* Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow
                icon={<IdCard className="w-4 h-4" />}
                label={isRtl ? "رقم الهوية الوطنية" : "National ID"}
                value={currentUser.nationalId || (isRtl ? "غير محدد" : "Not set")}
                mono
              />
              <InfoRow
                icon={<Phone className="w-4 h-4" />}
                label={isRtl ? "رقم الجوال" : "Phone"}
                value={currentUser.phone || (isRtl ? "غير محدد" : "Not set")}
                mono
              />
              <InfoRow
                icon={<Mail className="w-4 h-4" />}
                label={isRtl ? "البريد الإلكتروني" : "Email"}
                value={currentUser.email}
              />
              <InfoRow
                icon={<ShieldCheck className="w-4 h-4" />}
                label={isRtl ? "الصلاحيات" : "Permissions"}
                value={`${currentUser.permissions?.length ?? 0} ${isRtl ? "وحدة" : "modules"}`}
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Linked Employee Card ────────────────────────────────────────── */}
        <Card className={cn("border-border/50", linkedEmployee && "border-blue-300/50 dark:border-blue-700/40")}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Link2 className={cn("w-4 h-4", linkedEmployee ? "text-blue-500" : "text-muted-foreground")} />
              {isRtl ? "الربط بملف الموظف" : "Linked Employee Record"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingEmployee ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                {isRtl ? "جارٍ البحث..." : "Searching..."}
              </div>
            ) : linkedEmployee ? (
              <div className="bg-blue-500/5 border border-blue-300/30 dark:border-blue-700/30 rounded-xl p-4">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0 text-blue-600 font-bold text-base border border-blue-300/30">
                    {linkedEmployee.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{linkedEmployee.name}</p>
                      {linkedEmployee.nameEn && linkedEmployee.nameEn !== linkedEmployee.name && (
                        <p className="text-sm text-muted-foreground">{linkedEmployee.nameEn}</p>
                      )}
                      {linkedEmployee.status && (
                        <Badge variant="outline" className={cn("text-[10px] border-transparent",
                          linkedEmployee.status === "active" ? "bg-emerald-500/10 text-emerald-700" : "bg-secondary text-muted-foreground"
                        )}>
                          {linkedEmployee.status === "active" ? (isRtl ? "نشط" : "Active") : linkedEmployee.status}
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 mt-2">
                      {linkedEmployee.employeeNumber && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Briefcase className="w-3 h-3" />
                          {isRtl ? "رقم الموظف:" : "Emp #:"} <span className="font-mono text-foreground">{linkedEmployee.employeeNumber}</span>
                        </span>
                      )}
                      {linkedEmployee.department && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Building2 className="w-3 h-3" />
                          {linkedEmployee.department}
                        </span>
                      )}
                      {linkedEmployee.position && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <User className="w-3 h-3" />
                          {linkedEmployee.position}
                        </span>
                      )}
                      {linkedEmployee.nationalId && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <IdCard className="w-3 h-3" />
                          <span className="font-mono text-foreground">{linkedEmployee.nationalId}</span>
                        </span>
                      )}
                      {linkedEmployee.joinDate && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Calendar className="w-3 h-3" />
                          {new Date(linkedEmployee.joinDate).toLocaleDateString(isRtl ? "ar-SA" : "en-GB")}
                        </span>
                      )}
                      {linkedEmployee.phone && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Phone className="w-3 h-3" />
                          {linkedEmployee.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-sm text-muted-foreground py-2 px-3 rounded-lg bg-secondary/40">
                <IdCard className="w-4 h-4 shrink-0" />
                <span>
                  {currentUser.nationalId
                    ? (isRtl ? "لم يتم العثور على ملف موظف مرتبط برقم الهوية هذا" : "No employee record linked to this national ID")
                    : (isRtl ? "أضف رقم الهوية الوطنية لربط ملف الموظف تلقائياً" : "Add your National ID to auto-link your employee record")}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Change Phone ───────────────────────────────────────────────── */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Phone className="w-4 h-4 text-primary" />
              {isRtl ? "تغيير رقم الجوال" : "Update Phone Number"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone-input">
                {isRtl ? "رقم الجوال الجديد" : "New Phone Number"}
              </Label>
              <div className="flex gap-3">
                <Input
                  id="phone-input"
                  data-testid="input-profile-phone"
                  placeholder="+966 5X XXX XXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{ direction: "ltr", textAlign: "left" }}
                  className="flex-1"
                />
                <Button
                  data-testid="button-save-phone"
                  onClick={handlePhoneSave}
                  disabled={savingPhone}
                  className="gap-2 shrink-0"
                >
                  {savingPhone ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {isRtl ? "حفظ" : "Save"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {isRtl ? "أدخل رقم الجوال بصيغة دولية مثل: +966501234567" : "Enter in international format e.g. +966501234567"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ── Change Password ────────────────────────────────────────────── */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lock className="w-4 h-4 text-primary" />
              {isRtl ? "تغيير كلمة المرور" : "Change Password"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current Password */}
            <div className="space-y-2">
              <Label htmlFor="current-pw">{isRtl ? "كلمة المرور الحالية" : "Current Password"}</Label>
              <div className="relative">
                <Input
                  id="current-pw"
                  data-testid="input-current-password"
                  type={showPw.current ? "text" : "password"}
                  placeholder="••••••••"
                  value={pwForm.current}
                  onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
                  className="ps-10"
                />
                <button
                  type="button"
                  className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPw({ ...showPw, current: !showPw.current })}
                >
                  {showPw.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="new-pw">{isRtl ? "كلمة المرور الجديدة" : "New Password"}</Label>
              <div className="relative">
                <Input
                  id="new-pw"
                  data-testid="input-new-password"
                  type={showPw.newPw ? "text" : "password"}
                  placeholder="••••••••"
                  value={pwForm.newPw}
                  onChange={(e) => setPwForm({ ...pwForm, newPw: e.target.value })}
                  className="ps-10"
                />
                <button
                  type="button"
                  className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPw({ ...showPw, newPw: !showPw.newPw })}
                >
                  {showPw.newPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {/* Strength indicator */}
              {pwForm.newPw.length > 0 && (
                <div className="flex items-center gap-2">
                  {[...Array(4)].map((_, i) => {
                    const strength = getPasswordStrength(pwForm.newPw);
                    return (
                      <div key={i} className={cn("h-1 flex-1 rounded-full transition-colors",
                        i < strength ? strengthColor(strength) : "bg-border")} />
                    );
                  })}
                  <span className="text-xs text-muted-foreground">
                    {isRtl ? strengthLabelAr(getPasswordStrength(pwForm.newPw)) : strengthLabelEn(getPasswordStrength(pwForm.newPw))}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirm-pw">{isRtl ? "تأكيد كلمة المرور" : "Confirm New Password"}</Label>
              <div className="relative">
                <Input
                  id="confirm-pw"
                  data-testid="input-confirm-password"
                  type={showPw.confirm ? "text" : "password"}
                  placeholder="••••••••"
                  value={pwForm.confirm}
                  onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
                  className={cn("ps-10", pwForm.confirm.length > 0 && pwForm.confirm !== pwForm.newPw ? "border-destructive" : "")}
                />
                <button
                  type="button"
                  className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPw({ ...showPw, confirm: !showPw.confirm })}
                >
                  {showPw.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {pwForm.confirm.length > 0 && pwForm.confirm !== pwForm.newPw && (
                <p className="text-xs text-destructive">{isRtl ? "كلمتا المرور لا تتطابقان" : "Passwords don't match"}</p>
              )}
              {pwForm.confirm.length > 0 && pwForm.confirm === pwForm.newPw && (
                <p className="text-xs text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {isRtl ? "كلمتا المرور متطابقتان" : "Passwords match"}
                </p>
              )}
            </div>

            <Button
              data-testid="button-change-password"
              onClick={handlePasswordSave}
              disabled={savingPw}
              className="w-full gap-2"
            >
              {savingPw ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              {isRtl ? "تغيير كلمة المرور" : "Change Password"}
            </Button>
          </CardContent>
        </Card>

      </div>
    </MainLayout>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function InfoRow({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/40">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn("text-sm font-medium truncate", mono && "font-mono tracking-wider")}>{value}</p>
      </div>
    </div>
  );
}

function getPasswordStrength(pw: string): number {
  let s = 0;
  if (pw.length >= 6) s++;
  if (pw.length >= 10) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}
function strengthColor(s: number) {
  if (s <= 1) return "bg-destructive";
  if (s === 2) return "bg-amber-500";
  if (s === 3) return "bg-blue-500";
  return "bg-emerald-500";
}
function strengthLabelAr(s: number) {
  return ["ضعيفة", "مقبولة", "جيدة", "قوية"][s - 1] || "ضعيفة";
}
function strengthLabelEn(s: number) {
  return ["Weak", "Fair", "Good", "Strong"][s - 1] || "Weak";
}
