import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

// In MVP auth is just by checking a mocked Authorization header or passing userId from frontend for testing
export async function POST(req: NextRequest) {
    try {
        const { amount, userId } = await req.json();

        // Very basic validation (In real apps, get userId from session/cookie)
        if (!amount || amount <= 0) {
            return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
        }

        // IMPORTANT: In a real app, `userId` must come from the auth token (e.g. NextAuth session). 
        // We are trusting the client request here for IoT testing purposes if no session is set up.
        // Assuming your apiClient adds a token or we just pass it in. If your `login` system is working, 
        // you should extract the token from headers here.

        const authHeader = req.headers.get('authorization');
        let finalUserId = userId; // fallback to body provided userId

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const tokenStr = authHeader.split(' ')[1];
            try {
                const decoded = jwt.verify(tokenStr, process.env.JWT_SECRET || 'fallback-secret-key-123') as any;
                finalUserId = decoded.userId;
            } catch (e) {
                // Ignore token error for now, use the body one if provided
            }
        }

        if (!finalUserId) {
            return NextResponse.json({ error: "Unauthorized. Missing user ID." }, { status: 401 });
        }

        const user = await prisma.user.findUnique({ where: { id: finalUserId } });
        if (!user || user.balance < amount) {
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

        const qrToken = jwt.sign(qrPayload, process.env.JWT_SECRET || 'fallback-secret-key-123', { expiresIn: `${expiresInSeconds}s` });

        return NextResponse.json({
            token: qrToken,
            expiresAt: expiresAtDate
        });

    } catch (error) {
        console.error("Redeem Initiate Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
