import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
    try {
        const token = req.cookies.get("adminAuthToken")?.value;
        if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

        const decoded = verifyToken(token);
        if (!decoded || decoded.role !== "ADMIN") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

        const users = await prisma.user.findMany({
            where: { role: "STUDENT" },
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                email: true,
                balance: true,
                course: true,
                section: true,
                createdAt: true,
            }
        });

        return NextResponse.json({ users });
    } catch (error) {
        return NextResponse.json({ message: "Error fetching users" }, { status: 500 });
    }
}
