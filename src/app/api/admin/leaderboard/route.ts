import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
    try {
        const token = req.cookies.get("adminAuthToken")?.value;
        if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

        // Aggregate EARN transactions joining with Users to group by course
        const users = await prisma.user.findMany({
            where: { role: "STUDENT", course: { not: null } },
            include: {
                transactions: {
                    where: { type: "EARN" },
                    select: { amount: true, count: true }
                }
            }
        });

        const courseStats: Record<string, { points: number, items: number }> = {};

        users.forEach(u => {
            const course = u.course!;
            if (!courseStats[course]) courseStats[course] = { points: 0, items: 0 };
            
            u.transactions.forEach(t => {
                courseStats[course].points += t.amount;
                courseStats[course].items += t.count || 0;
            });
        });

        const leaderboard = Object.entries(courseStats)
            .map(([course, stats]) => ({
                course,
                points: stats.points,
                items: stats.items,
            }))
            .sort((a, b) => b.points - a.points); // Sort by highest points

        return NextResponse.json({ leaderboard });

    } catch (error) {
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
