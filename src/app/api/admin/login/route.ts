import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyPassword, signToken } from "@/lib/auth";
import { z } from "zod";
import { checkRateLimit } from "@/lib/ratelimit";

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

export async function POST(req: NextRequest) {
    try {
        const ip = req.headers.get("x-forwarded-for") || "unknown";
        if (!checkRateLimit(ip, 10, 60000)) { 
            return NextResponse.json({ message: "Too many login attempts" }, { status: 429 });
        }

        const body = await req.json();
        const result = loginSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json({ message: "Invalid input", errors: result.error.format() }, { status: 400 });
        }

        const { email, password } = result.data;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || user.role !== "ADMIN") {
            return NextResponse.json({ message: "Invalid credentials or unauthorized" }, { status: 401 });
        }

        const validPassword = await verifyPassword(password, user.passwordHash);
        if (!validPassword) {
            return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
        }

        const token = signToken({ userId: user.id, role: user.role });

        const response = NextResponse.json({
            message: "Success",
            token,
            user: { 
                id: user.id, 
                email: user.email, 
                role: user.role,
                balance: Number(user.balance)
            }
        });

        // Set HttpOnly cookie for admin session
        response.cookies.set("adminAuthToken", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 60 * 60 * 24 * 7, // 1 week
            path: "/"
        });

        return response;

    } catch (error) {
        console.error("Admin Login Error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
