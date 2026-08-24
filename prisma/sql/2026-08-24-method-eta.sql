-- How long each deposit or withdrawal rail takes, in the admin's own words.
-- Null falls back to the default in src/lib/methods.ts, so a client sees a
-- sensible timing whether or not this has been filled in.
--
-- Additive and guarded; safe to run more than once.
ALTER TABLE "DepositMethod"
  ADD COLUMN IF NOT EXISTS "etaLabel" TEXT;
