import type { Express } from "express";
import { type Server } from "http";
import {
  findUserByEmail,
  findUserById,
  findUserByNationalId,
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
import { appData, companies, branches, contacts, deals, businessActivities, activityMembers, users, projects, projectMilestones, projectTasks, documents, invoices, invoiceItems, payments, notifications, portalRequests, employees, departments, vendors, purchaseOrders, purchaseOrderItems, inventoryItems, warehouses, stockMovements, assets, assetCategories, maintenanceRecords, payrollBatches, payrollItems, incidents, inspections, permits, governmentEntities, leaveRequests, attendanceRecords, safetyTrainings, employeeAdvances, employeeViolations, chartOfAccounts, contractPaymentSchedules, poPaymentSchedules, contracts, contractItems, partnerAccounts, emailLogs, surveys, surveyResponses, proposals, proposalItems, systemBackups, type SurveyQuestionDef } from "@shared/schema";
import { sendEmail, generateTempPassword, sendPortalWelcomeEmail } from "./email";
import crypto from "crypto";
import QRCode from "qrcode";
import { hashPassword, verifyPassword as verifyPwd } from "./auth";
import { signPortalToken, verifyPortalToken, readPortalToken } from "./portal";
import { and, desc, inArray, isNull, or, sql, getTableColumns } from "drizzle-orm";
import { db } from "./db";

// ── Signed staff session tokens ─────────────────────────────────────────────
// Identity is proven by an HMAC-signed token (NOT a client-supplied x-user-id),
// so a caller cannot impersonate another user by forging a header.
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(48).toString("hex");
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
function signSessionToken(userId: string): string {
  const exp = Date.now() + SESSION_TTL_MS;
  const b64 = Buffer.from(`${userId}.${exp}`).toString("base64url");
  const sig = crypto.createHmac("sha256", SESSION_SECRET).update(b64).digest("base64url");
  return `${b64}.${sig}`;
}
function verifySessionToken(token: string): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [b64, sig] = parts;
  const expected = crypto.createHmac("sha256", SESSION_SECRET).update(b64).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let payload: string;
  try { payload = Buffer.from(b64, "base64url").toString(); } catch { return null; }
  const [userId, expStr] = payload.split(".");
  const exp = Number(expStr);
  if (!userId || !exp || Date.now() > exp) return null;
  return userId;
}
// Verified caller id — set by the auth guard from the signed token.
function staffUserId(req: any): string { return (req as any).staffUserId || ""; }
import { eq } from "drizzle-orm";

import { seedDefaultActivities as seedActivitiesShared, seedDefaultCompanies as seedCompaniesShared, seedDefaultCatalogs, DEFAULT_ACTIVITY_CATALOG } from "./seed";
import { BACKUP_MODULES, buildModuleBackup, buildFullBackup } from "./backup";
import {
  createBackup, listBackups, getBackupFile, deleteBackup,
  getBackupStatus, getBackupSettings, saveBackupSettings, DEFAULT_SETTINGS,
  restoreBackup, sendBackupEmail,
} from "./backupScheduler";
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
  for (const [catId, actId] of Array.from(existingByCatalogId)) {
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
    "/api/auth/forgot-send-code",
    "/api/auth/reset-password",
  ]);
  // Tiny TTL cache so the auth guard doesn't hit the DB on every request.
  // Maps userId → { active, role, expires }.
  const STAFF_CACHE = new Map<string, { active: boolean; role: string | null; expires: number }>();
  const STAFF_CACHE_TTL_MS = 30_000;

  // ── Brute-force protection for staff login ──────────────────────────────────
  // Track failed attempts per email+IP; lock the pair after too many failures.
  const LOGIN_ATTEMPTS = new Map<string, { count: number; first: number; lockedUntil: number }>();
  const LOGIN_MAX_ATTEMPTS = 8;
  const LOGIN_WINDOW_MS = 15 * 60 * 1000;
  const LOGIN_LOCKOUT_MS = 15 * 60 * 1000;
  function clientIp(req: any): string {
    return ((req.header("x-forwarded-for") || "").split(",")[0].trim()) || req.socket?.remoteAddress || "unknown";
  }
  function loginKey(email: string, ip: string) { return `${(email || "").toLowerCase()}|${ip}`; }
  function loginRetryAfter(key: string): number {
    const e = LOGIN_ATTEMPTS.get(key);
    if (!e) return 0;
    const left = e.lockedUntil - Date.now();
    return left > 0 ? Math.ceil(left / 1000) : 0;
  }
  function recordLoginFailure(key: string) {
    const now = Date.now();
    const e = LOGIN_ATTEMPTS.get(key);
    if (!e || now - e.first > LOGIN_WINDOW_MS) {
      LOGIN_ATTEMPTS.set(key, { count: 1, first: now, lockedUntil: 0 });
      return;
    }
    e.count++;
    if (e.count >= LOGIN_MAX_ATTEMPTS) e.lockedUntil = now + LOGIN_LOCKOUT_MS;
  }
  function clearLoginAttempts(key: string) { LOGIN_ATTEMPTS.delete(key); }

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
      if (req.path === "/api/portal/login" || req.path === "/api/portal/logout" || req.path === "/api/portal/login/verify-otp") return next();
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
    // /api/public/* — anonymous customer-facing endpoints (survey responses, etc.)
    if (req.path.startsWith("/api/public/")) return next();

    const staffId = verifySessionToken((req.header("x-session-token") || "").trim());
    if (!staffId) return res.status(401).json({ error: "Staff authentication required" });
    (req as any).staffUserId = staffId;
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
    const actorId = staffUserId(req);
    if (!actorId) return false;
    const [u] = await db.select().from(users).where(eq(users.id, actorId));
    if (!u) return false;
    const r = new Set<string>([u.role || "", ...((u.roles as string[]) || [])]);
    return r.has("admin") || r.has("manager");
  }

  // Strict admin-only check (used for company/branch mutations).
  async function isAdminOnly(req: any): Promise<boolean> {
    const actorId = staffUserId(req);
    if (!actorId) return false;
    const [u] = await db.select().from(users).where(eq(users.id, actorId));
    if (!u) return false;
    const r = new Set<string>([u.role || "", ...((u.roles as string[]) || [])]);
    return r.has("admin");
  }

  app.get("/api/activities", async (req, res) => {
    try {
      // Authenticate caller via x-user-id header (same pattern as other secured routes)
      const actorId = staffUserId(req);
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
      const actorId = staffUserId(req);
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
    const actorId = staffUserId(req);
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
        nationalId: d.nationalId?.trim() || null,
      } as any).returning();

      // Auto portal enrollment: when the new customer has both a national ID
      // and an email, enable portal access with a temporary password emailed
      // to the client (they must change it on first login).
      let portalInvited = false;
      const newCustomer = result[0];
      const custNid = ((newCustomer as any).nationalId || "").trim();
      const custEmail = (newCustomer.email || "").trim();
      if (custNid && custEmail) {
        try {
          const tempPassword = generateTempPassword();
          const hash = await hashPassword(tempPassword);
          const sent = await sendPortalWelcomeEmail(custEmail, newCustomer.nameAr || newCustomer.nameEn || "", custNid, tempPassword);
          if (sent) {
            await db.update(contacts).set({
              portalEnabled: true,
              portalPasswordHash: hash,
              portalMustChange: true,
              updatedAt: new Date(),
            } as any).where(eq(contacts.id, newCustomer.id));
            portalInvited = true;
          }
        } catch (e) {
          console.error("Auto portal enrollment failed:", e);
        }
      }
      res.json({ ...newCustomer, _portalInvited: portalInvited });
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
        nationalId: d.nationalId !== undefined ? (d.nationalId?.trim() || null) : existing.nationalId,
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
        reminderDate: d.reminderDate || null,
        reminderLabel: d.reminderLabel || null,
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
        reminderDate: "reminderDate" in d ? (d.reminderDate || null) : existing.reminderDate,
        reminderLabel: "reminderLabel" in d ? (d.reminderLabel || null) : existing.reminderLabel,
        stage: d.stage ?? existing.stage,
        priority: d.priority ?? existing.priority,
        status: d.status ?? existing.status,
        activityId: nextActivityId,
        assignedTo: d.assignedTo ?? existing.assignedTo,
        updatedAt: new Date(),
      }).where(eq(deals.id, id)).returning();
      const updated = result[0];

      // AUTO-CONVERT: when a deal transitions to "won", create a linked
      // project automatically (Odoo-style: sales = pre-contract, projects =
      // execution) and attach the deal's documents to that project.
      if (updated.stage === "won" && existing.stage !== "won") {
        try {
          const [already] = await db.select({ id: projects.id }).from(projects).where(eq((projects as any).dealId, id)).limit(1);
          if (!already) {
            const year = new Date().getFullYear();
            const cnt = await db.select({ id: projects.id }).from(projects);
            const code = `PRJ-${year}-${String(cnt.length + 1).padStart(4, "0")}`;
            let clientName: string | null = null;
            if (updated.contactId) {
              const [c] = await db.select().from(contacts).where(eq(contacts.id, updated.contactId)).limit(1);
              clientName = c?.nameAr || c?.nameEn || null;
            }
            // Atomic: project insert + document relink succeed or fail
            // together. A partial unique index on projects(deal_id) guards
            // against duplicate projects under concurrent PATCHes.
            await db.transaction(async (tx) => {
              const [proj] = await tx.insert(projects).values({
                companyId: updated.companyId ?? null,
                projectCode: code,
                nameAr: updated.titleAr || updated.titleEn || code,
                nameEn: updated.titleEn || updated.titleAr || null,
                description: updated.notes || null,
                clientName,
                contactId: updated.contactId ?? null,
                dealId: id,
                status: "planning",
                priority: updated.priority || "medium",
                startDate: new Date().toISOString().slice(0, 10),
                budget: updated.value ?? null,
                progress: 0,
                activityId: updated.activityId ?? null,
                createdBy: scope.actor.id,
              } as any).returning();
              // Attach the deal's documents to the new project so they show
              // under "مستندات المشاريع" in the customer card and DMS.
              await tx.update(documents)
                .set({ projectId: proj.id } as any)
                .where(and(eq((documents as any).dealId, id), isNull((documents as any).projectId)));
            });
          }
        } catch (convErr) {
          console.error("Auto-convert won deal to project failed:", convErr);
        }
      }

      res.json(updated);
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

      // Best-effort: payment installments due within 7 days (or overdue).
      // In-app notification for the contract creator + optional emails
      // (employee/client) controlled by system settings toggles.
      try {
        const now = new Date();
        const soon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const oldest = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        const schedRows = await db.select().from(contractPaymentSchedules);
        const dueSched = schedRows.filter((s) => {
          if (!s.dueDate) return false;
          if (s.status === "paid" || s.status === "cancelled") return false;
          const remaining = Number(s.amount || 0) - Number(s.paidAmount || 0);
          if (remaining <= 0.009) return false;
          const d = new Date(s.dueDate as any);
          return d <= soon && d >= oldest;
        });
        if (dueSched.length) {
          let empEmailOn = true, clientEmailOn = false;
          try {
            const [cfgRow] = await db.select().from(appData).where(eq(appData.key, "scapex_system_settings"));
            const raw = cfgRow?.value as any;
            const cfg = typeof raw === "string" ? JSON.parse(raw) : raw;
            if (cfg && typeof cfg === "object") {
              if (cfg.payReminderEmployeeEmail === false) empEmailOn = false;
              if (cfg.payReminderClientEmail === true) clientEmailOn = true;
            }
          } catch {}
          const refs = Array.from(new Set(dueSched.map((s) => s.contractRef).filter(Boolean)));
          const ctrRows = refs.length ? await db.select().from(contracts).where(inArray(contracts.contractNumber, refs)) : [];
          const byRef = new Map(ctrRows.map((c) => [c.contractNumber, c]));
          for (const s of dueSched) {
            const ctr = byRef.get(s.contractRef);
            const overdue = new Date(s.dueDate as any) < now;
            const dueTxt = String(s.dueDate).slice(0, 10);
            const remaining = (Number(s.amount || 0) - Number(s.paidAmount || 0)).toFixed(2);
            const noteType = overdue ? "payment_overdue" : "payment_due";
            // In-app (on-demand, for the contract creator)
            if (ctr?.createdBy && ctr.createdBy === scope.actor.id) {
              const existing = await db.select().from(notifications).where(and(
                eq(notifications.userId, scope.actor.id),
                eq(notifications.module, "payments"),
                eq(notifications.entityId, String(s.id)),
                eq(notifications.type, noteType),
              ));
              if (!existing.length) {
                await db.insert(notifications).values({
                  userId: scope.actor.id,
                  titleAr: overdue ? "دفعة متأخرة عن السداد" : "دفعة قاربت على الاستحقاق",
                  titleEn: overdue ? "Installment overdue" : "Installment due soon",
                  message: `${s.contractName || s.contractRef} — قسط ${s.installmentNumber} (${remaining} ر.س) — استحقاق ${dueTxt}`,
                  type: noteType,
                  module: "payments",
                  entityId: String(s.id),
                  link: "/accounting",
                });
              }
            }
            // Emails — dedupe via emailLogs.category (one email per installment per recipient)
            const remainLine = `المبلغ المتبقي: ${remaining} ر.س — تاريخ الاستحقاق: ${dueTxt}`;
            if (empEmailOn && ctr?.createdBy) {
              const cat = `payrem_${s.id}_emp`;
              const [dup] = await db.select({ id: emailLogs.id }).from(emailLogs).where(eq(emailLogs.category, cat)).limit(1);
              if (!dup) {
                const [creator] = await db.select().from(users).where(eq(users.id, ctr.createdBy));
                if (creator?.email) {
                  const subject = `${overdue ? "دفعة متأخرة" : "تذكير بدفعة مستحقة"} — ${s.contractName || s.contractRef} (قسط ${s.installmentNumber})`;
                  const html = `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;font-size:14px;color:#1e293b;line-height:1.9">
                    <p>مرحباً${creator.name ? ` ${creator.name}` : ""}،</p>
                    <p>${overdue ? "تجاوزت الدفعة التالية تاريخ استحقاقها" : "تقترب الدفعة التالية من تاريخ استحقاقها"}:</p>
                    <ul><li>العقد: <b>${s.contractName || s.contractRef}</b></li><li>العميل: ${s.clientName || "—"}</li><li>القسط رقم ${s.installmentNumber}</li><li>${remainLine}</li></ul>
                    <p>يرجى متابعة التحصيل من خلال نظام سكابكس — قسم المحاسبة.</p></div>`;
                  const r = await sendEmail({ to: creator.email, subject, html });
                  await db.insert(emailLogs).values({
                    fromEmail: "system", toEmails: [creator.email], subject,
                    status: r.success ? "sent" : "failed", errorMessage: r.error || null,
                    resendId: r.id || null, category: cat,
                  });
                }
              }
            }
            if (clientEmailOn && ctr?.contactId) {
              const cat = `payrem_${s.id}_client`;
              const [dup] = await db.select({ id: emailLogs.id }).from(emailLogs).where(eq(emailLogs.category, cat)).limit(1);
              if (!dup) {
                const [client] = await db.select().from(contacts).where(eq(contacts.id, ctr.contactId));
                if (client?.email) {
                  const subject = `تذكير بدفعة مستحقة — ${s.contractName || s.contractRef}`;
                  const html = `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;font-size:14px;color:#1e293b;line-height:1.9">
                    <p>عزيزنا العميل ${client.nameAr || client.nameEn || ""}،</p>
                    <p>نود تذكيركم بدفعة مستحقة على العقد <b>${s.contractName || s.contractRef}</b>:</p>
                    <ul><li>القسط رقم ${s.installmentNumber}</li><li>${remainLine}</li></ul>
                    <p>نشكر لكم تعاونكم. لأي استفسار يرجى التواصل معنا.</p></div>`;
                  const r = await sendEmail({ to: client.email, subject, html });
                  await db.insert(emailLogs).values({
                    fromEmail: "system", toEmails: [client.email], subject,
                    status: r.success ? "sent" : "failed", errorMessage: r.error || null,
                    resendId: r.id || null, category: cat,
                  });
                }
              }
            }
          }
        }
      } catch (e) { console.error("notify payment-due scan:", e); }

      // Best-effort: vendor (PO) installments due within 7 days (or overdue).
      // In-app notification for the PO creator and admins/managers.
      try {
        const now = new Date();
        const soon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const oldest = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        const poSchedRows = await db.select().from(poPaymentSchedules);
        const duePoSched = poSchedRows.filter((s) => {
          if (!s.dueDate) return false;
          if (s.status === "paid" || s.status === "cancelled") return false;
          const remaining = Number(s.amount || 0) - Number(s.paidAmount || 0);
          if (remaining <= 0.009) return false;
          const d = new Date(s.dueDate as any);
          return d <= soon && d >= oldest;
        });
        if (duePoSched.length) {
          const poIds = Array.from(new Set(duePoSched.map((s) => s.poId)));
          const poRows = poIds.length ? await db.select().from(purchaseOrders).where(inArray(purchaseOrders.id, poIds)) : [];
          const byPoId = new Map(poRows.map((p) => [p.id, p]));
          const actorIsPriv = scope.actor.roles.has("admin") || scope.actor.roles.has("manager");
          for (const s of duePoSched) {
            const po = byPoId.get(s.poId);
            if (!po) continue;
            const isCreator = po.createdBy && po.createdBy === scope.actor.id;
            if (!isCreator && !actorIsPriv) continue;
            const overdue = new Date(s.dueDate as any) < now;
            const dueTxt = String(s.dueDate).slice(0, 10);
            const remaining = (Number(s.amount || 0) - Number(s.paidAmount || 0)).toFixed(2);
            const noteType = overdue ? "po_payment_overdue" : "po_payment_due";
            const existing = await db.select().from(notifications).where(and(
              eq(notifications.userId, scope.actor.id),
              eq(notifications.module, "purchases"),
              eq(notifications.entityId, `posched_${s.id}`),
              eq(notifications.type, noteType),
            ));
            if (!existing.length) {
              await db.insert(notifications).values({
                userId: scope.actor.id,
                titleAr: overdue ? "دفعة مورد متأخرة عن السداد" : "دفعة مورد قاربت على الاستحقاق",
                titleEn: overdue ? "Vendor installment overdue" : "Vendor installment due soon",
                message: `${po.poNumber} — قسط ${s.installmentNumber} (${remaining} ر.س) — استحقاق ${dueTxt}`,
                type: noteType,
                module: "purchases",
                entityId: `posched_${s.id}`,
                link: "/purchases",
              });
            }
          }
        }
      } catch (e) { console.error("notify PO payment-due scan:", e); }

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

  // ─────── CRM payment alerts (per-contact due/overdue installment counts) ──
  app.get("/api/crm/payment-alerts", async (req, res) => {
    try {
      const scope = await resolveActivityScope(req);
      if (!scope.ok) return res.status(scope.status).json({ error: scope.error });
      const now = new Date();
      const soon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const schedRows = await db.select().from(contractPaymentSchedules);
      const open = schedRows.filter((s) => {
        if (!s.dueDate || s.status === "paid" || s.status === "cancelled") return false;
        const remaining = Number(s.amount || 0) - Number(s.paidAmount || 0);
        return remaining > 0.009 && new Date(s.dueDate as any) <= soon;
      });
      if (!open.length) return res.json([]);
      const refs = Array.from(new Set(open.map((s) => s.contractRef).filter(Boolean)));
      const ctrRows = refs.length ? await db.select().from(contracts).where(inArray(contracts.contractNumber, refs)) : [];
      const refToContact = new Map(ctrRows.filter((c) => c.contactId).map((c) => [c.contractNumber, c.contactId as number]));
      const byContact = new Map<number, { contactId: number; overdue: number; dueSoon: number; nextDueDate: string | null; totalRemaining: number }>();
      for (const s of open) {
        const contactId = refToContact.get(s.contractRef);
        if (!contactId) continue;
        const entry = byContact.get(contactId) || { contactId, overdue: 0, dueSoon: 0, nextDueDate: null, totalRemaining: 0 };
        const due = new Date(s.dueDate as any);
        if (due < now) entry.overdue += 1; else entry.dueSoon += 1;
        entry.totalRemaining += Number(s.amount || 0) - Number(s.paidAmount || 0);
        const dueTxt = String(s.dueDate).slice(0, 10);
        if (!entry.nextDueDate || dueTxt < entry.nextDueDate) entry.nextDueDate = dueTxt;
        byContact.set(contactId, entry);
      }
      res.json(Array.from(byContact.values()).map((e) => ({ ...e, totalRemaining: e.totalRemaining.toFixed(2) })));
    } catch (err: any) {
      console.error("CRM payment alerts error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      // Brute-force guard: reject if this email+IP is currently locked out.
      const key = loginKey(email, clientIp(req));
      const retryAfter = loginRetryAfter(key);
      if (retryAfter > 0) {
        res.setHeader("Retry-After", String(retryAfter));
        return res.status(429).json({ error: "Too many failed attempts. Try again later.", retryAfter });
      }

      const user = await findUserByEmail(email);
      if (!user) {
        recordLoginFailure(key);
        // If this email belongs to a portal-enabled customer, guide them to the client portal
        try {
          const [portalContact] = await db.select({ id: contacts.id }).from(contacts)
            .where(and(eq(contacts.email, email.toLowerCase().trim()), eq(contacts.portalEnabled, true))).limit(1);
          if (portalContact) {
            return res.status(401).json({ error: "Invalid email or password", usePortal: true });
          }
        } catch {}
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const valid = await verifyPassword(password, user.password);
      if (!valid) {
        recordLoginFailure(key);
        return res.status(401).json({ error: "Invalid email or password" });
      }

      if (!user.isActive) {
        return res.status(403).json({ error: "Account is disabled", pendingApproval: true });
      }

      clearLoginAttempts(key);
      await updateLastLogin(user.id);

      const { password: _, ...safeUser } = user;
      const token = signSessionToken(user.id);
      res.json({ user: safeUser, token });
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

      // Dev-only bypass: local environment without an email provider configured
      const devNoEmail = process.env.NODE_ENV === "development" && !process.env.RESEND_API_KEY;
      if (!devNoEmail && !isEmailVerified(email)) {
        return res.status(403).json({ error: "Email not verified" });
      }

      const existing = await findUserByEmail(email);
      if (existing) {
        return res.status(409).json({ error: "Email already registered" });
      }

      const emailNorm = email.toLowerCase().trim();
      const nid = (nationalId || "").toString().trim();
      if (nid) {
        const existingNid = await findUserByNationalId(nid);
        if (existingNid) {
          return res.status(409).json({ error: "National ID already registered" });
        }
        // Guard: reject if this national ID belongs to an existing customer
        // record with a different email — prevents portal account takeover.
        const [nidContact] = await db.select().from(contacts).where(eq(contacts.nationalId, nid)).limit(1);
        if (nidContact && (nidContact.email || "").toLowerCase().trim() !== emailNorm) {
          return res.status(409).json({ error: "National ID already registered" });
        }
      }

      consumeEmailVerification(email);

      const user = await createUser({
        username: email.toLowerCase().split("@")[0],
        password,
        name,
        email,
        phone: phone || undefined,
        nationalId: nationalId || undefined,
        role: "client",
        permissions: ["dashboard", "client_portal"],
        isActive: false,
      });

      // Bridge: also create/link a customer (contacts) record so the client
      // appears in CRM customer management and can use the client portal
      // with their National ID + the same password.
      try {
        // Match strictly by the verified email — never by national ID alone,
        // so registration can never hijack another customer's portal account.
        const [existingContact] = await db.select().from(contacts)
          .where(eq(contacts.email, emailNorm)).limit(1);
        const portalHash = await hashPassword(String(password));
        if (existingContact) {
          // Only attach the national ID if the contact has none, and never
          // overwrite an existing portal password unless portal was disabled.
          const nidToSet = existingContact.nationalId || nid || null;
          await db.update(contacts).set({
            nationalId: nidToSet,
            phone: existingContact.phone || phone || null,
            portalEnabled: existingContact.portalEnabled || !!nidToSet,
            ...(existingContact.portalPasswordHash ? {} : { portalPasswordHash: portalHash }),
            updatedAt: new Date(),
          }).where(eq(contacts.id, existingContact.id));
        } else {
          await db.insert(contacts).values({
            nameAr: name,
            nameEn: name,
            email: emailNorm,
            phone: phone || null,
            mobile: phone || null,
            type: "customer",
            source: "registration",
            isActive: true,
            nationalId: nid || null,
            portalEnabled: !!nid,
            portalPasswordHash: portalHash,
          } as any);
        }
      } catch (bridgeErr) {
        console.error("Register contact-bridge error:", bridgeErr);
      }

      const { password: _, ...safeUser } = user;

      // Notify all admin users that a new registration is pending activation
      try {
        const adminUsers = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin"));
        for (const admin of adminUsers) {
          await db.insert(notifications).values({
            companyId: null,
            userId: admin.id,
            type: "user_registration",
            titleAr: "طلب تسجيل ينتظر التفعيل",
            titleEn: "New registration pending activation",
            message: `${user.name} (${user.email})`,
            module: "users",
            entityId: String(user.id),
          }).catch(() => {});
        }
      } catch {}

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

  // Lightweight endpoint — returns count of inactive (pending approval) users for sidebar badge
  app.get("/api/users/pending-count", async (_req, res) => {
    try {
      const pending = await db.select({ id: users.id }).from(users).where(eq(users.isActive, false));
      res.json({ count: pending.length });
    } catch {
      res.json({ count: 0 });
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
      mustChangePassword: !!c.portalMustChange,
    };
  }

  function sanitizeAssignee(u: any | null) {
    if (!u) return null;
    const name = (u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim()) || "—";
    return { name }; // Name only — no internal ids/emails leak to portal users.
  }

  // ── Portal OTP stores (in-memory, node-scoped) ──────────────────────────
  // loginTempStore: key=tempKey → {contactId, code, expiry}
  // signOtpStore:  key=contactId → {code, expiry}
  const loginTempStore = new Map<string, { contactId: number; code: string; expiry: number }>();
  const signOtpStore   = new Map<number, { code: string; expiry: number }>();

  function genPortalOtp(): string {
    return String(Math.floor(100000 + Math.random() * 900000));
  }
  // Portal OTP delivery config (stored in app_data, editable by admin in System Admin).
  // SMS is OFF by default until the business subscribes to an SMS provider.
  async function getPortalOtpConfig(): Promise<{ smsEnabled: boolean }> {
    try {
      const rows = await db.select().from(appData).where(eq(appData.key, "portal_otp_config"));
      const v = rows[0]?.value as any;
      return { smsEnabled: !!(v && v.smsEnabled) };
    } catch {
      return { smsEnabled: false };
    }
  }
  function maskPhone(p: string): string {
    if (!p || p.length < 4) return "****";
    return p.slice(0, -4).replace(/\d/g, "•") + p.slice(-4);
  }
  function maskEmail(e: string): string {
    const [user, domain] = String(e || "").split("@");
    if (!domain || !user) return "****";
    const shown = user.slice(0, Math.min(2, user.length));
    return `${shown}${"•".repeat(Math.max(1, user.length - shown.length))}@${domain}`;
  }
  async function dispatchSms(phone: string, code: string, contactId: number): Promise<string | undefined> {
    const sid   = process.env.TWILIO_ACCOUNT_SID;
    const auth  = process.env.TWILIO_AUTH_TOKEN;
    const from  = process.env.TWILIO_FROM_NUMBER;
    if (sid && auth && from) {
      try {
        const body = `رمز التحقق من Scapex: ${code} (صالح 10 دقائق)`;
        const basicAuth = Buffer.from(`${sid}:${auth}`).toString("base64");
        await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
          method: "POST",
          headers: { Authorization: `Basic ${basicAuth}`, "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ To: phone, From: from, Body: body }).toString(),
        });
        return undefined;
      } catch (e) { console.error("[Portal OTP] SMS error:", e); }
    }
    console.log(`\n🔐 [Portal OTP - DEV] Contact ${contactId} | ${phone} | CODE: ${code}\n`);
    return code; // dev mode: expose to frontend for testing
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
        console.warn(`[portal] ambiguous login nationalId=${nationalId} matches=${matches.length}`);
        return res.status(409).json({ error: "Ambiguous account — contact your administrator" });
      }
      const matched = matches[0];
      await db.update(contacts).set({ portalLastLogin: new Date() }).where(eq(contacts.id, matched.id));

      const phone = (matched.mobile || matched.phone || "").trim();
      if (phone) {
        const code = genPortalOtp();
        const tempKey = Math.random().toString(36).slice(2) + Date.now().toString(36);
        loginTempStore.set(tempKey, { contactId: matched.id, code, expiry: Date.now() + 10 * 60 * 1000 });
        const devCode = await dispatchSms(phone, code, matched.id);
        return res.json({ requiresOtp: true, tempKey, hint: maskPhone(phone), devCode });
      }

      const token = signPortalToken(matched.id);
      res.json({ token, contact: sanitizeContact(matched) });
    } catch (err: any) {
      console.error("Portal login error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/portal/login/verify-otp", async (req, res) => {
    try {
      const { tempKey, code } = req.body || {};
      if (!tempKey || !code) return res.status(400).json({ error: "tempKey and code are required" });
      const stored = loginTempStore.get(String(tempKey));
      if (!stored) return res.status(401).json({ error: "انتهت الجلسة. يرجى المحاولة من جديد." });
      if (Date.now() > stored.expiry) {
        loginTempStore.delete(String(tempKey));
        return res.status(401).json({ error: "انتهت صلاحية الرمز. يرجى تسجيل الدخول من جديد." });
      }
      if (stored.code !== String(code).trim()) {
        return res.status(401).json({ error: "الرمز غير صحيح. يرجى المحاولة مجدداً." });
      }
      loginTempStore.delete(String(tempKey));
      const [contact] = await db.select().from(contacts).where(eq(contacts.id, stored.contactId));
      if (!contact) return res.status(404).json({ error: "Account not found" });
      const token = signPortalToken(stored.contactId);
      res.json({ token, contact: sanitizeContact(contact) });
    } catch (err: any) {
      console.error("Portal verify OTP error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/portal/me", async (req, res) => {
    const me = await requirePortalContact(req, res);
    if (!me) return;
    res.json({ contact: sanitizeContact(me) });
  });

  app.post("/api/portal/change-password", async (req, res) => {
    try {
      const me = await requirePortalContact(req, res);
      if (!me) return;
      const { currentPassword, newPassword } = req.body || {};
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "currentPassword and newPassword are required" });
      }
      if (String(newPassword).length < 8) {
        return res.status(400).json({ error: "كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل" });
      }
      if (String(newPassword) === String(currentPassword)) {
        return res.status(400).json({ error: "كلمة المرور الجديدة يجب أن تختلف عن الحالية" });
      }
      const ok = me.portalPasswordHash && await verifyPwd(String(currentPassword), me.portalPasswordHash as string);
      if (!ok) return res.status(401).json({ error: "كلمة المرور الحالية غير صحيحة" });
      const hash = await hashPassword(String(newPassword));
      await db.update(contacts).set({
        portalPasswordHash: hash,
        portalMustChange: false,
        updatedAt: new Date(),
      } as any).where(eq(contacts.id, me.id));
      res.json({ success: true });
    } catch (err: any) {
      console.error("Portal change password error:", err);
      res.status(500).json({ error: "Server error" });
    }
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
      // DMS docs linked to this project (fileUrl-based, accessLevel gated).
      const dmsDocs = await db.select().from(documents).where(eq(documents.projectId, proj.id));
      const dmsVisible = dmsDocs.filter((d) => d.accessLevel === "client" || d.accessLevel === "public");

      // CRM docs (company-level contactId + deal-level dealId) with clientVisible=true.
      const crmDocs = await portalOwnedDocs(me.id);

      // Merge, deduplicate by id (DMS first so its entries win on collision).
      const seen = new Set<number>();
      const merged: any[] = [];
      for (const d of [...dmsVisible, ...crmDocs]) {
        if (!seen.has(d.id)) { seen.add(d.id); merged.push(d); }
      }

      res.json(merged.map((d: any) => ({
        id: d.id,
        titleAr: d.titleAr, titleEn: d.titleEn,
        type: d.type, mimeType: d.mimeType,
        fileSize: d.fileSize, version: d.version,
        fileUrl: d.fileUrl || null,
        hasBlob: !!d.fileContent,
        source: d.folder === "portal-upload" ? "client" : "staff",
        scope: d.projectId != null ? "project" : d.dealId != null ? "deal" : "company",
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

  // ── Portal documents (company-level + deal-level for the logged-in client) ──
  // Returns documents linked to the client's contact record OR to any deal that
  // belongs to the client, that staff have marked visible (clientVisible !== false).
  async function portalOwnedDocs(contactId: number) {
    const myDeals = await db.select({ id: deals.id }).from(deals).where(eq(deals.contactId, contactId));
    const dealIds = myDeals.map((d) => d.id);
    const rows = await db.select().from(documents).orderBy(desc(documents.createdAt));
    return rows.filter((d: any) => {
      if (d.clientVisible === false) return false;
      const isCompany = d.contactId === contactId;
      const isDeal = d.dealId != null && dealIds.includes(d.dealId);
      if (!isCompany && !isDeal) return false;
      return !!d.fileContent;
    });
  }

  app.get("/api/portal/documents", async (req, res) => {
    const me = await requirePortalContact(req, res);
    if (!me) return;
    try {
      const docs = await portalOwnedDocs(me.id);
      res.json(docs.map((d: any) => ({
        id: d.id, titleAr: d.titleAr, titleEn: d.titleEn,
        category: d.category, type: d.type,
        originalName: d.originalName, mimeType: d.mimeType,
        fileSize: d.fileSize, version: d.version,
        source: d.folder === "portal-upload" ? "client" : "staff",
        scope: d.dealId != null && d.contactId !== me.id ? "deal" : "company",
        createdAt: d.createdAt,
      })));
    } catch (err: any) {
      console.error("Portal documents error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/portal/documents/:id/file", async (req, res) => {
    const me = await requirePortalContact(req, res);
    if (!me) return;
    try {
      const docs = await portalOwnedDocs(me.id);
      const doc: any = docs.find((d: any) => d.id === Number(req.params.id));
      if (!doc || !doc.fileContent) { res.status(404).json({ error: "Not found" }); return; }
      const buffer = Buffer.from(doc.fileContent, "base64");
      res.setHeader("Content-Type", doc.mimeType || "application/octet-stream");
      res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(doc.originalName || doc.titleAr || "file")}"`);
      res.setHeader("Content-Length", buffer.length);
      res.send(buffer);
    } catch (err: any) {
      console.error("Portal document file error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Client uploads — PDF only (defence in depth: mime + extension + magic bytes).
  app.post("/api/portal/documents", async (req, res) => {
    const me = await requirePortalContact(req, res);
    if (!me) return;
    try {
      const b = req.body || {};
      const fileContent: string = typeof b.fileContent === "string" ? b.fileContent : "";
      const originalName: string = (b.originalName || "").toString();
      if (!fileContent) return res.status(400).json({ error: "File is required" });
      if (!/\.pdf$/i.test(originalName)) return res.status(400).json({ error: "Only PDF files are allowed" });
      if (b.mimeType !== "application/pdf") return res.status(400).json({ error: "Only PDF files are allowed" });
      let buffer: Buffer;
      try { buffer = Buffer.from(fileContent, "base64"); }
      catch { return res.status(400).json({ error: "Invalid file" }); }
      if (buffer.length > 15 * 1024 * 1024) return res.status(400).json({ error: "File too large (max 15MB)" });
      // Magic bytes: a valid PDF starts with "%PDF-".
      if (buffer.subarray(0, 5).toString("latin1") !== "%PDF-") {
        return res.status(400).json({ error: "Only PDF files are allowed" });
      }
      const title = (b.titleAr || originalName.replace(/\.[^.]+$/, "") || "مستند").toString();
      const year = new Date().getFullYear();
      const countResult = await db.select().from(documents);
      const seq = String(countResult.length + 1).padStart(4, "0");
      const [doc] = await db.insert(documents).values({
        titleAr: title,
        titleEn: b.titleEn || null,
        docNo: `PORTAL-${year}-${seq}`,
        category: "client-upload",
        folder: "portal-upload",
        status: "active",
        fileContent,
        originalName,
        mimeType: "application/pdf",
        fileSize: buffer.length,
        contactId: me.id,
        dealId: null,
        tags: [],
        version: 1,
        accessLevel: "client",
        clientVisible: true,
        uploadedByName: (me.nameAr || me.nameEn || "Client").toString(),
      } as any).returning();
      res.json({ id: doc.id, titleAr: doc.titleAr });
    } catch (err: any) {
      console.error("Portal document upload error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/portal/sign-otp", async (req, res) => {
    const me = await requirePortalContact(req, res);
    if (!me) return;
    try {
      const isDev = process.env.NODE_ENV !== "production";
      const channel = req.body?.channel === "email" ? "email" : "sms";
      const phone = ((me as any).mobile || (me as any).phone || "").trim();
      const email = ((me as any).email || "").trim();
      const code = genPortalOtp();

      if (channel === "email") {
        if (!email) return res.json({ ok: false, noEmail: true });
        signOtpStore.set(me.id, { code, expiry: Date.now() + 10 * 60 * 1000 });
        const sent = await sendVerificationEmail(email, code);
        // Never leak the code in production. Only expose in dev when delivery failed.
        return res.json({ ok: true, channel: "email", hint: maskEmail(email), devCode: (isDev && !sent) ? code : undefined });
      }

      // channel === "sms" — only allowed when the admin has enabled it (source of truth).
      // Requires a paid SMS provider e.g. Twilio; otherwise dev code is returned in dev only.
      const otpCfg = await getPortalOtpConfig();
      if (!otpCfg.smsEnabled) return res.json({ ok: false, smsDisabled: true });
      if (!phone) return res.json({ ok: true, noPhone: true });
      signOtpStore.set(me.id, { code, expiry: Date.now() + 10 * 60 * 1000 });
      const devCode = await dispatchSms(phone, code, me.id);
      res.json({ ok: true, channel: "sms", hint: maskPhone(phone), devCode: isDev ? devCode : undefined });
    } catch (err: any) {
      console.error("Portal sign-otp error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/portal/proposals", async (req, res) => {
    const me = await requirePortalContact(req, res);
    if (!me) return;
    try {
      const conds: ReturnType<typeof eq>[] = [eq(proposals.contactId, me.id)];
      if (me.email) conds.push(eq(proposals.clientEmail, me.email));
      if (me.nameAr) conds.push(eq(proposals.clientName, me.nameAr));
      if (me.nameEn) conds.push(eq(proposals.clientName, me.nameEn));
      const rows = await db.select().from(proposals)
        .where(or(...conds))
        .orderBy(desc(proposals.createdAt));
      res.json(rows.map((p) => ({
        id: p.id,
        proposalNumber: p.proposalNumber,
        projectName: p.projectName,
        subtotal: p.subtotal,
        vatAmount: p.vatAmount,
        total: p.total,
        currency: p.currency,
        status: p.status,
        createdAt: p.createdAt,
        clientApprovedAt: p.clientApprovedAt,
        clientSignedBy: p.clientSignedBy,
      })));
    } catch (err: any) {
      console.error("Portal proposals error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/portal/proposals/:id/approve", async (req, res) => {
    const me = await requirePortalContact(req, res);
    if (!me) return;
    try {
      const id = Number(req.params.id);
      const { signerName, signature, otp } = req.body || {};
      if (!signerName || !signature) return res.status(400).json({ error: "signerName and signature required" });
      const mePhone = ((me as any).mobile || (me as any).phone || "").trim();
      if (mePhone) {
        if (!otp) return res.status(400).json({ error: "otp_required" });
        const storedOtp = signOtpStore.get(me.id);
        if (!storedOtp || Date.now() > storedOtp.expiry) {
          signOtpStore.delete(me.id);
          return res.status(401).json({ error: "otp_expired" });
        }
        if (storedOtp.code !== String(otp).trim()) return res.status(401).json({ error: "otp_invalid" });
        signOtpStore.delete(me.id);
      }
      const [p] = await db.select().from(proposals).where(eq(proposals.id, id));
      if (!p) return res.status(404).json({ error: "Not found" });
      const allowed = p.contactId === me.id ||
        (me.email && p.clientEmail === me.email) ||
        p.clientName === me.nameAr ||
        (me.nameEn && p.clientName === me.nameEn);
      if (!allowed) return res.status(404).json({ error: "Not found" });
      if (p.status !== "sent") return res.status(400).json({ error: "Only proposals with status 'sent' can be approved" });
      await db.update(proposals).set({
        status: "approved",
        clientSignedBy: signerName,
        clientSignature: signature,
        clientApprovedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(proposals.id, id));
      res.json({ ok: true });
    } catch (err: any) {
      console.error("Portal approve proposal error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/portal/invoices", async (req, res) => {
    const me = await requirePortalContact(req, res);
    if (!me) return;
    try {
      const conds: ReturnType<typeof eq>[] = [eq(invoices.contactId, me.id)];
      if (me.nameAr) conds.push(eq(invoices.clientName, me.nameAr));
      if (me.nameEn) conds.push(eq(invoices.clientName, me.nameEn));
      const rows = await db.select().from(invoices)
        .where(or(...conds))
        .orderBy(desc(invoices.createdAt));
      res.json(rows.map((i) => ({
        id: i.id,
        invoiceNumber: i.invoiceNumber,
        clientName: i.clientName,
        issueDate: i.issueDate,
        dueDate: i.dueDate,
        total: i.total,
        paidAmount: i.paidAmount,
        currency: i.currency,
        status: i.status,
        createdAt: i.createdAt,
      })));
    } catch (err: any) {
      console.error("Portal invoices error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // ─── Portal: receipts (payments) + payment schedule ───────────────────────
  app.get("/api/portal/payments", async (req, res) => {
    const me = await requirePortalContact(req, res);
    if (!me) return;
    try {
      const rows = await db.select().from(payments)
        .where(and(eq(payments.contactId, me.id), eq(payments.type, "received")))
        .orderBy(desc(payments.date), desc(payments.createdAt));
      res.json(rows.map((p) => ({
        id: p.id,
        paymentNumber: p.paymentNumber,
        type: p.type,
        amount: p.amount,
        currency: p.currency,
        method: p.method,
        reference: p.reference,
        date: p.date,
        contractRef: p.contractRef,
        scheduleId: p.scheduleId,
        createdAt: p.createdAt,
      })));
    } catch (err: any) {
      console.error("Portal payments error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/portal/payment-schedule", async (req, res) => {
    const me = await requirePortalContact(req, res);
    if (!me) return;
    try {
      const ctrConds: ReturnType<typeof eq>[] = [eq(contracts.contactId, me.id)];
      if (me.nameAr) ctrConds.push(eq(contracts.clientName, me.nameAr));
      if (me.nameEn) ctrConds.push(eq(contracts.clientName, me.nameEn));
      const myContracts = await db.select().from(contracts).where(or(...ctrConds));
      const refs = Array.from(new Set(myContracts.map((c) => c.contractNumber)));
      // Only expose installments whose contract is provably owned by this contact
      // (no clientName-based schedule matching — names are not unique).
      if (!refs.length) return res.json([]);
      const rows = await db.select().from(contractPaymentSchedules)
        .where(inArray(contractPaymentSchedules.contractRef, refs))
        .orderBy(contractPaymentSchedules.contractRef, contractPaymentSchedules.installmentNumber);
      res.json(rows.map((s) => ({
        id: s.id,
        contractRef: s.contractRef,
        contractName: s.contractName,
        installmentNumber: s.installmentNumber,
        descriptionAr: s.descriptionAr,
        descriptionEn: s.descriptionEn,
        percentage: s.percentage,
        amount: s.amount,
        paidAmount: s.paidAmount,
        dueDate: s.dueDate,
        paidDate: s.paidDate,
        status: s.status,
      })));
    } catch (err: any) {
      console.error("Portal payment schedule error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/portal/contracts", async (req, res) => {
    const me = await requirePortalContact(req, res);
    if (!me) return;
    try {
      const conds: ReturnType<typeof eq>[] = [eq(contracts.contactId, me.id)];
      if (me.nameAr) conds.push(eq(contracts.clientName, me.nameAr));
      if (me.nameEn) conds.push(eq(contracts.clientName, me.nameEn));
      const rows = await db.select().from(contracts)
        .where(or(...conds))
        .orderBy(desc(contracts.createdAt));
      res.json(rows.map((c) => ({
        id: c.id,
        contractNumber: c.contractNumber,
        clientName: c.clientName,
        projectName: c.projectName,
        total: c.total,
        currency: c.currency,
        status: c.status,
        startDate: c.startDate,
        endDate: c.endDate,
        createdAt: c.createdAt,
        clientSignedAt: c.clientSignedAt,
        clientSignedBy: c.clientSignedBy,
      })));
    } catch (err: any) {
      console.error("Portal contracts error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/portal/contracts/:id/sign", async (req, res) => {
    const me = await requirePortalContact(req, res);
    if (!me) return;
    try {
      const id = Number(req.params.id);
      const { signerName, signature, otp } = req.body || {};
      if (!signerName || !signature) return res.status(400).json({ error: "signerName and signature required" });
      const mePhone = ((me as any).mobile || (me as any).phone || "").trim();
      if (mePhone) {
        if (!otp) return res.status(400).json({ error: "otp_required" });
        const storedOtp = signOtpStore.get(me.id);
        if (!storedOtp || Date.now() > storedOtp.expiry) {
          signOtpStore.delete(me.id);
          return res.status(401).json({ error: "otp_expired" });
        }
        if (storedOtp.code !== String(otp).trim()) return res.status(401).json({ error: "otp_invalid" });
        signOtpStore.delete(me.id);
      }
      const [c] = await db.select().from(contracts).where(eq(contracts.id, id));
      if (!c) return res.status(404).json({ error: "Not found" });
      const allowed = c.contactId === me.id ||
        c.clientName === me.nameAr ||
        (me.nameEn && c.clientName === me.nameEn);
      if (!allowed) return res.status(404).json({ error: "Not found" });
      if (c.clientSignedAt) return res.status(400).json({ error: "Contract already signed" });
      await db.update(contracts).set({
        clientSignedAt: new Date(),
        clientSignedBy: signerName,
        clientSignature: signature,
        status: "active",
        updatedAt: new Date(),
      }).where(eq(contracts.id, id));
      res.json({ ok: true });
    } catch (err: any) {
      console.error("Portal sign contract error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // ─── Portal: view proposal/contract/invoice as printable HTML ──────────────
  // ZATCA phase-1 e-invoice QR (TLV → base64 → QR data URL) — server-side
  function zatcaTlv(tag: number, value: string): Buffer {
    const v = Buffer.from(value || "", "utf8");
    return Buffer.concat([Buffer.from([tag, Math.min(v.length, 255)]), v]);
  }
  async function zatcaQrDataUrlServer(opts: { sellerName: string; vatNumber: string; timestamp: string; total: string; vat: string }): Promise<string> {
    try {
      const b64 = Buffer.concat([
        zatcaTlv(1, opts.sellerName),
        zatcaTlv(2, opts.vatNumber),
        zatcaTlv(3, opts.timestamp),
        zatcaTlv(4, opts.total),
        zatcaTlv(5, opts.vat),
      ]).toString("base64");
      return await QRCode.toDataURL(b64, { errorCorrectionLevel: "M", margin: 1, width: 220 });
    } catch { return ""; }
  }

  function portalDocHtml(opts: {
    title: string; number: string; clientName: string;
    projectName?: string | null; date?: string | null;
    rows: { desc: string; qty: string; unit: string; unitPrice: string; total: string }[];
    subtotal: string; vatRate?: string; vatAmount: string; total: string; currency: string;
    status?: string; notes?: string | null; terms?: string | null;
    extra?: string;
  }): string {
    const fmt = (v: string | null | undefined) => Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const itemRows = opts.rows.map(r => `
      <tr>
        <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;">${r.desc}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;text-align:center;">${r.qty}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;text-align:center;">${r.unit || "—"}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;text-align:right;font-family:monospace;">${fmt(r.unitPrice)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;text-align:right;font-family:monospace;font-weight:600;">${fmt(r.total)}</td>
      </tr>`).join("");
    return `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">
<title>${opts.title} — ${opts.number}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;background:#f8fafc;color:#1e293b;direction:rtl;font-size:13px}
  .page{max-width:860px;margin:30px auto;background:#fff;border-radius:12px;box-shadow:0 2px 20px rgba(0,0,0,.10);overflow:hidden}
  .hdr{background:linear-gradient(135deg,#1e40af 0%,#1d4ed8 100%);color:#fff;padding:28px 32px;display:flex;justify-content:space-between;align-items:flex-start}
  .hdr h1{font-size:22px;font-weight:700;margin-bottom:4px}
  .hdr .num{font-size:13px;opacity:.85;font-family:monospace}
  .meta-box{background:#f8fafc;border-bottom:1px solid #e2e8f0;padding:20px 32px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px}
  .meta-item label{display:block;font-size:10px;text-transform:uppercase;color:#94a3b8;font-weight:600;margin-bottom:3px;letter-spacing:.5px}
  .meta-item span{font-size:13px;font-weight:600;color:#1e293b}
  .section{padding:20px 32px}
  h3{font-size:13px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #e2e8f0}
  table{width:100%;border-collapse:collapse;font-size:12px}
  thead tr{background:#f1f5f9}
  thead th{padding:10px;text-align:right;font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.4px}
  thead th:nth-child(2),thead th:nth-child(3){text-align:center}
  thead th:nth-child(4),thead th:nth-child(5){text-align:right}
  .totals{margin-top:8px;display:flex;justify-content:flex-end}
  .totals-table{min-width:260px;font-size:13px}
  .totals-table td{padding:5px 10px}
  .totals-table .grand{background:#1e40af;color:#fff;font-weight:700;font-size:15px;border-radius:6px}
  .footer{background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;font-size:11px;color:#94a3b8;display:flex;justify-content:space-between}
  @media print{body{background:#fff}.page{box-shadow:none;margin:0;border-radius:0}}
</style>
</head><body>
<div class="page">
  <div class="hdr">
    <div><div style="font-size:11px;opacity:.7;margin-bottom:6px">${opts.title}</div>
    <h1>${opts.number}</h1>
    ${opts.projectName ? `<div class="num">${opts.projectName}</div>` : ""}
    </div>
    <div style="text-align:left">
      ${opts.status ? `<span style="background:rgba(255,255,255,.15);border-radius:20px;padding:4px 12px;font-size:12px">${opts.status}</span>` : ""}
      ${opts.date ? `<div style="margin-top:8px;font-size:11px;opacity:.8">${new Date(opts.date).toLocaleDateString("ar-SA", { year:"numeric", month:"long", day:"numeric" })}</div>` : ""}
    </div>
  </div>
  <div class="meta-box">
    <div class="meta-item"><label>العميل</label><span>${opts.clientName}</span></div>
    ${opts.projectName ? `<div class="meta-item"><label>المشروع</label><span>${opts.projectName}</span></div>` : ""}
    <div class="meta-item"><label>العملة</label><span>${opts.currency}</span></div>
  </div>
  ${opts.extra || ""}
  ${opts.rows.length > 0 ? `
  <div class="section">
    <h3>بنود ${opts.title}</h3>
    <table>
      <thead><tr>
        <th>الوصف</th><th style="text-align:center">الكمية</th><th style="text-align:center">الوحدة</th>
        <th style="text-align:right">سعر الوحدة</th><th style="text-align:right">الإجمالي</th>
      </tr></thead>
      <tbody>${itemRows}</tbody>
    </table>
    <div class="totals">
      <table class="totals-table">
        <tr><td style="color:#64748b">المجموع قبل الضريبة</td><td style="text-align:left;font-family:monospace">${fmt(opts.subtotal)} ${opts.currency}</td></tr>
        <tr><td style="color:#64748b">ضريبة القيمة المضافة (${opts.vatRate || 15}%)</td><td style="text-align:left;font-family:monospace">${fmt(opts.vatAmount)} ${opts.currency}</td></tr>
        <tr class="grand"><td style="padding:8px 10px;border-radius:6px 0 0 6px">الإجمالي الكلي</td><td style="text-align:left;font-family:monospace;padding:8px 10px;border-radius:0 6px 6px 0">${fmt(opts.total)} ${opts.currency}</td></tr>
      </table>
    </div>
  </div>` : `
  <div class="section">
    <div class="totals">
      <table class="totals-table">
        <tr><td style="color:#64748b">المجموع قبل الضريبة</td><td style="text-align:left;font-family:monospace">${fmt(opts.subtotal)} ${opts.currency}</td></tr>
        <tr><td style="color:#64748b">ضريبة القيمة المضافة</td><td style="text-align:left;font-family:monospace">${fmt(opts.vatAmount)} ${opts.currency}</td></tr>
        <tr class="grand"><td style="padding:8px 10px;border-radius:6px 0 0 6px">الإجمالي الكلي</td><td style="text-align:left;font-family:monospace;padding:8px 10px;border-radius:0 6px 6px 0">${fmt(opts.total)} ${opts.currency}</td></tr>
      </table>
    </div>
  </div>`}
  ${opts.notes ? `<div class="section"><h3>ملاحظات</h3><p style="color:#475569;font-size:12px;line-height:1.7">${opts.notes}</p></div>` : ""}
  ${opts.terms ? `<div class="section"><h3>الشروط والأحكام</h3><p style="color:#475569;font-size:12px;line-height:1.7;white-space:pre-line">${opts.terms}</p></div>` : ""}
  <div class="footer">
    <span>وثيقة إلكترونية — Scapex ERP</span>
    <div style="display:flex;gap:8px;align-items:center">
      <span>أُنشئت بتاريخ ${new Date().toLocaleDateString("ar-SA")}</span>
      <button onclick="window.print()" style="background:#1e40af;color:#fff;border:none;padding:6px 16px;border-radius:6px;font-size:12px;cursor:pointer;font-family:inherit">🖨 طباعة / حفظ PDF</button>
    </div>
  </div>
</div>
</body></html>`;
  }

  app.get("/api/portal/proposals/:id/html", async (req, res) => {
    const me = await requirePortalContact(req, res);
    if (!me) return;
    try {
      const id = Number(req.params.id);
      const [p] = await db.select().from(proposals).where(eq(proposals.id, id));
      if (!p) return res.status(404).json({ error: "Not found" });
      const allowed = p.contactId === me.id ||
        (me.email && p.clientEmail === me.email) ||
        p.clientName === me.nameAr || (me.nameEn && p.clientName === me.nameEn);
      if (!allowed) return res.status(404).json({ error: "Not found" });
      const items = await db.select().from(proposalItems).where(eq(proposalItems.proposalId, id)).orderBy(proposalItems.sortOrder);
      const STATUS_AR: Record<string, string> = { draft: "مسودة", sent: "مُرسل", approved: "مُوافق عليه", rejected: "مرفوض", converted_contract: "تحوّل لعقد", converted_invoice: "تحوّل لفاتورة" };
      const html = portalDocHtml({
        title: "عرض السعر", number: p.proposalNumber,
        clientName: p.clientName, projectName: p.projectName,
        date: p.createdAt?.toISOString() ?? null, currency: p.currency || "SAR",
        status: STATUS_AR[p.status || ""] || p.status || "",
        rows: items.map(i => ({ desc: i.descAr || i.descEn || "", qty: i.qty || "1", unit: i.unit || "", unitPrice: i.unitPrice || "0", total: i.total || "0" })),
        subtotal: p.subtotal || "0", vatRate: p.vatRate || "15", vatAmount: p.vatAmount || "0", total: p.total || "0",
        notes: p.notes, terms: p.terms,
        extra: p.introduction ? `<div class="section"><p style="color:#475569;font-size:12px;line-height:1.8">${p.introduction}</p></div>` : "",
      });
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(html);
    } catch (err: any) { res.status(500).json({ error: "Server error" }); }
  });

  app.get("/api/portal/contracts/:id/html", async (req, res) => {
    const me = await requirePortalContact(req, res);
    if (!me) return;
    try {
      const id = Number(req.params.id);
      const [c] = await db.select().from(contracts).where(eq(contracts.id, id));
      if (!c) return res.status(404).json({ error: "Not found" });
      const allowed = c.contactId === me.id || c.clientName === me.nameAr || (me.nameEn && c.clientName === me.nameEn);
      if (!allowed) return res.status(404).json({ error: "Not found" });
      const items = await db.select().from(contractItems).where(eq(contractItems.contractId, id)).orderBy(contractItems.sortOrder);
      const STATUS_AR: Record<string, string> = { draft: "مسودة", active: "نشط", expired: "منتهي", terminated: "مُنهى" };
      const dateMeta = (c.startDate || c.endDate || c.clientSignedAt) ? `<div class="meta-box" style="padding-top:12px;padding-bottom:12px">
        ${c.startDate ? `<div class="meta-item"><label>تاريخ البدء</label><span>${new Date(c.startDate).toLocaleDateString("ar-SA")}</span></div>` : ""}
        ${c.endDate ? `<div class="meta-item"><label>تاريخ الانتهاء</label><span>${new Date(c.endDate).toLocaleDateString("ar-SA")}</span></div>` : ""}
        ${c.clientSignedAt ? `<div class="meta-item"><label>وُقِّع بتاريخ</label><span>${new Date(c.clientSignedAt).toLocaleDateString("ar-SA")} — ${c.clientSignedBy || ""}</span></div>` : ""}
      </div>` : "";

      // Parse clauses from the JSON stored in `terms`
      let clausesHtml = "";
      let termsForGeneric: string | null = null;
      try {
        const parsed = c.terms ? JSON.parse(c.terms) : null;
        if (parsed && Array.isArray(parsed.clauses) && parsed.clauses.length > 0) {
          const esc2 = (s: string) => (s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
          clausesHtml = `<div class="section">
            <h3>بنود العقد والشروط والأحكام</h3>
            ${parsed.clauses.map((cl: any) => `
              <div style="margin-bottom:20px;padding:16px;background:#f8fafc;border-radius:8px;border-right:4px solid #1e40af">
                <p style="font-weight:700;color:#1e40af;font-size:13px;margin-bottom:8px">${esc2(cl.titleAr || cl.titleEn || "")}</p>
                <p style="color:#374151;font-size:12px;line-height:1.9;white-space:pre-line">${esc2(cl.bodyAr || cl.bodyEn || "")}</p>
              </div>`).join("")}
          </div>`;
        } else if (typeof c.terms === "string" && c.terms && !c.terms.startsWith("{")) {
          termsForGeneric = c.terms;
        }
      } catch {
        termsForGeneric = c.terms;
      }

      const extra = dateMeta + clausesHtml;
      const html = portalDocHtml({
        title: "العقد", number: c.contractNumber,
        clientName: c.clientName, projectName: c.projectName,
        date: c.createdAt?.toISOString() ?? null, currency: c.currency || "SAR",
        status: STATUS_AR[c.status || ""] || c.status || "",
        rows: items.map(i => ({ desc: i.descAr || i.descEn || "", qty: i.qty || "1", unit: i.unit || "", unitPrice: i.unitPrice || "0", total: i.total || "0" })),
        subtotal: c.subtotal || "0", vatRate: c.vatRate || "15", vatAmount: c.vatAmount || "0", total: c.total || "0",
        notes: null, terms: termsForGeneric, extra,
      });
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(html);
    } catch (err: any) { res.status(500).json({ error: "Server error" }); }
  });

  app.get("/api/portal/invoices/:id/html", async (req, res) => {
    const me = await requirePortalContact(req, res);
    if (!me) return;
    try {
      const id = Number(req.params.id);
      const [inv] = await db.select().from(invoices).where(eq(invoices.id, id));
      if (!inv) return res.status(404).json({ error: "Not found" });
      const allowed = inv.contactId === me.id || inv.clientName === me.nameAr || (me.nameEn && inv.clientName === me.nameEn);
      if (!allowed) return res.status(404).json({ error: "Not found" });
      const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, id));
      const STATUS_AR: Record<string, string> = { draft: "مسودة", sent: "مُرسلة", paid: "مدفوعة", overdue: "متأخرة", cancelled: "ملغاة" };
      // ZATCA phase-1 QR (seller name + VAT from company settings in app_data)
      let sellerName = "شركة سكابكس", sellerVat = "";
      try {
        const [aboutRow] = await db.select().from(appData).where(eq(appData.key, "scapex_about_settings"));
        const rawAbout = aboutRow?.value as any;
        const about = typeof rawAbout === "string" ? JSON.parse(rawAbout) : rawAbout;
        if (about && typeof about === "object") {
          sellerName = about.companyNameAr || about.companyNameEn || sellerName;
          sellerVat = about.vatNumber || "";
        }
      } catch {}
      const qrTs = inv.issueDate ? `${String(inv.issueDate).slice(0, 10)}T00:00:00Z` : (inv.createdAt?.toISOString() ?? new Date().toISOString());
      const qrUrl = await zatcaQrDataUrlServer({
        sellerName, vatNumber: sellerVat, timestamp: qrTs,
        total: Number(inv.total || 0).toFixed(2), vat: Number(inv.vatAmount || 0).toFixed(2),
      });
      const qrBlock = qrUrl ? `<div class="section" style="display:flex;justify-content:flex-end;padding-top:8px;padding-bottom:0">
        <div style="display:flex;flex-direction:column;align-items:center;gap:4px">
          <img src="${qrUrl}" style="width:110px;height:110px" alt="ZATCA QR"/>
          <div style="font-size:9px;color:#94a3b8">رمز الفاتورة الإلكترونية (زاتكا)</div>
        </div>
      </div>` : "";
      const extra = `<div class="meta-box" style="padding-top:12px;padding-bottom:12px">
        ${inv.issueDate ? `<div class="meta-item"><label>تاريخ الإصدار</label><span>${new Date(inv.issueDate).toLocaleDateString("ar-SA")}</span></div>` : ""}
        ${inv.dueDate ? `<div class="meta-item"><label>تاريخ الاستحقاق</label><span>${new Date(inv.dueDate).toLocaleDateString("ar-SA")}</span></div>` : ""}
        ${Number(inv.paidAmount || 0) > 0 ? `<div class="meta-item"><label>المبلغ المدفوع</label><span style="color:#16a34a">${Number(inv.paidAmount).toLocaleString()} ${inv.currency || "SAR"}</span></div>` : ""}
      </div>` + qrBlock;
      const html = portalDocHtml({
        title: "الفاتورة", number: inv.invoiceNumber,
        clientName: inv.clientName || "", projectName: null,
        date: inv.createdAt?.toISOString() ?? null, currency: inv.currency || "SAR",
        status: STATUS_AR[inv.status || ""] || inv.status || "",
        rows: items.map(i => ({ desc: i.descAr || i.descEn || "", qty: i.qty || "1", unit: i.unit || "", unitPrice: i.unitPrice || "0", total: i.total || "0" })),
        subtotal: inv.subtotal || "0", vatRate: "15", vatAmount: inv.vatAmount || "0", total: inv.total || "0",
        notes: inv.notes, terms: null, extra,
      });
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(html);
    } catch (err: any) { res.status(500).json({ error: "Server error" }); }
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
      await db.update(contacts).set({ portalPasswordHash: hash, portalMustChange: true, updatedAt: new Date() } as any).where(eq(contacts.id, id));
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
      if (!actor.roles.has("admin")) {
        return res.status(403).json({ error: "Admin access required" });
      }
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
    if (!(await isAdminOrManager(req))) return res.status(403).json({ error: "Forbidden" });
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
    if (!(await isAdminOrManager(req))) return res.status(403).json({ error: "Forbidden" });
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
    if (!(await isAdminOrManager(req))) return res.status(403).json({ error: "Forbidden" });
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
    if (!(await isAdminOrManager(req))) return res.status(403).json({ error: "Forbidden" });
    try {
      const [row] = await db.insert(departments).values({ nameAr: req.body.nameAr, nameEn: req.body.nameEn, isActive: true }).returning();
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/departments/:id", async (req, res) => {
    if (!(await isAdminOrManager(req))) return res.status(403).json({ error: "Forbidden" });
    try {
      const [row] = await db.update(departments).set({ nameAr: req.body.nameAr, nameEn: req.body.nameEn }).where(eq(departments.id, parseInt(req.params.id))).returning();
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.delete("/api/departments/:id", async (req, res) => {
    if (!(await isAdminOrManager(req))) return res.status(403).json({ error: "Forbidden" });
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
    if (!(await isAdminOrManager(req))) return res.status(403).json({ error: "Forbidden" });
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
    if (!(await isAdminOrManager(req))) return res.status(403).json({ error: "Forbidden" });
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
    if (!(await isAdminOrManager(req))) return res.status(403).json({ error: "Forbidden" });
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
    if (!(await isAdminOrManager(req))) return res.status(403).json({ error: "Forbidden" });
    try { await db.delete(inventoryItems).where(eq(inventoryItems.id, parseInt(req.params.id))); res.json({ success: true }); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/stock-movements", async (req, res) => {
    if (!(await isAdminOrManager(req))) return res.status(403).json({ error: "Forbidden" });
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
    if (!(await isAdminOrManager(req))) return res.status(403).json({ error: "Forbidden" });
    try {
      const b = req.body;
      const [row] = await db.insert(vendors).values({ nameAr: b.nameAr, nameEn: b.nameEn, contactPerson: b.contactPerson, email: b.email, phone: b.phone, vatNumber: b.vatNumber || b.vatNo, address: b.address, category: b.category, rating: b.rating || 0, isActive: b.status !== "inactive" }).returning();
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/vendors/:id", async (req, res) => {
    if (!(await isAdminOrManager(req))) return res.status(403).json({ error: "Forbidden" });
    try {
      const b = req.body;
      const [row] = await db.update(vendors).set({ nameAr: b.nameAr, nameEn: b.nameEn, contactPerson: b.contactPerson, email: b.email, phone: b.phone, vatNumber: b.vatNumber || b.vatNo, category: b.category, rating: b.rating, isActive: b.status !== "inactive" }).where(eq(vendors.id, parseInt(req.params.id))).returning();
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.delete("/api/vendors/:id", async (req, res) => {
    if (!(await isAdminOrManager(req))) return res.status(403).json({ error: "Forbidden" });
    try { await db.delete(vendors).where(eq(vendors.id, parseInt(req.params.id))); res.json({ success: true }); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.get("/api/purchase-orders", async (_req, res) => {
    try {
      const [pos, vens, items] = await Promise.all([
        db.select().from(purchaseOrders).orderBy(desc(purchaseOrders.createdAt)),
        db.select().from(vendors),
        db.select().from(purchaseOrderItems),
      ]);
      const vById = new Map(vens.map((v) => [v.id, v]));
      const itemsByPo = new Map<number, typeof items>();
      for (const it of items) {
        const arr = itemsByPo.get(it.poId) || [];
        arr.push(it);
        itemsByPo.set(it.poId, arr);
      }
      res.json(pos.map((p) => {
        const v = p.vendorId ? vById.get(p.vendorId) : undefined;
        return { ...p, vendorNameAr: v?.nameAr || null, vendorNameEn: v?.nameEn || null, vendorVat: v?.vatNumber || null, dbItems: itemsByPo.get(p.id) || [] };
      }));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/purchase-orders", async (req, res) => {
    if (!(await isAdminOrManager(req))) return res.status(403).json({ error: "Forbidden" });
    try {
      const b = req.body;
      const [row] = await db.insert(purchaseOrders).values({
        poNumber: b.poNumber, vendorId: b.vendorId ? parseInt(b.vendorId) : null,
        subtotal: String(b.subtotal || 0), vatAmount: String(b.vatAmount || 0), total: String(b.total || 0),
        status: b.status || "draft", deliveryDate: b.deliveryDate || b.expectedDate || null,
        terms: b.terms || null, notes: b.notes || null, createdBy: b.createdBy || null,
      }).returning();
      if (b.items?.length) {
        await db.insert(purchaseOrderItems).values(b.items.map((it: any) => ({
          poId: row.id, descAr: it.nameAr || it.name, descEn: it.nameEn || it.name,
          qty: String(it.qty || 1), unit: it.unit, unitPrice: String(it.unitPrice || 0),
          total: String((it.qty || 1) * (it.unitPrice || 0)),
          inventoryItemId: it.inventoryItemId ? parseInt(it.inventoryItemId) : null,
        })));
      }
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/purchase-orders/:id", async (req, res) => {
    if (!(await isAdminOrManager(req))) return res.status(403).json({ error: "Forbidden" });
    try {
      const b = req.body;
      const upd: any = { updatedAt: new Date() };
      if (b.status !== undefined) upd.status = b.status;
      if (b.notes !== undefined) upd.notes = b.notes;
      if (b.terms !== undefined) upd.terms = b.terms;
      if (b.deliveryDate !== undefined || b.expectedDate !== undefined) upd.deliveryDate = b.deliveryDate || b.expectedDate || null;
      if (b.total !== undefined) upd.total = String(b.total || 0);
      if (b.subtotal !== undefined) upd.subtotal = String(b.subtotal || 0);
      if (b.vatAmount !== undefined) upd.vatAmount = String(b.vatAmount || 0);
      const [row] = await db.update(purchaseOrders).set(upd).where(eq(purchaseOrders.id, parseInt(req.params.id))).returning();
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.delete("/api/purchase-orders/:id", async (req, res) => {
    if (!(await isAdminOrManager(req))) return res.status(403).json({ error: "Forbidden" });
    try {
      const id = parseInt(req.params.id);
      await db.update(payments).set({ poId: null, poScheduleId: null }).where(eq(payments.poId, id));
      await db.delete(poPaymentSchedules).where(eq(poPaymentSchedules.poId, id));
      await db.delete(purchaseOrderItems).where(eq(purchaseOrderItems.poId, id));
      await db.delete(purchaseOrders).where(eq(purchaseOrders.id, id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.get("/api/purchase-orders/:id/items", async (req, res) => {
    try { res.json(await db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.poId, parseInt(req.params.id)))); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ─────── PO approval flow (اعتماد أوامر الشراء) ─────────────────────────
  app.post("/api/purchase-orders/:id/submit-approval", async (req, res) => {
    try {
      const actorId = staffUserId(req);
      if (!actorId) return res.status(401).json({ error: "Unauthorized" });
      const id = parseInt(req.params.id);
      const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id));
      if (!po) return res.status(404).json({ error: "Not found" });
      if (po.status !== "draft") return res.status(400).json({ error: "Only draft orders can be submitted for approval" });
      const [row] = await db.update(purchaseOrders).set({ status: "pending_approval", updatedAt: new Date() }).where(eq(purchaseOrders.id, id)).returning();
      // Notify admins/managers
      try {
        const allUsers = await db.select().from(users);
        const approvers = allUsers.filter((u) => {
          const r = new Set<string>([u.role || "", ...((u.roles as string[]) || [])]);
          return (r.has("admin") || r.has("manager")) && u.id !== actorId;
        });
        for (const u of approvers) {
          await db.insert(notifications).values({
            userId: u.id,
            titleAr: "أمر شراء بانتظار الاعتماد",
            titleEn: "Purchase order pending approval",
            message: `${po.poNumber} — ${parseFloat(po.total || "0").toLocaleString()} ${po.currency || "SAR"}`,
            type: "po_approval", module: "purchases", entityId: String(po.id), link: "/purchases",
          });
        }
      } catch (e) { console.error("PO approval notify:", e); }
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/purchase-orders/:id/approve", async (req, res) => {
    if (!(await isAdminOrManager(req))) return res.status(403).json({ error: "Forbidden" });
    try {
      const actorId = staffUserId(req);
      const id = parseInt(req.params.id);
      const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id));
      if (!po) return res.status(404).json({ error: "Not found" });
      if (po.status !== "pending_approval" && po.status !== "draft") return res.status(400).json({ error: "Order is not awaiting approval" });
      const [row] = await db.update(purchaseOrders).set({ status: "approved", approvedBy: actorId, updatedAt: new Date() }).where(eq(purchaseOrders.id, id)).returning();
      if (po.createdBy && po.createdBy !== actorId) {
        try {
          await db.insert(notifications).values({
            userId: po.createdBy,
            titleAr: "تم اعتماد أمر الشراء", titleEn: "Purchase order approved",
            message: po.poNumber, type: "po_approved", module: "purchases", entityId: String(po.id), link: "/purchases",
          });
        } catch {}
      }
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/purchase-orders/:id/reject", async (req, res) => {
    if (!(await isAdminOrManager(req))) return res.status(403).json({ error: "Forbidden" });
    try {
      const actorId = staffUserId(req);
      const id = parseInt(req.params.id);
      const reason = (req.body?.reason || "").toString().slice(0, 500);
      const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id));
      if (!po) return res.status(404).json({ error: "Not found" });
      if (po.status !== "pending_approval") return res.status(400).json({ error: "Order is not awaiting approval" });
      const [row] = await db.update(purchaseOrders).set({ status: "draft", updatedAt: new Date() }).where(eq(purchaseOrders.id, id)).returning();
      if (po.createdBy && po.createdBy !== actorId) {
        try {
          await db.insert(notifications).values({
            userId: po.createdBy,
            titleAr: "تم رفض أمر الشراء", titleEn: "Purchase order rejected",
            message: `${po.poNumber}${reason ? ` — ${reason}` : ""}`,
            type: "po_rejected", module: "purchases", entityId: String(po.id), link: "/purchases",
          });
        } catch {}
      }
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ─────── PO receive → stock movements (استلام أمر الشراء → المخزون) ──────
  app.post("/api/purchase-orders/:id/receive", async (req, res) => {
    if (!(await isAdminOrManager(req))) return res.status(403).json({ error: "Forbidden" });
    try {
      const actorId = staffUserId(req);
      const id = parseInt(req.params.id);
      const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id));
      if (!po) return res.status(404).json({ error: "Not found" });
      if (po.status === "received" || po.status === "cancelled") return res.status(400).json({ error: "Order already closed" });
      const items = await db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.poId, id));
      let moved = 0, skipped = 0;
      await db.transaction(async (tx) => {
        for (const it of items) {
          const qty = parseFloat(it.qty || "0") || 0;
          const already = parseFloat(it.receivedQty || "0") || 0;
          const remaining = qty - already;
          if (remaining <= 0) continue;
          if (!it.inventoryItemId) { skipped++; continue; }
          const [invItem] = await tx.select().from(inventoryItems).where(eq(inventoryItems.id, it.inventoryItemId));
          if (!invItem) { skipped++; continue; }
          await tx.insert(stockMovements).values({
            itemId: it.inventoryItemId, warehouseId: invItem.warehouseId,
            type: "in", qty: String(remaining),
            reference: po.poNumber, notes: `استلام أمر شراء ${po.poNumber}`,
            createdBy: actorId || null,
          });
          const cur = parseFloat(invItem.currentQty as string) || 0;
          const newQty = cur + remaining;
          await tx.update(inventoryItems).set({
            currentQty: String(newQty),
            totalValue: String(newQty * (parseFloat(invItem.unitCost as string) || 0)),
            lastRestocked: new Date(), updatedAt: new Date(),
          }).where(eq(inventoryItems.id, it.inventoryItemId));
          await tx.update(purchaseOrderItems).set({ receivedQty: String(qty) }).where(eq(purchaseOrderItems.id, it.id));
          moved++;
        }
        await tx.update(purchaseOrders).set({ status: "received", updatedAt: new Date() }).where(eq(purchaseOrders.id, id));
      });
      res.json({ success: true, movedItems: moved, skippedItems: skipped });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ─────── PO payment schedules (جدول دفعات الموردين) ──────────────────────
  const poSchedWithLiveStatus = (s: any) => {
    let status = s.status || "pending";
    if (status === "pending" && s.dueDate && new Date(s.dueDate) < new Date()) status = "overdue";
    return { ...s, status };
  };
  app.get("/api/po-payment-schedules", async (req, res) => {
    try {
      const poId = req.query.poId ? parseInt(req.query.poId as string) : null;
      const rows = poId
        ? await db.select().from(poPaymentSchedules).where(eq(poPaymentSchedules.poId, poId)).orderBy(poPaymentSchedules.installmentNumber)
        : await db.select().from(poPaymentSchedules).orderBy(poPaymentSchedules.poId, poPaymentSchedules.installmentNumber);
      res.json(rows.map(poSchedWithLiveStatus));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/po-payment-schedules", async (req, res) => {
    if (!(await isAdminOrManager(req))) return res.status(403).json({ error: "Forbidden" });
    try {
      const b = req.body;
      if (!b.poId) return res.status(400).json({ error: "poId is required" });
      let status = b.status || "pending";
      if (status === "pending" && b.dueDate && new Date(b.dueDate) < new Date()) status = "overdue";
      const [row] = await db.insert(poPaymentSchedules).values({
        poId: parseInt(b.poId), installmentNumber: parseInt(b.installmentNumber || 1),
        descriptionAr: b.descriptionAr || null, descriptionEn: b.descriptionEn || null,
        amount: String(b.amount || 0), dueDate: b.dueDate || null, status,
        notes: b.notes || null,
      }).returning();
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/po-payment-schedules/:id", async (req, res) => {
    if (!(await isAdminOrManager(req))) return res.status(403).json({ error: "Forbidden" });
    try {
      const b = req.body;
      const upd: any = { updatedAt: new Date() };
      if (b.installmentNumber !== undefined) upd.installmentNumber = parseInt(b.installmentNumber);
      if (b.descriptionAr !== undefined) upd.descriptionAr = b.descriptionAr;
      if (b.descriptionEn !== undefined) upd.descriptionEn = b.descriptionEn;
      if (b.amount !== undefined) upd.amount = String(b.amount || 0);
      if (b.dueDate !== undefined) upd.dueDate = b.dueDate || null;
      if (b.status !== undefined) upd.status = b.status;
      if (b.notes !== undefined) upd.notes = b.notes;
      const [row] = await db.update(poPaymentSchedules).set(upd).where(eq(poPaymentSchedules.id, parseInt(req.params.id))).returning();
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.delete("/api/po-payment-schedules/:id", async (req, res) => {
    if (!(await isAdminOrManager(req))) return res.status(403).json({ error: "Forbidden" });
    try {
      const id = parseInt(req.params.id);
      await db.update(payments).set({ poScheduleId: null }).where(eq(payments.poScheduleId, id));
      await db.delete(poPaymentSchedules).where(eq(poPaymentSchedules.id, id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ASSETS & EQUIPMENT
  // ═══════════════════════════════════════════════════════════════════════════
  app.get("/api/asset-categories", async (_req, res) => {
    try { res.json(await db.select().from(assetCategories)); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/asset-categories", async (req, res) => {
    if (!(await isAdminOrManager(req))) return res.status(403).json({ error: "Forbidden" });
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
    if (!(await isAdminOrManager(req))) return res.status(403).json({ error: "Forbidden" });
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
    if (!(await isAdminOrManager(req))) return res.status(403).json({ error: "Forbidden" });
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
    if (!(await isAdminOrManager(req))) return res.status(403).json({ error: "Forbidden" });
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
    if (!(await isAdminOrManager(req))) return res.status(403).json({ error: "Forbidden" });
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
    if (!(await isAdminOrManager(req))) return res.status(403).json({ error: "Forbidden" });
    try { await db.delete(maintenanceRecords).where(eq(maintenanceRecords.id, parseInt(req.params.id))); res.json({ success: true }); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/maintenance-records", async (req, res) => {
    if (!(await isAdminOrManager(req))) return res.status(403).json({ error: "Forbidden" });
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
    if (!(await isAdminOrManager(req))) return res.status(403).json({ error: "Forbidden" });
    try {
      const b = req.body;
      const [row] = await db.insert(payrollBatches).values({ month: b.month, year: b.year, status: b.status || "draft", totalGross: String(b.totalGross || 0), totalDeductions: String(b.totalDeductions || 0), totalNet: String(b.totalNet || 0), employeeCount: b.employeeCount || 0 }).returning();
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/payroll-batches/:id", async (req, res) => {
    if (!(await isAdminOrManager(req))) return res.status(403).json({ error: "Forbidden" });
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

  // ─────── Attendance Records ──────────────────────────────────────────────────
  app.get("/api/attendance-records", async (req, res) => {
    try {
      const date = req.query.date as string | undefined;
      const rows = await db
        .select({
          id: attendanceRecords.id,
          employeeId: attendanceRecords.employeeId,
          employeeNumber: employees.employeeNumber,
          nameAr: employees.nameAr,
          nameEn: employees.nameEn,
          departmentName: employees.departmentName,
          date: attendanceRecords.date,
          checkIn: attendanceRecords.checkIn,
          checkOut: attendanceRecords.checkOut,
          status: attendanceRecords.status,
          location: attendanceRecords.location,
          notes: attendanceRecords.notes,
          workedHours: attendanceRecords.workedHours,
          overtimeHours: attendanceRecords.overtimeHours,
          activityId: attendanceRecords.activityId,
        })
        .from(attendanceRecords)
        .leftJoin(employees, eq(attendanceRecords.employeeId, employees.id))
        .orderBy(desc(attendanceRecords.createdAt));
      const result = date ? rows.filter(r => r.date === date) : rows;
      res.json(result);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/attendance-records", async (req, res) => {
    try {
      const b = req.body;
      const [row] = await db.insert(attendanceRecords).values({
        employeeId: parseInt(b.employeeId),
        date: b.date,
        checkIn: b.checkIn ? new Date(b.checkIn) : undefined,
        checkOut: b.checkOut ? new Date(b.checkOut) : undefined,
        status: b.status || "present",
        location: b.location || null,
        notes: b.notes || null,
        workedHours: b.workedHours != null ? String(b.workedHours) : null,
        overtimeHours: b.overtimeHours != null ? String(b.overtimeHours) : null,
        activityId: b.activityId || null,
      }).returning();
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/attendance-records/:id", async (req, res) => {
    try {
      const b = req.body;
      const updates: Partial<typeof attendanceRecords.$inferInsert> = {};
      if (b.status !== undefined) updates.status = b.status;
      if (b.checkIn !== undefined) updates.checkIn = b.checkIn ? new Date(b.checkIn) : null;
      if (b.checkOut !== undefined) updates.checkOut = b.checkOut ? new Date(b.checkOut) : null;
      if (b.notes !== undefined) updates.notes = b.notes;
      if (b.location !== undefined) updates.location = b.location;
      if (b.workedHours !== undefined) updates.workedHours = b.workedHours != null ? String(b.workedHours) : null;
      const [row] = await db.update(attendanceRecords)
        .set(updates)
        .where(eq(attendanceRecords.id, parseInt(req.params.id)))
        .returning();
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/attendance-records/:id", async (req, res) => {
    try {
      await db.delete(attendanceRecords).where(eq(attendanceRecords.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ─────── Documents (DMS) ────────────────────────────────────────────────────
  app.get("/api/documents", async (req, res) => {
    try {
      const companyId = req.query.companyId ? Number(req.query.companyId) : undefined;
      const category = req.query.category as string | undefined;
      const folder = req.query.folder as string | undefined;
      const contactId = req.query.contactId ? Number(req.query.contactId) : undefined;
      const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
      // Select metadata only at the SQL level — never pull 15MB payloads for a list view.
      const { fileContent: _fc, fileUrl: _fu, ...metaCols } = getTableColumns(documents) as any;
      const conditions: any[] = [];
      if (companyId) conditions.push(eq(documents.companyId, companyId));
      if (category && category !== "all") conditions.push(eq(documents.category, category));
      if (folder && folder !== "all") conditions.push(eq(documents.folder, folder));
      if (projectId) conditions.push(eq((documents as any).projectId, projectId));
      if (contactId) {
        // Everything belonging to this customer: company-level docs (contact_id),
        // docs of any of the customer's projects, and docs attached to the
        // customer's deals in the sales pipeline.
        const [contactProjects, contactDeals] = await Promise.all([
          db.select({ id: projects.id }).from(projects).where(eq(projects.contactId, contactId)),
          db.select({ id: deals.id }).from(deals).where(eq(deals.contactId, contactId)),
        ]);
        const pids = contactProjects.map((p) => p.id);
        const dids = contactDeals.map((d) => d.id);
        const ors: any[] = [eq((documents as any).contactId, contactId)];
        if (pids.length > 0) ors.push(inArray((documents as any).projectId, pids));
        if (dids.length > 0) ors.push(inArray((documents as any).dealId, dids));
        conditions.push(ors.length > 1 ? or(...ors) : ors[0]);
      }
      const rows = await db
        .select({ ...metaCols, hasFile: sql<boolean>`(${documents.fileContent} IS NOT NULL OR ${documents.fileUrl} IS NOT NULL)` })
        .from(documents)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(documents.createdAt));
      res.json(rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/documents/:id/file", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
      const [doc] = await db.select().from(documents).where(eq(documents.id, id));
      if (!doc) return res.status(404).json({ error: "Not found" });
      const anyDoc = doc as any;
      const filename = encodeURIComponent(anyDoc.originalName || doc.titleAr || "file");
      if (anyDoc.fileContent) {
        const buffer = Buffer.from(anyDoc.fileContent, "base64");
        res.setHeader("Content-Type", anyDoc.mimeType || "application/octet-stream");
        res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
        res.setHeader("Content-Length", buffer.length);
        return res.send(buffer);
      }
      if (anyDoc.fileUrl) {
        // data URL stored inline
        const m = /^data:([^;,]+)?(;base64)?,([\s\S]*)$/.exec(anyDoc.fileUrl);
        if (m) {
          const mime = m[1] || anyDoc.mimeType || "application/octet-stream";
          const buffer = m[2] ? Buffer.from(m[3], "base64") : Buffer.from(decodeURIComponent(m[3]), "utf8");
          res.setHeader("Content-Type", mime);
          res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
          res.setHeader("Content-Length", buffer.length);
          return res.send(buffer);
        }
        return res.redirect(anyDoc.fileUrl);
      }
      return res.status(404).json({ error: "No file content" });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/documents", async (req, res) => {
    try {
      const actorId = staffUserId(req);
      const actor = actorId ? await resolveStaffUser(actorId) : null;
      const body = req.body;
      // Server-side upload validation — never trust client-reported size.
      const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15MB per file (see replit.md)
      if (typeof body.fileUrl === "string" && body.fileUrl.length > 0) {
        // base64/data-URL payload: derive real byte size from the encoded length.
        const b64 = body.fileUrl.includes(",") ? body.fileUrl.split(",").pop() : body.fileUrl;
        const approxBytes = Math.floor((b64?.length || 0) * 0.75);
        if (approxBytes > MAX_FILE_BYTES) {
          return res.status(413).json({ error: "File exceeds the 15MB limit" });
        }
      }
      if (body.fileSize != null && Number(body.fileSize) > MAX_FILE_BYTES) {
        return res.status(413).json({ error: "File exceeds the 15MB limit" });
      }
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
        contactId: body.contactId ? Number(body.contactId) : null,
        dealId: body.dealId ? Number(body.dealId) : null,
        activityId: body.activityId || null,
        fileSize: body.fileSize ? Number(body.fileSize) : null,
        fileUrl: body.fileUrl || null,
        originalName: body.originalName || null,
        mimeType: body.mimeType || null,
      } as any).returning();
      const { fileContent: _fc, fileUrl: _fu, ...docSafe } = doc as any;
      res.json({ ...docSafe, hasFile: Boolean((doc as any).fileContent || (doc as any).fileUrl) });
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
  // ── Activity isolation helper for CRM documents ─────────────────────────
  // Returns true if the actor can access data belonging to the given activityId.
  // Admins and managers see everything. Any other user must be a member of the
  // target activity. If activityId is null (legacy doc), access is granted to
  // maintain backward compatibility with pre-activity records.
  async function crmDocActivityAllowed(actorId: string, activityId: string | null): Promise<boolean> {
    const [u] = await db.select().from(users).where(eq(users.id, actorId));
    if (!u) return false;
    const r = new Set<string>([u.role || "", ...(Array.isArray((u as any).roles) ? ((u as any).roles as string[]) : [])]);
    if (r.has("admin") || r.has("manager")) return true;
    if (!activityId) return true; // legacy record with no activity tag
    const [mem] = await db.select().from(activityMembers)
      .where(and(eq(activityMembers.activityId, activityId), eq(activityMembers.userId, actorId)));
    return !!mem;
  }

  // Resolve the activity that a document effectively belongs to.
  // Priority: doc.activityId → contact.activityId → deal.activityId → null.
  async function crmDocEffectiveActivity(doc: any): Promise<string | null> {
    if (doc.activityId) return doc.activityId;
    if (doc.contactId) {
      const [c] = await db.select({ activityId: contacts.activityId }).from(contacts).where(eq(contacts.id, doc.contactId));
      if (c?.activityId) return c.activityId;
    }
    if (doc.dealId) {
      const [d] = await db.select({ activityId: deals.activityId }).from(deals).where(eq(deals.id, doc.dealId));
      if (d?.activityId) return d.activityId;
    }
    return null;
  }

  app.get("/api/crm-documents", async (req, res) => {
    try {
      const actorId = staffUserId(req);
      if (!actorId) return res.status(401).json({ error: "Unauthorized" });

      const contactId = req.query.contactId ? Number(req.query.contactId) : null;
      const dealId = req.query.dealId ? Number(req.query.dealId) : null;

      // Resolve the activity that the requested contact/deal belongs to,
      // then verify the actor is a member before returning any documents.
      let scopeActivityId: string | null = null;
      if (contactId) {
        const [c] = await db.select({ activityId: contacts.activityId }).from(contacts).where(eq(contacts.id, contactId));
        scopeActivityId = c?.activityId ?? null;
      } else if (dealId) {
        const [d] = await db.select({ activityId: deals.activityId }).from(deals).where(eq(deals.id, dealId));
        scopeActivityId = d?.activityId ?? null;
      } else {
        return res.json([]);
      }

      if (!(await crmDocActivityAllowed(actorId, scopeActivityId))) {
        return res.status(403).json({ error: "Forbidden: not in this activity" });
      }

      let rows = await db.select().from(documents).orderBy(desc(documents.createdAt));
      if (contactId) rows = rows.filter(d => (d as any).contactId === contactId);
      else rows = rows.filter(d => (d as any).dealId === dealId);

      const safe = rows.map(({ ...r }: any) => { delete r.fileContent; return r; });
      res.json(safe);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/crm-documents", async (req, res) => {
    try {
      const actorId = staffUserId(req);
      if (!actorId) return res.status(401).json({ error: "Unauthorized" });
      const b = req.body;

      // Enforce that the actor may upload to the target activity.
      const targetActivity: string | null = b.activityId || null;
      if (!(await crmDocActivityAllowed(actorId, targetActivity))) {
        return res.status(403).json({ error: "Forbidden: not in this activity" });
      }

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
        activityId: targetActivity,
        uploadedBy: actorId || null,
        uploadedByName: b.uploadedByName || null,
        description: b.description || null,
        contactId: b.contactId ? Number(b.contactId) : null,
        dealId: b.dealId ? Number(b.dealId) : null,
        tags: [],
        version: 1,
        accessLevel: "internal",
        clientVisible: b.clientVisible !== false,
      } as any).returning();
      const { fileContent: _fc, ...safe } = doc as any;
      res.json(safe);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.patch("/api/crm-documents/:id", async (req, res) => {
    try {
      const actorId = staffUserId(req);
      if (!actorId) return res.status(401).json({ error: "Unauthorized" });
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

      // Load doc first so we can check its activity membership.
      const [existing] = await db.select().from(documents).where(eq(documents.id, id));
      if (!existing) return res.status(404).json({ error: "Not found" });

      const effectiveActivity = await crmDocEffectiveActivity(existing);
      if (!(await crmDocActivityAllowed(actorId, effectiveActivity))) {
        return res.status(403).json({ error: "Forbidden: not in this activity" });
      }

      const b = req.body || {};
      const updates: any = { updatedAt: new Date() };
      if (typeof b.clientVisible === "boolean") updates.clientVisible = b.clientVisible;
      if (typeof b.titleAr === "string" && b.titleAr.trim()) updates.titleAr = b.titleAr;
      if (typeof b.titleEn === "string") updates.titleEn = b.titleEn || null;
      if (typeof b.category === "string" && b.category) updates.category = b.category;
      const [doc] = await db.update(documents).set(updates).where(eq(documents.id, id)).returning();
      const { fileContent: _fc, ...safe } = doc as any;
      res.json(safe);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/crm-documents/:id/file", async (req, res) => {
    try {
      const actorId = staffUserId(req);
      if (!actorId) return res.status(401).json({ error: "Unauthorized" });

      const [doc] = await db.select().from(documents).where(eq(documents.id, Number(req.params.id)));
      if (!doc) return res.status(404).json({ error: "Not found" });

      const effectiveActivity = await crmDocEffectiveActivity(doc);
      if (!(await crmDocActivityAllowed(actorId, effectiveActivity))) {
        return res.status(403).json({ error: "Forbidden: not in this activity" });
      }

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
      const actorId = staffUserId(req);
      if (!actorId) return res.status(401).json({ error: "Unauthorized" });

      const [doc] = await db.select().from(documents).where(eq(documents.id, Number(req.params.id)));
      if (!doc) return res.status(404).json({ error: "Not found" });

      const effectiveActivity = await crmDocEffectiveActivity(doc);
      if (!(await crmDocActivityAllowed(actorId, effectiveActivity))) {
        return res.status(403).json({ error: "Forbidden: not in this activity" });
      }

      await db.delete(documents).where(eq(documents.id, Number(req.params.id)));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/backup/modules", async (req, res) => {
    if (!(await isAdminOrManager(req))) return res.status(403).json({ error: "Forbidden" });
    res.json(BACKUP_MODULES.map(({ id, labelEn, labelAr, tables }) => ({ id, labelEn, labelAr, tableCount: tables.length })));
  });

  app.get("/api/backup/module/:id", async (req, res) => {
    if (!(await isAdminOrManager(req))) return res.status(403).json({ error: "Forbidden" });
    try {
      const { filename, json, errors } = await buildModuleBackup(req.params.id);
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("X-Backup-Errors", String(Object.keys(errors).length));
      res.send(json);
    } catch (e: any) {
      res.status(400).json({ error: e.message || "Backup failed" });
    }
  });

  app.get("/api/backup/full", async (req, res) => {
    if (!(await isAdminOnly(req))) return res.status(403).json({ error: "Forbidden" });
    try {
      const { filename, buffer, errors } = await buildFullBackup();
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("X-Backup-Errors", String(Object.keys(errors).length));
      res.send(buffer);
    } catch (e: any) {
      console.error("Full backup error:", e);
      res.status(500).json({ error: e.message || "Full backup failed" });
    }
  });

  app.get("/api/backup/status", async (req, res) => {
    if (!(await isAdminOrManager(req))) return res.status(403).json({ error: "Forbidden" });
    try { res.json(await getBackupStatus()); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/backup/history", async (req, res) => {
    if (!(await isAdminOrManager(req))) return res.status(403).json({ error: "Forbidden" });
    try {
      const type = (req.query.type as string) || undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
      res.json(await listBackups({ type, limit }));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/backup/history/:id/download", async (req, res) => {
    if (!(await isAdminOrManager(req))) return res.status(403).json({ error: "Forbidden" });
    try {
      const row = await getBackupFile(Number(req.params.id));
      if (!row) return res.status(404).json({ error: "Backup not found" });
      if (!row.fileContent) return res.status(404).json({ error: "Backup file unavailable" });
      const buffer = Buffer.from(row.fileContent, "base64");
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="${row.filename}"`);
      res.setHeader("X-Backup-Status", row.status || "success");
      res.setHeader("X-Backup-Errors", String(row.errorCount || 0));
      res.send(buffer);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/backup/history/:id", async (req, res) => {
    if (!(await isAdminOnly(req))) return res.status(403).json({ error: "Forbidden" });
    try {
      await deleteBackup(Number(req.params.id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/backup/now", async (req, res) => {
    if (!(await isAdminOnly(req))) return res.status(403).json({ error: "Forbidden" });
    try {
      const actorId = staffUserId(req);
      const [actor] = await db.select().from(users).where(eq(users.id, actorId));
      const r = await createBackup({
        type: "manual",
        createdBy: actorId,
        createdByName: actor?.name || actor?.email || "Admin",
      });
      res.json(r);
    } catch (e: any) {
      console.error("Manual backup error:", e);
      res.status(500).json({ error: e.message || "Backup failed" });
    }
  });

  app.post("/api/backup/restore/:id", async (req, res) => {
    if (!(await isAdminOnly(req))) return res.status(403).json({ error: "Forbidden" });
    const confirm = req.header("x-confirm-restore");
    if (confirm !== "I-UNDERSTAND-THIS-WILL-OVERWRITE-ALL-DATA") {
      return res.status(400).json({ error: "Missing or invalid confirmation header" });
    }
    try {
      const actorId = staffUserId(req);
      const [actor] = await db.select().from(users).where(eq(users.id, actorId));
      const result = await restoreBackup({
        id: Number(req.params.id),
        actorId,
        actorName: actor?.name || actor?.email || "Admin",
      });
      res.json(result);
    } catch (e: any) {
      console.error("Restore error:", e);
      res.status(500).json({ error: e.message || "Restore failed" });
    }
  });

  // Upload a ZIP file and restore from it
  app.post("/api/backup/upload-restore", async (req, res) => {
    if (!(await isAdminOnly(req))) return res.status(403).json({ error: "Forbidden" });
    const confirm = req.header("x-confirm-restore");
    if (confirm !== "I-UNDERSTAND-THIS-WILL-OVERWRITE-ALL-DATA") {
      return res.status(400).json({ error: "Missing or invalid confirmation header" });
    }
    try {
      const { fileBase64, filename } = req.body || {};
      if (!fileBase64 || typeof fileBase64 !== "string") {
        return res.status(400).json({ error: "fileBase64 is required" });
      }
      // Strip data URI prefix if present
      const base64Data = fileBase64.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      if (buffer.length < 22) return res.status(400).json({ error: "Invalid ZIP file" });
      if (buffer.length > 15 * 1024 * 1024) return res.status(400).json({ error: "File too large (max 15MB)" });

      const actorId = staffUserId(req);
      const [actor] = await db.select().from(users).where(eq(users.id, actorId));
      const actorName = actor?.name || actor?.email || "Admin";

      // Save uploaded ZIP as a backup record in DB so restoreBackup() can use it
      const [saved] = await db.insert(systemBackups).values({
        type: "manual",
        filename: filename || `uploaded-${new Date().toISOString().slice(0,10)}.zip`,
        status: "success",
        sizeBytes: buffer.length,
        tableCount: 0,
        totalRows: 0,
        errorCount: 0,
        fileContent: base64Data,
        createdBy: actorId,
        createdByName: `Uploaded by ${actorName}`,
      }).returning();

      const result = await restoreBackup({ id: saved.id, actorId, actorName });
      res.json(result);
    } catch (e: any) {
      console.error("Upload restore error:", e);
      res.status(500).json({ error: e.message || "Upload restore failed" });
    }
  });

  app.get("/api/backup/settings", async (req, res) => {
    if (!(await isAdminOnly(req))) return res.status(403).json({ error: "Forbidden" });
    try { res.json(await getBackupSettings()); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/backup/settings", async (req, res) => {
    if (!(await isAdminOnly(req))) return res.status(403).json({ error: "Forbidden" });
    try {
      const allowed: any = {};
      const b = req.body || {};
      for (const k of Object.keys(DEFAULT_SETTINGS)) {
        if (k in b) allowed[k] = b[k];
      }
      const saved = await saveBackupSettings(allowed);
      res.json(saved);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/backup/test-email", async (req, res) => {
    if (!(await isAdminOnly(req))) return res.status(403).json({ error: "Forbidden" });
    try {
      const { recipient } = req.body || {};
      if (!recipient || typeof recipient !== "string" || !recipient.includes("@")) {
        return res.status(400).json({ error: "Valid email required" });
      }
      const result = await sendBackupEmail({ recipient, format: "xlsx", backupType: "manual" });
      if (result.success) res.json({ ok: true });
      else res.status(500).json({ error: result.error || "Email sending failed" });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/auth/forgot-send-code", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email || typeof email !== "string" || !email.includes("@")) {
        return res.status(400).json({ error: "Valid email is required" });
      }
      const key = `reset:${email.toLowerCase()}`;
      if (!canSendCode(key)) {
        return res.status(429).json({ error: "Please wait before requesting another code" });
      }
      const user = await findUserByEmail(email);
      if (!user) {
        return res.json({ success: true });
      }
      const code = generateVerificationCode();
      const sent = await sendVerificationEmail(email, code);
      if (!sent) {
        return res.status(500).json({ error: "Failed to send email" });
      }
      storeVerificationCode(key, code);
      res.json({ success: true });
    } catch (err: any) {
      console.error("Forgot send-code error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { email, code, newPassword } = req.body;
      if (!email || !code || !newPassword) {
        return res.status(400).json({ error: "Email, code and new password are required" });
      }
      if (typeof newPassword !== "string" || newPassword.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }
      const key = `reset:${email.toLowerCase()}`;
      const result = verifyCode(key, code);
      if (!result.valid) {
        const msg = result.error === "max_attempts"
          ? "Too many attempts. Please request a new code"
          : result.error === "expired"
          ? "Code expired. Please request a new code"
          : "Invalid verification code";
        return res.status(400).json({ error: msg });
      }
      const user = await findUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "Account not found" });
      }
      await updateUser(user.id, { password: newPassword });
      res.json({ success: true });
    } catch (err: any) {
      console.error("Reset password error:", err);
      res.status(500).json({ error: "Server error" });
    }
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
      const row = await db.transaction(async (tx) => {
        const [updated] = await tx.update(invoices).set(updateData).where(eq(invoices.id, id)).returning();
        if (!updated) return null;
        if (b.items !== undefined && Array.isArray(b.items)) {
          await tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));
          if (b.items.length > 0) {
            await tx.insert(invoiceItems).values(b.items.map((it: any) => ({
              invoiceId: id, descAr: it.descAr, descEn: it.descEn,
              qty: String(it.qty || 1), unit: it.unit || null,
              unitPrice: String(it.unitPrice || 0), total: String(it.total || 0),
            })));
          }
        }
        return updated;
      });
      if (!row) return res.status(404).json({ error: "Not found" });
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

  // Recompute a contract installment's paid state from its linked received vouchers
  // (single source of truth: derive from payments so create/delete stay symmetric)
  const recomputeInstallmentFromPayments = async (scheduleId: number) => {
    const [inst] = await db.select().from(contractPaymentSchedules).where(eq(contractPaymentSchedules.id, scheduleId));
    if (!inst) return;
    const linked = await db.select().from(payments).where(and(eq(payments.scheduleId, scheduleId), eq(payments.type, "received")));
    const due = parseFloat(inst.amount || "0");
    const sum = linked.reduce((s, p) => s + parseFloat(p.amount || "0"), 0);
    const newPaid = Math.min(sum, due);
    const status = due > 0 && newPaid >= due ? "paid" : newPaid > 0 ? "partial" : "pending";
    const latest = linked.reduce<(typeof linked)[number] | null>((a, p) => (!a || p.id > a.id ? p : a), null);
    await db.update(contractPaymentSchedules).set({
      paidAmount: String(newPaid),
      status,
      paidDate: latest ? latest.date : null,
      paymentId: latest ? latest.id : null,
      updatedAt: new Date(),
    }).where(eq(contractPaymentSchedules.id, scheduleId));
  };

  const recomputePoInstallmentFromPayments = async (poScheduleId: number) => {
    const [inst] = await db.select().from(poPaymentSchedules).where(eq(poPaymentSchedules.id, poScheduleId));
    if (!inst) return;
    const linked = await db.select().from(payments).where(and(eq(payments.poScheduleId, poScheduleId), eq(payments.type, "paid")));
    const due = parseFloat(inst.amount || "0");
    const sum = linked.reduce((s, p) => s + parseFloat(p.amount || "0"), 0);
    const newPaid = Math.min(sum, due);
    const status = due > 0 && newPaid >= due ? "paid" : newPaid > 0 ? "partial" : "pending";
    const latest = linked.reduce<(typeof linked)[number] | null>((a, p) => (!a || p.id > a.id ? p : a), null);
    await db.update(poPaymentSchedules).set({
      paidAmount: String(newPaid),
      status,
      paidDate: latest ? latest.date : null,
      paymentId: latest ? latest.id : null,
      updatedAt: new Date(),
    }).where(eq(poPaymentSchedules.id, poScheduleId));
  };

  app.post("/api/payments", async (req, res) => {
    try {
      const b = req.body;
      const today = new Date().toISOString().slice(0, 10);
      const existing = await db.select().from(payments);
      const seq = (existing.length + 1).toString().padStart(4, "0");
      const prefix = b.type === "paid" ? "SPY" : "SRC";
      const paymentNumber = b.paymentNumber || `${prefix}-${today.replace(/-/g, "").slice(2)}-${seq}`;
      const scheduleId = b.scheduleId ? parseInt(b.scheduleId) : null;
      // Load linked installment (if any) to resolve contract + contact info
      let installment: any = null;
      if (scheduleId) {
        [installment] = await db.select().from(contractPaymentSchedules).where(eq(contractPaymentSchedules.id, scheduleId));
        if (!installment) return res.status(400).json({ error: "Linked installment not found" });
      }
      // PO (vendor) installment linkage — سند صرف مرتبط بجدول دفعات مورد
      const poScheduleId = b.poScheduleId ? parseInt(b.poScheduleId) : null;
      let poInstallment: any = null;
      if (poScheduleId) {
        [poInstallment] = await db.select().from(poPaymentSchedules).where(eq(poPaymentSchedules.id, poScheduleId));
        if (!poInstallment) return res.status(400).json({ error: "Linked PO installment not found" });
      }
      const poId = b.poId ? parseInt(b.poId) : poInstallment?.poId || null;
      const contractRef = b.contractRef || installment?.contractRef || null;
      // Resolve contactId from the contract when not supplied but linked to a schedule
      let contactId = b.contactId ? parseInt(b.contactId) : null;
      if (!contactId && contractRef) {
        const [ctr] = await db.select().from(contracts).where(eq(contracts.contractNumber, contractRef));
        if (ctr?.contactId) contactId = ctr.contactId;
      }
      const [row] = await db.insert(payments).values({
        paymentNumber, type: b.type || "received",
        invoiceId: b.invoiceId ? parseInt(b.invoiceId) : null,
        contactId,
        amount: String(b.amount || 0), currency: b.currency || "SAR",
        method: b.method || "bank_transfer", reference: b.reference || null,
        date: b.date || today, notes: b.notes || null,
        activityId: b.activityId || null, createdBy: b.createdBy || null,
        scheduleId, contractRef, poId, poScheduleId,
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
      // Auto-update the linked contract installment (سند قبض ↔ جدول الدفعات)
      if (scheduleId && (b.type || "received") === "received") {
        await recomputeInstallmentFromPayments(scheduleId);
      }
      // Auto-update the linked PO installment (سند صرف ↔ جدول دفعات المورد)
      if (poScheduleId && b.type === "paid") {
        await recomputePoInstallmentFromPayments(poScheduleId);
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
      const id = parseInt(req.params.id);
      const [pmt] = await db.select().from(payments).where(eq(payments.id, id));
      // Reverse invoice paidAmount if linked
      if (pmt?.invoiceId && pmt.type === "received") {
        const [inv] = await db.select().from(invoices).where(eq(invoices.id, pmt.invoiceId));
        if (inv) {
          const newPaid = Math.max(0, parseFloat(inv.paidAmount || "0") - parseFloat(pmt.amount || "0"));
          const total = parseFloat(inv.total || "0");
          const newStatus = newPaid >= total && total > 0 ? "paid" : newPaid > 0 ? "partial" : "unpaid";
          await db.update(invoices).set({ paidAmount: String(newPaid), status: newStatus, updatedAt: new Date() }).where(eq(invoices.id, pmt.invoiceId));
        }
      }
      await db.delete(payments).where(eq(payments.id, id));
      // Recompute the linked installment from remaining vouchers (symmetric with create)
      if (pmt?.scheduleId) await recomputeInstallmentFromPayments(pmt.scheduleId);
      if (pmt?.poScheduleId) await recomputePoInstallmentFromPayments(pmt.poScheduleId);
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
    if (!(await isAdminOrManager(req))) return res.status(403).json({ error: "Forbidden" });
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
    if (!(await isAdminOrManager(req))) return res.status(403).json({ error: "Forbidden" });
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
    if (!(await isAdminOrManager(req))) return res.status(403).json({ error: "Forbidden" });
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
    if (!(await isAdminOrManager(req))) return res.status(403).json({ error: "Forbidden" });
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
    if (!(await isAdminOrManager(req))) return res.status(403).json({ error: "Forbidden" });
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
    if (!(await isAdminOrManager(req))) return res.status(403).json({ error: "Forbidden" });
    try {
      await db.delete(employeeViolations).where(eq(employeeViolations.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Payroll items CRUD (with new fields)
  app.post("/api/payroll-items", async (req, res) => {
    if (!(await isAdminOrManager(req))) return res.status(403).json({ error: "Forbidden" });
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
    if (!(await isAdminOrManager(req))) return res.status(403).json({ error: "Forbidden" });
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
      const staffId = staffUserId(req);
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
      const staffId = staffUserId(req);
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
      const staffId = staffUserId(req);
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
      const staffId = staffUserId(req);
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
      const staffId = staffUserId(req);
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
      const staffId = staffUserId(req);
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
      const staffId = staffUserId(req);
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
      const staffId = staffUserId(req);
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
      const staffId = staffUserId(req);
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
          payload: c,
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

  // ═══════════════════════════════════════════════════════════════════════════
  // PROPOSALS — persist to DB so Accounting + Client Portal can read them
  // ═══════════════════════════════════════════════════════════════════════════
  app.post("/api/proposals", async (req, res) => {
    try {
      const b = req.body;
      const staffId = staffUserId(req);
      // Idempotent: return existing record if proposalNumber already saved
      const existing = await db.select({ id: proposals.id })
        .from(proposals).where(eq(proposals.proposalNumber, b.proposalNumber));
      if (existing.length > 0) {
        // Idempotent upsert: refresh the stored payload/status if provided
        if (b.payload) {
          await db.update(proposals).set({
            payload: b.payload,
            status: b.status || undefined,
            updatedAt: new Date(),
          }).where(eq(proposals.id, existing[0].id));
        }
        res.json(existing[0]);
        return;
      }
      const [row] = await db.insert(proposals).values({
        proposalNumber: b.proposalNumber,
        contactId: b.contactId ? parseInt(b.contactId) : null,
        clientName: b.clientName || "",
        clientContact: b.clientContact || null,
        clientEmail: b.clientEmail || null,
        projectName: b.projectName || null,
        projectDesc: b.projectDesc || null,
        serviceType: b.serviceType || null,
        subtotal: String(b.subtotal || 0),
        vatRate: String(b.vatRate || 15),
        vatAmount: String(b.vatAmount || 0),
        total: String(b.total || 0),
        currency: b.currency || "SAR",
        status: b.status || "draft",
        notes: b.notes || null,
        payload: b.payload || null,
        createdBy: staffId || b.createdBy || null,
        activityId: b.activityId || null,
        companyId: 1,
      }).returning();
      if (b.items && Array.isArray(b.items) && b.items.length > 0) {
        await db.insert(proposalItems).values(
          b.items.map((it: any, idx: number) => ({
            proposalId: row.id,
            descAr: it.descAr || "",
            descEn: it.descEn || "",
            qty: String(it.qty || 1),
            unit: it.unit || null,
            unitPrice: String(it.unitPrice || 0),
            total: String(it.total || (it.qty || 1) * (it.unitPrice || 0)),
            sortOrder: idx,
          }))
        );
      }
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // List proposals — DB is the source of truth; full-fidelity object in payload
  app.get("/api/proposals", async (req, res) => {
    try {
      const rows = await db.select().from(proposals).orderBy(desc(proposals.createdAt));
      const items = await db.select().from(proposalItems);
      const result = rows.map((r) => {
        if (r.payload && typeof r.payload === "object") {
          return { ...(r.payload as any), dbId: r.id, status: r.status || (r.payload as any).status };
        }
        // Legacy rows without payload: reconstruct from relational columns
        const its = items.filter((it) => it.proposalId === r.id).sort((a, b2) => (a.sortOrder ?? 0) - (b2.sortOrder ?? 0));
        return {
          id: `db-${r.id}`,
          dbId: r.id,
          proposalNumber: r.proposalNumber,
          clientName: r.clientName,
          clientContact: r.clientContact || undefined,
          clientEmail: r.clientEmail || undefined,
          projectName: r.projectName || "",
          projectDesc: r.projectDesc || "",
          serviceType: r.serviceType || "design",
          activityId: r.activityId || undefined,
          items: its.map((it) => ({
            id: `dbi-${it.id}`,
            descAr: it.descAr || "",
            descEn: it.descEn || "",
            qty: Number(it.qty || 1),
            unit: it.unit || "",
            unitPrice: Number(it.unitPrice || 0),
            total: Number(it.total || 0),
          })),
          subtotal: Number(r.subtotal || 0),
          vatRate: Number(r.vatRate || 15),
          vatAmount: Number(r.vatAmount || 0),
          total: Number(r.total || 0),
          currency: r.currency || "SAR",
          status: r.status || "draft",
          notes: r.notes || undefined,
          validity: r.validity ?? 30,
          aiGenerated: !!r.aiGenerated,
          createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
          updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : new Date().toISOString(),
          createdBy: r.createdBy || "",
          crmContactId: r.contactId || undefined,
        };
      });
      res.json(result);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Upsert full proposal payload by proposalNumber
  app.put("/api/proposals/by-number/:proposalNumber", async (req, res) => {
    try {
      const num = req.params.proposalNumber;
      const b = req.body || {};
      const p = b.payload || b;
      const [existing] = await db.select({ id: proposals.id }).from(proposals).where(eq(proposals.proposalNumber, num));
      if (existing) {
        await db.update(proposals).set({
          clientName: p.clientName ?? undefined,
          clientContact: p.clientContact ?? undefined,
          clientEmail: p.clientEmail ?? undefined,
          projectName: p.projectName ?? undefined,
          projectDesc: p.projectDesc ?? undefined,
          serviceType: p.serviceType ?? undefined,
          subtotal: p.subtotal != null ? String(p.subtotal) : undefined,
          vatRate: p.vatRate != null ? String(p.vatRate) : undefined,
          vatAmount: p.vatAmount != null ? String(p.vatAmount) : undefined,
          total: p.total != null ? String(p.total) : undefined,
          currency: p.currency ?? undefined,
          status: p.status ?? undefined,
          notes: p.notes ?? undefined,
          validity: p.validity ?? undefined,
          contactId: p.crmContactId != null ? Number(p.crmContactId) : undefined,
          payload: p,
          updatedAt: new Date(),
        }).where(eq(proposals.id, existing.id));
        return res.json({ id: existing.id, updated: true });
      }
      const staffId = staffUserId(req);
      const [row] = await db.insert(proposals).values({
        proposalNumber: num,
        contactId: p.crmContactId != null ? Number(p.crmContactId) : null,
        clientName: p.clientName || "",
        clientContact: p.clientContact || null,
        clientEmail: p.clientEmail || null,
        projectName: p.projectName || null,
        projectDesc: p.projectDesc || null,
        serviceType: p.serviceType || null,
        subtotal: String(p.subtotal || 0),
        vatRate: String(p.vatRate || 15),
        vatAmount: String(p.vatAmount || 0),
        total: String(p.total || 0),
        currency: p.currency || "SAR",
        status: p.status || "draft",
        notes: p.notes || null,
        validity: p.validity ?? 30,
        payload: p,
        createdBy: staffId || p.createdBy || null,
        activityId: p.activityId || null,
        companyId: 1,
        createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
      }).returning();
      res.json({ id: row.id, created: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/proposals/by-number/:proposalNumber", async (req, res) => {
    try {
      const staffId = staffUserId(req);
      const role = await resolveUserRole(staffId);
      if (!isManagerOrAdmin(role)) return res.status(403).json({ error: "Manager access required" });
      const num = req.params.proposalNumber;
      const [row] = await db.select({ id: proposals.id }).from(proposals).where(eq(proposals.proposalNumber, num));
      if (row) {
        await db.delete(proposalItems).where(eq(proposalItems.proposalId, row.id));
        await db.delete(proposals).where(eq(proposals.id, row.id));
      }
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Bulk migrate proposals from localStorage blob — idempotent by proposalNumber
  app.post("/api/proposals/migrate", async (req, res) => {
    try {
      const list: any[] = req.body?.proposals ?? [];
      const staffId = staffUserId(req);
      const existing = await db.select({ proposalNumber: proposals.proposalNumber }).from(proposals);
      const existingNums = new Set(existing.map((r) => r.proposalNumber));
      let imported = 0;
      for (const p of list) {
        if (!p?.proposalNumber || existingNums.has(p.proposalNumber)) continue;
        await db.insert(proposals).values({
          proposalNumber: p.proposalNumber,
          contactId: p.crmContactId != null ? Number(p.crmContactId) : null,
          clientName: p.clientName || "",
          clientContact: p.clientContact || null,
          clientEmail: p.clientEmail || null,
          projectName: p.projectName || null,
          projectDesc: p.projectDesc || null,
          serviceType: p.serviceType || null,
          subtotal: String(p.subtotal || 0),
          vatRate: String(p.vatRate || 15),
          vatAmount: String(p.vatAmount || 0),
          total: String(p.total || 0),
          currency: p.currency || "SAR",
          status: p.status || "draft",
          notes: p.notes || null,
          validity: p.validity ?? 30,
          payload: p,
          createdBy: staffId || p.createdBy || null,
          activityId: p.activityId || null,
          companyId: 1,
          createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
        });
        imported++;
      }
      res.json({ imported, skipped: list.length - imported });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Upsert full contract by contractNumber — keeps DB the source of truth
  app.put("/api/contracts/by-number/:contractNumber", async (req, res) => {
    try {
      const num = req.params.contractNumber;
      const c = req.body?.payload || req.body || {};
      const staffId = staffUserId(req);
      const [existing] = await db.select().from(contracts).where(eq(contracts.contractNumber, num));
      const extra = {
        localId: c.id,
        proposalNumber: c.proposalNumber,
        proposalLocalId: c.proposalId,
        clientContact: c.clientContact,
        clientEmail: c.clientEmail,
        projectDesc: c.projectDesc,
        clauses: c.clauses ?? [],
        paymentSchedule: c.paymentSchedule ?? [],
        items: c.items ?? [],
        payload: c,
      };
      if (existing) {
        const [row] = await db.update(contracts).set({
          clientName: c.clientName ?? existing.clientName,
          projectName: c.projectName ?? existing.projectName,
          serviceType: c.serviceType ?? existing.serviceType,
          subtotal: c.subtotal != null ? String(c.subtotal) : existing.subtotal,
          vatRate: c.vatRate != null ? String(c.vatRate) : existing.vatRate,
          vatAmount: c.vatAmount != null ? String(c.vatAmount) : existing.vatAmount,
          total: c.total != null ? String(c.total) : existing.total,
          currency: c.currency ?? existing.currency,
          status: c.status ?? existing.status,
          startDate: c.startDate ?? existing.startDate,
          endDate: c.endDate ?? existing.endDate,
          terms: JSON.stringify(extra),
          updatedAt: new Date(),
        }).where(eq(contracts.id, existing.id)).returning();
        return res.json({ id: row.id, updated: true });
      }
      const [row] = await db.insert(contracts).values({
        companyId: c.companyId ?? 1,
        contractNumber: num,
        clientName: c.clientName || "",
        projectName: c.projectName || null,
        serviceType: c.serviceType || null,
        subtotal: String(c.subtotal || 0),
        vatRate: String(c.vatRate || 15),
        vatAmount: String(c.vatAmount || 0),
        total: String(c.total || 0),
        currency: c.currency || "SAR",
        status: c.status || "draft",
        startDate: c.startDate || null,
        endDate: c.endDate || null,
        terms: JSON.stringify(extra),
        createdBy: staffId || null,
        createdAt: c.createdAt ? new Date(c.createdAt) : new Date(),
      }).returning();
      res.json({ id: row.id, created: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/contracts/by-number/:contractNumber", async (req, res) => {
    try {
      const staffId = staffUserId(req);
      const role = await resolveUserRole(staffId);
      if (!isManagerOrAdmin(role)) return res.status(403).json({ error: "Manager access required" });
      const num = req.params.contractNumber;
      const [row] = await db.select({ id: contracts.id }).from(contracts).where(eq(contracts.contractNumber, num));
      if (row) {
        await db.delete(contractItems).where(eq(contractItems.contractId, row.id));
        await db.delete(contracts).where(eq(contracts.id, row.id));
      }
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Sync proposal status from localStorage → DB (by proposalNumber)
  app.patch("/api/proposals/sync", async (req, res) => {
    try {
      const { proposalNumber, status } = req.body || {};
      if (!proposalNumber) return res.status(400).json({ error: "proposalNumber required" });
      const updates: any = { updatedAt: new Date() };
      if (status) updates.status = status;
      if (status === "approved") updates.clientApprovedAt = new Date();
      await db.update(proposals).set(updates).where(eq(proposals.proposalNumber, proposalNumber));
      res.json({ ok: true });
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

  // ═══════════════════════════════════════════════════════════════════════════
  // EMAIL: Bulk + Single via Resend (privacy-safe: bulk uses BCC)
  // ═══════════════════════════════════════════════════════════════════════════
  app.post("/api/email/send", async (req, res) => {
    try {
      const body = req.body || {};
      const subject: string = (body.subject || "").trim();
      const html: string | undefined = body.html;
      const text: string | undefined = body.text;
      const category: string = body.category || "manual";
      const isBulk = !!body.isBulk;
      const senderId = staffUserId(req) || null;
      // Derive companyId from the calling user — never hardcode in multi-tenant.
      let actorCompanyId: number | null = null;
      if (senderId) {
        const [u] = await db.select({ companyId: users.companyId }).from(users).where(eq(users.id, senderId)).limit(1);
        actorCompanyId = u?.companyId ?? null;
      }

      if (!subject) return res.status(400).json({ error: "Subject is required" });
      if (!html && !text) return res.status(400).json({ error: "Body (html or text) is required" });

      let toList: string[] = [];
      let bccList: string[] = [];
      let fromEmail = process.env.FROM_EMAIL || "Scapex <noreply@resend.dev>";

      if (isBulk) {
        const recipients: string[] = Array.isArray(body.recipients) ? body.recipients : [];
        const valid = recipients.map(r => (r || "").trim()).filter(Boolean);
        if (!valid.length) return res.status(400).json({ error: "No recipients" });
        // Privacy: put all real addresses in BCC, leave 'to' as the sender
        const fromMatch = fromEmail.match(/<([^>]+)>/);
        const senderAddr = fromMatch ? fromMatch[1] : fromEmail;
        toList = [senderAddr];
        bccList = valid;
      } else {
        const to = (body.to || "").toString().trim();
        if (!to) return res.status(400).json({ error: "Recipient is required" });
        toList = [to];
      }

      const result = await sendEmail({ to: toList, bcc: bccList.length ? bccList : undefined, subject, html, text });

      try {
        await db.insert(emailLogs).values({
          companyId: actorCompanyId,
          fromEmail,
          toEmails: toList,
          bccEmails: bccList,
          subject,
          bodyHtml: html || null,
          bodyText: text || null,
          status: result.success ? "sent" : "failed",
          errorMessage: result.error || null,
          resendId: result.id || null,
          category,
          sentBy: senderId,
        });
      } catch (logErr) {
        console.error("[email] failed to log send:", logErr);
      }

      if (!result.success) return res.status(502).json({ error: result.error || "Send failed" });
      res.json({ success: true, id: result.id, recipients: bccList.length || toList.length });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/email/logs", async (req, res) => {
    try {
      const scope = await resolveActivityScope(req);
      if (!scope.ok) return res.status(scope.status).json({ error: scope.error });
      // Admin/manager: all. Otherwise: only logs from caller's company.
      if (scope.isPrivileged) {
        const rows = await db.select().from(emailLogs).orderBy(desc(emailLogs.sentAt)).limit(200);
        return res.json(rows);
      }
      const [u] = await db.select({ companyId: users.companyId }).from(users).where(eq(users.id, scope.actor.id)).limit(1);
      if (!u?.companyId) return res.json([]);
      const rows = await db.select().from(emailLogs)
        .where(eq(emailLogs.companyId, u.companyId))
        .orderBy(desc(emailLogs.sentAt)).limit(200);
      res.json(rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SURVEYS — staff endpoints
  // ═══════════════════════════════════════════════════════════════════════════
  function getPublicBaseUrl(req: any): string {
    return process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`;
  }

  function renderSurveyEmail(args: { customerName: string; link: string; message: string; isRtl: boolean }) {
    const { customerName, link, message, isRtl } = args;
    const dir = isRtl ? "rtl" : "ltr";
    const safeMsg = (message || "").replace(/\n/g, "<br/>");
    const cta = isRtl ? "ابدأ تقييم الخدمة" : "Start Survey";
    const footer = isRtl ? "إذا لم يعمل الزر، انسخ الرابط التالي:" : "If the button doesn't work, copy this link:";
    return `<div dir="${dir}" style="font-family:'Segoe UI',Tahoma,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#f8fafc">
      <div style="background:#fff;border-radius:12px;padding:28px;border:1px solid #e2e8f0">
        <h2 style="color:#1e40af;margin:0 0 4px">Scapex</h2>
        <p style="color:#64748b;font-size:13px;margin:0 0 20px">${isRtl ? 'منصة إدارة الأعمال الذكية' : 'Smart Business Management'}</p>
        <p style="color:#0f172a;font-size:15px;line-height:1.7">${isRtl ? 'مرحباً' : 'Hello'} <strong>${customerName}</strong>،</p>
        <div style="color:#334155;font-size:14px;line-height:1.7;margin:12px 0 20px">${safeMsg}</div>
        <div style="text-align:center;margin:24px 0">
          <a href="${link}" style="display:inline-block;background:#1e40af;color:#fff;text-decoration:none;font-weight:bold;padding:14px 32px;border-radius:8px">${cta}</a>
        </div>
        <p style="color:#64748b;font-size:12px;margin-top:20px">${footer}<br><a href="${link}" style="color:#1e40af;word-break:break-all">${link}</a></p>
      </div>
    </div>`;
  }

  app.get("/api/surveys", async (req, res) => {
    try {
      const scope = await resolveActivityScope(req);
      if (!scope.ok) return res.status(scope.status).json({ error: scope.error });
      const contactId = req.query.contactId ? parseInt(String(req.query.contactId)) : null;

      // Determine which contacts the caller is allowed to see (same model as /api/customers).
      // Admin/manager: all. Otherwise: contacts whose company_id is in the actor's activity companies,
      // OR whose activity_id is in the actor's activities (back-compat).
      let allowedContactIds: Set<number> | null = null; // null = unrestricted (privileged)
      if (!scope.isPrivileged) {
        const activityFilter = scope.activityId ? [scope.activityId] : (scope.allowedIds || []);
        if (!activityFilter.length) return res.json([]);
        const actRows = await db.select({ companyId: businessActivities.companyId })
          .from(businessActivities).where(inArray(businessActivities.id, activityFilter));
        const companyIds = actRows.map(a => a.companyId).filter((c): c is number => c !== null);
        const conds: any[] = [];
        if (companyIds.length) conds.push(inArray(contacts.companyId, companyIds));
        if (activityFilter.length) conds.push(inArray(contacts.activityId, activityFilter));
        const where = conds.length > 1 ? or(...conds) : conds[0];
        const cRows = where ? await db.select({ id: contacts.id }).from(contacts).where(where) : [];
        allowedContactIds = new Set(cRows.map(r => r.id));
        // Reject query for an explicit contactId outside scope
        if (contactId !== null && !allowedContactIds.has(contactId)) return res.json([]);
      }

      let rows;
      if (contactId) {
        rows = await db.select().from(surveys).where(eq(surveys.contactId, contactId)).orderBy(desc(surveys.sentAt));
      } else if (allowedContactIds) {
        const ids = Array.from(allowedContactIds);
        if (!ids.length) return res.json([]);
        rows = await db.select().from(surveys).where(inArray(surveys.contactId, ids)).orderBy(desc(surveys.sentAt)).limit(500);
      } else {
        rows = await db.select().from(surveys).orderBy(desc(surveys.sentAt)).limit(500);
      }

      const ids = rows.map(r => r.id);
      const responses = ids.length
        ? await db.select().from(surveyResponses).where(inArray(surveyResponses.surveyId, ids))
        : [];
      const byId = new Map(responses.map(r => [r.surveyId, r]));
      const base = getPublicBaseUrl(req);
      res.json(rows.map(r => ({ ...r, response: byId.get(r.id) || null, link: `${base}/survey/${r.token}` })));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/surveys", async (req, res) => {
    try {
      const scope = await resolveActivityScope(req);
      if (!scope.ok) return res.status(scope.status).json({ error: scope.error });
      const body = req.body || {};
      const senderId = scope.actor.id;
      const [u] = await db.select({ companyId: users.companyId }).from(users).where(eq(users.id, senderId)).limit(1);
      const actorCompanyId: number | null = u?.companyId ?? null;
      const recipients: Array<{ contactId?: number; name: string; email?: string; phone?: string }> =
        Array.isArray(body.recipients) ? body.recipients : [];
      if (!recipients.length) return res.status(400).json({ error: "No recipients" });
      const questions: SurveyQuestionDef[] = Array.isArray(body.questions) ? body.questions : [];
      if (!questions.length) return res.status(400).json({ error: "At least one question is required" });
      const sentVia: string = body.sentVia === "whatsapp" ? "whatsapp" : (body.sentVia === "link" ? "link" : "email");
      const message: string = body.message || "";
      const isRtl: boolean = !!body.isRtl;

      const base = getPublicBaseUrl(req);
      const created: Array<any> = [];
      const emailQueue: Array<{ to: string; subject: string; html: string }> = [];

      // Build the caller's allowed-contact scope (same logic as GET /api/surveys).
      let allowedContactIds: Set<number> | null = null; // null = privileged (all)
      let allowedCompanyIds: Set<number> | null = null;
      if (!scope.isPrivileged) {
        const activityFilter = scope.activityId ? [scope.activityId] : (scope.allowedIds || []);
        if (!activityFilter.length) return res.status(403).json({ error: "No activities assigned" });
        const actRows = await db.select({ companyId: businessActivities.companyId })
          .from(businessActivities).where(inArray(businessActivities.id, activityFilter));
        const companyIds = actRows.map(a => a.companyId).filter((c): c is number => c !== null);
        allowedCompanyIds = new Set(companyIds);
        const conds: any[] = [];
        if (companyIds.length) conds.push(inArray(contacts.companyId, companyIds));
        if (activityFilter.length) conds.push(inArray(contacts.activityId, activityFilter));
        const where = conds.length > 1 ? or(...conds) : conds[0];
        const cRows = where ? await db.select({ id: contacts.id }).from(contacts).where(where) : [];
        allowedContactIds = new Set(cRows.map(r => r.id));
      }

      for (const r of recipients) {
        // Authorize contactId against caller's scope (IDOR guard).
        if (allowedContactIds !== null && r.contactId != null && !allowedContactIds.has(r.contactId)) {
          return res.status(403).json({ error: `Forbidden: contact ${r.contactId} is not in your scope` });
        }
        // Resolve per-recipient companyId from contact when available; fall back to actor's company.
        let recipientCompanyId: number | null = actorCompanyId;
        if (r.contactId) {
          const [c] = await db.select({ companyId: contacts.companyId }).from(contacts).where(eq(contacts.id, r.contactId)).limit(1);
          if (c?.companyId != null) {
            // Defense in depth: even if the contact id passed the allow-list above,
            // its company must also be one the caller can reach.
            if (allowedCompanyIds !== null && !allowedCompanyIds.has(c.companyId)) {
              return res.status(403).json({ error: "Forbidden: contact's company is not in your scope" });
            }
            recipientCompanyId = c.companyId;
          }
        }
        const token = crypto.randomBytes(18).toString("hex");
        const [row] = await db.insert(surveys).values({
          companyId: recipientCompanyId,
          token,
          contactId: r.contactId ?? null,
          customerName: r.name || "Customer",
          customerEmail: r.email || null,
          customerPhone: r.phone || null,
          sentVia,
          message,
          questions,
          status: "sent",
          sentBy: senderId,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        }).returning();
        created.push({ ...row, link: `${base}/survey/${token}` });

        if (sentVia === "email" && r.email) {
          emailQueue.push({
            to: r.email,
            subject: isRtl ? "نرجو تقييم تجربتك معنا — Scapex" : "Please rate your experience with us — Scapex",
            html: renderSurveyEmail({ customerName: r.name, link: `${base}/survey/${token}`, message, isRtl }),
          });
        }
      }

      // Send emails in parallel; tolerate individual failures
      const sendResults = await Promise.all(emailQueue.map(async (m) => {
        const r = await sendEmail({ to: m.to, subject: m.subject, html: m.html });
        try {
          await db.insert(emailLogs).values({
            companyId: actorCompanyId,
            fromEmail: process.env.FROM_EMAIL || "Scapex <noreply@resend.dev>",
            toEmails: [m.to],
            bccEmails: [],
            subject: m.subject,
            bodyHtml: m.html,
            status: r.success ? "sent" : "failed",
            errorMessage: r.error || null,
            resendId: r.id || null,
            category: "survey",
            sentBy: senderId,
          });
        } catch {}
        return { to: m.to, ...r };
      }));

      res.json({
        success: true,
        surveys: created,
        emailsSent: sendResults.filter(r => r.success).length,
        emailsFailed: sendResults.filter(r => !r.success).length,
        emailErrors: sendResults.filter(r => !r.success),
      });
    } catch (e: any) {
      console.error("[surveys] create error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/surveys/:id", async (req, res) => {
    try {
      const scope = await resolveActivityScope(req);
      if (!scope.ok) return res.status(scope.status).json({ error: scope.error });
      const id = parseInt(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
      const [row] = await db.select().from(surveys).where(eq(surveys.id, id)).limit(1);
      if (!row) return res.status(404).json({ error: "Not found" });

      if (!scope.isPrivileged) {
        // Must own the contact via activity/company scope
        if (!row.contactId) return res.status(403).json({ error: "Forbidden" });
        const [c] = await db.select({ companyId: contacts.companyId, activityId: contacts.activityId })
          .from(contacts).where(eq(contacts.id, row.contactId)).limit(1);
        if (!c) return res.status(403).json({ error: "Forbidden" });
        const activityFilter = scope.activityId ? [scope.activityId] : (scope.allowedIds || []);
        const actRows = activityFilter.length
          ? await db.select({ companyId: businessActivities.companyId }).from(businessActivities).where(inArray(businessActivities.id, activityFilter))
          : [];
        const companyIds = new Set(actRows.map(a => a.companyId).filter((x): x is number => x !== null));
        const inActivity = c.activityId && activityFilter.includes(c.activityId);
        const inCompany = c.companyId != null && companyIds.has(c.companyId);
        if (!inActivity && !inCompany) return res.status(403).json({ error: "Forbidden" });
      }

      await db.delete(surveys).where(eq(surveys.id, id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC SURVEY endpoints — no auth (token is the secret)
  // ═══════════════════════════════════════════════════════════════════════════
  app.get("/api/public/survey/:token", async (req, res) => {
    try {
      const token = String(req.params.token || "");
      if (!/^[a-f0-9]{20,}$/i.test(token)) return res.status(400).json({ error: "Invalid token" });
      const [row] = await db.select().from(surveys).where(eq(surveys.token, token)).limit(1);
      if (!row) return res.status(404).json({ error: "Survey not found" });
      if (row.expiresAt && new Date(row.expiresAt).getTime() < Date.now()) {
        return res.status(410).json({ error: "Survey expired" });
      }
      let existing = null;
      if (row.status === "responded") {
        const [r] = await db.select().from(surveyResponses).where(eq(surveyResponses.surveyId, row.id)).limit(1);
        existing = r || null;
      }
      res.json({
        id: row.id,
        customerName: row.customerName,
        message: row.message,
        questions: row.questions,
        status: row.status,
        alreadyResponded: row.status === "responded",
        existing,
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/public/survey/:token", async (req, res) => {
    try {
      const token = String(req.params.token || "");
      if (!/^[a-f0-9]{20,}$/i.test(token)) return res.status(400).json({ error: "Invalid token" });
      const [row] = await db.select().from(surveys).where(eq(surveys.token, token)).limit(1);
      if (!row) return res.status(404).json({ error: "Survey not found" });
      if (row.status === "responded") return res.status(409).json({ error: "Already responded" });
      if (row.expiresAt && new Date(row.expiresAt).getTime() < Date.now()) {
        return res.status(410).json({ error: "Survey expired" });
      }

      const body = req.body || {};
      const answers: Record<string, string | number> = (body.answers && typeof body.answers === "object") ? body.answers : {};
      const ratingRaw = body.rating;
      const rating = typeof ratingRaw === "number" ? ratingRaw : (parseInt(ratingRaw) || null);
      const feedback = (body.feedback || "").toString().slice(0, 4000) || null;
      const recommendation = ["yes", "maybe", "no"].includes(body.recommendation) ? body.recommendation : null;
      const ip = (req.header("x-forwarded-for") || req.socket.remoteAddress || "").toString().slice(0, 64);

      // Atomic claim: only one submission wins, even on concurrent requests.
      const claimed = await db.update(surveys)
        .set({ status: "responded", respondedAt: new Date() })
        .where(and(eq(surveys.id, row.id), eq(surveys.status, "sent")))
        .returning({ id: surveys.id });
      if (!claimed.length) return res.status(409).json({ error: "Already responded" });

      try {
        await db.insert(surveyResponses).values({
          surveyId: row.id,
          rating,
          answers,
          feedback,
          recommendation,
          ipAddress: ip,
        });
      } catch (insertErr) {
        // Roll back the claim so the customer can retry.
        await db.update(surveys).set({ status: "sent", respondedAt: null }).where(eq(surveys.id, row.id));
        throw insertErr;
      }
      res.json({ success: true });
    } catch (e: any) {
      console.error("[public-survey] submit error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  return httpServer;
}
