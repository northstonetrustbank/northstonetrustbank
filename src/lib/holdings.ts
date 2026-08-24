import "server-only";
import { db } from "./db";
import { productDef, type ProductDef } from "./products";
import { latestByKey } from "./product-view";
import type { Prisma } from "@prisma/client";

export type Holding = {
  app: Prisma.ProductApplicationGetPayload<Record<string, never>>;
  def: ProductDef;
};

export type Holdings = {
  /** Approved card products — the ones with a card face. */
  cards: Holding[];
  /** Approved lending: installment loans and revolving credit lines. */
  loans: Holding[];
  /** Applications still with the team, across every product. */
  pending: Holding[];
  /** Everything approved, in application order. */
  all: Holding[];
};

/**
 * The client's approved products, split the way the app navigates them: cards
 * on the cards page, borrowing on the loans page. Only the latest application
 * per product counts, so a declined-then-approved product shows once.
 */
export async function loadHoldings(userId: string, accountType: string): Promise<Holdings> {
  const applications = await db.productApplication.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  const latest = [...latestByKey(applications).values()];
  const withDefs = latest.flatMap((app) => {
    const def = productDef(accountType, app.productKey);
    return def ? [{ app, def }] : [];
  });

  const approved = withDefs.filter((h) => h.app.status === "APPROVED");

  return {
    cards: approved.filter((h) => h.def.card),
    loans: approved.filter((h) => !h.def.card && h.def.credit),
    pending: withDefs.filter((h) => h.app.status === "SUBMITTED"),
    all: approved,
  };
}
