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
        <div className="flex-1 overflow-y-auto bg-transparent pb-8">
            <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/92 px-5 py-4 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/92">
                <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Transaction History</h1>
                <p className="text-sm text-slate-500">Track recycle and redeem activity</p>
            </header>

            <main className="space-y-5 px-4 py-5">
                <section className="rounded-3xl bg-gradient-to-br from-primary to-emerald-700 p-5 text-white shadow-[0_20px_40px_rgba(47,127,51,0.35)]">
                    <p className="text-xs uppercase tracking-[0.14em] text-emerald-100">Current Balance</p>
                    <p className="mt-2 text-4xl font-bold leading-none">{balance} <span className="text-lg font-medium text-emerald-100">pts</span></p>
                    <div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/20 pt-4">
                        <div>
                            <p className="text-xs text-emerald-100">Recycled</p>
                            <p className="mt-1 text-lg font-semibold">{totalRecycled} items</p>
                        </div>
                        <div>
                            <p className="text-xs text-emerald-100">Water Used</p>
                            <p className="mt-1 text-lg font-semibold">{totalRedeemedMl}ml</p>
                        </div>
                    </div>
                </section>

                {loading ? (
                    <div className="space-y-2.5">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-200/60 dark:bg-zinc-800" />
                        ))}
                    </div>
                ) : Object.keys(groupedTransactions).length > 0 ? (
                    Object.entries(groupedTransactions).map(([dateLabel, txs]) => (
                        <section key={dateLabel} className="space-y-2.5">
                            <h2 className="px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{dateLabel}</h2>
                            {txs.map((tx) => (
                                <article key={tx.id} className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white/90 p-3.5 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/85">
                                    <div className="flex items-center gap-3">
                                        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tx.type === "EARN" ? "bg-emerald-500/15 text-emerald-600" : "bg-blue-500/15 text-blue-600"}`}>
                                            <span className="material-symbols-outlined">{tx.type === "EARN" ? "recycling" : "local_drink"}</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                                                {tx.type === "EARN" ? `${tx.materialType || "Deposit"} recycle` : "Water withdrawal"}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {formatTime(tx.createdAt)}
                                                {tx.count ? ` • ${tx.count} items` : ""}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-sm font-semibold ${tx.type === "EARN" ? "text-emerald-600" : "text-rose-500"}`}>
                                            {tx.type === "EARN" ? "+" : "-"}{tx.amount} pts
                                        </p>
                                        {tx.type === "REDEEM" && <p className="text-[11px] text-slate-500">{tx.amount * 100}ml</p>}
                                    </div>
                                </article>
                            ))}
                        </section>
                    ))
                ) : (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white/80 px-4 py-8 text-center text-sm text-slate-500 dark:border-zinc-700 dark:bg-zinc-900/80">
                        No transactions yet. Start recycling to see activity here.
                    </div>
                )}
            </main>
        </div>
    );
}
