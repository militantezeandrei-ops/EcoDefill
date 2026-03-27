import { Suspense } from "react";
import { Recycle } from "lucide-react";
import DashboardContent from "./DashboardContent";

export const revalidate = 15;

// Skeleton that renders INSTANTLY while DB queries run
function DashboardSkeleton() {
    return (
        <div className="space-y-8 animate-pulse">
            <div>
                <div className="h-7 w-52 bg-gray-200 rounded-lg" />
                <div className="h-4 w-80 bg-gray-100 rounded mt-2" />
            </div>

            {/* Stats skeleton */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-2xl border border-gray-100 bg-gray-50 p-5 h-[120px]">
                        <div className="h-3 w-20 bg-gray-200 rounded mb-3" />
                        <div className="h-7 w-16 bg-gray-200 rounded mb-2" />
                        <div className="h-3 w-24 bg-gray-100 rounded" />
                    </div>
                ))}
            </div>

            {/* Waste materials skeleton */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <div className="rounded-lg bg-green-500/10 p-2">
                        <Recycle className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="h-5 w-40 bg-gray-200 rounded" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="rounded-2xl border border-gray-100 bg-gray-50 p-5 h-[130px]">
                            <div className="h-10 w-10 bg-gray-200 rounded-xl mb-3" />
                            <div className="h-7 w-12 bg-gray-200 rounded mb-2" />
                            <div className="h-3 w-20 bg-gray-100 rounded" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Chart + Leaderboard skeleton */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="col-span-2 rounded-2xl border border-gray-100 bg-white p-6 h-[320px]" />
                <div className="rounded-2xl border border-gray-100 bg-white p-6 h-[320px]" />
            </div>
        </div>
    );
}

export default function DashboardPage({ searchParams }: { searchParams: any }) {
    return (
        <Suspense fallback={<DashboardSkeleton />}>
            <DashboardContent searchParams={searchParams} />
        </Suspense>
    );
}
