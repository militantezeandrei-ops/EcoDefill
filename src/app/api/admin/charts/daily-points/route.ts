import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
    try {
        const token = req.cookies.get("adminAuthToken")?.value;
        if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

        // Get points generation grouped by day for the last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const transactions = await prisma.transaction.findMany({
            where: {
                type: "EARN",
                createdAt: { gte: sevenDaysAgo }
            },
            select: { amount: true, createdAt: true }
        });

        // Aggregate by day of week
        const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
        const dailyPoints: Record<string, number> = {};
        
        days.forEach(day => dailyPoints[day] = 0);

        transactions.forEach(t => {
            // Get day index (0 = Sunday, 1 = Monday). Convert to 0 = Monday.
            let dayIndex = t.createdAt.getDay() - 1;
            if (dayIndex === -1) dayIndex = 6; // Sunday
            const dayName = days[dayIndex];
            dailyPoints[dayName] += t.amount;
        });

        const chartData = days.map(day => ({
            day,
            amount: dailyPoints[day]
        }));

        return NextResponse.json({ chartData });

    } catch (error) {
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
