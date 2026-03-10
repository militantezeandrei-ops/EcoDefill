// Simple in-memory rate limiter for serverless environments
// Note: In a multi-instance production (like Vercel functions), this will only limit per instance. 
// For a fully distributed rate limiter, Redis (e.g. Upstash) should be used.

const rateLimits = new Map<string, { count: number; windowStart: number }>();

export const checkRateLimit = (ip: string, limit: number, windowMs: number): boolean => {
    const now = Date.now();
    const record = rateLimits.get(ip);

    if (!record) {
        rateLimits.set(ip, { count: 1, windowStart: now });
        return true;
    }

    if (now - record.windowStart > windowMs) {
        // Reset window
        rateLimits.set(ip, { count: 1, windowStart: now });
        return true;
    }

    if (record.count >= limit) {
        return false;
    }

    record.count += 1;
    return true;
};
