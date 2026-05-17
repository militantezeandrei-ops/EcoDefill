import Link from "next/link";
import prisma from "@/lib/prisma";
import { Users, Target, Droplet, Activity, TrendingUp, Recycle } from "lucide-react";
import DashboardCharts from "@/components/admin/DashboardCharts";
import { getCourseRanking } from "@/lib/course-ranking";
export default async function DashboardContent({ searchParams }: { searchParams: any }) {
    const filter = (searchParams?.filter as string) || "week";

    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const filterDate = new Date();
    if (filter === "today") {
        filterDate.setHours(0, 0, 0, 0);
    } else if (filter === "month") {
        filterDate.setDate(filterDate.getDate() - 30);
    } else {
        // week default
        filterDate.setDate(now.getDate() - 7);
    }
    filterDate.setHours(0, 0, 0, 0);

    const [
        totalUsers,
        todaysPointsAgg,
        totalRedemptionsAgg,
        bottlesAgg,
        cupsAgg,
        paperAgg,
        healthyMachines,
        allMachines,
        allRecentTransactions,
        latestFive,
        todaysRedeemsAgg,
        leaderboard,
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
            where: { createdAt: { gte: filterDate } },
            select: { amount: true, createdAt: true, type: true },
        }),
        prisma.transaction.findMany({
            take: 5,
            orderBy: { createdAt: "desc" },
            include: { user: { select: { fullName: true, email: true } } },
        }),
        prisma.transaction.aggregate({ 
            _sum: { amount: true }, 
            where: { type: "REDEEM", status: "SUCCESS", createdAt: { gte: today } } 
        }),
        getCourseRanking(),
    ]);

    const todaysPoints = Number(todaysPointsAgg._sum.amount || 0);
    const todaysRedeems = Number(todaysRedeemsAgg?._sum.amount || 0); // Added
    const totalRedeemed = Number(totalRedemptionsAgg._sum.amount || 0);
    const waterDispensedMl = totalRedeemed * 100;
    const bottles = bottlesAgg._sum.count || 0;
    const cups = cupsAgg._sum.count || 0;
    const paper = paperAgg._sum.count || 0;
    const machineHealth = allMachines > 0 ? Math.round((healthyMachines / allMachines) * 100) : 100;

    // Build chart data
    const days = filter === "today" 
    ? ["Morning", "Noon", "Afternoon"] 
    : filter === "month" 
        ? ["W1", "W2", "W3", "W4"] 
        : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
        
    const dailyPoints: Record<string, number> = {};
    const dailyRedeems: Record<string, number> = {};
    days.forEach((d) => (dailyPoints[d] = 0));
    days.forEach((d) => (dailyRedeems[d] = 0));

    allRecentTransactions.forEach((t: any) => {
        let label = "";
        if (filter === "today") {
            const h = t.createdAt.getHours();
            if (h < 12) label = "Morning";
            else if (h < 15) label = "Noon";
            else label = "Afternoon";
        } else if (filter === "month") {
            const date = t.createdAt.getDate();
            if (date <= 7) label = "W1";
            else if (date <= 14) label = "W2";
            else if (date <= 21) label = "W3";
            else label = "W4";
        } else {
            let idx = t.createdAt.getDay() - 1;
            if (idx === -1) idx = 6;
            label = days[idx];
        }
        
        if (t.type === "EARN") dailyPoints[label] += Number(t.amount || 0);
        else dailyRedeems[label] += Number(t.amount || 0);
    });
    const chartData = days.map((day) => ({ day, amount: dailyPoints[day] }));
    const redeemData = days.map((day) => ({ day, amount: dailyRedeems[day] }));

    const maxPoints = leaderboard[0]?.points || 1;

    const statCards = [
        {
            title: "Total Users",
            value: totalUsers.toLocaleString(),
            sub: "Registered students",
            icon: Users,
            bg: "bg-white",
            valueColor: "text-gray-900",
            titleColor: "text-gray-400",
            subColor: "text-gray-500",
            iconBg: "bg-blue-50",
            iconColor: "text-blue-600",
        },
        {
            title: "Today's Points",
            value: todaysPoints.toLocaleString(),
            sub: `Avg: ${totalUsers > 0 ? (todaysPoints / totalUsers).toFixed(1) : 0} / user`,
            icon: Target,
            bg: "bg-white",
            valueColor: "text-emerald-600",
            titleColor: "text-gray-400",
            subColor: "text-gray-500",
            iconBg: "bg-emerald-50",
            iconColor: "text-emerald-600",
        },
        {
            title: "Water Dispensed",
            value: waterDispensedMl >= 1000 ? `${(waterDispensedMl / 1000).toLocaleString()} L` : `${waterDispensedMl.toLocaleString()} ml`,
            sub: `${totalRedeemed.toLocaleString()} pts redeemed`,
            icon: Droplet,
            bg: "bg-white",
            valueColor: "text-blue-600",
            titleColor: "text-gray-400",
            subColor: "text-gray-500",
            iconBg: "bg-blue-50",
            iconColor: "text-blue-600",
        },
        {
            title: "Machine Health",
            value: `${machineHealth}%`,
            sub: `${healthyMachines}/${allMachines} online`,
            icon: Activity,
            bg: "bg-white",
            valueColor: machineHealth > 80 ? "text-emerald-600" : "text-red-600",
            titleColor: "text-gray-400",
            subColor: "text-gray-500",
            iconBg: machineHealth > 80 ? "bg-emerald-50" : "bg-red-50",
            iconColor: machineHealth > 80 ? "text-emerald-600" : "text-red-600",
        },
    ];

    // Waste material cards
    const wasteCards = [
        {
            title: "Plastic Bottles",
            value: bottles.toLocaleString(),
            sub: "collected",
            icon: "🍾",
            bg: "bg-emerald-50/50",
            valueColor: "text-emerald-700",
            titleColor: "text-emerald-600/80",
            iconBg: "bg-white shadow-sm",
        },
        {
            title: "Plastic Cups",
            value: cups.toLocaleString(),
            sub: "collected",
            icon: "🥤",
            bg: "bg-blue-50/50",
            valueColor: "text-blue-700",
            titleColor: "text-blue-600/80",
            iconBg: "bg-white shadow-sm",
        },
        {
            title: "Module Paper",
            value: paper.toLocaleString(),
            sub: "collected",
            icon: "📄",
            bg: "bg-gray-50",
            valueColor: "text-gray-700",
            titleColor: "text-gray-600/80",
            iconBg: "bg-white shadow-sm",
        },
    ];

    const medalStyles = [
        "bg-blue-600 text-white shadow-lg shadow-blue-600/20", // 1st
        "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20", // 2nd
        "bg-blue-100 text-blue-700", // 3rd
        "bg-gray-100 text-gray-500",
        "bg-gray-100 text-gray-500",
    ];

    const totalItems = bottles + cups + paper;

    return (
        <div className="space-y-6">
            {/* Header + Quick Insights */}
            <div className="flex items-center justify-between bg-white border border-gray-100 rounded-[20px] px-6 py-4 shadow-sm">
                <div>
                    <h2 className="text-[20px] font-black text-gray-900 tracking-tight flex items-center gap-2.5">
                        <Activity className="h-5 w-5 text-blue-600" />
                        Dashboard
                    </h2>
                </div>
                {/* Quick Insights Strip */}
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-2.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                        <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Avg pts/user</span>
                        <span className="text-[15px] font-black text-gray-900">
                            {totalUsers > 0 ? (todaysPoints / totalUsers).toFixed(1) : "0"}
                        </span>
                    </div>
                    <div className="h-4 w-px bg-gray-100" />
                    <div className="flex items-center gap-2.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Recycled</span>
                        <span className="text-[15px] font-black text-gray-900">{(bottles + cups + paper).toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Stats Grid — 4 columns (Very Compact) */}
            <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
                {statCards.map((card, i) => {
                    const Icon = card.icon;
                    return (
                        <div
                            key={i}
                            className={`group relative overflow-hidden rounded-[20px] ${card.bg} border border-gray-100 p-5 shadow-sm transition-all duration-300 hover:shadow-md`}
                        >
                            <div className="relative flex items-center justify-between">
                                <div>
                                    <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${card.titleColor}`}>{card.title}</p>
                                    <p className={`mt-2 text-[26px] font-black leading-none tracking-tight ${card.valueColor}`}>{card.value}</p>
                                    <p className={`mt-2 text-[12px] font-bold ${card.subColor}`}>{card.sub}</p>
                                </div>
                                <div className={`rounded-xl p-3 ${card.iconBg} shadow-sm group-hover:scale-105 transition-transform`}>
                                    <Icon className={`h-6 w-6 ${card.iconColor}`} />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Materials Breakdown (Compact Cards) */}
            <div className="grid grid-cols-3 gap-5">
                {wasteCards.map((card, i) => (
                    <div
                        key={i}
                        className={`group flex items-center gap-4 rounded-[20px] ${card.bg} border border-gray-100 p-4 shadow-sm transition-all hover:scale-[1.02]`}
                    >
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${card.iconBg} text-2xl shadow-sm`}>
                            {card.icon}
                        </div>
                        <div className="min-w-0">
                            <p className={`text-[24px] font-black leading-none tracking-tight ${card.valueColor}`}>{card.value}</p>
                            <p className={`mt-1.5 text-[11px] font-black ${card.titleColor} uppercase tracking-wider truncate`}>{card.title}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Data Grid: Row 1 (History + Ranking) */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                {/* Points History (1/3) */}
                <div className="overflow-hidden rounded-[20px] border border-gray-100 bg-white p-5 shadow-sm h-[380px] flex flex-col">
                    <div className="mb-5 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <TrendingUp className="h-5 w-5 text-emerald-600" />
                            <h3 className="text-[13px] font-black text-gray-900 tracking-tight uppercase">Points Earned</h3>
                        </div>
                        <div className="flex items-center gap-1 p-1 bg-gray-100/50 rounded-lg shrink-0">
                            {["today", "week", "month"].map((f) => (
                                <Link 
                                    key={f} 
                                    href={`/admin/dashboard?filter=${f}`}
                                    scroll={false}
                                    className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-md transition-all ${filter === f ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
                                >
                                    {f}
                                </Link>
                            ))}
                        </div>
                    </div>
                    <div className="flex-1 min-h-0">
                        <DashboardCharts chartData={chartData} color="#10b981" />
                    </div>
                </div>

                {/* Water Redeemed (1/3) */}
                <div className="overflow-hidden rounded-[20px] border border-gray-100 bg-white p-5 shadow-sm h-[380px] flex flex-col">
                    <div className="mb-5 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <Droplet className="h-5 w-5 text-blue-600" />
                            <h3 className="text-[13px] font-black text-gray-900 tracking-tight uppercase">Water Redeemed</h3>
                        </div>
                        <div className="px-2 py-1 bg-blue-50 rounded-lg">
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{filter}</span>
                        </div>
                    </div>
                    <div className="flex-1 min-h-0">
                        <DashboardCharts chartData={redeemData} color="#3b82f6" />
                    </div>
                </div>

                {/* Academic Ranking (1/3) */}
                <div className="overflow-hidden rounded-[20px] border border-gray-100 bg-white p-5 shadow-sm h-[380px] flex flex-col">
                    <h3 className="text-[13px] font-black text-gray-900 tracking-tight flex items-center gap-2.5 mb-5 uppercase">
                        <Users className="h-5 w-5 text-blue-600" />
                        Academic Ranking
                    </h3>
                    <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                        {leaderboard.map((course, idx: number) => (
                            <div key={idx} className="flex items-center gap-3.5 rounded-xl p-2.5 hover:bg-gray-50/80 transition-all">
                                <span className="w-7 text-[12px] font-black text-gray-400">#{idx+1}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center gap-3 mb-1.5">
                                        <span className="text-[13px] font-black text-gray-700 truncate">{course.course}</span>
                                        <span className="shrink-0 text-[12px] font-bold text-blue-600">{course.points.toFixed(1).replace(/\.0$/, '')} pts</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(course.points / maxPoints) * 100}%` }} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Data Grid: Row 2 (Transactions + Cycle) */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                {/* Recent Transaction (2/3) */}
                <div className="lg:col-span-2 overflow-hidden rounded-[20px] border border-gray-100 bg-white p-5 shadow-sm h-[380px] flex flex-col">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-[14px] font-black text-gray-900 tracking-tight uppercase">Recent Transactions</h3>
                        <Link href="/admin/transactions" className="text-[11px] font-black text-blue-600 uppercase hover:underline">Full Log</Link>
                    </div>
                    <div className="space-y-2 overflow-auto flex-1 pr-1 custom-scrollbar">
                        {/* Table Header */}
                        <div className="flex min-w-[760px] items-center px-4 py-2.5 text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] border-b border-gray-50 mb-1">
                            <span className="w-[30%]">User Identity</span>
                            <span className="w-[15%]">Action</span>
                            <span className="w-[20%]">Date</span>
                            <span className="w-[20%]">Timestamp</span>
                            <span className="w-[15%] text-right">Credit</span>
                        </div>
                        {latestFive.map((tx: any) => (
                            <div key={tx.id} className="flex min-w-[760px] items-center justify-between rounded-xl bg-gray-50/50 border border-gray-50 px-3.5 py-3 transition-all hover:bg-white hover:border-gray-100">
                                <div className="flex items-center gap-3 w-[30%] min-w-0">
                                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[12px] ${tx.type === "EARN" ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600"}`}>
                                       {tx.type === "EARN" ? "♻️" : "💧"}
                                    </div>
                                    <p className="truncate text-[13px] font-black leading-tight text-gray-900">{tx.user?.fullName || tx.user?.email || "Unknown"}</p>
                                </div>
                                <span className={`w-[15%] text-[11px] font-black uppercase tracking-widest ${tx.type === "EARN" ? "text-emerald-500" : "text-blue-500"}`}>
                                    {tx.type}
                                </span>
                                <span className="w-[20%] text-[11px] font-bold text-gray-400 uppercase">
                                    {new Date(tx.createdAt).toLocaleDateString([], { month: 'short', day: '2-digit' })}
                                </span>
                                <span className="w-[20%] text-[11px] font-bold text-gray-400 uppercase tracking-tight">
                                    {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <p className={`w-[15%] text-right text-[14px] font-black ${tx.type === "EARN" ? "text-emerald-600" : "text-blue-600"}`}>
                                    {tx.type === "EARN" ? "+" : "-"}{Number(tx.amount).toFixed(1).replace(/\.0$/, '')}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Today's Cycle Chart (1/3) */}
                <div className="overflow-hidden rounded-[20px] border border-gray-100 bg-white p-5 shadow-sm h-[380px] relative flex flex-col">
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="flex flex-col">
                                <p className="text-[18px] font-black text-gray-900">Today&apos;s Cycle</p>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] leading-none mt-1">Pts status</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[16px] font-black text-emerald-600">{(todaysPoints - todaysRedeems).toLocaleString()}</p>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mt-1">Net Flow</p>
                        </div>
                    </div>

                    {/* Donut Chart Implementation */}
                    <div className="mt-4 flex justify-center items-center h-[120px]">
                        <svg viewBox="0 0 100 100" className="h-full transform -rotate-90">
                            {/* Base Circle */}
                            <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f3f4f6" strokeWidth="12" />
                            {/* Earn Stroke */}
                            <circle 
                                cx="50" cy="50" r="40" fill="transparent" stroke="#10b981" strokeWidth="12" 
                                strokeDasharray={`${(todaysPoints / Math.max(todaysPoints + todaysRedeems, 1)) * 251.2} 251.2`} 
                                className="transition-all duration-1000"
                            />
                            {/* Redeem Stroke */}
                            <circle 
                                cx="50" cy="50" r="40" fill="transparent" stroke="#3b82f6" strokeWidth="12" 
                                strokeDasharray={`${(todaysRedeems / Math.max(todaysPoints + todaysRedeems, 1)) * 251.2} 251.2`}
                                strokeDashoffset={`${-(todaysPoints / Math.max(todaysPoints + todaysRedeems, 1)) * 251.2}`}
                                className="transition-all duration-1000"
                            />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                            <p className="text-[18px] font-black text-gray-900">{Math.round((todaysPoints / Math.max(todaysPoints + todaysRedeems, 1)) * 100)}%</p>
                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Growth</p>
                        </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-4 border-t border-gray-50 pt-4">
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-emerald-500" />
                            <div>
                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Earned</p>
                                <p className="text-[13px] font-black text-emerald-600">+{todaysPoints.toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-blue-500" />
                            <div>
                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Redeems</p>
                                <p className="text-[13px] font-black text-blue-600">-{todaysRedeems.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
 
