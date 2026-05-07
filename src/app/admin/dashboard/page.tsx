"use client";

import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
    const router = useRouter();

    return (
        <div className="flex-1 overflow-y-auto w-full h-full pb-8">
            <AdminTopBar title="Admin Dashboard" />

            <div className="px-4 pt-6 pb-2">
                <h1 className="text-slate-900 dark:text-white text-2xl font-bold mt-1">System Overview</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Control panel for the EcoDefill System.</p>
            </div>

            <div className="px-4 py-4 grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-zinc-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-zinc-700 flex flex-col items-center justify-center text-center">
                    <span className="material-symbols-outlined text-4xl text-blue-500 mb-2">group</span>
                    <p className="text-2xl font-bold">142</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Total Users</p>
                </div>

                <div className="bg-white dark:bg-zinc-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-zinc-700 flex flex-col items-center justify-center text-center">
                    <span className="material-symbols-outlined text-4xl text-green-500 mb-2">water_drop</span>
                    <p className="text-2xl font-bold">45.2L</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Water Dispensed</p>
                </div>

                <div className="bg-white dark:bg-zinc-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-zinc-700 flex flex-col items-center justify-center text-center">
                    <span className="material-symbols-outlined text-4xl text-primary mb-2">recycling</span>
                    <p className="text-2xl font-bold">892</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Bottles Recycled</p>
                </div>

                <div className="bg-white dark:bg-zinc-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-zinc-700 flex flex-col items-center justify-center text-center">
                    <span className="material-symbols-outlined text-4xl text-orange-500 mb-2">warning</span>
                    <p className="text-2xl font-bold">12%</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Machine Capacity</p>
                </div>
            </div>

            <div className="px-4 py-2 space-y-4">
                <h2 className="text-slate-900 dark:text-white text-lg font-bold">Machine Actions</h2>
                <button
                    onClick={() => router.push("/admin/scanner")}
                    className="w-full group relative overflow-hidden rounded-xl bg-zinc-900 dark:bg-zinc-800 p-5 text-left shadow-lg hover:bg-zinc-800 dark:hover:bg-zinc-700 transition-all flex items-center justify-between"
                >
                    <div className="flex items-center gap-4">
                        <div className="bg-white/10 p-3 rounded-xl flex items-center justify-center text-white">
                            <span className="material-symbols-outlined">qr_code_scanner</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">Scan User QR</h3>
                            <p className="text-xs text-slate-400">Verify QR token to award points</p>
                        </div>
                    </div>
                    <span className="material-symbols-outlined text-white opacity-50">chevron_right</span>
                </button>
            </div>
        </div>
    );
}
