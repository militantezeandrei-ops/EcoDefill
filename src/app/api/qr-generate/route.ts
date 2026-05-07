import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateRequest, handleApiError } from "@/lib/api-middleware";
import crypto from "crypto";
import { checkRateLimit } from "@/lib/ratelimit";

// Mobile App calls this to generate a QR code token to display on screen
export async function POST(req: NextRequest) {
    try {
        const ip = req.headers.get("x-forwarded-for") || "unknown";
        if (!checkRateLimit(`qr_gen_${ip}`, 20, 60000)) { // 20 QR gens per minute per IP
            return NextResponse.json({ message: "Rate limit exceeded for QR generation" }, { status: 429 });
        }

        const auth = await authenticateRequest(req);
        if (auth.error) {
            return NextResponse.json({ message: auth.error }, { status: auth.status });
        }

        const userId = auth.user!.userId;

        // Check Daily Earning Limit (Max 10 points per rolling 24 hours)
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const todayEarned = await prisma.transaction.aggregate({
            where: {
                userId,
                type: 'EARN',
                createdAt: {
                    gte: twentyFourHoursAgo
                }
            },
            _sum: {
                amount: true
            }
        });

        const pointsEarned = Number(todayEarned._sum.amount) || 0;
        if (pointsEarned >= 10) {
            return NextResponse.json({ message: "Daily earning limit of 10 points reached." }, { status: 403 });
        }

        // Check if there is an existing valid unused EARN token for this user
        const existingToken = await prisma.qrToken.findFirst({
            where: {
                userId,
                type: "EARN",
                used: false,
                expiresAt: { gt: new Date() }
            }
        });

        if (existingToken) {
            await prisma.qrToken.update({
                where: { id: existingToken.id },
                data: { usedAt: null }
            });

            return NextResponse.json({
                success: true,
                token: existingToken.shortToken,
                expiresAt: existingToken.expiresAt
            });
        }

        // Generate a long legacy token for DB record (backward compatibility)
        const token = crypto.randomBytes(32).toString('base64url');
        
        // Generate a short unique token for high-density QR scanning
        // E.g. "ECO-A3F9B2C1"
        const shortToken = `ECO-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

        // Set expiry to the end of the current day
        const expiresAt = new Date();
        expiresAt.setHours(23, 59, 59, 999);

        // Clean up old unused tokens for this user first
        await prisma.qrToken.deleteMany({
            where: { userId, used: false, expiresAt: { lt: new Date() } }
        });

        const qrToken = await prisma.qrToken.create({
            data: {
                userId,
                token,
                shortToken,
                type: "EARN", // Default for this endpoint
                expiresAt
            }
        });

        return NextResponse.json({
            success: true,
            token: qrToken.shortToken, // Return the short token for QR encoding
            expiresAt: qrToken.expiresAt
        });

    } catch (error) {
        return handleApiError(error);
    }
}
