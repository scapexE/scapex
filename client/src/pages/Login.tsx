import { useState } from "react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    const users = JSON.parse(localStorage.getItem("users") || "[]");

    const user = users.find(
      (u: { email: string; password: string }) => u.email === email && u.password === password
    );

    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
      window.location.href = "/dashboard";
    } else {
      if (email && password) {
        const newUser = { email, password, name: email.split("@")[0] };
        localStorage.setItem("users", JSON.stringify([...users, newUser]));
        localStorage.setItem("user", JSON.stringify(newUser));
        window.location.href = "/dashboard";
      } else {
        alert("Please enter email and password");
      }
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
        <h2 style={{marginBottom:20}}>Scapex Login</h2>

        <input
          data-testid="input-email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{width:"100%", marginBottom:10, padding:10, borderRadius:"6px", border:"1px solid #374151", background:"#1f2937", color:"white"}}
        />

        <input
          data-testid="input-password"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{width:"100%", marginBottom:20, padding:10, borderRadius:"6px", border:"1px solid #374151", background:"#1f2937", color:"white"}}
        />

        <button data-testid="button-login" onClick={handleLogin} style={{
          width:"100%",
          padding:10,
          background:"#3b82f6",
          color:"white",
          border:"none",
          borderRadius:"8px",
          cursor:"pointer"
        }}>
          Login
        </button>
      </div>
    </div>
  );
}
