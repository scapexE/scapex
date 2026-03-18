import { useState } from "react";

export default function Users() {
  const [users, setUsers] = useState(
    JSON.parse(localStorage.getItem("users") || "[]"),
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("client");

  const addUser = () => {
    const newUsers = [...users, { email, password, role }];

    setUsers(newUsers);
    localStorage.setItem("users", JSON.stringify(newUsers));

    setEmail("");
    setPassword("");
  };

  return (
    <div style={{ padding: 30 }}>
      <h2>إدارة المستخدمين</h2>

      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <select value={role} onChange={(e) => setRole(e.target.value)}>
        <option value="admin">Admin</option>
        <option value="accountant">محاسب</option>
        <option value="engineer">مهندس</option>
        <option value="client">عميل</option>
      </select>

      <button onClick={addUser}>إضافة</button>

      <hr />

      {users.map((u: any, i: number) => (
        <div key={i}>
          {u.email} - {u.role}
        </div>
      ))}
    </div>
  );
}
