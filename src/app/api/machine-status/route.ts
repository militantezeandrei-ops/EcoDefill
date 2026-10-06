export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const HEARTBEAT_TIMEOUT_SECONDS = 30;

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const machineId = searchParams.get('machineId') || "MACHINE_01";
        const isStatusCheck = searchParams.get('check') === 'true' || !searchParams.has('machineId');

        // 1. If this is a status/liveness check from frontend (Mobile or Admin)
        if (isStatusCheck) {
            const latestLog = await prisma.machineLog.findFirst({
                where: {
                    OR: [
                        { machineId: machineId },
                        { machineId: "MACHINE_01" },
                        { machineId: "ESP32-CAM-01" }
                    ]
                },
                orderBy: { createdAt: 'desc' }
            });

            const now = Date.now();
            let isOnline = false;
            let secondsSinceLastPing = 999999;
            let lastPingAt: string | null = null;
            let waterLevelRaw = "20.0L";
            let pingMs = 0;

            if (latestLog) {
                const logTime = new Date(latestLog.createdAt).getTime();
                secondsSinceLastPing = Math.max(0, Math.floor((now - logTime) / 1000));
                isOnline = secondsSinceLastPing <= HEARTBEAT_TIMEOUT_SECONDS;
                lastPingAt = latestLog.createdAt.toISOString();
                waterLevelRaw = latestLog.message || "20.0L";
                pingMs = latestLog.pingMs || 0;
            }

            // Parse numeric liters out of 20L container (e.g. "19.5L (Sufficient)", "4.5L (Low Water)", "0.0L (Empty Tank)")
            let remainingLiters = 20.0;
            const litersMatch = waterLevelRaw.match(/([\d.]+)\s*L/i);
            if (litersMatch) {
                remainingLiters = Math.max(0, Math.min(20, parseFloat(litersMatch[1])));
            } else if (waterLevelRaw.includes("Empty")) {
                remainingLiters = 0.0;
            } else if (waterLevelRaw.includes("Low")) {
                remainingLiters = 4.5;
            } else if (waterLevelRaw.includes("Sufficient") || waterLevelRaw.includes("Full")) {
                remainingLiters = 20.0;
            }

            const waterPercentage = Math.round((remainingLiters / 20.0) * 100);
            const isEmptyWater = remainingLiters <= 0.2;
            const isLowWater = !isEmptyWater && remainingLiters <= 5.0;

            let status = "ONLINE";
            if (!isOnline) {
                status = "OFFLINE";
            } else if (isEmptyWater) {
                status = "EMPTY_TANK";
            } else if (isLowWater) {
                status = "LOW_WATER";
            }

            return NextResponse.json({
                machineId,
                isOnline,
                status,
                waterLevel: `${remainingLiters.toFixed(1)} L / 20L`,
                remainingLiters,
                waterPercentage,
                isLowWater,
                isEmptyWater,
                lastPingAt,
                secondsSinceLastPing,
                rssi: pingMs < 0 ? pingMs : null,
                heartbeatThresholdSec: HEARTBEAT_TIMEOUT_SECONDS
            });
        }

        // 2. Otherwise, check for approved dispense sessions for ESP32
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
            const PUMP_RATE_ML_PER_MS = 0.1;
            const dispenseTimeMs = Math.floor(Number(session.amountToDispense) / PUMP_RATE_ML_PER_MS);

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

        return NextResponse.json({
            approved: false,
            dispenseTimeMs: 0
        });

    } catch (error) {
        console.error("Machine Status Error:", error);
        return NextResponse.json({ error: 'Failed to retrieve machine status' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { machineId, status, waterLevel, rssi, pingMs } = await req.json();

        if (!machineId) {
            return NextResponse.json({ error: 'Missing machineId' }, { status: 400 });
        }

        const currentStatus = status || 'ONLINE';
        const currentMessage = waterLevel || '20.0L';
        const signalRssi = typeof rssi === 'number' ? rssi : (typeof pingMs === 'number' ? pingMs : 0);

        // Find the latest log for this machine
        const latestLog = await prisma.machineLog.findFirst({
            where: { machineId },
            orderBy: { createdAt: 'desc' }
        });

        if (latestLog && latestLog.status === currentStatus && latestLog.message === currentMessage) {
            // Heartbeat: update the timestamp and signal quality of the existing record
            await prisma.machineLog.update({
                where: { id: latestLog.id },
                data: { 
                    createdAt: new Date(),
                    pingMs: signalRssi
                }
            });
        } else {
            // State change or first status: create a new log entry
            await prisma.machineLog.create({
                data: {
                    machineId,
                    status: currentStatus,
                    message: currentMessage,
                    pingMs: signalRssi
                }
            });
        }

        return NextResponse.json({ success: true, timestamp: new Date().toISOString() });
    } catch (error) {
        console.error("Machine Status POST Error:", error);
        return NextResponse.json({ error: 'Failed to update machine status' }, { status: 500 });
    }
}


