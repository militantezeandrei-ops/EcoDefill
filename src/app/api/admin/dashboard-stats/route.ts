import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
    try {
        const token = req.cookies.get("adminAuthToken")?.value;
        if (!token) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const decoded = verifyToken(token);
        if (!decoded || decoded.role !== "ADMIN") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        // Concurrent Data Fetching for Performance Optimization
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [
            totalUsers,
            todaysPointsAgg,
            totalRedemptionsAgg,
            bottlesAgg,
            cupsAgg,
            paperAgg,
            successfulRecycling,
            allRecycling,
            healthyMachines,
            allMachines
        ] = await Promise.all([
            prisma.user.count({ where: { role: "STUDENT" } }),
            prisma.transaction.aggregate({ _sum: { amount: true }, where: { type: "EARN", createdAt: { gte: today } } }),
            prisma.transaction.aggregate({ _sum: { amount: true }, where: { type: "REDEEM", status: "SUCCESS" } }),
            prisma.transaction.aggregate({ _sum: { count: true }, where: { type: "EARN", materialType: "BOTTLE", status: "SUCCESS" } }),
            prisma.transaction.aggregate({ _sum: { count: true }, where: { type: "EARN", materialType: "CUP", status: "SUCCESS" } }),
            prisma.transaction.aggregate({ _sum: { count: true }, where: { type: "EARN", materialType: "PAPER", status: "SUCCESS" } }),
            prisma.recyclingLog.count({ where: { status: "SUCCESS" } }),
            prisma.recyclingLog.count(),
            prisma.machineLog.count({ where: { status: "ONLINE" } }),
            prisma.machineLog.count()
        ]);

        const todaysPoints = todaysPointsAgg._sum.amount || 0;
        const totalPointsRedeemed = totalRedemptionsAgg._sum.amount || 0;
        const totalWaterLiters = totalPointsRedeemed * 0.1;

        const successRate = allRecycling > 0 ? (successfulRecycling / allRecycling) * 100 : 100;
        const machineHealth = allMachines > 0 ? (healthyMachines / allMachines) * 100 : 100;

        return NextResponse.json({
            metrics: {
                totalUsers,
                todaysPoints,
                totalWaterLiters: totalWaterLiters.toFixed(1),
                bottles: bottlesAgg._sum.count || 0,
                cups: cupsAgg._sum.count || 0,
                paper: paperAgg._sum.count || 0,
                successRate: Math.round(successRate),
                machineHealth: Math.round(machineHealth)
            }
        });

    } catch (error) {
        console.error("Dashboard Stats Error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
