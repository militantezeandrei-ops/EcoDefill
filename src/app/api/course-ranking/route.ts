export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, handleApiError } from "@/lib/api-middleware";
import { getCourseRanking } from "@/lib/course-ranking";

export async function GET(req: NextRequest) {
    try {
        const auth = await authenticateRequest(req);
        if (auth.error) {
            return NextResponse.json({ message: auth.error }, { status: auth.status });
        }

        const ranking = await getCourseRanking();
        return NextResponse.json(ranking);
    } catch (error) {
        return handleApiError(error);
    }
}
