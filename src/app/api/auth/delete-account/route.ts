import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import { authenticateRequest, handleApiError } from "@/lib/api-middleware";
import { checkRateLimit } from "@/lib/ratelimit";
import { z } from "zod";

const deleteAccountSchema = z.object({
    password: z
        .string()
        .min(1, "Password is required")
        .refine(
            (p) => Buffer.byteLength(p, "utf8") <= 72,
            "Invalid password.",
        ),
});

export async function POST(req: NextRequest) {
    try {
        const auth = await authenticateRequest(req);
        if (auth.error) {
            return NextResponse.json({ message: auth.error }, { status: auth.status });
        }

        const userId = auth.user!.userId;
        if (!(await checkRateLimit(`delete-account:${userId}`, 5, 15 * 60_000))) {
            return NextResponse.json(
                { message: "Too many attempts. Please try again later." },
                { status: 429 },
            );
        }

        const body = await req.json();
        const parsed = deleteAccountSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ message: "Password is required" }, { status: 400 });
        }

        const { password } = parsed.data;

        // Fetch user password hash and email
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, passwordHash: true },
        });

        if (!user) {
            return NextResponse.json({ message: "User not found" }, { status: 404 });
        }

        // Verify password
        const isPasswordValid = await verifyPassword(password, user.passwordHash);
        if (!isPasswordValid) {
            return NextResponse.json({ message: "Incorrect password. Please try again." }, { status: 401 });
        }

        // Delete all user related records in a transaction to satisfy foreign key constraints
        await prisma.$transaction([
            prisma.verificationCode.deleteMany({ where: { email: user.email } }),
            prisma.transaction.deleteMany({ where: { userId } }),
            prisma.qrToken.deleteMany({ where: { userId } }),
            prisma.machineSession.deleteMany({ where: { userId } }),
            prisma.recyclingLog.deleteMany({ where: { userId } }),
            prisma.user.delete({ where: { id: userId } }),
        ]);

        return NextResponse.json({ message: "Account deleted successfully." });
    } catch (error) {
        return handleApiError(error);
    }
}
