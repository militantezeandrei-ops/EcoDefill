"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useCachedFetch } from "@/hooks/useCachedFetch";

interface Transaction {
    id: string;
    type: string;
    amount: number;
    materialType: string | null;
    count: number | null;
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

    const balance = data?.balance ?? user?.balance ?? 0;
    const fullName = data?.fullName || user?.email?.split("@")[0] || "Student";
    const dailyEarned = data?.dailyEarned ?? 0;
    const dailyRedeemed = data?.dailyRedeemed ?? 0;
    const earnProgress = Math.min((dailyEarned / MAX_DAILY_EARN) * 100, 100);
    const redeemProgress = Math.min((dailyRedeemed / MAX_DAILY_REDEEM) * 100, 100);

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        const todayOrDate = isToday ? "Today" : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
        return `${todayOrDate}, ${time}`;
    };

    return (
        <div className="relative flex-1 overflow-y-auto scroll-pb-32 pb-32">
            {/* Ambient gradient */}
            <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-56 bg-gradient-to-b from-emerald-100/60 to-transparent" />

            {/* ── Balance Hero Card ── */}
            <section className="px-4 pt-[calc(var(--safe-top)+56px)]">
                <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 px-5 pb-5 pt-6 text-white shadow-[0_12px_32px_rgba(5,150,105,0.3)]">
                    {/* Decorative blobs */}
                    <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                    
                    {/* Username */}
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-100/70">
                        {fullName}&apos;s Balance
                    </p>

                    {/* Big balance */}
                    <div className="mt-1.5 flex items-end gap-1.5">
                        <span className="text-5xl font-black leading-none tracking-tighter">{balance}</span>
                        <span className="mb-0.5 text-xs font-black uppercase tracking-widest text-emerald-200">pts</span>
                    </div>

                    {/* Water equiv badge */}
                    <div className="mt-4 flex items-center justify-between">
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 backdrop-blur-sm">
                            <span className="material-symbols-outlined text-[14px] text-teal-200">water_drop</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-white/90">
                                ≈ {(balance * 0.1).toFixed(1)} L water saved
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Daily Progress (One horizontal row) ── */}
            <section className="mt-5 px-4">
                <h2 className="app-section-title">Daily Limits</h2>
                <div className="grid grid-cols-2 gap-3">
                    {/* Earn col */}
                    <div className="app-card flex flex-col gap-2 p-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[16px] text-emerald-600">recycling</span>
                                <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight">Earned</span>
                            </div>
                            <span className="text-[11px] font-black text-emerald-600">{dailyEarned}<span className="text-[9px] text-slate-400">/{MAX_DAILY_EARN}</span></span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${earnProgress}%` }} />
                        </div>
                    </div>

                    {/* Redeem col */}
                    <div className="app-card flex flex-col gap-2 p-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[16px] text-blue-600">water_drop</span>
                                <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight">Used</span>
                            </div>
                            <span className="text-[11px] font-black text-blue-600">{dailyRedeemed}<span className="text-[9px] text-slate-400">/{MAX_DAILY_REDEEM}</span></span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full transition-all duration-700" style={{ width: `${redeemProgress}%` }} />
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Quick Actions ── */}
            <section className="mt-5 px-4">
                <h2 className="app-section-title">Quick Actions</h2>
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => router.push("/qr")}
                        className="group flex flex-col items-center gap-2 rounded-[22px] bg-emerald-600 px-4 py-4 text-white shadow-[0_8px_20px_rgba(5,150,105,0.3)] transition-all active:scale-95 active:shadow-none"
                    >
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20">
                            <span className="material-symbols-outlined text-[24px]">qr_code_scanner</span>
                        </div>
                        <div className="text-center">
                            <p className="text-[12px] font-black">Receive Points</p>
                            <p className="text-[9px] font-medium text-emerald-200">Show my QR</p>
                        </div>
                    </button>

                    <button
                        onClick={() => router.push("/redeem")}
                        className="group flex flex-col items-center gap-2 rounded-[22px] bg-blue-600 px-4 py-4 text-white shadow-[0_8px_20px_rgba(37,99,235,0.3)] transition-all active:scale-95 active:shadow-none"
                    >
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20">
                            <span className="material-symbols-outlined text-[24px]">local_drink</span>
                        </div>
                        <div className="text-center">
                            <p className="text-[12px] font-black">Redeem Water</p>
                            <p className="text-[9px] font-medium text-blue-200">Use your points</p>
                        </div>
                    </button>
                </div>
            </section>

            {/* ── Recent Activity ── */}
            <section className="mt-6 px-4">
                <div className="mb-3 flex items-center justify-between">
                    <h2 className="app-section-title mb-0">Recent Activity</h2>
                    <Link href="/history" className="text-[12px] font-bold text-emerald-600">View all</Link>
                </div>

                <div className="app-card p-0 overflow-hidden">
                    {!data ? (
                        <div className="divide-y divide-slate-100">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                                    <div className="shimmer h-10 w-10 rounded-xl" />
                                    <div className="flex-1 space-y-2">
                                        <div className="shimmer h-3 w-3/4 rounded" />
                                        <div className="shimmer h-2.5 w-1/2 rounded" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : data.recentTransactions.length > 0 ? (
                        <div className="divide-y divide-slate-100">
                            {data.recentTransactions.map((tx) => (
                                <div key={tx.id} className="flex items-center justify-between px-4 py-3.5 transition-colors active:bg-slate-50">
                                    <div className="flex items-center gap-3">
                                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tx.type === "EARN" ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"}`}>
                                            <span className="material-symbols-outlined text-[20px]">
                                                {tx.type === "EARN" ? "recycling" : "water_drop"}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800">
                                                {tx.type === "EARN"
                                                    ? `Recycled ${tx.count || 1} ${tx.materialType || "item(s)"}`
                                                    : `Water refill – ${tx.amount * 100}ml`}
                                            </p>
                                            <p className="mt-0.5 text-[11px] text-slate-400">{formatTime(tx.createdAt)}</p>
                                        </div>
                                    </div>
                                    <span className={`text-sm font-black ${tx.type === "EARN" ? "text-emerald-600" : "text-rose-500"}`}>
                                        {tx.type === "EARN" ? "+" : "-"}{tx.amount}
                                        <span className="ml-0.5 text-[10px] font-semibold">pts</span>
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="px-4 py-8 text-center">
                            <span className="material-symbols-outlined text-4xl text-slate-300">inbox</span>
                            <p className="mt-2 text-sm text-slate-400">No transactions yet. Start recycling!</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
