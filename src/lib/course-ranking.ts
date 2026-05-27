import prisma from "@/lib/prisma";

export interface CourseRankingEntry {
    course: string;
    points: number;
    items: number;
}

export const BASE_COURSES = ["BSIT", "BSCS", "BSHM", "BSTM", "BECED", "BTLED", "BSOAD"] as const;

export async function getCourseRanking(): Promise<CourseRankingEntry[]> {
    const ranking = await Promise.all(
        BASE_COURSES.map(async (course) => {
            const groupedTransactions = await prisma.transaction.groupBy({
                by: ["materialType"],
                where: {
                    type: "EARN",
                    status: "SUCCESS",
                    user: {
                        role: "STUDENT",
                        course: { equals: course, mode: "insensitive" },
                    },
                },
                _sum: {
                    amount: true,
                    count: true,
                },
            });

            const totals = groupedTransactions.reduce(
                (acc, group) => {
                    const points = Number(group._sum.amount || 0);
                    const count = group._sum.count || 0;
                    let items = count;

                    if (!items) {
                        if (group.materialType === "BOTTLE") items = points;
                        else if (group.materialType === "CUP") items = points * 2;
                        else if (group.materialType === "PAPER") items = points * 3;
                        else items = points;
                    }

                    acc.points += points;
                    acc.items += items;
                    return acc;
                },
                { points: 0, items: 0 }
            );

            return { course, ...totals };
        })
    );

    return ranking.sort((a, b) => b.points - a.points);
}
