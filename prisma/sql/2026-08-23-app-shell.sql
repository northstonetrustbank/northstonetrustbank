-- App-shell rebuild — schema changes for commit d5a4b16.
--
-- Hand-written equivalent of `prisma db push` for this change, so it can be run
-- from the Supabase SQL editor when the pooler is unreachable from a laptop.
--
-- ADDITIVE ONLY. Nothing is dropped, renamed or rewritten; no existing row is
-- touched. Every statement is guarded, so running it twice is harmless.
--
-- Table and constraint names match exactly what Prisma generates, so a later
-- `prisma db push` sees the schema as already up to date.

-- 1. Card controls on approved products.
--    Limits stay NULL, meaning "no limit set" rather than a limit of zero.
ALTER TABLE "ProductApplication"
  ADD COLUMN IF NOT EXISTS "dailyLimitCents"   INTEGER,
  ADD COLUMN IF NOT EXISTS "monthlyLimitCents" INTEGER,
  ADD COLUMN IF NOT EXISTS "contactless"       BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "onlinePayments"    BOOLEAN NOT NULL DEFAULT true;

-- 2. One row per signed-in device, so a client can end a session they don't
--    recognise. Cookies issued before this carry no session id and keep
--    working until they expire on their own.
CREATE TABLE IF NOT EXISTS "Session" (
  "id"         TEXT         NOT NULL,
  "userId"     TEXT         NOT NULL,
  "label"      TEXT         NOT NULL,
  "userAgent"  TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt"  TIMESTAMP(3) NOT NULL,
  "revokedAt"  TIMESTAMP(3),
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Session_userId_revokedAt_idx"
  ON "Session"("userId", "revokedAt");

-- 3. Support tickets a client can follow to a conclusion.
CREATE TABLE IF NOT EXISTS "SupportTicket" (
  "id"              TEXT         NOT NULL,
  "userId"          TEXT         NOT NULL,
  "reference"       TEXT         NOT NULL,
  "category"        TEXT         NOT NULL,
  "subject"         TEXT         NOT NULL,
  "status"          TEXT         NOT NULL DEFAULT 'OPEN',
  "unreadForAdmin"  BOOLEAN      NOT NULL DEFAULT true,
  "unreadForClient" BOOLEAN      NOT NULL DEFAULT false,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastMessageAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "SupportTicket_reference_key"
  ON "SupportTicket"("reference");
CREATE INDEX IF NOT EXISTS "SupportTicket_userId_lastMessageAt_idx"
  ON "SupportTicket"("userId", "lastMessageAt");
CREATE INDEX IF NOT EXISTS "SupportTicket_status_lastMessageAt_idx"
  ON "SupportTicket"("status", "lastMessageAt");

-- 4. The messages threaded under a ticket.
CREATE TABLE IF NOT EXISTS "TicketMessage" (
  "id"          TEXT         NOT NULL,
  "ticketId"    TEXT         NOT NULL,
  "sender"      TEXT         NOT NULL,
  "authorLabel" TEXT         NOT NULL,
  "body"        TEXT         NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TicketMessage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId")
    REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "TicketMessage_ticketId_createdAt_idx"
  ON "TicketMessage"("ticketId", "createdAt");
