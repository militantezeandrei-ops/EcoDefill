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

        const { searchParams } = new URL(req.url);
        const typeFilter = searchParams.get("type"); // "EARN", "REDEEM", or null for all

        const whereClause: Record<string, unknown> = {
            userId: auth.user!.userId,
        };

        if (typeFilter && ["EARN", "REDEEM"].includes(typeFilter)) {
            whereClause.type = typeFilter;
        }

        const transactions = await prisma.transaction.findMany({
            where: whereClause,
            orderBy: { createdAt: "desc" },
            take: 50,
            select: {
                id: true,
                type: true,
                amount: true,
                materialType: true,
                count: true,
                status: true,
                createdAt: true
            }
        });

        // Aggregate stats for the user
        const [earnedAgg, redeemedAgg, recyclingCount] = await Promise.all([
            prisma.transaction.aggregate({
                where: { userId: auth.user!.userId, type: "EARN" },
                _sum: { amount: true, count: true },
                _count: { id: true }
            }),
            prisma.transaction.aggregate({
                where: { userId: auth.user!.userId, type: "REDEEM" },
                _sum: { amount: true },
                _count: { id: true }
            }),
            // Count unique recycling sessions (EARN transactions) as fallback for items
            prisma.transaction.count({
                where: { userId: auth.user!.userId, type: "EARN" }
            })
        ]);

        return NextResponse.json({
            transactions: transactions.map(tx => ({
                ...tx,
                amount: Number(tx.amount)
            })),
            stats: {
                totalEarned: Number(earnedAgg._sum.amount || 0),
                totalRedeemed: Number(redeemedAgg._sum.amount || 0),
                totalRecycledItems: Number(earnedAgg._sum.count || recyclingCount || 0),
                earnedCount: earnedAgg._count.id,
                redeemedCount: redeemedAgg._count.id
            }
        });

    } catch (error) {
        return handleApiError(error);
    }
}
