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
            gradient: "from-blue-500/10 to-indigo-500/5",
            iconBg: "bg-blue-500/10",
            iconColor: "text-blue-500",
        },
        {
            title: "Today's Points",
            value: todaysPoints.toLocaleString(),
            sub: `Avg: ${totalUsers > 0 ? (todaysPoints / totalUsers).toFixed(1) : 0} / user`,
            icon: Target,
            gradient: "from-emerald-500/10 to-green-500/5",
            iconBg: "bg-emerald-500/10",
            iconColor: "text-emerald-500",
        },
        {
            title: "Water Dispensed",
            value: `${waterDispensedMl.toLocaleString()} ml`,
            sub: `${totalRedeemed.toLocaleString()} pts redeemed`,
            icon: Droplet,
            gradient: "from-cyan-500/10 to-sky-500/5",
            iconBg: "bg-cyan-500/10",
            iconColor: "text-cyan-500",
        },
        {
            title: "Machine Health",
            value: `${machineHealth}%`,
            sub: `${healthyMachines}/${allMachines} online`,
            icon: Activity,
            gradient: "from-rose-500/10 to-pink-500/5",
            iconBg: "bg-rose-500/10",
            iconColor: "text-rose-500",
        },
    ];

    // Waste material cards — separated with distinct colors matching the mobile app
    const wasteCards = [
        {
            title: "Plastic Bottles",
            value: bottles.toLocaleString(),
            sub: "collected",
            icon: "🍾",
            gradient: "from-green-500/15 to-emerald-500/5",
            border: "border-green-200",
            valueColor: "text-green-700",
            iconBg: "bg-green-100",
        },
        {
            title: "Plastic Cups",
            value: cups.toLocaleString(),
            sub: "collected",
            icon: "🥤",
            gradient: "from-amber-500/15 to-orange-500/5",
            border: "border-amber-200",
            valueColor: "text-amber-700",
            iconBg: "bg-amber-100",
        },
        {
            title: "Module Paper",
            value: paper.toLocaleString(),
            sub: "collected",
            icon: "📄",
            gradient: "from-blue-500/15 to-sky-500/5",
            border: "border-blue-200",
            valueColor: "text-blue-700",
            iconBg: "bg-blue-100",
        },
    ];

    const medalStyles = [
        "bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-yellow-400/30",
        "bg-gradient-to-br from-gray-300 to-gray-400 text-white shadow-gray-400/30",
        "bg-gradient-to-br from-amber-600 to-amber-700 text-white shadow-amber-600/30",
        "bg-gray-100 text-gray-500",
        "bg-gray-100 text-gray-500",
    ];

    const totalItems = bottles + cups + paper;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
                <p className="mt-1 text-sm text-gray-400">
                    Monitor your recycling system performance at a glance.
                </p>
            </div>

            {/* Stats Grid — 4 columns */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {statCards.map((card, i) => {
                    const Icon = card.icon;
                    return (
                        <div
                            key={i}
                            className={`group relative overflow-hidden rounded-2xl border border-gray-100 bg-gradient-to-br ${card.gradient} p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5`}
                        >
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

            {/* Waste Materials — Separate Section */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                        <div className="rounded-lg bg-green-500/10 p-2">
                            <Recycle className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-gray-900">Waste Materials Collected</h3>
                            <p className="text-[11px] text-gray-400">{totalItems.toLocaleString()} total items recycled</p>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {wasteCards.map((card, i) => (
                        <div
                            key={i}
                            className={`group relative overflow-hidden rounded-2xl border ${card.border} bg-gradient-to-br ${card.gradient} p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5`}
                        >
                            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/20 transition-transform duration-500 group-hover:scale-150" />
                            <div className="relative">
                                <div className={`inline-flex items-center justify-center rounded-xl ${card.iconBg} p-3 text-2xl mb-3 transition-transform duration-300 group-hover:scale-110`}>
                                    {card.icon}
                                </div>
                                <p className={`text-3xl font-black ${card.valueColor}`}>{card.value}</p>
                                <p className="mt-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">{card.title}</p>
                                <p className="text-[11px] font-medium text-gray-400 mt-0.5">{card.sub}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Chart + Leaderboard Row */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Chart */}
                <div className="col-span-2 overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                    <div className="mb-1 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-emerald-500/10 p-2">
                                <TrendingUp className="h-4 w-4 text-emerald-500" />
                            </div>
                            <h3 className="text-base font-bold text-gray-900">Daily Point Generation</h3>
                        </div>
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-600 border border-emerald-100">
                            Last 7 days
                        </span>
                    </div>
                    <DashboardCharts chartData={chartData} />
                </div>

                {/* Leaderboard */}
                <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                    <h3 className="text-base font-bold text-gray-900">Top Courses</h3>
                    <p className="mb-5 text-[11px] text-gray-400">Ranked by recycling points</p>
                    <div className="space-y-3">
                        {leaderboard.map((course, idx: number) => (
                            <div key={course.course} className="group flex items-center gap-3 rounded-xl bg-gray-50/80 px-4 py-3 transition-all hover:bg-gray-100/80 hover:shadow-sm">
                                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black shadow-sm ${medalStyles[idx] || "bg-gray-100 text-gray-500"}`}>
                                    {idx + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-gray-800 truncate">{course.course}</p>
                                    <div className="mt-1.5 h-1.5 w-full rounded-full bg-gray-200/80 overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500"
                                            style={{ width: `${(course.points / maxPoints) * 100}%` }}
                                        />
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-sm font-black text-emerald-500">{course.points}</p>
                                    <p className="text-[10px] font-medium text-gray-400">{course.items} items</p>
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
