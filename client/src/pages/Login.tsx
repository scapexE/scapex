import { dbGetItem, dbSetItem, dbRemoveItem } from "@/lib/dbStorage";
import { useState, useEffect, useCallback } from "react";
import { getUsers, validateNationalId } from "@/lib/permissions";
import { useLanguage } from "@/contexts/LanguageContext";
import { logAction } from "@/lib/auditLog";
import { getSystemSettings } from "@/lib/companySettings";

type Tab = "login" | "register";
type ForgotStep = "idle" | "enter_email" | "enter_code" | "new_password" | "done";
type RegStep = "form" | "verify_email" | "submitted";

const isDevMode = () => new URLSearchParams(window.location.search).has("dev");

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "13px",
  color: "#9ca3af",
  marginBottom: "6px",
};

const linkStyle: React.CSSProperties = {
  color: "#60a5fa",
  fontSize: "13px",
  cursor: "pointer",
  background: "none",
  border: "none",
  textDecoration: "underline",
  padding: 0,
  fontFamily: "inherit",
};

const errorBoxStyle: React.CSSProperties = {
  background: "#450a0a",
  border: "1px solid #7f1d1d",
  borderRadius: "8px",
  padding: "10px 12px",
  fontSize: "13px",
  color: "#fca5a5",
};

const successBoxStyle: React.CSSProperties = {
  background: "#0f2a1a",
  border: "1px solid #166534",
  borderRadius: "10px",
  padding: "18px 16px",
  textAlign: "center" as const,
};

const codeInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px",
  borderRadius: "10px",
  border: "2px solid #3b82f6",
  background: "#1f2937",
  color: "white",
  fontSize: "24px",
  fontWeight: "bold",
  letterSpacing: "0.5em",
  textAlign: "center" as const,
  outline: "none",
  boxSizing: "border-box" as const,
  direction: "ltr" as const,
};

export default function Login() {
  const [tab, setTab] = useState<Tab>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.has("register") ? "register" : "login";
  });
  const [showAbout, setShowAbout] = useState(false);
  const { dir, language, toggleLanguage } = useLanguage();
  const isRtl = dir === "rtl";
  const brand = getSystemSettings();

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #374151",
    background: "#1f2937",
    color: "white",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
    direction: dir,
  };

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [forgotStep, setForgotStep] = useState<ForgotStep>("idle");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotUserCode, setForgotUserCode] = useState("");
  const [forgotNewPass, setForgotNewPass] = useState("");
  const [forgotConfirmPass, setForgotConfirmPass] = useState("");
  const [forgotError, setForgotError] = useState("");

  const [regNationalId, setRegNationalId] = useState("");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regVerifiedEmail, setRegVerifiedEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [regError, setRegError] = useState("");
  const [regStep, setRegStep] = useState<RegStep>("form");
  const [regUserCode, setRegUserCode] = useState("");

  const [loggingIn, setLoggingIn] = useState(false);
  const [submittingReg, setSubmittingReg] = useState(false);
  const [verifyingReg, setVerifyingReg] = useState(false);
  const [resendingReg, setResendingReg] = useState(false);
  const [sendingForgot, setSendingForgot] = useState(false);
  const [resettingForgot, setResettingForgot] = useState(false);
  const [resendingForgot, setResendingForgot] = useState(false);

  const [countdown, setCountdown] = useState(0);

  const resetRegForm = () => {
    setRegNationalId(""); setRegName(""); setRegEmail(""); setRegVerifiedEmail("");
    setRegPassword(""); setRegConfirm(""); setRegUserCode(""); setRegError("");
  };

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    const saved = dbGetItem("user");
    if (saved) {
      try {
        const u = JSON.parse(saved);
        if (!u.id || !u.permissions) dbRemoveItem("user");
      } catch {
        dbRemoveItem("user");
      }
    }
    getUsers();
  }, []);

  const handleLogin = async () => {
    setLoginError("");
    if (!email || !password) {
      setLoginError(isRtl ? "يرجى إدخال البريد الإلكتروني وكلمة المرور" : "Please enter your email and password");
      return;
    }
    setLoggingIn(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 403 && data.pendingApproval) {
          setLoginError(isRtl
            ? "طلبك قيد المراجعة. سيتم تفعيل حسابك بعد موافقة المشرف."
            : "Your request is under review. Your account will be activated after admin approval.");
        } else if (res.status === 401) {
          setLoginError(isRtl ? "البريد الإلكتروني أو كلمة المرور غير صحيحة" : "Incorrect email or password");
        } else if (res.status === 403) {
          setLoginError(isRtl ? "هذا الحساب معطّل. تواصل مع مدير النظام." : "This account is disabled. Contact the system admin.");
        } else if (res.status >= 500) {
          setLoginError(isRtl ? "خطأ في السيرفر. حاول لاحقاً." : "Server error. Please try again later.");
        } else {
          setLoginError(isRtl ? "تعذّر تسجيل الدخول" : "Could not sign in");
        }
        return;
      }
      const user = data.user;
      const localUser = {
        id: user.id,
        nationalId: user.nationalId || "",
        name: user.name || "",
        email: user.email || "",
        role: user.role || "viewer",
        roles: Array.isArray(user.roles) && user.roles.length ? user.roles : [user.role || "viewer"],
        permissions: user.permissions || [],
        createdAt: user.createdAt || new Date().toISOString(),
        active: user.isActive ?? true,
        lastActivityId: user.lastActivityId ?? null,
      };
      dbSetItem("user", JSON.stringify(localUser));
      if (data.token) localStorage.setItem("session_token", data.token);
      logAction("login", "auth", `User ${user.name} logged in`, `المستخدم ${user.name} سجّل دخول`);
      window.location.href = user.role === "client" ? "/client-portal" : "/dashboard";
    } catch (err) {
      setLoginError(isRtl ? "خطأ في الاتصال بالسيرفر" : "Server connection error");
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLoginKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLogin();
  };

  const handleForgotSendCode = async () => {
    setForgotError("");
    const trimmedEmail = forgotEmail.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setForgotError(isRtl ? "يرجى إدخال بريد إلكتروني صحيح" : "Please enter a valid email");
      return;
    }
    setSendingForgot(true);
    try {
      const res = await fetch("/api/auth/forgot-send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });
      if (!res.ok) {
        if (res.status === 429) {
          setForgotError(isRtl ? "يرجى الانتظار قبل طلب رمز جديد" : "Please wait before requesting another code");
        } else if (res.status >= 500) {
          setForgotError(isRtl ? "فشل إرسال الرمز — خطأ في السيرفر" : "Failed to send code — server error");
        } else {
          setForgotError(isRtl ? "تعذّر إرسال الرمز" : "Could not send code");
        }
        return;
      }
      setForgotEmail(trimmedEmail);
      setForgotUserCode("");
      setForgotStep("enter_code");
      setCountdown(600);
    } catch {
      setForgotError(isRtl ? "خطأ في الاتصال بالسيرفر" : "Server connection error");
    } finally {
      setSendingForgot(false);
    }
  };

  const handleForgotVerifyCode = () => {
    setForgotError("");
    if (!forgotUserCode || forgotUserCode.length !== 6) {
      setForgotError(isRtl ? "يرجى إدخال رمز التحقق المكوّن من 6 أرقام" : "Please enter the 6-digit verification code");
      return;
    }
    setForgotStep("new_password");
  };

  const handleForgotResetPassword = async () => {
    setForgotError("");
    if (!forgotNewPass || forgotNewPass.length < 6) {
      setForgotError(isRtl ? "كلمة المرور يجب أن تكون 6 أحرف على الأقل" : "Password must be at least 6 characters");
      return;
    }
    if (forgotNewPass !== forgotConfirmPass) {
      setForgotError(isRtl ? "كلمتا المرور غير متطابقتين" : "Passwords do not match");
      return;
    }
    setResettingForgot(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail, code: forgotUserCode, newPassword: forgotNewPass }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errMsg = data.error || "";
        if (errMsg.includes("Too many")) {
          setForgotError(isRtl ? "تم تجاوز عدد المحاولات. يرجى طلب رمز جديد" : errMsg);
          setForgotStep("enter_code");
        } else if (errMsg.includes("expired")) {
          setForgotError(isRtl ? "انتهت صلاحية الرمز. يرجى طلب رمز جديد" : errMsg);
          setForgotStep("enter_code");
        } else if (res.status === 404) {
          setForgotError(isRtl ? "الحساب غير موجود" : "Account not found");
        } else if (errMsg.includes("Invalid")) {
          setForgotError(isRtl ? "رمز التحقق غير صحيح" : "Invalid verification code");
          setForgotStep("enter_code");
        } else if (res.status >= 500) {
          setForgotError(isRtl ? "خطأ في السيرفر" : "Server error");
        } else {
          setForgotError(errMsg || (isRtl ? "تعذّر إعادة تعيين كلمة المرور" : "Could not reset password"));
        }
        return;
      }
      setForgotStep("done");
    } catch {
      setForgotError(isRtl ? "خطأ في الاتصال بالسيرفر" : "Server connection error");
    } finally {
      setResettingForgot(false);
    }
  };

  const resetForgot = () => {
    setForgotStep("idle");
    setForgotEmail("");
    setForgotUserCode("");
    setForgotNewPass("");
    setForgotConfirmPass("");
    setForgotError("");
    setCountdown(0);
  };

  const handleRegValidateForm = async () => {
    setRegError("");
    const trimmedName = regName.trim();
    const trimmedEmail = regEmail.trim();
    if (!regNationalId || !trimmedName || !trimmedEmail || !regPassword || !regConfirm) {
      setRegError(isRtl
        ? "يرجى ملء جميع الحقول المطلوبة (رقم الهوية، الاسم، البريد، كلمة المرور)"
        : "Please fill all required fields (National ID, name, email, password)");
      return;
    }
    if (trimmedName.length < 3) {
      setRegError(isRtl ? "الاسم يجب أن يكون 3 أحرف على الأقل" : "Name must be at least 3 characters");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setRegError(isRtl ? "صيغة البريد الإلكتروني غير صحيحة" : "Invalid email format");
      return;
    }
    if (!validateNationalId(regNationalId)) {
      setRegError(isRtl
        ? "رقم الهوية غير صحيح — يجب أن يكون 10 أرقام ويبدأ بـ 1 أو 2"
        : "Invalid National ID — must be 10 digits starting with 1 or 2");
      return;
    }
    if (regPassword !== regConfirm) {
      setRegError(isRtl ? "كلمتا المرور غير متطابقتين" : "Passwords do not match");
      return;
    }
    if (regPassword.length < 6) {
      setRegError(isRtl ? "كلمة المرور يجب أن تكون 6 أحرف على الأقل" : "Password must be at least 6 characters");
      return;
    }
    setSubmittingReg(true);
    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 409) {
          setRegError(isRtl ? "هذا البريد الإلكتروني مسجل مسبقاً" : "This email is already registered");
        } else if (res.status === 429) {
          setRegError(isRtl ? "يرجى الانتظار قبل طلب رمز جديد" : "Please wait before requesting another code");
        } else if (res.status >= 500) {
          setRegError(isRtl ? "فشل إرسال رمز التحقق — خطأ في السيرفر" : "Failed to send code — server error");
        } else {
          setRegError(isRtl ? "فشل إرسال رمز التحقق" : "Failed to send verification code");
        }
        return;
      }
      setRegUserCode("");
      setRegVerifiedEmail(trimmedEmail);
      setRegStep("verify_email");
      setCountdown(600);
    } catch {
      setRegError(isRtl ? "خطأ في الاتصال بالسيرفر" : "Server connection error");
    } finally {
      setSubmittingReg(false);
    }
  };

  const handleRegVerifyEmail = async () => {
    setRegError("");
    if (!regUserCode || regUserCode.length !== 6) {
      setRegError(isRtl ? "يرجى إدخال رمز التحقق المكوّن من 6 أرقام" : "Please enter the 6-digit verification code");
      return;
    }
    setVerifyingReg(true);
    try {
      const verifyRes = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: regVerifiedEmail, code: regUserCode }),
      });
      if (!verifyRes.ok) {
        const verifyData = await verifyRes.json().catch(() => ({}));
        const errMsg = verifyData.error || "";
        if (errMsg.includes("Too many")) {
          setRegError(isRtl ? "تم تجاوز عدد المحاولات المسموح. يرجى طلب رمز جديد" : errMsg);
        } else if (errMsg.includes("expired")) {
          setRegError(isRtl ? "انتهت صلاحية الرمز. يرجى طلب رمز جديد" : errMsg);
        } else {
          setRegError(isRtl ? "رمز التحقق غير صحيح" : "Invalid verification code");
        }
        return;
      }

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regName.trim(),
          email: regVerifiedEmail,
          password: regPassword,
          phone: "",
          nationalId: regNationalId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.error === "Email already registered") {
          setRegError(isRtl ? "البريد الإلكتروني مسجل مسبقاً" : "Email already registered");
        } else if (data.error === "National ID already registered") {
          setRegError(isRtl ? "رقم الهوية مسجّل مسبقاً" : "National ID already registered");
        } else {
          setRegError(isRtl ? "حدث خطأ في التسجيل" : "Registration error");
        }
        return;
      }
      setRegStep("submitted");
    } catch {
      setRegError(isRtl ? "خطأ في الاتصال بالسيرفر" : "Server connection error");
    } finally {
      setVerifyingReg(false);
    }
  };

  const handleResendCode = useCallback(async (type: "forgot" | "reg") => {
    if (type === "reg") {
      setRegError("");
      setResendingReg(true);
      try {
        const res = await fetch("/api/auth/send-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: regVerifiedEmail }),
        });
        if (res.ok) {
          setRegUserCode("");
          setCountdown(600);
        } else if (res.status === 429) {
          setRegError(isRtl ? "يرجى الانتظار قبل طلب رمز جديد" : "Please wait before requesting another code");
        } else {
          setRegError(isRtl ? "تعذّر إعادة إرسال الرمز" : "Could not resend code");
        }
      } catch {
        setRegError(isRtl ? "خطأ في الاتصال بالسيرفر" : "Server connection error");
      } finally {
        setResendingReg(false);
      }
    } else {
      setForgotError("");
      setResendingForgot(true);
      try {
        const res = await fetch("/api/auth/forgot-send-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: forgotEmail }),
        });
        if (res.ok) {
          setForgotUserCode("");
          setCountdown(600);
        } else if (res.status === 429) {
          setForgotError(isRtl ? "يرجى الانتظار قبل طلب رمز جديد" : "Please wait before requesting another code");
        } else {
          setForgotError(isRtl ? "تعذّر إعادة إرسال الرمز" : "Could not resend code");
        }
      } catch {
        setForgotError(isRtl ? "خطأ في الاتصال بالسيرفر" : "Server connection error");
      } finally {
        setResendingForgot(false);
      }
    }
  }, [regVerifiedEmail, forgotEmail, isRtl]);

  const handleRegisterKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (regStep === "form") handleRegValidateForm();
      else if (regStep === "verify_email") handleRegVerifyEmail();
    }
  };

  const renderCountdown = (type: "forgot" | "reg") => {
    const isResending = type === "reg" ? resendingReg : resendingForgot;
    return (
      <div style={{ textAlign: "center", marginTop: "6px" }}>
        {countdown > 0 ? (
          <span style={{ color: "#6b7280", fontSize: "12px" }}>
            {isRtl ? `إعادة الإرسال بعد ${countdown} ثانية` : `Resend in ${countdown}s`}
          </span>
        ) : (
          <button style={{ ...linkStyle, opacity: isResending ? 0.5 : 1, cursor: isResending ? "not-allowed" : "pointer" }} onClick={() => handleResendCode(type)} disabled={isResending}>
            {isResending ? (isRtl ? "جارٍ الإرسال..." : "Sending...") : (isRtl ? "إعادة إرسال الرمز" : "Resend Code")}
          </button>
        )}
      </div>
    );
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      background: "linear-gradient(135deg, #0b1220 0%, #0f1e38 100%)",
      fontFamily: "'Cairo', 'Inter', sans-serif",
      padding: "16px",
    }}>
      <div style={{
        background: "#111827",
        padding: "36px 32px 24px",
        borderRadius: "16px",
        width: "100%",
        maxWidth: "400px",
        color: "white",
        boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
        border: "1px solid #1f2937",
        display: "flex",
        flexDirection: "column",
      }}>
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          {brand.brandLogo ? (
            <img src={brand.brandLogo} alt={brand.brandName || "Logo"} style={{
              width: "60px", height: "60px", borderRadius: "14px", objectFit: "contain",
              margin: "0 auto 10px", display: "block", background: "transparent",
            }} />
          ) : (
            <div style={{
              width: "52px", height: "52px", borderRadius: "14px",
              background: "#3b82f6", display: "flex", alignItems: "center",
              justifyContent: "center", margin: "0 auto 10px",
              fontSize: "26px", fontWeight: "bold",
            }}>{(brand.brandName || "S").charAt(0).toUpperCase()}</div>
          )}
          <h1 style={{ fontSize: "22px", fontWeight: "bold", margin: 0 }}>{brand.brandName || "Scapex"}</h1>
          <p style={{ color: "#6b7280", fontSize: "13px", marginTop: "3px" }}>
            {isRtl ? (brand.brandSubtitleAr || "منصة إدارة الأعمال الذكية") : (brand.brandSubtitleEn || "Smart Business Management Platform")}
          </p>
        </div>

        {forgotStep !== "idle" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }} dir={dir}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <button style={{ ...linkStyle, fontSize: "14px", textDecoration: "none" }} onClick={resetForgot}>
                {isRtl ? "→" : "←"}
              </button>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700" }}>
                {forgotStep === "done"
                  ? (isRtl ? "تم التغيير بنجاح" : "Password Changed")
                  : (isRtl ? "استعادة كلمة المرور" : "Reset Password")}
              </h3>
            </div>

            {forgotStep === "enter_email" && (
              <>
                <p style={{ color: "#9ca3af", fontSize: "13px", margin: 0, lineHeight: "1.6" }}>
                  {isRtl
                    ? "أدخل بريدك الإلكتروني المسجّل وسنرسل لك رمز تحقق لإعادة تعيين كلمة المرور."
                    : "Enter your registered email and we'll send you a verification code to reset your password."}
                </p>
                <div>
                  <label style={labelStyle}>{isRtl ? "البريد الإلكتروني" : "Email"}</label>
                  <input
                    data-testid="input-forgot-email"
                    type="email"
                    placeholder="user@scapex.sa"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleForgotSendCode(); }}
                    style={{ ...inputStyle, direction: "ltr", textAlign: isRtl ? "right" : "left" }}
                    autoComplete="email"
                  />
                </div>
                {forgotError && <div style={errorBoxStyle}>{forgotError}</div>}
                <button
                  data-testid="button-forgot-send"
                  onClick={handleForgotSendCode}
                  disabled={sendingForgot}
                  style={{ width: "100%", padding: "11px", background: "#3b82f6", color: "white", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: "600", cursor: sendingForgot ? "not-allowed" : "pointer", opacity: sendingForgot ? 0.6 : 1 }}
                >
                  {sendingForgot ? (isRtl ? "جارٍ الإرسال..." : "Sending...") : (isRtl ? "إرسال رمز التحقق" : "Send Verification Code")}
                </button>
              </>
            )}

            {forgotStep === "enter_code" && (
              <>
                <p style={{ color: "#9ca3af", fontSize: "13px", margin: 0, textAlign: "center" }}>
                  {isRtl
                    ? `تم إرسال رمز التحقق إلى ${forgotEmail}`
                    : `Verification code sent to ${forgotEmail}`}
                </p>
                <div>
                  <label style={labelStyle}>{isRtl ? "رمز التحقق" : "Verification Code"}</label>
                  <input
                    data-testid="input-forgot-code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={forgotUserCode}
                    onChange={e => setForgotUserCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    onKeyDown={e => { if (e.key === "Enter") handleForgotVerifyCode(); }}
                    style={codeInputStyle}
                  />
                </div>
                {renderCountdown("forgot")}
                {forgotError && <div style={errorBoxStyle}>{forgotError}</div>}
                <button
                  data-testid="button-forgot-verify"
                  onClick={handleForgotVerifyCode}
                  style={{ width: "100%", padding: "11px", background: "#3b82f6", color: "white", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: "600", cursor: "pointer" }}
                >
                  {isRtl ? "تحقق من الرمز" : "Verify Code"}
                </button>
              </>
            )}

            {forgotStep === "new_password" && (
              <>
                <p style={{ color: "#9ca3af", fontSize: "13px", margin: 0 }}>
                  {isRtl ? "أدخل كلمة المرور الجديدة." : "Enter your new password."}
                </p>
                <div>
                  <label style={labelStyle}>{isRtl ? "كلمة المرور الجديدة" : "New Password"}</label>
                  <input
                    data-testid="input-forgot-newpass"
                    type="password"
                    placeholder={isRtl ? "6 أحرف على الأقل" : "At least 6 characters"}
                    value={forgotNewPass}
                    onChange={e => setForgotNewPass(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleForgotResetPassword(); }}
                    style={{ ...inputStyle, direction: "ltr" }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>{isRtl ? "تأكيد كلمة المرور" : "Confirm Password"}</label>
                  <input
                    data-testid="input-forgot-confirm"
                    type="password"
                    placeholder={isRtl ? "أعد كتابة كلمة المرور" : "Re-enter password"}
                    value={forgotConfirmPass}
                    onChange={e => setForgotConfirmPass(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleForgotResetPassword(); }}
                    style={{ ...inputStyle, direction: "ltr" }}
                  />
                </div>
                {forgotError && <div style={errorBoxStyle}>{forgotError}</div>}
                <button
                  data-testid="button-forgot-reset"
                  onClick={handleForgotResetPassword}
                  disabled={resettingForgot}
                  style={{ width: "100%", padding: "11px", background: "#059669", color: "white", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: "600", cursor: resettingForgot ? "not-allowed" : "pointer", opacity: resettingForgot ? 0.6 : 1 }}
                >
                  {resettingForgot ? (isRtl ? "جارٍ التغيير..." : "Resetting...") : (isRtl ? "تغيير كلمة المرور" : "Reset Password")}
                </button>
              </>
            )}

            {forgotStep === "done" && (
              <div style={successBoxStyle}>
                <div style={{ fontSize: "32px", marginBottom: "10px" }}>✅</div>
                <p style={{ color: "#86efac", fontSize: "15px", fontWeight: "700", margin: "0 0 8px" }}>
                  {isRtl ? "تم تغيير كلمة المرور بنجاح!" : "Password changed successfully!"}
                </p>
                <p style={{ color: "#4ade80", fontSize: "13px", margin: "0 0 16px", lineHeight: "1.6" }}>
                  {isRtl ? "يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة." : "You can now sign in with your new password."}
                </p>
                <button
                  onClick={() => { resetForgot(); setTab("login"); }}
                  style={{ padding: "10px 28px", background: "#3b82f6", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}
                >
                  {isRtl ? "تسجيل الدخول" : "Sign In"}
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <div style={{
              display: "flex", background: "#1f2937", borderRadius: "10px",
              padding: "3px", marginBottom: "24px", gap: "3px",
            }}>
              {(["login", "register"] as Tab[]).map((t) => (
                <button key={t} onClick={() => { setTab(t); setLoginError(""); setRegError(""); if (regStep === "submitted") { resetRegForm(); setRegStep("form"); } }}
                  style={{
                    flex: 1, padding: "8px", border: "none", borderRadius: "8px", cursor: "pointer",
                    fontSize: "14px", fontWeight: "600", transition: "all 0.2s",
                    background: tab === t ? "#3b82f6" : "transparent",
                    color: tab === t ? "white" : "#6b7280",
                  }}
                >
                  {t === "login"
                    ? (isRtl ? "تسجيل الدخول" : "Sign In")
                    : (isRtl ? "حساب عميل جديد" : "New Client Account")}
                </button>
              ))}
            </div>

            {tab === "login" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }} dir={dir}>
                <div>
                  <label style={labelStyle}>{isRtl ? "البريد الإلكتروني" : "Email"}</label>
                  <input data-testid="input-email" type="email" placeholder="user@scapex.sa"
                    value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={handleLoginKey}
                    style={{ ...inputStyle, direction: "ltr", textAlign: isRtl ? "right" : "left" }} autoComplete="email" />
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label style={{ ...labelStyle, marginBottom: "6px" }}>{isRtl ? "كلمة المرور" : "Password"}</label>
                    <button
                      data-testid="link-forgot-password"
                      style={{ ...linkStyle, fontSize: "12px", marginBottom: "6px" }}
                      onClick={() => { setForgotStep("enter_email"); setForgotError(""); setForgotEmail(email); }}
                    >
                      {isRtl ? "نسيت كلمة المرور؟" : "Forgot password?"}
                    </button>
                  </div>
                  <input data-testid="input-password" type="password" placeholder="••••••••"
                    value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={handleLoginKey}
                    style={{ ...inputStyle, direction: "ltr", textAlign: isRtl ? "right" : "left" }} autoComplete="current-password" />
                </div>
                {loginError && <div style={errorBoxStyle}>{loginError}</div>}
                <button data-testid="button-login" onClick={handleLogin} disabled={loggingIn}
                  style={{ width: "100%", padding: "11px", background: loggingIn ? "#1e40af" : "#3b82f6", color: "white", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: "600", cursor: loggingIn ? "not-allowed" : "pointer", marginTop: "4px", opacity: loggingIn ? 0.7 : 1 }}>
                  {loggingIn ? (isRtl ? "جارٍ تسجيل الدخول..." : "Signing in...") : (isRtl ? "تسجيل الدخول" : "Sign In")}
                </button>

                {isDevMode() && (
                <div style={{ padding: "12px", background: "#0f172a", borderRadius: "8px", border: "1px solid #1e3a5f", fontSize: "11px", color: "#64748b" }}>
                  <p style={{ margin: "0 0 6px", fontWeight: "600", color: "#94a3b8" }}>
                    {isRtl ? "بيانات الدخول الافتراضية:" : "Default credentials:"}
                  </p>
                  <p style={{ margin: "2px 0" }}>{isRtl ? "مدير النظام" : "System Admin"}: <span style={{ color: "#60a5fa" }}>admin@scapex.sa / Admin@123</span></p>
                  <p style={{ margin: "2px 0" }}>{isRtl ? "مدير" : "Manager"}: <span style={{ color: "#a78bfa" }}>manager@scapex.sa / Manager@123</span></p>
                  <p style={{ margin: "2px 0" }}>{isRtl ? "محاسب" : "Accountant"}: <span style={{ color: "#fbbf24" }}>accountant@scapex.sa / Account@123</span></p>
                  <p style={{ margin: "2px 0" }}>{isRtl ? "مهندس" : "Engineer"}: <span style={{ color: "#34d399" }}>engineer@scapex.sa / Engineer@123</span></p>
                </div>
                )}
              </div>
            )}

            {tab === "register" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }} dir={dir}>
                {regStep === "form" && (
                  <>
                    <div style={{ padding: "10px 12px", background: "#0f2a1a", border: "1px solid #14532d", borderRadius: "8px", fontSize: "12px", color: "#86efac" }}>
                      {isRtl
                        ? "سيتم إنشاء حساب عميل يتيح لك الوصول إلى بوابة العملاء لمتابعة مشاريعك وعقودك."
                        : "A client account will be created giving you access to the client portal to follow your projects and contracts."}
                    </div>
                    <div>
                      <label style={labelStyle}>
                        {isRtl ? "رقم الهوية الوطنية *" : "National ID *"}
                        <span style={{ color: "#6b7280", fontSize: "11px", marginInlineStart: "4px" }}>
                          {isRtl ? "(10 أرقام — يبدأ بـ 1 أو 2)" : "(10 digits — starts with 1 or 2)"}
                        </span>
                      </label>
                      <input
                        data-testid="input-reg-national-id"
                        type="text"
                        inputMode="numeric"
                        maxLength={10}
                        placeholder="1xxxxxxxxx"
                        value={regNationalId}
                        onChange={(e) => setRegNationalId(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        onKeyDown={handleRegisterKey}
                        style={{ ...inputStyle, direction: "ltr", textAlign: "left", letterSpacing: "0.1em" }}
                      />
                      {regNationalId.length > 0 && (
                        <p style={{ fontSize: "11px", marginTop: "4px", color: validateNationalId(regNationalId) ? "#34d399" : "#f87171" }}>
                          {validateNationalId(regNationalId)
                            ? (isRtl ? "✓ رقم الهوية صحيح" : "✓ Valid National ID")
                            : (isRtl ? "✗ يجب أن يكون 10 أرقام ويبدأ بـ 1 أو 2" : "✗ Must be 10 digits starting with 1 or 2")}
                        </p>
                      )}
                    </div>
                    <div>
                      <label style={labelStyle}>{isRtl ? "الاسم الكامل *" : "Full Name *"}</label>
                      <input data-testid="input-reg-name" type="text" placeholder={isRtl ? "أحمد محمد" : "John Smith"}
                        value={regName} onChange={(e) => setRegName(e.target.value)} onKeyDown={handleRegisterKey}
                        style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>{isRtl ? "البريد الإلكتروني *" : "Email *"}</label>
                      <input data-testid="input-reg-email" type="email" placeholder="client@company.sa"
                        value={regEmail} onChange={(e) => setRegEmail(e.target.value)} onKeyDown={handleRegisterKey}
                        style={{ ...inputStyle, direction: "ltr", textAlign: isRtl ? "right" : "left" }} autoComplete="email" />
                    </div>
                    <div>
                      <label style={labelStyle}>{isRtl ? "كلمة المرور *" : "Password *"}</label>
                      <input data-testid="input-reg-password" type="password"
                        placeholder={isRtl ? "6 أحرف على الأقل" : "At least 6 characters"}
                        value={regPassword} onChange={(e) => setRegPassword(e.target.value)} onKeyDown={handleRegisterKey}
                        style={{ ...inputStyle, direction: "ltr", textAlign: isRtl ? "right" : "left" }} />
                    </div>
                    <div>
                      <label style={labelStyle}>{isRtl ? "تأكيد كلمة المرور *" : "Confirm Password *"}</label>
                      <input data-testid="input-reg-confirm" type="password"
                        placeholder={isRtl ? "أعد كتابة كلمة المرور" : "Re-enter password"}
                        value={regConfirm} onChange={(e) => setRegConfirm(e.target.value)} onKeyDown={handleRegisterKey}
                        style={{ ...inputStyle, direction: "ltr", textAlign: isRtl ? "right" : "left" }} />
                    </div>
                    {regError && <div style={errorBoxStyle}>{regError}</div>}
                    <button data-testid="button-register-next" onClick={handleRegValidateForm} disabled={submittingReg}
                      style={{ width: "100%", padding: "11px", background: submittingReg ? "#1e40af" : "#3b82f6", color: "white", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: "600", cursor: submittingReg ? "not-allowed" : "pointer", opacity: submittingReg ? 0.7 : 1 }}>
                      {submittingReg ? (isRtl ? "جارٍ إرسال الرمز..." : "Sending code...") : (isRtl ? "التالي — تأكيد البريد الإلكتروني" : "Next — Verify Email")}
                    </button>
                  </>
                )}

                {regStep === "verify_email" && (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <button style={{ ...linkStyle, fontSize: "14px", textDecoration: "none" }} onClick={() => { setRegStep("form"); setRegError(""); setRegUserCode(""); }}>
                        {isRtl ? "→" : "←"}
                      </button>
                      <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700" }}>
                        {isRtl ? "تأكيد البريد الإلكتروني" : "Email Verification"}
                      </h3>
                    </div>

                    <div style={{ textAlign: "center", padding: "12px", background: "rgba(34,197,94,0.1)", borderRadius: "8px", border: "1px solid rgba(34,197,94,0.3)" }}>
                      <p style={{ color: "#22c55e", fontSize: "14px", margin: 0, fontWeight: "600" }}>
                        {isRtl ? "✉️ تم إرسال رمز التحقق إلى بريدك" : "✉️ Verification code sent to your email"}
                      </p>
                      <p style={{ color: "#60a5fa", fontSize: "13px", margin: "4px 0 0", fontWeight: "600" }}>
                        {regVerifiedEmail}
                      </p>
                      <p style={{ color: "#9ca3af", fontSize: "11px", margin: "4px 0 0" }}>
                        {isRtl ? "تحقق من صندوق الوارد أو البريد غير المرغوب" : "Check your inbox or spam folder"}
                      </p>
                    </div>

                    <div>
                      <label style={labelStyle}>{isRtl ? "رمز التحقق (6 أرقام)" : "Verification Code (6 digits)"}</label>
                      <input
                        data-testid="input-reg-code"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="000000"
                        value={regUserCode}
                        onChange={e => setRegUserCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        onKeyDown={handleRegisterKey}
                        style={codeInputStyle}
                      />
                    </div>

                    {renderCountdown("reg")}

                    {regError && <div style={errorBoxStyle}>{regError}</div>}

                    <button data-testid="button-reg-verify" onClick={handleRegVerifyEmail} disabled={verifyingReg || resendingReg}
                      style={{ width: "100%", padding: "11px", background: (verifyingReg || resendingReg) ? "#047857" : "#059669", color: "white", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: "600", cursor: (verifyingReg || resendingReg) ? "not-allowed" : "pointer", opacity: (verifyingReg || resendingReg) ? 0.7 : 1 }}>
                      {verifyingReg ? (isRtl ? "جارٍ التحقق..." : "Verifying...") : (isRtl ? "تأكيد وإرسال طلب التسجيل" : "Verify & Submit Registration")}
                    </button>
                  </>
                )}

                {regStep === "submitted" && (
                  <div style={successBoxStyle}>
                    <div style={{ fontSize: "32px", marginBottom: "10px" }}>✅</div>
                    <p style={{ color: "#86efac", fontSize: "15px", fontWeight: "700", margin: "0 0 6px" }}>
                      {isRtl ? "تم التحقق من البريد وإرسال الطلب!" : "Email verified & request submitted!"}
                    </p>
                    <p style={{ color: "#4ade80", fontSize: "13px", margin: "0 0 16px", lineHeight: "1.6" }}>
                      {isRtl
                        ? <>حسابك قيد المراجعة من قِبَل المشرف.<br />ستتمكن من الدخول بعد الاعتماد.</>
                        : <>Your account is under admin review.<br />You can sign in after approval.</>}
                    </p>
                    <button
                      onClick={() => { resetRegForm(); setTab("login"); setRegStep("form"); }}
                      style={{ padding: "10px 28px", background: "#3b82f6", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}
                    >
                      {isRtl ? "الذهاب لتسجيل الدخول" : "Go to Sign In"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #1f2937", display: "flex", justifyContent: "center", gap: "10px" }}>
          <button
            data-testid="button-toggle-language"
            onClick={toggleLanguage}
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "20px",
              color: "rgba(255,255,255,0.45)",
              fontSize: "12px",
              padding: "6px 18px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "rgba(255,255,255,0.45)"; }}
          >
            🌐 {language === "ar" ? "English" : "عربي"}
          </button>
          <button
            data-testid="button-about-system"
            onClick={() => setShowAbout(true)}
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "20px",
              color: "rgba(255,255,255,0.45)",
              fontSize: "12px",
              padding: "6px 18px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "rgba(255,255,255,0.45)"; }}
          >
            ℹ️ {isRtl ? "حول النظام" : "About"}
          </button>
        </div>

        {showAbout && (
          <div style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
            display: "flex", justifyContent: "center", alignItems: "center", padding: "16px",
          }} onClick={() => setShowAbout(false)}>
            <div
              style={{
                background: "#111827", borderRadius: "16px", padding: "28px 24px",
                maxWidth: "420px", width: "100%", border: "1px solid #1f2937",
                boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
              }}
              dir={dir}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ textAlign: "center", marginBottom: "20px" }}>
                {brand.brandLogo ? (
                  <img src={brand.brandLogo} alt={brand.brandName || "Logo"} style={{
                    width: "52px", height: "52px", borderRadius: "12px", objectFit: "contain",
                    margin: "0 auto 10px", display: "block", background: "transparent",
                  }} />
                ) : (
                  <div style={{
                    width: "48px", height: "48px", borderRadius: "12px",
                    background: "#3b82f6", display: "flex", alignItems: "center",
                    justifyContent: "center", margin: "0 auto 10px",
                    fontSize: "22px", fontWeight: "bold", color: "white",
                  }}>{(brand.brandName || "S").charAt(0).toUpperCase()}</div>
                )}
                <h3 style={{ fontSize: "18px", fontWeight: "bold", color: "white", margin: "0 0 4px" }}>{brand.brandName || "Scapex"}</h3>
                <p style={{ fontSize: "12px", color: "#6b7280", margin: 0 }}>
                  {isRtl ? (brand.brandSubtitleAr || "منصة إدارة الأعمال الذكية") : (brand.brandSubtitleEn || "Smart Business Management Platform")}
                </p>
              </div>

              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px",
              }}>
                {[
                  { icon: "📊", label: isRtl ? "وحدة عمل" : "Modules", value: "22" },
                  { icon: "🌐", label: isRtl ? "ثنائي اللغة" : "Bilingual", value: "AR/EN" },
                  { icon: "🔒", label: isRtl ? "نظام صلاحيات" : "Access Control", value: "RBAC" },
                  { icon: "🏢", label: isRtl ? "متعدد الشركات" : "Multi-Tenant", value: "Yes" },
                ].map((item, i) => (
                  <div key={i} style={{
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "10px", padding: "10px", textAlign: "center",
                  }}>
                    <div style={{ fontSize: "16px", marginBottom: "4px" }}>{item.icon}</div>
                    <div style={{ fontSize: "14px", fontWeight: "700", color: "white" }}>{item.value}</div>
                    <div style={{ fontSize: "10px", color: "#6b7280" }}>{item.label}</div>
                  </div>
                ))}
              </div>

              <p style={{
                fontSize: "12px", color: "#9ca3af", lineHeight: "1.7",
                textAlign: "center", margin: "0 0 16px",
              }}>
                {isRtl
                  ? "نظام متكامل لإدارة موارد المؤسسات مصمم خصيصاً للسوق السعودي. يغطي إدارة العملاء والمبيعات والمشتريات والمحاسبة والموارد البشرية والمشاريع الهندسية وغيرها."
                  : "A comprehensive ERP system designed for the Saudi market. Covers CRM, Sales, Purchasing, Accounting, HR, Engineering Projects, and more."}
              </p>

              <button
                onClick={() => setShowAbout(false)}
                style={{
                  width: "100%", padding: "10px", background: "#1f2937",
                  color: "#d1d5db", border: "1px solid #374151", borderRadius: "8px",
                  fontSize: "13px", cursor: "pointer", fontWeight: "500",
                }}
              >
                {isRtl ? "إغلاق" : "Close"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
