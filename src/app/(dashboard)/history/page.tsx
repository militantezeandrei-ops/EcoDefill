"use client";

import { useAuth } from "@/hooks/useAuth";
import { useCachedFetch } from "@/hooks/useCachedFetch";

interface Transaction {
    id: string;
    type: string;
    amount: number;
    materialType: string | null;
    count: number | null;
    status: string;
    createdAt: string;
}

interface TransactionData {
    transactions: Transaction[];
    stats: {
        totalEarned: number;
        totalRedeemed: number;
        totalRecycledItems: number;
    };
}

export default function HistoryPage() {
    const { user } = useAuth();
    const { data, loading } = useCachedFetch<TransactionData>("/api/user-transactions");

    const balance = user?.balance || 0;
    const stats = data?.stats;
    const totalRecycled = stats?.totalRecycledItems || 0;
    const totalRedeemedMl = (stats?.totalRedeemed || 0) * 100;

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const isYesterday = date.toDateString() === yesterday.toDateString();
        if (isToday) return "Today";
        if (isYesterday) return "Yesterday";
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    };

    const formatTime = (dateStr: string) =>
        new Date(dateStr).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

    const groupedTransactions: Record<string, Transaction[]> = {};
    if (data?.transactions) {
        for (const tx of data.transactions) {
            const dateKey = formatDate(tx.createdAt);
            if (!groupedTransactions[dateKey]) groupedTransactions[dateKey] = [];
            groupedTransactions[dateKey].push(tx);
        }
    }

    return (
        <div className="flex-1 overflow-y-auto pb-32">
            {/* Page Header */}
            <div className="px-4 pb-4 pt-[calc(var(--safe-top)+56px)]">
                <h1 className="text-2xl font-black text-slate-900">History</h1>
                <p className="mt-0.5 text-sm text-slate-400">Your recycling &amp; redeem activity</p>
            </div>

            {/* Stats Hero */}
            <div className="mx-4 mb-5 overflow-hidden rounded-[24px] bg-gradient-to-br from-emerald-500 to-teal-700 p-5 text-white shadow-[0_12px_32px_rgba(5,150,105,0.35)]">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100/80">Current Balance</p>
                <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-4xl font-black tracking-tight">{balance}</span>
                    <span className="text-sm font-black text-emerald-200">pts</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/15 pt-4">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-200">Recycled</p>
                        <p className="mt-1 text-lg font-black">{totalRecycled} items</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-200">Water Used</p>
                        <p className="mt-1 text-lg font-black">{totalRedeemedMl} ml</p>
                    </div>
                </div>
            </div>

            {/* Transactions */}
            <div className="px-4 space-y-5">
                {loading ? (
                    <div className="app-card p-0 overflow-hidden divide-y divide-slate-100">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                                <div className="shimmer h-10 w-10 rounded-xl" />
                                <div className="flex-1 space-y-2">
                                    <div className="shimmer h-3 w-3/4 rounded" />
                                    <div className="shimmer h-2.5 w-1/2 rounded" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : Object.keys(groupedTransactions).length > 0 ? (
                    Object.entries(groupedTransactions).map(([dateLabel, txs]) => (
                        <section key={dateLabel}>
                            <h2 className="app-section-title">{dateLabel}</h2>
                            <div className="app-card p-0 overflow-hidden divide-y divide-slate-100">
                                {txs.map((tx) => (
                                    <div key={tx.id} className="flex items-center justify-between px-4 py-3.5 active:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tx.type === "EARN" ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"}`}>
                                                <span className="material-symbols-outlined text-[20px]">
                                                    {tx.type === "EARN" ? "recycling" : "local_drink"}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-800">
                                                    {tx.type === "EARN" ? `${tx.materialType || "Deposit"} recycle` : "Water withdrawal"}
                                                </p>
                                                <p className="mt-0.5 text-[11px] text-slate-400">
                                                    {formatTime(tx.createdAt)}
                                                    {tx.count ? ` · ${tx.count} items` : ""}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-sm font-black ${tx.type === "EARN" ? "text-emerald-600" : "text-rose-500"}`}>
                                                {tx.type === "EARN" ? "+" : "-"}{tx.amount}
                                                <span className="ml-0.5 text-[10px] font-semibold">pts</span>
                                            </p>
                                            {tx.type === "REDEEM" && (
                                                <p className="text-[11px] text-slate-400">{tx.amount * 100}ml</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    ))
                ) : (
                    <div className="app-card flex flex-col items-center py-10 text-center">
                        <span className="material-symbols-outlined text-5xl text-slate-200">inbox</span>
                        <p className="mt-3 text-sm font-semibold text-slate-400">No transactions yet</p>
                        <p className="mt-1 text-xs text-slate-300">Start recycling to see activity here.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
