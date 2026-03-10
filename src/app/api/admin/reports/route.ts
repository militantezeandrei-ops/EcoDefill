import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
    try {
        const token = req.cookies.get("adminAuthToken")?.value;
        if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

        const decoded = verifyToken(token);
        if (!decoded || decoded.role !== "ADMIN") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

        // Most Active Users (by amount of points generated from EARN)
        const topUsers = await prisma.user.findMany({
            where: { role: "STUDENT" },
            include: {
                transactions: {
                    where: { type: "EARN" },
                    select: { amount: true, count: true }
                }
            }
        });

        const activeUsers = topUsers.map(u => {
            const totalPoints = u.transactions.reduce((sum, t) => sum + t.amount, 0);
            const totalItems = u.transactions.reduce((sum, t) => sum + (t.count || 0), 0);
            return {
                email: u.email,
                course: u.course,
                section: u.section,
                totalPoints,
                totalItems
            };
        }).sort((a, b) => b.totalPoints - a.totalPoints).slice(0, 10);

        return NextResponse.json({ activeUsers });
    } catch (error) {
        return NextResponse.json({ message: "Error fetching reports" }, { status: 500 });
    }
}
