"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useCachedFetch } from "@/hooks/useCachedFetch";
import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";

interface Transaction {
    id: string;
    type: string;
    amount: number;
    materialType: string | null;
    count: number | null;
    status: string;
    createdAt: string;
}

interface BalanceData {
    balance: number;
    fullName: string | null;
    dailyEarned: number;
    dailyRedeemed: number;
    recentTransactions: Transaction[];
}

const MAX_DAILY_EARN = 10;
const MAX_DAILY_REDEEM = 5;

export default function Dashboard() {
    const { user, updateUserBalance } = useAuth();
    const router = useRouter();
    const { data } = useCachedFetch<BalanceData>("/api/user-balance");

    useEffect(() => {
        if (data?.balance !== undefined) {
             updateUserBalance(data.balance);
        }
    }, [data?.balance, updateUserBalance]);

    // Show cached data immediately, update when API responds
    const balance = data?.balance ?? user?.balance ?? 0;
    const fullName = data?.fullName || user?.email?.split('@')[0] || 'Student';
    const dailyEarned = data?.dailyEarned ?? 0;
    const dailyRedeemed = data?.dailyRedeemed ?? 0;
    const earnProgress = Math.min((dailyEarned / MAX_DAILY_EARN) * 100, 100);
    const redeemProgress = Math.min((dailyRedeemed / MAX_DAILY_REDEEM) * 100, 100);

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const isYesterday = date.toDateString() === yesterday.toDateString();

        const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        if (isToday) return `Today, ${time}`;
        if (isYesterday) return `Yesterday, ${time}`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + `, ${time}`;
    };

    return (
        <div className="flex-1 overflow-y-auto w-full h-full pb-8 pt-6">


            {/* Points Balance Card — always visible immediately */}
            <div className="px-5 py-3">
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-green-800 p-5 text-white shadow-lg shadow-primary/20">
                    <div className="absolute right-[-20px] top-[-20px] opacity-10">
                        <span className="material-symbols-outlined text-[140px] text-white">eco</span>
                    </div>
                    <div className="relative z-10">
                        <p className="text-green-200 text-xs font-semibold uppercase tracking-wider mb-1">{fullName} Your balance is</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-5xl font-bold tracking-tighter">{balance}</span>
                            <span className="text-green-200 text-lg font-medium">pts</span>
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-green-200 text-sm">
                            <span className="material-symbols-outlined text-base">water_drop</span>
                            <span>≈ {balance * 100}ml water equivalent</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Daily Limits Section */}
            <div className="px-5 py-3">
                <h2 className="text-slate-900 dark:text-white text-base font-bold mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg text-primary">schedule</span>
                    Daily Limits
                </h2>
                <div className="grid grid-cols-2 gap-3">
                    {/* Earning Limit */}
                    <div className="bg-white dark:bg-[#111827] rounded-2xl p-4 shadow-[0_2px_20px_rgb(0,0,0,0.04)] dark:shadow-none border border-slate-100 dark:border-zinc-800/80">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Earning</span>
                            <span className="text-xs font-bold text-slate-900 dark:text-gray-100 bg-slate-50 dark:bg-zinc-800 px-2 py-0.5 rounded-md">{dailyEarned}/{MAX_DAILY_EARN}</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-500"
                                style={{ width: `${earnProgress}%` }}
                            />
                        </div>
                    </div>

                    {/* Redemption Limit */}
                    <div className="bg-white dark:bg-[#111827] rounded-2xl p-4 shadow-[0_2px_20px_rgb(0,0,0,0.04)] dark:shadow-none border border-slate-100 dark:border-zinc-800/80">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Redeem</span>
                            <span className="text-xs font-bold text-slate-900 dark:text-gray-100 bg-slate-50 dark:bg-zinc-800 px-2 py-0.5 rounded-md">{dailyRedeemed}/{MAX_DAILY_REDEEM}</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-500"
                                style={{ width: `${redeemProgress}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-5 py-3">
                <h2 className="text-slate-900 dark:text-white text-base font-bold mb-3">Quick Actions</h2>
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => router.push("/qr")}
                        className="group relative overflow-hidden flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-emerald-500 to-emerald-700 p-5 rounded-3xl text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all outline-none border border-emerald-400/30"
                    >
                        {/* Glass shine effect */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rotate-45 scale-150 transform -translate-x-full group-hover:translate-x-full" />

                        <div className="bg-white/20 p-2.5 rounded-2xl backdrop-blur-sm border border-white/10 shadow-inner group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-[28px]">qr_code_scanner</span>
                        </div>
                        <span className="text-[13px] font-bold tracking-wide mt-1">Receive Pts</span>
                    </button>

                    <button
                        onClick={() => router.push("/redeem")}
                        className="group relative overflow-hidden flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-blue-500 to-indigo-600 p-5 rounded-3xl text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all outline-none border border-blue-400/30"
                    >
                        {/* Glass shine effect */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rotate-45 scale-150 transform -translate-x-full group-hover:translate-x-full" />

                        <div className="bg-white/20 p-2.5 rounded-2xl backdrop-blur-sm border border-white/10 shadow-inner group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-[28px]">local_drink</span>
                        </div>
                        <span className="text-[13px] font-bold tracking-wide mt-1">Redeem Water</span>
                    </button>
                </div>
            </div>

            {/* Recent Transactions */}
            <div className="px-5 pt-4">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-slate-900 dark:text-white text-base font-bold">Recent Activity</h2>
                    <Link href="/history" className="text-primary text-sm font-semibold hover:text-green-800">
                        View all
                    </Link>
                </div>
                <div className="flex flex-col gap-2.5">
                    {!data ? (
                        // Subtle skeleton loader instead of blocking spinner
                        Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="flex items-center justify-between p-3.5 bg-white dark:bg-zinc-800 rounded-xl border border-gray-100 dark:border-zinc-700 animate-pulse">
                                <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-full bg-gray-200 dark:bg-zinc-700" />
                                    <div>
                                        <div className="h-3.5 w-28 bg-gray-200 dark:bg-zinc-700 rounded mb-2" />
                                        <div className="h-2.5 w-20 bg-gray-100 dark:bg-zinc-700 rounded" />
                                    </div>
                                </div>
                                <div className="h-3.5 w-14 bg-gray-200 dark:bg-zinc-700 rounded" />
                            </div>
                        ))
                    ) : data.recentTransactions.length > 0 ? (
                        data.recentTransactions.map((tx) => (
                            <div key={tx.id} className="group flex items-center justify-between p-4 bg-white dark:bg-[#111827] rounded-2xl shadow-[0_2px_15px_rgb(0,0,0,0.03)] dark:shadow-none border border-slate-100 dark:border-zinc-800/80 hover:border-slate-200 dark:hover:border-zinc-700 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={`size-11 rounded-xl flex items-center justify-center shadow-inner ${tx.type === "EARN"
                                        ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50"
                                        : "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50"
                                        }`}>
                                        <span className="material-symbols-outlined text-xl">
                                            {tx.type === "EARN" ? "recycling" : "water_drop"}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-slate-800 dark:text-gray-100 font-bold text-[13px] tracking-tight">
                                            {tx.type === "EARN"
                                                ? `Recycled ${tx.count || 1} ${tx.materialType || 'Items'}`
                                                : `Water Refill (${tx.amount * 100}ml)`}
                                        </p>
                                        <p className="text-slate-400 dark:text-slate-500 text-[11px] mt-0.5 font-medium">{formatTime(tx.createdAt)}</p>
                                    </div>
                                </div>
                                <div className={`flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold ${tx.type === "EARN"
                                    ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
                                    : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                                    }`}>
                                    {tx.type === "EARN" ? "+" : "-"}{tx.amount} pts
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2">receipt_long</span>
                            <p className="text-slate-400 dark:text-slate-500 text-sm font-medium">No transactions yet</p>
                            <p className="text-slate-300 dark:text-slate-600 text-xs mt-1">Start recycling to earn points!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
