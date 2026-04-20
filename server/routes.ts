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
import { appData, companies, branches, contacts, deals, businessActivities, activityMembers, users } from "@shared/schema";
import { and, desc, inArray } from "drizzle-orm";
import { db } from "./db";
import { eq } from "drizzle-orm";

// Default activity catalog (mirror of client/src/lib/activities.ts DEFAULT_ACTIVITIES)
const DEFAULT_ACTIVITY_CATALOG: Array<{
  id: string; nameAr: string; nameEn: string; color: string; icon: string; modules: string[];
}> = [
  { id: "act_eng_consulting",    nameAr: "استشارات هندسية",  nameEn: "Engineering Consultancy",      color: "blue",    icon: "HardHat",     modules: ["dashboard","crm","sales","accounting","purchases","projects","engineering","approvals","government","smart_proposal","equipment","inventory","hr","payroll","attendance","hse","dms","mobile_app","bi"] },
  { id: "act_env_consulting",    nameAr: "استشارات بيئية",   nameEn: "Environmental Consultancy",    color: "emerald", icon: "Leaf",        modules: ["dashboard","crm","sales","accounting","purchases","projects","engineering","government","smart_proposal","hse","dms","hr","payroll","attendance","bi"] },
  { id: "act_safety_consulting", nameAr: "استشارات سلامة",   nameEn: "Safety Consultancy",           color: "amber",   icon: "ShieldAlert", modules: ["dashboard","crm","sales","accounting","projects","government","smart_proposal","hse","dms","hr","payroll","attendance","bi"] },
  { id: "act_safety_services",   nameAr: "خدمات سلامة",      nameEn: "Safety Services",              color: "orange",  icon: "Flame",       modules: ["dashboard","crm","sales","accounting","purchases","equipment","smart_proposal","hse","attendance","mobile_app","hr","payroll","dms"] },
  { id: "act_contracting",       nameAr: "مقاولات",           nameEn: "Contracting",                  color: "violet",  icon: "Building2",   modules: ["dashboard","crm","sales","accounting","purchases","projects","engineering","approvals","government","smart_proposal","equipment","inventory","hr","payroll","attendance","hse","dms","mobile_app","bi"] },
  { id: "act_metal_recycling",   nameAr: "تدوير المعادن",    nameEn: "Metal Recycling",              color: "teal",    icon: "RefreshCcw",  modules: ["dashboard","crm","sales","accounting","purchases","inventory","equipment","smart_proposal","hr","payroll","attendance","hse","dms","bi"] },
];

async function seedDefaultActivities() {
  try {
    const existing = await db.select().from(businessActivities);
    if (existing.length > 0) return;

    // 1) First check legacy app_data for previously-saved activities
    const legacy = await db.select().from(appData).where(eq(appData.key, "scapex_activities"));
    const legacyAsg = await db.select().from(appData).where(eq(appData.key, "scapex_activity_assignments"));

    const cos = await db.select().from(companies);
    const insertedActivityIds = new Set<string>();

    if (legacy.length > 0 && Array.isArray((legacy[0] as any).value)) {
      // Migrate legacy activities → assign each to first company that referenced it via settings.activityIds
      const list = (legacy[0] as any).value as any[];
      for (const a of list) {
        if (!a?.id || !a?.nameAr || !a?.nameEn) continue;
        const owner = cos.find((c) => Array.isArray((c.settings as any)?.activityIds) && (c.settings as any).activityIds.includes(a.id));
        const targetId = `${a.id}_c${owner?.id ?? cos[0]?.id ?? 0}`;
        if (insertedActivityIds.has(targetId)) continue;
        insertedActivityIds.add(targetId);
        await db.insert(businessActivities).values({
          id: targetId,
          companyId: owner?.id ?? cos[0]?.id ?? null,
          nameAr: a.nameAr, nameEn: a.nameEn,
          color: a.color || "blue", icon: a.icon || "Layers",
          modules: Array.isArray(a.modules) ? a.modules : [],
          active: a.active ?? true,
          companyNameAr: a.companyNameAr || owner?.nameAr || null,
          companyNameEn: a.companyNameEn || owner?.nameEn || null,
          companyLogoUrl: a.companyLogoUrl || owner?.logoUrl || null,
        }).onConflictDoNothing();
      }
      // Migrate legacy assignments
      if (legacyAsg.length > 0 && Array.isArray((legacyAsg[0] as any).value)) {
        const asgs = (legacyAsg[0] as any).value as Array<{ activityId: string; userIds: string[] }>;
        for (const a of asgs) {
          for (const uid of a.userIds || []) {
            // map old id → new (per company)
            const matches = Array.from(insertedActivityIds).filter((id) => id.startsWith(a.activityId + "_c"));
            for (const newId of matches) {
              try {
                await db.insert(activityMembers).values({ activityId: newId, userId: uid }).onConflictDoNothing();
              } catch { /* user may not exist */ }
            }
          }
        }
      }
    }

    // 2) Otherwise (or in addition) seed defaults: create one activity per company × catalog item the company needs
    for (const company of cos) {
      const catalogIds: string[] = Array.isArray((company.settings as any)?.activityIds) && (company.settings as any).activityIds.length > 0
        ? (company.settings as any).activityIds
        : DEFAULT_ACTIVITY_CATALOG.map((c) => c.id);
      for (const catId of catalogIds) {
        const cat = DEFAULT_ACTIVITY_CATALOG.find((x) => x.id === catId);
        if (!cat) continue;
        const targetId = `${cat.id}_c${company.id}`;
        if (insertedActivityIds.has(targetId)) continue;
        await db.insert(businessActivities).values({
          id: targetId,
          companyId: company.id,
          nameAr: cat.nameAr, nameEn: cat.nameEn,
          color: cat.color, icon: cat.icon, modules: cat.modules,
          active: true,
          companyNameAr: company.nameAr,
          companyNameEn: company.nameEn,
          companyLogoUrl: company.logoUrl,
        }).onConflictDoNothing();
        insertedActivityIds.add(targetId);
      }
    }

    // 3) Auto-assign admins/managers to all activities for visibility
    const allUsers = await db.select().from(users);
    const allActivities = await db.select().from(businessActivities);
    for (const u of allUsers) {
      const userRoles = new Set<string>([u.role || "", ...((u.roles as string[]) || [])]);
      if (!userRoles.has("admin") && !userRoles.has("manager")) continue;
      for (const a of allActivities) {
        try {
          await db.insert(activityMembers).values({ activityId: a.id, userId: u.id }).onConflictDoNothing();
        } catch { /* ignore */ }
      }
    }

    console.log("✅ Default business activities seeded");
  } catch (err) {
    console.error("Seed activities error:", err);
  }
}

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
      settings: { type: "main", parentId: null, employeeCount: 156, activityIds: ["act_contracting", "act_eng_consulting"] },
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
      settings: { type: "subsidiary", parentId: String(main.id), employeeCount: 45, activityIds: ["act_safety_consulting", "act_safety_services"] },
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
      settings: { type: "subsidiary", parentId: String(main.id), employeeCount: 32, activityIds: ["act_env_consulting"] },
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
      settings: { type: "subsidiary", parentId: String(main.id), employeeCount: 78, activityIds: ["act_contracting", "act_eng_consulting"] },
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

  // app_data must exist before seedDefaultActivities reads legacy entries from it
  await db.execute(`CREATE TABLE IF NOT EXISTS app_data (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
  )`);

  await seedDefaultUsers();
  await seedDefaultCompanies();
  await seedDefaultActivities();

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

  // ═══ Business Activities CRUD + Members ═══════════════════════════════
  async function isAdminOrManager(req: any): Promise<boolean> {
    const actorId = (req.header("x-user-id") || "").trim();
    if (!actorId) return false;
    const [u] = await db.select().from(users).where(eq(users.id, actorId));
    if (!u) return false;
    const r = new Set<string>([u.role || "", ...((u.roles as string[]) || [])]);
    return r.has("admin") || r.has("manager");
  }

  app.get("/api/activities", async (req, res) => {
    try {
      // Authenticate caller via x-user-id header (same pattern as other secured routes)
      const actorId = (req.header("x-user-id") || "").trim();
      if (!actorId) return res.status(401).json({ error: "Unauthorized" });
      const [actor] = await db.select().from(users).where(eq(users.id, actorId));
      if (!actor) return res.status(401).json({ error: "Unauthorized" });
      const actorRoles = new Set<string>([
        actor.role || "",
        ...(Array.isArray((actor as any).roles) ? ((actor as any).roles as string[]) : []),
      ]);
      const isPrivileged = actorRoles.has("admin") || actorRoles.has("manager");

      const companyId = req.query.companyId ? parseInt(req.query.companyId as string) : null;
      const conds: any[] = [];
      if (companyId) conds.push(eq(businessActivities.companyId, companyId));
      const rows = conds.length
        ? await db.select().from(businessActivities).where(and(...conds))
        : await db.select().from(businessActivities);
      const memberRows = await db.select().from(activityMembers);
      const memberMap: Record<string, string[]> = {};
      for (const m of memberRows) {
        (memberMap[m.activityId] ||= []).push(m.userId);
      }
      let result = rows.map((a) => ({ ...a, userIds: memberMap[a.id] || [] }));
      // Non-admin/manager: only see activities where the caller is a member
      if (!isPrivileged) {
        result = result.filter((a) => (memberMap[a.id] || []).includes(actorId));
      }
      res.json(result);
    } catch (err: any) {
      console.error("List activities error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/activities", async (req, res) => {
    try {
      if (!(await isAdminOrManager(req))) return res.status(403).json({ error: "Forbidden" });
      const d = req.body || {};
      if (!d.nameAr || !d.nameEn || !d.companyId) {
        return res.status(400).json({ error: "nameAr, nameEn and companyId are required" });
      }
      const id: string = d.id || `act_${Date.now()}_c${d.companyId}`;
      const [row] = await db.insert(businessActivities).values({
        id,
        companyId: parseInt(String(d.companyId)),
        nameAr: d.nameAr, nameEn: d.nameEn,
        color: d.color || "blue",
        icon: d.icon || "Layers",
        modules: Array.isArray(d.modules) ? d.modules : [],
        active: d.active ?? true,
        companyNameAr: d.companyNameAr || null,
        companyNameEn: d.companyNameEn || null,
        companyLogoUrl: d.companyLogoUrl || null,
      }).returning();
      res.json(row);
    } catch (err: any) {
      console.error("Create activity error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.patch("/api/activities/:id", async (req, res) => {
    try {
      if (!(await isAdminOrManager(req))) return res.status(403).json({ error: "Forbidden" });
      const d = req.body || {};
      const [existing] = await db.select().from(businessActivities).where(eq(businessActivities.id, req.params.id));
      if (!existing) return res.status(404).json({ error: "Not found" });
      const [row] = await db.update(businessActivities).set({
        nameAr: d.nameAr ?? existing.nameAr,
        nameEn: d.nameEn ?? existing.nameEn,
        color: d.color ?? existing.color,
        icon: d.icon ?? existing.icon,
        modules: Array.isArray(d.modules) ? d.modules : existing.modules,
        active: d.active ?? existing.active,
        companyId: d.companyId != null ? parseInt(String(d.companyId)) : existing.companyId,
        companyNameAr: d.companyNameAr ?? existing.companyNameAr,
        companyNameEn: d.companyNameEn ?? existing.companyNameEn,
        companyLogoUrl: d.companyLogoUrl ?? existing.companyLogoUrl,
      }).where(eq(businessActivities.id, req.params.id)).returning();
      res.json(row);
    } catch (err: any) {
      console.error("Update activity error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.delete("/api/activities/:id", async (req, res) => {
    try {
      if (!(await isAdminOrManager(req))) return res.status(403).json({ error: "Forbidden" });
      await db.delete(businessActivities).where(eq(businessActivities.id, req.params.id));
      res.json({ success: true });
    } catch (err: any) {
      console.error("Delete activity error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Bulk replace members for an activity
  app.put("/api/activities/:id/members", async (req, res) => {
    try {
      if (!(await isAdminOrManager(req))) return res.status(403).json({ error: "Forbidden" });
      const userIds: string[] = Array.isArray(req.body?.userIds) ? req.body.userIds : [];
      const activityId = req.params.id;
      await db.delete(activityMembers).where(eq(activityMembers.activityId, activityId));
      for (const uid of userIds) {
        try {
          await db.insert(activityMembers).values({ activityId, userId: uid }).onConflictDoNothing();
        } catch { /* skip invalid users */ }
      }
      res.json({ success: true, count: userIds.length });
    } catch (err: any) {
      console.error("Set activity members error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/activities/:id/members", async (req, res) => {
    try {
      if (!(await isAdminOrManager(req))) return res.status(403).json({ error: "Forbidden" });
      const userId: string = req.body?.userId;
      if (!userId) return res.status(400).json({ error: "userId required" });
      await db.insert(activityMembers).values({ activityId: req.params.id, userId }).onConflictDoNothing();
      res.json({ success: true });
    } catch (err: any) {
      console.error("Add activity member error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.delete("/api/activities/:id/members/:userId", async (req, res) => {
    try {
      if (!(await isAdminOrManager(req))) return res.status(403).json({ error: "Forbidden" });
      await db.delete(activityMembers).where(
        and(eq(activityMembers.activityId, req.params.id), eq(activityMembers.userId, req.params.userId))
      );
      res.json({ success: true });
    } catch (err: any) {
      console.error("Remove activity member error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Persist last selected activity per user
  app.patch("/api/users/:id/last-activity", async (req, res) => {
    try {
      const id = req.params.id;
      const actorId = (req.header("x-user-id") || "").trim();
      if (!actorId) return res.status(401).json({ error: "Unauthorized" });
      const [actor] = await db.select().from(users).where(eq(users.id, actorId));
      if (!actor) return res.status(401).json({ error: "Unauthorized" });
      const actorRoles = new Set<string>([
        actor.role || "",
        ...(Array.isArray((actor as any).roles) ? ((actor as any).roles as string[]) : []),
      ]);
      const isPrivileged = actorRoles.has("admin") || actorRoles.has("manager");
      if (actorId !== id && !isPrivileged) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const { activityId } = req.body || {};
      await db.update(users).set({ lastActivityId: activityId || null }).where(eq(users.id, id));
      res.json({ success: true });
    } catch (err: any) {
      console.error("Update last activity error:", err);
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

  // ═══ Customers (CRM) CRUD ═══════════════════════════════════════════════
  app.get("/api/customers", async (req, res) => {
    try {
      const activityId = (req.query.activityId as string) || null;
      const assignedTo = (req.query.assignedTo as string) || null;
      const conds: any[] = [eq(contacts.type, "customer")];
      if (activityId) conds.push(eq(contacts.activityId, activityId));
      if (assignedTo) conds.push(eq(contacts.assignedTo, assignedTo));
      const where = conds.length > 1 ? and(...conds) : conds[0];
      const rows = await db.select().from(contacts).where(where).orderBy(desc(contacts.createdAt));
      res.json(rows);
    } catch (err: any) {
      console.error("Get customers error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/customers", async (req, res) => {
    try {
      const d = req.body || {};
      if (!d.nameEn && !d.nameAr) {
        return res.status(400).json({ error: "Name is required" });
      }
      const result = await db.insert(contacts).values({
        companyId: d.companyId ?? null,
        nameAr: d.nameAr || d.nameEn || null,
        nameEn: d.nameEn || d.nameAr || null,
        email: d.email || null,
        phone: d.phone || null,
        mobile: d.mobile || d.phone || null,
        organization: d.organization || null,
        position: d.position || null,
        type: "customer",
        source: d.source || null,
        address: d.address || null,
        city: d.city || null,
        notes: d.notes || null,
        tags: Array.isArray(d.tags) ? d.tags : [],
        isActive: d.isActive ?? true,
        activityId: d.activityId || null,
        assignedTo: d.assignedTo || d.createdBy || null,
        createdBy: d.createdBy || null,
      }).returning();
      res.json(result[0]);
    } catch (err: any) {
      console.error("Create customer error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.patch("/api/customers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
      const d = req.body || {};
      const [existing] = await db.select().from(contacts).where(eq(contacts.id, id));
      if (!existing) return res.status(404).json({ error: "Not found" });

      // Authorization: derive actor from x-user-id header
      const actorId = (req.header("x-user-id") || "").trim();
      if (!actorId) return res.status(401).json({ error: "Unauthorized" });
      const [actor] = await db.select().from(users).where(eq(users.id, actorId));
      if (!actor) return res.status(401).json({ error: "Unknown user" });
      const actorRoles = new Set<string>([
        actor.role || "",
        ...(Array.isArray((actor as any).roles) ? (actor as any).roles as string[] : []),
      ]);
      const isPrivileged = actorRoles.has("admin") || actorRoles.has("manager");
      const isOwner = existing.assignedTo === actorId || existing.createdBy === actorId;

      // Reassignment-only flow: only assignedTo provided
      const isAssignOnly = Object.keys(d).length === 1 && "assignedTo" in d;
      if (isAssignOnly) {
        if (!isPrivileged && !isOwner) {
          return res.status(403).json({ error: "Forbidden: cannot transfer this customer" });
        }
      } else if (!isPrivileged && !isOwner) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const result = await db.update(contacts).set({
        nameAr: d.nameAr ?? existing.nameAr,
        nameEn: d.nameEn ?? existing.nameEn,
        email: d.email ?? existing.email,
        phone: d.phone ?? existing.phone,
        mobile: d.mobile ?? existing.mobile,
        organization: d.organization ?? existing.organization,
        position: d.position ?? existing.position,
        source: d.source ?? existing.source,
        address: d.address ?? existing.address,
        city: d.city ?? existing.city,
        notes: d.notes ?? existing.notes,
        tags: d.tags ?? existing.tags,
        isActive: d.isActive ?? existing.isActive,
        activityId: d.activityId ?? existing.activityId,
        assignedTo: d.assignedTo ?? existing.assignedTo,
        updatedAt: new Date(),
      }).where(eq(contacts.id, id)).returning();
      res.json(result[0]);
    } catch (err: any) {
      console.error("Update customer error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.delete("/api/customers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
      await db.delete(deals).where(eq(deals.contactId, id));
      await db.delete(contacts).where(eq(contacts.id, id));
      res.json({ success: true });
    } catch (err: any) {
      console.error("Delete customer error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // ═══ Deals (CRM Pipeline) CRUD ════════════════════════════════════════
  // Helper: identify actor + roles from x-user-id header
  async function getActor(req: any): Promise<{ id: string; roles: Set<string> } | null> {
    const actorId = (req.header("x-user-id") || "").trim();
    if (!actorId) return null;
    const [actor] = await db.select().from(users).where(eq(users.id, actorId));
    if (!actor) return null;
    const roles = new Set<string>([
      actor.role || "",
      ...(Array.isArray((actor as any).roles) ? (actor as any).roles as string[] : []),
    ]);
    return { id: actorId, roles };
  }

  app.get("/api/deals", async (req, res) => {
    try {
      const activityId = (req.query.activityId as string) || null;
      const assignedTo = (req.query.assignedTo as string) || null;
      const conds: any[] = [];
      if (activityId) conds.push(eq(deals.activityId, activityId));
      if (assignedTo) conds.push(eq(deals.assignedTo, assignedTo));
      const q = db.select().from(deals);
      const rows = conds.length
        ? await q.where(conds.length > 1 ? and(...conds) : conds[0]).orderBy(desc(deals.createdAt))
        : await q.orderBy(desc(deals.createdAt));
      res.json(rows);
    } catch (err: any) {
      console.error("Get deals error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/deals", async (req, res) => {
    try {
      const d = req.body || {};
      if (!d.titleEn && !d.titleAr) {
        return res.status(400).json({ error: "Title is required" });
      }
      const result = await db.insert(deals).values({
        companyId: d.companyId ?? null,
        contactId: d.contactId ?? null,
        titleAr: d.titleAr || d.titleEn || null,
        titleEn: d.titleEn || d.titleAr || null,
        value: d.value != null ? String(d.value) : "0",
        currency: d.currency || "SAR",
        expectedClose: d.expectedClose || null,
        notes: d.notes || null,
        nextAction: d.nextAction || null,
        stage: d.stage || "new",
        priority: d.priority || "medium",
        status: d.status || "open",
        source: d.source || null,
        activityId: d.activityId || null,
        assignedTo: d.assignedTo || d.createdBy || null,
        createdBy: d.createdBy || null,
      }).returning();
      res.json(result[0]);
    } catch (err: any) {
      console.error("Create deal error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.patch("/api/deals/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
      const d = req.body || {};
      const [existing] = await db.select().from(deals).where(eq(deals.id, id));
      if (!existing) return res.status(404).json({ error: "Not found" });

      const actor = await getActor(req);
      if (!actor) return res.status(401).json({ error: "Unauthorized" });
      const isPrivileged = actor.roles.has("admin") || actor.roles.has("manager");
      const isOwner = existing.assignedTo === actor.id || existing.createdBy === actor.id;
      if (!isPrivileged && !isOwner) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const result = await db.update(deals).set({
        contactId: d.contactId ?? existing.contactId,
        titleAr: d.titleAr ?? existing.titleAr,
        titleEn: d.titleEn ?? existing.titleEn,
        value: d.value != null ? String(d.value) : existing.value,
        currency: d.currency ?? existing.currency,
        expectedClose: d.expectedClose ?? existing.expectedClose,
        notes: d.notes ?? existing.notes,
        nextAction: d.nextAction ?? existing.nextAction,
        stage: d.stage ?? existing.stage,
        priority: d.priority ?? existing.priority,
        status: d.status ?? existing.status,
        activityId: d.activityId ?? existing.activityId,
        assignedTo: d.assignedTo ?? existing.assignedTo,
        updatedAt: new Date(),
      }).where(eq(deals.id, id)).returning();
      res.json(result[0]);
    } catch (err: any) {
      console.error("Update deal error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.delete("/api/deals/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
      const actor = await getActor(req);
      if (!actor) return res.status(401).json({ error: "Unauthorized" });
      if (!actor.roles.has("admin") && !actor.roles.has("manager")) {
        return res.status(403).json({ error: "Forbidden" });
      }
      await db.delete(deals).where(eq(deals.id, id));
      res.json({ success: true });
    } catch (err: any) {
      console.error("Delete deal error:", err);
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

  app.post("/api/users", async (req, res) => {
    try {
      const { email, password, name, role, roles, permissions, isActive, phone, username, nationalId, companyIds, branchIds } = req.body;
      if (!email || !password || !name) {
        return res.status(400).json({ error: "name, email and password are required" });
      }
      const existing = await findUserByEmail(email);
      if (existing) {
        return res.status(409).json({ error: "Email already registered" });
      }
      const user = await createUser({
        username: username || email.toLowerCase().split("@")[0],
        password,
        name,
        email,
        phone: phone || undefined,
        nationalId: nationalId || undefined,
        role: role || "viewer",
        roles: Array.isArray(roles) ? roles : [],
        permissions: Array.isArray(permissions) ? permissions : [],
        companyIds: Array.isArray(companyIds) ? companyIds : [],
        branchIds: Array.isArray(branchIds) ? branchIds : [],
        isActive: isActive ?? true,
      });
      const { password: _, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (err: any) {
      console.error("Create user error:", err);
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
