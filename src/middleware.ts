import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
// No imports needed for JWT verification in Edge middleware

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Only protect /admin routes
    if (pathname.startsWith('/admin')) {
        // Allow access to the login page
        if (pathname === '/admin/login') {
            return NextResponse.next();
        }

        const token = request.cookies.get('adminAuthToken')?.value;

        if (!token) {
            return NextResponse.redirect(new URL('/admin/login', request.url));
        }

        try {
            // Decode the JWT payload safely in the Edge Runtime
            const payload = token.split('.')[1];
            if (!payload) throw new Error("Invalid token format");
            
            const decoded = JSON.parse(atob(payload));
            if (!decoded || decoded.role !== 'ADMIN') {
                return NextResponse.redirect(new URL('/admin/login', request.url));
            }
        } catch (e) {
            return NextResponse.redirect(new URL('/admin/login', request.url));
        }

        return NextResponse.next();
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*'],
};
