import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyPassword, signToken } from "@/lib/auth";
import { z } from "zod";
import { checkRateLimit, getClientIp } from "@/lib/ratelimit";

// Precomputed dummy bcrypt hash to equalize response time on unknown emails
const DUMMY_PASSWORD_HASH =
    "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

const loginSchema = z.object({
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(6).max(72),
});

export async function POST(req: NextRequest) {
    try {
        const ip = getClientIp(req);
        if (!await checkRateLimit(`${ip}:login`, 10, 60000)) { // 10 requests per minute
            return NextResponse.json({ message: "Too many login attempts" }, { status: 429 });
        }

        const body = await req.json();
        const result = loginSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json({ message: "Invalid input" }, { status: 400 });
        }

        const { email, password } = result.data;
        if (!await checkRateLimit(`login-email:${email}`, 10, 15 * 60_000)) {
            return NextResponse.json({ message: "Too many login attempts" }, { status: 429 });
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            await verifyPassword(password, DUMMY_PASSWORD_HASH);
            return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
        }

        const validPassword = await verifyPassword(password, user.passwordHash);
        if (!validPassword) {
            return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
        }

        const token = signToken({ userId: user.id, role: user.role, tokenVersion: user.tokenVersion });

        return NextResponse.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                balance: Number(user.balance),
                hasSeenGuide: user.hasSeenGuide
            }
        });

    } catch (error) {
        console.error("Login Error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
