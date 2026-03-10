import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
    try {
        const token = req.cookies.get("adminAuthToken")?.value;
        if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

        const decoded = verifyToken(token);
        if (!decoded || decoded.role !== "ADMIN") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

        const logs = await prisma.recyclingLog.findMany({
            orderBy: { createdAt: "desc" },
            include: { user: { select: { email: true } } }
        });

        return NextResponse.json({ logs });
    } catch (error) {
        return NextResponse.json({ message: "Error fetching recycling logs" }, { status: 500 });
    }
}
