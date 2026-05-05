import prisma from "@/lib/prisma";

export interface CourseRankingEntry {
    course: string;
    points: number;
    items: number;
}

export const BASE_COURSES = ["BSIT", "BSCS", "BSHM", "BSTM", "BECED", "BTLED", "BSOAD"] as const;

export async function getCourseRanking(): Promise<CourseRankingEntry[]> {
    const users = await prisma.user.findMany({
        where: { role: "STUDENT" },
        select: {
            course: true,
            transactions: {
                where: { type: "EARN" },
                select: { amount: true, count: true, materialType: true },
            },
        },
    });

    const ranking = users.reduce<CourseRankingEntry[]>(
        (acc, user) => {
            const course = (user.course || "Unknown").trim().toUpperCase();
            const points = user.transactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
            const items = user.transactions.reduce((sum, tx) => {
                const amount = Number(tx.amount || 0);
                if (tx.materialType === "BOTTLE") return sum + (tx.count || amount * 1);
                if (tx.materialType === "CUP") return sum + (tx.count || amount * 2);
                if (tx.materialType === "PAPER") return sum + (tx.count || amount * 3);
                return sum + (tx.count || amount);
            }, 0);

            const existing = acc.find((entry) => entry.course === course);
            if (existing) {
                existing.points += points;
                existing.items += items;
                return acc;
            }

            if (BASE_COURSES.includes(course as (typeof BASE_COURSES)[number])) {
                acc.push({ course, points, items });
            }

            return acc;
        },
        BASE_COURSES.map((course) => ({ course, points: 0, items: 0 }))
    );

    return ranking.sort((a, b) => b.points - a.points);
}
