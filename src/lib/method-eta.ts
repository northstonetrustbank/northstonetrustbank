import "server-only";
import { db } from "./db";

/**
 * Admin's own wording for how long each rail takes, keyed by method.
 *
 * Read on its own and guarded, because the column is added by a migration that
 * may not have run yet. When it hasn't, this returns nothing and every method
 * falls back to the default in methods.ts — a page must never 500 because a
 * migration is outstanding.
 */
export async function methodEtaOverrides(): Promise<Record<string, string | null>> {
  try {
    const rows = await db.$queryRaw<{ key: string; etaLabel: string | null }[]>`
      SELECT "key", "etaLabel" FROM "DepositMethod"
    `;
    return Object.fromEntries(rows.map((r) => [r.key, r.etaLabel]));
  } catch {
    return {};
  }
}

/** Stores one override. Silently does nothing until the column exists. */
export async function saveMethodEta(key: string, etaLabel: string | null) {
  try {
    await db.$executeRaw`
      UPDATE "DepositMethod" SET "etaLabel" = ${etaLabel} WHERE "key" = ${key}
    `;
  } catch {
    // Migration outstanding — the catalogue default keeps being used.
  }
}
