/**
 * Backfill activity_id on legacy rows after the activity-scope migration.
 *
 * Strategy: for each table that just got `activity_id`, every row whose
 * activity_id is NULL is assigned to the first active business activity of
 * the row's company (when the table has a company_id). Rows with no
 * company_id and no activity get the very first active activity in the
 * system as a last resort, so non-privileged users can still see them
 * after the new scope guards are turned on.
 *
 * Usage: tsx scripts/backfill-activity-id.ts
 */
import { Pool } from "pg";

const TABLES_WITH_COMPANY: string[] = [
  "vendors", "purchase_orders", "warehouses", "inventory_items", "stock_movements",
  "chart_of_accounts", "journal_entries", "invoices", "payments",
  "departments", "employees", "payroll_batches", "attendance_records", "leave_requests",
  "projects", "drawings", "permits", "incidents", "inspections", "safety_trainings",
  "assets", "documents", "approval_requests", "services", "contracts", "proposals",
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const fallback = await pool.query<{ id: string }>(
      `select id from business_activities where active = true order by created_at asc limit 1`,
    );
    const fallbackId = fallback.rows[0]?.id || null;
    if (!fallbackId) {
      console.log("No active business activity found — nothing to backfill.");
      return;
    }
    let totals = 0;
    for (const table of TABLES_WITH_COMPANY) {
      // Skip tables that don't actually exist yet.
      const exists = await pool.query<{ exists: boolean }>(
        `select exists (select 1 from information_schema.columns where table_name=$1 and column_name='activity_id') as exists`,
        [table],
      );
      if (!exists.rows[0]?.exists) {
        console.log(`- ${table}: no activity_id column, skipping`);
        continue;
      }
      const hasCompany = await pool.query<{ exists: boolean }>(
        `select exists (select 1 from information_schema.columns where table_name=$1 and column_name='company_id') as exists`,
        [table],
      );
      let updated = 0;
      if (hasCompany.rows[0]?.exists) {
        // Deterministic pick: the oldest active activity for the row's company.
        // Without this the join is non-deterministic when a company owns several
        // active activities, which would scatter legacy rows arbitrarily.
        const r1 = await pool.query(
          `update ${table} t
             set activity_id = picked.id
             from (
               select distinct on (company_id) company_id, id
                 from business_activities
                where active = true
                order by company_id, created_at asc, id asc
             ) picked
            where t.activity_id is null
              and picked.company_id = t.company_id`,
        );
        updated += r1.rowCount || 0;
      }
      const r2 = await pool.query(
        `update ${table} set activity_id = $1 where activity_id is null`,
        [fallbackId],
      );
      updated += r2.rowCount || 0;
      totals += updated;
      console.log(`- ${table}: backfilled ${updated} row(s)`);
    }
    console.log(`Done. Total rows updated: ${totals}`);
  } finally {
    await pool.end();
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
