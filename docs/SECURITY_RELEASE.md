# Security release — 2026-10-26

## Status

Work is on `codex/security-release`, based on `main` commit `1d5e365`.
The stray `==` middleware syntax error was already absent from that commit.
Vercel deployment `dpl_3hMp62hyjecyQ8jrEhi7RK6HSBtW` is READY for that original commit;
this does **not** prove the new security changes have been deployed.

The owner chose to finish code and migration first and rotate exposed database/Gmail credentials later.
No exposed credential has been treated as safe, and no production environment or deployment has been changed by this release work.

## Applied migration

[`20261026000000_auth_security/migration.sql`](../prisma/migrations/20261026000000_auth_security/migration.sql)
was applied through the Supabase connector to **EcoDefill** (`rcunhngesmyuyjegnwli`),
after inspecting its live schema. Supabase recorded `auth_security_20261026`.
`prisma migrate resolve --applied 20261026000000_auth_security` then recorded the same change in Prisma history.
The new columns/table were verified. No `migrate dev`, `db push`, or reset was used.

The migration adds `User.tokenVersion`, `VerificationCode.attempts`, and `AuthRateLimit`.
It preserves accounts, balances, logs, and the maintenance record stored in VerificationCode.
The new rate-limit table has RLS enabled and no public policies; `anon`/`authenticated` access is revoked.
Supabase's informational “RLS Enabled No Policy” notice is intentional for this backend-only table.
The application connects through its trusted Prisma database role.

## Security behavior

- Every private admin page has a server guard; pages that query private data also check before querying. `/scan` is admin-only. Login and password recovery are intentionally public.
- Admin API handlers check the current database role and session version. Middleware verifies HS256 signatures, expiry, issuer and audience; it is not the only authorization layer.
- JWT configuration has no fallback secret. Secrets must contain at least 32 characters. Old-format session JWTs are rejected; users must sign in again after rollout.
- Password resets increment the session version and cancel unused QR/session records. Logout clears the HttpOnly admin cookie; it does not revoke other devices' bearer tokens.
- OTPs use cryptographic randomness, database-backed five-attempt limits, and serialized issuance/consumption. Account creation/reset and successful code consumption commit together. Reset-code requests use a generic account-existence response.
- Login, registration, QR generation and OTP request limits use shared PostgreSQL counters across serverless instances. Expired counter rows may be removed during normal maintenance after one day; retain newer rows.
- Student callers cannot self-award points. `/api/earn-points` is disabled. `/api/add-point` accepts authenticated machine logs only; student credits require QR verification.
- EARN and REDEEM QR codes are single-use. EARN points are calculated from machine item counts (three paper sheets per point), and capped at ten per rolling 24 hours.
- REDEEM amounts must be 1–5 whole points. Verification locks the user row, checks the latest balance and Manila-day five-point cap, binds the signed QR to its user/machine/session/amount/version, and atomically debits and claims it.
- Direct machine verification consumes the dispense authorization once. Admin approval uses the authenticated polling path, whose conditional claim prevents repeated delivery. A lost response can require manual reconciliation; software does not prove physical water delivery.
- Semester expiry rechecks persisted settings under a database lock and commits the balance reset with its completion marker. Database failures fail the request instead of allowing expired balances through.
- `x-machine-secret` and the configured `MACHINE_ID` protect hardware writes, QR verification, and dispense polling. Public `machine-status?check=true` exposes only health telemetry.

## Required rollout sequence

1. Reset the exposed Supabase database password using the owner's project settings. Update both `DATABASE_URL` and `DIRECT_URL` in local `.env` with properly URL-encoded credentials. Verify the session/pooler connection settings from Supabase's Connect panel.
2. Revoke the exposed Gmail app password in the owner's Google account. Create a replacement and set `SMTP_PASS` locally. Never send replacement secrets in chat or commit them.
3. Generate independent random `JWT_SECRET` and `MACHINE_SECRET` values (at least 32 characters); set `MACHINE_ID=MACHINE_01`. Update the appropriate Vercel environments securely. Preview environments currently lack `DATABASE_URL`/`JWT_SECRET`; configure them before preview deployment, preferably with an isolated database.
4. Provision the ignored `hardware/Esp32_Devkit/machine_secrets.h` from its example with the matching machine secret and the issuing root CA for the production HTTPS host. The local file created for compilation contains **placeholders**, not working credentials. The firmware now verifies TLS and requests NTP time. Flash the updated DevKit in a coordinated maintenance window. Do not distribute the firmware secret to web/Flutter clients.
5. Deploy the verified branch to Vercel only after credentials and hardware are ready. Confirm READY state and build logs for the exact new commit. Existing READY deployments use the older source/environment; changing project variables alone does not revoke those deployed credentials.
6. Test real admin/student login, one verification email, password reset/session revocation, and a supervised earn/redeem cycle. Verify one balance change and one physical dispense. Remove obsolete production aliases/deployments as appropriate after successful cutover so old deployments cannot keep serving vulnerable handlers.

Walk-in dispensing is currently controlled locally by Mega firmware; its API records events after dispensing. Securing that API does not make walk-in dispensing dependent on server approval. Camera-to-DevKit HTTP still assumes a trusted local machine network. This release does not claim to solve device compromise or local-network spoofing.

## Verification

- `npm audit`: zero reported vulnerabilities after dependency updates.
- `npm run lint` and `npm run build`: run for this release.
- `npx tsx --test scripts/security.test.ts`: twelve focused tests for JWTs, role/version revocation, private admin paths/APIs, machine authentication, validation, logout, and semester-reset races/failures.
- `node --env-file=.env --import tsx scripts/security-db-check.ts`: real PostgreSQL checks for balance/daily caps, QR replay, persistent OTP attempts, transactional consumption, and shared rate limits. The outer transaction always rolls back. This suite is sequential; it is not a parallel load test.
- ESP32 sketch compiled with `esp32:esp32:esp32doit-devkit-v1`, core 2.0.17 and ArduinoJson 7.4.3. Credentials were placeholders. No firmware was flashed and no physical dispensing was tested.

Dependency upgrades use Next.js 15.5.28, Nodemailer 10.2.1 and Zod 4.6.7,
plus patched PostCSS dependencies. See package manifests for exact resolved versions.
The Next.js async request API adjustment follows the [Next.js 15 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-15);
Zod error customization follows the [Zod migration guide](https://zod.dev/v4/changelog).
