import * as React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { verifySession } from "./session";

type ReactWithCache = typeof React & {
    cache?: <T extends (...args: never[]) => unknown>(fn: T) => T;
};

const memoizePerRequest =
    typeof (React as ReactWithCache).cache === "function"
        ? (React as ReactWithCache).cache!
        : <T extends (...args: never[]) => unknown>(fn: T) => fn;

export async function getAdminAuth(req: NextRequest) {
    const header = req.headers.get("authorization");
    const token =
        req.cookies.get("adminAuthToken")?.value ||
        (header?.startsWith("Bearer ") ? header.slice(7) : undefined);
    const user = token ? await verifySession(token) : null;
    return user?.role === "ADMIN" ? user : null;
}

// Memoized per RSC render pass so layout + page don't duplicate the DB session lookup.
export const requireAdmin = memoizePerRequest(async () => {
    const token = (await cookies()).get("adminAuthToken")?.value;
    const user = token ? await verifySession(token) : null;
    if (user?.role !== "ADMIN") redirect("/admin/login");
    return user;
});
