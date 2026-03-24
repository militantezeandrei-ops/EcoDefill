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
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3 shadow-sm">
            {/* Left: School Brand */}
            <div className="flex items-center gap-5">
                <div className="flex items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#7A1E1E] text-white">
                        <span className="material-symbols-outlined text-[18px]">school</span>
                    </div>
                    <div className="flex flex-col">
                        <h2 className="text-[15px] font-black tracking-tight text-gray-900 leading-none">
                            Pambayang Dalubhasaan ng Marilao
                        </h2>
                        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#7A1E1E] mt-1 opacity-80">
                            EcoDefill Admin System
                        </span>
                    </div>
                </div>

                <div className="h-7 w-px bg-gray-200" />

                {/* Live Clock & Date */}
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-gray-500">
                        <Calendar className="h-4 w-4" />
                        <span className="text-[15px] font-semibold tracking-tight">{formatDate(time)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#7A1E1E]">
                        <Clock className="h-4 w-4" />
                        <span className="text-[18px] font-black tracking-widest tabular-nums uppercase">{formatTime(time)}</span>
                    </div>
                </div>
            </div>

            {/* Right: System Status */}
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                    <Wifi className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-[12px] font-bold text-emerald-700">System Online</span>
                </div>
                <div className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5">
                    <span className="text-[12px] font-bold text-gray-500">v1.0</span>
                </div>
            </div>
        </div>
    );
}
