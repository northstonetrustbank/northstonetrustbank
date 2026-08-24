import "server-only";
import { db } from "./db";

/**
 * The shape of a client's balance over time, derived from the ledger — nothing
 * is stored. The running balance is walked forward from the first posted entry
 * so the last point always equals the balance shown on the dashboard.
 */
export type TrendPoint = { at: Date; balanceCents: number };

export type BalanceTrend = {
  points: TrendPoint[];
  minCents: number;
  maxCents: number;
  /** Posted credits and debits inside the window, for the summary tiles. */
  inCents: number;
  outCents: number;
  /** False when there is too little history to draw an honest line. */
  hasShape: boolean;
};

const DAY = 86_400_000;

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

/**
 * Daily closing balance across every account, for the last `days` days.
 *
 * Days without movement carry the previous balance forward, so the line is flat
 * rather than absent — a gap would read as "no money", which is a lie.
 */
export async function balanceTrend(accountIds: string[], days = 90): Promise<BalanceTrend> {
  const empty: BalanceTrend = {
    points: [],
    minCents: 0,
    maxCents: 0,
    inCents: 0,
    outCents: 0,
    hasShape: false,
  };
  if (!accountIds.length) return empty;

  const rows = await db.transaction.findMany({
    where: { accountId: { in: accountIds }, status: "POSTED" },
    select: { amountCents: true, postedAt: true, createdAt: true },
    orderBy: [{ postedAt: "asc" }, { createdAt: "asc" }],
  });
  if (rows.length === 0) return empty;

  const windowStart = startOfDay(new Date(Date.now() - (days - 1) * DAY));

  // Everything posted before the window sets the opening balance.
  let running = 0;
  const inWindow: { at: Date; amountCents: number }[] = [];
  for (const r of rows) {
    const at = r.postedAt ?? r.createdAt;
    if (at < windowStart) running += r.amountCents;
    else inWindow.push({ at, amountCents: r.amountCents });
  }

  let inCents = 0;
  let outCents = 0;

  // Bucket the window's movement by day, then walk day by day so flat stretches
  // still produce points.
  const byDay = new Map<number, number>();
  for (const m of inWindow) {
    const key = startOfDay(m.at).getTime();
    byDay.set(key, (byDay.get(key) ?? 0) + m.amountCents);
    if (m.amountCents >= 0) inCents += m.amountCents;
    else outCents += Math.abs(m.amountCents);
  }

  const points: TrendPoint[] = [];
  const today = startOfDay(new Date()).getTime();
  for (let t = windowStart.getTime(); t <= today; t += DAY) {
    running += byDay.get(t) ?? 0;
    points.push({ at: new Date(t), balanceCents: running });
  }

  const values = points.map((p) => p.balanceCents);
  const minCents = Math.min(...values);
  const maxCents = Math.max(...values);

  return {
    points,
    minCents,
    maxCents,
    inCents,
    outCents,
    // A single flat line says nothing; only draw once the balance has moved.
    hasShape: points.length >= 2 && maxCents !== minCents,
  };
}
