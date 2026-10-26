import type { NextRequest } from "next/server";

import { createHash } from "node:crypto";
import prisma from "./prisma";

/**
 * Extract client IP reliably, preferring platform-verified headers over raw X-Forwarded-For
 * to mitigate trivial header spoofing.
 */
export const getClientIp = (req: NextRequest): string => {
    const vercelForwarded = req.headers.get("x-vercel-forwarded-for");
    if (vercelForwarded) {
        return vercelForwarded.split(",")[0].trim();
    }
    const realIp = req.headers.get("x-real-ip");
    if (realIp) {
        return realIp.trim();
    }
    const forwardedFor = req.headers.get("x-forwarded-for");
    if (forwardedFor) {
        return forwardedFor.split(",")[0].trim();
    }
    return "unknown";
};

export async function checkRateLimit(
    key: string,
    limit: number,
    windowMs: number,
): Promise<boolean> {
    const digest = createHash("sha256").update(key).digest("hex");
    const now = new Date();
    const cutoff = new Date(now.getTime() - windowMs);
    const result = await prisma.$queryRaw<{ count: number }[]>`
        INSERT INTO "AuthRateLimit" ("key", "count", "windowStart") VALUES (${digest}, 1, ${now})
        ON CONFLICT ("key") DO UPDATE SET
          "count" = CASE WHEN "AuthRateLimit"."windowStart" <= ${cutoff} THEN 1 ELSE LEAST("AuthRateLimit"."count" + 1, ${limit + 1}) END,
          "windowStart" = CASE WHEN "AuthRateLimit"."windowStart" <= ${cutoff} THEN ${now} ELSE "AuthRateLimit"."windowStart" END
        RETURNING "count"
    `;
    return result[0].count <= limit;
}
