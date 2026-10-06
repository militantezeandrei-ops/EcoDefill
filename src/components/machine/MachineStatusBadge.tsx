"use client";

import React from "react";
import { MachineStatusState } from "@/hooks/useMachineStatus";

interface MachineStatusBadgeProps {
    machineStatus: MachineStatusState;
    showDetails?: boolean;
    compact?: boolean;
    onRefresh?: () => void;
}

export default function MachineStatusBadge({
    machineStatus,
    showDetails = true,
    compact = false,
    onRefresh,
}: MachineStatusBadgeProps) {
    const { isOnline, status, waterLevel, remainingLiters, waterPercentage, isLowWater, isEmptyWater, secondsSinceLastPing } = machineStatus;

    if (compact) {
        return (
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${
                !isOnline
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : isEmptyWater
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : isLowWater
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
            }`}>
                <span className={`h-2 w-2 rounded-full ${
                    !isOnline 
                        ? "bg-rose-500" 
                        : isEmptyWater 
                        ? "bg-rose-500 animate-pulse" 
                        : isLowWater 
                        ? "bg-amber-500" 
                        : "bg-emerald-500 animate-pulse"
                }`} />
                <span>
                    {!isOnline
                        ? "Machine Offline"
                        : isEmptyWater
                        ? "Water Empty"
                        : isLowWater
                        ? "Low Water"
                        : "Station Ready"}
                </span>
            </div>
        );
    }

    return (
        <div className={`relative overflow-hidden rounded-[20px] border p-4 transition-all shadow-sm ${
            !isOnline
                ? "border-rose-200 bg-linear-to-r from-rose-50/90 via-rose-50/60 to-red-50/80"
                : isEmptyWater
                ? "border-rose-200 bg-linear-to-r from-rose-50 via-rose-50/70 to-red-50"
                : isLowWater
                ? "border-amber-200 bg-linear-to-r from-amber-50 via-amber-50/70 to-orange-50"
                : "border-emerald-200/80 bg-linear-to-r from-emerald-50/90 via-teal-50/60 to-emerald-50/40"
        }`}>
            <div className="flex items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                    {/* Status Icon Indicator */}
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm ${
                        !isOnline
                            ? "bg-rose-600 text-white"
                            : isEmptyWater
                            ? "bg-rose-600 text-white animate-bounce"
                            : isLowWater
                            ? "bg-amber-500 text-white"
                            : "bg-emerald-600 text-white"
                    }`}>
                        <span className="material-symbols-outlined text-[22px]">
                            {!isOnline
                                ? "power_off"
                                : isEmptyWater
                                ? "water_damage"
                                : isLowWater
                                ? "warning"
                                : "check_circle"}
                        </span>
                    </div>

                    <div>
                        <div className="flex items-center gap-2">
                            <span className={`text-[13px] font-black uppercase tracking-wide ${
                                !isOnline
                                    ? "text-rose-950"
                                    : isEmptyWater
                                    ? "text-rose-950"
                                    : isLowWater
                                    ? "text-amber-950"
                                    : "text-emerald-950"
                            }`}>
                                {!isOnline
                                    ? "Physical Station Offline"
                                    : isEmptyWater
                                    ? "Station Alert: Water Tank Empty"
                                    : isLowWater
                                    ? "Station Alert: Low Water Level"
                                    : "EcoDefill Station Ready"}
                            </span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                !isOnline
                                    ? "bg-rose-100 text-rose-700"
                                    : isEmptyWater
                                    ? "bg-rose-100 text-rose-700"
                                    : isLowWater
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-emerald-100 text-emerald-800"
                            }`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${
                                    !isOnline ? "bg-rose-500" : "bg-emerald-500 animate-ping"
                                }`} />
                                {isOnline ? "Live" : "No Ping"}
                            </span>
                        </div>

                        <p className={`text-[11px] font-semibold mt-0.5 ${
                            !isOnline
                                ? "text-rose-700"
                                : isEmptyWater
                                ? "text-rose-700"
                                : isLowWater
                                ? "text-amber-800"
                                : "text-emerald-700"
                        }`}>
                            {!isOnline
                                ? "No heartbeat received in >30s. Operations are paused for safety."
                                : isEmptyWater
                                ? "Water tank is at 0.0L. Dispensing paused until refilled."
                                : isLowWater
                                ? `Water container is at ${remainingLiters.toFixed(1)}L (${waterPercentage}%). Refill soon.`
                                : `Online & active (${waterLevel} • ${waterPercentage}% full).`}
                        </p>
                    </div>
                </div>

                {showDetails && (
                    <div className="flex flex-col items-end shrink-0 self-center">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                            {isOnline 
                                ? (secondsSinceLastPing <= 5 ? "Heartbeat: Just now" : `Heartbeat: ${secondsSinceLastPing}s ago`) 
                                : `Last seen: ${secondsSinceLastPing < 3600 ? Math.floor(secondsSinceLastPing / 60) + "m ago" : "Unavailable"}`}
                        </span>
                        {onRefresh && (
                            <button
                                onClick={onRefresh}
                                className="mt-1 text-[10px] font-bold text-slate-500 hover:text-slate-800 underline active:opacity-60"
                            >
                                Refresh status
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
