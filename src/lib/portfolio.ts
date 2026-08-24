import "server-only";
import { db } from "./db";
import { ensureAccount } from "./bank";

export type PortfolioAccount = {
  id: string;
  number: string;
  kind: string; // CHECKING | SAVINGS
  currency: string;
  balanceCents: number;
  pendingDepositCents: number;
  pendingWithdrawalCents: number;
  /** Balance less anything already earmarked by a pending withdrawal. */
  availableCents: number;
  createdAt: Date;
};

export type Portfolio = {
  accounts: PortfolioAccount[];
  primary: PortfolioAccount;
  savings: PortfolioAccount | null;
  totalCents: number;
  totalPendingDepositCents: number;
  /** Committed to a withdrawal or a transfer held at the VAT gate. */
  totalPendingWithdrawalCents: number;
  currency: string;
  accountIds: string[];
};

/**
 * Every account a client holds, each with its balance derived from the ledger,
 * plus the portfolio total. One query per figure across all accounts rather
 * than per account, so adding accounts doesn't add round trips.
 */
export async function loadPortfolio(userId: string): Promise<Portfolio> {
  // Guarantees the client always has at least a checking account.
  await ensureAccount(userId);

  const accounts = await db.account.findMany({
    where: { userId },
    orderBy: [{ kind: "asc" }, { createdAt: "asc" }],
  });
  const ids = accounts.map((a) => a.id);

  const [posted, pendingIn, pendingOut] = await Promise.all([
    db.transaction.groupBy({
      by: ["accountId"],
      where: { accountId: { in: ids }, status: "POSTED" },
      _sum: { amountCents: true },
    }),
    db.transaction.groupBy({
      by: ["accountId"],
      where: { accountId: { in: ids }, status: "PENDING", type: "DEPOSIT" },
      _sum: { amountCents: true },
    }),
    db.transaction.groupBy({
      by: ["accountId"],
      where: { accountId: { in: ids }, status: "PENDING", type: "WITHDRAWAL" },
      _sum: { amountCents: true },
    }),
  ]);

  const sumBy = (rows: { accountId: string; _sum: { amountCents: number | null } }[], id: string) =>
    rows.find((r) => r.accountId === id)?._sum.amountCents ?? 0;

  const enriched: PortfolioAccount[] = accounts.map((a) => {
    const balance = sumBy(posted, a.id);
    const pendIn = sumBy(pendingIn, a.id);
    const pendOut = Math.abs(sumBy(pendingOut, a.id));
    return {
      id: a.id,
      number: a.number,
      kind: a.kind,
      currency: a.currency,
      balanceCents: balance,
      pendingDepositCents: pendIn,
      pendingWithdrawalCents: pendOut,
      availableCents: balance - pendOut,
      createdAt: a.createdAt,
    };
  });

  // Checking sorts before Savings, so the first one is the primary account.
  const primary = enriched.find((a) => a.kind === "CHECKING") ?? enriched[0];
  const savings = enriched.find((a) => a.kind === "SAVINGS") ?? null;

  return {
    accounts: enriched,
    primary,
    savings,
    totalCents: enriched.reduce((sum, a) => sum + a.balanceCents, 0),
    totalPendingDepositCents: enriched.reduce((sum, a) => sum + a.pendingDepositCents, 0),
    // Money already committed to a withdrawal or a transfer held at the VAT
    // gate. The headline is labelled as available, so this has to come off it.
    totalPendingWithdrawalCents: enriched.reduce((sum, a) => sum + a.pendingWithdrawalCents, 0),
    currency: primary?.currency ?? "USD",
    accountIds: ids,
  };
}

/**
 * Change in total balance over the last 30 days, as a percentage of where the
 * portfolio stood a month ago. Returns null when there is no meaningful prior
 * balance to compare against — better to show nothing than a fake "+0.0%".
 */
export async function monthChangePercent(accountIds: string[], totalCents: number) {
  if (!accountIds.length) return null;
  const since = new Date(Date.now() - 30 * 86_400_000);
  const agg = await db.transaction.aggregate({
    where: { accountId: { in: accountIds }, status: "POSTED", postedAt: { gte: since } },
    _sum: { amountCents: true },
  });
  const movement = agg._sum.amountCents ?? 0;
  const before = totalCents - movement;
  if (before <= 0 || movement === 0) return null;
  return (movement / before) * 100;
}
