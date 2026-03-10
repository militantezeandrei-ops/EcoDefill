import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const { machineId, secretKey, userId } = await req.json();

        // 1. Basic Machine Authentication
        if (secretKey !== process.env.MACHINE_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Perform Atomic Transaction
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
