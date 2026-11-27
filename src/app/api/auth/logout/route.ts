import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
    const header = req.headers.get('authorization');
    const token =
        req.cookies.get('adminAuthToken')?.value ||
        (header?.startsWith('Bearer ') ? header.slice(7) : undefined);

    if (token) {
        const payload = verifyToken(token);
        if (payload) {
            try {
                await prisma.user.updateMany({
                    where: {
                        id: payload.userId,
                        tokenVersion: payload.tokenVersion,
                    },
                    data: { tokenVersion: { increment: 1 } },
                });
            } catch (error) {
                console.error('Logout token revocation failed:', error);
            }
        }
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set('adminAuthToken', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 0,
    });
    return response;
}
