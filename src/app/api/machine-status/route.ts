import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const machineId = searchParams.get('machineId');

        if (!machineId) {
            return NextResponse.json({ error: 'Missing machineId' }, { status: 400 });
        }

        // Find any approved session for this machine
        const session = await prisma.machineSession.findFirst({
            where: {
                machineId: machineId,
                status: 'APPROVED'
            },
            orderBy: {
                createdAt: 'asc' // Process oldest approved first
            }
        });

        if (session) {
            // We found an approved session! Tell the ESP32 to dispense water.

            // Calculate dispense time based on amount (e.g., 100ml = 1000ms / 1 second for a 100ml/s pump)
            const PUMP_RATE_ML_PER_MS = 0.1; // Example: pump dispenses 0.1 ml per millisecond (100ml / sec)
            const dispenseTimeMs = Math.floor(session.amountToDispense / PUMP_RATE_ML_PER_MS);

            // Ideally, the ESP32 hits another `/api/machine-complete` endpoint to mark as DISPENSED.
            // For simplicity in testing/MVP, we can just mark it DISPENSED immediately upon polling if the ESP32 is assumed reliable.
            await prisma.machineSession.update({
                where: { id: session.id },
                data: { status: 'DISPENSED' }
            });

            return NextResponse.json({
                approved: true,
                sessionId: session.id,
                dispenseTimeMs: dispenseTimeMs
            });
        }

        // No approved sessions found
        return NextResponse.json({
            approved: false,
            dispenseTimeMs: 0
        });

    } catch (error) {
        console.error("Machine Status Error:", error);
        return NextResponse.json({ error: 'Failed to retrieve machine status' }, { status: 500 });
    }
}
