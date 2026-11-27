export default function AdminTabLoading() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="flex items-center justify-between">
                <div>
                    <div className="h-7 w-56 rounded-lg bg-gray-200" />
                    <div className="mt-2 h-4 w-80 rounded bg-gray-100" />
                </div>
                <div className="h-10 w-32 rounded-xl bg-gray-100" />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div
                        key={i}
                        className="h-28 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
                    >
                        <div className="h-3 w-24 rounded bg-gray-200" />
                        <div className="mt-3 h-7 w-20 rounded bg-gray-200" />
                        <div className="mt-2 h-3 w-32 rounded bg-gray-100" />
                    </div>
                ))}
            </div>

            <div className="space-y-3 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-14 rounded-xl bg-gray-50" />
                ))}
            </div>
        </div>
    );
}
