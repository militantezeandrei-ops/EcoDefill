import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';

export async function POST(req: Request) {
    try {
        const { token, machineId } = await req.json();

        if (!token || !machineId) {
            return NextResponse.json({ error: 'Missing token or machineId' }, { status: 400 });
        }

        // 1. Verify JWT signature & expiration
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key-123') as any;
        } catch {
            return NextResponse.json({ error: 'Invalid or expired QR code.' }, { status: 400 });
        }

        // 2. Prevent Replay and verify session state atomically
        const session = await prisma.machineSession.findUnique({
            where: { jti: decoded.jti }
        });

        if (!session || session.status !== 'INITIATED') {
            return NextResponse.json({ error: 'QR code has already been scanned or is invalid.' }, { status: 400 });
        }

        if (session.machineId !== machineId) {
            // In a real app we might care, but for testing we can just enforce it or let it slide. Let's enforce it.
            return NextResponse.json({ error: 'Invalid Machine ID.' }, { status: 400 });
        }

        // 3. Process Transaction Atomically
        let txResult: { userName: string; pointsDeducted: number; waterAmount: number } | null = null;

        await prisma.$transaction(async (tx) => {
            const user = await tx.user.findUnique({ where: { id: decoded.userId } });

            if (!user || user.balance < session.pointsToDeduct) {
                throw new Error('Insufficient balance');
            }

            // Deduct points
            await tx.user.update({
                where: { id: user.id },
                data: { balance: { decrement: session.pointsToDeduct } }
            });

            // Log transaction
            await tx.transaction.create({
                data: {
                    userId: user.id,
                    amount: session.pointsToDeduct,
                    type: 'REDEEM'
                }
            });

            // Mark machine session as APPROVED for the ESP32 to pick up
            await tx.machineSession.update({
                where: { id: session.id },
                data: { status: 'APPROVED' }
            });

            txResult = {
                userName: user.fullName || user.email?.split('@')[0] || 'Student',
                pointsDeducted: session.pointsToDeduct,
                waterAmount: session.amountToDispense,
            };
        });

        return NextResponse.json({
            success: true,
            message: 'QR Verified. Machine dispensing...',
            userName: txResult!.userName,
            pointsDeducted: txResult!.pointsDeducted,
            waterAmount: txResult!.waterAmount,
        });
    } catch (error: any) {
        if (error.message === 'Insufficient balance') {
            return NextResponse.json({ error: 'Insufficient balance.' }, { status: 400 });
        }
        console.error("Verify QR Error:", error);
        return NextResponse.json({ error: 'Verification failed.' }, { status: 500 });
    }
}
