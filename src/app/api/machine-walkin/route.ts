export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Points per item (same as the normal earning logic)
const POINTS_PER_ITEM = 1;
const MAX_POINTS_PER_WALKIN = 5; // Max 5 pts = 500ml
const ML_PER_POINT = 100;

const walkInSchema = z.object({
    machineId: z.string().min(1).max(50),
    materialType: z.enum(["BOTTLE", "CUP", "PAPER"]),
    count: z.number().int().positive().max(5), // max 5 items = max 5 pts
});

/**
 * POST /api/machine-walkin
 *
 * Called directly by the ESP32 Dev Kit when a user recycles WITHOUT the mobile app.
 * No authentication required — machineId is used as the hardware identifier.
 *
 * Body: { machineId, materialType, count }
 * Response: { waterDispensed (ml), pointsEarned, logId }
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const result = walkInSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { message: "Invalid input", errors: result.error.format() },
                { status: 400 }
            );
        }

        const { machineId, materialType, count } = result.data;

        // Cap points at MAX_POINTS_PER_WALKIN (5)
        const rawPoints = count * POINTS_PER_ITEM;
        const pointsEarned = Math.min(rawPoints, MAX_POINTS_PER_WALKIN);
        const waterDispensed = pointsEarned * ML_PER_POINT; // e.g. 5 pts = 500ml

        const log = await prisma.recyclingLog.create({
            data: {
                machineId,
                // userId intentionally omitted — NULL in DB = walk-in / no account
                materialType,
                count,
                pointsEarned,
                waterDispensed,
                isWalkIn: true,
                status: "SUCCESS",
            },
        });

        return NextResponse.json({
            success: true,
            logId: log.id,
            pointsEarned,
            waterDispensed,
            message: `Dispense ${waterDispensed}ml for ${count} ${materialType}(s)`,
        });

    } catch (error) {
        console.error("[machine-walkin] Error:", error);
        return NextResponse.json(
            { message: "Failed to record walk-in transaction" },
            { status: 500 }
        );
    }
}
