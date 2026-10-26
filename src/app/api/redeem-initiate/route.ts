import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { randomBytes, randomUUID } from "node:crypto";
import { authenticateRequest, handleApiError } from "@/lib/api-middleware";
import { getAndEnforceMaintenanceStatus } from "@/lib/maintenance";
import { getJwtSecret } from "@/lib/jwt-config";
import { redeemAmountSchema, manilaDayStart } from "@/lib/points";

export async function POST(req: NextRequest) {
    try {
        const auth = await authenticateRequest(req);
        if (auth.error)
            return NextResponse.json(
                { error: auth.error },
                { status: auth.status },
            );
        const parsed = redeemAmountSchema.safeParse((await req.json()).amount);
        if (!parsed.success)
            return NextResponse.json(
                { error: "Amount must be 1 to 5 whole points." },
                { status: 400 },
            );
        const amount = parsed.data;
        await getAndEnforceMaintenanceStatus();
        const user = await prisma.user.findUnique({
            where: { id: auth.user!.userId },
        });
        if (!user || Number(user.balance) < amount)
            return NextResponse.json(
                { error: "Insufficient balance" },
                { status: 400 },
            );
        const redeemed = await prisma.transaction.aggregate({
            where: {
                userId: user.id,
                type: "REDEEM",
                createdAt: { gte: manilaDayStart() },
            },
            _sum: { amount: true },
        });
        if (Number(redeemed._sum.amount || 0) + amount > 5)
            return NextResponse.json(
                { error: "Daily redeem limit exceeded" },
                { status: 403 },
            );
        const jti = randomUUID();
        const expiresAt = new Date(Date.now() + 600_000);
        const shortToken =
            "ECO-" + randomBytes(8).toString("hex").toUpperCase();
        await prisma.$transaction(async (tx) => {
            const session = await tx.machineSession.create({
                data: {
                    machineId: process.env.MACHINE_ID || "MACHINE_01",
                    userId: user.id,
                    pointsToDeduct: amount,
                    amountToDispense: amount * 100,
                    status: "INITIATED",
                    jti,
                    expiresAt,
                },
            });
            const token = jwt.sign(
                {
                    userId: user.id,
                    sessionId: session.id,
                    jti,
                    tokenVersion: user.tokenVersion,
                },
                getJwtSecret(),
                {
                    algorithm: "HS256",
                    expiresIn: "600s",
                    issuer: "ecodefill",
                    audience: "ecodefill-redeem",
                },
            );
            await tx.qrToken.create({
                data: {
                    userId: user.id,
                    token,
                    shortToken,
                    type: "REDEEM",
                    amount,
                    expiresAt,
                },
            });
        });
        return NextResponse.json({
            success: true,
            token: shortToken,
            expiresAt,
        });
    } catch (error) {
        return handleApiError(error);
    }
}
