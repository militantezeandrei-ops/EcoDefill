import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose/jwt/verify";
import { getJwtSecret, JWT_AUDIENCE, JWT_ISSUER } from "./lib/jwt-config";

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    if (pathname === "/admin/login" || pathname === "/admin/forgot-password")
        return NextResponse.next();
    try {
        const token = request.cookies.get("adminAuthToken")?.value;
        if (!token) throw new Error("Missing token");
        const { payload } = await jwtVerify(
            token,
            new TextEncoder().encode(getJwtSecret()),
            {
                algorithms: ["HS256"],
                issuer: JWT_ISSUER,
                audience: JWT_AUDIENCE,
                requiredClaims: ["exp", "userId", "tokenVersion"],
            },
        );
        if (payload.role !== "ADMIN") throw new Error("Not an admin");
        return NextResponse.next();
    } catch {
        return NextResponse.redirect(new URL("/admin/login", request.url));
    }
}
export const config = { matcher: ["/admin", "/admin/:path*"] };
