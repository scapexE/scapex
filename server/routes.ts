import type { Express } from "express";
import { type Server } from "http";
import {
  findUserByEmail,
  findUserById,
  verifyPassword,
  createUser,
  getAllUsers,
  updateUser,
  deleteUser,
  updateLastLogin,
  seedDefaultUsers,
} from "./auth";
import {
  generateVerificationCode,
  storeVerificationCode,
  verifyCode,
  sendVerificationEmail,
  canSendCode,
  isEmailVerified,
  consumeEmailVerification,
} from "./email";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  await seedDefaultUsers();

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const user = await findUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const valid = await verifyPassword(password, user.password);
      if (!valid) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      if (!user.isActive) {
        return res.status(403).json({ error: "Account is disabled", pendingApproval: true });
      }

      await updateLastLogin(user.id);

      const { password: _, ...safeUser } = user;
      res.json({ user: safeUser });
    } catch (err: any) {
      console.error("Login error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { name, email, password, phone, nationalId } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ error: "Name, email, and password are required" });
      }

      if (!isEmailVerified(email)) {
        return res.status(403).json({ error: "Email not verified" });
      }

      const existing = await findUserByEmail(email);
      if (existing) {
        return res.status(409).json({ error: "Email already registered" });
      }

      consumeEmailVerification(email);

      const user = await createUser({
        username: email.toLowerCase().split("@")[0],
        password,
        name,
        email,
        phone: phone || undefined,
        role: "client",
        permissions: ["dashboard", "client_portal"],
        isActive: false,
      });

      const { password: _, ...safeUser } = user;
      res.status(201).json({ user: safeUser, pendingApproval: true });
    } catch (err: any) {
      console.error("Register error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/auth/send-code", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email || typeof email !== "string" || !email.includes("@")) {
        return res.status(400).json({ error: "Valid email is required" });
      }

      if (!canSendCode(email)) {
        return res.status(429).json({ error: "Please wait before requesting another code" });
      }

      const existing = await findUserByEmail(email);
      if (existing) {
        return res.status(409).json({ error: "Email already registered" });
      }

      const code = generateVerificationCode();
      const sent = await sendVerificationEmail(email, code);
      if (!sent) {
        return res.status(500).json({ error: "Failed to send email" });
      }

      storeVerificationCode(email, code);
      res.json({ success: true });
    } catch (err: any) {
      console.error("Send code error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/auth/verify-code", async (req, res) => {
    try {
      const { email, code } = req.body;
      if (!email || !code || typeof code !== "string" || !/^\d{6}$/.test(code)) {
        return res.status(400).json({ error: "Email and 6-digit code are required" });
      }

      const result = verifyCode(email, code);
      if (!result.valid) {
        const msg = result.error === "max_attempts"
          ? "Too many attempts. Please request a new code"
          : result.error === "expired"
          ? "Code expired. Please request a new code"
          : "Invalid verification code";
        return res.status(400).json({ error: msg });
      }

      res.json({ verified: true });
    } catch (err: any) {
      console.error("Verify code error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/users", async (_req, res) => {
    try {
      const allUsers = await getAllUsers();
      const safeUsers = allUsers.map(({ password, ...u }) => u);
      res.json(safeUsers);
    } catch (err: any) {
      console.error("Get users error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await findUserById(req.params.id);
      if (!user) return res.status(404).json({ error: "User not found" });
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (err: any) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.patch("/api/users/:id", async (req, res) => {
    try {
      const updated = await updateUser(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: "User not found" });
      const { password, ...safeUser } = updated;
      res.json(safeUser);
    } catch (err: any) {
      console.error("Update user error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      await deleteUser(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      console.error("Delete user error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/auth/change-password", async (req, res) => {
    try {
      const { userId, newPassword } = req.body;
      if (!userId || !newPassword) {
        return res.status(400).json({ error: "userId and newPassword are required" });
      }
      const updated = await updateUser(userId, { password: newPassword });
      if (!updated) return res.status(404).json({ error: "User not found" });
      res.json({ success: true });
    } catch (err: any) {
      console.error("Change password error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  return httpServer;
}
