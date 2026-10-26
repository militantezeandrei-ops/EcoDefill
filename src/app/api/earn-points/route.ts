import { NextResponse } from 'next/server';
export async function POST() {
    return NextResponse.json({ message: 'Points must be confirmed by the recycling machine through /api/verify-qr.' }, { status: 403 });
}
