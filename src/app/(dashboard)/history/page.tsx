"use client";

import { useState } from "react";
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

type FilterType = "all" | "EARN" | "REDEEM";

export default function HistoryPage() {
    const { user } = useAuth();
    const [filter, setFilter] = useState<FilterType>("all");

    const url = filter === "all" ? "/api/user-transactions" : `/api/user-transactions?type=${filter}`;
    const { data, loading } = useCachedFetch<TransactionData>(url);

    const balance = user?.balance || 0;
    const totalRecycled = data?.stats?.totalRecycledItems || 0;
    const totalRedeemed = data?.stats?.totalRedeemed || 0;

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const isYesterday = date.toDateString() === yesterday.toDateString();

        if (isToday) return "Today";
        if (isYesterday) return "Yesterday";
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const formatTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    // Group transactions by date
    const groupedTransactions: Record<string, Transaction[]> = {};
    if (data?.transactions) {
        for (const tx of data.transactions) {
            const dateKey = formatDate(tx.createdAt);
            if (!groupedTransactions[dateKey]) groupedTransactions[dateKey] = [];
            groupedTransactions[dateKey].push(tx);
        }
    }

    const filters: { label: string; value: FilterType }[] = [
        { label: "All Activity", value: "all" },
        { label: "Earned", value: "EARN" },
        { label: "Redeemed", value: "REDEEM" },
    ];

    return (
        <div className="flex-1 overflow-y-auto pb-8 w-full h-full">
            <header className="sticky top-0 z-10 bg-white/95 dark:bg-[#0a0c10]/95 backdrop-blur-md border-b border-gray-100 dark:border-zinc-800/80">
                <div className="px-5 py-3 flex items-center justify-between">
                    <h1 className="text-xl font-bold tracking-tight text-primary dark:text-green-500">Transactions</h1>
                    <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-slate-300 transition-colors">
                        <span className="material-symbols-outlined">filter_list</span>
                    </button>
                </div>

                <div className="px-5 pb-3 pt-1 overflow-x-auto hide-scrollbar flex gap-2">
                    {filters.map(item => (
                        <button
                            key={item.value}
                            onClick={() => setFilter(item.value)}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filter === item.value
                                ? "bg-primary text-white shadow-sm"
                                : "bg-white dark:bg-[#111827] border border-gray-200 dark:border-zinc-800/80 text-slate-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:border-zinc-700 hover:dark:text-white"
                                }`}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            </header>

            <main className="px-5 py-6 space-y-6">
                {/* Stats Card */}
                <div className="bg-gradient-to-br from-primary to-green-800 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-4 -translate-y-4">
                        <span className="material-symbols-outlined text-[120px]">water_drop</span>
                    </div>
                    <p className="text-green-100 text-sm font-medium mb-1">Current Balance</p>
                    <div className="flex items-baseline gap-1 mb-4">
                        <h2 className="text-4xl font-bold">{balance}</h2>
                        <span className="text-lg font-medium opacity-80">pts</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t border-white/20 pt-4">
                        <div>
                            <p className="text-xs text-green-100 mb-0.5">Total Recycled</p>
                            <p className="text-lg font-semibold">{totalRecycled} Items</p>
                        </div>
                        <div>
                            <p className="text-xs text-green-100 mb-0.5">Water Redeemed</p>
                            <p className="text-lg font-semibold">{totalRedeemed * 100}ml</p>
                        </div>
                    </div>
                </div>

                {/* Transaction List */}
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <span className="material-symbols-outlined animate-spin text-primary text-4xl">refresh</span>
                    </div>
                ) : Object.keys(groupedTransactions).length > 0 ? (
                    Object.entries(groupedTransactions).map(([dateLabel, txs]) => (
                        <div key={dateLabel}>
                            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 ml-1">{dateLabel}</h3>
                            <div className="space-y-2.5">
                                {txs.map(tx => (
                                    <div key={tx.id} className="bg-white dark:bg-[#111827] rounded-2xl p-4 shadow-[0_2px_15px_rgb(0,0,0,0.03)] dark:shadow-none border border-slate-100 dark:border-zinc-800/80 flex items-center justify-between hover:border-slate-200 dark:hover:border-zinc-700 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={`h-11 w-11 rounded-full flex items-center justify-center shrink-0 ${tx.type === "EARN"
                                                    ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                                                    : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                                                }`}>
                                                <span className="material-symbols-outlined">
                                                    {tx.type === "EARN" ? "recycling" : "water_drop"}
                                                </span>
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-slate-900 dark:text-gray-100 text-sm">
                                                    {tx.type === "EARN"
                                                        ? `${tx.materialType || 'Material'} Recycle`
                                                        : 'Water Refill'}
                                                </h4>
                                                <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                                                    {formatTime(tx.createdAt)}
                                                    {tx.count ? ` • ${tx.count} items` : ''}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className={`block font-bold text-sm ${tx.type === "EARN"
                                                    ? "text-green-600 dark:text-green-500"
                                                    : "text-red-500"
                                                }`}>
                                                {tx.type === "EARN" ? "+" : "-"}{tx.amount} pts
                                            </span>
                                            {tx.type === "REDEEM" && (
                                                <span className="block text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                                                    {tx.amount * 100}ml
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600 mb-3">receipt_long</span>
                        <p className="text-slate-500 dark:text-slate-400 font-semibold">No transactions yet</p>
                        <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Start recycling to see your activity here!</p>
                    </div>
                )}
            </main>
        </div>
    );
}
