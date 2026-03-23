import { Search } from "lucide-react";

export default function UsersLoading() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="flex items-center justify-between">
                <div>
                    <div className="h-8 w-40 bg-gray-200 rounded-lg" />
                    <div className="mt-2 h-4 w-96 bg-gray-100 rounded" />
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 shadow-sm">
                    <Search className="h-4 w-4 text-gray-200" />
                    <div className="h-4 w-24 bg-gray-100 rounded" />
                </div>
            </div>

            <div className="space-y-6">
                {/* Simulated Horizontal Tabs */}
                <div className="flex w-full items-center gap-3 overflow-x-auto pb-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-11 w-24 rounded-xl bg-gray-200" />
                    ))}
                </div>

                {/* Simulated Content Card */}
                <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm h-[400px]">
                    <div className="flex w-full items-center justify-between px-6 py-5 bg-gray-50 border-b border-gray-100">
                        <div className="flex items-center gap-5">
                            <div className="h-12 w-12 rounded-2xl bg-gray-200" />
                            <div className="space-y-2">
                                <div className="h-6 w-32 bg-gray-200 rounded" />
                                <div className="h-4 w-48 bg-gray-100 rounded" />
                            </div>
                        </div>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="h-12 w-full bg-gray-50 rounded-xl" />
                        <div className="h-12 w-full bg-gray-50 rounded-xl" />
                        <div className="h-12 w-full bg-gray-50 rounded-xl" />
                    </div>
                </div>
            </div>
        </div>
    );
}
