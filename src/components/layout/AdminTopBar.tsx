"use client";

import { Calendar, Clock, Wifi } from "lucide-react";
import { useState, useEffect } from "react";

export function AdminTopBar() {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const formatDate = (date: Date) => {
        return date.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
        });
    };

    return (
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-100 bg-white/80 px-6 py-4 shadow-sm backdrop-blur-md">
            {/* Left: School Brand */}
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-emerald-500 text-white shadow-lg shadow-blue-500/20">
                        <span className="material-symbols-outlined text-[20px]">school</span>
                    </div>
                    <div className="flex flex-col">
                        <h2 className="text-[16px] font-black tracking-tight text-gray-900 leading-none">
                            Pambayang Dalubhasaan ng Marilao
                        </h2>
                        <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-600 mt-1.5">
                            EcoDefill Admin System
                        </span>
                    </div>
                </div>

                <div className="h-8 w-px bg-gray-100" />

                {/* Live Clock & Date */}
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-2.5 text-gray-400">
                        <Calendar className="h-4 w-4" />
                        <span className="text-[14px] font-bold tracking-tight text-gray-500">{formatDate(time)}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-blue-600">
                        <Clock className="h-4 w-4 text-blue-500" />
                        <span className="text-[18px] font-black tracking-[0.1em] tabular-nums">{formatTime(time)}</span>
                    </div>
                </div>
            </div>

            {/* Right: System Status */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-2">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <Wifi className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-[13px] font-black text-emerald-700 uppercase tracking-tight">System Online</span>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-2">
                    <span className="text-[12px] font-black text-gray-400 uppercase tracking-widest">v1.0</span>
                </div>
            </div>
        </div>

    );
}
