export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateRequest } from "@/lib/api-middleware";

export async function GET(req: NextRequest) {
    try {
        const auth = await authenticateRequest(req);
        if (auth.error) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const { searchParams } = new URL(req.url);
        const token = searchParams.get("token");

        if (!token) {
            return NextResponse.json({ error: "Missing token" }, { status: 400 });
        }

        const qrToken = await prisma.qrToken.findUnique({
            where: { shortToken: token },
            select: {
                used: true,
                usedAt: true,
                userId: true
            }
        });

        if (!qrToken) {
            return NextResponse.json({ error: "Token not found" }, { status: 404 });
        }

        // Verify that the token belongs to the authenticated user
        if (qrToken.userId !== auth.user!.userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        return NextResponse.json({
            used: qrToken.used || Boolean(qrToken.usedAt),
            usedAt: qrToken.usedAt
        });

    } catch (error) {
        console.error("QR Status Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
