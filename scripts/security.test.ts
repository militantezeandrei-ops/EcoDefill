import assert from "node:assert/strict";
import { test, afterEach } from "node:test";
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";
import { signToken, verifyToken } from "../src/lib/auth";
import { verifySession } from "../src/lib/session";
import prisma from "../src/lib/prisma";
import { middleware } from "../src/middleware";
import { authenticateMachine } from "../src/lib/machine-auth";
import {
    redeemAmountSchema,
    pointsForItems,
    manilaDayStart,
} from "../src/lib/points";
import { POST as verifyQr } from "../src/app/api/verify-qr/route";
import { POST as addPoint } from "../src/app/api/add-point/route";
import { POST as walkIn } from "../src/app/api/machine-walkin/route";
import {
    POST as heartbeat,
    GET as poll,
} from "../src/app/api/machine-status/route";
import { POST as earn } from "../src/app/api/earn-points/route";
import { GET as notifications } from "../src/app/api/admin/notifications/registrations/route";
import { GET as reports } from "../src/app/api/admin/reports/export/route";
import { GET as maintenance } from "../src/app/api/admin/maintenance/route";
import { POST as logout } from "../src/app/api/auth/logout/route";
import { getAndEnforceMaintenanceStatus, saveMaintenanceConfig } from "../src/lib/maintenance";

process.env.JWT_SECRET = "test-only-secret-".repeat(4);
process.env.MACHINE_SECRET = "test-only-machine-".repeat(4);
const userId = "00000000-0000-4000-8000-000000000001";
const payload = { userId, role: "ADMIN", tokenVersion: 2 };
const restorers: (() => void)[] = [];
function stub(target: any, key: string, value: (...args: any[]) => any) {
    const original = target[key];
    target[key] = value;
    restorers.push(() => {
        target[key] = original;
    });
}
afterEach(() => {
    while (restorers.length) restorers.pop()!();
});

function request(
    path: string,
    body?: unknown,
    headers: Record<string, string> = {},
) {
    return new NextRequest("https://example.test" + path, {
        method: body === undefined ? "GET" : "POST",
        headers: { "content-type": "application/json", ...headers },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
}

test("JWT verification requires signature, algorithm, audience, expiry and typed claims", () => {
    assert.equal(verifyToken(signToken(payload))?.userId, userId);
    const invalid = [
        jwt.sign(payload, "wrong-key", { expiresIn: "7d" }),
        jwt.sign(payload, process.env.JWT_SECRET!, {
            algorithm: "HS384",
            expiresIn: "7d",
            issuer: "ecodefill",
            audience: "ecodefill-session",
        }),
        jwt.sign(payload, process.env.JWT_SECRET!, {
            expiresIn: -1,
            issuer: "ecodefill",
            audience: "ecodefill-session",
        }),
        jwt.sign(payload, process.env.JWT_SECRET!, {
            issuer: "ecodefill",
            audience: "ecodefill-session",
        }),
        jwt.sign(payload, process.env.JWT_SECRET!, {
            expiresIn: "7d",
            issuer: "ecodefill",
            audience: "ecodefill-redeem",
        }),
        signToken({ ...payload, userId: "invalid-id" }),
    ];
    for (const token of invalid) assert.equal(verifyToken(token), null);
});

test("JWT signing fails closed when the secret is missing", () => {
    const secret = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    try {
        assert.throws(() => signToken(payload));
    } finally {
        process.env.JWT_SECRET = secret;
    }
});

test("database role changes and password resets revoke sessions", async () => {
    const user = { role: "ADMIN", tokenVersion: 2 };
    stub(prisma.user, "findUnique", async () => user);
    const token = signToken(payload);
    assert.ok(await verifySession(token));
    user.tokenVersion = 3;
    assert.equal(await verifySession(token), null);
    user.tokenVersion = 2;
    user.role = "STUDENT";
    assert.equal(await verifySession(token), null);
});

test("every private admin URL rejects forged JWTs at middleware", async () => {
    const fake = jwt.sign(payload, "attacker");
    for (const page of [
        "",
        "/dashboard",
        "/users",
        "/reports",
        "/transactions",
        "/recycling",
        "/maintenance",
        "/settings",
        "/scanner",
    ]) {
        const response = await middleware(
            request("/admin" + page, undefined, {
                cookie: "adminAuthToken=" + fake,
            }),
        );
        assert.equal(response.status, 307);
        assert.equal(
            response.headers.get("location"),
            "https://example.test/admin/login",
        );
    }
    assert.equal(
        (
            await middleware(
                request("/admin/dashboard", undefined, {
                    cookie: "adminAuthToken=" + signToken(payload),
                }),
            )
        ).status,
        200,
    );
});

test("admin API handlers reject unsigned or student identities independently of middleware", async () => {
    stub(prisma.user, "findUnique", async () => ({
        role: "STUDENT",
        tokenVersion: 2,
    }));
    for (const handler of [notifications, reports, maintenance]) {
        assert.equal((await handler(request("/api/admin/test"))).status, 401);
        const cookie =
            "adminAuthToken=" + signToken({ ...payload, role: "STUDENT" });
        assert.equal(
            (await handler(request("/api/admin/test", undefined, { cookie })))
                .status,
            401,
        );
    }
});

test("machine credentials bind to the configured machine and fail closed when unset", () => {
    const req = request(
        "/",
        {},
        { "x-machine-secret": process.env.MACHINE_SECRET! },
    );
    assert.equal(authenticateMachine(req, "MACHINE_01"), true);
    assert.equal(authenticateMachine(req, "another-machine"), false);
    const secret = process.env.MACHINE_SECRET;
    delete process.env.MACHINE_SECRET;
    try {
        assert.equal(authenticateMachine(request("/"), "MACHINE_01"), false);
    } finally {
        process.env.MACHINE_SECRET = secret;
    }
});

test("unauthenticated callers cannot mint points, submit telemetry, approve or claim dispensing", async () => {
    for (const handler of [verifyQr, addPoint, walkIn, heartbeat]) {
        const response = await handler(
            request("/", { token: "ECO-TEST", machineId: "MACHINE_01" }),
        );
        assert.equal(response.status, 401);
    }
    assert.equal(
        (await poll(request("/api/machine-status?machineId=MACHINE_01")))
            .status,
        401,
    );
    assert.equal((await earn()).status, 403);
});

test("redemption and material counts cannot invent negative, fractional, or excessive points", () => {
    for (const amount of [0, -1, 1.5, 6, "5", null, Infinity, NaN])
        assert.equal(redeemAmountSchema.safeParse(amount).success, false);
    assert.equal(redeemAmountSchema.safeParse(5).success, true);
    assert.equal(pointsForItems(2, 1, 5), 4);
    assert.equal(
        manilaDayStart(new Date("2026-10-26T16:01:00Z")).toISOString(),
        "2026-10-26T16:00:00.000Z",
    );
});

test("logout clears the HttpOnly admin cookie on the server", async () => {
    const response = await logout();
    assert.match(response.headers.get("set-cookie")!, /adminAuthToken=;/);
    assert.match(response.headers.get("set-cookie")!, /Max-Age=0/i);
    assert.match(response.headers.get("set-cookie")!, /HttpOnly/i);
});

const expiredConfig = {
    semesterStartDate: '2020-01-01T00:00:00Z', semesterEndDate: '2020-05-01T00:00:00Z',
    semesterResetDone: false, lastPointsResetAt: null, filterStartDate: null,
    filterReplacedCount: 0, updatedAt: '2020-01-01T00:00:00Z',
};

test('another instance completing expiry prevents a second balance reset', async () => {
    stub(prisma.verificationCode, 'findFirst', async () => ({ codeHash: JSON.stringify(expiredConfig) }));
    let resets = 0;
    const current = { ...expiredConfig, semesterResetDone: true };
    stub(prisma, '$transaction', async (fn: any) => fn({
        $executeRaw: async () => 1,
        verificationCode: { findFirst: async () => ({ id: userId, codeHash: JSON.stringify(current) }) },
        user: { updateMany: async () => { resets++; } },
    }));
    const status = await getAndEnforceMaintenanceStatus();
    assert.equal(status.semesterResetDone, true);
    assert.equal(resets, 0);
});

test('failed semester reset blocks the caller instead of serving expired balances', async () => {
    stub(prisma.verificationCode, 'findFirst', async () => ({ codeHash: JSON.stringify(expiredConfig) }));
    stub(prisma, '$transaction', async () => { throw new Error('Database unavailable'); });
    await assert.rejects(getAndEnforceMaintenanceStatus(), /Database unavailable/);
});

test('a stale filter edit cannot undo completed semester expiry', async () => {
    const current = { ...expiredConfig, semesterResetDone: true, lastPointsResetAt: '2020-05-01T00:00:00Z' };
    stub(prisma, '$transaction', async (fn: any) => fn({
        $executeRaw: async () => 1,
        verificationCode: {
            findFirst: async () => ({ id: userId, codeHash: JSON.stringify(current) }),
            update: async () => ({}),
        },
    }));
    const saved = await saveMaintenanceConfig({ ...expiredConfig, filterStartDate: new Date().toISOString() });
    assert.equal(saved.semesterResetDone, true);
    assert.equal(saved.lastPointsResetAt, current.lastPointsResetAt);
});
