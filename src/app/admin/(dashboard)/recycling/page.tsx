import prisma from "@/lib/prisma";
import { Leaf, Package, Wind } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RecyclingPage() {
    const logs = await prisma.recyclingLog.findMany({
        orderBy: { createdAt: "desc" },
        include: { user: { select: { email: true, fullName: true, course: true } } },
    });

    const totalItems = logs.reduce((s, l) => s + l.count, 0);
    const totalPts = logs.reduce((s, l) => s + l.pointsEarned, 0);
    const co2Saved = (totalItems * 0.03).toFixed(1);

    const summaryCards = [
        {
            title: "Points Earned",
            value: `${totalPts}`,
            sub: "Total recycling points",
            icon: Leaf,
            gradient: "from-emerald-500/10 to-green-500/5",
            iconBg: "bg-emerald-500/10",
            iconColor: "text-emerald-500",
        },
        {
            title: "Items Collected",
            value: totalItems.toLocaleString(),
            sub: "Bottles, cups & paper",
            icon: Package,
            gradient: "from-blue-500/10 to-indigo-500/5",
            iconBg: "bg-blue-500/10",
            iconColor: "text-blue-500",
        },
        {
            title: "CO₂ Impact",
            value: `${co2Saved} kg`,
            sub: "Estimated CO₂ saved",
            icon: Wind,
            gradient: "from-cyan-500/10 to-sky-500/5",
            iconBg: "bg-cyan-500/10",
            iconColor: "text-cyan-500",
        },
    ];

    const materialStyles: Record<string, string> = {
        BOTTLE: "bg-green-50 text-green-600 border border-green-100",
        CUP: "bg-amber-50 text-amber-600 border border-amber-100",
        PAPER: "bg-orange-50 text-orange-600 border border-orange-100",
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Recycling Monitoring</h2>
                <p className="mt-1 text-sm text-gray-400">
                    Real-time environmental impact and recovery tracking.
                </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
                {summaryCards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <div key={card.title} className={`group relative overflow-hidden rounded-2xl border border-gray-100 bg-gradient-to-br ${card.gradient} p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5`}>
                            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gray-200/10 transition-transform duration-500 group-hover:scale-125" />
                            <div className="relative flex items-start justify-between">
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{card.title}</p>
                                    <p className="mt-2 text-2xl font-black text-gray-900">{card.value}</p>
                                    <p className="mt-1 text-[11px] font-medium text-gray-400">{card.sub}</p>
                                </div>
                                <div className={`rounded-xl p-2.5 ${card.iconBg} transition-transform duration-300 group-hover:scale-110`}>
                                    <Icon className={`h-5 w-5 ${card.iconColor}`} />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Recent Collections Log */}
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="border-b border-gray-100 px-6 py-4">
                    <h3 className="text-base font-bold text-gray-900">Recent Collections</h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">All recycling events from connected machines</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50/60">
                                <th className="px-6 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Date & Time</th>
                                <th className="px-6 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">User</th>
                                <th className="px-6 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Material</th>
                                <th className="px-6 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Count</th>
                                <th className="px-6 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Points</th>
                                <th className="px-6 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {logs.map((log) => (
                                <tr key={log.id} className="transition-colors hover:bg-blue-50/20">
                                    <td className="px-6 py-4 text-[13px] text-gray-500 font-medium">{log.createdAt.toLocaleString()}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-[11px] font-black text-blue-600 shadow-sm">
                                                {log.user?.fullName?.[0]?.toUpperCase() || log.user?.email?.[0]?.toUpperCase() || "?"}
                                            </div>
                                            <div>
                                                <p className="text-[13px] font-bold text-gray-800">{log.user?.fullName || log.user?.email || "Unknown"}</p>
                                                {log.user?.course && <p className="text-[10px] font-medium text-gray-400">{log.user.course}</p>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${materialStyles[log.materialType] || "bg-gray-50 text-gray-500"}`}>
                                            {log.materialType}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-[13px] font-bold text-gray-700">{log.count}</td>
                                    <td className="px-6 py-4">
                                        <span className="text-[13px] font-black text-emerald-500">+{log.pointsEarned}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-widest shadow-sm ${
                                            log.status === "SUCCESS"
                                                ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                                : "bg-red-50 text-red-500 border border-red-100"
                                        }`}>
                                            <div className={`h-1 w-1 rounded-full ${log.status === "SUCCESS" ? "bg-emerald-500" : "bg-red-500"}`} />
                                            {log.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
