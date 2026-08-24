// Saved payees — the people and companies a client pays more than once.
//
// Every read here is guarded. The Payee table arrives in its own migration, and
// a deployment that has the code but not yet the table must degrade to "no
// payees saved" rather than take the payments page down. That has bitten this
// app twice; it does not get to happen a third time.
import { db } from "@/lib/db";

export type Payee = {
  id: string;
  name: string;
  nickname: string | null;
  kind: string;
  methodKey: string | null;
  accountRef: string | null;
  institution: string | null;
  internalUserId: string | null;
  lastPaidAt: Date | null;
};

/** True once the migration has run. Cached per request by Next's fetch cache. */
export async function payeesReady() {
  try {
    await db.$queryRaw`SELECT 1 FROM "Payee" LIMIT 1`;
    return true;
  } catch {
    return false;
  }
}

export async function listPayees(userId: string): Promise<Payee[]> {
  try {
    return await db.payee.findMany({
      where: { userId, archivedAt: null },
      orderBy: [{ lastPaidAt: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        nickname: true,
        kind: true,
        methodKey: true,
        accountRef: true,
        institution: true,
        internalUserId: true,
        lastPaidAt: true,
      },
    });
  } catch {
    return [];
  }
}

export async function getPayee(userId: string, id: string): Promise<Payee | null> {
  try {
    return await db.payee.findFirst({
      where: { id, userId, archivedAt: null },
      select: {
        id: true,
        name: true,
        nickname: true,
        kind: true,
        methodKey: true,
        accountRef: true,
        institution: true,
        internalUserId: true,
        lastPaidAt: true,
      },
    });
  } catch {
    return null;
  }
}

/**
 * What a payee is called on a receipt and in the admin queue. The nickname is
 * the client's private label, so it goes in brackets rather than replacing the
 * real name — whoever settles the payment needs to see who is actually paid.
 */
export function payeeLabel(p: Pick<Payee, "name" | "nickname">) {
  return p.nickname ? `${p.name} (${p.nickname})` : p.name;
}

/** The line an admin reads in the withdrawals queue. */
export function payeeCounterparty(p: Payee, memo?: string) {
  const parts = [payeeLabel(p)];
  if (p.institution) parts.push(p.institution);
  if (p.accountRef) parts.push(p.accountRef);
  if (memo) parts.push(`Memo: ${memo}`);
  return parts.join(" · ");
}

/** Everything paid to one payee, newest first. */
export async function payeeHistory(userId: string, payeeId: string) {
  try {
    return await db.transaction.findMany({
      where: { payeeId, account: { userId } },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        reference: true,
        amountCents: true,
        status: true,
        note: true,
        createdAt: true,
        postedAt: true,
      },
    });
  } catch {
    return [];
  }
}

/** Every bill payment the client has made, across all payees. */
export async function billHistory(userId: string, take = 30) {
  try {
    return await db.transaction.findMany({
      where: { payeeId: { not: null }, account: { userId } },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        reference: true,
        amountCents: true,
        status: true,
        note: true,
        methodKey: true,
        createdAt: true,
        payee: { select: { id: true, name: true, nickname: true } },
      },
    });
  } catch {
    return [];
  }
}
