import { Activity, Recycle } from "lucide-react";

export default function DashboardLoading() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="flex items-center justify-between rounded-[20px] border border-gray-100 bg-white px-6 py-4 shadow-sm">
                <div className="flex items-center gap-2.5">
                    <Activity className="h-5 w-5 text-gray-200" />
                    <div className="h-6 w-32 rounded-lg bg-gray-200" />
                </div>
                <div className="hidden items-center gap-8 md:flex">
                    <div className="h-5 w-36 rounded bg-gray-100" />
                    <div className="h-5 w-28 rounded bg-gray-100" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="h-[116px] rounded-[20px] border border-gray-100 bg-white p-5 shadow-sm">
                        <div className="h-3 w-20 rounded bg-gray-200" />
                        <div className="mt-4 h-7 w-16 rounded bg-gray-200" />
                        <div className="mt-3 h-4 w-28 rounded bg-gray-100" />
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-3 gap-5">
                {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="flex items-center gap-4 rounded-[20px] border border-gray-100 bg-white p-4 shadow-sm">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100">
                            <Recycle className="h-5 w-5 text-gray-200" />
                        </div>
                        <div>
                            <div className="h-6 w-14 rounded bg-gray-200" />
                            <div className="mt-2 h-3 w-24 rounded bg-gray-100" />
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="h-[380px] rounded-[20px] border border-gray-100 bg-white p-5 shadow-sm">
                        <div className="h-5 w-36 rounded bg-gray-200" />
                        <div className="mt-8 h-[260px] rounded-2xl bg-gray-50" />
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <div className="h-[380px] rounded-[20px] border border-gray-100 bg-white p-5 shadow-sm lg:col-span-2">
                    <div className="h-5 w-44 rounded bg-gray-200" />
                    <div className="mt-6 space-y-3">
                        {Array.from({ length: 5 }).map((_, index) => (
                            <div key={index} className="h-12 rounded-xl bg-gray-50" />
                        ))}
                    </div>
                </div>
                <div className="h-[380px] rounded-[20px] border border-gray-100 bg-white p-5 shadow-sm">
                    <div className="h-6 w-32 rounded bg-gray-200" />
                    <div className="mx-auto mt-10 h-36 w-36 rounded-full bg-gray-50" />
                </div>
            </div>
        </div>
    );
}
