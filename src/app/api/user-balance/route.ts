import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateRequest, handleApiError } from "@/lib/api-middleware";

export async function GET(req: NextRequest) {
    try {
        const auth = await authenticateRequest(req);
        if (auth.error) {
            return NextResponse.json({ message: auth.error }, { status: auth.status });
        }

        const user = await prisma.user.findUnique({
            where: { id: auth.user!.userId },
            select: { balance: true }
        });

        if (!user) {
            return NextResponse.json({ message: "User not found" }, { status: 404 });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todaysRedemptions = await prisma.transaction.aggregate({
            where: {
                userId: auth.user!.userId,
                type: "REDEEM",
                createdAt: { gte: today }
            },
            _sum: { amount: true }
        });

        const dailyRedeemed = todaysRedemptions._sum.amount || 0;

        return NextResponse.json({
            balance: user.balance,
            dailyRedeemed
        });

    } catch (error) {
        return handleApiError(error);
    }
}
