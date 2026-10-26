-- Reviewed against the existing EcoDefill public schema on 2026-10-26.
-- Additive; does not delete accounts, balances, transactions, or maintenance configuration.
ALTER TABLE public."User" ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public."VerificationCode" ADD COLUMN IF NOT EXISTS "attempts" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public."AuthRateLimit" (
    "key" VARCHAR(64) NOT NULL,
    "count" INTEGER NOT NULL,
    "windowStart" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "AuthRateLimit_pkey" PRIMARY KEY ("key")
);
CREATE INDEX IF NOT EXISTS "AuthRateLimit_windowStart_idx" ON public."AuthRateLimit" ("windowStart");
-- Only the trusted Prisma backend should access this table, never public Supabase clients.
ALTER TABLE public."AuthRateLimit" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."AuthRateLimit" FROM anon, authenticated;
