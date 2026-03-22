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

    const url = "/api/user-transactions";
    const { data, loading } = useCachedFetch<TransactionData>(url);

    const balance = user?.balance || 0;
    const stats = data?.stats;
    const totalRecycled = stats?.totalRecycledItems || 0;
    const totalRedeemedMl = (stats?.totalRedeemed || 0) * 100;
    const totalEarnedPts = stats?.totalEarned || 0;

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

    return (
        <div className="flex-1 overflow-y-auto pb-8 w-full h-full bg-slate-50 dark:bg-zinc-950">
            <header className="sticky top-0 z-10 bg-white/90 dark:bg-zinc-900/95 backdrop-blur-md border-b border-gray-100 dark:border-zinc-800/80">
                <div className="px-5 py-4 flex items-center justify-between">
                    <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Transaction History</h1>
                    <div className="size-10 rounded-2xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-500 shadow-inner">
                        <span className="material-symbols-outlined text-[22px]">history_edu</span>
                    </div>
                </div>
            </header>

            <main className="px-5 py-6 space-y-6">
                {/* Stats Summary Card */}
                <div className="bg-gradient-to-br from-primary to-green-800 rounded-[2.5rem] p-6 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-8 -translate-y-8">
                        <span className="material-symbols-outlined text-[160px]">eco</span>
                    </div>
                    
                    <p className="text-green-100 text-xs font-bold uppercase tracking-widest mb-1">Your Balance</p>
                    <div className="flex items-baseline gap-1 mb-6">
                        <h2 className="text-4xl font-extrabold tracking-tighter">{balance}</h2>
                        <span className="text-lg font-bold opacity-80"> Pts</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t border-white/20 pt-5">
                        <div className="space-y-1">
                            <p className="text-[10px] uppercase font-bold text-green-200 tracking-wider">Recycled</p>
                            <p className="text-lg font-extrabold">{totalRecycled} <span className="text-xs opacity-75">Items</span></p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] uppercase font-bold text-green-200 tracking-wider">Used</p>
                            <p className="text-lg font-extrabold">{totalRedeemedMl} <span className="text-xs opacity-75">ml</span></p>
                        </div>
                    </div>
                </div>

                {/* Transaction List */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <span className="material-symbols-outlined animate-spin text-primary text-4xl">refresh</span>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Loading records...</p>
                    </div>
                ) : Object.keys(groupedTransactions).length > 0 ? (
                    Object.entries(groupedTransactions).map(([dateLabel, txs]) => (
                        <div key={dateLabel} className="space-y-3">
                            <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.15em] mb-2 px-1">{dateLabel}</h3>
                            <div className="space-y-2.5">
                                {txs.map(tx => (
                                    <div key={tx.id} className="bg-white dark:bg-zinc-900 rounded-3xl p-4 shadow-sm border border-slate-100 dark:border-zinc-800/60 flex items-center justify-between hover:border-primary/20 transition-all active:scale-[0.98]">
                                        <div className="flex items-center gap-3">
                                            <div className={`size-12 rounded-2xl flex items-center justify-center shrink-0 border ${tx.type === "EARN"
                                                    ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/30"
                                                    : "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800/30"
                                                }`}>
                                                <span className="material-symbols-outlined text-2xl">
                                                    {tx.type === "EARN" ? "recycling" : "local_drink"}
                                                </span>
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900 dark:text-gray-100 text-[14px] tracking-tight">
                                                    {tx.type === "EARN"
                                                        ? `${tx.materialType || 'Deposit'} Recycle`
                                                        : 'Water Withdrawal'}
                                                </h4>
                                                <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mt-0.5 uppercase tracking-wide">
                                                    {formatTime(tx.createdAt)}
                                                    {tx.count ? ` • ${tx.count} items` : ''}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className={`block font-extrabold text-[15px] tracking-tight ${tx.type === "EARN"
                                                    ? "text-emerald-600 dark:text-emerald-500"
                                                    : "text-rose-500"
                                                }`}>
                                                {tx.type === "EARN" ? "+" : "-"}{tx.amount}
                                                <span className="text-[10px] ml-0.5 opacity-80 uppercase tracking-tighter">pts</span>
                                            </span>
                                            {tx.type === "REDEEM" && (
                                                <span className="block text-[10px] font-black text-slate-300 dark:text-slate-600 mt-0.5 uppercase tracking-widest">
                                                    {tx.amount * 100}ML
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
