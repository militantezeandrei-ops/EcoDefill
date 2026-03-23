"use client";

import { useAuth } from "@/hooks/useAuth";
import { LogOut, Calendar, Clock } from "lucide-react";
import { useState, useEffect } from "react";

export function AdminTopBar() {
    const { logout } = useAuth();
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
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-200 bg-white px-8 py-3.5 shadow-sm">
            <div className="flex items-center gap-6">
                {/* School Brand */}
                <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#7A1E1E] text-white">
                        <span className="material-symbols-outlined text-[20px]">school</span>
                    </div>
                    <div className="flex flex-col">
                        <h2 className="text-[14px] font-black tracking-tight text-gray-900 leading-none">
                            Pambayang Dalubhasaan ng Marilao
                        </h2>
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#7A1E1E] mt-1.5 opacity-80">
                            EcoDefill Admin System
                        </span>
                    </div>
                </div>

                {/* Vertical Divider */}
                <div className="h-8 w-px bg-gray-200" />

                {/* Live Clock & Date */}
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-2.5 text-gray-500">
                        <Calendar className="h-5 w-5" />
                        <span className="text-[16px] font-bold tracking-tight">{formatDate(time)}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-[#7A1E1E]">
                        <Clock className="h-5 w-5" />
                        <span className="text-[20px] font-black tracking-widest tabular-nums uppercase">{formatTime(time)}</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-end">
                <button
                    onClick={logout}
                    className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 transition-all hover:bg-red-50 hover:border-red-100 group shadow-sm"
                >
                    <span className="text-[11px] font-black text-gray-500 group-hover:text-red-600 uppercase tracking-widest transition-colors">Logout</span>
                    <LogOut className="h-3.5 w-3.5 text-gray-400 group-hover:text-red-500 transition-colors" />
                </button>
            </div>
        </div>
    );
}
