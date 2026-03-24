import prisma from "@/lib/prisma";
import { Users, Target, Droplet, Activity, TrendingUp, Recycle } from "lucide-react";
import DashboardCharts from "@/components/admin/DashboardCharts";

export default async function DashboardContent() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const [
        totalUsers,
        todaysPointsAgg,
        totalRedemptionsAgg,
        bottlesAgg,
        cupsAgg,
        paperAgg,
        healthyMachines,
        allMachines,
        earnTransactions,
        leaderboardData,
    ] = await Promise.all([
        prisma.user.count({ where: { role: "STUDENT" } }),
        prisma.transaction.aggregate({ _sum: { amount: true }, where: { type: "EARN", createdAt: { gte: today } } }),
        prisma.transaction.aggregate({ _sum: { amount: true }, where: { type: "REDEEM", status: "SUCCESS" } }),
        prisma.transaction.aggregate({ _sum: { count: true }, where: { type: "EARN", materialType: "BOTTLE", status: "SUCCESS" } }),
        prisma.transaction.aggregate({ _sum: { count: true }, where: { type: "EARN", materialType: "CUP", status: "SUCCESS" } }),
        prisma.transaction.aggregate({ _sum: { count: true }, where: { type: "EARN", materialType: "PAPER", status: "SUCCESS" } }),
        prisma.machineLog.count({ where: { status: "ONLINE" } }),
        prisma.machineLog.count(),
        prisma.transaction.findMany({
            where: { type: "EARN", createdAt: { gte: sevenDaysAgo } },
            select: { amount: true, createdAt: true },
        }),
        prisma.user.findMany({
            where: { role: "STUDENT" },
            include: { transactions: { where: { type: "EARN" }, select: { amount: true, count: true, materialType: true } } },
        }),
    ]);

    const todaysPoints = todaysPointsAgg._sum.amount || 0;
    const totalRedeemed = totalRedemptionsAgg._sum.amount || 0;
    const waterDispensedMl = totalRedeemed * 100;
    const bottles = bottlesAgg._sum.count || 0;
    const cups = cupsAgg._sum.count || 0;
    const paper = paperAgg._sum.count || 0;
    const machineHealth = allMachines > 0 ? Math.round((healthyMachines / allMachines) * 100) : 100;

    // Build chart data
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const dailyPoints: Record<string, number> = {};
    days.forEach((d) => (dailyPoints[d] = 0));
    earnTransactions.forEach((t) => {
        let idx = t.createdAt.getDay() - 1;
        if (idx === -1) idx = 6;
        dailyPoints[days[idx]] += t.amount;
    });
    const chartData = days.map((day) => ({ day, amount: dailyPoints[day] }));

    // Build leaderboard
    const leaderboard = leaderboardData
        .reduce((acc: { course: string; points: number; items: number }[], u) => {
            const course = u.course || "Unknown";
            const pts = u.transactions.reduce((s, t) => s + t.amount, 0);
            const items = u.transactions.reduce((s, t) => {
                if (t.materialType === "BOTTLE") return s + (t.count || t.amount * 1);
                if (t.materialType === "CUP") return s + (t.count || t.amount * 2);
                if (t.materialType === "PAPER") return s + (t.count || t.amount * 3);
                return s + (t.count || t.amount);
            }, 0);
            const existing = acc.find((c) => c.course === course);
            if (existing) { existing.points += pts; existing.items += items; }
            else acc.push({ course, points: pts, items });
            return acc;
        }, [])
        .sort((a, b) => b.points - a.points)
        .slice(0, 5);

    const maxPoints = leaderboard[0]?.points || 1;

    const statCards = [
        {
            title: "Total Users",
            value: totalUsers.toLocaleString(),
            sub: "Registered students",
            icon: Users,
            bg: "bg-[#111827]",
            valueColor: "text-white",
            titleColor: "text-gray-300",
            subColor: "text-gray-400",
            iconBg: "bg-white/10",
            iconColor: "text-white",
        },
        {
            title: "Today's Points",
            value: todaysPoints.toLocaleString(),
            sub: `Avg: ${totalUsers > 0 ? (todaysPoints / totalUsers).toFixed(1) : 0} / user`,
            icon: Target,
            bg: "bg-[#F4C430]",
            valueColor: "text-[#7A1E1E]",
            titleColor: "text-[#7A1E1E]/80",
            subColor: "text-[#7A1E1E]/70",
            iconBg: "bg-[#7A1E1E]/10",
            iconColor: "text-[#7A1E1E]",
        },
        {
            title: "Water Dispensed",
            value: waterDispensedMl >= 1000 ? `${(waterDispensedMl / 1000).toLocaleString()} L` : `${waterDispensedMl.toLocaleString()} ml`,
            sub: `${totalRedeemed.toLocaleString()} pts redeemed`,
            icon: Droplet,
            bg: "bg-[#3B82F6]",
            valueColor: "text-white",
            titleColor: "text-white/80",
            subColor: "text-white/70",
            iconBg: "bg-white/20",
            iconColor: "text-white",
        },
        {
            title: "Machine Health",
            value: `${machineHealth}%`,
            sub: `${healthyMachines}/${allMachines} online`,
            icon: Activity,
            bg: machineHealth > 80 ? "bg-[#16A34A]" : "bg-[#DC2626]",
            valueColor: "text-white",
            titleColor: "text-white/80",
            subColor: "text-white/70",
            iconBg: "bg-white/20",
            iconColor: "text-white",
        },
    ];

    // Waste material cards — separated with distinct colors matching the mobile app
    const wasteCards = [
        {
            title: "Plastic Bottles",
            value: bottles.toLocaleString(),
            sub: "collected",
            icon: "🍾",
            bg: "bg-[#16A34A]",
            valueColor: "text-white",
            titleColor: "text-white/90",
            iconBg: "bg-white/20",
        },
        {
            title: "Plastic Cups",
            value: cups.toLocaleString(),
            sub: "collected",
            icon: "🥤",
            bg: "bg-[#F59E0B]",
            valueColor: "text-white",
            titleColor: "text-white/90",
            iconBg: "bg-white/20",
        },
        {
            title: "Module Paper",
            value: paper.toLocaleString(),
            sub: "collected",
            icon: "📄",
            bg: "bg-[#3B82F6]",
            valueColor: "text-white",
            titleColor: "text-white/90",
            iconBg: "bg-white/20",
        },
    ];

    const medalStyles = [
        "bg-[#F4C430] text-amber-900 border border-yellow-500", // Gold
        "bg-gray-300 text-gray-800 border border-gray-400", // Silver
        "bg-amber-600 text-amber-100 border border-amber-700", // Bronze
        "bg-gray-100 text-gray-500 border border-gray-200",
        "bg-gray-100 text-gray-500 border border-gray-200",
    ];

    const totalItems = bottles + cups + paper;

    return (
        <div className="space-y-5">
            {/* Header + Quick Insights */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-[#111827]">Dashboard Overview</h2>
                    <p className="text-[13px] text-[#6B7280]">Monitor recycling performance at a glance.</p>
                </div>
                {/* Quick Insights Strip */}
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 shadow-sm">
                        <div className="h-2 w-2 rounded-full bg-[#F4C430]" />
                        <span className="text-[12px] font-bold text-gray-500 uppercase tracking-wider">Avg pts/user</span>
                        <span className="text-[15px] font-black text-[#111827]">
                            {totalUsers > 0 ? (todaysPoints / totalUsers).toFixed(1) : "0"}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 shadow-sm">
                        <div className="h-2 w-2 rounded-full bg-[#16A34A]" />
                        <span className="text-[12px] font-bold text-gray-500 uppercase tracking-wider">Total Recycled</span>
                        <span className="text-[15px] font-black text-[#111827]">{(bottles + cups + paper).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 shadow-sm">
                        <div className={`h-2 w-2 rounded-full ${machineHealth > 80 ? "bg-[#16A34A]" : "bg-[#DC2626]"}`} />
                        <span className="text-[12px] font-bold text-gray-500 uppercase tracking-wider">Machine Uptime</span>
                        <span className={`text-[15px] font-black ${machineHealth > 80 ? "text-[#16A34A]" : "text-[#DC2626]"}`}>{machineHealth}%</span>
                    </div>
                </div>
            </div>

            {/* Stats Grid — 4 columns */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {statCards.map((card, i) => {
                    const Icon = card.icon;
                    return (
                        <div
                            key={i}
                            className={`group relative overflow-hidden rounded-xl ${card.bg} p-4 shadow-md transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5`}
                        >
                            <div className="relative flex items-center justify-between">
                                <div>
                                    <p className={`text-[11px] font-bold uppercase tracking-widest ${card.titleColor}`}>{card.title}</p>
                                    <p className={`mt-1 text-[22px] font-black leading-none ${card.valueColor}`}>{card.value}</p>
                                    <p className={`mt-1 text-[11px] font-medium ${card.subColor}`}>{card.sub}</p>
                                </div>
                                <div className={`rounded-xl p-2.5 ${card.iconBg} backdrop-blur-sm`}>
                                    <Icon className={`h-5 w-5 ${card.iconColor}`} />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Waste Materials — Integrated horizontal ticker */}
            <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                        <div className="rounded-lg bg-[#7A1E1E]/10 p-1.5">
                            <Recycle className="h-3.5 w-3.5 text-[#7A1E1E]" />
                        </div>
                        <h3 className="text-sm font-bold text-[#111827]">Materials Collected</h3>
                        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-bold text-gray-500">{totalItems.toLocaleString()} items total</span>
                    </div>
                    {/* Progress bar showing material breakdown */}
                    {totalItems > 0 && (
                        <div className="flex items-center gap-3 text-[11px] font-bold text-gray-500">
                            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-[#16A34A]" />Bottles {Math.round((bottles / totalItems) * 100)}%</span>
                            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-[#F59E0B]" />Cups {Math.round((cups / totalItems) * 100)}%</span>
                            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-[#3B82F6]" />Paper {Math.round((paper / totalItems) * 100)}%</span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-3 mb-3">
                    {totalItems > 0 && (
                        <div className="flex h-2 w-full overflow-hidden rounded-full bg-gray-100">
                            <div className="h-full bg-[#16A34A] transition-all" style={{ width: `${(bottles / totalItems) * 100}%` }} />
                            <div className="h-full bg-[#F59E0B] transition-all" style={{ width: `${(cups / totalItems) * 100}%` }} />
                            <div className="h-full bg-[#3B82F6] transition-all" style={{ width: `${(paper / totalItems) * 100}%` }} />
                        </div>
                    )}
                </div>
                <div className="grid grid-cols-3 gap-3">
                    {wasteCards.map((card, i) => (
                        <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${card.bg} shadow-sm`}>
                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${card.iconBg} text-lg`}>
                                {card.icon}
                            </div>
                            <div className="min-w-0">
                                <p className={`text-[20px] font-black leading-none ${card.valueColor}`}>{card.value}</p>
                                <p className={`mt-0.5 text-[11px] font-bold ${card.titleColor} uppercase truncate`}>{card.title}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Chart + Leaderboard Row */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                {/* Chart */}
                <div className="col-span-2 overflow-hidden rounded-xl border border-gray-200 border-l-4 border-l-[#7A1E1E] bg-white p-5 shadow-sm">
                    <div className="mb-1 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="rounded-lg bg-[#7A1E1E]/10 p-1.5">
                                <TrendingUp className="h-4 w-4 text-[#7A1E1E]" />
                            </div>
                            <h3 className="text-base font-bold text-[#111827]">Daily Point Generation</h3>
                        </div>
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-[12px] font-semibold text-gray-600 border border-gray-200">
                            Last 7 days
                        </span>
                    </div>
                    <DashboardCharts chartData={chartData} />
                </div>

                {/* Leaderboard */}
                <div className="overflow-hidden rounded-xl border border-gray-200 border-l-4 border-l-[#F4C430] bg-white p-5 shadow-sm">
                    <h3 className="text-base font-bold text-[#111827]">Top Courses</h3>
                    <p className="mb-4 text-[12px] text-[#6B7280]">Ranked by recycling points</p>
                    <div className="space-y-2">
                        {leaderboard.map((course, idx: number) => (
                            <div key={course.course} className="flex items-center gap-2.5 rounded-lg bg-gray-50 px-3 py-2.5 border border-gray-100">
                                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-black shadow-sm ${medalStyles[idx] || "bg-gray-100 text-gray-500 border-gray-200"}`}>
                                    {idx + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-bold text-[#111827] truncate">{course.course}</p>
                                    <div className="mt-1 h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-[#7A1E1E] transition-all duration-500"
                                            style={{ width: `${(course.points / maxPoints) * 100}%` }}
                                        />
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-[13px] font-black text-[#7A1E1E]">{course.points}</p>
                                    <p className="text-[11px] font-medium text-[#6B7280]">{course.items} items</p>
                                </div>
                            </div>
                        ))}
                        {leaderboard.length === 0 && (
                            <p className="py-4 text-center text-sm text-gray-400">No data yet</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

