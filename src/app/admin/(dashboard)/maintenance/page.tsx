"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    Wrench,
    Calendar,
    Droplets,
    ShieldCheck,
    AlertTriangle,
    CheckCircle2,
    Lock,
    Clock,
    RefreshCw,
    Sparkles,
} from "lucide-react";
import { showToast } from "@/lib/toast";

interface MaintenanceAlert {
    id: string;
    severity: "critical" | "warning" | "info";
    title: string;
    message: string;
    createdAt: string;
}

interface MaintenanceData {
    semesterStartDate: string | null;
    semesterEndDate: string | null;
    semesterResetDone: boolean;
    lastPointsResetAt: string | null;
    filterStartDate: string | null;
    filterReplacedCount: number;
    updatedAt: string;
    updatedByEmail?: string;
    serverTime: string;
    daysUntilReset: number | null;
    semesterActive: boolean;
    filterDueDate: string | null;
    filterDaysRemaining: number | null;
    filterHealthPercent: number | null;
    filterStatus: "UNCONFIGURED" | "HEALTHY" | "DUE_SOON" | "REPLACEMENT_REQUIRED";
    alerts: MaintenanceAlert[];
    totalStudentPoints: number;
    studentsWithPoints: number;
}

function toDateInputValue(iso: string | null): string {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function formatReadableDate(iso: string | null): string {
    if (!iso) return "Not Set";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "Not Set";
    return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

export default function MaintenancePage() {
    const [data, setData] = useState<MaintenanceData | null>(null);
    const [loading, setLoading] = useState(true);

    // Form state for Semester Schedule
    const [startDateInput, setStartDateInput] = useState("");
    const [endDateInput, setEndDateInput] = useState("");
    const [syncFilterTimer, setSyncFilterTimer] = useState(true);

    // Admin Credential Modal State
    const [pendingAction, setPendingAction] = useState<"set_semester" | "replace_filter" | null>(null);
    const [adminPassword, setAdminPassword] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [modalError, setModalError] = useState("");

    const fetchMaintenance = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/maintenance");
            if (res.ok) {
                const json: MaintenanceData = await res.json();
                setData(json);
                setStartDateInput(toDateInputValue(json.semesterStartDate));
                setEndDateInput(toDateInputValue(json.semesterEndDate));
            }
        } catch (err) {
            console.error("Failed to fetch maintenance data:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMaintenance();
    }, [fetchMaintenance]);

    const handleOpenSemesterConfirm = (e: React.FormEvent) => {
        e.preventDefault();
        if (!startDateInput || !endDateInput) {
            showToast({ text: "Please select both Start and End Semester dates.", type: "error" });
            return;
        }
        if (new Date(endDateInput) <= new Date(startDateInput)) {
            showToast({ text: "End Semester Date must be after Start Semester Date.", type: "error" });
            return;
        }
        setAdminPassword("");
        setModalError("");
        setPendingAction("set_semester");
    };

    const handleOpenFilterReplaceConfirm = () => {
        setAdminPassword("");
        setModalError("");
        setPendingAction("replace_filter");
    };

    const handleConfirmAction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pendingAction) return;
        if (!adminPassword.trim()) {
            setModalError("Please enter your admin password to authorize this change.");
            return;
        }

        setSubmitting(true);
        setModalError("");

        try {
            const payload =
                pendingAction === "set_semester"
                    ? {
                          action: "set_semester",
                          adminPassword,
                          semesterStartDate: startDateInput,
                          semesterEndDate: endDateInput,
                          syncFilterTimer,
                      }
                    : {
                          action: "replace_filter",
                          adminPassword,
                      };

            const res = await fetch("/api/admin/maintenance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const json = await res.json();
            if (!res.ok) {
                setModalError(json.message || "Authorization failed.");
                return;
            }

            setData(json);
            setStartDateInput(toDateInputValue(json.semesterStartDate));
            setEndDateInput(toDateInputValue(json.semesterEndDate));
            setPendingAction(null);
            setAdminPassword("");

            // Notify AdminTopBar to refresh alerts immediately
            window.dispatchEvent(new Event("storage"));

            await showToast({
                text:
                    pendingAction === "set_semester"
                        ? "Semester schedule & points expiry saved!"
                        : "6-month water filter timer reset!",
                type: "success",
            });
        } catch {
            setModalError("Network error while saving maintenance settings.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-8 w-64 rounded-lg bg-gray-200" />
                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                    <div className="h-36 rounded-2xl bg-gray-100" />
                    <div className="h-36 rounded-2xl bg-gray-100" />
                    <div className="h-36 rounded-2xl bg-gray-100" />
                </div>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div className="h-96 rounded-2xl bg-gray-100" />
                    <div className="h-96 rounded-2xl bg-gray-100" />
                </div>
            </div>
        );
    }

    const filterStatus = data?.filterStatus || "UNCONFIGURED";
    const filterHealth = data?.filterHealthPercent ?? 0;

    return (
        <div className="space-y-8 pb-10">
            {/* Page Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/20">
                            <Wrench className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black tracking-tight text-gray-900 uppercase">
                                System Maintenance
                            </h2>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                Tamper-Proof Semester Points Expiry & 6-Month Water Filter Lifecycle
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-3.5 py-2 text-xs font-black text-emerald-800">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <span>Credential-Protected Auto Enforcement</span>
                </div>
            </div>

            {/* Active Maintenance Alerts Banner */}
            {data?.alerts && data.alerts.length > 0 && (
                <div className="space-y-2.5">
                    {data.alerts.map((alert) => (
                        <div
                            key={alert.id}
                            className={`flex items-start gap-3.5 rounded-2xl border p-4 shadow-sm ${
                                alert.severity === "critical"
                                    ? "border-rose-200 bg-rose-50 text-rose-900"
                                    : alert.severity === "warning"
                                    ? "border-amber-200 bg-amber-50 text-amber-900"
                                    : "border-blue-200 bg-blue-50 text-blue-900"
                            }`}
                        >
                            <AlertTriangle
                                className={`h-5 w-5 shrink-0 mt-0.5 ${
                                    alert.severity === "critical"
                                        ? "text-rose-600"
                                        : alert.severity === "warning"
                                        ? "text-amber-600"
                                        : "text-blue-600"
                                }`}
                            />
                            <div className="flex-1">
                                <p className="text-sm font-black uppercase tracking-tight">
                                    {alert.title}
                                </p>
                                <p className="text-xs font-medium mt-0.5 opacity-90">
                                    {alert.message}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Top Summary KPI Cards */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                {/* KPI 1: Semester Countdown */}
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase tracking-wider text-gray-400">
                            Points Expiry Countdown
                        </span>
                        <Calendar className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-3xl font-black text-gray-900">
                            {data?.daysUntilReset !== null && data?.daysUntilReset !== undefined
                                ? `${data.daysUntilReset}d`
                                : "—"}
                        </span>
                        <span className="text-xs font-bold text-gray-500">
                            {data?.semesterResetDone
                                ? "Auto-Reset Completed"
                                : data?.semesterActive
                                ? "remaining until auto-reset"
                                : "No active schedule"}
                        </span>
                    </div>
                    <p className="mt-2 text-[11px] font-semibold text-gray-400">
                        {data?.semesterStartDate && data?.semesterEndDate
                            ? `${formatReadableDate(data.semesterStartDate)} → ${formatReadableDate(data.semesterEndDate)}`
                            : "Set semester dates below to display on Mobile App"}
                    </p>
                </div>

                {/* KPI 2: 6-Month Water Filter */}
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase tracking-wider text-gray-400">
                            Water Filter (6-Mo Life)
                        </span>
                        <Droplets className="h-5 w-5 text-cyan-600" />
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-3xl font-black text-gray-900">
                            {data?.filterDaysRemaining !== null && data?.filterDaysRemaining !== undefined
                                ? `${data.filterDaysRemaining}d`
                                : "—"}
                        </span>
                        <span className="text-xs font-bold text-gray-500">
                            {filterStatus === "UNCONFIGURED"
                                ? "Awaiting semester start"
                                : `${filterHealth}% filter life left`}
                        </span>
                    </div>
                    <p className="mt-2 text-[11px] font-semibold text-gray-400">
                        {data?.filterDueDate
                            ? `Replacement Due: ${formatReadableDate(data.filterDueDate)}`
                            : "Starts automatically with semester"}
                    </p>
                </div>

                {/* KPI 3: Student Points Pool */}
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase tracking-wider text-gray-400">
                            Active Student Points
                        </span>
                        <Sparkles className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-3xl font-black text-emerald-600">
                            {(data?.totalStudentPoints ?? 0).toFixed(1).replace(/\.0$/, "")}
                        </span>
                        <span className="text-xs font-bold text-gray-500">
                            pts across {data?.studentsWithPoints ?? 0} students
                        </span>
                    </div>
                    <p className="mt-2 text-[11px] font-semibold text-gray-400">
                        {data?.lastPointsResetAt
                            ? `Last Auto-Reset: ${formatReadableDate(data.lastPointsResetAt)}`
                            : "Automatically resets to 0 on End Semester Date"}
                    </p>
                </div>
            </div>

            {/* Main Two-Column Maintenance Controls */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Card 1: Semester Points Expiry Schedule */}
                <div className="flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                    <div>
                        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                    <Calendar className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-gray-900 uppercase tracking-tight">
                                        Semester Points Expiry Schedule
                                    </h3>
                                    <p className="text-xs font-medium text-gray-400">
                                        Synced inline next to &ldquo;Dashboard&rdquo; on the Mobile App Home tab
                                    </p>
                                </div>
                            </div>
                            <span
                                className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                                    data?.semesterActive
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                        : data?.semesterResetDone
                                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                                        : "bg-gray-100 text-gray-500"
                                }`}
                            >
                                {data?.semesterActive
                                    ? "Active"
                                    : data?.semesterResetDone
                                    ? "Reset Done"
                                    : "Unscheduled"}
                            </span>
                        </div>

                        <form onSubmit={handleOpenSemesterConfirm} className="mt-5 space-y-4">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-gray-500">
                                        Start Semester Date
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={startDateInput}
                                        onChange={(e) => setStartDateInput(e.target.value)}
                                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm font-bold text-gray-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-gray-500">
                                        End Semester Date (Auto-Reset)
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={endDateInput}
                                        onChange={(e) => setEndDateInput(e.target.value)}
                                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm font-bold text-gray-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                                    />
                                </div>
                            </div>

                            <label className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50/70 p-3.5 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={syncFilterTimer}
                                    onChange={(e) => setSyncFilterTimer(e.target.checked)}
                                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <div className="text-xs">
                                    <span className="font-bold text-gray-800 block">
                                        Start 6-Month Water Filter Timer with Semester Start Date
                                    </span>
                                    <span className="text-gray-500 font-medium">
                                        Automatically tracks the 6-month (180-day) water filter lifespan from the start of the semester.
                                    </span>
                                </div>
                            </label>

                            <div className="rounded-xl bg-blue-50/60 border border-blue-100 p-3.5 text-xs text-blue-900 space-y-1">
                                <div className="flex items-center gap-1.5 font-black uppercase tracking-wider text-[11px] text-blue-700">
                                    <Lock className="h-3.5 w-3.5" />
                                    <span>Tamper-Proof Server Enforcement</span>
                                </div>
                                <p className="text-[11px] leading-relaxed text-blue-800/90 font-medium">
                                    Points reset is executed automatically by authoritative server clock when the End Semester Date is reached. Updating these dates requires your Admin Password.
                                </p>
                            </div>

                            <button
                                type="submit"
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-md shadow-blue-600/20 transition-all hover:bg-blue-700 active:scale-[0.99]"
                            >
                                <Lock className="h-4 w-4" />
                                <span>Save & Authorize Semester Schedule</span>
                            </button>
                        </form>
                    </div>
                </div>

                {/* Card 2: 6-Month Water Filter Maintenance Tracker */}
                <div className="flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                    <div>
                        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
                                    <Droplets className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-gray-900 uppercase tracking-tight">
                                        Water Filter Maintenance (6 Months)
                                    </h3>
                                    <p className="text-xs font-medium text-gray-400">
                                        180-day filtration lifespan before required replacement
                                    </p>
                                </div>
                            </div>

                            <span
                                className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                                    filterStatus === "HEALTHY"
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                        : filterStatus === "DUE_SOON"
                                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                                        : filterStatus === "REPLACEMENT_REQUIRED"
                                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                                        : "bg-gray-100 text-gray-500"
                                }`}
                            >
                                {filterStatus === "HEALTHY"
                                    ? "Healthy"
                                    : filterStatus === "DUE_SOON"
                                    ? "Due Soon"
                                    : filterStatus === "REPLACEMENT_REQUIRED"
                                    ? "Replace Now"
                                    : "Not Started"}
                            </span>
                        </div>

                        <div className="mt-5 space-y-5">
                            {/* Health Progress Bar */}
                            <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-black uppercase tracking-wider text-gray-600">
                                        Filter Remaining Lifespan
                                    </span>
                                    <span className="text-sm font-black text-cyan-700">
                                        {data?.filterDaysRemaining !== null && data?.filterDaysRemaining !== undefined
                                            ? `${data.filterDaysRemaining} / 180 Days (${filterHealth}%)`
                                            : "Not Configured"}
                                    </span>
                                </div>
                                <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${
                                            filterStatus === "REPLACEMENT_REQUIRED"
                                                ? "bg-rose-500"
                                                : filterStatus === "DUE_SOON"
                                                ? "bg-amber-500"
                                                : "bg-gradient-to-r from-cyan-500 to-emerald-500"
                                        }`}
                                        style={{ width: `${filterStatus === "UNCONFIGURED" ? 0 : filterHealth}%` }}
                                    />
                                </div>
                            </div>

                            {/* Filter Timeline Details */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-xl border border-gray-100 bg-white p-3.5">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                                        Filter Cycle Started
                                    </p>
                                    <p className="mt-1 text-sm font-black text-gray-900">
                                        {formatReadableDate(data?.filterStartDate ?? null)}
                                    </p>
                                </div>
                                <div className="rounded-xl border border-gray-100 bg-white p-3.5">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                                        6-Month Replacement Due
                                    </p>
                                    <p className="mt-1 text-sm font-black text-cyan-700">
                                        {formatReadableDate(data?.filterDueDate ?? null)}
                                    </p>
                                </div>
                            </div>

                            <div className="rounded-xl bg-gray-50 border border-gray-100 p-3.5 text-xs text-gray-600 space-y-1">
                                <div className="flex items-center gap-1.5 font-bold text-gray-800">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                    <span>Automated Admin Notification Bell Alert</span>
                                </div>
                                <p className="text-[11px] leading-relaxed text-gray-500">
                                    When the water filter has 14 days or fewer remaining (or reaches 6 months), a priority alert automatically appears in the Admin top-bar notification bell.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-5 pt-2">
                        <button
                            type="button"
                            onClick={handleOpenFilterReplaceConfirm}
                            className="flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-black text-cyan-800 transition-all hover:bg-cyan-100 active:scale-[0.99]"
                        >
                            <RefreshCw className="h-4 w-4" />
                            <span>Confirm Water Filter Replaced (Reset 6-Month Timer)</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Audit Footer */}
            {data?.updatedByEmail && (
                <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white px-5 py-3.5 text-xs text-gray-400">
                    <span className="flex items-center gap-2 font-semibold">
                        <Clock className="h-4 w-4 text-gray-400" />
                        Last authorized update by <strong className="text-gray-700">{data.updatedByEmail}</strong> on{" "}
                        {formatReadableDate(data.updatedAt)}
                    </span>
                    <span className="font-mono text-[11px] text-gray-400">
                        Server Clock: {formatReadableDate(data.serverTime)}
                    </span>
                </div>
            )}

            {/* Admin Password Verification Modal */}
            {pendingAction && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
                    <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                                <Lock className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-gray-900">
                                    Admin Authorization Required
                                </h3>
                                <p className="text-xs font-medium text-gray-500">
                                    {pendingAction === "set_semester"
                                        ? "Enter your admin password to save the semester points expiry schedule."
                                        : "Enter your admin password to confirm water filter replacement."}
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleConfirmAction} className="mt-5 space-y-4">
                            {pendingAction === "set_semester" && (
                                <div className="rounded-xl bg-gray-50 p-3 text-xs text-gray-700 border border-gray-100 space-y-1">
                                    <p>
                                        <span className="font-bold">Semester Start:</span> {startDateInput}
                                    </p>
                                    <p>
                                        <span className="font-bold">Semester End (Auto-Reset):</span> {endDateInput}
                                    </p>
                                    <p>
                                        <span className="font-bold">6-Month Filter Timer:</span>{" "}
                                        {syncFilterTimer ? "Synced with Semester Start" : "Keep current filter timer"}
                                    </p>
                                </div>
                            )}

                            <div>
                                <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-gray-500">
                                    Admin Password
                                </label>
                                <input
                                    type="password"
                                    required
                                    autoFocus
                                    placeholder="Enter admin password..."
                                    value={adminPassword}
                                    onChange={(e) => {
                                        setAdminPassword(e.target.value);
                                        setModalError("");
                                    }}
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm font-bold text-gray-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                                />
                            </div>

                            {modalError && (
                                <p className="text-xs font-bold text-rose-600">{modalError}</p>
                            )}

                            <div className="flex items-center justify-end gap-2.5 pt-2">
                                <button
                                    type="button"
                                    disabled={submitting}
                                    onClick={() => {
                                        setPendingAction(null);
                                        setAdminPassword("");
                                        setModalError("");
                                    }}
                                    className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-black text-gray-600 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-black text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {submitting ? "Verifying..." : "Verify & Save"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
