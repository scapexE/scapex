import { useState } from "react";

export default function Users() {
  const [users, setUsers] = useState(() => {
    const saved = JSON.parse(localStorage.getItem("users") || "[]");

    if (saved.length === 0) {
      const defaultAdmin = [
        {
          email: "admin@scape.sa",
          password: "123456",
          role: "admin"
        }
      ];

      localStorage.setItem("users", JSON.stringify(defaultAdmin));
      return defaultAdmin;
    }

    return saved;
  });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("client");
  const currentUser = JSON.parse(localStorage.getItem("user") || "null");

  const addUser = () => {
    const newUsers = [...users, { email, password, role }];
    setUsers(newUsers);
    localStorage.setItem("users", JSON.stringify(newUsers));
    setEmail("");
    setPassword("");
  };

  const deleteUser = (index: number) => {
    const newUsers = users.filter((_: unknown, i: number) => i !== index);
    setUsers(newUsers);
    localStorage.setItem("users", JSON.stringify(newUsers));
  };

  if (currentUser?.role !== "admin") {
    return <div style={{ padding: 40 }}>فقط الأدمن يمكنه إدارة المستخدمين</div>;
  }

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

      {users.map((u: { email: string; role: string }, i: number) => (
        <div key={i} style={{ marginBottom: 10 }}>
          {u.email} - {u.role}

          <select
            value={u.role}
            onChange={(e) => {
              const newUsers = [...users];
              newUsers[i] = { ...newUsers[i], role: e.target.value };
              setUsers(newUsers);
              localStorage.setItem("users", JSON.stringify(newUsers));
            }}
          >
            <option value="admin">Admin</option>
            <option value="accountant">محاسب</option>
            <option value="engineer">مهندس</option>
            <option value="client">عميل</option>
          </select>

          <button onClick={() => deleteUser(i)} style={{ marginLeft: 10 }}>
            حذف
          </button>
        </div>
      ))}
    </div>
  );
}
