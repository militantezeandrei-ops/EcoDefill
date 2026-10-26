import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateMachine } from "@/lib/machine-auth";
import { z } from "zod";
const schema = z.object({
    machineId: z.string(),
    itemType: z.enum(["BOTTLE", "CUP", "PAPER"]),
    amount: z.number().int().min(1).max(30),
    userId: z.never().optional(),
});
export async function POST(req: Request) {
    try {
        const body = await req.json();
        if (!authenticateMachine(req, body.machineId))
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        const parsed = schema.safeParse(body);
        if (!parsed.success)
            return NextResponse.json(
                { error: "Invalid input. Student credits require a QR scan." },
                { status: 400 },
            );
        const {
            machineId,
            itemType: materialType,
            amount: count,
        } = parsed.data;
        const pointsEarned =
            materialType === "PAPER" ? Math.floor(count / 3) : count;
        const log = await prisma.$transaction(async (tx) => {
            const log = await tx.recyclingLog.create({
                data: {
                    machineId,
                    materialType,
                    count,
                    pointsEarned,
                    waterDispensed: 0,
                    isWalkIn: true,
                },
            });
            await tx.transaction.create({
                data: {
                    userId: null,
                    amount: pointsEarned,
                    type: "EARN",
                    materialType,
                    count,
                },
            });
            return log;
        });
        return NextResponse.json({ success: true, logId: log.id });
    } catch {
        return NextResponse.json(
            { error: "Failed to add point" },
            { status: 500 },
        );
    }
}
