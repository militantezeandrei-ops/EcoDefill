import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateRequest, handleApiError } from "@/lib/api-middleware";

export async function POST(req: NextRequest) {
    try {
        const auth = await authenticateRequest(req);
        if (auth.error) {
            return NextResponse.json({ message: auth.error }, { status: auth.status });
        }

        await prisma.user.update({
            where: { id: auth.user!.userId },
            data: { hasSeenGuide: true }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error);
    }
}
