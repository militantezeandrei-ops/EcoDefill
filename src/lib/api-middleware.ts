import { NextRequest, NextResponse } from "next/server";
import { verifyToken, JwtPayload } from "./auth";

export async function authenticateRequest(req: NextRequest): Promise<{ user?: JwtPayload, error?: string, status?: number }> {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { error: 'Missing or invalid authorization header', status: 401 };
    }

    const token = authHeader.split(' ')[1];
    const user = verifyToken(token);

    if (!user) {
        return { error: 'Invalid or expired token', status: 401 };
    }

    return { user };
}

export function handleApiError(error: unknown) {
    console.error('API Error:', error);
    return NextResponse.json(
        { message: 'Internal Server Error' },
        { status: 500 }
    );
}
