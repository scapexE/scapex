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
import { appData, companies, branches } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

async function seedDefaultCompanies() {
  try {
    const existing = await db.select().from(companies);
    if (existing.length > 0) return;
    const [main] = await db.insert(companies).values({
      nameAr: "شركة سكابكس للمقاولات",
      nameEn: "Scapex Contracting Co.",
      crNumber: "1010234567",
      vatNumber: "300012345600003",
      city: "الرياض",
      address: "حي العليا، شارع الأمير محمد بن عبدالعزيز",
      phone: "+966112345678",
      email: "info@scapex.sa",
      website: "www.scapex.sa",
      settings: { type: "main", parentId: null, employeeCount: 156 },
      isActive: true,
    }).returning();

    const [sub1] = await db.insert(companies).values({
      nameAr: "سكابكس لأنظمة السلامة",
      nameEn: "Scapex Safety Systems",
      crNumber: "1010345678",
      vatNumber: "300012345600004",
      city: "جدة",
      address: "حي الروضة، طريق الملك فهد",
      phone: "+966122345678",
      email: "safety@scapex.sa",
      website: "www.scapex-safety.sa",
      settings: { type: "subsidiary", parentId: String(main.id), employeeCount: 45 },
      isActive: true,
    }).returning();

    const [sub2] = await db.insert(companies).values({
      nameAr: "سكابكس للخدمات البيئية",
      nameEn: "Scapex Environmental Services",
      crNumber: "1010456789",
      vatNumber: "300012345600005",
      city: "الدمام",
      address: "حي الشاطئ، شارع الخليج",
      phone: "+966132345678",
      email: "env@scapex.sa",
      website: "www.scapex-env.sa",
      settings: { type: "subsidiary", parentId: String(main.id), employeeCount: 32 },
      isActive: true,
    }).returning();

    await db.insert(companies).values({
      nameAr: "سكابكس للبنية التحتية",
      nameEn: "Scapex Infrastructure",
      crNumber: "1010567890",
      vatNumber: "300012345600006",
      city: "الرياض",
      address: "حي النخيل، طريق الملك سلمان",
      phone: "+966114567890",
      email: "infra@scapex.sa",
      website: "www.scapex-infra.sa",
      settings: { type: "subsidiary", parentId: String(main.id), employeeCount: 78 },
      isActive: true,
    });

    await db.insert(branches).values([
      { companyId: main.id, nameAr: "المقر الرئيسي - الرياض", nameEn: "HQ - Riyadh", city: "الرياض", address: "حي العليا", phone: "+966112345678", managerName: "أحمد الغامدي", isActive: true },
      { companyId: main.id, nameAr: "فرع جدة", nameEn: "Jeddah Branch", city: "جدة", address: "حي الروضة", phone: "+966122345678", managerName: "محمد القحطاني", isActive: true },
      { companyId: main.id, nameAr: "فرع الدمام", nameEn: "Dammam Branch", city: "الدمام", address: "حي الشاطئ", phone: "+966132345678", managerName: "خالد الزهراني", isActive: true },
      { companyId: sub1.id, nameAr: "مكتب جدة - السلامة", nameEn: "Jeddah Safety Office", city: "جدة", address: "حي الصفا", phone: "+966122456789", managerName: "فيصل العتيبي", isActive: true },
      { companyId: sub1.id, nameAr: "مكتب الرياض - السلامة", nameEn: "Riyadh Safety Office", city: "الرياض", address: "حي الملقا", phone: "+966113456789", managerName: "عبدالله الشهري", isActive: true },
      { companyId: sub2.id, nameAr: "مكتب الدمام - البيئة", nameEn: "Dammam Env. Office", city: "الدمام", address: "حي الفيصلية", phone: "+966133456789", managerName: "عمر الحربي", isActive: true },
    ]);
    console.log("✅ Default companies & branches seeded");
  } catch (err) {
    console.error("Seed companies error:", err);
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  await seedDefaultUsers();
  await seedDefaultCompanies();

  await db.execute(`CREATE TABLE IF NOT EXISTS app_data (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
  )`);

  app.get("/api/app-data", async (_req, res) => {
    try {
      const rows = await db.select().from(appData);
      const result: Record<string, any> = {};
      for (const row of rows) {
        result[row.key] = row.value;
      }
      res.json(result);
    } catch (err: any) {
      console.error("Get app data error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/app-data/:key", async (req, res) => {
    try {
      const rows = await db.select().from(appData).where(eq(appData.key, req.params.key));
      if (rows.length === 0) return res.status(404).json({ error: "Not found" });
      res.json(rows[0].value);
    } catch (err: any) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.put("/api/app-data/:key", async (req, res) => {
    try {
      const { value } = req.body;
      await db.insert(appData).values({
        key: req.params.key,
        value: value,
        updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: appData.key,
        set: { value: value, updatedAt: new Date() },
      });
      res.json({ success: true });
    } catch (err: any) {
      console.error("Save app data error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.delete("/api/app-data/:key", async (req, res) => {
    try {
      await db.delete(appData).where(eq(appData.key, req.params.key));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // ═══ Companies CRUD ═══════════════════════════════════════════════════
  app.get("/api/companies", async (_req, res) => {
    try {
      const rows = await db.select().from(companies).orderBy(companies.id);
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/companies", async (req, res) => {
    try {
      const data = req.body;
      const result = await db.insert(companies).values({
        nameAr: data.nameAr,
        nameEn: data.nameEn,
        vatNumber: data.vatNumber || null,
        crNumber: data.crNumber || null,
        logoUrl: data.logoUrl || null,
        address: data.address || null,
        city: data.city || null,
        country: data.country || "SA",
        phone: data.phone || null,
        email: data.email || null,
        website: data.website || null,
        settings: data.settings || null,
        isActive: data.isActive ?? true,
      }).returning();
      res.json(result[0]);
    } catch (err: any) {
      console.error("Create company error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.put("/api/companies/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
      const data = req.body;
      const [existing] = await db.select().from(companies).where(eq(companies.id, id));
      if (!existing) return res.status(404).json({ error: "Not found" });
      const mergedSettings = { ...(existing.settings as any || {}), ...(data.settings || {}) };
      const result = await db.update(companies).set({
        nameAr: data.nameAr ?? existing.nameAr,
        nameEn: data.nameEn ?? existing.nameEn,
        vatNumber: data.vatNumber ?? existing.vatNumber,
        crNumber: data.crNumber ?? existing.crNumber,
        logoUrl: data.logoUrl ?? existing.logoUrl,
        address: data.address ?? existing.address,
        city: data.city ?? existing.city,
        country: data.country ?? existing.country,
        phone: data.phone ?? existing.phone,
        email: data.email ?? existing.email,
        website: data.website ?? existing.website,
        settings: mergedSettings,
        isActive: data.isActive ?? existing.isActive,
      }).where(eq(companies.id, id)).returning();
      res.json(result[0]);
    } catch (err: any) {
      console.error("Update company error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.delete("/api/companies/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(branches).where(eq(branches.companyId, id));
      await db.delete(companies).where(eq(companies.id, id));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // ═══ Branches CRUD ═══════════════════════════════════════════════════
  app.get("/api/branches", async (req, res) => {
    try {
      const companyId = req.query.companyId ? parseInt(req.query.companyId as string) : null;
      const rows = companyId
        ? await db.select().from(branches).where(eq(branches.companyId, companyId))
        : await db.select().from(branches);
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/branches", async (req, res) => {
    try {
      const data = req.body;
      const result = await db.insert(branches).values({
        companyId: data.companyId,
        nameAr: data.nameAr,
        nameEn: data.nameEn,
        city: data.city || null,
        address: data.address || null,
        phone: data.phone || null,
        managerName: data.managerName || data.manager || null,
        isActive: data.isActive ?? true,
      }).returning();
      res.json(result[0]);
    } catch (err: any) {
      console.error("Create branch error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.put("/api/branches/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = req.body;
      const result = await db.update(branches).set({
        nameAr: data.nameAr,
        nameEn: data.nameEn,
        city: data.city,
        address: data.address,
        phone: data.phone,
        managerName: data.managerName || data.manager,
        isActive: data.isActive,
      }).where(eq(branches.id, id)).returning();
      if (result.length === 0) return res.status(404).json({ error: "Not found" });
      res.json(result[0]);
    } catch (err: any) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.delete("/api/branches/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(branches).where(eq(branches.id, id));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: "Server error" });
    }
  });

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
