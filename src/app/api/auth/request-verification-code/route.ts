import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/ratelimit";
import prisma from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";
import {
    generateNumericCode,
    storeVerificationCode,
    VerificationPurpose,
} from "@/lib/verification";

const requestCodeSchema = z.object({
    email: z.string().email(),
    purpose: z.enum(["register", "reset_password"]),
});

export async function POST(req: NextRequest) {
    try {
        const ip = req.headers.get("x-forwarded-for") || "unknown";
        if (!checkRateLimit(`${ip}:request-code`, 8, 60_000)) {
            return NextResponse.json({ message: "Too many requests. Please try again later." }, { status: 429 });
        }

        const body = await req.json();
        const parsed = requestCodeSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ message: "Invalid request data." }, { status: 400 });
        }

        const email = parsed.data.email.trim().toLowerCase();
        const purpose = parsed.data.purpose;

        if (purpose === "register") {
            const existingUser = await prisma.user.findUnique({ where: { email } });
            if (existingUser) {
                return NextResponse.json({ message: "An account with this email already exists." }, { status: 409 });
            }
        }

        const code = generateNumericCode(6);
        await storeVerificationCode(
            email,
            purpose === "register" ? VerificationPurpose.Register : VerificationPurpose.ResetPassword,
            code
        );

        const emailResult = await sendVerificationEmail({
            to: email,
            code,
            purpose,
        });

        if (!emailResult.delivered) {
            return NextResponse.json(
                { message: emailResult.error || "Unable to send verification email right now." },
                { status: 502 }
            );
        }

        return NextResponse.json({
            message: "Verification code sent. Check your email.",
        });
    } catch (error) {
        console.error("Request verification code error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
