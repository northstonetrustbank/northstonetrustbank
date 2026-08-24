-- Saved payees, so a client enters an account number once instead of every
-- month, and a ledger row can point at the payee it went to.
--
-- Additive and guarded; safe to run more than once. Names match what Prisma
-- generates, so a later `prisma db push` sees the schema as already applied.

CREATE TABLE IF NOT EXISTS "Payee" (
  "id"             TEXT         NOT NULL,
  "userId"         TEXT         NOT NULL,
  "name"           TEXT         NOT NULL,
  "nickname"       TEXT,
  "kind"           TEXT         NOT NULL DEFAULT 'BILLER',
  "methodKey"      TEXT,
  "accountRef"     TEXT,
  "institution"    TEXT,
  "internalUserId" TEXT,
  "lastPaidAt"     TIMESTAMP(3),
  "archivedAt"     TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Payee_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Payee_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Payee_userId_archivedAt_idx"
  ON "Payee"("userId", "archivedAt");

-- A ledger row can point at the payee it paid. ON DELETE SET NULL, because a
-- payment's history must outlive the payee record.
ALTER TABLE "Transaction"
  ADD COLUMN IF NOT EXISTS "payeeId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Transaction_payeeId_fkey'
  ) THEN
    ALTER TABLE "Transaction"
      ADD CONSTRAINT "Transaction_payeeId_fkey" FOREIGN KEY ("payeeId")
      REFERENCES "Payee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Transaction_payeeId_createdAt_idx"
  ON "Transaction"("payeeId", "createdAt");
