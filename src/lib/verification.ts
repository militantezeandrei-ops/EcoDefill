import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { randomInt } from "node:crypto";
import type { Prisma } from "@prisma/client";

const CODE_EXPIRY_MINUTES = 10;
const MAX_VERIFICATION_ATTEMPTS = 5;

export const VerificationPurpose = {
    Register: "REGISTER",
    ResetPassword: "RESET_PASSWORD",
} as const;

export type VerificationPurposeValue =
    (typeof VerificationPurpose)[keyof typeof VerificationPurpose];

export function generateNumericCode(length = 6): string {
    const max = 10 ** length;
    const value = randomInt(max);
    return value.toString().padStart(length, "0");
}

export async function storeVerificationCode(
    email: string,
    purpose: VerificationPurposeValue,
    plainCode: string,
) {
    const normalizedEmail = email.trim().toLowerCase();
    const codeHash = await bcrypt.hash(plainCode, 10);
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);

    return prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${normalizedEmail + ":" + purpose}, 0))`;
        await tx.verificationCode.updateMany({
            where: { email: normalizedEmail, purpose, used: false },
            data: { used: true, usedAt: new Date() },
        });
        return tx.verificationCode.create({
            data: {
                email: normalizedEmail,
                codeHash,
                purpose,
                expiresAt,
                used: false,
            },
        });
    });
}

export async function verifyAndConsumeCode(
    email: string,
    purpose: VerificationPurposeValue,
    plainCode: string,
    onVerified?: (tx: Prisma.TransactionClient) => Promise<void>,
): Promise<boolean> {
    const normalizedEmail = email.trim().toLowerCase();
    return prisma.$transaction(
        async (tx) => {
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${normalizedEmail + ":" + purpose}, 0))`;
            const latestCode = await tx.verificationCode.findFirst({
                where: {
                    email: normalizedEmail,
                    purpose,
                    used: false,
                    expiresAt: { gt: new Date() },
                },
                orderBy: { createdAt: "desc" },
            });

            if (!latestCode) return false;
            if (latestCode.attempts >= MAX_VERIFICATION_ATTEMPTS) return false;

            const isMatch = await bcrypt.compare(
                plainCode,
                latestCode.codeHash,
            );
            if (!isMatch) {
                const attempts = latestCode.attempts + 1;
                await tx.verificationCode.update({
                    where: { id: latestCode.id },
                    data: {
                        attempts,
                        used: attempts >= MAX_VERIFICATION_ATTEMPTS,
                    },
                });
                return false;
            }

            await tx.verificationCode.update({
                where: { id: latestCode.id },
                data: { used: true, usedAt: new Date() },
            });
            if (onVerified) await onVerified(tx);
            return true;
        },
        { timeout: 10_000 },
    );
}
