import { useState } from "react";
import { getUsers } from "@/lib/permissions";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = () => {
    setError("");
    if (!email || !password) {
      setError("يرجى إدخال البريد الإلكتروني وكلمة المرور");
      return;
    }

    const users = getUsers();
    const user = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );

    if (!user) {
      setError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
      return;
    }

    if (!user.active) {
      setError("هذا الحساب معطّل. تواصل مع مدير النظام.");
      return;
    }

    localStorage.setItem("user", JSON.stringify(user));
    window.location.href = "/dashboard";
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      background: "linear-gradient(135deg, #0b1220 0%, #0f1e38 100%)",
      fontFamily: "'Cairo', 'Inter', sans-serif",
    }}>
      <div style={{
        background: "#111827",
        padding: "40px",
        borderRadius: "16px",
        width: "360px",
        color: "white",
        boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
        border: "1px solid #1f2937",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{
            width: "56px",
            height: "56px",
            borderRadius: "14px",
            background: "#3b82f6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 12px",
            fontSize: "28px",
            fontWeight: "bold",
          }}>S</div>
          <h1 style={{ fontSize: "24px", fontWeight: "bold", margin: 0 }}>Scapex</h1>
          <p style={{ color: "#6b7280", fontSize: "14px", marginTop: "4px" }}>نظام إدارة المقاولات</p>
        </div>

        {/* Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }} dir="rtl">
          <div>
            <label style={{ display: "block", fontSize: "13px", color: "#9ca3af", marginBottom: "6px" }}>
              البريد الإلكتروني
            </label>
            <input
              data-testid="input-email"
              type="email"
              placeholder="user@scapex.sa"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #374151",
                background: "#1f2937",
                color: "white",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", color: "#9ca3af", marginBottom: "6px" }}>
              كلمة المرور
            </label>
            <input
              data-testid="input-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #374151",
                background: "#1f2937",
                color: "white",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {error && (
            <div style={{
              background: "#450a0a",
              border: "1px solid #7f1d1d",
              borderRadius: "8px",
              padding: "10px 12px",
              fontSize: "13px",
              color: "#fca5a5",
            }}>
              {error}
            </div>
          )}

          <button
            data-testid="button-login"
            onClick={handleLogin}
            style={{
              width: "100%",
              padding: "11px",
              background: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "15px",
              fontWeight: "600",
              cursor: "pointer",
              marginTop: "4px",
            }}
          >
            تسجيل الدخول
          </button>
        </div>

        {/* Default credentials hint */}
        <div style={{
          marginTop: "24px",
          padding: "14px",
          background: "#0f172a",
          borderRadius: "8px",
          border: "1px solid #1e3a5f",
          fontSize: "12px",
          color: "#64748b",
          direction: "rtl",
        }}>
          <p style={{ margin: "0 0 8px", fontWeight: "600", color: "#94a3b8" }}>بيانات الدخول الافتراضية:</p>
          <p style={{ margin: "2px 0" }}>مدير النظام: <span style={{ color: "#60a5fa" }}>admin@scapex.sa</span> / <span style={{ color: "#60a5fa" }}>Admin@123</span></p>
          <p style={{ margin: "2px 0" }}>مدير: <span style={{ color: "#a78bfa" }}>manager@scapex.sa</span> / <span style={{ color: "#a78bfa" }}>Manager@123</span></p>
          <p style={{ margin: "2px 0" }}>محاسب: <span style={{ color: "#fbbf24" }}>accountant@scapex.sa</span> / <span style={{ color: "#fbbf24" }}>Account@123</span></p>
          <p style={{ margin: "2px 0" }}>مهندس: <span style={{ color: "#34d399" }}>engineer@scapex.sa</span> / <span style={{ color: "#34d399" }}>Engineer@123</span></p>
        </div>
      </div>
    </div>
  );
}
