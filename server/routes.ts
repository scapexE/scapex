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
import { appData, companies, branches, contacts, deals, businessActivities, activityMembers, users, projects, projectMilestones, documents, invoices, invoiceItems, payments, notifications, portalRequests, employees, departments, vendors, purchaseOrders, purchaseOrderItems, inventoryItems, warehouses, stockMovements, assets, assetCategories, maintenanceRecords, payrollBatches, payrollItems, incidents, inspections, permits, governmentEntities, leaveRequests, safetyTrainings, employeeAdvances, employeeViolations, chartOfAccounts, contractPaymentSchedules, contracts, contractItems, partnerAccounts } from "@shared/schema";
import { hashPassword, verifyPassword as verifyPwd } from "./auth";
import { signPortalToken, verifyPortalToken, readPortalToken } from "./portal";
import { and, desc, inArray, or } from "drizzle-orm";
import { db } from "./db";
import { eq } from "drizzle-orm";

import { seedDefaultActivities as seedActivitiesShared, seedDefaultCompanies as seedCompaniesShared, seedDefaultCatalogs, DEFAULT_ACTIVITY_CATALOG } from "./seed";
import { ACTIVITY_CATALOG, toCatalogId, toActivityId } from "@shared/activityCatalog";

/**
 * Syncs business_activities for a company based on its selected catalog IDs.
 * - Creates missing activities (new selections)
 * - Deletes removed activities (unchecked selections) + their memberships
 * - Auto-assigns admin/manager users to all new activities
 * Called after every company create/update.
 */
async function syncCompanyActivities(
  companyId: number,
  catalogIds: string[],
  companyData: { nameAr: string; nameEn: string; logoUrl?: string | null }
): Promise<void> {
  const existing = await db.select().from(businessActivities)
    .where(eq(businessActivities.companyId, companyId));

  const existingByCatalogId = new Map(existing.map(a => [toCatalogId(a.id), a.id]));

  // Delete activities no longer in the selection
  for (const [catId, actId] of existingByCatalogId) {
    if (!catalogIds.includes(catId)) {
      await db.delete(activityMembers).where(eq(activityMembers.activityId, actId));
      await db.delete(businessActivities).where(eq(businessActivities.id, actId));
    }
  }

  // Load custom catalog items from app_data and merge with built-in
  const [customRow] = await db.select().from(appData)
    .where(eq(appData.key, "scapex_activity_catalog_custom"));
  const customCatalog: Array<{ id: string; nameAr: string; nameEn: string; color: string; icon: string; modules: string[] }> =
    Array.isArray(customRow?.value) ? (customRow.value as any[]) : [];
  const fullCatalog = [...ACTIVITY_CATALOG, ...customCatalog];

  // Create new activities for newly selected catalog types
  const allUsersRows = await db.select().from(users);
  for (const catId of catalogIds) {
    if (existingByCatalogId.has(catId)) continue;
    const cat = fullCatalog.find(c => c.id === catId);
    if (!cat) continue;
    const actId = toActivityId(catId, companyId);
    await db.insert(businessActivities).values({
      id: actId,
      companyId,
      nameAr: cat.nameAr,
      nameEn: cat.nameEn,
      color: cat.color,
      icon: cat.icon,
      modules: cat.modules,
      active: true,
      companyNameAr: companyData.nameAr,
      companyNameEn: companyData.nameEn,
      companyLogoUrl: companyData.logoUrl ?? null,
    }).onConflictDoNothing();
    // Auto-assign admin and manager users
    for (const u of allUsersRows) {
      const roles = new Set<string>([u.role || "", ...((u.roles as string[]) || [])]);
      if (roles.has("admin") || roles.has("manager")) {
        await db.insert(activityMembers)
          .values({ activityId: actId, userId: u.id })
          .onConflictDoNothing();
      }
    }
  }
}

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

  await db.execute(`CREATE TABLE IF NOT EXISTS partner_accounts (
    id SERIAL PRIMARY KEY,
    company_id INTEGER DEFAULT 1,
    contract_number TEXT NOT NULL,
    client_name TEXT NOT NULL,
    contract_type TEXT NOT NULL DEFAULT 'عقد صيانة',
    contract_value NUMERIC(14,2) NOT NULL DEFAULT 0,
    company_share_pct NUMERIC(6,2) NOT NULL DEFAULT 30,
    received_amount NUMERIC(14,2) DEFAULT 0,
    received_date DATE,
    payment_method TEXT DEFAULT 'cash',
    notes TEXT,
    status TEXT DEFAULT 'pending',
    contract_id INTEGER,
    activity_id TEXT,
    created_by TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`);
  // Ensure contract_id column exists in older installations
  await db.execute(`ALTER TABLE partner_accounts ADD COLUMN IF NOT EXISTS contract_id INTEGER`);
  // Ensure confidentiality columns exist in contracts
  await db.execute(`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS is_confidential BOOLEAN DEFAULT false`);
  await db.execute(`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS viewer_ids JSONB DEFAULT '[]'::jsonb`);
  await db.execute(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS contact_id INTEGER`);
  await db.execute(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS deal_id INTEGER`);
  await db.execute(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_content TEXT`);
  await db.execute(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS original_name TEXT`);
  // Unified company identifier (CR number) for cross-activity deduplication
  await db.execute(`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS cr_number VARCHAR(20)`);
  await db.execute(`CREATE UNIQUE INDEX IF NOT EXISTS contacts_company_cr_uniq ON contacts(company_id, cr_number) WHERE cr_number IS NOT NULL AND company_id IS NOT NULL`);
  await db.execute(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS iqama_expiry DATE`);
  await db.execute(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS visa_expiry DATE`);
  await db.execute(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS passport_number VARCHAR(20)`);
  await db.execute(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS passport_expiry DATE`);
  await db.execute(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS medical_insurance_expiry DATE`);

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

  // ═══ Custom Activity Catalog CRUD (admin only) ═══════════════════════════
  app.get("/api/activity-catalog", async (_req, res) => {
    try {
      const [row] = await db.select().from(appData)
        .where(eq(appData.key, "scapex_activity_catalog_custom"));
      const custom = Array.isArray(row?.value) ? (row.value as any[]) : [];
      res.json({ builtin: ACTIVITY_CATALOG, custom });
    } catch { res.status(500).json({ error: "Server error" }); }
  });

  app.post("/api/activity-catalog", async (req, res) => {
    try {
      if (!(await isAdminOnly(req))) return res.status(403).json({ error: "Forbidden" });
      const { nameAr, nameEn, color, icon, modules } = req.body;
      if (!nameAr || !nameEn) return res.status(400).json({ error: "nameAr and nameEn required" });
      const id = `act_custom_${Date.now()}`;
      const newItem = {
        id, nameAr, nameEn,
        color: color || "blue",
        icon: icon || "HardHat",
        modules: Array.isArray(modules) && modules.length ? modules : [
          "dashboard","crm","sales","accounting","purchases","projects",
          "engineering","approvals","government","smart_proposal","equipment",
          "inventory","hr","payroll","attendance","hse","dms","mobile_app","bi",
        ],
      };
      const [row] = await db.select().from(appData)
        .where(eq(appData.key, "scapex_activity_catalog_custom"));
      const items: any[] = Array.isArray(row?.value) ? [...(row.value as any[])] : [];
      items.push(newItem);
      await db.insert(appData)
        .values({ key: "scapex_activity_catalog_custom", value: items })
        .onConflictDoUpdate({ target: appData.key, set: { value: items, updatedAt: new Date() } });
      res.json(newItem);
    } catch (err) {
      console.error("Add catalog item error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.delete("/api/activity-catalog/:id", async (req, res) => {
    try {
      if (!(await isAdminOnly(req))) return res.status(403).json({ error: "Forbidden" });
      const id = req.params.id;
      const [row] = await db.select().from(appData)
        .where(eq(appData.key, "scapex_activity_catalog_custom"));
      if (!row) return res.json({ success: true });
      const items = (row.value as any[]).filter((x: any) => x.id !== id);
      await db.update(appData)
        .set({ value: items, updatedAt: new Date() })
        .where(eq(appData.key, "scapex_activity_catalog_custom"));
      res.json({ success: true });
    } catch { res.status(500).json({ error: "Server error" }); }
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
      const catalogIds: string[] = Array.isArray(data.settings?.activityIds) ? data.settings.activityIds : [];
      const [newCompany] = await db.insert(companies).values({
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
      // Sync business_activities based on selected catalog types
      await syncCompanyActivities(newCompany.id, catalogIds, newCompany);
      res.json(newCompany);
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
      const [updated] = await db.update(companies).set({
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
      // Sync activities: add new, remove unchecked
      const catalogIds: string[] = Array.isArray(mergedSettings.activityIds) ? mergedSettings.activityIds : [];
      await syncCompanyActivities(id, catalogIds, updated);
      res.json(updated);
    } catch (err: any) {
      console.error("Update company error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.delete("/api/companies/:id", async (req, res) => {
    try {
      if (!(await isAdminOnly(req))) return res.status(403).json({ error: "Forbidden" });
      const id = parseInt(req.params.id);
      // Delete all activities and memberships for this company
      const acts = await db.select({ id: businessActivities.id }).from(businessActivities)
        .where(eq(businessActivities.companyId, id));
      for (const a of acts) {
        await db.delete(activityMembers).where(eq(activityMembers.activityId, a.id));
      }
      await db.delete(businessActivities).where(eq(businessActivities.companyId, id));
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
  async function resolveActivityScope(req: any, opts?: { forWrite?: boolean }): Promise<
    | { ok: true; actor: { id: string; roles: Set<string> }; isPrivileged: boolean; activityId: string | null; allowedIds: string[] | null }
    | { ok: false; status: number; error: string }
  > {
    const actor = await identifyActor(req);
    if (!actor) return { ok: false, status: 401, error: "Unauthorized" };
    const isPrivileged = actor.roles.has("admin") || actor.roles.has("manager");
    const headerActivity = (req.header("x-activity-id") || "").trim() || null;
    const queryActivity = (req.query.activityId as string) || null;
    const requested = headerActivity || queryActivity || null;
    const memberRows = await db.select().from(activityMembers).where(eq(activityMembers.userId, actor.id));
    const allowedIds = isPrivileged ? null : memberRows.map((m) => m.activityId);
    let effectiveActivity: string | null = requested;
    if (!isPrivileged) {
      if (!effectiveActivity) {
        // Friction-removal fallback: if the caller has exactly one assigned
        // activity, use it silently. If they have several, refuse writes
        // (to avoid putting a record in the wrong bucket) but allow reads
        // (the route will scope across all allowedIds — see callers).
        if (!allowedIds || allowedIds.length === 0) {
          return { ok: false, status: 403, error: "No activities assigned to this user" };
        }
        if (allowedIds.length === 1) {
          effectiveActivity = allowedIds[0];
        } else if (opts?.forWrite) {
          return { ok: false, status: 400, error: "activityId is required" };
        }
        // For reads with multiple allowed activities and no explicit pick,
        // leave activityId null — the caller will fall back to allowedIds.
      } else if (!(allowedIds || []).includes(effectiveActivity)) {
        return { ok: false, status: 403, error: "Forbidden: activity not in your scope" };
      }
    }
    return { ok: true, actor, isPrivileged, activityId: effectiveActivity, allowedIds };
  }

  app.get("/api/customers", async (req, res) => {
    try {
      const scope = await resolveActivityScope(req);
      if (!scope.ok) return res.status(scope.status).json({ error: scope.error });
      const assignedTo = (req.query.assignedTo as string) || null;
      const conds: any[] = [eq(contacts.type, "customer")];

      // ── Company-wide scoping (SAP/Odoo Business Partner model) ──────────────
      // Contacts are shared across ALL activities of the same ERP company.
      // Deals remain activity-scoped (see /api/deals). Only the profile is shared.
      //
      // Strategy:
      //  1. Get the companyIds of the actor's allowed activities
      //  2. Show contacts that belong to those companies (contacts.company_id)
      //     OR belong to the actor's activities (contacts.activity_id) for backward-compat
      //     with records created before this migration.
      const activityFilter = scope.activityId
        ? [scope.activityId]
        : scope.allowedIds || [];

      if (!scope.isPrivileged && activityFilter.length === 0) {
        return res.json([]);
      }

      // Get companyIds from the actor's activities
      let companyIds: number[] = [];
      if (scope.isPrivileged) {
        // Privileged users see all companies
      } else if (activityFilter.length > 0) {
        const actRows = await db.select({ companyId: businessActivities.companyId })
          .from(businessActivities)
          .where(inArray(businessActivities.id, activityFilter));
        companyIds = actRows.map(a => a.companyId).filter((c): c is number => c !== null);
      }

      if (!scope.isPrivileged) {
        // Show contacts that match:
        // (a) company_id IN [actor's companies]  — new shared model
        // (b) activity_id IN [actor's activities] — backward compat for old records without company_id
        const companyFilter = companyIds.length > 0
          ? inArray(contacts.companyId, companyIds)
          : null;
        const activityScope = activityFilter.length > 0
          ? inArray(contacts.activityId, activityFilter)
          : null;

        if (companyFilter && activityScope) {
          conds.push(or(companyFilter, activityScope));
        } else if (companyFilter) {
          conds.push(companyFilter);
        } else if (activityScope) {
          conds.push(activityScope);
        }
      }
      // Privileged users: no additional filter (see all contacts)

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
      const scope = await resolveActivityScope(req, { forWrite: true });
      if (!scope.ok) return res.status(scope.status).json({ error: scope.error });
      const d = req.body || {};
      if (!d.nameEn && !d.nameAr) {
        return res.status(400).json({ error: "Name is required" });
      }
      const writeActivityId = scope.isPrivileged
        ? (d.activityId || scope.activityId || null)
        : scope.activityId;
      if (!writeActivityId) {
        return res.status(400).json({ error: "activityId is required to create a customer" });
      }

      // Resolve companyId from the activity (for cross-activity sharing)
      let resolvedCompanyId = d.companyId ? Number(d.companyId) : null;
      if (!resolvedCompanyId && writeActivityId) {
        const [act] = await db.select({ companyId: businessActivities.companyId })
          .from(businessActivities).where(eq(businessActivities.id, writeActivityId));
        resolvedCompanyId = act?.companyId ?? null;
      }

      // Deduplication by CR number (السجل التجاري / الرقم الموحد):
      // If a contact with the same CR number already exists for this company,
      // return the existing record instead of creating a duplicate.
      const crNumber = d.crNumber?.trim() || null;
      if (crNumber && resolvedCompanyId) {
        const [existing] = await db.select().from(contacts)
          .where(and(
            eq(contacts.type, "customer"),
            eq((contacts as any).crNumber, crNumber),
            eq(contacts.companyId, resolvedCompanyId),
          )).limit(1);
        if (existing) {
          return res.json({ ...existing, _linked: true });
        }
      }

      const result = await db.insert(contacts).values({
        companyId: resolvedCompanyId,
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
        crNumber,
      } as any).returning();
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
      // Ownership = currently assigned employee (after a transfer the previous
      // holder loses the right to edit — they are no longer the assignee).
      const isOwner = existing.assignedTo === actorId;

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
      // serviceEmployeeIds: privileged callers may update the service team list
      let nextServiceIds = Array.isArray((existing as any).serviceEmployeeIds)
        ? (existing as any).serviceEmployeeIds as string[]
        : [];
      if ("serviceEmployeeIds" in d && Array.isArray(d.serviceEmployeeIds)) {
        if (!isPrivileged) {
          return res.status(403).json({ error: "Forbidden: only admin/manager may update service team" });
        }
        nextServiceIds = d.serviceEmployeeIds as string[];
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
        serviceEmployeeIds: nextServiceIds,
        crNumber: d.crNumber !== undefined ? (d.crNumber?.trim() || null) : (existing as any).crNumber,
        updatedAt: new Date(),
      } as any).where(eq(contacts.id, id)).returning();
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
      // Only privileged or currently-assigned employee may delete
      const isOwner = existing.assignedTo === scope.actor.id;
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
      const scope = await resolveActivityScope(req, { forWrite: true });
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

  // ─────── Projects Analytics Dashboard (must be before /:id) ────────────────
  app.get("/api/projects/analytics", async (req, res) => {
    try {
      const scope = await resolveActivityScope(req);
      if (!scope.ok) return res.status(scope.status).json({ error: scope.error });
      const conds: any[] = [];
      if (scope.activityId) conds.push(eq(projects.activityId, scope.activityId));
      else if (!scope.isPrivileged && scope.allowedIds?.length)
        conds.push(inArray(projects.activityId, scope.allowedIds));
      const allProjects = await db.select().from(projects)
        .where(conds.length ? (conds.length > 1 ? and(...conds) : conds[0]) : undefined);
      const allTasks = allProjects.length
        ? await db.select().from(projectTasks)
            .where(inArray(projectTasks.projectId, allProjects.map(p => p.id)))
        : [];
      const kpis = {
        total: allProjects.length,
        active: allProjects.filter(p => p.status === "active").length,
        planning: allProjects.filter(p => p.status === "planning").length,
        completed: allProjects.filter(p => p.status === "completed").length,
        delayed: allProjects.filter(p => p.status === "delayed").length,
        onHold: allProjects.filter(p => p.status === "on_hold").length,
        totalBudget: allProjects.reduce((s, p) => s + parseFloat(p.budget ?? "0"), 0),
        totalSpent: allProjects.reduce((s, p) => s + parseFloat(p.spent ?? "0"), 0),
        avgProgress: allProjects.length ? Math.round(allProjects.reduce((s, p) => s + (p.progress ?? 0), 0) / allProjects.length) : 0,
        totalTasks: allTasks.length,
        doneTasks: allTasks.filter(t => t.status === "done").length,
        overdueTasks: allTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "done").length,
      };
      const byStatus = [
        { status: "active", count: kpis.active, label: "نشط / Active" },
        { status: "planning", count: kpis.planning, label: "تخطيط / Planning" },
        { status: "completed", count: kpis.completed, label: "مكتمل / Completed" },
        { status: "delayed", count: kpis.delayed, label: "متأخر / Delayed" },
        { status: "on_hold", count: kpis.onHold, label: "متوقف / On Hold" },
      ];
      const topByBudget = [...allProjects]
        .sort((a, b) => parseFloat(b.budget ?? "0") - parseFloat(a.budget ?? "0"))
        .slice(0, 5)
        .map(p => ({
          id: p.id, name: p.nameAr || p.nameEn,
          budget: parseFloat(p.budget ?? "0"), spent: parseFloat(p.spent ?? "0"),
          progress: p.progress ?? 0, status: p.status,
        }));
      res.json({ kpis, byStatus, topByBudget });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
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
      const scope = await resolveActivityScope(req, { forWrite: true });
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

  app.patch("/api/notifications/read-all", async (req, res) => {
    try {
      const scope = await resolveActivityScope(req);
      if (!scope.ok) return res.status(scope.status).json({ error: scope.error });
      await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, scope.actor.id));
      res.json({ success: true });
    } catch (err: any) {
      console.error("Mark all notifications read error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.delete("/api/notifications", async (req, res) => {
    try {
      const scope = await resolveActivityScope(req);
      if (!scope.ok) return res.status(scope.status).json({ error: scope.error });
      await db.delete(notifications).where(eq(notifications.userId, scope.actor.id));
      res.json({ success: true });
    } catch (err: any) {
      console.error("Delete all notifications error:", err);
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
      // For each project pull the first in_progress stage (or first pending if none in progress)
      // to show as the "current stage" on the portal project card without a full stages fetch.
      const projectIds = rows.map(p => p.id);
      let stageMap: Record<number, string | null> = {};
      if (projectIds.length > 0) {
        const allStages = await db.select({
          projectId: projectMilestones.projectId,
          titleAr: projectMilestones.titleAr,
          titleEn: projectMilestones.titleEn,
          status: projectMilestones.status,
          sortOrder: projectMilestones.sortOrder,
        }).from(projectMilestones).where(inArray(projectMilestones.projectId, projectIds));
        // Group by project, pick the best "current" stage
        for (const pid of projectIds) {
          const stgs = allStages.filter(s => s.projectId === pid).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
          const active = stgs.find(s => s.status === "in_progress") || stgs.find(s => s.status === "pending");
          stageMap[pid] = active ? (active.titleAr || active.titleEn || null) : null;
        }
      }
      res.json(rows.map((p) => ({
        id: p.id, projectCode: p.projectCode,
        nameAr: p.nameAr, nameEn: p.nameEn,
        status: p.status, priority: p.priority,
        startDate: p.startDate, endDate: p.endDate,
        progress: p.progress, city: p.city, location: p.location,
        description: p.description,
        currentStageAr: stageMap[p.id] ?? null,
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

  // ═══════════════════════════════════════════════════════════════════════════
  // HR — EMPLOYEES
  // ═══════════════════════════════════════════════════════════════════════════
  app.get("/api/employees", async (req, res) => {
    try {
      const activityId = req.query.activityId as string | undefined;
      const companyId  = req.query.companyId  ? parseInt(req.query.companyId as string) : null;
      let rows = await db.select().from(employees).orderBy(employees.createdAt);
      if (companyId)   rows = rows.filter(e => e.companyId === companyId);
      if (activityId)  rows = rows.filter(e => Array.isArray(e.activityIds) && (e.activityIds as string[]).includes(activityId));
      res.json(rows);
    }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/employees", async (req, res) => {
    try {
      const b = req.body;
      const [row] = await db.insert(employees).values({
        nameAr: b.nameAr, nameEn: b.nameEn, employeeNumber: b.employeeNumber,
        nationalId: b.nationalId, nationality: b.nationality, phone: b.phone,
        email: b.email, joinDate: b.joinDate, departmentName: b.departmentName,
        jobTitle: b.jobTitle, jobTitleAr: b.jobTitleAr, contractType: b.contractType,
        basicSalary: b.basicSalary, housingAllowance: b.housingAllowance,
        transportAllowance: b.transportAllowance, status: b.status || "active",
        companyId: b.companyId ? parseInt(b.companyId) : null,
        activityIds: Array.isArray(b.activityIds) ? b.activityIds : [],
        iqamaExpiry: b.iqamaExpiry || null,
        visaExpiry: b.visaExpiry || null,
        passportNumber: b.passportNumber || null,
        passportExpiry: b.passportExpiry || null,
        medicalInsuranceExpiry: b.medicalInsuranceExpiry || null,
      }).returning();
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/employees/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const b = req.body;
      const [row] = await db.update(employees).set({
        nameAr: b.nameAr, nameEn: b.nameEn, employeeNumber: b.employeeNumber,
        nationalId: b.nationalId, nationality: b.nationality, phone: b.phone,
        email: b.email, joinDate: b.joinDate, departmentName: b.departmentName,
        jobTitle: b.jobTitle, jobTitleAr: b.jobTitleAr, contractType: b.contractType,
        basicSalary: b.basicSalary, housingAllowance: b.housingAllowance,
        transportAllowance: b.transportAllowance, status: b.status,
        companyId: b.companyId ? parseInt(b.companyId) : null,
        activityIds: Array.isArray(b.activityIds) ? b.activityIds : [],
        iqamaExpiry: b.iqamaExpiry || null,
        visaExpiry: b.visaExpiry || null,
        passportNumber: b.passportNumber || null,
        passportExpiry: b.passportExpiry || null,
        medicalInsuranceExpiry: b.medicalInsuranceExpiry || null,
        updatedAt: new Date(),
      }).where(eq(employees.id, id)).returning();
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.delete("/api/employees/:id", async (req, res) => {
    try { await db.delete(employees).where(eq(employees.id, parseInt(req.params.id))); res.json({ success: true }); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // HR — DEPARTMENTS
  // ═══════════════════════════════════════════════════════════════════════════
  app.get("/api/departments", async (_req, res) => {
    try { res.json(await db.select().from(departments)); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/departments", async (req, res) => {
    try {
      const [row] = await db.insert(departments).values({ nameAr: req.body.nameAr, nameEn: req.body.nameEn, isActive: true }).returning();
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/departments/:id", async (req, res) => {
    try {
      const [row] = await db.update(departments).set({ nameAr: req.body.nameAr, nameEn: req.body.nameEn }).where(eq(departments.id, parseInt(req.params.id))).returning();
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.delete("/api/departments/:id", async (req, res) => {
    try { await db.delete(departments).where(eq(departments.id, parseInt(req.params.id))); res.json({ success: true }); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INVENTORY
  // ═══════════════════════════════════════════════════════════════════════════
  app.get("/api/warehouses", async (_req, res) => {
    try { res.json(await db.select().from(warehouses)); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/warehouses", async (req, res) => {
    try {
      const [row] = await db.insert(warehouses).values({ nameAr: req.body.nameAr, nameEn: req.body.nameEn, location: req.body.location, isActive: true }).returning();
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.get("/api/inventory-items", async (_req, res) => {
    try { res.json(await db.select().from(inventoryItems).orderBy(inventoryItems.createdAt)); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/inventory-items", async (req, res) => {
    try {
      const b = req.body;
      const [row] = await db.insert(inventoryItems).values({
        sku: b.sku || b.code, nameAr: b.nameAr, nameEn: b.nameEn || b.nameAr,
        category: b.category, unit: b.unit,
        currentQty: String(b.currentQty ?? b.onHand ?? 0),
        minQty: String(b.minQty ?? b.minStock ?? 0),
        unitCost: String(b.unitCost ?? 0),
        totalValue: String((b.currentQty ?? b.onHand ?? 0) * (b.unitCost ?? 0)),
        isActive: true,
      }).returning();
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/inventory-items/:id", async (req, res) => {
    try {
      const b = req.body;
      const [row] = await db.update(inventoryItems).set({
        sku: b.sku || b.code, nameAr: b.nameAr, nameEn: b.nameEn || b.nameAr,
        category: b.category, unit: b.unit,
        currentQty: String(b.currentQty ?? b.onHand ?? 0),
        minQty: String(b.minQty ?? b.minStock ?? 0),
        unitCost: String(b.unitCost ?? 0),
        totalValue: String((b.currentQty ?? b.onHand ?? 0) * (b.unitCost ?? 0)),
        updatedAt: new Date(),
      }).where(eq(inventoryItems.id, parseInt(req.params.id))).returning();
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.delete("/api/inventory-items/:id", async (req, res) => {
    try { await db.delete(inventoryItems).where(eq(inventoryItems.id, parseInt(req.params.id))); res.json({ success: true }); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/stock-movements", async (req, res) => {
    try {
      const b = req.body;
      const [row] = await db.insert(stockMovements).values({ itemId: b.itemId, type: b.type, qty: String(b.qty), reference: b.reference, notes: b.notes }).returning();
      const item = await db.select().from(inventoryItems).where(eq(inventoryItems.id, b.itemId));
      if (item[0]) {
        const cur = parseFloat(item[0].currentQty as string) || 0;
        const delta = b.type === "in" ? parseFloat(b.qty) : -parseFloat(b.qty);
        const newQty = Math.max(0, cur + delta);
        await db.update(inventoryItems).set({ currentQty: String(newQty), totalValue: String(newQty * (parseFloat(item[0].unitCost as string) || 0)), updatedAt: new Date() }).where(eq(inventoryItems.id, b.itemId));
      }
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.get("/api/stock-movements", async (_req, res) => {
    try { res.json(await db.select().from(stockMovements).orderBy(desc(stockMovements.createdAt)).limit(200)); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // VENDORS & PURCHASE ORDERS
  // ═══════════════════════════════════════════════════════════════════════════
  app.get("/api/vendors", async (_req, res) => {
    try { res.json(await db.select().from(vendors).orderBy(vendors.createdAt)); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/vendors", async (req, res) => {
    try {
      const b = req.body;
      const [row] = await db.insert(vendors).values({ nameAr: b.nameAr, nameEn: b.nameEn, contactPerson: b.contactPerson, email: b.email, phone: b.phone, vatNumber: b.vatNumber || b.vatNo, address: b.address, category: b.category, rating: b.rating || 0, isActive: b.status !== "inactive" }).returning();
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/vendors/:id", async (req, res) => {
    try {
      const b = req.body;
      const [row] = await db.update(vendors).set({ nameAr: b.nameAr, nameEn: b.nameEn, contactPerson: b.contactPerson, email: b.email, phone: b.phone, vatNumber: b.vatNumber || b.vatNo, category: b.category, rating: b.rating, isActive: b.status !== "inactive" }).where(eq(vendors.id, parseInt(req.params.id))).returning();
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.delete("/api/vendors/:id", async (req, res) => {
    try { await db.delete(vendors).where(eq(vendors.id, parseInt(req.params.id))); res.json({ success: true }); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.get("/api/purchase-orders", async (_req, res) => {
    try { res.json(await db.select().from(purchaseOrders).orderBy(desc(purchaseOrders.createdAt))); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/purchase-orders", async (req, res) => {
    try {
      const b = req.body;
      const [row] = await db.insert(purchaseOrders).values({ poNumber: b.poNumber, vendorId: b.vendorId ? parseInt(b.vendorId) : null, total: String(b.total || 0), status: b.status || "draft", deliveryDate: b.deliveryDate || b.expectedDate, notes: b.notes }).returning();
      if (b.items?.length) {
        await db.insert(purchaseOrderItems).values(b.items.map((it: any) => ({ poId: row.id, descAr: it.name, descEn: it.name, qty: String(it.qty || 1), unit: it.unit, unitPrice: String(it.unitPrice || 0), total: String((it.qty || 1) * (it.unitPrice || 0)) })));
      }
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/purchase-orders/:id", async (req, res) => {
    try {
      const b = req.body;
      const [row] = await db.update(purchaseOrders).set({ status: b.status, notes: b.notes, deliveryDate: b.deliveryDate || b.expectedDate, total: String(b.total || 0), updatedAt: new Date() }).where(eq(purchaseOrders.id, parseInt(req.params.id))).returning();
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.delete("/api/purchase-orders/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(purchaseOrderItems).where(eq(purchaseOrderItems.poId, id));
      await db.delete(purchaseOrders).where(eq(purchaseOrders.id, id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.get("/api/purchase-orders/:id/items", async (req, res) => {
    try { res.json(await db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.poId, parseInt(req.params.id)))); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ASSETS & EQUIPMENT
  // ═══════════════════════════════════════════════════════════════════════════
  app.get("/api/asset-categories", async (_req, res) => {
    try { res.json(await db.select().from(assetCategories)); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/asset-categories", async (req, res) => {
    try {
      const [row] = await db.insert(assetCategories).values({ nameAr: req.body.nameAr, nameEn: req.body.nameEn, type: req.body.type }).returning();
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  // ─────── Project Tasks ──────────────────────────────────────────────────────
  app.get("/api/projects/:id/tasks", async (req, res) => {
    try {
      const r = await loadScopedProject(req, req.params.id);
      if (!r.ok) return res.status(r.status).json({ error: r.error });
      const rows = await db.select().from(projectTasks)
        .where(eq(projectTasks.projectId, r.row.id))
        .orderBy(projectTasks.sortOrder, projectTasks.id);
      res.json(rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/projects/:id/tasks", async (req, res) => {
    try {
      const r = await loadScopedProject(req, req.params.id);
      if (!r.ok) return res.status(r.status).json({ error: r.error });
      const d = req.body || {};
      if (!d.titleAr && !d.titleEn) return res.status(400).json({ error: "Title required" });
      const [row] = await db.insert(projectTasks).values({
        projectId: r.row.id,
        titleAr: d.titleAr || d.titleEn,
        titleEn: d.titleEn || d.titleAr || null,
        description: d.description || null,
        assignedTo: d.assignedTo || null,
        status: d.status || "todo",
        priority: d.priority || "medium",
        startDate: d.startDate || null,
        dueDate: d.dueDate || null,
        estimatedHours: d.estimatedHours ? String(d.estimatedHours) : null,
        actualHours: d.actualHours ? String(d.actualHours) : null,
        progress: d.progress ?? 0,
        sortOrder: d.sortOrder ?? 0,
        parentId: d.parentId ?? null,
      } as any).returning();
      // Notify assignee
      if (row.assignedTo) {
        await db.insert(notifications).values({
          companyId: r.row.companyId ?? null,
          userId: row.assignedTo,
          titleAr: "تم تعيينك لمهمة جديدة",
          titleEn: "You have been assigned a new task",
          message: `${row.titleAr || row.titleEn} — ${r.row.nameAr || r.row.nameEn}`,
          type: "info", module: "projects", entityId: String(r.row.id),
        }).catch(() => {});
      }
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.patch("/api/tasks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
      const [existing] = await db.select().from(projectTasks).where(eq(projectTasks.id, id));
      if (!existing) return res.status(404).json({ error: "Not found" });
      const d = req.body || {};
      const completedAt = d.status === "done" && existing.status !== "done" ? new Date() : (d.status !== "done" ? null : existing.completedAt);
      const [row] = await db.update(projectTasks).set({
        titleAr: d.titleAr ?? existing.titleAr,
        titleEn: d.titleEn ?? existing.titleEn,
        description: d.description ?? existing.description,
        assignedTo: d.assignedTo !== undefined ? d.assignedTo : existing.assignedTo,
        status: d.status ?? existing.status,
        priority: d.priority ?? existing.priority,
        startDate: d.startDate !== undefined ? d.startDate : existing.startDate,
        dueDate: d.dueDate !== undefined ? d.dueDate : existing.dueDate,
        estimatedHours: d.estimatedHours !== undefined ? (d.estimatedHours ? String(d.estimatedHours) : null) : existing.estimatedHours,
        actualHours: d.actualHours !== undefined ? (d.actualHours ? String(d.actualHours) : null) : existing.actualHours,
        progress: d.progress ?? existing.progress,
        sortOrder: d.sortOrder ?? existing.sortOrder,
        completedAt: completedAt as any,
      } as any).where(eq(projectTasks.id, id)).returning();
      // Auto-update project progress from tasks
      const allTasks = await db.select({ progress: projectTasks.progress })
        .from(projectTasks).where(eq(projectTasks.projectId, existing.projectId));
      if (allTasks.length > 0) {
        const avg = Math.round(allTasks.reduce((s, t) => s + (t.progress ?? 0), 0) / allTasks.length);
        await db.update(projects).set({ progress: avg, updatedAt: new Date() })
          .where(eq(projects.id, existing.projectId));
      }
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(projectTasks).where(eq(projectTasks.id, id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ─────── Assets (Equipment & Fleet) ─────────────────────────────────────────
  app.get("/api/assets", async (_req, res) => {
    try { res.json(await db.select().from(assets).orderBy(assets.createdAt)); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  // Must be before /api/assets/:id to avoid route conflict
  app.get("/api/assets/analytics", async (_req, res) => {
    try {
      const allAssets = await db.select().from(assets).orderBy(assets.createdAt);
      const allMaint = await db.select().from(maintenanceRecords).orderBy(desc(maintenanceRecords.date));
      const now = new Date();
      const in30 = new Date(now); in30.setDate(in30.getDate() + 30);
      const in90 = new Date(now); in90.setDate(in90.getDate() + 90);
      const kpis = {
        total: allAssets.length,
        active: allAssets.filter(a => a.status === "available").length,
        inMaintenance: allAssets.filter(a => a.status === "maintenance").length,
        outOfService: allAssets.filter(a => a.status === "out_of_service").length,
        dueSoon30: allAssets.filter(a => a.nextMaintenanceDate && new Date(a.nextMaintenanceDate) <= in30 && a.status !== "maintenance").length,
        dueSoon90: allAssets.filter(a => a.nextMaintenanceDate && new Date(a.nextMaintenanceDate) <= in90 && a.status !== "maintenance").length,
        totalPurchaseCost: allAssets.reduce((s, a) => s + parseFloat(a.purchaseCost ?? "0"), 0),
        totalMaintenanceCost: allMaint.reduce((s, m) => s + parseFloat(m.cost ?? "0"), 0),
        insuranceExpiring: allAssets.filter(a => a.insuranceExpiry && new Date(a.insuranceExpiry) <= in30).length,
      };
      const months: { label: string; cost: number; count: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleString("default", { month: "short", year: "2-digit" });
        const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
        const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        const mRecs = allMaint.filter(m => m.date && new Date(m.date) >= mStart && new Date(m.date) <= mEnd);
        months.push({ label, cost: mRecs.reduce((s, m) => s + parseFloat(m.cost ?? "0"), 0), count: mRecs.length });
      }
      const depreciationData = allAssets
        .filter(a => a.purchaseCost && a.purchaseDate)
        .map(a => {
          const cost = parseFloat(a.purchaseCost ?? "0");
          const years = (now.getTime() - new Date(a.purchaseDate!).getTime()) / (365.25 * 864e5);
          const rate = Math.min(1, years / 10);
          const currentValue = Math.max(0, cost * (1 - rate));
          return { id: a.id, name: a.nameAr || a.nameEn, purchaseCost: cost, currentValue, depreciation: cost - currentValue, depreciationPct: Math.round(rate * 100) };
        }).sort((a, b) => b.depreciation - a.depreciation).slice(0, 8);
      const byStatus = [
        { status: "available", count: kpis.active, label: "نشط / Active" },
        { status: "maintenance", count: kpis.inMaintenance, label: "صيانة / Maintenance" },
        { status: "out_of_service", count: kpis.outOfService, label: "خارج الخدمة / Out of Service" },
        { status: "rented", count: allAssets.filter(a => a.status === "rented").length, label: "مؤجر / Rented" },
      ];
      res.json({ kpis, months, depreciationData, byStatus });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.get("/api/assets/:id", async (req, res) => {
    try {
      const [row] = await db.select().from(assets).where(eq(assets.id, parseInt(req.params.id)));
      if (!row) return res.status(404).json({ error: "Not found" });
      const maint = await db.select().from(maintenanceRecords)
        .where(eq(maintenanceRecords.assetId, row.id))
        .orderBy(desc(maintenanceRecords.createdAt));
      res.json({ ...row, maintenanceHistory: maint });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/assets", async (req, res) => {
    try {
      const b = req.body;
      const [row] = await db.insert(assets).values({
        assetCode: b.assetCode || b.assetNo, nameAr: b.nameAr, nameEn: b.nameEn || b.nameAr,
        brand: b.brand, model: b.model, serialNumber: b.serialNumber || b.serial,
        plateNumber: b.plateNumber || b.plate, location: b.location,
        purchaseDate: b.purchaseDate, purchaseCost: b.purchaseCost ? String(b.purchaseCost) : null,
        status: b.status || "available", condition: b.condition || "good",
        lastMaintenanceDate: b.lastMaintenanceDate || b.lastMaintenance || null,
        nextMaintenanceDate: b.nextMaintenanceDate || b.nextMaintenance || null,
        insuranceExpiry: b.insuranceExpiry || null,
        projectId: b.projectId ? parseInt(b.projectId) : null,
        notes: b.notes,
      } as any).returning();
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/assets/:id", async (req, res) => {
    try {
      const b = req.body;
      const [row] = await db.update(assets).set({
        assetCode: b.assetCode || b.assetNo, nameAr: b.nameAr, nameEn: b.nameEn || b.nameAr,
        brand: b.brand, model: b.model, serialNumber: b.serialNumber || b.serial,
        plateNumber: b.plateNumber || b.plate, location: b.location,
        purchaseCost: b.purchaseCost ? String(b.purchaseCost) : null,
        status: b.status, condition: b.condition || "good",
        lastMaintenanceDate: b.lastMaintenanceDate || b.lastMaintenance || null,
        nextMaintenanceDate: b.nextMaintenanceDate || b.nextMaintenance || null,
        insuranceExpiry: b.insuranceExpiry || null,
        projectId: b.projectId !== undefined ? (b.projectId ? parseInt(b.projectId) : null) : undefined,
        notes: b.notes, updatedAt: new Date(),
      } as any).where(eq(assets.id, parseInt(req.params.id))).returning();
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.delete("/api/assets/:id", async (req, res) => {
    try { await db.delete(assets).where(eq(assets.id, parseInt(req.params.id))); res.json({ success: true }); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.get("/api/maintenance-records", async (req, res) => {
    try {
      const assetId = req.query.assetId ? parseInt(req.query.assetId as string) : null;
      const q = db.select().from(maintenanceRecords).orderBy(desc(maintenanceRecords.createdAt));
      const rows = assetId
        ? await db.select().from(maintenanceRecords).where(eq(maintenanceRecords.assetId, assetId)).orderBy(desc(maintenanceRecords.createdAt))
        : await q;
      res.json(rows);
    }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.patch("/api/maintenance-records/:id", async (req, res) => {
    try {
      const b = req.body;
      const [row] = await db.update(maintenanceRecords).set({
        description: b.description, cost: b.cost ? String(b.cost) : null,
        technician: b.technician, vendor: b.vendor, nextDate: b.nextDate, status: b.status,
      }).where(eq(maintenanceRecords.id, parseInt(req.params.id))).returning();
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.delete("/api/maintenance-records/:id", async (req, res) => {
    try { await db.delete(maintenanceRecords).where(eq(maintenanceRecords.id, parseInt(req.params.id))); res.json({ success: true }); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/maintenance-records", async (req, res) => {
    try {
      const b = req.body;
      const [row] = await db.insert(maintenanceRecords).values({ assetId: parseInt(b.assetId), type: b.type || "preventive", date: b.date, description: b.description, cost: b.cost ? String(b.cost) : null, vendor: b.vendor, technician: b.technician, nextDate: b.nextDate, status: "completed" }).returning();
      if (b.nextDate) await db.update(assets).set({ lastMaintenanceDate: b.date, nextMaintenanceDate: b.nextDate, updatedAt: new Date() }).where(eq(assets.id, parseInt(b.assetId)));
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PAYROLL
  // ═══════════════════════════════════════════════════════════════════════════
  app.get("/api/payroll-batches", async (_req, res) => {
    try { res.json(await db.select().from(payrollBatches).orderBy(desc(payrollBatches.createdAt))); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/payroll-batches", async (req, res) => {
    try {
      const b = req.body;
      const [row] = await db.insert(payrollBatches).values({ month: b.month, year: b.year, status: b.status || "draft", totalGross: String(b.totalGross || 0), totalDeductions: String(b.totalDeductions || 0), totalNet: String(b.totalNet || 0), employeeCount: b.employeeCount || 0 }).returning();
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/payroll-batches/:id", async (req, res) => {
    try {
      const b = req.body;
      const [row] = await db.update(payrollBatches).set({ status: b.status, totalGross: String(b.totalGross || 0), totalDeductions: String(b.totalDeductions || 0), totalNet: String(b.totalNet || 0), employeeCount: b.employeeCount }).where(eq(payrollBatches.id, parseInt(req.params.id))).returning();
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.get("/api/payroll-batches/:id/items", async (req, res) => {
    try { res.json(await db.select().from(payrollItems).where(eq(payrollItems.batchId, parseInt(req.params.id)))); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // HSE — INCIDENTS & INSPECTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  app.get("/api/incidents", async (_req, res) => {
    try { res.json(await db.select().from(incidents).orderBy(desc(incidents.createdAt))); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/incidents", async (req, res) => {
    try {
      const b = req.body;
      const year = new Date().getFullYear();
      const count = (await db.select().from(incidents)).length;
      const incidentNumber = `INC-${year}-${String(count + 1).padStart(3, "0")}`;
      const [row] = await db.insert(incidents).values({ incidentNumber: b.incidentNumber || incidentNumber, titleAr: b.titleAr || b.description || b.type, titleEn: b.titleEn || b.description || b.type, type: b.type, severity: b.severity || "low", date: b.date, location: b.location, description: b.description, correctiveAction: b.correctiveAction, status: b.status || "open" }).returning();
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/incidents/:id", async (req, res) => {
    try {
      const b = req.body;
      const [row] = await db.update(incidents).set({ type: b.type, severity: b.severity, date: b.date, location: b.location, description: b.description, correctiveAction: b.correctiveAction, status: b.status, updatedAt: new Date() }).where(eq(incidents.id, parseInt(req.params.id))).returning();
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.delete("/api/incidents/:id", async (req, res) => {
    try { await db.delete(incidents).where(eq(incidents.id, parseInt(req.params.id))); res.json({ success: true }); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.get("/api/inspections", async (_req, res) => {
    try { res.json(await db.select().from(inspections).orderBy(desc(inspections.createdAt))); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/inspections", async (req, res) => {
    try {
      const b = req.body;
      const [row] = await db.insert(inspections).values({ titleAr: b.titleAr || b.type, titleEn: b.titleEn || b.type, type: b.type, date: b.date, location: b.location || b.site, score: b.score || 0, status: b.status || "scheduled", findings: b.findings }).returning();
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/inspections/:id", async (req, res) => {
    try {
      const b = req.body;
      const [row] = await db.update(inspections).set({ type: b.type, date: b.date, location: b.location || b.site, score: b.score, status: b.status, findings: b.findings }).where(eq(inspections.id, parseInt(req.params.id))).returning();
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PERMITS & GOVERNMENT ENTITIES
  // ═══════════════════════════════════════════════════════════════════════════
  app.get("/api/government-entities", async (_req, res) => {
    try { res.json(await db.select().from(governmentEntities)); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/government-entities", async (req, res) => {
    try {
      const [row] = await db.insert(governmentEntities).values({ nameAr: req.body.nameAr, nameEn: req.body.nameEn, type: req.body.type, phone: req.body.phone, email: req.body.email }).returning();
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.get("/api/permits", async (_req, res) => {
    try { res.json(await db.select().from(permits).orderBy(desc(permits.createdAt))); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/permits", async (req, res) => {
    try {
      const b = req.body;
      const [row] = await db.insert(permits).values({ permitNumber: b.permitNumber, titleAr: b.titleAr || b.title, titleEn: b.titleEn || b.title, type: b.type, issueDate: b.issueDate, expiryDate: b.expiryDate, status: b.status || "active", fees: b.fees ? String(b.fees) : null, notes: b.notes }).returning();
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/permits/:id", async (req, res) => {
    try {
      const b = req.body;
      const [row] = await db.update(permits).set({ titleAr: b.titleAr || b.title, titleEn: b.titleEn || b.title, type: b.type, issueDate: b.issueDate, expiryDate: b.expiryDate, status: b.status, fees: b.fees ? String(b.fees) : null, notes: b.notes }).where(eq(permits.id, parseInt(req.params.id))).returning();
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.delete("/api/permits/:id", async (req, res) => {
    try { await db.delete(permits).where(eq(permits.id, parseInt(req.params.id))); res.json({ success: true }); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SAFETY TRAININGS
  // ═══════════════════════════════════════════════════════════════════════════
  app.get("/api/safety-trainings", async (_req, res) => {
    try { res.json(await db.select().from(safetyTrainings).orderBy(desc(safetyTrainings.createdAt))); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/safety-trainings", async (req, res) => {
    try {
      const b = req.body;
      const [row] = await db.insert(safetyTrainings).values({ titleAr: b.titleAr || b.title, titleEn: b.titleEn || b.title, type: b.type, date: b.date, duration: b.duration, location: b.location, attendeesCount: b.attendeesCount || 0, status: b.status || "scheduled", notes: b.notes }).returning();
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ANALYTICS — aggregated summary for BI dashboard
  // ═══════════════════════════════════════════════════════════════════════════
  app.get("/api/analytics/summary", async (_req, res) => {
    try {
      const [empRows, projRows, incidentRows, invRows, vendorRows, poRows, assetRows, contactRows, permitRows] = await Promise.all([
        db.select().from(employees),
        db.select().from(projects),
        db.select().from(incidents),
        db.select().from(inventoryItems),
        db.select().from(vendors),
        db.select().from(purchaseOrders),
        db.select().from(assets),
        db.select().from(contacts),
        db.select().from(permits),
      ]);
      const totalInventoryValue = invRows.reduce((s, i) => s + (parseFloat(i.totalValue as string) || 0), 0);
      const totalPOValue = poRows.reduce((s, o) => s + (parseFloat(o.total as string) || 0), 0);
      const activeProjects = projRows.filter(p => p.status === "active").length;
      const activeEmployees = empRows.filter(e => e.status === "active").length;
      const openIncidents = incidentRows.filter(i => i.status === "open" || i.status === "investigating").length;
      const lowStockItems = invRows.filter(i => parseFloat(i.currentQty as string) <= parseFloat(i.minQty as string)).length;
      const now = new Date();
      const in30days = new Date(now.getTime() + 30 * 864e5);
      const expiringPermits = permitRows.filter(p => p.expiryDate && new Date(p.expiryDate) <= in30days && p.status === "active").length;
      const expiringAssets = assetRows.filter(a => a.insuranceExpiry && new Date(a.insuranceExpiry) <= in30days).length;
      res.json({
        employees: { total: empRows.length, active: activeEmployees },
        projects: { total: projRows.length, active: activeProjects },
        incidents: { total: incidentRows.length, open: openIncidents },
        inventory: { items: invRows.length, totalValue: totalInventoryValue, lowStock: lowStockItems },
        purchases: { vendors: vendorRows.length, orders: poRows.length, totalValue: totalPOValue },
        assets: { total: assetRows.length, active: assetRows.filter(a => a.status === "available" || a.status === "active").length },
        clients: { total: contactRows.length },
        permits: { total: permitRows.length, expiring: expiringPermits },
        alerts: { expiringPermits, expiringAssets, lowStockItems, openIncidents },
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LEAVE REQUESTS
  // ═══════════════════════════════════════════════════════════════════════════
  app.get("/api/leave-requests", async (_req, res) => {
    try { res.json(await db.select().from(leaveRequests).orderBy(desc(leaveRequests.createdAt))); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/leave-requests", async (req, res) => {
    try {
      const b = req.body;
      const [row] = await db.insert(leaveRequests).values({ employeeId: parseInt(b.employeeId), startDate: b.startDate, endDate: b.endDate, days: parseInt(b.days || 1), reason: b.reason, status: "pending" }).returning();
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/leave-requests/:id", async (req, res) => {
    try {
      const [row] = await db.update(leaveRequests).set({ status: req.body.status, notes: req.body.notes }).where(eq(leaveRequests.id, parseInt(req.params.id))).returning();
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ─────── Documents (DMS) ────────────────────────────────────────────────────
  app.get("/api/documents", async (req, res) => {
    try {
      const companyId = req.query.companyId ? Number(req.query.companyId) : undefined;
      const category = req.query.category as string | undefined;
      const folder = req.query.folder as string | undefined;
      let query = db.select().from(documents).orderBy(desc(documents.createdAt));
      const rows = await query;
      let filtered = rows;
      if (companyId) filtered = filtered.filter((d) => d.companyId === companyId);
      if (category && category !== "all") filtered = filtered.filter((d) => d.category === category);
      if (folder && folder !== "all") filtered = filtered.filter((d) => d.folder === folder);
      res.json(filtered);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/documents", async (req, res) => {
    try {
      const actorId = (req.header("x-user-id") || "").trim();
      const actor = actorId ? await resolveStaffUser(actorId) : null;
      const body = req.body;
      const year = new Date().getFullYear();
      const countResult = await db.select().from(documents);
      const seq = String(countResult.length + 1).padStart(3, "0");
      const [doc] = await db.insert(documents).values({
        titleAr: body.titleAr,
        titleEn: body.titleEn || null,
        docNo: body.docNo || `DOC-${year}-${seq}`,
        category: body.category || "general",
        folder: body.folder || "root",
        status: body.status || "draft",
        type: body.type || null,
        version: body.version ? Number(body.version) : 1,
        accessLevel: body.accessLevel || "internal",
        tags: body.tags || [],
        description: body.description || null,
        uploadedBy: actor ? actorId : null,
        uploadedByName: actor ? ((actor as any).name || (actor as any).username || null) : null,
        companyId: body.companyId ? Number(body.companyId) : null,
        projectId: body.projectId ? Number(body.projectId) : null,
        activityId: body.activityId || null,
        fileSize: body.fileSize ? Number(body.fileSize) : null,
        fileUrl: body.fileUrl || null,
      }).returning();
      res.json(doc);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/documents/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const body = req.body;
      const [doc] = await db.update(documents).set({
        titleAr: body.titleAr,
        titleEn: body.titleEn || null,
        category: body.category || "general",
        folder: body.folder || "root",
        status: body.status || "draft",
        type: body.type || null,
        version: body.version ? Number(body.version) : 1,
        accessLevel: body.accessLevel || "internal",
        tags: body.tags || [],
        description: body.description || null,
        updatedAt: new Date(),
      }).where(eq(documents.id, id)).returning();
      if (!doc) return res.status(404).json({ error: "Not found" });
      res.json(doc);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/documents/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      await db.delete(documents).where(eq(documents.id, id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ─────── CRM Analytics ───────────────────────────────────────────────────────
  app.get("/api/crm/analytics", async (req, res) => {
    try {
      const scope = await resolveActivityScope(req);
      if (!scope.ok) return res.status(scope.status).json({ error: scope.error });

      // Activity filter for deal / invoice / payment scoping
      const activityFilter = scope.activityId
        ? [scope.activityId]
        : scope.allowedIds || [];

      // 1. All customers (contacts) in scope
      const customerConds: any[] = [eq(contacts.type, "customer")];
      if (!scope.isPrivileged && activityFilter.length > 0) {
        const actRows = await db.select({ companyId: businessActivities.companyId })
          .from(businessActivities)
          .where(inArray(businessActivities.id, activityFilter));
        const compIds = actRows.map(a => a.companyId).filter((c): c is number => c !== null);
        const cFilter = compIds.length > 0 ? inArray(contacts.companyId, compIds) : null;
        const aFilter = activityFilter.length > 0 ? inArray(contacts.activityId, activityFilter) : null;
        if (cFilter && aFilter) customerConds.push(or(cFilter, aFilter));
        else if (cFilter) customerConds.push(cFilter);
        else if (aFilter) customerConds.push(aFilter);
        else return res.json({ kpis: {}, employees: [] });
      }
      const allCustomers = await db.select({
        id: contacts.id,
        assignedTo: contacts.assignedTo,
        createdAt: contacts.createdAt,
        isActive: contacts.isActive,
      }).from(contacts).where(customerConds.length > 1 ? and(...customerConds) : customerConds[0]);

      // 2. Deals in scope
      const dealConds: any[] = [];
      if (!scope.isPrivileged && activityFilter.length > 0)
        dealConds.push(inArray(deals.activityId, activityFilter));
      const allDeals = await db.select({
        id: deals.id,
        assignedTo: deals.assignedTo,
        contactId: deals.contactId,
        value: deals.value,
        status: deals.status,
        createdAt: deals.createdAt,
      }).from(deals).where(dealConds.length ? dealConds[0] : undefined);

      // 3. Proposals in scope
      const propConds: any[] = [];
      if (!scope.isPrivileged && activityFilter.length > 0)
        propConds.push(inArray(proposals.activityId, activityFilter));
      const allProposals = await db.select({
        id: proposals.id,
        contactId: proposals.contactId,
        createdBy: proposals.createdBy,
        total: proposals.total,
        status: proposals.status,
        createdAt: proposals.createdAt,
      }).from(proposals).where(propConds.length ? propConds[0] : undefined);

      // 4. Payments received in scope
      const payConds: any[] = [eq(payments.type, "received")];
      if (!scope.isPrivileged && activityFilter.length > 0) {
        // payments don't have activityId — scope by contactId matching in-scope customers
        const custIds = allCustomers.map(c => c.id);
        if (custIds.length > 0) payConds.push(inArray(payments.contactId, custIds));
        else return res.json({ kpis: {}, employees: [] });
      }
      const allPayments = await db.select({
        id: payments.id,
        contactId: payments.contactId,
        amount: payments.amount,
        createdBy: payments.createdBy,
        date: payments.date,
      }).from(payments).where(and(...payConds));

      // 5. All active users
      const allUsers = await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      }).from(users).where(eq(users.isActive, true));

      // ── Aggregate per employee ──────────────────────────────────────────────
      const custByAssignee = new Map<string, number[]>();
      allCustomers.forEach(c => {
        if (!c.assignedTo) return;
        if (!custByAssignee.has(c.assignedTo)) custByAssignee.set(c.assignedTo, []);
        custByAssignee.get(c.assignedTo)!.push(c.id);
      });

      const employeeStats = allUsers.map(user => {
        const myContactIds = new Set(custByAssignee.get(user.id) || []);
        const myDeals = allDeals.filter(d => d.assignedTo === user.id || (d.contactId && myContactIds.has(d.contactId)));
        const myProposals = allProposals.filter(p =>
          p.createdBy === user.id || (p.contactId && myContactIds.has(p.contactId))
        );
        const myPayments = allPayments.filter(p => p.contactId && myContactIds.has(p.contactId));

        const dealsWonValue = myDeals.filter(d => d.status === "won").reduce((s, d) => s + parseFloat(d.value ?? "0"), 0);
        const dealsPipelineValue = myDeals.filter(d => d.status === "open").reduce((s, d) => s + parseFloat(d.value ?? "0"), 0);
        const proposalsValue = myProposals.reduce((s, p) => s + parseFloat(p.total ?? "0"), 0);
        const proposalsApproved = myProposals.filter(p => p.status === "approved").length;
        const collectedAmount = myPayments.reduce((s, p) => s + parseFloat(p.amount ?? "0"), 0);

        if (myContactIds.size === 0 && myDeals.length === 0 && myProposals.length === 0) return null;

        return {
          userId: user.id,
          name: user.name || user.email || user.id,
          role: user.role,
          customersCount: myContactIds.size,
          dealsCount: myDeals.length,
          dealsWonValue,
          dealsPipelineValue,
          proposalsCount: myProposals.length,
          proposalsApproved,
          proposalsValue,
          collectedAmount,
        };
      }).filter(Boolean);

      // ── KPIs ────────────────────────────────────────────────────────────────
      const totalCollected = allPayments.reduce((s, p) => s + parseFloat(p.amount ?? "0"), 0);
      const totalPipeline = allDeals.filter(d => d.status === "open").reduce((s, d) => s + parseFloat(d.value ?? "0"), 0);
      const totalWon = allDeals.filter(d => d.status === "won").reduce((s, d) => s + parseFloat(d.value ?? "0"), 0);
      const totalProposals = allProposals.reduce((s, p) => s + parseFloat(p.total ?? "0"), 0);

      // Monthly trend: payments per month (last 6 months)
      const now = new Date();
      const months: { label: string; collected: number; deals: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleString("default", { month: "short" }) + " " + d.getFullYear();
        const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
        const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        const collected = allPayments
          .filter(p => p.date && new Date(p.date) >= mStart && new Date(p.date) <= mEnd)
          .reduce((s, p) => s + parseFloat(p.amount ?? "0"), 0);
        const dealsWon = allDeals
          .filter(d2 => d2.status === "won" && d2.createdAt && new Date(d2.createdAt) >= mStart && new Date(d2.createdAt) <= mEnd)
          .reduce((s, d2) => s + parseFloat(d2.value ?? "0"), 0);
        months.push({ label, collected, deals: dealsWon });
      }

      res.json({
        kpis: {
          totalCustomers: allCustomers.length,
          activeCustomers: allCustomers.filter(c => c.isActive).length,
          totalPipeline,
          totalWon,
          totalCollected,
          totalProposals,
          totalProposalsCount: allProposals.length,
          totalDeals: allDeals.length,
          wonDeals: allDeals.filter(d => d.status === "won").length,
        },
        employees: employeeStats,
        trend: months,
      });
    } catch (err: any) {
      console.error("CRM analytics error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // ─────── CRM Documents (linked to contacts + deals) ─────────────────────────
  app.get("/api/crm-documents", async (req, res) => {
    try {
      const contactId = req.query.contactId ? Number(req.query.contactId) : null;
      const dealId = req.query.dealId ? Number(req.query.dealId) : null;
      let rows = await db.select().from(documents).orderBy(desc(documents.createdAt));
      if (contactId) rows = rows.filter(d => (d as any).contactId === contactId);
      else if (dealId) rows = rows.filter(d => (d as any).dealId === dealId);
      else rows = [];
      // Never return file_content in list (performance)
      const safe = rows.map(({ ...r }: any) => { delete r.fileContent; return r; });
      res.json(safe);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/crm-documents", async (req, res) => {
    try {
      const actorId = (req.header("x-user-id") || "").trim();
      const b = req.body;
      const year = new Date().getFullYear();
      const countResult = await db.select().from(documents);
      const seq = String(countResult.length + 1).padStart(4, "0");
      const [doc] = await db.insert(documents).values({
        titleAr: b.titleAr,
        titleEn: b.titleEn || null,
        docNo: `CRM-${year}-${seq}`,
        category: b.category || "other",
        folder: b.contactId ? "crm-company" : "crm-deal",
        status: "active",
        fileContent: b.fileContent || null,
        originalName: b.originalName || null,
        mimeType: b.mimeType || null,
        fileSize: b.fileSize ? Number(b.fileSize) : null,
        activityId: b.activityId || null,
        uploadedBy: actorId || null,
        uploadedByName: b.uploadedByName || null,
        description: b.description || null,
        contactId: b.contactId ? Number(b.contactId) : null,
        dealId: b.dealId ? Number(b.dealId) : null,
        tags: [],
        version: 1,
        accessLevel: "internal",
      } as any).returning();
      const { fileContent: _fc, ...safe } = doc as any;
      res.json(safe);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/crm-documents/:id/file", async (req, res) => {
    try {
      const [doc] = await db.select().from(documents).where(eq(documents.id, Number(req.params.id)));
      if (!doc) return res.status(404).json({ error: "Not found" });
      const content = (doc as any).fileContent;
      if (!content) return res.status(404).json({ error: "No file content" });
      const buffer = Buffer.from(content, "base64");
      res.setHeader("Content-Type", doc.mimeType || "application/octet-stream");
      res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent((doc as any).originalName || doc.titleAr || 'file')}"`);
      res.setHeader("Content-Length", buffer.length);
      res.send(buffer);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/crm-documents/:id", async (req, res) => {
    try {
      await db.delete(documents).where(eq(documents.id, Number(req.params.id)));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/auth/change-password", async (req, res) => {
    try {
      const { userId, newPassword, currentPassword } = req.body;
      if (!userId || !newPassword) {
        return res.status(400).json({ error: "userId and newPassword are required" });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: "New password must be at least 6 characters" });
      }
      const user = await findUserById(userId);
      if (!user) return res.status(404).json({ error: "User not found" });
      if (currentPassword) {
        const valid = await verifyPassword(currentPassword, user.password);
        if (!valid) return res.status(401).json({ error: "Current password is incorrect" });
      }
      const updated = await updateUser(userId, { password: newPassword });
      if (!updated) return res.status(404).json({ error: "User not found" });
      res.json({ success: true });
    } catch (err: any) {
      console.error("Change password error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.patch("/api/users/:id/phone", async (req, res) => {
    try {
      const { phone } = req.body;
      if (phone !== undefined && typeof phone !== "string") {
        return res.status(400).json({ error: "phone must be a string" });
      }
      const updated = await updateUser(req.params.id, { phone: phone || "" });
      if (!updated) return res.status(404).json({ error: "User not found" });
      const { password, ...safeUser } = updated;
      res.json(safeUser);
    } catch (err: any) {
      console.error("Update phone error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // STANDALONE INVOICES (Tax Invoices)
  // ═══════════════════════════════════════════════════════════════════════════
  app.get("/api/invoices", async (req, res) => {
    try {
      const rows = await db.select().from(invoices).orderBy(desc(invoices.createdAt));
      res.json(rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/invoices/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const [inv] = await db.select().from(invoices).where(eq(invoices.id, id));
      if (!inv) return res.status(404).json({ error: "Not found" });
      const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, id));
      res.json({ ...inv, items });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/invoices", async (req, res) => {
    try {
      const b = req.body;
      const today = new Date().toISOString().slice(0, 10);
      const countToday = await db.select().from(invoices);
      const seq = (countToday.length + 1).toString().padStart(4, "0");
      const ymd = today.replace(/-/g, "");
      const invoiceNumber = b.invoiceNumber || `INV-${ymd}-${seq}`;
      const subtotal = parseFloat(b.subtotal || 0);
      const vatRate = parseFloat(b.vatRate || 15) / 100;
      const vatAmount = parseFloat(b.vatAmount ?? (subtotal * vatRate).toFixed(2));
      const total = parseFloat(b.total ?? (subtotal + vatAmount).toFixed(2));
      const [row] = await db.insert(invoices).values({
        invoiceNumber, type: b.type || "sales",
        contactId: b.contactId ? parseInt(b.contactId) : null,
        contractId: b.contractId ? parseInt(b.contractId) : null,
        clientName: b.clientName || null,
        issueDate: b.issueDate || today, dueDate: b.dueDate || null,
        subtotal: String(subtotal), vatAmount: String(vatAmount), total: String(total),
        paidAmount: "0", currency: b.currency || "SAR",
        status: b.status || "draft", notes: b.notes || null,
        activityId: b.activityId || null, projectId: b.projectId ? parseInt(b.projectId) : null,
        createdBy: b.createdBy || null,
      }).returning();
      if (b.items && Array.isArray(b.items) && b.items.length > 0) {
        await db.insert(invoiceItems).values(b.items.map((it: any) => ({
          invoiceId: row.id, descAr: it.descAr, descEn: it.descEn,
          qty: String(it.qty || 1), unit: it.unit || null,
          unitPrice: String(it.unitPrice || 0), total: String(it.total || 0),
        })));
      }
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/invoices/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const b = req.body;
      const subtotal = b.subtotal !== undefined ? parseFloat(b.subtotal) : undefined;
      const vatAmount = b.vatAmount !== undefined ? parseFloat(b.vatAmount) : undefined;
      const total = b.total !== undefined ? parseFloat(b.total) : undefined;
      const updateData: any = { updatedAt: new Date() };
      if (b.status !== undefined) updateData.status = b.status;
      if (b.clientName !== undefined) updateData.clientName = b.clientName;
      if (b.contactId !== undefined) updateData.contactId = b.contactId ? parseInt(b.contactId) : null;
      if (b.issueDate !== undefined) updateData.issueDate = b.issueDate;
      if (b.dueDate !== undefined) updateData.dueDate = b.dueDate;
      if (subtotal !== undefined) updateData.subtotal = String(subtotal);
      if (vatAmount !== undefined) updateData.vatAmount = String(vatAmount);
      if (total !== undefined) updateData.total = String(total);
      if (b.paidAmount !== undefined) updateData.paidAmount = String(b.paidAmount);
      if (b.notes !== undefined) updateData.notes = b.notes;
      if (b.type !== undefined) updateData.type = b.type;
      const [row] = await db.update(invoices).set(updateData).where(eq(invoices.id, id)).returning();
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/invoices/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));
      await db.delete(invoices).where(eq(invoices.id, id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PAYMENTS — Receipt Vouchers (سند قبض) + Payment Vouchers (سند صرف)
  // ═══════════════════════════════════════════════════════════════════════════
  app.get("/api/payments", async (req, res) => {
    try {
      const type = req.query.type as string | undefined;
      const rows = type
        ? await db.select().from(payments).where(eq(payments.type, type)).orderBy(desc(payments.createdAt))
        : await db.select().from(payments).orderBy(desc(payments.createdAt));
      res.json(rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/payments", async (req, res) => {
    try {
      const b = req.body;
      const today = new Date().toISOString().slice(0, 10);
      const existing = await db.select().from(payments);
      const seq = (existing.length + 1).toString().padStart(4, "0");
      const prefix = b.type === "paid" ? "SPY" : "SRC";
      const paymentNumber = b.paymentNumber || `${prefix}-${today.replace(/-/g, "").slice(2)}-${seq}`;
      const [row] = await db.insert(payments).values({
        paymentNumber, type: b.type || "received",
        invoiceId: b.invoiceId ? parseInt(b.invoiceId) : null,
        contactId: b.contactId ? parseInt(b.contactId) : null,
        amount: String(b.amount || 0), currency: b.currency || "SAR",
        method: b.method || "bank_transfer", reference: b.reference || null,
        date: b.date || today, notes: b.notes || null,
        activityId: b.activityId || null, createdBy: b.createdBy || null,
      }).returning();
      // Update invoice paidAmount if linked
      if (b.invoiceId && b.type === "received") {
        const [inv] = await db.select().from(invoices).where(eq(invoices.id, parseInt(b.invoiceId)));
        if (inv) {
          const newPaid = parseFloat(inv.paidAmount || "0") + parseFloat(String(b.amount));
          const total = parseFloat(inv.total || "0");
          const newStatus = newPaid >= total ? "paid" : newPaid > 0 ? "partial" : inv.status;
          await db.update(invoices).set({ paidAmount: String(newPaid), status: newStatus, updatedAt: new Date() }).where(eq(invoices.id, parseInt(b.invoiceId)));
        }
      }
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/payments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const b = req.body;
      const updateData: any = {};
      if (b.status !== undefined) updateData.status = b.status;
      if (b.notes !== undefined) updateData.notes = b.notes;
      if (b.reference !== undefined) updateData.reference = b.reference;
      if (b.method !== undefined) updateData.method = b.method;
      const [row] = await db.update(payments).set(updateData).where(eq(payments.id, id)).returning();
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/payments/:id", async (req, res) => {
    try {
      await db.delete(payments).where(eq(payments.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EMPLOYEE ADVANCES (سلف الموظفين)
  // ═══════════════════════════════════════════════════════════════════════════
  app.get("/api/employee-advances", async (req, res) => {
    try {
      const empId = req.query.employeeId;
      const rows = empId
        ? await db.select().from(employeeAdvances).where(eq(employeeAdvances.employeeId, parseInt(empId as string))).orderBy(desc(employeeAdvances.createdAt))
        : await db.select().from(employeeAdvances).orderBy(desc(employeeAdvances.createdAt));
      res.json(rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/employee-advances", async (req, res) => {
    try {
      const b = req.body;
      const [row] = await db.insert(employeeAdvances).values({
        companyId: b.companyId ? parseInt(b.companyId) : 1,
        employeeId: parseInt(b.employeeId),
        amount: String(b.amount), reason: b.reason || null,
        requestDate: b.requestDate || new Date().toISOString().slice(0, 10),
        deductionMonths: parseInt(b.deductionMonths || 1),
        deductedSoFar: "0", status: "pending",
        notes: b.notes || null, activityId: b.activityId || null,
        createdBy: b.createdBy || null,
      }).returning();
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/employee-advances/:id", async (req, res) => {
    try {
      const b = req.body;
      const updateData: any = {};
      if (b.status !== undefined) updateData.status = b.status;
      if (b.approvedBy !== undefined) updateData.approvedBy = b.approvedBy;
      if (b.notes !== undefined) updateData.notes = b.notes;
      if (b.deductedSoFar !== undefined) updateData.deductedSoFar = String(b.deductedSoFar);
      if (b.deductionMonths !== undefined) updateData.deductionMonths = parseInt(b.deductionMonths);
      const [row] = await db.update(employeeAdvances).set(updateData).where(eq(employeeAdvances.id, parseInt(req.params.id))).returning();
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/employee-advances/:id", async (req, res) => {
    try {
      await db.delete(employeeAdvances).where(eq(employeeAdvances.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EMPLOYEE VIOLATIONS (مخالفات الموظفين)
  // ═══════════════════════════════════════════════════════════════════════════
  app.get("/api/employee-violations", async (req, res) => {
    try {
      const empId = req.query.employeeId;
      const rows = empId
        ? await db.select().from(employeeViolations).where(eq(employeeViolations.employeeId, parseInt(empId as string))).orderBy(desc(employeeViolations.createdAt))
        : await db.select().from(employeeViolations).orderBy(desc(employeeViolations.createdAt));
      res.json(rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/employee-violations", async (req, res) => {
    try {
      const b = req.body;
      const [row] = await db.insert(employeeViolations).values({
        companyId: b.companyId ? parseInt(b.companyId) : 1,
        employeeId: parseInt(b.employeeId),
        violationType: b.violationType, description: b.description || null,
        penaltyAmount: String(b.penaltyAmount || 0),
        date: b.date || new Date().toISOString().slice(0, 10),
        status: "pending", notes: b.notes || null,
        activityId: b.activityId || null, createdBy: b.createdBy || null,
      }).returning();
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/employee-violations/:id", async (req, res) => {
    try {
      const b = req.body;
      const updateData: any = {};
      if (b.status !== undefined) updateData.status = b.status;
      if (b.approvedBy !== undefined) updateData.approvedBy = b.approvedBy;
      if (b.notes !== undefined) updateData.notes = b.notes;
      if (b.penaltyAmount !== undefined) updateData.penaltyAmount = String(b.penaltyAmount);
      const [row] = await db.update(employeeViolations).set(updateData).where(eq(employeeViolations.id, parseInt(req.params.id))).returning();
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/employee-violations/:id", async (req, res) => {
    try {
      await db.delete(employeeViolations).where(eq(employeeViolations.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Payroll items CRUD (with new fields)
  app.post("/api/payroll-items", async (req, res) => {
    try {
      const b = req.body;
      const [row] = await db.insert(payrollItems).values({
        batchId: parseInt(b.batchId), employeeId: parseInt(b.employeeId),
        basicSalary: String(b.basicSalary || 0), allowances: String(b.allowances || 0),
        overtime: String(b.overtime || 0), bonuses: String(b.bonuses || 0),
        commission: String(b.commission || 0), deductions: String(b.deductions || 0),
        advanceDeduction: String(b.advanceDeduction || 0),
        violationDeduction: String(b.violationDeduction || 0),
        gosiEmployee: String(b.gosiEmployee || 0), gosiCompany: String(b.gosiCompany || 0),
        netSalary: String(b.netSalary || 0), notes: b.notes || null,
      }).returning();
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/payroll-items/:id", async (req, res) => {
    try {
      const b = req.body;
      const updateData: any = {};
      const numFields = ["basicSalary","allowances","overtime","bonuses","commission","deductions","advanceDeduction","violationDeduction","gosiEmployee","gosiCompany","netSalary"];
      for (const f of numFields) { if (b[f] !== undefined) updateData[f] = String(b[f]); }
      if (b.notes !== undefined) updateData.notes = b.notes;
      const [row] = await db.update(payrollItems).set(updateData).where(eq(payrollItems.id, parseInt(req.params.id))).returning();
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CHART OF ACCOUNTS (شجرة الحسابات)
  // ═══════════════════════════════════════════════════════════════════════════

  // Seed default SOCPA chart of accounts if empty
  async function seedChartOfAccounts(companyId: number) {
    const existing = await db.select().from(chartOfAccounts).where(eq(chartOfAccounts.companyId, companyId));
    if (existing.length > 0) return;

    const ACCOUNTS = [
      // ── Level 1: Root categories ──
      { code: "1", nameAr: "الأصول", nameEn: "Assets", type: "asset", parentId: null, level: 1 },
      { code: "2", nameAr: "المطلوبات", nameEn: "Liabilities", type: "liability", parentId: null, level: 1 },
      { code: "3", nameAr: "حقوق الملكية", nameEn: "Equity", type: "equity", parentId: null, level: 1 },
      { code: "4", nameAr: "الإيرادات", nameEn: "Revenue", type: "revenue", parentId: null, level: 1 },
      { code: "5", nameAr: "المصروفات", nameEn: "Expenses", type: "expense", parentId: null, level: 1 },

      // ── Level 2: Assets ──
      { code: "11", nameAr: "الأصول المتداولة", nameEn: "Current Assets", type: "asset", parentCode: "1", level: 2 },
      { code: "12", nameAr: "الأصول الثابتة", nameEn: "Fixed Assets", type: "asset", parentCode: "1", level: 2 },
      { code: "13", nameAr: "الأصول الأخرى", nameEn: "Other Assets", type: "asset", parentCode: "1", level: 2 },

      // ── Level 2: Liabilities ──
      { code: "21", nameAr: "المطلوبات المتداولة", nameEn: "Current Liabilities", type: "liability", parentCode: "2", level: 2 },
      { code: "22", nameAr: "المطلوبات طويلة الأجل", nameEn: "Long-term Liabilities", type: "liability", parentCode: "2", level: 2 },

      // ── Level 2: Equity ──
      { code: "31", nameAr: "رأس المال", nameEn: "Capital", type: "equity", parentCode: "3", level: 2 },
      { code: "32", nameAr: "الأرباح المحتجزة", nameEn: "Retained Earnings", type: "equity", parentCode: "3", level: 2 },

      // ── Level 2: Revenue ──
      { code: "41", nameAr: "إيرادات المبيعات", nameEn: "Sales Revenue", type: "revenue", parentCode: "4", level: 2 },
      { code: "42", nameAr: "إيرادات الخدمات", nameEn: "Service Revenue", type: "revenue", parentCode: "4", level: 2 },
      { code: "43", nameAr: "إيرادات أخرى", nameEn: "Other Revenue", type: "revenue", parentCode: "4", level: 2 },

      // ── Level 2: Expenses ──
      { code: "51", nameAr: "تكلفة المبيعات", nameEn: "Cost of Sales", type: "expense", parentCode: "5", level: 2 },
      { code: "52", nameAr: "مصروفات التشغيل", nameEn: "Operating Expenses", type: "expense", parentCode: "5", level: 2 },
      { code: "53", nameAr: "مصروفات إدارية وعمومية", nameEn: "General & Admin Expenses", type: "expense", parentCode: "5", level: 2 },
      { code: "54", nameAr: "مصروفات مالية", nameEn: "Financial Expenses", type: "expense", parentCode: "5", level: 2 },

      // ── Level 3: Current Assets ──
      { code: "1101", nameAr: "النقدية وما يعادلها", nameEn: "Cash & Equivalents", type: "asset", parentCode: "11", level: 3 },
      { code: "1102", nameAr: "البنك الرئيسي", nameEn: "Main Bank Account", type: "asset", parentCode: "11", level: 3 },
      { code: "1103", nameAr: "الصندوق النثري", nameEn: "Petty Cash", type: "asset", parentCode: "11", level: 3 },
      { code: "1201", nameAr: "ذمم مدينة — عملاء", nameEn: "Accounts Receivable — Clients", type: "asset", parentCode: "11", level: 3 },
      { code: "1202", nameAr: "ذمم مدينة — أخرى", nameEn: "Accounts Receivable — Other", type: "asset", parentCode: "11", level: 3 },
      { code: "1301", nameAr: "المخزون", nameEn: "Inventory", type: "asset", parentCode: "11", level: 3 },
      { code: "1401", nameAr: "مصروفات مدفوعة مقدماً", nameEn: "Prepaid Expenses", type: "asset", parentCode: "11", level: 3 },
      { code: "1501", nameAr: "ضريبة القيمة المضافة — المدخلات", nameEn: "VAT Input", type: "asset", parentCode: "11", level: 3 },

      // ── Level 3: Fixed Assets ──
      { code: "1601", nameAr: "الأثاث والمعدات", nameEn: "Furniture & Equipment", type: "asset", parentCode: "12", level: 3 },
      { code: "1602", nameAr: "السيارات والمركبات", nameEn: "Vehicles", type: "asset", parentCode: "12", level: 3 },
      { code: "1603", nameAr: "أجهزة الحاسب الآلي", nameEn: "Computer Equipment", type: "asset", parentCode: "12", level: 3 },
      { code: "1604", nameAr: "مجمع الاستهلاك", nameEn: "Accumulated Depreciation", type: "asset", parentCode: "12", level: 3 },

      // ── Level 3: Current Liabilities ──
      { code: "2101", nameAr: "ذمم دائنة — موردون", nameEn: "Accounts Payable — Suppliers", type: "liability", parentCode: "21", level: 3 },
      { code: "2102", nameAr: "ذمم دائنة — أخرى", nameEn: "Accounts Payable — Other", type: "liability", parentCode: "21", level: 3 },
      { code: "2201", nameAr: "ضريبة القيمة المضافة — المخرجات", nameEn: "VAT Output", type: "liability", parentCode: "21", level: 3 },
      { code: "2202", nameAr: "ضريبة القيمة المضافة الصافية", nameEn: "VAT Payable (Net)", type: "liability", parentCode: "21", level: 3 },
      { code: "2301", nameAr: "مستحقات الرواتب", nameEn: "Accrued Salaries", type: "liability", parentCode: "21", level: 3 },
      { code: "2302", nameAr: "مستحقات GOSI", nameEn: "GOSI Payable", type: "liability", parentCode: "21", level: 3 },
      { code: "2303", nameAr: "مكافأة نهاية الخدمة", nameEn: "End of Service Benefits", type: "liability", parentCode: "21", level: 3 },
      { code: "2401", nameAr: "قروض قصيرة الأجل", nameEn: "Short-term Loans", type: "liability", parentCode: "21", level: 3 },
      { code: "2501", nameAr: "إيرادات مؤجلة", nameEn: "Deferred Revenue", type: "liability", parentCode: "21", level: 3 },

      // ── Level 3: Long-term Liabilities ──
      { code: "2601", nameAr: "قروض طويلة الأجل", nameEn: "Long-term Loans", type: "liability", parentCode: "22", level: 3 },

      // ── Level 3: Equity ──
      { code: "3101", nameAr: "رأس مال الشركاء", nameEn: "Partners Capital", type: "equity", parentCode: "31", level: 3 },
      { code: "3201", nameAr: "أرباح/خسائر العام الحالي", nameEn: "Current Year P&L", type: "equity", parentCode: "32", level: 3 },
      { code: "3202", nameAr: "أرباح محتجزة سابقة", nameEn: "Prior Retained Earnings", type: "equity", parentCode: "32", level: 3 },

      // ── Level 3: Revenue ──
      { code: "4101", nameAr: "إيرادات عقود المقاولات", nameEn: "Contracting Revenue", type: "revenue", parentCode: "41", level: 3 },
      { code: "4102", nameAr: "إيرادات الاستشارات الهندسية", nameEn: "Engineering Consulting Revenue", type: "revenue", parentCode: "41", level: 3 },
      { code: "4103", nameAr: "إيرادات خدمات السلامة", nameEn: "Safety Services Revenue", type: "revenue", parentCode: "41", level: 3 },
      { code: "4104", nameAr: "إيرادات الاستشارات البيئية", nameEn: "Environmental Consulting Revenue", type: "revenue", parentCode: "42", level: 3 },
      { code: "4105", nameAr: "إيرادات التدريب", nameEn: "Training Revenue", type: "revenue", parentCode: "42", level: 3 },
      { code: "4301", nameAr: "إيرادات فوائد بنكية", nameEn: "Bank Interest Income", type: "revenue", parentCode: "43", level: 3 },

      // ── Level 3: Expenses ──
      { code: "5101", nameAr: "تكلفة العمالة المباشرة", nameEn: "Direct Labor Cost", type: "expense", parentCode: "51", level: 3 },
      { code: "5102", nameAr: "تكلفة المواد المباشرة", nameEn: "Direct Materials Cost", type: "expense", parentCode: "51", level: 3 },
      { code: "5103", nameAr: "تكلفة المقاولين الثانويين", nameEn: "Subcontractors Cost", type: "expense", parentCode: "51", level: 3 },
      { code: "5201", nameAr: "رواتب الموظفين", nameEn: "Employee Salaries", type: "expense", parentCode: "52", level: 3 },
      { code: "5202", nameAr: "بدلات الموظفين", nameEn: "Employee Allowances", type: "expense", parentCode: "52", level: 3 },
      { code: "5203", nameAr: "مكافآت وعمولات", nameEn: "Bonuses & Commissions", type: "expense", parentCode: "52", level: 3 },
      { code: "5204", nameAr: "اشتراكات GOSI", nameEn: "GOSI Contributions", type: "expense", parentCode: "52", level: 3 },
      { code: "5205", nameAr: "مصروفات التنقل والمواصلات", nameEn: "Travel & Transportation", type: "expense", parentCode: "52", level: 3 },
      { code: "5206", nameAr: "مصروف استهلاك الأصول", nameEn: "Depreciation Expense", type: "expense", parentCode: "52", level: 3 },
      { code: "5301", nameAr: "إيجارات المكاتب", nameEn: "Office Rent", type: "expense", parentCode: "53", level: 3 },
      { code: "5302", nameAr: "مصروفات الاتصالات", nameEn: "Communications Expense", type: "expense", parentCode: "53", level: 3 },
      { code: "5303", nameAr: "مصروفات الكهرباء والمياه", nameEn: "Utilities Expense", type: "expense", parentCode: "53", level: 3 },
      { code: "5304", nameAr: "مصروفات القرطاسية والمستلزمات", nameEn: "Stationery & Supplies", type: "expense", parentCode: "53", level: 3 },
      { code: "5305", nameAr: "مصروفات التأمين", nameEn: "Insurance Expense", type: "expense", parentCode: "53", level: 3 },
      { code: "5306", nameAr: "مصروفات قانونية ومهنية", nameEn: "Legal & Professional Fees", type: "expense", parentCode: "53", level: 3 },
      { code: "5307", nameAr: "مصروفات التسويق والإعلان", nameEn: "Marketing & Advertising", type: "expense", parentCode: "53", level: 3 },
      { code: "5401", nameAr: "فوائد ومصاريف بنكية", nameEn: "Bank Charges & Interest", type: "expense", parentCode: "54", level: 3 },
      { code: "5402", nameAr: "فروق العملة", nameEn: "Exchange Differences", type: "expense", parentCode: "54", level: 3 },
    ];

    // Build code→id map via two-pass insert
    const codeToId: Record<string, number> = {};

    // Pass 1: insert root (level 1) accounts
    for (const acc of ACCOUNTS.filter(a => a.level === 1)) {
      const [row] = await db.insert(chartOfAccounts).values({ companyId, code: acc.code, nameAr: acc.nameAr, nameEn: acc.nameEn, type: acc.type, parentId: null }).returning();
      codeToId[acc.code] = row.id;
    }
    // Pass 2: insert level 2
    for (const acc of ACCOUNTS.filter(a => a.level === 2)) {
      const parentId = acc.parentCode ? (codeToId[acc.parentCode] ?? null) : null;
      const [row] = await db.insert(chartOfAccounts).values({ companyId, code: acc.code, nameAr: acc.nameAr, nameEn: acc.nameEn, type: acc.type, parentId }).returning();
      codeToId[acc.code] = row.id;
    }
    // Pass 3: insert level 3
    for (const acc of ACCOUNTS.filter(a => a.level === 3)) {
      const parentId = acc.parentCode ? (codeToId[acc.parentCode] ?? null) : null;
      await db.insert(chartOfAccounts).values({ companyId, code: acc.code, nameAr: acc.nameAr, nameEn: acc.nameEn, type: acc.type, parentId });
    }
  }

  app.get("/api/chart-of-accounts", async (req, res) => {
    try {
      const companyId = parseInt((req.query.companyId as string) || "1");
      await seedChartOfAccounts(companyId);
      const rows = await db.select().from(chartOfAccounts)
        .where(eq(chartOfAccounts.companyId, companyId))
        .orderBy(chartOfAccounts.code);
      res.json(rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/chart-of-accounts", async (req, res) => {
    try {
      const b = req.body;
      const companyId = b.companyId ? parseInt(b.companyId) : 1;
      const [row] = await db.insert(chartOfAccounts).values({
        companyId, code: b.code, nameAr: b.nameAr, nameEn: b.nameEn || null,
        type: b.type, parentId: b.parentId ? parseInt(b.parentId) : null,
        balance: b.balance ? String(b.balance) : "0",
        currency: b.currency || "SAR", isActive: true,
      }).returning();
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/chart-of-accounts/:id", async (req, res) => {
    try {
      const b = req.body;
      const updateData: any = {};
      if (b.code !== undefined) updateData.code = b.code;
      if (b.nameAr !== undefined) updateData.nameAr = b.nameAr;
      if (b.nameEn !== undefined) updateData.nameEn = b.nameEn;
      if (b.type !== undefined) updateData.type = b.type;
      if (b.parentId !== undefined) updateData.parentId = b.parentId ? parseInt(b.parentId) : null;
      if (b.isActive !== undefined) updateData.isActive = b.isActive;
      if (b.balance !== undefined) updateData.balance = String(b.balance);
      const [row] = await db.update(chartOfAccounts).set(updateData)
        .where(eq(chartOfAccounts.id, parseInt(req.params.id))).returning();
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/chart-of-accounts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const children = await db.select().from(chartOfAccounts).where(eq(chartOfAccounts.parentId, id));
      if (children.length > 0) return res.status(400).json({ error: "Cannot delete account with sub-accounts" });
      await db.delete(chartOfAccounts).where(eq(chartOfAccounts.id, id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PARTNER ACCOUNTS — Manager/Admin only
  // ═══════════════════════════════════════════════════════════════════════════
  async function resolveUserRole(userId: string): Promise<string | null> {
    const rows = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1);
    return rows[0]?.role ?? null;
  }
  function isManagerOrAdmin(role: string | null): boolean {
    return role === "admin" || role === "manager";
  }

  app.get("/api/partner-accounts", async (req, res) => {
    try {
      const staffId = (req.header("x-user-id") || "").trim();
      const role = await resolveUserRole(staffId);
      if (!isManagerOrAdmin(role)) return res.status(403).json({ error: "Manager access required" });
      const companyId = parseInt((req.query.companyId as string) || "1");
      const rows = await db.select().from(partnerAccounts)
        .where(eq(partnerAccounts.companyId, companyId))
        .orderBy(desc(partnerAccounts.createdAt));
      res.json(rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Get contract IDs that already have a partner account (for badge display)
  app.get("/api/partner-accounts/linked-contracts", async (req, res) => {
    try {
      const staffId = (req.header("x-user-id") || "").trim();
      const role = await resolveUserRole(staffId);
      if (!isManagerOrAdmin(role)) return res.status(403).json({ error: "Manager access required" });
      const rows = await db.execute(`SELECT contract_id, id FROM partner_accounts WHERE contract_id IS NOT NULL`);
      const map: Record<number, number> = {};
      for (const r of rows.rows as any[]) { if (r.contract_id) map[r.contract_id] = r.id; }
      res.json(map);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/partner-accounts", async (req, res) => {
    try {
      const staffId = (req.header("x-user-id") || "").trim();
      const role = await resolveUserRole(staffId);
      if (!isManagerOrAdmin(role)) return res.status(403).json({ error: "Manager access required" });
      const b = req.body;
      const [row] = await db.insert(partnerAccounts).values({
        companyId: b.companyId ?? 1,
        contractNumber: b.contractNumber,
        clientName: b.clientName,
        contractType: b.contractType ?? "عقد صيانة",
        contractValue: b.contractValue?.toString() ?? "0",
        companySharePct: b.companySharePct?.toString() ?? "30",
        receivedAmount: b.receivedAmount?.toString() ?? "0",
        receivedDate: b.receivedDate || null,
        paymentMethod: b.paymentMethod ?? "cash",
        notes: b.notes ?? null,
        status: b.status ?? "pending",
        contractId: b.contractId ? parseInt(b.contractId) : null,
        activityId: b.activityId ?? null,
        createdBy: staffId || null,
      }).returning();
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/partner-accounts/:id", async (req, res) => {
    try {
      const staffId = (req.header("x-user-id") || "").trim();
      const role = await resolveUserRole(staffId);
      if (!isManagerOrAdmin(role)) return res.status(403).json({ error: "Manager access required" });
      const id = parseInt(req.params.id);
      const b = req.body;
      const [row] = await db.update(partnerAccounts).set({
        contractNumber: b.contractNumber,
        clientName: b.clientName,
        contractType: b.contractType,
        contractValue: b.contractValue?.toString(),
        companySharePct: b.companySharePct?.toString(),
        receivedAmount: b.receivedAmount?.toString(),
        receivedDate: b.receivedDate || null,
        paymentMethod: b.paymentMethod,
        notes: b.notes,
        status: b.status,
        updatedAt: new Date(),
      }).where(eq(partnerAccounts.id, id)).returning();
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/partner-accounts/:id", async (req, res) => {
    try {
      const staffId = (req.header("x-user-id") || "").trim();
      const role = await resolveUserRole(staffId);
      if (!isManagerOrAdmin(role)) return res.status(403).json({ error: "Manager access required" });
      const id = parseInt(req.params.id);
      await db.delete(partnerAccounts).where(eq(partnerAccounts.id, id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTRACTS (DB-backed — migrated from localStorage)
  // ═══════════════════════════════════════════════════════════════════════════
  app.get("/api/contracts", async (req, res) => {
    try {
      const staffId = (req.header("x-user-id") || "").trim();
      const role = await resolveUserRole(staffId);
      const isPriv = isManagerOrAdmin(role);
      const companyId = parseInt((req.query.companyId as string) || "1");
      const rows = await db.select().from(contracts)
        .where(eq(contracts.companyId, companyId))
        .orderBy(desc(contracts.createdAt));
      const parsed = rows.map(r => {
        let extra: any = {};
        try { if (r.terms) extra = JSON.parse(r.terms); } catch {}
        return { ...r, ...extra, id: r.id };
      });
      // Filter confidential contracts for non-privileged users
      const visible = isPriv
        ? parsed
        : parsed.filter(c => {
            if (!c.isConfidential) return true;
            const viewers: string[] = Array.isArray(c.viewerIds) ? c.viewerIds : [];
            return viewers.includes(staffId);
          });
      res.json(visible);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Staff users list — for viewer selection (manager only)
  app.get("/api/staff-users", async (req, res) => {
    try {
      const staffId = (req.header("x-user-id") || "").trim();
      const role = await resolveUserRole(staffId);
      if (!isManagerOrAdmin(role)) return res.status(403).json({ error: "Manager access required" });
      const rows = await db.select({
        id: users.id, name: users.name, email: users.email,
        role: users.role, isActive: users.isActive,
      }).from(users).where(eq(users.isActive, true));
      res.json(rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/contracts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const [row] = await db.select().from(contracts).where(eq(contracts.id, id));
      if (!row) return res.status(404).json({ error: "Not found" });
      let extra: any = {};
      try { if (row.terms) extra = JSON.parse(row.terms); } catch {}
      res.json({ ...row, ...extra, id: row.id });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/contracts", async (req, res) => {
    try {
      const b = req.body;
      const staffId = (req.header("x-user-id") || "").trim();
      // Store all rich data (clauses, items, paymentSchedule, etc.) in terms as JSON
      const extra = {
        localId: b.localId,
        proposalNumber: b.proposalNumber,
        clientContact: b.clientContact,
        clientEmail: b.clientEmail,
        projectDesc: b.projectDesc,
        clauses: b.clauses ?? [],
        paymentSchedule: b.paymentSchedule ?? [],
        items: b.items ?? [],
      };
      const [row] = await db.insert(contracts).values({
        companyId: b.companyId ?? 1,
        contractNumber: b.contractNumber,
        proposalId: b.proposalDbId ? parseInt(b.proposalDbId) : null,
        contactId: b.contactId ? parseInt(b.contactId) : null,
        clientName: b.clientName,
        projectName: b.projectName,
        serviceType: b.serviceType,
        subtotal: b.subtotal?.toString() ?? "0",
        vatRate: b.vatRate?.toString() ?? "15",
        vatAmount: b.vatAmount?.toString() ?? "0",
        total: b.total?.toString() ?? "0",
        currency: b.currency ?? "SAR",
        status: b.status ?? "draft",
        startDate: b.startDate,
        endDate: b.endDate,
        terms: JSON.stringify(extra),
        createdBy: staffId || null,
        activityId: b.activityId ?? null,
      }).returning();
      let parsedExtra: any = {};
      try { if (row.terms) parsedExtra = JSON.parse(row.terms); } catch {}
      res.json({ ...row, ...parsedExtra, id: row.id });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/contracts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const b = req.body;
      // Fetch existing to merge terms
      const [existing] = await db.select().from(contracts).where(eq(contracts.id, id));
      if (!existing) return res.status(404).json({ error: "Not found" });
      let prevExtra: any = {};
      try { if (existing.terms) prevExtra = JSON.parse(existing.terms); } catch {}
      const extra = {
        ...prevExtra,
        localId: b.localId ?? prevExtra.localId,
        proposalNumber: b.proposalNumber ?? prevExtra.proposalNumber,
        clientContact: b.clientContact ?? prevExtra.clientContact,
        clientEmail: b.clientEmail ?? prevExtra.clientEmail,
        projectDesc: b.projectDesc ?? prevExtra.projectDesc,
        clauses: b.clauses ?? prevExtra.clauses ?? [],
        paymentSchedule: b.paymentSchedule ?? prevExtra.paymentSchedule ?? [],
        items: b.items ?? prevExtra.items ?? [],
      };
      const [row] = await db.update(contracts).set({
        clientName: b.clientName ?? existing.clientName,
        projectName: b.projectName ?? existing.projectName,
        serviceType: b.serviceType ?? existing.serviceType,
        subtotal: b.subtotal?.toString() ?? existing.subtotal,
        vatRate: b.vatRate?.toString() ?? existing.vatRate,
        vatAmount: b.vatAmount?.toString() ?? existing.vatAmount,
        total: b.total?.toString() ?? existing.total,
        currency: b.currency ?? existing.currency,
        status: b.status ?? existing.status,
        startDate: b.startDate ?? existing.startDate,
        endDate: b.endDate ?? existing.endDate,
        signedAt: b.signedAt ? new Date(b.signedAt) : existing.signedAt,
        signedBy: b.signedBy ?? existing.signedBy,
        isConfidential: b.isConfidential !== undefined ? b.isConfidential : existing.isConfidential,
        viewerIds: b.viewerIds !== undefined ? b.viewerIds : existing.viewerIds,
        terms: JSON.stringify(extra),
        updatedAt: new Date(),
      }).where(eq(contracts.id, id)).returning();
      let parsedExtra: any = {};
      try { if (row.terms) parsedExtra = JSON.parse(row.terms); } catch {}
      res.json({ ...row, ...parsedExtra, id: row.id });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/contracts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(contractItems).where(eq(contractItems.contractId, id));
      await db.delete(contracts).where(eq(contracts.id, id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Bulk migrate from localStorage — idempotent (skip duplicates by contractNumber)
  app.post("/api/contracts/migrate", async (req, res) => {
    try {
      const list: any[] = req.body.contracts ?? [];
      const staffId = (req.header("x-user-id") || "").trim();
      const companyId = parseInt((req.body.companyId as string) || "1");
      const existing = await db.select({ contractNumber: contracts.contractNumber })
        .from(contracts).where(eq(contracts.companyId, companyId));
      const existingNums = new Set(existing.map(r => r.contractNumber));
      let imported = 0;
      for (const c of list) {
        if (existingNums.has(c.contractNumber)) continue;
        const extra = {
          localId: c.id,
          proposalNumber: c.proposalNumber,
          clientContact: c.clientContact,
          clientEmail: c.clientEmail,
          projectDesc: c.projectDesc,
          clauses: c.clauses ?? [],
          paymentSchedule: c.paymentSchedule ?? [],
          items: c.items ?? [],
        };
        await db.insert(contracts).values({
          companyId,
          contractNumber: c.contractNumber,
          clientName: c.clientName,
          projectName: c.projectName,
          serviceType: c.serviceType,
          subtotal: c.subtotal?.toString() ?? "0",
          vatRate: c.vatRate?.toString() ?? "15",
          vatAmount: c.vatAmount?.toString() ?? "0",
          total: c.total?.toString() ?? "0",
          currency: c.currency ?? "SAR",
          status: c.status ?? "draft",
          startDate: c.startDate,
          endDate: c.endDate,
          terms: JSON.stringify(extra),
          createdBy: staffId || null,
          createdAt: c.createdAt ? new Date(c.createdAt) : new Date(),
        });
        imported++;
      }
      res.json({ imported, skipped: list.length - imported });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ─── Contract Payment Schedules ────────────────────────────────────────────
  // Summary MUST be registered before /:id to avoid "summary" being parsed as an id
  app.get("/api/contract-payment-schedules/summary", async (req, res) => {
    try {
      const companyId = parseInt((req.query.companyId as string) || "1");
      const rows = await db.select().from(contractPaymentSchedules)
        .where(eq(contractPaymentSchedules.companyId, companyId))
        .orderBy(contractPaymentSchedules.contractRef, contractPaymentSchedules.installmentNumber);
      const map = new Map<string, any>();
      for (const r of rows) {
        if (!map.has(r.contractRef)) {
          map.set(r.contractRef, {
            contractRef: r.contractRef, contractName: r.contractName,
            clientName: r.clientName, contractTotal: parseFloat(r.contractTotal ?? "0"),
            installments: [], totalAmount: 0, totalPaid: 0,
          });
        }
        const c = map.get(r.contractRef);
        c.installments.push(r);
        c.totalAmount += parseFloat(r.amount ?? "0");
        c.totalPaid += parseFloat(r.paidAmount ?? "0");
      }
      res.json(Array.from(map.values()));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/contract-payment-schedules", async (req, res) => {
    try {
      const companyId = parseInt((req.query.companyId as string) || "1");
      const contractRef = req.query.contractRef as string | undefined;
      const rows = contractRef
        ? await db.select().from(contractPaymentSchedules)
            .where(and(eq(contractPaymentSchedules.companyId, companyId), eq(contractPaymentSchedules.contractRef, contractRef)))
            .orderBy(contractPaymentSchedules.installmentNumber)
        : await db.select().from(contractPaymentSchedules)
            .where(eq(contractPaymentSchedules.companyId, companyId))
            .orderBy(contractPaymentSchedules.contractRef, contractPaymentSchedules.installmentNumber);
      res.json(rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/contract-payment-schedules", async (req, res) => {
    try {
      const b = req.body;
      // Auto-update status if overdue
      let status = b.status || "pending";
      if (status === "pending" && b.dueDate && new Date(b.dueDate) < new Date()) status = "overdue";
      const [row] = await db.insert(contractPaymentSchedules).values({
        companyId: b.companyId ?? 1,
        contractRef: b.contractRef,
        contractName: b.contractName,
        clientName: b.clientName,
        contractTotal: b.contractTotal?.toString() ?? "0",
        installmentNumber: b.installmentNumber ?? 1,
        descriptionAr: b.descriptionAr,
        descriptionEn: b.descriptionEn,
        percentage: b.percentage?.toString() ?? "0",
        amount: b.amount?.toString() ?? "0",
        dueDate: b.dueDate,
        status,
        paidAmount: b.paidAmount?.toString() ?? "0",
        paidDate: b.paidDate,
        notes: b.notes,
        invoiceRef: b.invoiceRef,
      }).returning();
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/contract-payment-schedules/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const b = req.body;
      // Auto-derive status from paidAmount vs amount
      let status = b.status;
      if (!status) {
        const paid = parseFloat(b.paidAmount ?? "0");
        const total = parseFloat(b.amount ?? "0");
        if (paid >= total && total > 0) status = "paid";
        else if (paid > 0) status = "partial";
        else if (b.dueDate && new Date(b.dueDate) < new Date()) status = "overdue";
        else status = "pending";
      }
      const [row] = await db.update(contractPaymentSchedules).set({
        descriptionAr: b.descriptionAr,
        descriptionEn: b.descriptionEn,
        percentage: b.percentage?.toString(),
        amount: b.amount?.toString(),
        dueDate: b.dueDate,
        status,
        paidAmount: b.paidAmount?.toString(),
        paidDate: b.paidDate,
        notes: b.notes,
        invoiceRef: b.invoiceRef,
        updatedAt: new Date(),
      }).where(eq(contractPaymentSchedules.id, id)).returning();
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/contract-payment-schedules/:id", async (req, res) => {
    try {
      await db.delete(contractPaymentSchedules).where(eq(contractPaymentSchedules.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  return httpServer;
}
