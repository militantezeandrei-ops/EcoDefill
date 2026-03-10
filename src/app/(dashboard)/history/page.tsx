"use client";

import { useState } from "react";

export default function HistoryPage() {
    const [filter, setFilter] = useState("All Activity");

    return (
        <div className="flex-1 overflow-y-auto pb-8 w-full h-full">
            <header className="sticky top-0 z-10 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-gray-100 dark:border-zinc-800">
                <div className="px-4 py-3 flex items-center justify-between">
                    <h1 className="text-xl font-bold tracking-tight text-primary dark:text-green-500">Transactions</h1>
                    <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-slate-300 transition-colors">
                        <span className="material-symbols-outlined">filter_list</span>
                    </button>
                </div>

                <div className="px-4 pb-3 pt-1 overflow-x-auto hide-scrollbar flex gap-2">
                    {["All Activity", "Recycled", "Refills", "Redeemed"].map(item => (
                        <button
                            key={item}
                            onClick={() => setFilter(item)}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filter === item
                                    ? "bg-primary text-white shadow-sm"
                                    : "bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-slate-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-zinc-700"
                                }`}
                        >
                            {item}
                        </button>
                    ))}
                </div>
            </header>

            <main className="px-4 py-6 space-y-6">
                <div className="bg-gradient-to-br from-primary to-green-800 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-4 -translate-y-4">
                        <span className="material-symbols-outlined text-[120px]">water_drop</span>
                    </div>
                    <p className="text-green-100 text-sm font-medium mb-1">Current Balance</p>
                    <div className="flex items-baseline gap-1 mb-4">
                        <h2 className="text-4xl font-bold">240</h2>
                        <span className="text-lg font-medium opacity-80">pts</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t border-white/20 pt-4">
                        <div>
                            <p className="text-xs text-green-100 mb-0.5">Total Recycled</p>
                            <p className="text-lg font-semibold">128 Bottles</p>
                        </div>
                        <div>
                            <p className="text-xs text-green-100 mb-0.5">Water Saved</p>
                            <p className="text-lg font-semibold">3.2 Liters</p>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 ml-1">Today</h3>
                    <div className="space-y-3">
                        <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-zinc-700 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined">recycling</span>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-900 dark:text-gray-100 text-sm">Plastic Bottle Recycle</h4>
                                    <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">PDM Canteen • 12:45 PM</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="block font-bold text-green-600 dark:text-green-500 text-sm">+10 pts</span>
                                <span className="block text-xs text-slate-400 dark:text-slate-500 mt-0.5">500ml</span>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-zinc-700 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined">water_drop</span>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-900 dark:text-gray-100 text-sm">Water Refill</h4>
                                    <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">Library Station • 10:30 AM</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="block font-bold text-red-500 text-sm">-5 pts</span>
                                <span className="block text-xs text-slate-400 dark:text-slate-500 mt-0.5">350ml</span>
                            </div>
                        </div>
                    </div>
                </div>

                
            </main>
        </div>
    );
}
