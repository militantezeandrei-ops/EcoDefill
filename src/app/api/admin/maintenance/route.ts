import { getAdminAuth } from "@/lib/admin-auth";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import {
    getAndEnforceMaintenanceStatus,
    saveMaintenanceConfig,
    MaintenanceConfig,
} from "@/lib/maintenance";


export async function GET(req: NextRequest) {
    const auth = await getAdminAuth(req);
    if (!auth) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
        const [maintenance, pointsAgg, studentsWithPoints] = await Promise.all([
            getAndEnforceMaintenanceStatus(),
            prisma.user.aggregate({
                where: { role: "STUDENT" },
                _sum: { balance: true },
            }),
            prisma.user.count({
                where: { role: "STUDENT", balance: { gt: 0 } },
            }),
        ]);

        return NextResponse.json({
            ...maintenance,
            totalStudentPoints: Number(pointsAgg._sum.balance || 0),
            studentsWithPoints,
        });
    } catch (error) {
        console.error("GET /api/admin/maintenance error:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const auth = await getAdminAuth(req);
    if (!auth) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { action, adminPassword, semesterStartDate, semesterEndDate, syncFilterTimer, filterStartDate } = body;

        if (!adminPassword || typeof adminPassword !== "string") {
            return NextResponse.json(
                { message: "Admin password is required to authorize maintenance changes." },
                { status: 400 }
            );
        }

        // Verify Admin credentials against the database
        const adminUser = await prisma.user.findUnique({
            where: { id: auth.userId },
            select: { id: true, email: true, role: true, passwordHash: true },
        });

        if (!adminUser || adminUser.role !== "ADMIN") {
            return NextResponse.json({ message: "Unauthorized admin account." }, { status: 401 });
        }

        const isPasswordValid = await verifyPassword(adminPassword, adminUser.passwordHash);
        if (!isPasswordValid) {
            return NextResponse.json(
                { message: "Invalid admin password. Maintenance changes were not saved." },
                { status: 401 }
            );
        }

        const currentStatus = await getAndEnforceMaintenanceStatus();
        const nowIso = new Date().toISOString();

        if (action === "set_semester") {
            if (!semesterStartDate || !semesterEndDate) {
                return NextResponse.json(
                    { message: "Both Start Semester Date and End Semester Date are required." },
                    { status: 400 }
                );
            }

            const start = new Date(semesterStartDate);
            const end = new Date(semesterEndDate);

            // Set end of day (23:59:59.999) if a date-only string (YYYY-MM-DD) was provided
            if (typeof semesterEndDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(semesterEndDate)) {
                end.setHours(23, 59, 59, 999);
            }
            if (typeof semesterStartDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(semesterStartDate)) {
                start.setHours(0, 0, 0, 0);
            }

            if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
                return NextResponse.json({ message: "Invalid date format." }, { status: 400 });
            }

            if (end.getTime() <= start.getTime()) {
                return NextResponse.json(
                    { message: "End Semester Date must be after Start Semester Date." },
                    { status: 400 }
                );
            }

            const shouldSyncFilter = syncFilterTimer !== false || !currentStatus.filterStartDate;

            const newConfig: MaintenanceConfig = {
                semesterStartDate: start.toISOString(),
                semesterEndDate: end.toISOString(),
                semesterResetDone: false,
                lastPointsResetAt: currentStatus.lastPointsResetAt,
                filterStartDate: shouldSyncFilter ? start.toISOString() : currentStatus.filterStartDate,
                filterReplacedCount: currentStatus.filterReplacedCount || 1,
                updatedAt: nowIso,
                updatedByEmail: adminUser.email,
            };

            await saveMaintenanceConfig(newConfig);
        } else if (action === "replace_filter") {
            const replacementDate = filterStartDate ? new Date(filterStartDate) : new Date();
            if (Number.isNaN(replacementDate.getTime())) {
                return NextResponse.json({ message: "Invalid filter replacement date." }, { status: 400 });
            }

            const newConfig: MaintenanceConfig = {
                semesterStartDate: currentStatus.semesterStartDate,
                semesterEndDate: currentStatus.semesterEndDate,
                semesterResetDone: currentStatus.semesterResetDone,
                lastPointsResetAt: currentStatus.lastPointsResetAt,
                filterStartDate: replacementDate.toISOString(),
                filterReplacedCount: (currentStatus.filterReplacedCount || 0) + 1,
                updatedAt: nowIso,
                updatedByEmail: adminUser.email,
            };

            await saveMaintenanceConfig(newConfig);
        } else {
            return NextResponse.json({ message: "Invalid maintenance action." }, { status: 400 });
        }

        const [updatedMaintenance, pointsAgg, studentsWithPoints] = await Promise.all([
            getAndEnforceMaintenanceStatus(),
            prisma.user.aggregate({
                where: { role: "STUDENT" },
                _sum: { balance: true },
            }),
            prisma.user.count({
                where: { role: "STUDENT", balance: { gt: 0 } },
            }),
        ]);

        return NextResponse.json({
            message: "Maintenance configuration updated successfully.",
            ...updatedMaintenance,
            totalStudentPoints: Number(pointsAgg._sum.balance || 0),
            studentsWithPoints,
        });
    } catch (error) {
        console.error("POST /api/admin/maintenance error:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}
