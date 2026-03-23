import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

const CODE_EXPIRY_MINUTES = 10;

export const VerificationPurpose = {
    Register: "REGISTER",
    ResetPassword: "RESET_PASSWORD",
} as const;

export type VerificationPurposeValue =
    (typeof VerificationPurpose)[keyof typeof VerificationPurpose];

export function generateNumericCode(length = 6): string {
    const max = 10 ** length;
    const value = Math.floor(Math.random() * max);
    return value.toString().padStart(length, "0");
}

export async function storeVerificationCode(
    email: string,
    purpose: VerificationPurposeValue,
    plainCode: string
) {
    const normalizedEmail = email.trim().toLowerCase();
    const codeHash = await bcrypt.hash(plainCode, 10);
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);

    await prisma.verificationCode.create({
        data: {
            email: normalizedEmail,
            codeHash,
            purpose,
            expiresAt,
            used: false,
        },
    });
}

export async function verifyAndConsumeCode(
    email: string,
    purpose: VerificationPurposeValue,
    plainCode: string
): Promise<boolean> {
    const normalizedEmail = email.trim().toLowerCase();
    const latestCode = await prisma.verificationCode.findFirst({
        where: {
            email: normalizedEmail,
            purpose,
            used: false,
            expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
    });

    if (!latestCode) return false;

    const isMatch = await bcrypt.compare(plainCode, latestCode.codeHash);
    if (!isMatch) return false;

    await prisma.verificationCode.update({
        where: { id: latestCode.id },
        data: { used: true, usedAt: new Date() },
    });

    return true;
}
