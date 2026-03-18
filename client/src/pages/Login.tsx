import { useState, useEffect } from "react";
import { getUsers, saveUsers, ROLE_DEFAULTS, type SystemUser } from "@/lib/permissions";


type Tab = "login" | "register";

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
  direction: "rtl",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "13px",
  color: "#9ca3af",
  marginBottom: "6px",
};

export default function Login() {
  const [tab, setTab] = useState<Tab>("login");

  // --- Login State ---
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // --- Register State ---
  const [regName, setRegName] = useState("");
  const [regCompany, setRegCompany] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [regError, setRegError] = useState("");
  const [regSuccess, setRegSuccess] = useState(false);

  useEffect(() => {
    // Clear stale/incompatible session from old versions
    const saved = localStorage.getItem("user");
    if (saved) {
      try {
        const u = JSON.parse(saved);
        if (!u.id || !u.permissions) localStorage.removeItem("user");
      } catch {
        localStorage.removeItem("user");
      }
    }
    getUsers(); // pre-initialize defaults
  }, []);

  // ── Login ──────────────────────────────────────────────
  const handleLogin = () => {
    setLoginError("");
    if (!email || !password) {
      setLoginError("يرجى إدخال البريد الإلكتروني وكلمة المرور");
      return;
    }
    const users = getUsers();
    const user = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    if (!user) { setLoginError("البريد الإلكتروني أو كلمة المرور غير صحيحة"); return; }
    if (!user.active) {
      if (user.pendingApproval) {
        setLoginError("طلبك قيد المراجعة. سيتم تفعيل حسابك بعد موافقة المشرف.");
      } else {
        setLoginError("هذا الحساب معطّل. تواصل مع مدير النظام.");
      }
      return;
    }

    localStorage.setItem("user", JSON.stringify(user));
    // Clients go directly to their portal
    window.location.href = user.role === "client" ? "/client-portal" : "/dashboard";
  };

  const handleLoginKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLogin();
  };

  // ── Register (Clients only) ────────────────────────────
  const handleRegister = () => {
    setRegError("");
    if (!regName || !regEmail || !regPassword || !regConfirm) {
      setRegError("يرجى ملء جميع الحقول"); return;
    }
    if (regPassword !== regConfirm) {
      setRegError("كلمتا المرور غير متطابقتين"); return;
    }
    if (regPassword.length < 6) {
      setRegError("كلمة المرور يجب أن تكون 6 أحرف على الأقل"); return;
    }
    const users = getUsers();
    if (users.find((u) => u.email.toLowerCase() === regEmail.toLowerCase())) {
      setRegError("هذا البريد الإلكتروني مسجل مسبقاً"); return;
    }
    const newUser: SystemUser = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      name: regName,
      email: regEmail,
      password: regPassword,
      role: "client",
      permissions: ROLE_DEFAULTS.client,
      createdAt: new Date().toISOString(),
      active: false,
      pendingApproval: true,
    };
    saveUsers([...users, newUser]);
    setRegSuccess(true);
  };

  const handleRegisterKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleRegister();
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
        padding: "36px 32px",
        borderRadius: "16px",
        width: "100%",
        maxWidth: "380px",
        color: "white",
        boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
        border: "1px solid #1f2937",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{
            width: "52px", height: "52px", borderRadius: "14px",
            background: "#3b82f6", display: "flex", alignItems: "center",
            justifyContent: "center", margin: "0 auto 10px",
            fontSize: "26px", fontWeight: "bold",
          }}>S</div>
          <h1 style={{ fontSize: "22px", fontWeight: "bold", margin: 0 }}>Scapex</h1>
          <p style={{ color: "#6b7280", fontSize: "13px", marginTop: "3px" }}>منصة إدارة الأعمال الذكية</p>
        </div>

        {/* Tabs */}
        <div style={{
          display: "flex", background: "#1f2937", borderRadius: "10px",
          padding: "3px", marginBottom: "24px", gap: "3px",
        }}>
          {(["login", "register"] as Tab[]).map((t) => (
            <button key={t} onClick={() => { setTab(t); setLoginError(""); setRegError(""); }}
              style={{
                flex: 1, padding: "8px", border: "none", borderRadius: "8px", cursor: "pointer",
                fontSize: "14px", fontWeight: "600", transition: "all 0.2s",
                background: tab === t ? "#3b82f6" : "transparent",
                color: tab === t ? "white" : "#6b7280",
              }}
            >
              {t === "login" ? "تسجيل الدخول" : "حساب عميل جديد"}
            </button>
          ))}
        </div>

        {/* LOGIN FORM */}
        {tab === "login" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }} dir="rtl">
            <div>
              <label style={labelStyle}>البريد الإلكتروني</label>
              <input data-testid="input-email" type="email" placeholder="user@scapex.sa"
                value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={handleLoginKey}
                style={inputStyle} autoComplete="email" />
            </div>
            <div>
              <label style={labelStyle}>كلمة المرور</label>
              <input data-testid="input-password" type="password" placeholder="••••••••"
                value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={handleLoginKey}
                style={inputStyle} autoComplete="current-password" />
            </div>
            {loginError && (
              <div style={{ background: "#450a0a", border: "1px solid #7f1d1d", borderRadius: "8px", padding: "10px 12px", fontSize: "13px", color: "#fca5a5" }}>
                {loginError}
              </div>
            )}
            <button data-testid="button-login" onClick={handleLogin}
              style={{ width: "100%", padding: "11px", background: "#3b82f6", color: "white", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: "600", cursor: "pointer", marginTop: "4px" }}>
              تسجيل الدخول
            </button>

            {/* Credentials hint */}
            <div style={{ padding: "12px", background: "#0f172a", borderRadius: "8px", border: "1px solid #1e3a5f", fontSize: "11px", color: "#64748b" }}>
              <p style={{ margin: "0 0 6px", fontWeight: "600", color: "#94a3b8" }}>بيانات الدخول الافتراضية:</p>
              <p style={{ margin: "2px 0" }}>مدير النظام: <span style={{ color: "#60a5fa" }}>admin@scapex.sa / Admin@123</span></p>
              <p style={{ margin: "2px 0" }}>مدير: <span style={{ color: "#a78bfa" }}>manager@scapex.sa / Manager@123</span></p>
              <p style={{ margin: "2px 0" }}>محاسب: <span style={{ color: "#fbbf24" }}>accountant@scapex.sa / Account@123</span></p>
              <p style={{ margin: "2px 0" }}>مهندس: <span style={{ color: "#34d399" }}>engineer@scapex.sa / Engineer@123</span></p>
            </div>
          </div>
        )}

        {/* REGISTER FORM (Clients) */}
        {tab === "register" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }} dir="rtl">
            <div style={{ padding: "10px 12px", background: "#0f2a1a", border: "1px solid #14532d", borderRadius: "8px", fontSize: "12px", color: "#86efac" }}>
              سيتم إنشاء حساب عميل يتيح لك الوصول إلى بوابة العملاء لمتابعة مشاريعك وعقودك.
            </div>
            {regSuccess ? (
              <div style={{ padding: "18px 16px", background: "#0f2a1a", border: "1px solid #166534", borderRadius: "10px", textAlign: "center" }}>
                <div style={{ fontSize: "32px", marginBottom: "10px" }}>⏳</div>
                <p style={{ color: "#86efac", fontSize: "15px", fontWeight: "700", margin: "0 0 8px" }}>تم إرسال طلب التسجيل!</p>
                <p style={{ color: "#4ade80", fontSize: "13px", margin: 0, lineHeight: "1.6" }}>
                  حسابك قيد المراجعة من قِبَل المشرف.<br />
                  ستتمكن من الدخول بعد الاعتماد.
                </p>
              </div>
            ) : (
              <>
                <div>
                  <label style={labelStyle}>الاسم الكامل *</label>
                  <input data-testid="input-reg-name" type="text" placeholder="أحمد محمد"
                    value={regName} onChange={(e) => setRegName(e.target.value)} onKeyDown={handleRegisterKey}
                    style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>اسم الشركة (اختياري)</label>
                  <input data-testid="input-reg-company" type="text" placeholder="شركة النجاح"
                    value={regCompany} onChange={(e) => setRegCompany(e.target.value)} onKeyDown={handleRegisterKey}
                    style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>البريد الإلكتروني *</label>
                  <input data-testid="input-reg-email" type="email" placeholder="client@company.sa"
                    value={regEmail} onChange={(e) => setRegEmail(e.target.value)} onKeyDown={handleRegisterKey}
                    style={inputStyle} autoComplete="email" />
                </div>
                <div>
                  <label style={labelStyle}>كلمة المرور *</label>
                  <input data-testid="input-reg-password" type="password" placeholder="6 أحرف على الأقل"
                    value={regPassword} onChange={(e) => setRegPassword(e.target.value)} onKeyDown={handleRegisterKey}
                    style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>تأكيد كلمة المرور *</label>
                  <input data-testid="input-reg-confirm" type="password" placeholder="أعد كتابة كلمة المرور"
                    value={regConfirm} onChange={(e) => setRegConfirm(e.target.value)} onKeyDown={handleRegisterKey}
                    style={inputStyle} />
                </div>
                {regError && (
                  <div style={{ background: "#450a0a", border: "1px solid #7f1d1d", borderRadius: "8px", padding: "10px 12px", fontSize: "13px", color: "#fca5a5" }}>
                    {regError}
                  </div>
                )}
                <button data-testid="button-register" onClick={handleRegister}
                  style={{ width: "100%", padding: "11px", background: "#059669", color: "white", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: "600", cursor: "pointer" }}>
                  إنشاء الحساب والدخول
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
