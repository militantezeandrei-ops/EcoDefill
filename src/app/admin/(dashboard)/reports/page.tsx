import prisma from "@/lib/prisma";
import { Users, Recycle, Receipt, FileText, Download, Trophy } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
    const [totalUsers, totalTransactions, topUsers] = await Promise.all([
        prisma.user.count({ where: { role: "STUDENT" } }),
        prisma.transaction.count(),
        prisma.user.findMany({
            where: { role: "STUDENT" },
            include: {
                transactions: {
                    where: { type: "EARN" },
                    select: { amount: true, count: true, materialType: true },
                },
            },
        }),
    ]);

    const totalItemsRecycled = topUsers.reduce(
        (s, u) => s + u.transactions.reduce((ss, t) => {
            if (t.materialType === "BOTTLE") return ss + (t.count || t.amount * 1);
            if (t.materialType === "CUP") return ss + (t.count || t.amount * 2);
            if (t.materialType === "PAPER") return ss + (t.count || t.amount * 3);
            return ss + (t.count || t.amount);
        }, 0),
        0
    );

    const activeStudents = topUsers
        .map((u) => ({
            email: u.email,
            fullName: u.fullName,
            course: u.course,
            section: u.section,
            totalPoints: u.transactions.reduce((s, t) => s + t.amount, 0),
            totalItems: u.transactions.reduce((s, t) => {
                if (t.materialType === "BOTTLE") return s + (t.count || t.amount * 1);
                if (t.materialType === "CUP") return s + (t.count || t.amount * 2);
                if (t.materialType === "PAPER") return s + (t.count || t.amount * 3);
                return s + (t.count || t.amount);
            }, 0),
        }))
        .sort((a, b) => b.totalPoints - a.totalPoints)
        .slice(0, 10);

    const maxStudentPoints = activeStudents[0]?.totalPoints || 1;

    const summaryCards = [
        {
            title: "Total Users",
            value: totalUsers.toLocaleString(),
            sub: "Registered students",
            icon: Users,
            gradient: "from-blue-500/10 to-indigo-500/5",
            iconBg: "bg-blue-500/10",
            iconColor: "text-blue-500",
        },
        {
            title: "Recycling Volume",
            value: `${totalItemsRecycled.toLocaleString()}`,
            sub: "Items recycled",
            icon: Recycle,
            gradient: "from-emerald-500/10 to-green-500/5",
            iconBg: "bg-emerald-500/10",
            iconColor: "text-emerald-500",
        },
        {
            title: "Transactions",
            value: totalTransactions.toLocaleString(),
            sub: "Total recorded",
            icon: Receipt,
            gradient: "from-purple-500/10 to-violet-500/5",
            iconBg: "bg-purple-500/10",
            iconColor: "text-purple-500",
        },
    ];

    const reportCards = [
        {
            title: "User Activity Report",
            tag: "Community",
            tagColor: "bg-blue-50 text-blue-600 border border-blue-100",
            desc: "Comprehensive analysis of user registrations, engagement metrics, and regional participation trends across the network.",
            gradient: "from-blue-500/5 to-transparent",
        },
        {
            title: "Recycling Performance",
            tag: "Sustainability",
            tagColor: "bg-emerald-50 text-emerald-600 border border-emerald-100",
            desc: "Detailed breakdown of collected material types and weights. Monitor progress towards environmental sustainability goals.",
            gradient: "from-emerald-500/5 to-transparent",
        },
        {
            title: "Transaction History",
            tag: "Finance",
            tagColor: "bg-purple-50 text-purple-600 border border-purple-100",
            desc: "Audited log of all refill station transactions, revenue generation, and reward redemption activities for the selected period.",
            gradient: "from-purple-500/5 to-transparent",
        },
    ];

    const medalStyles = [
        "bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-sm shadow-yellow-400/30",
        "bg-gradient-to-br from-gray-300 to-gray-400 text-white shadow-sm shadow-gray-400/30",
        "bg-gradient-to-br from-amber-600 to-amber-700 text-white shadow-sm shadow-amber-600/30",
    ];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Environmental Reports</h2>
                <p className="mt-1 text-sm text-gray-400">Generate, analyze, and export your sustainability performance data.</p>
            </div>

            {/* Summary */}
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

            {/* Report Cards */}
            <div className="grid grid-cols-3 gap-4">
                {reportCards.map((r) => (
                    <div key={r.title} className={`group relative overflow-hidden rounded-2xl border border-gray-100 bg-gradient-to-b ${r.gradient} p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5`}>
                        <div className="absolute -right-8 -bottom-8 h-32 w-32 rounded-full bg-gray-200/5 transition-transform duration-500 group-hover:scale-150" />
                        <div className="relative">
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${r.tagColor}`}>{r.tag}</span>
                            <h3 className="mt-3 text-base font-bold text-gray-900">{r.title}</h3>
                            <p className="mt-2 text-sm leading-relaxed text-gray-400">{r.desc}</p>
                            <button className="mt-4 flex items-center gap-2 text-[12px] font-bold text-gray-400 transition-colors hover:text-gray-700">
                                <Download className="h-3.5 w-3.5" />
                                Export Report
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Top Students */}
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-amber-500/10 p-2">
                            <Trophy className="h-4 w-4 text-amber-500" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-gray-900">Most Active Students</h3>
                            <p className="text-[11px] text-gray-400">Top 10 by recycling points earned</p>
                        </div>
                    </div>
                </div>
                <div className="divide-y divide-gray-50">
                    {activeStudents.map((user, idx) => (
                        <div key={user.email} className="group flex items-center justify-between px-6 py-4 transition-all hover:bg-blue-50/20">
                            <div className="flex items-center gap-4">
                                <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-[11px] font-black shadow-sm ${
                                    idx < 3 ? medalStyles[idx] : "bg-gray-100 text-gray-500"
                                }`}>
                                    {idx + 1}
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-xs font-black text-emerald-600">
                                        {user.fullName?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-[13px] font-bold text-gray-900">{user.fullName || user.email}</p>
                                        <p className="text-[10px] font-medium text-gray-400">{user.course} – {user.section}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="w-32">
                                    <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500"
                                            style={{ width: `${(user.totalPoints / maxStudentPoints) * 100}%` }}
                                        />
                                    </div>
                                </div>
                                <div className="text-right min-w-[80px]">
                                    <p className="text-sm font-black text-emerald-500">{user.totalPoints} <span className="text-[10px] font-bold text-gray-400">pts</span></p>
                                    <p className="text-[10px] font-medium text-gray-400">{user.totalItems} items</p>
                                </div>
                            </div>
                        </div>
                    ))}
                    {activeStudents.length === 0 && (
                        <div className="px-6 py-6 text-center text-sm text-gray-400">No active students yet.</div>
                    )}
                </div>
            </div>
        </div>
    );
}
