export default function MaintenanceLoading() {
    return (
        <div className="space-y-8 pb-10 animate-pulse">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="h-10 w-10 rounded-xl bg-gray-200" />
                    <div>
                        <div className="h-6 w-52 rounded-lg bg-gray-200" />
                        <div className="mt-2 h-3 w-72 rounded bg-gray-100" />
                    </div>
                </div>
                <div className="h-9 w-56 rounded-xl bg-gray-100" />
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-32 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                        <div className="h-3 w-28 rounded bg-gray-200" />
                        <div className="mt-4 h-8 w-24 rounded bg-gray-200" />
                        <div className="mt-3 h-3 w-40 rounded bg-gray-100" />
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="h-96 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm" />
                <div className="h-96 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm" />
            </div>
        </div>
    );
}
