import { unstable_cache } from "next/cache";
import prisma from "@/lib/prisma";

export interface CourseRankingEntry {
    course: string;
    points: number;
    items: number;
}

export const BASE_COURSES = ["BSIT", "BSCS", "BSHM", "BSTM", "BECED", "BTLED", "BSOAD"] as const;

interface CourseAggregateRow {
    course: string;
    points: number;
    items: number;
}

async function queryCourseRanking(): Promise<CourseRankingEntry[]> {
    const rows = await prisma.$queryRaw<CourseAggregateRow[]>`
        SELECT
            UPPER(u."course") AS "course",
            COALESCE(SUM(t."amount"), 0)::double precision AS "points",
            COALESCE(SUM(
                CASE
                    WHEN t."count" IS NOT NULL AND t."count" > 0 THEN t."count"::double precision
                    WHEN t."materialType" = 'BOTTLE' THEN t."amount"::double precision
                    WHEN t."materialType" = 'CUP' THEN (t."amount" * 2)::double precision
                    WHEN t."materialType" = 'PAPER' THEN (t."amount" * 3)::double precision
                    ELSE t."amount"::double precision
                END
            ), 0)::double precision AS "items"
        FROM "Transaction" t
        INNER JOIN "User" u ON u."id" = t."userId"
        WHERE t."type" = 'EARN'
          AND t."status" = 'SUCCESS'
          AND u."role" = 'STUDENT'
          AND u."course" IS NOT NULL
        GROUP BY UPPER(u."course")
    `;

    const courseTotals: Record<string, { points: number; items: number }> = {};
    for (const c of BASE_COURSES) {
        courseTotals[c.toUpperCase()] = { points: 0, items: 0 };
    }

    for (const row of rows) {
        const key = row.course?.toUpperCase();
        if (key && courseTotals[key] !== undefined) {
            courseTotals[key] = {
                points: Number(row.points || 0),
                items: Number(row.items || 0),
            };
        }
    }

    return BASE_COURSES.map((course) => {
        const totals = courseTotals[course.toUpperCase()];
        return {
            course,
            points: totals.points,
            items: totals.items,
        };
    }).sort((a, b) => b.points - a.points);
}

const getCachedCourseRanking = unstable_cache(
    queryCourseRanking,
    ["course-ranking-v1"],
    { revalidate: 15, tags: ["course-ranking"] },
);

export async function getCourseRanking(): Promise<CourseRankingEntry[]> {
    return getCachedCourseRanking();
}
