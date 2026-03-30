export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateRequest, handleApiError } from "@/lib/api-middleware";

export async function GET(req: NextRequest) {
    try {
        const auth = await authenticateRequest(req);
        if (auth.error) {
            return NextResponse.json({ message: auth.error }, { status: auth.status });
        }

        const userId = auth.user!.userId;

        // Redeem limit resets at midnight (school hours only)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Earn limit uses a rolling 24-hour window
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        // Run ALL queries in parallel instead of sequentially
        const [user, todaysRedemptions, todaysEarnings, recentTransactions] = await Promise.all([
            prisma.user.findUnique({
                where: { id: userId },
                select: { balance: true, fullName: true, course: true, yearLevel: true, section: true, hasSeenGuide: true }
            }),
            prisma.transaction.aggregate({
                where: { userId, type: "REDEEM", createdAt: { gte: today } },
                _sum: { amount: true }
            }),
            prisma.transaction.aggregate({
                where: { userId, type: "EARN", createdAt: { gte: twentyFourHoursAgo } },
                _sum: { amount: true }
            }),
            prisma.transaction.findMany({
                where: { userId },
                orderBy: { createdAt: "desc" },
                take: 5,
                select: {
                    id: true,
                    type: true,
                    amount: true,
                    materialType: true,
                    count: true,
                    status: true,
                    createdAt: true
                }
            })
        ]);

        if (!user) {
            // Return 401 so the client clears the stale token and redirects to login
            return NextResponse.json({ message: "User session expired. Please log in again." }, { status: 401 });
        }

        return NextResponse.json({
            balance: Number(user.balance),
            fullName: user.fullName,
            course: user.course,
            yearLevel: user.yearLevel,
            section: user.section,
            dailyRedeemed: Number(todaysRedemptions._sum.amount || 0),
            dailyEarned: Number(todaysEarnings._sum.amount || 0),
            hasSeenGuide: !!user.hasSeenGuide,
            recentTransactions: recentTransactions.map(tx => ({
                ...tx,
                amount: Number(tx.amount)
            }))
        });

    } catch (error) {
        return handleApiError(error);
    }
}
