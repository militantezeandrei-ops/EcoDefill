import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';

export async function POST(req: Request) {
    try {
        const { token, machineId } = await req.json();

        if (!token || !machineId) {
            return NextResponse.json({ error: 'Missing token or machineId' }, { status: 400 });
        }

        // 1. Look up the QR Token in the database using the short token
        const qrToken = await prisma.qrToken.findUnique({
            where: { shortToken: token },
            include: { user: true }
        });

        // 2. Validation
        if (!qrToken) {
            return NextResponse.json({ error: 'Invalid or missing QR code.' }, { status: 404 });
        }

        if (qrToken.used || qrToken.usedAt) {
            return NextResponse.json({ error: 'QR code has already been used.' }, { status: 400 });
        }

        if (new Date() > qrToken.expiresAt) {
            return NextResponse.json({ error: 'QR code has expired.' }, { status: 400 });
        }

        // 3. For REDEEM types, we need to handle MachineSession logic
        let decoded: any;
        if (qrToken.type === "REDEEM") {
            try {
                // The original long token (JWT) is stored in the token field
                decoded = jwt.verify(qrToken.token, process.env.JWT_SECRET || 'fallback-secret-key-123') as any;
            } catch {
                return NextResponse.json({ error: 'Stored session data is invalid.' }, { status: 500 });
            }

            const session = await prisma.machineSession.findUnique({
                where: { jti: decoded.jti }
            });

            if (!session || session.status !== 'INITIATED') {
                return NextResponse.json({ error: 'Machine session is invalid or already processed.' }, { status: 400 });
            }

            if (session.machineId !== machineId) {
                return NextResponse.json({ error: 'Invalid Machine ID.' }, { status: 400 });
            }

            // Mark the QR token and session as used within the transaction later
        }

        // 3. Process Transaction Atomically
        let txResult: { userName: string; pointsDeducted: number; waterAmount: number } | null = null;

        await prisma.$transaction(async (tx) => {
            // Mark token as used
            await tx.qrToken.update({
                where: { id: qrToken.id },
                data: { used: true, usedAt: new Date() }
            });

            if (qrToken.type === "REDEEM") {
                const user = await tx.user.findUnique({ where: { id: qrToken.userId } });

                if (!user || user.balance < qrToken.amount) {
                    throw new Error('Insufficient balance');
                }

                // Deduct points
                await tx.user.update({
                    where: { id: user.id },
                    data: { balance: { decrement: qrToken.amount } }
                });

                // Log transaction
                await tx.transaction.create({
                    data: {
                        userId: user.id,
                        amount: qrToken.amount,
                        type: 'REDEEM'
                    }
                });

                // Mark machine session as APPROVED for the ESP32 to pick up
                const session = await tx.machineSession.findUnique({ where: { jti: decoded.jti } });
                if (session) {
                    await tx.machineSession.update({
                        where: { id: session.id },
                        data: { status: 'APPROVED' }
                    });

                    txResult = {
                        userName: user.fullName || user.email?.split('@')[0] || 'Student',
                        pointsDeducted: qrToken.amount,
                        waterAmount: session.amountToDispense,
                    };
                }
            } else if (qrToken.type === "EARN") {
                const user = await tx.user.findUnique({ where: { id: qrToken.userId } });

                if (!user) {
                    throw new Error('User not found');
                }

                // Add 1 point for scanning personal QR (check-in/earn)
                await tx.user.update({
                    where: { id: user.id },
                    data: { balance: { increment: 1 } }
                });

                // Log transaction
                await tx.transaction.create({
                    data: {
                        userId: user.id,
                        amount: 1,
                        type: 'EARN'
                    }
                });

                txResult = {
                    userName: user.fullName || user.email?.split('@')[0] || 'Student',
                    pointsDeducted: -1, // Negative indicates earning
                    waterAmount: 0,
                };
            }
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
