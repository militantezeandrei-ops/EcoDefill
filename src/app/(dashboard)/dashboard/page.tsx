"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api";
import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";

export default function Dashboard() {
    const { user, updateUserBalance } = useAuth();
    const router = useRouter();
    const [balance, setBalance] = useState(user?.balance || 0);

    useEffect(() => {
        const fetchBalance = async () => {
            try {
                const data = await apiClient<{ balance: number }>("/api/user-balance");
                setBalance(data.balance);
                updateUserBalance(data.balance);
            } catch (err) {
                console.error("Failed to fetch balance", err);
            }
        };

        fetchBalance();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleReceivePoints = () => {
        router.push("/qr");
    };

    const handleRedeemWater = () => {
        router.push("/redeem");
    };

    return (
        <div className="flex-1 overflow-y-auto w-full h-full pb-8">
            <TopBar />
            <div className="px-4 pt-6 pb-2">
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                    Welcome back, {user?.email?.split('@')[0] || 'Student'}!
                </p>
                <h1 className="text-slate-900 dark:text-white text-2xl font-bold mt-1">Ready to recycle?</h1>
            </div>

            <div className="grid grid-cols-3 gap-3 px-4 py-4">
                <div className="flex flex-col gap-2 rounded-2xl bg-white dark:bg-zinc-800 p-4 items-center text-center shadow-sm border border-gray-100 dark:border-zinc-700">
                    <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center mb-1">
                        <span className="material-symbols-outlined text-primary text-xl">savings</span>
                    </div>
                    <p className="text-slate-900 dark:text-white tracking-tight text-xl font-bold leading-tight">{balance}</p>
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-medium leading-normal">Total Points</p>
                </div>

                <div className="flex flex-col gap-2 rounded-2xl bg-white dark:bg-zinc-800 p-4 items-center text-center shadow-sm border border-gray-100 dark:border-zinc-700">
                    <div className="size-10 rounded-full bg-blue-500/10 flex items-center justify-center mb-1">
                        <span className="material-symbols-outlined text-blue-500 text-xl">water_drop</span>
                    </div>
                    <p className="text-slate-900 dark:text-white tracking-tight text-xl font-bold leading-tight">{(balance * 0.1).toFixed(1)}L</p>
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-medium leading-normal">Water Equiv.</p>
                </div>

                <div className="flex flex-col gap-2 rounded-2xl bg-white dark:bg-zinc-800 p-4 items-center text-center shadow-sm border border-gray-100 dark:border-zinc-700">
                    <div className="size-10 rounded-full bg-orange-500/10 flex items-center justify-center mb-1">
                        <span className="material-symbols-outlined text-orange-500 text-xl">track_changes</span>
                    </div>
                    <p className="text-slate-900 dark:text-white tracking-tight text-xl font-bold leading-tight">0/10</p>
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-medium leading-normal">Daily Limit</p>
                </div>
            </div>

            <div className="px-4 py-2 space-y-4">
                <h2 className="text-slate-900 dark:text-white text-lg font-bold">Quick Actions</h2>

                <button
                    onClick={handleReceivePoints}
                    className="w-full group relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-green-800 p-6 text-left shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all active:scale-[0.98]"
                >
                    <div className="absolute right-[-20px] top-[-20px] opacity-10 rotate-12">
                        <span className="material-symbols-outlined text-[150px] text-white">qr_code_scanner</span>
                    </div>
                    <div className="relative z-10 flex items-center justify-between">
                        <div>
                            <div className="mb-2 inline-flex items-center justify-center rounded-lg bg-white/20 p-2 backdrop-blur-sm">
                                <span className="material-symbols-outlined text-white">qr_code_scanner</span>
                            </div>
                            <h3 className="text-xl font-bold text-white">Receive Points</h3>
                            <p className="mt-1 text-sm text-green-100">Scan QR at the recycling station</p>
                        </div>
                        <div className="flex size-10 items-center justify-center rounded-full bg-white text-primary shadow-sm group-hover:bg-green-50">
                            <span className="material-symbols-outlined">arrow_forward</span>
                        </div>
                    </div>
                </button>

                <button
                    onClick={handleRedeemWater}
                    className="w-full group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 p-6 text-left shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 transition-all active:scale-[0.98]"
                >
                    <div className="absolute right-[-20px] top-[-20px] opacity-10 rotate-12">
                        <span className="material-symbols-outlined text-[150px] text-white">water_bottle</span>
                    </div>
                    <div className="relative z-10 flex items-center justify-between">
                        <div>
                            <div className="mb-2 inline-flex items-center justify-center rounded-lg bg-white/20 p-2 backdrop-blur-sm">
                                <span className="material-symbols-outlined text-white">local_drink</span>
                            </div>
                            <h3 className="text-xl font-bold text-white">Redeem Water</h3>
                            <p className="mt-1 text-sm text-blue-100">Exchange 1 pt for 100ml refill</p>
                        </div>
                        <div className="flex size-10 items-center justify-center rounded-full bg-white text-blue-600 shadow-sm group-hover:bg-blue-50">
                            <span className="material-symbols-outlined">arrow_forward</span>
                        </div>
                    </div>
                </button>
            </div>

            <div className="px-4 pt-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-slate-900 dark:text-white text-lg font-bold">Recent Transactions</h2>
                    <Link href="/history" className="text-primary text-sm font-semibold hover:text-green-800">
                        View all
                    </Link>
                </div>
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between p-4 bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-700">
                        <div className="flex items-center gap-4">
                            <div className="size-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                                <span className="material-symbols-outlined">recycling</span>
                            </div>
                            <div>
                                <p className="text-slate-900 dark:text-white font-semibold">Recycled 5 Bottles</p>
                                <p className="text-slate-500 dark:text-slate-400 text-xs">Today, 10:23 AM</p>
                            </div>
                        </div>
                        <p className="text-green-600 dark:text-green-400 font-bold">+25 pts</p>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-700">
                        <div className="flex items-center gap-4">
                            <div className="size-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                <span className="material-symbols-outlined">water_drop</span>
                            </div>
                            <div>
                                <p className="text-slate-900 dark:text-white font-semibold">Water Refill (500ml)</p>
                                <p className="text-slate-500 dark:text-slate-400 text-xs">Yesterday, 2:15 PM</p>
                            </div>
                        </div>
                        <p className="text-red-500 dark:text-red-400 font-bold">-5 pts</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
