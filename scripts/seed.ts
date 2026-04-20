/**
 * Standalone seed runner — used by `npm run db:seed` and `npm run db:rebuild`.
 *
 * Calls `runAllSeeds()` from `server/seed.ts` then exits. Idempotent: safe to
 * run repeatedly against an already-seeded DB.
 */
import { runAllSeeds } from "../server/seed";

async function main() {
  console.log("🌱 Scapex seed: starting…");
  await runAllSeeds();
  console.log("🌱 Scapex seed: done.");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
