import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, getClientIp } from "@/lib/ratelimit";
import prisma from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";
import {
    generateNumericCode,
    storeVerificationCode,
    VerificationPurpose,
} from "@/lib/verification";

const SCHOOL_EMAIL_DOMAIN = "@pdmeduph.onmicrosoft.com";
const MOBILE_CLIENT_HEADER = "ecodefill-mobile-v1";

const requestCodeSchema = z.object({
    email: z.string().email("Invalid email address."),
    purpose: z.enum(["register", "reset_password"]),
});

export async function POST(req: NextRequest) {
    try {
        const ip = getClientIp(req);
        if (!checkRateLimit(`${ip}:request-code`, 5, 60_000)) {
            return NextResponse.json(
                { message: "Too many requests. Please try again in a minute." },
                { status: 429 }
            );
        }

        const body = await req.json();
        const parsed = requestCodeSchema.safeParse(body);
        if (!parsed.success) {
            const firstError = parsed.error.issues[0]?.message || "Invalid request data.";
            return NextResponse.json({ message: firstError }, { status: 400 });
        }

        const email = parsed.data.email.trim().toLowerCase();
        const purpose = parsed.data.purpose;

        // Per-email rate limit: max 3 OTP requests per 10 minutes
        if (!checkRateLimit(`email:${email}:request-code`, 3, 10 * 60_000)) {
            return NextResponse.json(
                { message: "Too many verification codes requested for this email. Please wait 10 minutes." },
                { status: 429 }
            );
        }

        if (purpose === "register") {
            // Require Mobile App client identifier for student registration
            const clientHeader = req.headers.get("x-ecodefill-client");
            if (clientHeader !== MOBILE_CLIENT_HEADER) {
                return NextResponse.json(
                    { message: "Registration is only permitted through the official EcoDefill Mobile App." },
                    { status: 403 }
                );
            }

            if (!email.endsWith(SCHOOL_EMAIL_DOMAIN)) {
                return NextResponse.json(
                    { message: `Only official PDM school emails (${SCHOOL_EMAIL_DOMAIN}) are allowed.` },
                    { status: 400 }
                );
            }

            const localPart = email.split("@")[0] || "";
            if (localPart.includes("+")) {
                return NextResponse.json(
                    { message: "Email aliases (+ tags) are not permitted. Please use your primary school email." },
                    { status: 400 }
                );
            }

            const existingUser = await prisma.user.findUnique({ where: { email } });
            if (existingUser) {
                return NextResponse.json(
                    { message: "An account with this email already exists." },
                    { status: 409 }
                );
            }
        } else if (purpose === "reset_password") {
            const existingUser = await prisma.user.findUnique({ where: { email } });
            if (!existingUser) {
                return NextResponse.json(
                    { message: "No account found with this email address." },
                    { status: 404 }
                );
            }
        }

        // Invalidate any previous unused codes for the same email+purpose to prevent flooding
        await prisma.verificationCode.updateMany({
            where: {
                email,
                purpose: purpose === "register" ? VerificationPurpose.Register : VerificationPurpose.ResetPassword,
                used: false,
            },
            data: { used: true },
        });

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
