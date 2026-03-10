import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateRequest, handleApiError } from "@/lib/api-middleware";
import crypto from "crypto";
import { checkRateLimit } from "@/lib/ratelimit";

// Mobile App calls this to generate a QR code token to display on screen
export async function POST(req: NextRequest) {
    try {
        const ip = req.headers.get("x-forwarded-for") || "unknown";
        if (!checkRateLimit(`qr_gen_${ip}`, 5, 60000)) { // 5 QR gens per minute per IP
            return NextResponse.json({ message: "Rate limit exceeded for QR generation" }, { status: 429 });
        }

        const auth = await authenticateRequest(req);
        if (auth.error) {
            return NextResponse.json({ message: auth.error }, { status: auth.status });
        }

        const userId = auth.user!.userId;

        // Generate a secure, URL-safe base64 token
        const token = crypto.randomBytes(32).toString('base64url');

        // Set expiry to strictly 60 seconds from now
        const expiresAt = new Date(Date.now() + 60 * 1000);

        // Clean up old unused tokens for this user first (optional, keeps DB clean)
        await prisma.qrToken.deleteMany({
            where: { userId, used: false, expiresAt: { lt: new Date() } }
        });

        const qrToken = await prisma.qrToken.create({
            data: {
                userId,
                token,
                expiresAt
            }
        });

        return NextResponse.json({
            token: qrToken.token,
            expiresAt: qrToken.expiresAt
        });

    } catch (error) {
        return handleApiError(error);
    }
}
