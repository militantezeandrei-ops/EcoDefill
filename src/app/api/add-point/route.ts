import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const { machineId, secretKey, userId } = await req.json();

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

        const pointsEarned = todayEarned._sum.amount || 0;
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
