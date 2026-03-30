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
            const amount = Number(t.amount);
            if (t.materialType === "BOTTLE") return ss + (t.count || amount * 1);
            if (t.materialType === "CUP") return ss + (t.count || amount * 2);
            if (t.materialType === "PAPER") return ss + (t.count || amount * 3);
            return ss + (t.count || amount);
        }, 0),
        0
    );

    const activeStudents = topUsers
        .map((u) => ({
            email: u.email,
            fullName: u.fullName,
            course: u.course,
            section: u.section,
            totalPoints: u.transactions.reduce((s, t) => s + Number(t.amount), 0),
            totalItems: u.transactions.reduce((s, t) => {
                const amount = Number(t.amount);
                if (t.materialType === "BOTTLE") return s + (t.count || amount * 1);
                if (t.materialType === "CUP") return s + (t.count || amount * 2);
                if (t.materialType === "PAPER") return s + (t.count || amount * 3);
                return s + (t.count || amount);
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
            bg: "bg-[#3B82F6]",
            iconBg: "bg-white/20",
            iconColor: "text-white",
            valueColor: "text-white",
            titleColor: "text-white/80",
            subColor: "text-white/60",
        },
        {
            title: "Recycling Volume",
            value: `${totalItemsRecycled.toLocaleString()}`,
            sub: "Items recycled",
            icon: Recycle,
            bg: "bg-[#16A34A]",
            iconBg: "bg-white/20",
            iconColor: "text-white",
            valueColor: "text-white",
            titleColor: "text-white/80",
            subColor: "text-white/60",
        },
        {
            title: "Transactions",
            value: totalTransactions.toLocaleString(),
            sub: "Total recorded",
            icon: Receipt,
            bg: "bg-[#8B5CF6]",
            iconBg: "bg-white/20",
            iconColor: "text-white",
            valueColor: "text-white",
            titleColor: "text-white/80",
            subColor: "text-white/60",
        },
    ];

    const reportCards = [
        {
            title: "User Activity Report",
            tag: "Community",
            tagColor: "bg-white/20 text-white border border-white/30",
            desc: "Comprehensive analysis of user registrations, engagement metrics, and regional participation trends across the network.",
            bg: "bg-[#2563EB]",
            textColor: "text-white",
            descColor: "text-white/80",
        },
        {
            title: "Recycling Performance",
            tag: "Sustainability",
            tagColor: "bg-white/20 text-white border border-white/30",
            desc: "Detailed breakdown of collected material types and weights. Monitor progress towards environmental sustainability goals.",
            bg: "bg-[#059669]",
            textColor: "text-white",
            descColor: "text-white/80",
        },
        {
            title: "Transaction History",
            tag: "Finance",
            tagColor: "bg-white/20 text-white border border-white/30",
            desc: "Audited log of all refill station transactions, revenue generation, and reward redemption activities for the selected period.",
            bg: "bg-[#7C3AED]",
            textColor: "text-white",
            descColor: "text-white/80",
        },
    ];

    const medalStyles = [
        "bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-sm shadow-yellow-400/30",
        "bg-gradient-to-br from-gray-300 to-gray-400 text-white shadow-sm shadow-gray-400/30",
        "bg-gradient-to-br from-amber-600 to-amber-700 text-white shadow-sm shadow-amber-600/30",
    ];

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Environmental Reports</h2>
                    <p className="mt-0.5 text-[13px] text-gray-400">Generate, analyze, and export sustainability performance data.</p>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 shadow-sm">
                    <span className="text-[12px] font-bold text-gray-500 uppercase tracking-wider">Last Generated</span>
                    <span className="text-[13px] font-black text-gray-900">Live</span>
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
                {summaryCards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <div key={card.title} className={`group relative overflow-hidden rounded-xl ${card.bg} p-4 shadow-md transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5`}>
                            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 transition-transform duration-500 group-hover:scale-125" />
                            <div className="relative flex items-start justify-between">
                                <div>
                                    <p className={`text-[11px] font-bold uppercase tracking-wider ${card.titleColor}`}>{card.title}</p>
                                    <p className={`mt-1 text-[22px] font-black ${card.valueColor}`}>{card.value}</p>
                                    <p className={`mt-0.5 text-[11px] font-medium ${card.subColor}`}>{card.sub}</p>
                                </div>
                                <div className={`rounded-xl p-2.5 ${card.iconBg} backdrop-blur-sm`}>
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
                    <div key={r.title} className={`group relative overflow-hidden rounded-2xl ${r.bg} p-6 shadow-md transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5`}>
                        <div className="absolute -right-8 -bottom-8 h-32 w-32 rounded-full bg-white/10 transition-transform duration-500 group-hover:scale-150" />
                        <div className="relative">
                            <span className={`rounded-full px-2.5 py-1 text-[12px] font-bold uppercase tracking-wider ${r.tagColor}`}>{r.tag}</span>
                            <h3 className={`mt-3 text-lg font-bold ${r.textColor}`}>{r.title}</h3>
                            <p className={`mt-2 text-base leading-relaxed ${r.descColor}`}>{r.desc}</p>
                            <button className="mt-4 flex items-center gap-2 text-sm font-bold text-white/70 transition-colors hover:text-white">
                                <Download className="h-4 w-4" />
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
                            <h3 className="text-lg font-bold text-gray-900">Most Active Students</h3>
                            <p className="text-[13px] text-gray-400">Top 10 by recycling points earned</p>
                        </div>
                    </div>
                </div>
                <div className="divide-y divide-gray-50">
                    {activeStudents.map((user, idx) => (
                        <div key={user.email} className="group flex items-center justify-between px-6 py-4 transition-all hover:bg-blue-50/20">
                            <div className="flex items-center gap-4">
                                <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-[13px] font-black shadow-sm ${
                                    idx < 3 ? medalStyles[idx] : "bg-gray-100 text-gray-500"
                                }`}>
                                    {idx + 1}
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-xs font-black text-emerald-600">
                                        {user.fullName?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-[15px] font-bold text-gray-900">{user.fullName || user.email}</p>
                                        <p className="text-[12px] font-medium text-gray-400">{user.course} – {user.section}</p>
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
                                    <p className="text-base font-black text-emerald-500">{Number(user.totalPoints).toFixed(1).replace(/\.0$/, '')} <span className="text-[12px] font-bold text-gray-400">pts</span></p>
                                    <p className="text-[12px] font-medium text-gray-400">{user.totalItems} items</p>
                                </div>
                            </div>
                        </div>
                    ))}
                    {activeStudents.length === 0 && (
                        <div className="px-6 py-6 text-center text-base text-gray-400">No active students yet.</div>
                    )}
                </div>
            </div>
        </div>
    );
}
