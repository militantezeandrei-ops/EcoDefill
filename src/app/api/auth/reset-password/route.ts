import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { verifyAndConsumeCode, VerificationPurpose } from "@/lib/verification";
import { checkRateLimit, getClientIp } from "@/lib/ratelimit";

const resetPasswordSchema = z.object({
    email: z.string().email(),
    code: z.string().regex(/^\d{6}$/),
    newPassword: z
        .string()
        .min(8)
        .refine(
            (p) => Buffer.byteLength(p, "utf8") <= 72,
            "Password must be at most 72 bytes.",
        ),
});

export async function POST(req: NextRequest) {
    try {
        const ip = getClientIp(req);
        if (!(await checkRateLimit(`${ip}:reset-password`, 10, 60_000))) {
            return NextResponse.json(
                { message: "Too many reset attempts. Please try again later." },
                { status: 429 },
            );
        }

        const body = await req.json();
        const parsed = resetPasswordSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { message: "Invalid request data." },
                { status: 400 },
            );
        }

        const email = parsed.data.email.trim().toLowerCase();
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return NextResponse.json(
                { message: "Invalid email or code." },
                { status: 400 },
            );
        }

        const newPasswordHash = await bcrypt.hash(parsed.data.newPassword, 10);
        const isCodeValid = await verifyAndConsumeCode(
            email,
            VerificationPurpose.ResetPassword,
            parsed.data.code,
            async (tx) => {
                await tx.user.update({
                    where: { email },
                    data: {
                        passwordHash: newPasswordHash,
                        tokenVersion: { increment: 1 },
                    },
                });

                await tx.qrToken.updateMany({
                    where: { userId: user.id, used: false },
                    data: { used: true },
                });
                await tx.machineSession.updateMany({
                    where: {
                        userId: user.id,
                        status: { in: ["INITIATED", "APPROVED"] },
                    },
                    data: { status: "CANCELLED" },
                });
            },
        );

        if (!isCodeValid) {
            return NextResponse.json(
                { message: "Invalid or expired verification code." },
                { status: 400 },
            );
        }

        return NextResponse.json({
            message: "Password updated successfully. You can now log in.",
        });
    } catch (error) {
        console.error("Reset password error:", error);
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 },
        );
    }
}
