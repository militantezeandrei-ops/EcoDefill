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

        // Aggregate stats
        const totalEarned = await prisma.transaction.aggregate({
            where: { userId: auth.user!.userId, type: "EARN" },
            _sum: { amount: true }
        });

        const totalRedeemed = await prisma.transaction.aggregate({
            where: { userId: auth.user!.userId, type: "REDEEM" },
            _sum: { amount: true }
        });

        const totalRecycledItems = await prisma.transaction.aggregate({
            where: { userId: auth.user!.userId, type: "EARN" },
            _sum: { count: true }
        });

        return NextResponse.json({
            transactions,
            stats: {
                totalEarned: totalEarned._sum.amount || 0,
                totalRedeemed: totalRedeemed._sum.amount || 0,
                totalRecycledItems: totalRecycledItems._sum.count || 0,
            }
        });

    } catch (error) {
        return handleApiError(error);
    }
}
