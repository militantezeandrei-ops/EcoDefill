"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api";
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
    const [data, setData] = useState<BalanceData | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await apiClient<BalanceData>("/api/user-balance");
                setData(res);
                updateUserBalance(res.balance);
            } catch (err) {
                console.error("Failed to fetch dashboard data", err);
            }
        };
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
        <div className="flex-1 overflow-y-auto w-full h-full pb-8">
            <TopBar />

            {/* Greeting */}
            <div className="px-5 pt-6 pb-2">
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                    Welcome back, {fullName}!
                </p>
                <h1 className="text-slate-900 dark:text-white text-2xl font-bold mt-1">Ready to recycle?</h1>
            </div>

            {/* Points Balance Card — always visible immediately */}
            <div className="px-5 py-3">
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-green-800 p-5 text-white shadow-lg shadow-primary/20">
                    <div className="absolute right-[-20px] top-[-20px] opacity-10">
                        <span className="material-symbols-outlined text-[140px] text-white">eco</span>
                    </div>
                    <div className="relative z-10">
                        <p className="text-green-200 text-xs font-semibold uppercase tracking-wider mb-1">Your Balance</p>
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
                    <div className="bg-white dark:bg-zinc-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-zinc-700">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="size-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-base">savings</span>
                            </div>
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Earning</span>
                        </div>
                        <div className="flex items-baseline gap-1 mb-2">
                            <span className="text-2xl font-bold text-slate-900 dark:text-white">{dailyEarned}</span>
                            <span className="text-sm text-slate-400 font-medium">/ {MAX_DAILY_EARN}</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-zinc-700 rounded-full h-2 overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-green-500 to-primary rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${earnProgress}%` }}
                            />
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 font-medium">
                            {MAX_DAILY_EARN - dailyEarned > 0 ? `${MAX_DAILY_EARN - dailyEarned} pts remaining` : 'Limit reached'}
                        </p>
                    </div>

                    {/* Redemption Limit */}
                    <div className="bg-white dark:bg-zinc-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-zinc-700">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="size-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-base">water_drop</span>
                            </div>
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Redeem</span>
                        </div>
                        <div className="flex items-baseline gap-1 mb-2">
                            <span className="text-2xl font-bold text-slate-900 dark:text-white">{dailyRedeemed}</span>
                            <span className="text-sm text-slate-400 font-medium">/ {MAX_DAILY_REDEEM}</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-zinc-700 rounded-full h-2 overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${redeemProgress}%` }}
                            />
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 font-medium">
                            {MAX_DAILY_REDEEM - dailyRedeemed > 0 ? `${MAX_DAILY_REDEEM - dailyRedeemed} pts remaining` : 'Limit reached'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="px-5 py-3 space-y-3">
                <h2 className="text-slate-900 dark:text-white text-base font-bold">Quick Actions</h2>

                <button
                    onClick={() => router.push("/qr")}
                    className="w-full group relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-green-800 p-5 text-left shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all active:scale-[0.98]"
                >
                    <div className="absolute right-[-20px] top-[-20px] opacity-10 rotate-12">
                        <span className="material-symbols-outlined text-[120px] text-white">qr_code_scanner</span>
                    </div>
                    <div className="relative z-10 flex items-center justify-between">
                        <div>
                            <div className="mb-2 inline-flex items-center justify-center rounded-lg bg-white/20 p-2 backdrop-blur-sm">
                                <span className="material-symbols-outlined text-white">qr_code_scanner</span>
                            </div>
                            <h3 className="text-lg font-bold text-white">Receive Points</h3>
                            <p className="mt-0.5 text-sm text-green-100">Scan QR at the recycling station</p>
                        </div>
                        <div className="flex size-10 items-center justify-center rounded-full bg-white text-primary shadow-sm group-hover:bg-green-50">
                            <span className="material-symbols-outlined">arrow_forward</span>
                        </div>
                    </div>
                </button>

                <button
                    onClick={() => router.push("/redeem")}
                    className="w-full group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 p-5 text-left shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 transition-all active:scale-[0.98]"
                >
                    <div className="absolute right-[-20px] top-[-20px] opacity-10 rotate-12">
                        <span className="material-symbols-outlined text-[120px] text-white">water_bottle</span>
                    </div>
                    <div className="relative z-10 flex items-center justify-between">
                        <div>
                            <div className="mb-2 inline-flex items-center justify-center rounded-lg bg-white/20 p-2 backdrop-blur-sm">
                                <span className="material-symbols-outlined text-white">local_drink</span>
                            </div>
                            <h3 className="text-lg font-bold text-white">Redeem Water</h3>
                            <p className="mt-0.5 text-sm text-blue-100">Exchange 1 pt for 100ml refill</p>
                        </div>
                        <div className="flex size-10 items-center justify-center rounded-full bg-white text-blue-600 shadow-sm group-hover:bg-blue-50">
                            <span className="material-symbols-outlined">arrow_forward</span>
                        </div>
                    </div>
                </button>
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
                            <div key={tx.id} className="flex items-center justify-between p-3.5 bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-700">
                                <div className="flex items-center gap-3">
                                    <div className={`size-10 rounded-full flex items-center justify-center ${
                                        tx.type === "EARN"
                                            ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                                            : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                                    }`}>
                                        <span className="material-symbols-outlined text-xl">
                                            {tx.type === "EARN" ? "recycling" : "water_drop"}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-slate-900 dark:text-white font-semibold text-sm">
                                            {tx.type === "EARN"
                                                ? `Recycled ${tx.count || 1} ${tx.materialType || 'Items'}`
                                                : `Water Refill (${tx.amount * 100}ml)`}
                                        </p>
                                        <p className="text-slate-400 dark:text-slate-500 text-xs mt-0.5">{formatTime(tx.createdAt)}</p>
                                    </div>
                                </div>
                                <p className={`font-bold text-sm ${
                                    tx.type === "EARN"
                                        ? "text-green-600 dark:text-green-400"
                                        : "text-red-500 dark:text-red-400"
                                }`}>
                                    {tx.type === "EARN" ? "+" : "-"}{tx.amount} pts
                                </p>
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
