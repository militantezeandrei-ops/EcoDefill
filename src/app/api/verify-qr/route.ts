import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { authenticateMachine } from "@/lib/machine-auth";
import { getAdminAuth } from "@/lib/admin-auth";
import { getJwtSecret } from "@/lib/jwt-config";
import {
    redeemAmountSchema,
    itemCountSchema,
    manilaDayStart,
    pointsForItems,
} from "@/lib/points";
import { getAndEnforceMaintenanceStatus } from "@/lib/maintenance";

const schema = z.object({
    token: z.string().min(1).max(2048),
    machineId: z.string().min(1).max(50),
    amount: z.number().int().min(0).max(10).optional(),
    bottles: itemCountSchema.default(0),
    cups: itemCountSchema.default(0),
    papers: itemCountSchema.default(0),
});
class Rejected extends Error {}

export async function POST(req: NextRequest) {
    try {
        const parsed = schema.safeParse(await req.json());
        if (!parsed.success)
            return NextResponse.json(
                { error: "Invalid machine payload." },
                { status: 400 },
            );
        const { token, machineId, amount, bottles, cups, papers } = parsed.data;
        const machine = authenticateMachine(req, machineId);
        const admin = machine ? null : await getAdminAuth(req);
        if (!machine && !admin)
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        const qr = await prisma.qrToken.findFirst({
            where: { OR: [{ shortToken: token }, { token }] },
        });
        if (!qr)
            return NextResponse.json(
                { error: "Invalid QR code." },
                { status: 404 },
            );
        if (!machine && qr.type !== "REDEEM")
            return NextResponse.json(
                { error: "Only the machine can confirm recycled items." },
                { status: 403 },
            );
        await getAndEnforceMaintenanceStatus();
        const result = await prisma.$transaction(
            async (tx) => {
                // Serialize all changes to this balance and its daily totals, including separate QRs.
                await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${qr.userId}::uuid FOR UPDATE`;
                const user = await tx.user.findUnique({
                    where: { id: qr.userId },
                });
                const current = await tx.qrToken.findUnique({
                    where: { id: qr.id },
                });
                const now = new Date();
                if (
                    !user ||
                    !current ||
                    current.used ||
                    current.expiresAt <= now
                )
                    throw new Rejected("QR expired or already used.");
                const userName =
                    user.fullName || user.email.split("@")[0] || "Student";
                if (current.type === "REDEEM") {
                    let payload: jwt.JwtPayload;
                    try {
                        const decoded = jwt.verify(
                            current.token,
                            getJwtSecret(),
                            {
                                algorithms: ["HS256"],
                                issuer: "ecodefill",
                                audience: "ecodefill-redeem",
                            },
                        );
                        if (typeof decoded === "string") throw new Error();
                        payload = decoded;
                    } catch {
                        throw new Rejected("Invalid redemption session.");
                    }
                    if (
                        typeof payload.jti !== "string" ||
                        payload.userId !== user.id ||
                        payload.tokenVersion !== user.tokenVersion
                    )
                        throw new Rejected("Invalid redemption session.");
                    const session = await tx.machineSession.findUnique({
                        where: { jti: payload.jti },
                    });
                    const points = Number(current.amount);
                    if (
                        !redeemAmountSchema.safeParse(points).success ||
                        !session ||
                        session.id !== payload.sessionId ||
                        session.userId !== user.id ||
                        session.machineId !== machineId ||
                        session.expiresAt <= now ||
                        session.status !== "INITIATED" ||
                        Number(session.pointsToDeduct) !== points ||
                        Number(session.amountToDispense) !== points * 100
                    )
                        throw new Rejected("Invalid redemption session.");
                    const daily = await tx.transaction.aggregate({
                        where: {
                            userId: user.id,
                            type: "REDEEM",
                            createdAt: { gte: manilaDayStart(now) },
                        },
                        _sum: { amount: true },
                    });
                    if (Number(daily._sum.amount || 0) + points > 5)
                        throw new Rejected("Daily redeem limit exceeded.");
                    const debit = await tx.user.updateMany({
                        where: { id: user.id, balance: { gte: points } },
                        data: { balance: { decrement: points } },
                    });
                    if (debit.count !== 1)
                        throw new Rejected("Insufficient balance.");
                    const claim = await tx.machineSession.updateMany({
                        where: { id: session.id, status: "INITIATED" },
                        data: { status: machine ? "DISPENSED" : "APPROVED" },
                    });
                    if (claim.count !== 1)
                        throw new Rejected("Session already processed.");
                    await tx.transaction.create({
                        data: {
                            userId: user.id,
                            amount: points,
                            type: "REDEEM",
                        },
                    });
                    await tx.qrToken.update({
                        where: { id: qr.id },
                        data: { used: true, usedAt: now },
                    });
                    return {
                        userName,
                        pointsDeducted: points,
                        waterAmount: points * 100,
                    };
                }
                if (current.type !== "EARN")
                    throw new Rejected("Invalid QR type.");
                const points = pointsForItems(bottles, cups, papers);
                if (points < 1 || points > 10 || amount !== points)
                    throw new Rejected(
                        "Points do not match recycled item counts.",
                    );
                const daily = await tx.transaction.aggregate({
                    where: {
                        userId: user.id,
                        type: "EARN",
                        createdAt: {
                            gte: new Date(now.getTime() - 86_400_000),
                        },
                    },
                    _sum: { amount: true },
                });
                if (Number(daily._sum.amount || 0) + points > 10)
                    throw new Rejected("Daily earning limit reached.");
                await tx.user.update({
                    where: { id: user.id },
                    data: { balance: { increment: points } },
                });
                await tx.transaction.create({
                    data: {
                        userId: user.id,
                        amount: points,
                        type: "EARN",
                        materialType:
                            bottles >= cups && bottles >= Math.floor(papers / 3)
                                ? "BOTTLE"
                                : cups >= Math.floor(papers / 3) ? "CUP" : "PAPER",
                        count: bottles + cups + papers,
                    },
                });
                for (const [materialType, count, earned] of [
                    ["BOTTLE", bottles, bottles],
                    ["CUP", cups, cups],
                    ["PAPER", papers, Math.floor(papers / 3)],
                ] as const) {
                    if (count > 0)
                        await tx.recyclingLog.create({
                            data: {
                                machineId,
                                userId: user.id,
                                materialType,
                                count,
                                pointsEarned: earned,
                                isWalkIn: false,
                                status: "SUCCESS",
                            },
                        });
                }
                await tx.qrToken.update({
                    where: { id: qr.id },
                    data: { used: true, usedAt: now },
                });
                return { userName, pointsDeducted: -points, waterAmount: 0 };
            },
            { timeout: 10_000 },
        );
        return NextResponse.json({
            success: true,
            message: "QR verified.",
            ...result,
        });
    } catch (error) {
        if (error instanceof Rejected)
            return NextResponse.json({ error: error.message }, { status: 400 });
        console.error("QR verification failed");
        return NextResponse.json(
            { error: "Verification failed." },
            { status: 500 },
        );
    }
}
