"use client";

import { Trophy, Medal, Recycle } from "lucide-react";
import { useCachedFetch } from "@/hooks/useCachedFetch";

interface CourseRankingEntry {
    course: string;
    points: number;
    items: number;
}

const medalColors = [
    "from-amber-400 to-orange-500 text-white",
    "from-slate-300 to-slate-400 text-slate-800",
    "from-orange-300 to-amber-500 text-white",
];

export default function RankingPage() {
    const { data } = useCachedFetch<CourseRankingEntry[]>("/api/course-ranking");
    const ranking = data ?? [];
    const maxPoints = ranking[0]?.points || 1;
    const leader = ranking[0]?.course || "No leader yet";

    return (
        <div className="relative min-h-full pb-4">
            <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-gradient-to-b from-blue-100/70 via-emerald-50/70 to-transparent" />

            <section className="px-4 pt-[calc(var(--safe-top)+56px)]">
                <h2 className="app-section-title">Course Ranking</h2>
                <div className="overflow-hidden rounded-[28px] bg-gradient-to-br from-blue-600 via-cyan-500 to-emerald-500 px-5 pb-5 pt-6 text-white shadow-[0_16px_36px_rgba(37,99,235,0.28)]">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-100/90">
                                Campus Leaderboard
                            </p>
                            <h1 className="mt-2 text-2xl font-black tracking-tight">Represent Your Course</h1>
                            <p className="mt-2 max-w-[240px] text-[12px] font-medium text-blue-50/90">
                                Every recycled item adds points to your course standing.
                            </p>
                        </div>
                        <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-white/15 backdrop-blur-sm">
                            <Trophy className="h-7 w-7" />
                        </div>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-[20px] bg-white/12 px-4 py-3 backdrop-blur-sm">
                            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-blue-100/75">Top Course</p>
                            <p className="mt-1 text-lg font-black">{leader}</p>
                        </div>
                        <div className="rounded-[20px] bg-white/12 px-4 py-3 backdrop-blur-sm">
                            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-blue-100/75">Tracked Courses</p>
                            <p className="mt-1 text-lg font-black">{ranking.length}</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mt-5 px-4">
                <div className="mb-3 flex items-center justify-between">
                    <h2 className="app-section-title mb-0">Standings</h2>
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 shadow-sm">
                        <Recycle className="h-3.5 w-3.5 text-emerald-500" />
                        Live Totals
                    </div>
                </div>

                {!data ? (
                    <div className="space-y-3">
                        {Array.from({ length: 5 }).map((_, index) => (
                            <div key={index} className="app-card h-[88px] animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {ranking.map((entry, index) => {
                            const progress = maxPoints > 0 ? (entry.points / maxPoints) * 100 : 0;
                            const topThree = index < 3;

                            return (
                                <div key={entry.course} className="app-card overflow-hidden p-0">
                                    <div className="flex items-center gap-3 px-4 py-4">
                                        <div
                                            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] font-black shadow-sm ${
                                                topThree
                                                    ? `bg-gradient-to-br ${medalColors[index]}`
                                                    : "bg-slate-100 text-slate-500"
                                            }`}
                                        >
                                            {topThree ? <Medal className="h-5 w-5" /> : <span>#{index + 1}</span>}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <p className="text-[15px] font-black text-slate-900">{entry.course}</p>
                                                    <p className="text-[11px] font-bold text-slate-400">
                                                        {entry.items.toLocaleString()} recycled items
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[16px] font-black text-blue-600">
                                                        {entry.points.toFixed(1).replace(/\.0$/, "")}
                                                    </p>
                                                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                                                        points
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
                                                <div
                                                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-700"
                                                    style={{ width: `${progress}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
}
