import { unstable_cache } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";
import { getAndEnforceMaintenanceStatus } from "@/lib/maintenance";
import MaintenanceClient, { type MaintenanceData } from "./MaintenanceClient";

export const dynamic = "force-dynamic";

const getAdminMaintenanceData = unstable_cache(
    async (): Promise<MaintenanceData> => {
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

        return {
            ...maintenance,
            totalStudentPoints: Number(pointsAgg._sum.balance || 0),
            studentsWithPoints,
        };
    },
    ["admin-maintenance-v1"],
    { revalidate: 10, tags: ["admin-maintenance"] },
);

export default async function MaintenancePage() {
    await requireAdmin();
    const initialData = await getAdminMaintenanceData();
    return <MaintenanceClient initialData={initialData} />;
}
