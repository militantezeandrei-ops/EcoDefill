export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateRequest, handleApiError } from "@/lib/api-middleware";
import { z } from "zod";

const earnSchema = z.object({
    amount: z.number().positive().max(10), // User can theoretically only earn up to 10 at once anyway
    machineId: z.string().optional() // For future hardware integration tracking
});

const MAX_DAILY_EARN = 10;

export async function POST(req: NextRequest) {
    try {
        const auth = await authenticateRequest(req);
        if (auth.error) {
            return NextResponse.json({ message: auth.error }, { status: auth.status });
        }

        const body = await req.json();
        const result = earnSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json({ message: "Invalid input", errors: result.error.format() }, { status: 400 });
        }

        const { amount } = result.data;
        const userId = auth.user!.userId;

        // Check daily Earning limit
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const todaysEarnings = await prisma.transaction.aggregate({
            where: {
                userId,
                type: "EARN",
                createdAt: { gte: twentyFourHoursAgo }
            },
            _sum: { amount: true }
        });

        const currentEarned = todaysEarnings._sum.amount || 0;

        if (currentEarned + amount > MAX_DAILY_EARN) {
            return NextResponse.json({
                message: `Daily earn limit exceeded. You can only earn ${MAX_DAILY_EARN - currentEarned} more points today.`
            }, { status: 403 });
        }

        // Process transaction securely in a replica-safe sequence
        const transaction = await prisma.$transaction(async (tx) => {
            const newTx = await tx.transaction.create({
                data: {
                    userId,
                    type: "EARN",
                    amount,
                }
            });

            const updatedUser = await tx.user.update({
                where: { id: userId },
                data: { balance: { increment: amount } }
            });

            return { newTx, balance: updatedUser.balance };
        });

        return NextResponse.json({
            message: "Points earned successfully",
            balance: transaction.balance
        });

    } catch (error) {
        return handleApiError(error);
    }
}
