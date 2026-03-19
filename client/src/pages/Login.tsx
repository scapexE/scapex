import { useState, useEffect, useCallback } from "react";
import { getUsers, saveUsers, ROLE_DEFAULTS, validateNationalId, type SystemUser } from "@/lib/permissions";
import { useLanguage } from "@/contexts/LanguageContext";
import { logAction } from "@/lib/auditLog";

type Tab = "login" | "register";
type ForgotStep = "idle" | "enter_email" | "enter_code" | "new_password" | "done";
type RegStep = "form" | "verify_email" | "submitted";

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

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default function Login() {
  const [tab, setTab] = useState<Tab>("login");
  const [showAbout, setShowAbout] = useState(false);
  const { dir, language, toggleLanguage } = useLanguage();
  const isRtl = dir === "rtl";

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
  const [forgotCode, setForgotCode] = useState("");
  const [forgotUserCode, setForgotUserCode] = useState("");
  const [forgotNewPass, setForgotNewPass] = useState("");
  const [forgotConfirmPass, setForgotConfirmPass] = useState("");
  const [forgotError, setForgotError] = useState("");

  const [regNationalId, setRegNationalId] = useState("");
  const [regName, setRegName] = useState("");
  const [regCompany, setRegCompany] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [regError, setRegError] = useState("");
  const [regStep, setRegStep] = useState<RegStep>("form");
  const [regCode, setRegCode] = useState("");
  const [regUserCode, setRegUserCode] = useState("");

  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    const saved = localStorage.getItem("user");
    if (saved) {
      try {
        const u = JSON.parse(saved);
        if (!u.id || !u.permissions) localStorage.removeItem("user");
      } catch {
        localStorage.removeItem("user");
      }
    }
    getUsers();
  }, []);

  const handleLogin = () => {
    setLoginError("");
    if (!email || !password) {
      setLoginError(isRtl ? "يرجى إدخال البريد الإلكتروني وكلمة المرور" : "Please enter your email and password");
      return;
    }
    const users = getUsers();
    const user = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    if (!user) {
      setLoginError(isRtl ? "البريد الإلكتروني أو كلمة المرور غير صحيحة" : "Incorrect email or password");
      return;
    }
    if (!user.active) {
      if (user.pendingApproval) {
        setLoginError(isRtl
          ? "طلبك قيد المراجعة. سيتم تفعيل حسابك بعد موافقة المشرف."
          : "Your request is under review. Your account will be activated after admin approval.");
      } else {
        setLoginError(isRtl
          ? "هذا الحساب معطّل. تواصل مع مدير النظام."
          : "This account is disabled. Contact the system admin.");
      }
      return;
    }
    localStorage.setItem("user", JSON.stringify(user));
    logAction("login", "auth", `User ${user.name} logged in`, `المستخدم ${user.name} سجّل دخول`);
    window.location.href = user.role === "client" ? "/client-portal" : "/dashboard";
  };

  const handleLoginKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLogin();
  };

  const handleForgotSendCode = () => {
    setForgotError("");
    if (!forgotEmail) {
      setForgotError(isRtl ? "يرجى إدخال البريد الإلكتروني" : "Please enter your email");
      return;
    }
    const users = getUsers();
    const user = users.find(u => u.email.toLowerCase() === forgotEmail.toLowerCase());
    if (!user) {
      setForgotError(isRtl ? "لا يوجد حساب بهذا البريد الإلكتروني" : "No account found with this email");
      return;
    }
    const code = generateCode();
    setForgotCode(code);
    setForgotUserCode("");
    setForgotStep("enter_code");
    setCountdown(120);
  };

  const handleForgotVerifyCode = () => {
    setForgotError("");
    if (forgotUserCode !== forgotCode) {
      setForgotError(isRtl ? "رمز التحقق غير صحيح" : "Invalid verification code");
      return;
    }
    setForgotStep("new_password");
  };

  const handleForgotResetPassword = () => {
    setForgotError("");
    if (!forgotNewPass || forgotNewPass.length < 6) {
      setForgotError(isRtl ? "كلمة المرور يجب أن تكون 6 أحرف على الأقل" : "Password must be at least 6 characters");
      return;
    }
    if (forgotNewPass !== forgotConfirmPass) {
      setForgotError(isRtl ? "كلمتا المرور غير متطابقتين" : "Passwords do not match");
      return;
    }
    const users = getUsers();
    const idx = users.findIndex(u => u.email.toLowerCase() === forgotEmail.toLowerCase());
    if (idx >= 0) {
      users[idx].password = forgotNewPass;
      saveUsers(users);
    }
    setForgotStep("done");
  };

  const resetForgot = () => {
    setForgotStep("idle");
    setForgotEmail("");
    setForgotCode("");
    setForgotUserCode("");
    setForgotNewPass("");
    setForgotConfirmPass("");
    setForgotError("");
    setCountdown(0);
  };

  const handleRegValidateForm = () => {
    setRegError("");
    if (!regNationalId || !regName || !regEmail || !regPassword || !regConfirm) {
      setRegError(isRtl
        ? "يرجى ملء جميع الحقول المطلوبة (رقم الهوية، الاسم، البريد، كلمة المرور)"
        : "Please fill all required fields (National ID, name, email, password)");
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
    const users = getUsers();
    if (users.find((u) => u.nationalId === regNationalId)) {
      setRegError(isRtl ? "رقم الهوية مسجّل مسبقاً" : "This National ID is already registered");
      return;
    }
    if (users.find((u) => u.email.toLowerCase() === regEmail.toLowerCase())) {
      setRegError(isRtl ? "هذا البريد الإلكتروني مسجل مسبقاً" : "This email is already registered");
      return;
    }
    const code = generateCode();
    setRegCode(code);
    setRegUserCode("");
    setRegStep("verify_email");
    setCountdown(120);
  };

  const handleRegVerifyEmail = () => {
    setRegError("");
    if (regUserCode !== regCode) {
      setRegError(isRtl ? "رمز التحقق غير صحيح" : "Invalid verification code");
      return;
    }
    const users = getUsers();
    const newUser: SystemUser = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      nationalId: regNationalId,
      name: regName,
      email: regEmail,
      password: regPassword,
      role: "client",
      permissions: ROLE_DEFAULTS.client,
      createdAt: new Date().toISOString(),
      active: false,
      pendingApproval: true,
      emailVerified: true,
    };
    saveUsers([...users, newUser]);
    setRegStep("submitted");
  };

  const handleResendCode = useCallback((type: "forgot" | "reg") => {
    const code = generateCode();
    if (type === "forgot") {
      setForgotCode(code);
      setForgotUserCode("");
    } else {
      setRegCode(code);
      setRegUserCode("");
    }
    setCountdown(120);
  }, []);

  const handleRegisterKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (regStep === "form") handleRegValidateForm();
      else if (regStep === "verify_email") handleRegVerifyEmail();
    }
  };

  const renderCodeSimulation = (code: string) => (
    <div style={{
      background: "linear-gradient(135deg, #1e3a5f 0%, #0f2a1a 100%)",
      border: "1px solid #2563eb",
      borderRadius: "10px",
      padding: "14px 16px",
      marginBottom: "4px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
        <span style={{ fontSize: "16px" }}>📧</span>
        <span style={{ color: "#93c5fd", fontSize: "12px", fontWeight: "600" }}>
          {isRtl ? "محاكاة إرسال بريد إلكتروني" : "Email Simulation"}
        </span>
      </div>
      <p style={{ color: "#a5b4fc", fontSize: "11px", margin: "0 0 8px" }}>
        {isRtl
          ? "في النظام الفعلي سيتم إرسال الرمز إلى بريدك. للتجربة استخدم الرمز التالي:"
          : "In production, the code will be sent to your email. For demo, use this code:"}
      </p>
      <div style={{
        background: "#0f172a",
        borderRadius: "8px",
        padding: "10px",
        textAlign: "center",
        letterSpacing: "0.4em",
        fontSize: "28px",
        fontWeight: "bold",
        color: "#60a5fa",
        fontFamily: "monospace",
      }}>
        {code}
      </div>
    </div>
  );

  const renderCountdown = (type: "forgot" | "reg") => (
    <div style={{ textAlign: "center", marginTop: "6px" }}>
      {countdown > 0 ? (
        <span style={{ color: "#6b7280", fontSize: "12px" }}>
          {isRtl ? `إعادة الإرسال بعد ${countdown} ثانية` : `Resend in ${countdown}s`}
        </span>
      ) : (
        <button style={linkStyle} onClick={() => handleResendCode(type)}>
          {isRtl ? "إعادة إرسال الرمز" : "Resend Code"}
        </button>
      )}
    </div>
  );

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
          <div style={{
            width: "52px", height: "52px", borderRadius: "14px",
            background: "#3b82f6", display: "flex", alignItems: "center",
            justifyContent: "center", margin: "0 auto 10px",
            fontSize: "26px", fontWeight: "bold",
          }}>S</div>
          <h1 style={{ fontSize: "22px", fontWeight: "bold", margin: 0 }}>Scapex</h1>
          <p style={{ color: "#6b7280", fontSize: "13px", marginTop: "3px" }}>
            {isRtl ? "منصة إدارة الأعمال الذكية" : "Smart Business Management Platform"}
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
                  style={{ width: "100%", padding: "11px", background: "#3b82f6", color: "white", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: "600", cursor: "pointer" }}
                >
                  {isRtl ? "إرسال رمز التحقق" : "Send Verification Code"}
                </button>
              </>
            )}

            {forgotStep === "enter_code" && (
              <>
                {renderCodeSimulation(forgotCode)}
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
                  style={{ width: "100%", padding: "11px", background: "#059669", color: "white", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: "600", cursor: "pointer" }}
                >
                  {isRtl ? "تغيير كلمة المرور" : "Reset Password"}
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
                <button key={t} onClick={() => { setTab(t); setLoginError(""); setRegError(""); setRegStep("form"); }}
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
                <button data-testid="button-login" onClick={handleLogin}
                  style={{ width: "100%", padding: "11px", background: "#3b82f6", color: "white", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: "600", cursor: "pointer", marginTop: "4px" }}>
                  {isRtl ? "تسجيل الدخول" : "Sign In"}
                </button>

                <div style={{ padding: "12px", background: "#0f172a", borderRadius: "8px", border: "1px solid #1e3a5f", fontSize: "11px", color: "#64748b" }}>
                  <p style={{ margin: "0 0 6px", fontWeight: "600", color: "#94a3b8" }}>
                    {isRtl ? "بيانات الدخول الافتراضية:" : "Default credentials:"}
                  </p>
                  <p style={{ margin: "2px 0" }}>{isRtl ? "مدير النظام" : "System Admin"}: <span style={{ color: "#60a5fa" }}>admin@scapex.sa / Admin@123</span></p>
                  <p style={{ margin: "2px 0" }}>{isRtl ? "مدير" : "Manager"}: <span style={{ color: "#a78bfa" }}>manager@scapex.sa / Manager@123</span></p>
                  <p style={{ margin: "2px 0" }}>{isRtl ? "محاسب" : "Accountant"}: <span style={{ color: "#fbbf24" }}>accountant@scapex.sa / Account@123</span></p>
                  <p style={{ margin: "2px 0" }}>{isRtl ? "مهندس" : "Engineer"}: <span style={{ color: "#34d399" }}>engineer@scapex.sa / Engineer@123</span></p>
                </div>
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
                      <label style={labelStyle}>{isRtl ? "اسم الشركة (اختياري)" : "Company Name (optional)"}</label>
                      <input data-testid="input-reg-company" type="text" placeholder={isRtl ? "شركة النجاح" : "Success Corp"}
                        value={regCompany} onChange={(e) => setRegCompany(e.target.value)} onKeyDown={handleRegisterKey}
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
                    <button data-testid="button-register-next" onClick={handleRegValidateForm}
                      style={{ width: "100%", padding: "11px", background: "#3b82f6", color: "white", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: "600", cursor: "pointer" }}>
                      {isRtl ? "التالي — تأكيد البريد الإلكتروني" : "Next — Verify Email"}
                    </button>
                  </>
                )}

                {regStep === "verify_email" && (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <button style={{ ...linkStyle, fontSize: "14px", textDecoration: "none" }} onClick={() => { setRegStep("form"); setRegError(""); }}>
                        {isRtl ? "→" : "←"}
                      </button>
                      <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700" }}>
                        {isRtl ? "تأكيد البريد الإلكتروني" : "Email Verification"}
                      </h3>
                    </div>

                    {renderCodeSimulation(regCode)}

                    <p style={{ color: "#9ca3af", fontSize: "13px", margin: 0, textAlign: "center", lineHeight: "1.6" }}>
                      {isRtl
                        ? <>تم إرسال رمز التحقق إلى<br /><span style={{ color: "#60a5fa", fontWeight: "600" }}>{regEmail}</span></>
                        : <>Verification code sent to<br /><span style={{ color: "#60a5fa", fontWeight: "600" }}>{regEmail}</span></>}
                    </p>

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

                    <button data-testid="button-reg-verify" onClick={handleRegVerifyEmail}
                      style={{ width: "100%", padding: "11px", background: "#059669", color: "white", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: "600", cursor: "pointer" }}>
                      {isRtl ? "تأكيد وإرسال طلب التسجيل" : "Verify & Submit Registration"}
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
                      onClick={() => { setTab("login"); setRegStep("form"); }}
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
                <div style={{
                  width: "48px", height: "48px", borderRadius: "12px",
                  background: "#3b82f6", display: "flex", alignItems: "center",
                  justifyContent: "center", margin: "0 auto 10px",
                  fontSize: "22px", fontWeight: "bold", color: "white",
                }}>S</div>
                <h3 style={{ fontSize: "18px", fontWeight: "bold", color: "white", margin: "0 0 4px" }}>Scapex</h3>
                <p style={{ fontSize: "12px", color: "#6b7280", margin: 0 }}>
                  {isRtl ? "منصة إدارة الأعمال الذكية" : "Smart Business Management Platform"}
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
