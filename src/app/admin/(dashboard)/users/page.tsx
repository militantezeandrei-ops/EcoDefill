import { unstable_cache } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";
import { Search } from "lucide-react";
import UsersAccordion from "@/components/admin/UsersAccordion";
import AutoRefresh from "@/components/admin/AutoRefresh";

export const dynamic = "force-dynamic";

interface UserEarnAggregate {
    userId: string;
    totalEarned: number;
    totalItems: number;
}

const getAdminUsersData = unstable_cache(
    async () => {
        const [users, earnAggRows] = await Promise.all([
            prisma.user.findMany({
                where: { role: "STUDENT" },
                orderBy: [{ course: "asc" }, { section: "asc" }, { email: "asc" }],
                select: {
                    id: true,
                    email: true,
                    fullName: true,
                    balance: true,
                    course: true,
                    yearLevel: true,
                    section: true,
                    createdAt: true,
                },
            }),
            prisma.$queryRaw<UserEarnAggregate[]>`
                SELECT
                    t."userId"::text AS "userId",
                    COALESCE(SUM(t."amount"), 0)::double precision AS "totalEarned",
                    COALESCE(SUM(
                        CASE
                            WHEN t."count" IS NOT NULL AND t."count" > 0 THEN t."count"::double precision
                            WHEN t."materialType" = 'BOTTLE' THEN t."amount"::double precision
                            WHEN t."materialType" = 'CUP' THEN (t."amount" * 2)::double precision
                            WHEN t."materialType" = 'PAPER' THEN (t."amount" * 3)::double precision
                            ELSE t."amount"::double precision
                        END
                    ), 0)::double precision AS "totalItems"
                FROM "Transaction" t
                INNER JOIN "User" u ON u."id" = t."userId"
                WHERE t."type" = 'EARN' AND u."role" = 'STUDENT'
                GROUP BY t."userId"
            `,
        ]);

        return {
            users: users.map((u) => ({
                ...u,
                balance: Number(u.balance),
                createdAt: u.createdAt.toISOString(),
            })),
            earnAggRows,
        };
    },
    ["admin-users-list-v1"],
    { revalidate: 15 },
);

export default async function UsersPage() {
    await requireAdmin();
    const { users, earnAggRows } = await getAdminUsersData();
    const earnMap = new Map(
        earnAggRows.map((row) => [
            row.userId,
            {
                totalEarned: Number(row.totalEarned || 0),
                totalItems: Number(row.totalItems || 0),
            },
        ]),
    );

    // Defining the official course list to ENSURE they appear even if empty
    const OFFICIAL_COURSES = ["BSIT", "BSCS", "BSHM", "BSTM", "BECED", "BTLED", "BSOAD"];
    const coursesMap = new Map<string, any>();

    // Pre-populate with empty state objects
    OFFICIAL_COURSES.forEach(courseName => {
        coursesMap.set(courseName, {
            course: courseName,
            totalPoints: 0,
            totalItems: 0,
            yearsMap: new Map<string, any>()
        });
    });

    users.forEach(u => {
        const courseName = u.course || "Others";
        
        let yearLevel = u.yearLevel;
        if (yearLevel) {
            yearLevel = yearLevel.replace(/[^0-9]/g, '');
        }
        
        // Inference: If yearLevel is missing (Unknown Year), try to pull it from Section
        if (!yearLevel && u.section && courseName === "BSIT") {
            if (u.section === "C") {
                yearLevel = "3"; // Map Section C to 3rd Year per missing data pattern
            } else {
                // Try to find a digit 1-4 in the section string (e.g. "BSIT-1A", "3B", "1")
                const match = u.section.match(/([1-4])/);
                if (match) yearLevel = match[1];
            }
        }

        const yearLevelName = yearLevel ? `${yearLevel} Year` : "Unknown Year";
        
        // Clean section name: If it starts with digits (e.g. "4B"), strip them if it looks like a year prefix
        let sectionName = u.section || "N/A";
        if (sectionName !== "N/A") {
            // regex: remove leading digits if followed by letters
            sectionName = sectionName.replace(/^\d+/, '').trim() || sectionName;
        }
        
        // 1. Get or Create Course Node
        if (!coursesMap.has(courseName)) {
            coursesMap.set(courseName, {
                course: courseName,
                totalPoints: 0,
                totalItems: 0,
                yearsMap: new Map<string, any>()
            });
        }
        const courseNode = coursesMap.get(courseName)!;

        // 2. Get or Create Year Node
        if (!courseNode.yearsMap.has(yearLevelName)) {
            courseNode.yearsMap.set(yearLevelName, {
                yearLevel: yearLevelName,
                sectionsMap: new Map<string, any>()
            });
        }
        const yearNode = courseNode.yearsMap.get(yearLevelName);

        // 3. Get or Create Section Node
        if (!yearNode.sectionsMap.has(sectionName)) {
            yearNode.sectionsMap.set(sectionName, {
                section: sectionName,
                users: []
            });
        }
        const sectionNode = yearNode.sectionsMap.get(sectionName);

        // Pull pre-aggregated points & items from SQL GROUP BY map
        const userAgg = earnMap.get(u.id);
        const userTotalEarned = userAgg?.totalEarned ?? 0;
        const userTotalItems = userAgg?.totalItems ?? 0;

        const status = userTotalEarned > 0 ? "ACTIVE" : "INACTIVE";

        sectionNode.users.push({
            id: u.id,
            name: u.fullName || "Unregistered Name",
            email: u.email,
            course: courseName,
            yearLevel: yearLevelName,
            section: sectionName,
            balance: Number(u.balance),
            totalEarned: userTotalEarned,
            totalItems: userTotalItems,
            status,
            joinedAt: u.createdAt
        });

        // Add to course aggregations
        courseNode.totalPoints += userTotalEarned;
        courseNode.totalItems += userTotalItems;
    });

    // Serialize deeply nested Maps into Array objects
    const courses = Array.from(coursesMap.values()).map(course => ({
        course: course.course,
        totalPoints: course.totalPoints,
        totalItems: course.totalItems,
        years: Array.from(course.yearsMap.values())
            .sort((a: any, b: any) => {
                // Extract number from "1 Year", "2 Year" etc.
                const numA = parseInt(a.yearLevel) || 0;
                const numB = parseInt(b.yearLevel) || 0;
                return numA - numB;
            })
            .map((year: any) => ({
                yearLevel: year.yearLevel,
                sections: Array.from(year.sectionsMap.values())
                    .sort((a: any, b: any) => String(a.section).localeCompare(String(b.section)))
                    .map((sec: any) => ({
                        section: sec.section,
                        users: sec.users
                    }))
            }))
    }));

    return (
        <div className="space-y-6">
            <AutoRefresh intervalMs={30000} />
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900">User List</h2>
                    <p className="mt-1 text-base text-gray-500">
                        View student recycling participation grouped structurally by Course, Year Level, and Section.
                    </p>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 shadow-sm">
                    <Search className="h-4 w-4 text-gray-400" />
                    <span className="text-base text-gray-400">Search users...</span>
                </div>
            </div>

            <UsersAccordion courses={courses} />
        </div>
    );
}
