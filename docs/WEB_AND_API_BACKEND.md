# Web and API guide

Next.js App Router serves web and API. Use package.json/package-lock.json for versions and prisma/schema.prisma for database structure.

## Entry points

Student pages: src/app/(dashboard)/. Admin: src/app/admin/, including its (dashboard) group. Parenthesized route groups are not URL segments. Public auth: src/app/login/, register/, forgot-password/.

Shared auth: src/lib/auth.ts, src/lib/api-middleware.ts, src/middleware.ts. Web API client: src/lib/api.ts. Prisma singleton: src/lib/prisma.ts.

Server authorization uses src/lib/session.ts and src/lib/admin-auth.ts to check signed JWT claims against the current user role and tokenVersion. Admin server pages and APIs enforce these checks independently of middleware. Login and recovery are public; `/scan` requires an administrator. Password resets invalidate existing sessions; `/api/auth/logout` clears the HttpOnly admin cookie. See [security rollout](SECURITY_RELEASE.md) before deploying these changes.

## QR workflows

Current web/Flutter callers use POST /api/qr-generate to receive points and POST /api/redeem-initiate to redeem water. They poll GET /api/qr-status. DevKit submits short tokens to POST /api/verify-qr.

- qr-generate issues/reuses EARN tokens. New tokens expire at the end of the server's current day; do not assume 60 seconds or Manila timezone behavior.
- redeem-initiate creates MachineSession and REDEEM token atomically with 600-second expiry; amount is 1–5 whole points and volume is points * 100 ml. `/api/redeem-points` delegates to this same session flow.
- verify-qr requires a machine credential for earning, or a current admin/machine identity for redemption. Both token types are single-use and expire without grace. A row lock serializes balance and limit checks. Earning is calculated from item counts; redemption rechecks the signed session, balance and five-point Manila-day cap at approval time. Direct machine verification consumes its dispense authorization; admin approval is claimed once through authenticated polling.
- `/api/earn-points` rejects self-awarded points. Student credits only enter through authenticated machine QR confirmation. `/api/add-point` is for authenticated machine event logs and rejects a student userId.

These describe current code, not uniform policy across endpoints. Check generation, verification, polling, client refresh, and firmware together when changing the workflow.

## Other entry points

| Route | Purpose |
| --- | --- |
| /api/user-balance | Balance/dashboard |
| /api/user-transactions | History |
| /api/course-ranking | Ranking |
| /api/auth/request-verification-code | Email codes |
| /api/auth/reset-password | Password reset |
| /api/add-point, /api/machine-walkin | Machine recycling/walk-in accounting |
| /api/machine-status | Telemetry reads/writes |
| /api/admin/ | Administrative handlers |

Check methods, authorization, payloads, and responses in route.ts and callers. Response shapes vary; follow CONVENTIONS.md.

## Database

Models: User, VerificationCode, AuthRateLimit, Transaction, QrToken, MachineSession, RecyclingLog, MachineLog. Role is an enum; do not assume token types/statuses are schema enums.

User stores passwordHash, tokenVersion and Decimal balance. VerificationCode stores persistent attempt counts; OTP issuance/consumption uses database locks, and successful consumption shares the account-change transaction. AuthRateLimit stores hashed keys and fixed-window counters. Transaction.userId is nullable; materialType stores material information. QrToken stores token, shortToken, type, amount, expiresAt, used, usedAt. MachineSession tracks machineId, jti, status, pointsToDeduct, amountToDispense. Read schema for constraints/relations.

Semester reset reads the persisted maintenance configuration and commits the balance reset and completion marker together under a shared database lock. A concurrent filter edit preserves completed reset metadata. The same VerificationCode table still holds maintenance configuration records; OTP operations are restricted to their own purpose/email keys.

See AGENTS.md for checks and CONVENTIONS.md for schema restrictions.
