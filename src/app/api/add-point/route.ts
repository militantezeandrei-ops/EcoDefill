import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { machineId, secretKey, userId, itemType, amount } = body;

        // If userId is missing, this is an anonymous item insertion from the hardware (from apiEarnAnon)
        if (!userId) {
            const count = Number(amount || 1);
            const materialType = (itemType || "BOTTLE").toUpperCase();
            
            // 3 papers = 1 point, other items = 1 point each
            const pointsEarned = materialType === "PAPER" ? Math.floor(count / 3) : count;

            // Create both RecyclingLog and Transaction atomically
            const result = await prisma.$transaction(async (tx) => {
                const log = await tx.recyclingLog.create({
                    data: {
                        machineId: machineId || "MACHINE_01",
                        materialType,
                        count,
                        pointsEarned,
                        waterDispensed: 0,
                        isWalkIn: true,
                        status: "SUCCESS",
                    },
                });

                const transaction = await tx.transaction.create({
                    data: {
                        userId: null,
                        amount: pointsEarned,
                        type: "EARN",
                        materialType,
                        count,
                        status: "SUCCESS",
                    }
                });

                return { log, transaction };
            });

            return NextResponse.json({ success: true, logId: result.log.id });
        }

        // 1. Basic Machine Authentication
        if (secretKey !== process.env.MACHINE_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Enforce Daily Limit (Max 10 points per rolling 24 hours)
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const todayEarned = await prisma.transaction.aggregate({
            where: {
                userId,
                type: 'EARN',
                createdAt: {
                    gte: twentyFourHoursAgo
                }
            },
            _sum: {
                amount: true
            }
        });

        const pointsEarned = Number(todayEarned._sum.amount) || 0;
        if (pointsEarned >= 10) {
            return NextResponse.json({ error: 'Daily point limit reached' }, { status: 403 });
        }

        // 3. Perform Atomic Transaction
        const result = await prisma.$transaction(async (tx) => {
            const user = await tx.user.update({
                where: { id: userId },
                data: { balance: { increment: 1 } },
            });

            await tx.transaction.create({
                data: {
                    userId: user.id,
                    amount: 1,
                    type: 'EARN',
                }
            });

            return user;
        });

        return NextResponse.json({ success: true, newBalance: result.balance });
    } catch (error) {
        console.error("Add Point Error:", error);
        return NextResponse.json({ error: 'Failed to add point' }, { status: 500 });
    }
}
