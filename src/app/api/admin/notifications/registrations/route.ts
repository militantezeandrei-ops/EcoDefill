import { getAdminAuth } from "@/lib/admin-auth";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAndEnforceMaintenanceStatus } from "@/lib/maintenance";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const auth = await getAdminAuth(req);

    if (!auth || auth.role !== "ADMIN") {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
        const [recentStudents, maintenance] = await Promise.all([
            prisma.user.findMany({
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
            }),
            getAndEnforceMaintenanceStatus(),
        ]);

        return NextResponse.json({
            students: recentStudents,
            maintenanceAlerts: maintenance.alerts,
            maintenanceSummary: {
                daysUntilReset: maintenance.daysUntilReset,
                filterDaysRemaining: maintenance.filterDaysRemaining,
                filterStatus: maintenance.filterStatus,
                filterHealthPercent: maintenance.filterHealthPercent,
            },
        });
    } catch (error) {
        console.error("Error fetching recent registrations & maintenance alerts:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}
