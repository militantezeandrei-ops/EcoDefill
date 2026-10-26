import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { verifySession } from "./session";

export async function getAdminAuth(req: NextRequest) {
    const header = req.headers.get("authorization");
    const token =
        req.cookies.get("adminAuthToken")?.value ||
        (header?.startsWith("Bearer ") ? header.slice(7) : undefined);
    const user = token ? await verifySession(token) : null;
    return user?.role === "ADMIN" ? user : null;
}

export async function requireAdmin() {
    const token = (await cookies()).get("adminAuthToken")?.value;
    const user = token ? await verifySession(token) : null;
    if (user?.role !== "ADMIN") redirect("/admin/login");
    return user;
}
