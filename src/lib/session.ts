import { verifyToken } from "./auth";
import prisma from "./prisma";

export async function verifySession(token: string) {
    const payload = verifyToken(token);
    if (!payload) return null;
    const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { role: true, tokenVersion: true },
    });
    if (
        !user ||
        user.role !== payload.role ||
        user.tokenVersion !== payload.tokenVersion
    )
        return null;
    return payload;
}
