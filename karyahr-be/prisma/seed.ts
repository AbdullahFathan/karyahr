/**
 * Seed aggregator. Per-module seeds live in `src/modules/<feature>/data/seed.ts` (Phase 1).
 */
async function main(): Promise<void> {
  // No seed data in Phase 0.
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
