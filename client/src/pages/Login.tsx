import { useState } from "react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    const res = await fetch("/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (res.ok) {
      const data = await res.json();
      localStorage.setItem("token", data.token);
      window.location.href = "/";
    } else {
      alert("بيانات الدخول غلط ❌");
    }
  };

  return (
    <div style={{
      height: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      background: "#0b1220"
    }}>
      <div style={{
        background: "#111827",
        padding: "30px",
        borderRadius: "12px",
        width: "300px",
        color: "white"
      }}>
        <h2 style={{marginBottom:20}}>Scapex Login 🔐</h2>

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{width:"100%", marginBottom:10, padding:10}}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{width:"100%", marginBottom:20, padding:10}}
        />

        <button onClick={handleLogin} style={{
          width:"100%",
          padding:10,
          background:"#3b82f6",
          color:"white",
          border:"none",
          borderRadius:"8px"
        }}>
          دخول
        </button>
      </div>
    </div>
  );
}