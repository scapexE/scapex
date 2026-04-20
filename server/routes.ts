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
import { appData, companies, branches, contacts, deals, businessActivities, activityMembers, users, projects, projectMilestones, documents, invoices, notifications, portalRequests } from "@shared/schema";
import { hashPassword, verifyPassword as verifyPwd } from "./auth";
import { signPortalToken, verifyPortalToken, readPortalToken } from "./portal";
import { and, desc, inArray, or } from "drizzle-orm";
import { db } from "./db";
import { eq } from "drizzle-orm";

import { seedDefaultActivities as seedActivitiesShared, seedDefaultCompanies as seedCompaniesShared, seedDefaultCatalogs, DEFAULT_ACTIVITY_CATALOG } from "./seed";

// Wrapper that adds the legacy app_data migration step on top of the shared
// seed (the rebuild script doesn't need this — only the running server does
// when migrating an old install). After the legacy migration we always
// delegate to `seedActivitiesShared` so any catalogue items the legacy data
// didn't cover still get created and admins/managers get auto-assigned.
async function seedDefaultActivities() {
  try {
    const existing = await db.select().from(businessActivities);
    if (existing.length > 0) {
      // Already populated — make sure the catalog is still in sync
      // (delegated routine is itself idempotent and short-circuits).
      await seedActivitiesShared();
      return;
    }

    // 1) First check legacy app_data for previously-saved activities
    const legacy = await db.select().from(appData).where(eq(appData.key, "scapex_activities"));
    const legacyAsg = await db.select().from(appData).where(eq(appData.key, "scapex_activity_assignments"));

    // If there's no legacy data at all, skip straight to the shared seed.
    if (!(legacy.length > 0 && Array.isArray((legacy[0] as any).value))) {
      await seedActivitiesShared();
      return;
    }

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

    // 2) Now delegate to the shared reconciler to fill in any catalog items
    //    the legacy data didn't cover and to apply admin/manager memberships.
    //    The shared routine is idempotent (uses ON CONFLICT DO NOTHING), so
    //    it leaves the migrated rows untouched.
    await seedActivitiesShared();

    console.log("✅ Default business activities seeded (legacy migration + reconcile)");
  } catch (err) {
    console.error("Seed activities error:", err);
  }
}

// Wrapper preserved for the boot path (delegates to shared seed module).
async function seedDefaultCompanies() {
  return seedCompaniesShared();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ── Global API guard ─────────────────────────────────────────────────────
  // Two separate sessions live in this app:
  //   • Staff:  identified by `x-user-id` header  → may hit any non-/api/portal/* route
  //   • Portal: identified by `Authorization: Bearer <portal-token>` → may ONLY hit /api/portal/*
  // This guard keeps the two strictly isolated so a logged-in customer cannot
  // probe internal endpoints with their own token, and an anonymous caller
  // cannot hit /api/portal/* without a portal token.
  // Pre-login / bootstrap endpoints that legitimately have no staff identity yet.
  const STAFF_AUTH_PUBLIC = new Set<string>([
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/send-code",
    "/api/auth/verify-code",
    "/api/auth/forgot",
  ]);
  // Tiny TTL cache so the auth guard doesn't hit the DB on every request.
  // Maps userId → { active, role, expires }.
  const STAFF_CACHE = new Map<string, { active: boolean; role: string | null; expires: number }>();
  const STAFF_CACHE_TTL_MS = 30_000;
  async function resolveStaffUser(userId: string) {
    const now = Date.now();
    const hit = STAFF_CACHE.get(userId);
    if (hit && hit.expires > now) return hit;
    const rows = await db.select({ id: users.id, isActive: users.isActive, role: users.role })
      .from(users).where(eq(users.id, userId)).limit(1);
    const u = rows[0];
    const entry = { active: !!u && u.isActive !== false, role: u?.role ?? null, expires: now + STAFF_CACHE_TTL_MS };
    if (u) STAFF_CACHE.set(userId, entry);
    return u ? entry : null;
  }

  app.use(async (req, res, next) => {
    if (!req.path.startsWith("/api/")) return next();
    const isPortalPath = req.path.startsWith("/api/portal/");
    const portalToken = readPortalToken(req);
    const portalDecoded = portalToken ? verifyPortalToken(portalToken) : null;

    if (isPortalPath) {
      // Public portal endpoints (no token needed yet).
      if (req.path === "/api/portal/login" || req.path === "/api/portal/logout") return next();
      if (!portalDecoded) return res.status(401).json({ error: "Portal session required" });
      return next();
    }

    // Non-portal /api/* — block portal tokens so a customer cannot pivot from
    // their own session into staff APIs.
    if (portalDecoded) {
      console.warn(`[guard] portal token blocked from ${req.method} ${req.path}`);
      return res.status(403).json({ error: "Portal users cannot access internal APIs" });
    }

    // Pre-login / bootstrap endpoints that legitimately have no staff identity yet.
    if (STAFF_AUTH_PUBLIC.has(req.path)) return next();
    // /api/app-data: read-only key/value bootstrap data (logos, theme, etc.)
    // fetched before login. GETs are open; mutations require staff auth.
    if (req.method === "GET" && req.path.startsWith("/api/app-data")) return next();

    const staffId = (req.header("x-user-id") || "").trim();
    if (!staffId) return res.status(401).json({ error: "Staff authentication required" });
    try {
      const staff = await resolveStaffUser(staffId);
      if (!staff) return res.status(401).json({ error: "Unknown user" });
      if (!staff.active) return res.status(403).json({ error: "User is disabled" });
    } catch (err) {
      console.error("[guard] staff lookup failed:", err);
      return res.status(500).json({ error: "Auth check failed" });
    }
    return next();
  });

  // app_data must exist before seedDefaultActivities reads legacy entries from it
  await db.execute(`CREATE TABLE IF NOT EXISTS app_data (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
  )`);

  await seedDefaultUsers();
  await seedDefaultCompanies();
  await seedDefaultActivities();
  await seedDefaultCatalogs();

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

  // Strict admin-only check (used for company/branch mutations).
  async function isAdminOnly(req: any): Promise<boolean> {
    const actorId = (req.header("x-user-id") || "").trim();
    if (!actorId) return false;
    const [u] = await db.select().from(users).where(eq(users.id, actorId));
    if (!u) return false;
    const r = new Set<string>([u.role || "", ...((u.roles as string[]) || [])]);
    return r.has("admin");
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
      if (!(await isAdminOnly(req))) return res.status(403).json({ error: "Forbidden" });
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
      if (!(await isAdminOnly(req))) return res.status(403).json({ error: "Forbidden" });
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
      if (!(await isAdminOnly(req))) return res.status(403).json({ error: "Forbidden" });
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
      if (!(await isAdminOnly(req))) return res.status(403).json({ error: "Forbidden" });
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
      if (!(await isAdminOnly(req))) return res.status(403).json({ error: "Forbidden" });
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
      if (!(await isAdminOnly(req))) return res.status(403).json({ error: "Forbidden" });
      const id = parseInt(req.params.id);
      await db.delete(branches).where(eq(branches.id, id));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // ═══ Customers (CRM) CRUD ═══════════════════════════════════════════════
  // ═══ Activity-scope helpers ═══════════════════════════════════════════
  // Identify the calling user from the x-user-id header (also used by other routes).
  async function identifyActor(req: any): Promise<{ id: string; roles: Set<string> } | null> {
    const actorId = (req.header("x-user-id") || "").trim();
    if (!actorId) return null;
    const [row] = await db.select().from(users).where(eq(users.id, actorId));
    if (!row) return null;
    const r = new Set<string>([
      row.role || "",
      ...(Array.isArray((row as any).roles) ? ((row as any).roles as string[]) : []),
    ]);
    return { id: actorId, roles: r };
  }
  // Activity scope decision used by every list endpoint that owns module data.
  // Returns the activityId(s) the request is allowed to read, or a 401/403 sentinel.
  async function resolveActivityScope(req: any): Promise<
    | { ok: true; actor: { id: string; roles: Set<string> }; isPrivileged: boolean; activityId: string | null; allowedIds: string[] | null }
    | { ok: false; status: number; error: string }
  > {
    const actor = await identifyActor(req);
    if (!actor) return { ok: false, status: 401, error: "Unauthorized" };
    const isPrivileged = actor.roles.has("admin") || actor.roles.has("manager");
    const headerActivity = (req.header("x-activity-id") || "").trim() || null;
    const queryActivity = (req.query.activityId as string) || null;
    const requested = headerActivity || queryActivity || null;
    // Non-privileged users MUST scope by an activity, and must be a member of it.
    const memberRows = await db.select().from(activityMembers).where(eq(activityMembers.userId, actor.id));
    const allowedIds = isPrivileged ? null : memberRows.map((m) => m.activityId);
    if (!isPrivileged) {
      if (!requested) {
        return { ok: false, status: 400, error: "activityId is required" };
      }
      if (!(allowedIds || []).includes(requested)) {
        return { ok: false, status: 403, error: "Forbidden: activity not in your scope" };
      }
    }
    return { ok: true, actor, isPrivileged, activityId: requested, allowedIds };
  }

  app.get("/api/customers", async (req, res) => {
    try {
      const scope = await resolveActivityScope(req);
      if (!scope.ok) return res.status(scope.status).json({ error: scope.error });
      const assignedTo = (req.query.assignedTo as string) || null;
      const conds: any[] = [eq(contacts.type, "customer")];
      if (scope.activityId) conds.push(eq(contacts.activityId, scope.activityId));
      else if (!scope.isPrivileged && scope.allowedIds && scope.allowedIds.length) {
        // Defence-in-depth: should never hit because scope was rejected, but constrain anyway
        conds.push(inArray(contacts.activityId, scope.allowedIds));
      }
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
      const scope = await resolveActivityScope(req);
      if (!scope.ok) return res.status(scope.status).json({ error: scope.error });
      const d = req.body || {};
      if (!d.nameEn && !d.nameAr) {
        return res.status(400).json({ error: "Name is required" });
      }
      // Force activityId to the request scope. Privileged callers may pick the activity
      // explicitly via body.activityId, but it is REQUIRED — we will not create
      // unscoped (NULL) records, otherwise the row is invisible to non-privileged users
      // and breaks tenant isolation.
      const writeActivityId = scope.isPrivileged
        ? (d.activityId || scope.activityId || null)
        : scope.activityId;
      if (!writeActivityId) {
        return res.status(400).json({ error: "activityId is required to create a customer" });
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
        activityId: writeActivityId,
        assignedTo: d.assignedTo || d.createdBy || scope.actor.id,
        createdBy: d.createdBy || scope.actor.id,
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

      // Authorization + activity scope (membership for the *record's* activity)
      const scope = await resolveActivityScope(req);
      if (!scope.ok) return res.status(scope.status).json({ error: scope.error });
      const actorId = scope.actor.id;
      const isPrivileged = scope.isPrivileged;
      // Cross-activity guard: non-privileged callers must be a member of the record's activity.
      if (!isPrivileged && existing.activityId && !(scope.allowedIds || []).includes(existing.activityId)) {
        return res.status(403).json({ error: "Forbidden: record is in a different activity" });
      }
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

      // Activity transfer is admin/manager-only. A non-privileged caller cannot
      // move a record into another activity by sending body.activityId.
      let nextActivityId = existing.activityId;
      if ("activityId" in d && d.activityId !== undefined && d.activityId !== existing.activityId) {
        if (!isPrivileged) {
          return res.status(403).json({ error: "Forbidden: only admin/manager may transfer activity" });
        }
        nextActivityId = d.activityId;
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
        activityId: nextActivityId,
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
      const scope = await resolveActivityScope(req);
      if (!scope.ok) return res.status(scope.status).json({ error: scope.error });
      const [existing] = await db.select().from(contacts).where(eq(contacts.id, id));
      if (!existing) return res.status(404).json({ error: "Not found" });
      // Cross-activity guard
      if (!scope.isPrivileged && existing.activityId && !(scope.allowedIds || []).includes(existing.activityId)) {
        return res.status(403).json({ error: "Forbidden: record is in a different activity" });
      }
      // Only privileged or owner may delete
      const isOwner = existing.assignedTo === scope.actor.id || existing.createdBy === scope.actor.id;
      if (!scope.isPrivileged && !isOwner) {
        return res.status(403).json({ error: "Forbidden" });
      }
      await db.delete(deals).where(eq(deals.contactId, id));
      await db.delete(contacts).where(eq(contacts.id, id));
      res.json({ success: true });
    } catch (err: any) {
      console.error("Delete customer error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // ═══ Deals (CRM Pipeline) CRUD ════════════════════════════════════════
  // Backwards-compatible alias for legacy callers in this file.
  const getActor = identifyActor;

  app.get("/api/deals", async (req, res) => {
    try {
      const scope = await resolveActivityScope(req);
      if (!scope.ok) return res.status(scope.status).json({ error: scope.error });
      const assignedTo = (req.query.assignedTo as string) || null;
      const conds: any[] = [];
      if (scope.activityId) conds.push(eq(deals.activityId, scope.activityId));
      else if (!scope.isPrivileged && scope.allowedIds && scope.allowedIds.length) {
        conds.push(inArray(deals.activityId, scope.allowedIds));
      }
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
      const scope = await resolveActivityScope(req);
      if (!scope.ok) return res.status(scope.status).json({ error: scope.error });
      const d = req.body || {};
      if (!d.titleEn && !d.titleAr) {
        return res.status(400).json({ error: "Title is required" });
      }
      const writeActivityId = scope.isPrivileged
        ? (d.activityId || scope.activityId || null)
        : scope.activityId;
      if (!writeActivityId) {
        return res.status(400).json({ error: "activityId is required to create a deal" });
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
        activityId: writeActivityId,
        assignedTo: d.assignedTo || d.createdBy || scope.actor.id,
        createdBy: d.createdBy || scope.actor.id,
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

      const scope = await resolveActivityScope(req);
      if (!scope.ok) return res.status(scope.status).json({ error: scope.error });
      const isPrivileged = scope.isPrivileged;
      // Cross-activity guard
      if (!isPrivileged && existing.activityId && !(scope.allowedIds || []).includes(existing.activityId)) {
        return res.status(403).json({ error: "Forbidden: record is in a different activity" });
      }
      const isOwner = existing.assignedTo === scope.actor.id || existing.createdBy === scope.actor.id;
      if (!isPrivileged && !isOwner) {
        return res.status(403).json({ error: "Forbidden" });
      }

      // Activity transfer is admin/manager-only.
      let nextActivityId = existing.activityId;
      if ("activityId" in d && d.activityId !== undefined && d.activityId !== existing.activityId) {
        if (!isPrivileged) {
          return res.status(403).json({ error: "Forbidden: only admin/manager may transfer activity" });
        }
        nextActivityId = d.activityId;
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
        activityId: nextActivityId,
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
      const scope = await resolveActivityScope(req);
      if (!scope.ok) return res.status(scope.status).json({ error: scope.error });
      if (!scope.isPrivileged) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const [existing] = await db.select().from(deals).where(eq(deals.id, id));
      if (!existing) return res.status(404).json({ error: "Not found" });
      await db.delete(deals).where(eq(deals.id, id));
      res.json({ success: true });
    } catch (err: any) {
      console.error("Delete deal error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // ═══ Projects + Stages CRUD ═══════════════════════════════════════════
  // Helper: ensure the requester can see/touch a given project, returning the row.
  async function loadScopedProject(req: any, idStr: string) {
    const id = parseInt(idStr);
    if (isNaN(id)) return { ok: false as const, status: 400, error: "Invalid id" };
    const scope = await resolveActivityScope(req);
    if (!scope.ok) return { ok: false as const, status: scope.status, error: scope.error };
    const [row] = await db.select().from(projects).where(eq(projects.id, id));
    if (!row) return { ok: false as const, status: 404, error: "Not found" };
    // Hardened scope: a non-privileged user MUST belong to the project's
    // activity. We also explicitly deny rows whose activityId is null so
    // legacy/unscoped projects don't leak across the tenant boundary.
    if (!scope.isPrivileged) {
      if (!row.activityId) {
        return { ok: false as const, status: 403, error: "Forbidden: project has no activity scope" };
      }
      if (!(scope.allowedIds || []).includes(row.activityId)) {
        return { ok: false as const, status: 403, error: "Forbidden: project is in a different activity" };
      }
    }
    return { ok: true as const, row, scope };
  }

  app.get("/api/projects", async (req, res) => {
    try {
      const scope = await resolveActivityScope(req);
      if (!scope.ok) return res.status(scope.status).json({ error: scope.error });
      const status = (req.query.status as string) || null;
      const contactId = req.query.contactId ? parseInt(req.query.contactId as string) : null;
      const managerId = (req.query.managerId as string) || null;
      const conds: any[] = [];
      if (scope.activityId) conds.push(eq(projects.activityId, scope.activityId));
      else if (!scope.isPrivileged) {
        // Non-privileged callers without a chosen activity see only projects
        // whose activityId is one they explicitly belong to. Null activityId
        // rows are excluded (hardened scope).
        if (scope.allowedIds && scope.allowedIds.length) {
          conds.push(inArray(projects.activityId, scope.allowedIds));
        } else {
          // No allowed activities → cannot see anything.
          return res.json([]);
        }
      }
      if (status) conds.push(eq(projects.status, status));
      if (contactId && !isNaN(contactId)) conds.push(eq(projects.contactId, contactId));
      if (managerId) conds.push(eq(projects.managerId, managerId));
      const q = db.select().from(projects);
      const rows = conds.length
        ? await q.where(conds.length > 1 ? and(...conds) : conds[0]).orderBy(desc(projects.createdAt))
        : await q.orderBy(desc(projects.createdAt));
      res.json(rows);
    } catch (err: any) {
      console.error("Get projects error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const r = await loadScopedProject(req, req.params.id);
      if (!r.ok) return res.status(r.status).json({ error: r.error });
      res.json(r.row);
    } catch (err: any) {
      console.error("Get project error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const scope = await resolveActivityScope(req);
      if (!scope.ok) return res.status(scope.status).json({ error: scope.error });
      const d = req.body || {};
      if (!d.nameAr && !d.nameEn) return res.status(400).json({ error: "Name is required" });
      // A project MUST be linked to a CRM contact (contactId). Free-text
      // client names are not allowed because the CRM customer-projects tab
      // queries by contactId; orphaned projects would be invisible there
      // and would break "كل عميل مرتبط بمشاريعه".
      const contactId = Number(d.contactId);
      if (!Number.isFinite(contactId) || contactId <= 0) {
        return res.status(400).json({ error: "contactId is required" });
      }
      // Make sure the contact actually exists (avoid dangling FK rows that
      // would still pass DB FK because the value is non-null but invalid).
      const [contactRow] = await db.select().from(contacts).where(eq(contacts.id, contactId)).limit(1);
      if (!contactRow) return res.status(400).json({ error: "Invalid contactId" });
      // SCOPE CHECK: non-privileged users can only link contacts that
      // belong to one of their allowed activities. Otherwise a user could
      // guess a contactId from another tenant and link a project to it.
      if (!scope.isPrivileged) {
        const allowed = scope.allowedIds || [];
        if (!contactRow.activityId || !allowed.includes(contactRow.activityId)) {
          return res.status(403).json({ error: "Forbidden: contact is outside your activity scope" });
        }
      }
      // Activity is REQUIRED to keep tenant isolation. Privileged callers may pick.
      const writeActivityId = scope.isPrivileged
        ? (d.activityId || scope.activityId || null)
        : scope.activityId;
      if (!writeActivityId) return res.status(400).json({ error: "activityId is required" });
      const result = await db.insert(projects).values({
        companyId: d.companyId ?? null,
        branchId: d.branchId ?? null,
        projectCode: d.projectCode || null,
        nameAr: d.nameAr || d.nameEn,
        nameEn: d.nameEn || d.nameAr || null,
        description: d.description || null,
        clientName: d.clientName || contactRow.nameAr || contactRow.nameEn || null,
        contactId: contactId,
        contractId: d.contractId ?? null,
        serviceType: d.serviceType || null,
        managerId: d.managerId || null,
        status: d.status || "planning",
        priority: d.priority || "medium",
        startDate: d.startDate || null,
        endDate: d.endDate || null,
        budget: d.budget ?? null,
        progress: d.progress ?? 0,
        location: d.location || null,
        city: d.city || null,
        notes: d.notes || null,
        activityId: writeActivityId,
        createdBy: d.createdBy || scope.actor.id,
      }).returning();
      res.json(result[0]);
    } catch (err: any) {
      console.error("Create project error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.patch("/api/projects/:id", async (req, res) => {
    try {
      const r = await loadScopedProject(req, req.params.id);
      if (!r.ok) return res.status(r.status).json({ error: r.error });
      const d = req.body || {};
      // Mutation authorization: privileged users (admin/manager) may always
      // edit. Otherwise the actor must be the project's manager OR the user
      // who created it. Pure activity-membership is NOT enough; we don't want
      // every member of an activity to be able to edit every project.
      const actorId = r.scope.actor.id;
      const isOwner = r.row.managerId === actorId || r.row.createdBy === actorId;
      if (!r.scope.isPrivileged && !isOwner) {
        return res.status(403).json({ error: "Forbidden: only the project manager, creator, or admin/manager may edit" });
      }
      // Activity transfer is admin/manager-only.
      let nextActivityId = r.row.activityId;
      if ("activityId" in d && d.activityId !== undefined && d.activityId !== r.row.activityId) {
        if (!r.scope.isPrivileged) return res.status(403).json({ error: "Forbidden: only admin/manager may transfer activity" });
        nextActivityId = d.activityId;
      }
      // Reject any attempt to clear the contact link. A project must always
      // remain linked to a CRM contact so it stays visible on the customer
      // card. If a new contactId is provided, it must reference an existing
      // contact.
      if ("contactId" in d) {
        const newCid = Number(d.contactId);
        if (!Number.isFinite(newCid) || newCid <= 0) {
          return res.status(400).json({ error: "contactId is required" });
        }
        const [exists] = await db.select().from(contacts).where(eq(contacts.id, newCid)).limit(1);
        if (!exists) return res.status(400).json({ error: "Invalid contactId" });
        if (!r.scope.isPrivileged) {
          const allowed = r.scope.allowedIds || [];
          if (!exists.activityId || !allowed.includes(exists.activityId)) {
            return res.status(403).json({ error: "Forbidden: contact is outside your activity scope" });
          }
        }
      }
      const upd = await db.update(projects).set({
        nameAr: d.nameAr ?? r.row.nameAr,
        nameEn: d.nameEn ?? r.row.nameEn,
        description: d.description ?? r.row.description,
        clientName: d.clientName ?? r.row.clientName,
        contactId: d.contactId ?? r.row.contactId,
        managerId: d.managerId ?? r.row.managerId,
        status: d.status ?? r.row.status,
        priority: d.priority ?? r.row.priority,
        startDate: d.startDate ?? r.row.startDate,
        endDate: d.endDate ?? r.row.endDate,
        budget: d.budget ?? r.row.budget,
        spent: d.spent ?? r.row.spent,
        progress: d.progress ?? r.row.progress,
        location: d.location ?? r.row.location,
        city: d.city ?? r.row.city,
        notes: d.notes ?? r.row.notes,
        serviceType: d.serviceType ?? r.row.serviceType,
        activityId: nextActivityId,
        updatedAt: new Date(),
      }).where(eq(projects.id, r.row.id)).returning();
      res.json(upd[0]);
    } catch (err: any) {
      console.error("Update project error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const r = await loadScopedProject(req, req.params.id);
      if (!r.ok) return res.status(r.status).json({ error: r.error });
      if (!r.scope.isPrivileged) return res.status(403).json({ error: "Forbidden" });
      // Cascade-clean child rows that hold FKs to projects (no ON DELETE
      // CASCADE in schema yet): stages and project documents.
      await db.delete(projectMilestones).where(eq(projectMilestones.projectId, r.row.id));
      await db.delete(documents).where(eq(documents.projectId, r.row.id));
      await db.delete(invoices).where(eq(invoices.projectId, r.row.id));
      await db.delete(projects).where(eq(projects.id, r.row.id));
      res.json({ success: true });
    } catch (err: any) {
      console.error("Delete project error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Stages (project_milestones) inherit the parent project's scope.
  app.get("/api/projects/:id/stages", async (req, res) => {
    try {
      const r = await loadScopedProject(req, req.params.id);
      if (!r.ok) return res.status(r.status).json({ error: r.error });
      const rows = await db
        .select()
        .from(projectMilestones)
        .where(eq(projectMilestones.projectId, r.row.id))
        .orderBy(projectMilestones.sortOrder, projectMilestones.id);
      res.json(rows);
    } catch (err: any) {
      console.error("Get stages error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/projects/:id/stages", async (req, res) => {
    try {
      const r = await loadScopedProject(req, req.params.id);
      if (!r.ok) return res.status(r.status).json({ error: r.error });
      // Only privileged users or the project's manager/creator may add stages.
      const actorId = r.scope.actor.id;
      const canAddStage =
        r.scope.isPrivileged ||
        r.row.managerId === actorId ||
        r.row.createdBy === actorId;
      if (!canAddStage) return res.status(403).json({ error: "Forbidden: only project manager/creator may add stages" });
      const d = req.body || {};
      if (!d.titleAr && !d.titleEn) return res.status(400).json({ error: "Title is required" });
      const result = await db.insert(projectMilestones).values({
        projectId: r.row.id,
        titleAr: d.titleAr || d.titleEn,
        titleEn: d.titleEn || d.titleAr || null,
        // (notification fired below after the row is created)
        descriptionAr: d.descriptionAr || null,
        descriptionEn: d.descriptionEn || null,
        assignedTo: d.assignedTo || null,
        expectedStart: d.expectedStart || null,
        expectedEnd: d.expectedEnd || null,
        actualStart: d.actualStart || null,
        actualEnd: d.actualEnd || null,
        dueDate: d.dueDate || d.expectedEnd || null,
        status: d.status || "pending",
        progress: d.progress ?? 0,
        notes: d.notes || null,
        sortOrder: d.sortOrder ?? 0,
        // Stages inherit the project's activityId so that the same scope
        // filter works if anyone queries them directly later on.
        activityId: r.row.activityId,
      }).returning();
      // Notify the assignee, if any, that they've been assigned to this stage.
      if (result[0].assignedTo) {
        const projectName = r.row.nameAr || r.row.nameEn || `#${r.row.id}`;
        const stageName = result[0].titleAr || result[0].titleEn || `#${result[0].id}`;
        await db.insert(notifications).values({
          companyId: r.row.companyId ?? null,
          userId: result[0].assignedTo,
          titleAr: "تم تعيينك لمرحلة جديدة",
          titleEn: "You were assigned a new stage",
          message: `${stageName} — ${projectName}`,
          type: "info",
          module: "projects",
          entityId: String(result[0].id),
        }).catch(e => console.error("notify assign create:", e));
      }
      res.json(result[0]);
    } catch (err: any) {
      console.error("Create stage error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.patch("/api/stages/:id", async (req, res) => {
    try {
      const sid = parseInt(req.params.id);
      if (isNaN(sid)) return res.status(400).json({ error: "Invalid id" });
      const [stage] = await db.select().from(projectMilestones).where(eq(projectMilestones.id, sid));
      if (!stage) return res.status(404).json({ error: "Not found" });
      const r = await loadScopedProject(req, String(stage.projectId));
      if (!r.ok) return res.status(r.status).json({ error: r.error });
      // Mutation authorization: privileged users always; otherwise the actor
      // must be the stage assignee, the project manager, or the creator.
      const actorId = r.scope.actor.id;
      const isAllowed =
        r.scope.isPrivileged ||
        stage.assignedTo === actorId ||
        r.row.managerId === actorId ||
        r.row.createdBy === actorId;
      if (!isAllowed) return res.status(403).json({ error: "Forbidden: not assigned to this stage" });
      const d = req.body || {};
      // Auto-stamp completedAt when status flips to "completed"
      const becameComplete = d.status === "completed" && stage.status !== "completed";
      const reassignedTo = (d.assignedTo !== undefined && d.assignedTo !== stage.assignedTo) ? d.assignedTo : null;
      const upd = await db.update(projectMilestones).set({
        titleAr: d.titleAr ?? stage.titleAr,
        titleEn: d.titleEn ?? stage.titleEn,
        descriptionAr: d.descriptionAr ?? stage.descriptionAr,
        descriptionEn: d.descriptionEn ?? stage.descriptionEn,
        assignedTo: d.assignedTo ?? stage.assignedTo,
        expectedStart: d.expectedStart ?? stage.expectedStart,
        expectedEnd: d.expectedEnd ?? stage.expectedEnd,
        actualStart: d.actualStart ?? stage.actualStart,
        actualEnd: d.actualEnd ?? stage.actualEnd,
        dueDate: d.dueDate ?? stage.dueDate,
        status: d.status ?? stage.status,
        progress: d.progress ?? stage.progress,
        notes: d.notes ?? stage.notes,
        sortOrder: d.sortOrder ?? stage.sortOrder,
        completedAt: becameComplete ? new Date() : stage.completedAt,
      }).where(eq(projectMilestones.id, sid)).returning();
      // Notification triggers (best-effort; never fail the response).
      try {
        const projectName = r.row.nameAr || r.row.nameEn || `#${r.row.id}`;
        const stageName = upd[0].titleAr || upd[0].titleEn || `#${upd[0].id}`;
        if (reassignedTo) {
          await db.insert(notifications).values({
            companyId: r.row.companyId ?? null,
            userId: reassignedTo,
            titleAr: "تم تعيينك لمرحلة",
            titleEn: "You were assigned to a stage",
            message: `${stageName} — ${projectName}`,
            type: "info",
            module: "projects",
            entityId: String(upd[0].id),
          });
        }
        if (becameComplete && r.row.managerId && r.row.managerId !== r.scope.actor.id) {
          await db.insert(notifications).values({
            companyId: r.row.companyId ?? null,
            userId: r.row.managerId,
            titleAr: "اكتملت مرحلة في مشروعك",
            titleEn: "A stage in your project was completed",
            message: `${stageName} — ${projectName}`,
            type: "success",
            module: "projects",
            entityId: String(upd[0].id),
          });
        }
      } catch (e) { console.error("notify stage update:", e); }
      res.json(upd[0]);
    } catch (err: any) {
      console.error("Update stage error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.delete("/api/stages/:id", async (req, res) => {
    try {
      const sid = parseInt(req.params.id);
      if (isNaN(sid)) return res.status(400).json({ error: "Invalid id" });
      const [stage] = await db.select().from(projectMilestones).where(eq(projectMilestones.id, sid));
      if (!stage) return res.status(404).json({ error: "Not found" });
      const r = await loadScopedProject(req, String(stage.projectId));
      if (!r.ok) return res.status(r.status).json({ error: r.error });
      // Stage deletion is restricted to privileged users or the project
      // manager/creator. Mere assignees can mark a stage done but not erase it.
      const actorId = r.scope.actor.id;
      const allowedDelete =
        r.scope.isPrivileged ||
        r.row.managerId === actorId ||
        r.row.createdBy === actorId;
      if (!allowedDelete) return res.status(403).json({ error: "Forbidden" });
      await db.delete(projectMilestones).where(eq(projectMilestones.id, sid));
      res.json({ success: true });
    } catch (err: any) {
      console.error("Delete stage error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // ─────── Project documents (real DMS link, not a stub) ────────
  app.get("/api/projects/:id/documents", async (req, res) => {
    try {
      const r = await loadScopedProject(req, req.params.id);
      if (!r.ok) return res.status(r.status).json({ error: r.error });
      const rows = await db.select().from(documents)
        .where(eq(documents.projectId, r.row.id))
        .orderBy(desc(documents.createdAt));
      res.json(rows);
    } catch (err: any) {
      console.error("List project documents error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/projects/:id/documents", async (req, res) => {
    try {
      const r = await loadScopedProject(req, req.params.id);
      if (!r.ok) return res.status(r.status).json({ error: r.error });
      // Anyone scoped to the project may attach documents (project members
      // need to upload contracts, drawings, etc.).
      const d = req.body || {};
      if (!d.titleAr && !d.titleEn) return res.status(400).json({ error: "Title is required" });
      const result = await db.insert(documents).values({
        projectId: r.row.id,
        companyId: r.row.companyId ?? null,
        titleAr: d.titleAr || d.titleEn,
        titleEn: d.titleEn || null,
        type: d.type || null,
        fileUrl: d.fileUrl || null,
        description: d.description || null,
        uploadedBy: r.scope.actor.id,
        activityId: r.row.activityId,
      }).returning();
      res.status(201).json(result[0]);
    } catch (err: any) {
      console.error("Create project document error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.delete("/api/project-documents/:id", async (req, res) => {
    try {
      const did = parseInt(req.params.id);
      if (isNaN(did)) return res.status(400).json({ error: "Invalid id" });
      const [doc] = await db.select().from(documents).where(eq(documents.id, did));
      if (!doc) return res.status(404).json({ error: "Not found" });
      if (!doc.projectId) return res.status(400).json({ error: "Not a project document" });
      const r = await loadScopedProject(req, String(doc.projectId));
      if (!r.ok) return res.status(r.status).json({ error: r.error });
      const actorId = r.scope.actor.id;
      const allowed = r.scope.isPrivileged || doc.uploadedBy === actorId
        || r.row.managerId === actorId || r.row.createdBy === actorId;
      if (!allowed) return res.status(403).json({ error: "Forbidden" });
      await db.delete(documents).where(eq(documents.id, did));
      res.json({ success: true });
    } catch (err: any) {
      console.error("Delete project document error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // ─────── Project invoices (real link via shared contact) ──────
  app.get("/api/projects/:id/invoices", async (req, res) => {
    try {
      const r = await loadScopedProject(req, req.params.id);
      if (!r.ok) return res.status(r.status).json({ error: r.error });
      // Project ↔ invoice linkage: invoices share the same contactId, OR
      // share the same contractId. Activity scope is implicit (the project
      // and its invoices both carry activityId).
      const linkConds: any[] = [eq(invoices.projectId, r.row.id)];
      if (r.row.contactId) linkConds.push(eq(invoices.contactId, r.row.contactId));
      if (r.row.contractId) linkConds.push(eq(invoices.contractId, r.row.contractId));
      // CRITICAL: also constrain by the project's activityId so invoices
      // belonging to a different tenant/activity don't leak through a
      // shared contact id. (Invoices are activity-scoped in the schema.)
      const linkClause = linkConds.length === 1 ? linkConds[0] : or(...linkConds);
      const whereClause = r.row.activityId
        ? and(eq(invoices.activityId, r.row.activityId), linkClause)
        : linkClause;
      const rows = await db.select().from(invoices)
        .where(whereClause)
        .orderBy(desc(invoices.issueDate));
      res.json(rows);
    } catch (err: any) {
      console.error("List project invoices error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // POST /api/projects/:id/invoices — create a draft invoice linked to
  // the project (uses project.contactId/contractId/activityId/companyId).
  app.post("/api/projects/:id/invoices", async (req, res) => {
    try {
      const r = await loadScopedProject(req, req.params.id);
      if (!r.ok) return res.status(r.status).json({ error: r.error });
      const allowed = r.scope.isPrivileged
        || r.row.managerId === r.scope.actor.id
        || r.row.createdBy === r.scope.actor.id;
      if (!allowed) return res.status(403).json({ error: "Forbidden" });
      const body = req.body || {};
      const total = Number(body.total ?? body.amount ?? 0);
      if (!Number.isFinite(total) || total < 0) {
        return res.status(400).json({ error: "Invalid amount" });
      }
      // Auto invoice number: INV-YYYYMMDD-<seq for today>
      const today = new Date();
      const ymd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
      const seq = Date.now().toString().slice(-5);
      const invoiceNumber = body.invoiceNumber || `INV-${ymd}-${seq}`;
      const subtotal = body.subtotal != null ? String(body.subtotal) : String(total);
      const vatAmount = body.vatAmount != null ? String(body.vatAmount) : "0";
      const [row] = await db.insert(invoices).values({
        invoiceNumber,
        type: body.type || "sales",
        contactId: r.row.contactId ?? null,
        contractId: r.row.contractId ?? null,
        clientName: body.clientName || r.row.clientName || null,
        issueDate: body.issueDate || today.toISOString().slice(0, 10),
        dueDate: body.dueDate || null,
        subtotal,
        vatAmount,
        total: String(total),
        paidAmount: body.paidAmount != null ? String(body.paidAmount) : "0",
        currency: body.currency || "SAR",
        status: body.status || "draft",
        notes: body.notes || null,
        createdBy: r.scope.actor.id,
        activityId: r.row.activityId,
        companyId: r.row.companyId ?? null,
        projectId: r.row.id,
      }).returning();
      res.status(201).json(row);
    } catch (err: any) {
      console.error("Create project invoice error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // ─────── Notifications (basic) ────────────────────────────────
  app.get("/api/notifications", async (req, res) => {
    try {
      const scope = await resolveActivityScope(req);
      if (!scope.ok) return res.status(scope.status).json({ error: scope.error });
      // Best-effort: synthesize "due soon" notifications on demand for any
      // stage assigned to this user that is due within the next 3 days
      // (and not yet completed). We dedupe by (userId, module=projects,
      // entityId, type=due_soon) so the same stage isn't spammed.
      try {
        const now = new Date();
        const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        const dueRows = await db.select().from(projectMilestones)
          .where(eq(projectMilestones.assignedTo, scope.actor.id));
        for (const s of dueRows) {
          if (s.status === "completed" || s.status === "cancelled") continue;
          const due = s.expectedEnd || s.dueDate;
          if (!due) continue;
          const dueDate = new Date(due as any);
          if (dueDate > threeDays || dueDate < new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)) continue;
          const existing = await db.select().from(notifications)
            .where(and(
              eq(notifications.userId, scope.actor.id),
              eq(notifications.module, "projects"),
              eq(notifications.entityId, String(s.id)),
              eq(notifications.type, "due_soon"),
            ));
          if (existing.length) continue;
          const overdue = dueDate < now;
          await db.insert(notifications).values({
            userId: scope.actor.id,
            titleAr: overdue ? "مرحلة متأخرة" : "مرحلة قاربت على الاستحقاق",
            titleEn: overdue ? "Stage overdue" : "Stage due soon",
            message: `${s.titleAr || s.titleEn} — ${dueDate.toLocaleDateString()}`,
            type: "due_soon",
            module: "projects",
            entityId: String(s.id),
          });
        }
      } catch (e) { console.error("notify due-soon scan:", e); }

      const rows = await db.select().from(notifications)
        .where(eq(notifications.userId, scope.actor.id))
        .orderBy(desc(notifications.createdAt))
        .limit(50);
      res.json(rows);
    } catch (err: any) {
      console.error("List notifications error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.patch("/api/notifications/:id/read", async (req, res) => {
    try {
      const scope = await resolveActivityScope(req);
      if (!scope.ok) return res.status(scope.status).json({ error: scope.error });
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
      const [n] = await db.select().from(notifications).where(eq(notifications.id, id));
      if (!n || n.userId !== scope.actor.id) return res.status(404).json({ error: "Not found" });
      await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
      res.json({ success: true });
    } catch (err: any) {
      console.error("Mark notification read error:", err);
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

  // ═══════════════════════════════════════════════════════════════════════
  // CUSTOMER PORTAL — login by national_id, see ONLY own projects/docs.
  // Uses HMAC-signed token (Authorization: Bearer ...). Separate session
  // from staff (x-user-id) so portal users cannot reach internal /api/*.
  // ═══════════════════════════════════════════════════════════════════════

  async function requirePortalContact(req: any, res: any) {
    const token = readPortalToken(req);
    const decoded = token ? verifyPortalToken(token) : null;
    if (!decoded) { res.status(401).json({ error: "Portal session required" }); return null; }
    const [contact] = await db.select().from(contacts).where(eq(contacts.id, decoded.contactId));
    if (!contact) {
      res.status(401).json({ error: "Portal access disabled" });
      return null;
    }
    // Real customer sessions require portalEnabled=true. Admin/manager preview
    // sessions (token carries `imp` claim) bypass that check so staff can
    // inspect what a customer would see even before activation.
    if (!contact.portalEnabled && !decoded.impersonator) {
      res.status(401).json({ error: "Portal access disabled" });
      return null;
    }
    return contact;
  }

  function sanitizeContact(c: any) {
    return {
      id: c.id,
      nameAr: c.nameAr, nameEn: c.nameEn,
      email: c.email, phone: c.phone, mobile: c.mobile,
      organization: c.organization,
      city: c.city, address: c.address,
      activityId: c.activityId,
    };
  }

  function sanitizeAssignee(u: any | null) {
    if (!u) return null;
    const name = (u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim()) || "—";
    return { name }; // Name only — no internal ids/emails leak to portal users.
  }

  app.post("/api/portal/login", async (req, res) => {
    try {
      const { nationalId, password } = req.body || {};
      if (!nationalId || !password) return res.status(400).json({ error: "nationalId and password are required" });
      const rows = await db.select().from(contacts).where(eq(contacts.nationalId, String(nationalId).trim()));
      const candidates = rows.filter((c) => c.portalEnabled && c.portalPasswordHash);
      const matches: any[] = [];
      for (const c of candidates) {
        if (await verifyPwd(String(password), c.portalPasswordHash as string)) matches.push(c);
      }
      if (matches.length === 0) {
        console.warn(`[portal] failed login nationalId=${nationalId}`);
        return res.status(401).json({ error: "Invalid credentials" });
      }
      if (matches.length > 1) {
        // Ambiguous: same nationalId+password matches multiple tenants. Refuse rather
        // than risk picking the wrong contact.
        console.warn(`[portal] ambiguous login nationalId=${nationalId} matches=${matches.length}`);
        return res.status(409).json({ error: "Ambiguous account — contact your administrator" });
      }
      const matched = matches[0];
      await db.update(contacts).set({ portalLastLogin: new Date() }).where(eq(contacts.id, matched.id));
      const token = signPortalToken(matched.id);
      res.json({ token, contact: sanitizeContact(matched) });
    } catch (err: any) {
      console.error("Portal login error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/portal/me", async (req, res) => {
    const me = await requirePortalContact(req, res);
    if (!me) return;
    res.json({ contact: sanitizeContact(me) });
  });

  app.post("/api/portal/logout", async (_req, res) => {
    // Stateless tokens: client just discards it.
    res.json({ success: true });
  });

  app.get("/api/portal/projects", async (req, res) => {
    const me = await requirePortalContact(req, res);
    if (!me) return;
    try {
      const rows = await db.select().from(projects).where(eq(projects.contactId, me.id));
      res.json(rows.map((p) => ({
        id: p.id, projectCode: p.projectCode,
        nameAr: p.nameAr, nameEn: p.nameEn,
        status: p.status, priority: p.priority,
        startDate: p.startDate, endDate: p.endDate,
        progress: p.progress, city: p.city, location: p.location,
        description: p.description,
      })));
    } catch (err: any) {
      console.error("Portal projects error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Helper: confirm a project belongs to the logged-in contact.
  async function ensureOwnedProject(req: any, res: any, contactId: number): Promise<any | null> {
    const pid = parseInt(req.params.id);
    if (isNaN(pid)) { res.status(400).json({ error: "Invalid id" }); return null; }
    const [proj] = await db.select().from(projects).where(eq(projects.id, pid));
    if (!proj || proj.contactId !== contactId) {
      console.warn(`[portal] forbidden project access contact=${contactId} pid=${pid}`);
      res.status(404).json({ error: "Not found" });
      return null;
    }
    return proj;
  }

  app.get("/api/portal/projects/:id", async (req, res) => {
    const me = await requirePortalContact(req, res);
    if (!me) return;
    const proj = await ensureOwnedProject(req, res, me.id);
    if (!proj) return;
    res.json({
      id: proj.id, projectCode: proj.projectCode,
      nameAr: proj.nameAr, nameEn: proj.nameEn,
      description: proj.description,
      status: proj.status, priority: proj.priority,
      startDate: proj.startDate, endDate: proj.endDate,
      progress: proj.progress, city: proj.city, location: proj.location,
    });
  });

  app.get("/api/portal/projects/:id/stages", async (req, res) => {
    const me = await requirePortalContact(req, res);
    if (!me) return;
    const proj = await ensureOwnedProject(req, res, me.id);
    if (!proj) return;
    try {
      const stages = await db.select().from(projectMilestones).where(eq(projectMilestones.projectId, proj.id));
      const userIds = Array.from(new Set(stages.map((s) => s.assignedTo).filter(Boolean) as string[]));
      const assignees = userIds.length
        ? await db.select().from(users).where(inArray(users.id, userIds))
        : [];
      const userMap = new Map(assignees.map((u) => [u.id, u]));
      res.json(stages.map((s) => ({
        id: s.id,
        titleAr: s.titleAr, titleEn: s.titleEn,
        status: s.status, progress: s.progress,
        expectedStart: s.expectedStart, expectedEnd: s.expectedEnd,
        actualStart: s.actualStart, actualEnd: s.actualEnd,
        sortOrder: s.sortOrder,
        assignee: sanitizeAssignee(s.assignedTo ? userMap.get(s.assignedTo) : null),
      })));
    } catch (err: any) {
      console.error("Portal stages error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/portal/projects/:id/documents", async (req, res) => {
    const me = await requirePortalContact(req, res);
    if (!me) return;
    const proj = await ensureOwnedProject(req, res, me.id);
    if (!proj) return;
    try {
      // Only show documents flagged for client visibility.
      const docs = await db.select().from(documents).where(eq(documents.projectId, proj.id));
      const visible = docs.filter((d) => d.accessLevel === "client" || d.accessLevel === "public");
      res.json(visible.map((d) => ({
        id: d.id, titleAr: d.titleAr, titleEn: d.titleEn,
        type: d.type, fileUrl: d.fileUrl, mimeType: d.mimeType,
        fileSize: d.fileSize, version: d.version,
        createdAt: d.createdAt,
      })));
    } catch (err: any) {
      console.error("Portal docs error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/portal/projects/:id/invoices", async (req, res) => {
    const me = await requirePortalContact(req, res);
    if (!me) return;
    const proj = await ensureOwnedProject(req, res, me.id);
    if (!proj) return;
    try {
      const inv = await db.select().from(invoices).where(eq(invoices.projectId, proj.id));
      res.json(inv.map((i) => ({
        id: i.id, invoiceNumber: i.invoiceNumber,
        issueDate: i.issueDate, dueDate: i.dueDate,
        total: i.total, paidAmount: i.paidAmount,
        currency: i.currency, status: i.status,
      })));
    } catch (err: any) {
      console.error("Portal invoices error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/portal/requests", async (req, res) => {
    const me = await requirePortalContact(req, res);
    if (!me) return;
    try {
      const { projectId, subject, message } = req.body || {};
      if (!subject || !message) return res.status(400).json({ error: "subject and message are required" });
      let pid: number | null = null;
      if (projectId !== undefined && projectId !== null && projectId !== "") {
        const n = Number(projectId);
        if (!Number.isFinite(n)) return res.status(400).json({ error: "Invalid projectId" });
        const [proj] = await db.select().from(projects).where(eq(projects.id, n));
        if (!proj || proj.contactId !== me.id) {
          return res.status(403).json({ error: "Project not in your scope" });
        }
        pid = n;
      }
      const [row] = await db.insert(portalRequests).values({
        contactId: me.id,
        projectId: pid,
        subject: String(subject).slice(0, 200),
        message: String(message).slice(0, 4000),
      }).returning();
      // Notify the project manager (or admins) — best-effort.
      try {
        if (pid) {
          const [proj] = await db.select().from(projects).where(eq(projects.id, pid));
          if (proj?.managerId) {
            await db.insert(notifications).values({
              companyId: proj.companyId ?? null,
              userId: proj.managerId,
              type: "portal_request",
              titleAr: "طلب جديد من العميل",
              titleEn: "New customer request",
              message: String(subject).slice(0, 200),
              module: "portal",
              entityId: String(row.id),
            });
          }
        }
      } catch (e) { /* ignore notify failures */ }
      res.json({ id: row.id, success: true });
    } catch (err: any) {
      console.error("Portal request error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/portal/requests", async (req, res) => {
    const me = await requirePortalContact(req, res);
    if (!me) return;
    try {
      const rows = await db.select().from(portalRequests).where(eq(portalRequests.contactId, me.id)).orderBy(desc(portalRequests.createdAt));
      res.json(rows);
    } catch (err: any) {
      console.error("Portal list requests error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // ─── Admin endpoints to enable/disable/reset a contact's portal ──────────
  async function requirePrivileged(req: any, res: any) {
    const actor = await identifyActor(req);
    if (!actor) { res.status(401).json({ error: "Unauthorized" }); return null; }
    const isPriv = actor.roles.has("admin") || actor.roles.has("manager");
    if (!isPriv) { res.status(403).json({ error: "Admin only" }); return null; }
    return actor;
  }

  app.post("/api/customers/:id/portal/enable", async (req, res) => {
    try {
      const actor = await requirePrivileged(req, res);
      if (!actor) return;
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
      const { nationalId, password } = req.body || {};
      const [c] = await db.select().from(contacts).where(eq(contacts.id, id));
      if (!c) return res.status(404).json({ error: "Not found" });
      const nid = (nationalId ?? c.nationalId ?? "").toString().trim();
      if (!nid) return res.status(400).json({ error: "nationalId is required" });
      if (!password || String(password).length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
      // Uniqueness within the same activity.
      const conflict = await db.select().from(contacts).where(eq(contacts.nationalId, nid));
      const dup = conflict.find((x) => x.id !== id && x.activityId === c.activityId);
      if (dup) return res.status(409).json({ error: "National ID already used in this activity" });
      const hash = await hashPassword(String(password));
      await db.update(contacts).set({
        nationalId: nid,
        portalEnabled: true,
        portalPasswordHash: hash,
        updatedAt: new Date(),
      }).where(eq(contacts.id, id));
      res.json({ success: true });
    } catch (err: any) {
      console.error("Portal enable error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/customers/:id/portal/reset", async (req, res) => {
    try {
      const actor = await requirePrivileged(req, res);
      if (!actor) return;
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
      const { password } = req.body || {};
      if (!password || String(password).length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
      const [c] = await db.select().from(contacts).where(eq(contacts.id, id));
      if (!c) return res.status(404).json({ error: "Not found" });
      const hash = await hashPassword(String(password));
      await db.update(contacts).set({ portalPasswordHash: hash, updatedAt: new Date() }).where(eq(contacts.id, id));
      res.json({ success: true });
    } catch (err: any) {
      console.error("Portal reset error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/customers/:id/portal/disable", async (req, res) => {
    try {
      const actor = await requirePrivileged(req, res);
      if (!actor) return;
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
      await db.update(contacts).set({ portalEnabled: false, updatedAt: new Date() }).where(eq(contacts.id, id));
      res.json({ success: true });
    } catch (err: any) {
      console.error("Portal disable error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Admin-only impersonation: returns a short-lived portal token + contact info
  // so privileged users can preview the customer portal exactly as the customer
  // would see it. The token's `imp` claim records the issuing staff id.
  app.post("/api/customers/:id/portal/impersonate", async (req, res) => {
    try {
      const actor = await requirePrivileged(req, res);
      if (!actor) return;
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
      const [c] = await db.select().from(contacts).where(eq(contacts.id, id));
      if (!c) return res.status(404).json({ error: "Not found" });
      const token = signPortalToken(c.id, { impersonator: actor.id });
      console.warn(`[portal] impersonation issued: staff=${actor.id} contact=${c.id}`);
      res.json({
        token,
        contact: {
          id: c.id,
          name: c.nameAr || c.nameEn || `#${c.id}`,
          nameAr: c.nameAr,
          nameEn: c.nameEn,
          email: c.email,
          phone: c.phone,
          companyId: c.companyId,
          activityId: c.activityId,
          impersonator: true,
        },
      });
    } catch (err: any) {
      console.error("Portal impersonate error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/customers/:id/portal/status", async (req, res) => {
    try {
      const actor = await requirePrivileged(req, res);
      if (!actor) return;
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
      const [c] = await db.select().from(contacts).where(eq(contacts.id, id));
      if (!c) return res.status(404).json({ error: "Not found" });
      res.json({
        portalEnabled: !!c.portalEnabled,
        nationalId: c.nationalId || null,
        hasPassword: !!c.portalPasswordHash,
        lastLogin: c.portalLastLogin || null,
      });
    } catch (err: any) {
      console.error("Portal status error:", err);
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
