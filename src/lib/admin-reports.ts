import prisma from "@/lib/prisma";

export const ADMIN_REPORT_TYPES = ["all", "user-activity", "recycling-performance", "transaction-history"] as const;

export type AdminReportType = (typeof ADMIN_REPORT_TYPES)[number];

export interface ActiveStudentReportRow {
    email: string;
    fullName: string | null;
    course: string | null;
    section: string | null;
    totalPoints: number;
    totalItems: number;
}

export interface MaterialReportRow {
    materialType: string;
    points: number;
    items: number;
    transactions: number;
}

export interface RecentTransactionReportRow {
    id: string;
    userName: string;
    userEmail: string;
    type: string;
    amount: number;
    materialType: string;
    count: number;
    status: string;
    createdAt: Date;
}

export interface AdminReportData {
    generatedAt: Date;
    totalUsers: number;
    totalTransactions: number;
    totalEarned: number;
    totalRedeemed: number;
    totalItemsRecycled: number;
    waterDispensedMl: number;
    activeStudents: ActiveStudentReportRow[];
    materialSummary: MaterialReportRow[];
    recentTransactions: RecentTransactionReportRow[];
}

export function resolveAdminReportType(value: string | null): AdminReportType {
    if (value && ADMIN_REPORT_TYPES.includes(value as AdminReportType)) {
        return value as AdminReportType;
    }

    return "all";
}

export function getAdminReportLabel(type: AdminReportType) {
    const labels: Record<AdminReportType, string> = {
        all: "EcoDefill Complete Admin Report",
        "user-activity": "User Activity Report",
        "recycling-performance": "Recycling Performance Report",
        "transaction-history": "Transaction History Report",
    };

    return labels[type];
}

export function getMaterialItemCount(materialType: string | null, count: number | null, amount: number) {
    if (count) return count;
    if (materialType === "BOTTLE") return amount;
    if (materialType === "CUP") return amount * 2;
    if (materialType === "PAPER") return amount * 3;
    return amount;
}

export async function getAdminReportData(): Promise<AdminReportData> {
    const [users, totalTransactions, recentTransactions, totalRedeemedAgg] = await Promise.all([
        prisma.user.findMany({
            where: { role: "STUDENT" },
            select: {
                email: true,
                fullName: true,
                course: true,
                section: true,
                transactions: {
                    where: { type: "EARN", status: "SUCCESS" },
                    select: {
                        amount: true,
                        count: true,
                        materialType: true,
                    },
                },
            },
        }),
        prisma.transaction.count(),
        prisma.transaction.findMany({
            take: 40,
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                type: true,
                amount: true,
                materialType: true,
                count: true,
                status: true,
                createdAt: true,
                user: {
                    select: {
                        email: true,
                        fullName: true,
                    },
                },
            },
        }),
        prisma.transaction.aggregate({
            _sum: { amount: true },
            where: { type: "REDEEM", status: "SUCCESS" },
        }),
    ]);

    const materialMap = new Map<string, MaterialReportRow>();

    for (const materialType of ["BOTTLE", "CUP", "PAPER"]) {
        materialMap.set(materialType, {
            materialType,
            points: 0,
            items: 0,
            transactions: 0,
        });
    }

    const activeStudents = users
        .map((user) => {
            const totalPoints = user.transactions.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
            const totalItems = user.transactions.reduce((sum, transaction) => {
                const amount = Number(transaction.amount || 0);
                return sum + getMaterialItemCount(transaction.materialType, transaction.count, amount);
            }, 0);

            for (const transaction of user.transactions) {
                const materialType = transaction.materialType || "OTHER";
                const amount = Number(transaction.amount || 0);
                const row = materialMap.get(materialType) ?? {
                    materialType,
                    points: 0,
                    items: 0,
                    transactions: 0,
                };

                row.points += amount;
                row.items += getMaterialItemCount(transaction.materialType, transaction.count, amount);
                row.transactions += 1;
                materialMap.set(materialType, row);
            }

            return {
                email: user.email,
                fullName: user.fullName,
                course: user.course,
                section: user.section,
                totalPoints,
                totalItems,
            };
        })
        .sort((a, b) => b.totalPoints - a.totalPoints);

    const totalEarned = activeStudents.reduce((sum, user) => sum + user.totalPoints, 0);
    const totalItemsRecycled = activeStudents.reduce((sum, user) => sum + user.totalItems, 0);
    const totalRedeemed = Number(totalRedeemedAgg._sum.amount || 0);

    return {
        generatedAt: new Date(),
        totalUsers: users.length,
        totalTransactions,
        totalEarned,
        totalRedeemed,
        totalItemsRecycled,
        waterDispensedMl: totalRedeemed * 100,
        activeStudents: activeStudents.slice(0, 10),
        materialSummary: Array.from(materialMap.values()).sort((a, b) => b.points - a.points),
        recentTransactions: recentTransactions.map((transaction) => ({
            id: transaction.id,
            userName: transaction.user.fullName || transaction.user.email,
            userEmail: transaction.user.email,
            type: transaction.type,
            amount: Number(transaction.amount || 0),
            materialType: transaction.materialType || "N/A",
            count: transaction.count || 0,
            status: transaction.status,
            createdAt: transaction.createdAt,
        })),
    };
}
