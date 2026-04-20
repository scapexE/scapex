/**
 * Standalone seed runner — used by `npm run db:seed` and `npm run db:rebuild`.
 *
 * Calls `runAllSeeds()` from `server/seed.ts` then exits. Idempotent: safe to
 * run repeatedly against an already-seeded DB.
 */
import { runAllSeeds } from "../server/seed";

/**
 * Set `SCAPEX_SEED_OVERWRITE_CATALOGS=yes` to also reset admin-customised
 * catalog values (deal pipeline, project stages, etc.) to canonical
 * defaults. The DB rebuild script does this automatically. A plain
 * `npx tsx scripts/seed.ts` is purely additive and preserves customisations.
 */
async function main() {
  const overwriteCatalogs = process.env.SCAPEX_SEED_OVERWRITE_CATALOGS === "yes";
  console.log(`🌱 Scapex seed: starting… (overwriteCatalogs=${overwriteCatalogs})`);
  await runAllSeeds({ overwriteCatalogs });
  console.log("🌱 Scapex seed: done.");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
