import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const token = req.cookies.get("adminAuthToken")?.value;
    const auth = token ? verifyToken(token) : null;

    if (!auth || auth.role !== "ADMIN") {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
        const recentStudents = await prisma.user.findMany({
            where: { role: "STUDENT" },
            orderBy: { createdAt: "desc" },
            take: 15,
            select: {
                id: true,
                email: true,
                fullName: true,
                course: true,
                yearLevel: true,
                section: true,
                createdAt: true,
            },
        });

        return NextResponse.json({ students: recentStudents });
    } catch (error) {
        console.error("Error fetching recent registrations:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}
