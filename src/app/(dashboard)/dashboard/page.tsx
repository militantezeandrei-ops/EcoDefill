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
        <div className="relative flex-1 overflow-y-auto pb-10 pt-5">
            <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.12),transparent_44%)]" />

            <section className="px-4">
                <div className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-500 to-emerald-700 p-5 text-white shadow-[0_20px_40px_rgba(16,185,129,0.35)]">
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-emerald-100">{fullName} Available Points</p>
                    <p className="mt-3 text-5xl font-bold leading-none tracking-tight">{balance}</p>
                    <p className="mt-3 text-sm text-emerald-50">{balance * .1}L water</p>
                </div>
            </section>

            <section className="px-4 pt-4">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Daily Limits</h2>
                <div className="grid grid-cols-2 gap-3">
                    <article className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
                        <p className="text-xs text-slate-500">Points Earned</p>
                        <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">{dailyEarned}/{MAX_DAILY_EARN}</p>
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-zinc-800">
                            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${earnProgress}%` }} />
                        </div>
                    </article>
                    <article className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
                        <p className="text-xs text-slate-500">Water Redeemed</p>
                        <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">{dailyRedeemed}/{MAX_DAILY_REDEEM}</p>
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-zinc-800">
                            <div className="h-full rounded-full bg-blue-500" style={{ width: `${redeemProgress}%` }} />
                        </div>
                    </article>
                </div>
            </section>

            <section className="px-4 pt-5">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Quick Actions</h2>
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => router.push("/qr")}
                        className="group rounded-2xl bg-emerald-600 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]"
                    >
                        <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 text-white">
                            <span className="material-symbols-outlined">qr_code_scanner</span>
                        </div>
                        <p className="text-sm font-semibold text-white">Receive Points</p>
                        <p className="mt-1 text-xs text-emerald-100">Show personal QR</p>
                    </button>

                    <button
                        onClick={() => router.push("/redeem")}
                        className="group rounded-2xl bg-blue-600 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]"
                    >
                        <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 text-white">
                            <span className="material-symbols-outlined">local_drink</span>
                        </div>
                        <p className="text-sm font-semibold text-white">Redeem Water</p>
                        <p className="mt-1 text-xs text-blue-100">Use points instantly</p>
                    </button>
                </div>
            </section>

            <section className="px-4 pt-5">
                <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Recent Activity</h2>
                    <Link href="/history" className="text-sm font-medium text-primary">View all</Link>
                </div>

                <div className="space-y-2.5">
                    {!data ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-200/60 dark:bg-zinc-800" />
                        ))
                    ) : data.recentTransactions.length > 0 ? (
                        data.recentTransactions.map((tx) => (
                            <article key={tx.id} className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white/90 p-3.5 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
                                <div className="flex items-center gap-3">
                                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tx.type === "EARN" ? "bg-emerald-500/15 text-emerald-600" : "bg-blue-500/15 text-blue-600"}`}>
                                        <span className="material-symbols-outlined text-[20px]">
                                            {tx.type === "EARN" ? "recycling" : "water_drop"}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                                            {tx.type === "EARN" ? `Recycled ${tx.count || 1} ${tx.materialType || "items"}` : `Water refill (${tx.amount * 100}ml)`}
                                        </p>
                                        <p className="text-xs text-slate-500">{formatTime(tx.createdAt)}</p>
                                    </div>
                                </div>
                                <p className={`text-sm font-semibold ${tx.type === "EARN" ? "text-emerald-600" : "text-rose-500"}`}>
                                    {tx.type === "EARN" ? "+" : "-"}{tx.amount} pts
                                </p>
                            </article>
                        ))
                    ) : (
                        <div className="rounded-xl border border-dashed border-slate-300 bg-white/80 px-4 py-6 text-center text-sm text-slate-500 dark:border-zinc-700 dark:bg-zinc-900/80">
                            No transactions yet. Start recycling to earn points.
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
