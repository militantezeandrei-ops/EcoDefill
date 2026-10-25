# Web and API guide

Next.js App Router serves web and API. Use package.json/package-lock.json for versions and prisma/schema.prisma for database structure.

## Entry points

Student pages: src/app/(dashboard)/. Admin: src/app/admin/, including its (dashboard) group. Parenthesized route groups are not URL segments. Public auth: src/app/login/, register/, forgot-password/.

Shared auth: src/lib/auth.ts, src/lib/api-middleware.ts, src/middleware.ts. Web API client: src/lib/api.ts. Prisma singleton: src/lib/prisma.ts.

## QR workflows

Current web/Flutter callers use POST /api/qr-generate to receive points and POST /api/redeem-initiate to redeem water. They poll GET /api/qr-status. DevKit submits short tokens to POST /api/verify-qr.

- qr-generate issues/reuses EARN tokens. New tokens expire at the end of the server's current day; do not assume 60 seconds or Manila timezone behavior.
- redeem-initiate creates MachineSession and REDEEM token with 600-second expiry; volume is points * 100 ml.
- verify-qr looks up shortToken, checks expiry with 10-second grace, and processes accounting/session state inside a database transaction. EARN and REDEEM use behavior differs; inspect before changing replay/polling logic.
- /api/redeem-points and /api/earn-points also exist as distinct implementations. Inspect callers rather than treating them as interchangeable with the session flow.

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

Models: User, VerificationCode, Transaction, QrToken, MachineSession, RecyclingLog, MachineLog. Role is an enum; do not assume token types/statuses are schema enums.

User stores passwordHash and Decimal balance. Transaction.userId is nullable; materialType stores material information. QrToken stores token, shortToken, type, amount, expiresAt, used, usedAt. MachineSession tracks machineId, jti, status, pointsToDeduct, amountToDispense. Read schema for constraints/relations.

See AGENTS.md for checks and CONVENTIONS.md for schema restrictions.
