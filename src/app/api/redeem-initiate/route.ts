import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import { authenticateRequest } from "@/lib/api-middleware";

export async function POST(req: NextRequest) {
    try {
        // Use standard auth middleware — no insecure body fallback
        const auth = await authenticateRequest(req);
        if (auth.error) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const finalUserId = auth.user!.userId;

        const { amount } = await req.json();

        if (!amount || amount <= 0) {
            return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { id: finalUserId } });
        if (!user) {
            return NextResponse.json({ error: "User session expired. Please log in again." }, { status: 401 });
        }

        if (user.balance < amount) {
            return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
        }

        // Generate JTI and set Expiry
        const jti = uuidv4();
        const expiresInSeconds = 30;
        const expiresAtDate = new Date(Date.now() + expiresInSeconds * 1000);

        // Create MachineSession in DB
        const session = await prisma.machineSession.create({
            data: {
                machineId: "MACHINE_001", // Hardcoded for MVP 
                userId: user.id,
                pointsToDeduct: amount,
                amountToDispense: amount * 100, // 1 point = 100ml
                status: "INITIATED",
                jti: jti,
                expiresAt: expiresAtDate
            }
        });

        // Sign Short-Lived JWT
        const qrPayload = {
            userId: user.id,
            sessionId: session.id,
            jti: jti
        };

        // Generate a long legacy token for DB record (backward compatibility)
        const token = jwt.sign(qrPayload, process.env.JWT_SECRET || 'fallback-secret-key-123', { expiresIn: `${expiresInSeconds}s` });

        // Generate a short unique token for high-density QR scanning
        // E.g. "ECO-A3F9B2C1"
        const shortToken = `ECO-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

        // Create QrToken in DB linked to this request
        await prisma.qrToken.create({
            data: {
                userId: user.id,
                token: token,
                shortToken: shortToken,
                type: "REDEEM",
                amount: amount,
                expiresAt: expiresAtDate
            }
        });

        return NextResponse.json({
            success: true,
            token: shortToken, // Return the short token for QR encoding
            expiresAt: expiresAtDate
        });

    } catch (error) {
        console.error("Redeem Initiate Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
