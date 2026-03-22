"use client";

import { useRouter } from "next/navigation";

export default function RewardsGuidePage() {
    const router = useRouter();

    return (
        <div className="flex-1 overflow-y-auto pb-8 w-full h-full">
            <header className="sticky top-0 z-50 bg-white/90 dark:bg-[#0a0c10]/90 backdrop-blur-md px-4 py-3 border-b border-gray-100 dark:border-zinc-800/80">
                <div className="flex items-center justify-center">
                    <h1 className="text-lg font-bold text-center">Rewards Guide</h1>
                </div>
            </header>

            <main className="flex-1 flex flex-col p-4 gap-6">
                <section>
                    <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Point Conversion</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                        Simple guide to converting your recyclables into points for clean water.
                    </p>
                </section>

                <section className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 dark:from-blue-500/20 dark:to-blue-500/5 border border-blue-500/20 rounded-2xl p-6 relative overflow-hidden shadow-sm">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/20 rounded-full blur-2xl"></div>
                    <div className="flex items-center justify-between relative z-10">
                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-semibold tracking-wider text-blue-500 uppercase">Exchange Rate</span>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">1 Point = 100ml</h3>
                            <p className="text-blue-500 font-medium">Purified Water</p>
                        </div>
                        <div className="bg-white dark:bg-zinc-800 p-4 rounded-full shadow-md text-blue-500">
                            <span className="material-symbols-outlined text-4xl fill">water_drop</span>
                        </div>
                    </div>
                </section>

                <section className="flex flex-col gap-4">
                    <div className="flex justify-between items-end mb-1">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">How to Earn</h3>
                        <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">Standard Rates</span>
                    </div>

                    <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-[0_2px_15px_rgb(0,0,0,0.03)] dark:shadow-none border border-gray-100 dark:border-zinc-800/80 p-4 flex items-center gap-4 hover:border-slate-200 dark:hover:border-zinc-700 transition-colors">
                        <div className="h-16 w-16 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-3xl text-green-600 dark:text-green-400">recycling</span>
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-gray-900 dark:text-white">1 Plastic Bottle</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Clean PET bottle</p>
                        </div>
                        <div className="flex flex-col items-end justify-center h-full">
                            <div className="flex items-baseline gap-1">
                                <span className="text-xl font-bold text-primary">1</span>
                                <span className="text-xs font-medium text-gray-500 uppercase">Pt</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-[0_2px_15px_rgb(0,0,0,0.03)] dark:shadow-none border border-gray-100 dark:border-zinc-800/80 p-4 flex items-center gap-4 hover:border-slate-200 dark:hover:border-zinc-700 transition-colors">
                        <div className="h-16 w-16 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-3xl text-orange-500 dark:text-orange-400">local_cafe</span>
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-gray-900 dark:text-white">2 Plastic Cups</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Clean plastic cups</p>
                        </div>
                        <div className="flex flex-col items-end justify-center h-full">
                            <div className="flex items-baseline gap-1">
                                <span className="text-xl font-bold text-primary">1</span>
                                <span className="text-xs font-medium text-gray-500 uppercase">Pt</span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-[0_2px_15px_rgb(0,0,0,0.03)] dark:shadow-none border border-gray-100 dark:border-zinc-800/80 p-4 flex items-center gap-4 hover:border-slate-200 dark:hover:border-zinc-700 transition-colors">
                        <div className="h-16 w-16 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-3xl text-blue-500 dark:text-blue-400">
                                description
                            </span>
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-gray-900 dark:text-white">3 Module Paper</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Clean paper</p>
                        </div>
                        <div className="flex flex-col items-end justify-center h-full">
                            <div className="flex items-baseline gap-1">
                                <span className="text-xl font-bold text-primary">1</span>
                                <span className="text-xs font-medium text-gray-500 uppercase">Pt</span>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
