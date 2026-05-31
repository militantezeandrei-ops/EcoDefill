import prisma from "@/lib/prisma";

export interface CourseRankingEntry {
    course: string;
    points: number;
    items: number;
}

export const BASE_COURSES = ["BSIT", "BSCS", "BSHM", "BSTM", "BECED", "BTLED", "BSOAD"] as const;

export async function getCourseRanking(): Promise<CourseRankingEntry[]> {
    // Fetch all student EARN transactions in a single query to prevent N+1 database queries
    const transactions = await prisma.transaction.findMany({
        where: {
            type: "EARN",
            status: "SUCCESS",
            user: {
                role: "STUDENT",
            },
        },
        select: {
            amount: true,
            count: true,
            materialType: true,
            user: {
                select: {
                    course: true,
                },
            },
        },
    });

    // Initialize course totals
    const courseTotals: Record<string, { points: number; items: number }> = {};
    for (const c of BASE_COURSES) {
        courseTotals[c.toUpperCase()] = { points: 0, items: 0 };
    }

    // Aggregate in memory
    for (const tx of transactions) {
        const rawCourse = tx.user?.course;
        if (!rawCourse) continue;
        const courseKey = rawCourse.toUpperCase();
        
        if (courseTotals[courseKey] !== undefined) {
            const points = Number(tx.amount || 0);
            const count = tx.count || 0;
            let items = count;

            if (!items) {
                if (tx.materialType === "BOTTLE") items = points;
                else if (tx.materialType === "CUP") items = points * 2;
                else if (tx.materialType === "PAPER") items = points * 3;
                else items = points;
            }

            courseTotals[courseKey].points += points;
            courseTotals[courseKey].items += items;
        }
    }

    const ranking = BASE_COURSES.map((course) => {
        const totals = courseTotals[course.toUpperCase()];
        return {
            course,
            points: totals.points,
            items: totals.items,
        };
    });

    return ranking.sort((a, b) => b.points - a.points);
}
