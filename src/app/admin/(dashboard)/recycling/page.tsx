import prisma from "@/lib/prisma";
import { Leaf, Package, Wind } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RecyclingPage() {
    const logs = await prisma.recyclingLog.findMany({
        orderBy: { createdAt: "desc" },
        include: { user: { select: { email: true, fullName: true, course: true } } },
    });

    const walkInCount = logs.filter(l => l.isWalkIn).length;

    const totalItems = logs.reduce((s, l) => s + l.count, 0);
    const totalPts = logs.reduce((s, l) => s + Number(l.pointsEarned), 0);
    const co2Saved = (totalItems * 0.03).toFixed(1);

    const summaryCards = [
        {
            title: "Points Earned",
            value: totalPts.toFixed(1).replace(/\.0$/, ''),
            sub: "Total recycling reward",
            icon: Leaf,
            bg: "bg-white",
            iconBg: "bg-emerald-50",
            iconColor: "text-emerald-600",
            valueColor: "text-emerald-600",
            titleColor: "text-gray-400",
            subColor: "text-gray-500",
        },
        {
            title: "Walk-ins",
            value: walkInCount.toLocaleString(),
            sub: "No app used",
            icon: Package,
            bg: "bg-white",
            iconBg: "bg-blue-50",
            iconColor: "text-blue-600",
            valueColor: "text-blue-600",
            titleColor: "text-gray-400",
            subColor: "text-gray-500",
        },
        {
            title: "CO₂ Impact",
            value: `${co2Saved} kg`,
            sub: "Estimated emission save",
            icon: Wind,
            bg: "bg-white",
            iconBg: "bg-sky-50",
            iconColor: "text-sky-600",
            valueColor: "text-sky-600",
            titleColor: "text-gray-400",
            subColor: "text-gray-500",
        },
    ];

    const formatDateHeader = (date: Date) => {
        const now = new Date();
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        now.setHours(0, 0, 0, 0);
        const diff = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
        if (diff === 0) return "Today";
        if (diff === 1) return "Yesterday";
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    };

    const formatTime = (date: Date) =>
        date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

    const groupedLogs = logs.reduce((acc: Record<string, typeof logs>, log) => {
        const key = formatDateHeader(log.createdAt);
        if (!acc[key]) acc[key] = [];
        acc[key].push(log);
        return acc;
    }, {});

    const materialStyles: Record<string, { icon: string; bg: string; text: string }> = {
        BOTTLE: { icon: "🍾", bg: "bg-emerald-50", text: "text-emerald-600" },
        CUP: { icon: "🥤", bg: "bg-blue-50", text: "text-blue-600" },
        PAPER: { icon: "📄", bg: "bg-gray-50", text: "text-gray-600" },
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-bold text-gray-900">Recycling Monitoring</h2>
                <p className="mt-1 text-base text-gray-400">
                    Real-time environmental impact and recovery tracking.
                </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
                {summaryCards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <div key={card.title} className={`group relative overflow-hidden rounded-2xl ${card.bg} p-5 shadow-md transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5`}>
                            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 transition-transform duration-500 group-hover:scale-125" />
                            <div className="relative flex items-start justify-between">
                                <div>
                                    <p className={`text-[13px] font-bold uppercase tracking-wider ${card.titleColor}`}>{card.title}</p>
                                    <p className={`mt-2 text-3xl font-black ${card.valueColor}`}>{card.value}</p>
                                    <p className={`mt-1 text-[13px] font-medium ${card.subColor}`}>{card.sub}</p>
                                </div>
                                <div className={`rounded-xl p-2.5 ${card.iconBg} backdrop-blur-sm transition-transform duration-300 group-hover:scale-110`}>
                                    <Icon className={`h-5 w-5 ${card.iconColor}`} />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Grouped Logs */}
            <div className="space-y-6">
                {Object.entries(groupedLogs).map(([date, items]) => (
                    <div key={date} className="space-y-3">
                        <div className="flex items-center gap-4">
                            <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-gray-400">{date}</h3>
                            <div className="h-px flex-1 bg-gray-100" />
                        </div>
                        <div className="overflow-hidden rounded-[24px] border border-gray-100 bg-white shadow-sm divide-y divide-gray-50">
                            {items.map((item) => (
                                <div key={item.id} className="group flex items-center justify-between px-6 py-4 transition-all hover:bg-gray-50/50">
                                    <div className="flex items-center gap-5">
                                        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${materialStyles[item.materialType]?.bg} text-2xl shadow-sm transition-transform group-hover:scale-110`}>
                                            {materialStyles[item.materialType]?.icon}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center gap-2">
                                                <p className="text-[15px] font-black text-gray-900">
                                                    {item.isWalkIn ? "Walk-in / Unknown" : (item.user?.fullName || item.user?.email || "Unknown")}
                                                </p>
                                                {item.isWalkIn && (
                                                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-600">
                                                        No App
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${materialStyles[item.materialType]?.text} bg-white border border-current opacity-70`}>
                                                    {item.materialType}
                                                </span>
                                            </div>
                                            </div>
                                            <p className="mt-1 text-[12px] font-bold text-gray-400">
                                                {formatTime(item.createdAt)} • {item.count} item{item.count !== 1 ? 's' : ''} •{" "}
                                                {item.isWalkIn
                                                    ? `${Number(item.waterDispensed ?? 0).toFixed(0)}ml dispensed`
                                                    : item.user?.course || "Student"
                                                }
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-8">
                                        <div className="text-right">
                                            <p className="text-[18px] font-black text-emerald-600 tracking-tight">+{Number(item.pointsEarned).toFixed(1).replace(/\.0$/, '')}</p>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Points earned</p>
                                        </div>
                                        <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${
                                            item.status === "SUCCESS" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                                        }`}>
                                            <div className={`h-1.5 w-1.5 rounded-full ${item.status === "SUCCESS" ? "bg-emerald-500" : "bg-red-500"} animate-pulse`} />
                                            {item.status}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
