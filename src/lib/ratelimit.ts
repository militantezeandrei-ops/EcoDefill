import type { NextRequest } from "next/server";

// Simple in-memory rate limiter for serverless environments
// Note: In a multi-instance production (like Vercel functions), this will only limit per instance. 
// For a fully distributed rate limiter, Redis (e.g. Upstash) should be used.

const rateLimits = new Map<string, { count: number; windowStart: number }>();

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

export const checkRateLimit = (key: string, limit: number, windowMs: number): boolean => {
    const now = Date.now();
    const record = rateLimits.get(key);

    if (!record) {
        rateLimits.set(key, { count: 1, windowStart: now });
        return true;
    }

    if (now - record.windowStart > windowMs) {
        // Reset window
        rateLimits.set(key, { count: 1, windowStart: now });
        return true;
    }

    if (record.count >= limit) {
        return false;
    }

    record.count += 1;
    return true;
};
