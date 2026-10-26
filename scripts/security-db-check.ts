// Run explicitly with: node --env-file=.env --import tsx scripts/security-db-check.ts
// All fixtures, OTP changes, rate counters, and point mutations are rolled back.
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";
import prisma from "../src/lib/prisma";
import { POST as verifyQr } from "../src/app/api/verify-qr/route";
import {
    storeVerificationCode,
    verifyAndConsumeCode,
    VerificationPurpose,
} from "../src/lib/verification";
import { checkRateLimit } from "../src/lib/ratelimit";

let stage = "connect";
async function main() {
    process.env.JWT_SECRET = randomBytes(48).toString("hex");
    process.env.MACHINE_SECRET = randomBytes(48).toString("hex");
    const rollback = new Error("ROLLBACK_SECURITY_FIXTURES");
    const originalTransaction = prisma.$transaction.bind(prisma);
    const restore: (() => void)[] = [];
    function replace(target: any, key: string, value: any) {
        const original = target[key];
        target[key] = value;
        restore.push(() => {
            target[key] = original;
        });
    }
    try {
        await originalTransaction(
            async (tx) => {
                stage = "fixtures";
                // Exercise application code against PostgreSQL inside an outer rollback-only transaction.
                replace(prisma, "$transaction", async (fn: any) => {
                    await tx.$executeRawUnsafe("SAVEPOINT security_check");
                    try {
                        const result = await fn(tx);
                        await tx.$executeRawUnsafe(
                            "RELEASE SAVEPOINT security_check",
                        );
                        return result;
                    } catch (error) {
                        await tx.$executeRawUnsafe(
                            "ROLLBACK TO SAVEPOINT security_check",
                        );
                        await tx.$executeRawUnsafe(
                            "RELEASE SAVEPOINT security_check",
                        );
                        throw error;
                    }
                });
                replace(prisma, "$queryRaw", tx.$queryRaw.bind(tx));
                replace(
                    prisma.qrToken,
                    "findFirst",
                    tx.qrToken.findFirst.bind(tx.qrToken),
                );
                // Never run semester maintenance on real users during a test.
                replace(prisma.verificationCode, "findFirst", async () => null);

                const id = randomUUID();
                const email = `security-check-${id}@example.invalid`;
                const user = await tx.user.create({
                    data: {
                        id,
                        email,
                        passwordHash: "unusable-test-hash",
                        balance: 1,
                    },
                });
                const machineId = process.env.MACHINE_ID || "MACHINE_01";
                async function makeQr(type: "REDEEM" | "EARN", amount = 0) {
                    const jti = randomUUID();
                    const expiresAt = new Date(Date.now() + 600_000);
                    let token = randomBytes(24).toString("hex");
                    if (type === "REDEEM") {
                        const session = await tx.machineSession.create({
                            data: {
                                userId: id,
                                machineId,
                                jti,
                                expiresAt,
                                pointsToDeduct: amount,
                                amountToDispense: amount * 100,
                            },
                        });
                        token = jwt.sign(
                            {
                                userId: id,
                                tokenVersion: user.tokenVersion,
                                jti,
                                sessionId: session.id,
                            },
                            process.env.JWT_SECRET!,
                            {
                                algorithm: "HS256",
                                issuer: "ecodefill",
                                audience: "ecodefill-redeem",
                                expiresIn: "600s",
                            },
                        );
                    }
                    return tx.qrToken.create({
                        data: {
                            userId: id,
                            type,
                            amount,
                            token,
                            shortToken: "ECO-" + randomBytes(8).toString("hex"),
                            expiresAt,
                        },
                    });
                }
                async function scan(
                    token: string,
                    fields: Record<string, number> = {},
                ) {
                    return verifyQr(
                        new NextRequest("https://example.test/api/verify-qr", {
                            method: "POST",
                            headers: {
                                "content-type": "application/json",
                                "x-machine-secret": process.env.MACHINE_SECRET!,
                            },
                            body: JSON.stringify({
                                token,
                                machineId,
                                ...fields,
                            }),
                        }),
                    );
                }
                stage = "redemption";
                const redemption = await makeQr("REDEEM", 5);
                assert.equal(
                    (await scan(redemption.shortToken!)).status,
                    400,
                    "Insufficient balance must block approval",
                );
                assert.equal(
                    (
                        await tx.qrToken.findUniqueOrThrow({
                            where: { id: redemption.id },
                        })
                    ).used,
                    false,
                );
                await tx.user.update({ where: { id }, data: { balance: 5 } });
                const accepted = await scan(redemption.shortToken!);
                assert.equal(accepted.status, 200);
                assert.equal((await accepted.json()).waterAmount, 500);
                assert.equal(
                    Number(
                        (await tx.user.findUniqueOrThrow({ where: { id } }))
                            .balance,
                    ),
                    0,
                );
                assert.equal(
                    (await scan(redemption.shortToken!)).status,
                    400,
                    "Replay must fail",
                );
                assert.equal(
                    await tx.transaction.count({
                        where: { userId: id, type: "REDEEM" },
                    }),
                    1,
                );
                assert.equal(
                    await tx.machineSession.count({
                        where: { userId: id, status: "DISPENSED" },
                    }),
                    1,
                );

                await tx.user.update({ where: { id }, data: { balance: 5 } });
                const overDaily = await makeQr("REDEEM", 1);
                assert.equal(
                    (await scan(overDaily.shortToken!)).status,
                    400,
                    "Daily cap must be checked at approval",
                );
                stage = "earning";
                const receiving = await makeQr("EARN");
                assert.equal(
                    (
                        await scan(receiving.shortToken!, {
                            amount: 5,
                            bottles: 2,
                            cups: 1,
                        })
                    ).status,
                    400,
                );
                assert.equal(
                    (
                        await scan(receiving.shortToken!, {
                            amount: 3,
                            bottles: 2,
                            cups: 1,
                        })
                    ).status,
                    200,
                );
                assert.equal(
                    (
                        await scan(receiving.shortToken!, {
                            amount: 3,
                            bottles: 2,
                            cups: 1,
                        })
                    ).status,
                    400,
                );
                const excessEarn = await makeQr("EARN");
                assert.equal(
                    (
                        await scan(excessEarn.shortToken!, {
                            amount: 10,
                            bottles: 10,
                        })
                    ).status,
                    400,
                );
                assert.equal(
                    Number(
                        (await tx.user.findUniqueOrThrow({ where: { id } }))
                            .balance,
                    ),
                    8,
                );

                stage = "OTP";
                await storeVerificationCode(
                    email,
                    VerificationPurpose.ResetPassword,
                    "123456",
                );
                for (let i = 0; i < 5; i++)
                    assert.equal(
                        await verifyAndConsumeCode(
                            email,
                            VerificationPurpose.ResetPassword,
                            "000000",
                        ),
                        false,
                    );
                assert.equal(
                    await verifyAndConsumeCode(
                        email,
                        VerificationPurpose.ResetPassword,
                        "123456",
                    ),
                    false,
                    "Five wrong guesses burn the code",
                );
                await storeVerificationCode(
                    email,
                    VerificationPurpose.ResetPassword,
                    "123456",
                );
                await assert.rejects(
                    verifyAndConsumeCode(
                        email,
                        VerificationPurpose.ResetPassword,
                        "123456",
                        async () => {
                            throw new Error("Simulated account update failure");
                        },
                    ),
                );
                assert.equal(
                    await verifyAndConsumeCode(
                        email,
                        VerificationPurpose.ResetPassword,
                        "123456",
                    ),
                    true,
                    "Failed account updates must not consume OTP",
                );
                assert.equal(
                    await verifyAndConsumeCode(
                        email,
                        VerificationPurpose.ResetPassword,
                        "123456",
                    ),
                    false,
                    "OTP reuse must fail",
                );
                for (let i = 0; i < 3; i++)
                    assert.equal(await checkRateLimit(id, 3, 60_000), true);
                assert.equal(await checkRateLimit(id, 3, 60_000), false);
                console.log(
                    "PASS: real PostgreSQL balance, daily caps, QR replay, OTP attempts/rollback/replay, and shared rate-limit checks.",
                );
                throw rollback;
            },
            { timeout: 120_000 },
        );
    } catch (error) {
        if (error !== rollback) throw error;
        console.log(
            "PASS: all test data rolled back. No fixture records committed.",
        );
    } finally {
        while (restore.length) restore.pop()!();
        await prisma.$disconnect();
    }
}
main().catch((error) => {
    console.error("Security database checks failed; transaction rolled back.", {
        stage,
        name: error.name,
        code: error.code,
        ...(error.name === "AssertionError" ? { message: error.message } : {}),
    });
    process.exitCode = 1;
});
