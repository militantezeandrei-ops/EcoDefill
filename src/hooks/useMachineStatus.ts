"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api";

export interface MachineStatusState {
    machineId: string;
    isOnline: boolean;
    status: "ONLINE" | "OFFLINE" | "LOW_WATER" | "EMPTY_TANK";
    waterLevel: string;
    remainingLiters: number;
    waterPercentage: number;
    isLowWater: boolean;
    isEmptyWater: boolean;
    lastPingAt: string | null;
    secondsSinceLastPing: number;
    rssi: number | null;
    heartbeatThresholdSec: number;
}

const DEFAULT_STATE: MachineStatusState = {
    machineId: "MACHINE_01",
    isOnline: false,
    status: "OFFLINE",
    waterLevel: "20.0 L / 20L",
    remainingLiters: 20.0,
    waterPercentage: 100,
    isLowWater: false,
    isEmptyWater: false,
    lastPingAt: null,
    secondsSinceLastPing: 999999,
    rssi: null,
    heartbeatThresholdSec: 30,
};

export function useMachineStatus(pollIntervalMs = 5000) {
    const [machineStatus, setMachineStatus] = useState<MachineStatusState>(DEFAULT_STATE);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchStatus = useCallback(async () => {
        try {
            const data = await apiClient<MachineStatusState>("/api/machine-status?check=true");
            if (data && typeof data.isOnline === "boolean") {
                setMachineStatus(data);
                setError(null);
            }
        } catch (err: any) {
            console.error("Failed to fetch machine status:", err);
            setError(err?.message || "Failed to connect to machine status service");
            // If network failure to server, mark machine as offline
            setMachineStatus((prev) => ({
                ...prev,
                isOnline: false,
                status: "OFFLINE",
            }));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchStatus();

        const interval = setInterval(() => {
            if (typeof document !== "undefined" && document.visibilityState === "visible") {
                void fetchStatus();
            }
        }, pollIntervalMs);

        const handleFocus = () => {
            void fetchStatus();
        };

        window.addEventListener("focus", handleFocus);
        return () => {
            clearInterval(interval);
            window.removeEventListener("focus", handleFocus);
        };
    }, [fetchStatus, pollIntervalMs]);

    return {
        ...machineStatus,
        loading,
        error,
        refresh: fetchStatus,
    };
}
