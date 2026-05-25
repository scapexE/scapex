/**
 * Centralised seed routines for Scapex.
 *
 * Both the dev server bootstrap (`registerRoutes`) and the standalone
 * `scripts/seed.ts` rebuild script call into here so the seed data lives
 * in exactly one place.
 *
 * Every routine is idempotent: it checks whether its target table is
 * already populated and exits early if so. Running the seed against an
 * already-seeded DB is therefore safe and a no-op.
 */
import { eq } from "drizzle-orm";
import { db } from "./db";
import {
  appData,
  branches,
  businessActivities,
  activityMembers,
  companies,
  users,
} from "@shared/schema";
import { seedDefaultUsers } from "./auth";
import { ACTIVITY_CATALOG } from "@shared/activityCatalog";

export { ACTIVITY_CATALOG as DEFAULT_ACTIVITY_CATALOG };
const DEFAULT_ACTIVITY_CATALOG = ACTIVITY_CATALOG;

// ── 2) Default CRM pipeline (stored as app_data so admins can re-order it) ───
const DEFAULT_DEAL_PIPELINE = [
  { id: "new",         titleAr: "جديد",        titleEn: "New" },
  { id: "qualified",   titleAr: "مؤهل",        titleEn: "Qualified" },
  { id: "proposal",    titleAr: "عرض سعر",     titleEn: "Proposal" },
  { id: "negotiation", titleAr: "تفاوض",       titleEn: "Negotiation" },
  { id: "won",         titleAr: "مكسوب",       titleEn: "Won" },
  { id: "lost",        titleAr: "مفقود",       titleEn: "Lost" },
];

// ── 3) Default project lifecycle stages applied to every new project ─────────
export const DEFAULT_PROJECT_STAGES = [
  { titleAr: "عرض السعر", titleEn: "Proposal" },
  { titleAr: "العقد",     titleEn: "Contract" },
  { titleAr: "التصميم",  titleEn: "Design" },
  { titleAr: "التنفيذ",   titleEn: "Execution" },
  { titleAr: "التسليم",   titleEn: "Handover" },
];

// ── 4) Default account & document categories (stored under app_data) ─────────
const DEFAULT_ACCOUNT_CATEGORIES = [
  { id: "income",       nameAr: "إيرادات",          nameEn: "Income" },
  { id: "expense",      nameAr: "مصروفات",          nameEn: "Expense" },
  { id: "asset",        nameAr: "أصول",             nameEn: "Asset" },
  { id: "liability",    nameAr: "التزامات",         nameEn: "Liability" },
  { id: "equity",       nameAr: "حقوق ملكية",       nameEn: "Equity" },
];

const DEFAULT_DOCUMENT_CATEGORIES = [
  { id: "contract",  nameAr: "عقود",      nameEn: "Contracts" },
  { id: "invoice",   nameAr: "فواتير",    nameEn: "Invoices" },
  { id: "report",    nameAr: "تقارير",    nameEn: "Reports" },
  { id: "permit",    nameAr: "تصاريح",    nameEn: "Permits" },
  { id: "drawing",   nameAr: "مخططات",    nameEn: "Drawings" },
  { id: "cert",      nameAr: "شهادات",    nameEn: "Certificates" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Seed steps
// ─────────────────────────────────────────────────────────────────────────────

export async function seedDefaultCompanies(): Promise<void> {
  const existing = await db.select().from(companies);
  if (existing.length > 0) {
    console.log("• companies already present — skipping");
    return;
  }
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
    { companyId: main.id, nameAr: "المقر الرئيسي - الرياض", nameEn: "HQ - Riyadh",            city: "الرياض", address: "حي العليا",   phone: "+966112345678", managerName: "أحمد الغامدي",   isActive: true },
    { companyId: main.id, nameAr: "فرع جدة",              nameEn: "Jeddah Branch",           city: "جدة",    address: "حي الروضة",   phone: "+966122345678", managerName: "محمد القحطاني",  isActive: true },
    { companyId: main.id, nameAr: "فرع الدمام",            nameEn: "Dammam Branch",           city: "الدمام", address: "حي الشاطئ",   phone: "+966132345678", managerName: "خالد الزهراني",  isActive: true },
    { companyId: sub1.id, nameAr: "مكتب جدة - السلامة",     nameEn: "Jeddah Safety Office",    city: "جدة",    address: "حي الصفا",    phone: "+966122456789", managerName: "فيصل العتيبي",   isActive: true },
    { companyId: sub1.id, nameAr: "مكتب الرياض - السلامة",  nameEn: "Riyadh Safety Office",    city: "الرياض", address: "حي الملقا",   phone: "+966113456789", managerName: "عبدالله الشهري", isActive: true },
    { companyId: sub2.id, nameAr: "مكتب الدمام - البيئة",   nameEn: "Dammam Env. Office",      city: "الدمام", address: "حي الفيصلية", phone: "+966133456789", managerName: "عمر الحربي",     isActive: true },
  ]);
  console.log("✅ Default companies & branches seeded");
}

/**
 * Reconciliation-based: walks every company × the catalogue items it needs
 * and ensures (a) the row exists in `business_activities`, (b) every
 * admin/manager is a member of every activity. Both writes use
 * `onConflictDoNothing` so it is safe to run repeatedly and on
 * already-populated databases — missing entries are filled in, existing
 * entries are left untouched.
 */
export async function seedDefaultActivities(): Promise<void> {
  const cos = await db.select().from(companies);
  let inserted = 0;
  for (const company of cos) {
    // Only create activities for catalog IDs explicitly listed in settings.
    // No fallback to "all 6" — if activityIds is missing/empty we skip this
    // company entirely. The admin sets activityIds when creating the company.
    const catalogIds: string[] =
      Array.isArray((company.settings as any)?.activityIds) && (company.settings as any).activityIds.length > 0
        ? (company.settings as any).activityIds
        : [];
    for (const catId of catalogIds) {
      const cat = DEFAULT_ACTIVITY_CATALOG.find((x) => x.id === catId);
      if (!cat) continue;
      const targetId = `${cat.id}_c${company.id}`;
      const result = await db.insert(businessActivities).values({
        id: targetId,
        companyId: company.id,
        nameAr: cat.nameAr,
        nameEn: cat.nameEn,
        color: cat.color,
        icon: cat.icon,
        modules: cat.modules,
        active: true,
        companyNameAr: company.nameAr,
        companyNameEn: company.nameEn,
        companyLogoUrl: company.logoUrl,
      }).onConflictDoNothing().returning({ id: businessActivities.id });
      if (result.length > 0) inserted++;
    }
  }

  // Auto-assign every admin/manager to every activity for visibility.
  const allUsers = await db.select().from(users);
  const allActivities = await db.select().from(businessActivities);
  let memberships = 0;
  // Auto-membership applies ONLY to admin/manager — they need universal
  // visibility to operate the platform. Every other user (engineer,
  // accountant, custom roles, etc.) is assigned explicitly by an admin
  // through the Companies → Activities UI; no implicit memberships.
  for (const u of allUsers) {
    const userRoles = new Set<string>([u.role || "", ...((u.roles as string[]) || [])]);
    if (!userRoles.has("admin") && !userRoles.has("manager")) continue;
    for (const a of allActivities) {
      const r = await db.insert(activityMembers)
        .values({ activityId: a.id, userId: u.id })
        .onConflictDoNothing()
        .returning({ activityId: activityMembers.activityId });
      if (r.length > 0) memberships++;
    }
  }
  if (inserted === 0 && memberships === 0) {
    console.log("• activities already in sync — no changes");
  } else {
    console.log(`✅ Default business activities reconciled (+${inserted} activities, +${memberships} memberships)`);
  }
}

/**
 * Insert-only by default: if the row exists we leave the admin's customised
 * value untouched. When `overwrite` is true (only used by the destructive
 * rebuild path) we replace the row with the canonical defaults.
 */
async function setAppData(key: string, value: any, overwrite = false) {
  if (overwrite) {
    await db.insert(appData).values({ key, value }).onConflictDoNothing();
    await db.update(appData).set({ value, updatedAt: new Date() }).where(eq(appData.key, key));
    return true;
  }
  const inserted = await db.insert(appData)
    .values({ key, value })
    .onConflictDoNothing()
    .returning({ key: appData.key });
  return inserted.length > 0;
}

/**
 * Seed the catalog defaults. With `overwrite=false` (default, used at boot)
 * existing admin-customised values are preserved. With `overwrite=true`
 * (used only by the rebuild script) values are reset to canonical defaults.
 */
export async function seedDefaultCatalogs(overwrite = false): Promise<void> {
  const a = await setAppData("scapex_deal_pipeline", DEFAULT_DEAL_PIPELINE, overwrite);
  const b = await setAppData("scapex_account_categories", DEFAULT_ACCOUNT_CATEGORIES, overwrite);
  const c = await setAppData("scapex_document_categories", DEFAULT_DOCUMENT_CATEGORIES, overwrite);
  const d = await setAppData("scapex_default_project_stages", DEFAULT_PROJECT_STAGES, overwrite);
  const created = [a, b, c, d].filter(Boolean).length;
  if (overwrite) {
    console.log("✅ Default catalogs reset to canonical values (overwrite mode)");
  } else if (created > 0) {
    console.log(`✅ Seeded ${created} missing default catalog(s)`);
  } else {
    console.log("• catalogs already present — preserving admin customisations");
  }
}

/**
 * Run every seed step in the correct order. Idempotent.
 * `overwriteCatalogs` is forwarded only by the rebuild script — boot uses
 * the safe insert-only default.
 */
export async function runAllSeeds(opts: { overwriteCatalogs?: boolean } = {}): Promise<void> {
  // app_data table is referenced by setAppData. Make sure it exists first
  // (mirrors the bootstrap step in registerRoutes).
  await db.execute(`CREATE TABLE IF NOT EXISTS app_data (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
  )`);
  await seedDefaultUsers();
  await seedDefaultCompanies();
  await seedDefaultActivities();
  await seedDefaultCatalogs(opts.overwriteCatalogs === true);
}
