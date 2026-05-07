import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import prisma from "@/lib/prisma";
import { authenticateRequest, handleApiError } from "@/lib/api-middleware";
import { z } from "zod";

const redeemSchema = z.object({
    amount: z.number().positive().max(5), // 500ml
});

const MAX_DAILY_REDEEM = 5;

export async function POST(req: NextRequest) {
    try {
        const auth = await authenticateRequest(req);
        if (auth.error) {
            return NextResponse.json({ message: auth.error }, { status: auth.status });
        }

        const body = await req.json();
        const result = redeemSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json({ message: "Invalid input", errors: result.error.format() }, { status: 400 });
        }

        const { amount } = result.data;
        const userId = auth.user!.userId;

        // Fetch user and check balance
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

        if (user.balance < amount) {
            return NextResponse.json({ message: "Insufficient balance" }, { status: 403 });
        }

        // Check daily limit
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todaysRedemptions = await prisma.transaction.aggregate({
            where: {
                userId,
                type: "REDEEM",
                createdAt: { gte: today }
            },
            _sum: { amount: true }
        });

        const currentRedeemed = todaysRedemptions._sum.amount || 0;

        if (currentRedeemed + amount > MAX_DAILY_REDEEM) {
            return NextResponse.json({
                message: `Daily redeem limit exceeded. You can only redeem ${MAX_DAILY_REDEEM - currentRedeemed} more points today.`
            }, { status: 403 });
        }

        // Process transaction securely - wait! The user wants a QR code generated first. 
        // The actual deduction will happen at the water station using /api/verify-qr.

        const payload = {
            userId,
            points: amount,
            action: "redeem",
            issuedAt: Date.now(),
        };

        const JWT_SECRET = process.env.JWT_SECRET || "default_secret";
        const tokenstr = jwt.sign(payload, JWT_SECRET, { expiresIn: '60s' });

        const expiresAt = new Date(Date.now() + 60 * 1000); // strictly 60 seconds

        // Cleanup old unused redeem tokens to be safe
        await prisma.qrToken.deleteMany({
            where: { userId, used: false, expiresAt: { lt: new Date() } }
        });

        const qrToken = await prisma.qrToken.create({
            data: {
                userId,
                token: tokenstr,
                type: "REDEEM",
                amount,
                expiresAt
            }
        });

        return NextResponse.json({
            message: "QR Code generated for redemption",
            token: qrToken.token,
            expiresAt: qrToken.expiresAt
        });

    } catch (error) {
        return handleApiError(error);
    }
}
