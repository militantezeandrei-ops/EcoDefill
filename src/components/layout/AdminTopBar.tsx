"use client";

import { Calendar, Clock, Wifi, Bell, Wrench, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";

interface StudentRegistration {
    id: string;
    email: string;
    fullName: string | null;
    course: string | null;
    yearLevel: string | null;
    section: string | null;
    createdAt: string;
}

interface MaintenanceAlert {
    id: string;
    severity: "critical" | "warning" | "info";
    title: string;
    message: string;
    createdAt: string;
}

export function AdminTopBar() {
    const [time, setTime] = useState(new Date());
    const [students, setStudents] = useState<StudentRegistration[]>([]);
    const [maintenanceAlerts, setMaintenanceAlerts] = useState<MaintenanceAlert[]>([]);
    const [clearedAt, setClearedAt] = useState<string | null>(null);
    const [newUserAlertsEnabled, setNewUserAlertsEnabled] = useState(true);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Load initial config from localStorage
    useEffect(() => {
        const savedSettings = localStorage.getItem("admin_settings");
        if (savedSettings) {
            try {
                const parsed = JSON.parse(savedSettings);
                setNewUserAlertsEnabled(parsed.newUserAlerts !== false);
            } catch (e) {
                console.error(e);
            }
        }

        const savedCleared = localStorage.getItem("admin_notifications_cleared_at");
        setClearedAt(savedCleared);
    }, []);

    // Listen for storage changes to sync options
    useEffect(() => {
        const handleStorageChange = () => {
            const savedCleared = localStorage.getItem("admin_notifications_cleared_at");
            setClearedAt(savedCleared);
            
            const savedSettings = localStorage.getItem("admin_settings");
            if (savedSettings) {
                try {
                    const parsed = JSON.parse(savedSettings);
                    setNewUserAlertsEnabled(parsed.newUserAlerts !== false);
                } catch {}
            }
        };

        window.addEventListener("storage", handleStorageChange);
        const interval = setInterval(handleStorageChange, 1000);

        return () => {
            window.removeEventListener("storage", handleStorageChange);
            clearInterval(interval);
        };
    }, []);

    // Fetch registrations + piggybacked maintenance alerts in a single efficient call
    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const res = await fetch("/api/admin/notifications/registrations");
                if (res.ok) {
                    const data = await res.json();
                    setStudents(data.students || []);
                    setMaintenanceAlerts(data.maintenanceAlerts || []);
                }
            } catch (e) {
                console.error(e);
            }
        };

        fetchNotifications();
        const interval = setInterval(fetchNotifications, 15000);
        return () => clearInterval(interval);
    }, []);

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleOutsideClick = (e: MouseEvent) => {
            if (isOpen && !(e.target as Element).closest("#admin-notifications-dropdown-container")) {
                setIsOpen(false);
            }
        };
        document.addEventListener("click", handleOutsideClick);
        return () => document.removeEventListener("click", handleOutsideClick);
    }, [isOpen]);

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

    const handleClearNotifications = (e: React.MouseEvent) => {
        e.stopPropagation();
        const nowStr = new Date().toISOString();
        localStorage.setItem("admin_notifications_cleared_at", nowStr);
        setClearedAt(nowStr);
    };

    // Filter registrations
    const filteredStudents = newUserAlertsEnabled
        ? students.filter((student) => {
              if (!clearedAt) return true;
              return new Date(student.createdAt) > new Date(clearedAt);
          })
        : [];

    const totalAlertCount = maintenanceAlerts.length + filteredStudents.length;
    const hasCriticalMaintenance = maintenanceAlerts.some((a) => a.severity === "critical");

    const timeAgo = (dateString: string) => {
        const now = new Date();
        const date = new Date(dateString);
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return "just now";
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
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
                        <h2 className="text-[14px] md:text-[16px] font-black tracking-tight text-gray-900 leading-none truncate max-w-[150px] md:max-w-none">
                            Pambayang Dalubhasaan ng Marilao
                        </h2>
                        <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-600 mt-1 md:mt-1.5">
                            EcoDefill Admin System
                        </span>
                    </div>
                </div>

                <div className="hidden lg:block h-8 w-px bg-gray-100" />

                {/* Live Clock & Date */}
                <div className="hidden lg:flex items-center gap-8">
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

            {/* Right: Notifications & System Status */}
            <div className="flex items-center gap-4">
                {/* Notification Dropdown Container */}
                {(newUserAlertsEnabled || maintenanceAlerts.length > 0) && (
                    <div id="admin-notifications-dropdown-container" className="relative">
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className={`relative flex h-10 w-10 items-center justify-center rounded-xl border transition-colors focus:outline-none ${
                                hasCriticalMaintenance
                                    ? "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
                                    : "border-gray-100 bg-white hover:bg-gray-50 text-gray-500"
                            }`}
                            aria-label="Toggle notifications"
                        >
                            <Bell className={`h-5 w-5 ${hasCriticalMaintenance ? "text-rose-600" : "text-gray-600"}`} />
                            {totalAlertCount > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white shadow-sm ring-2 ring-white animate-bounce">
                                    {totalAlertCount}
                                </span>
                            )}
                        </button>

                        {/* Dropdown Card */}
                        {isOpen && (
                            <div className="absolute right-0 mt-3 w-80 origin-top-right rounded-2xl border border-gray-100 bg-white shadow-xl ring-1 ring-black/5 focus:outline-none z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="border-b border-gray-100 px-4 py-3 flex items-center justify-between">
                                    <span className="text-xs font-black uppercase tracking-wider text-gray-500">
                                        System & Alerts
                                    </span>
                                    {totalAlertCount > 0 && (
                                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-700">
                                            {totalAlertCount} Active
                                        </span>
                                    )}
                                </div>
                                <div className="max-h-72 overflow-y-auto divide-y divide-gray-50 custom-scrollbar">
                                    {/* Maintenance Alerts Section */}
                                    {maintenanceAlerts.map((alert) => (
                                        <Link
                                            key={alert.id}
                                            href="/admin/maintenance"
                                            onClick={() => setIsOpen(false)}
                                            className={`block px-4 py-3 transition-colors ${
                                                alert.severity === "critical"
                                                    ? "bg-rose-50/70 hover:bg-rose-50"
                                                    : alert.severity === "warning"
                                                    ? "bg-amber-50/60 hover:bg-amber-50"
                                                    : "bg-blue-50/40 hover:bg-blue-50/70"
                                            }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div
                                                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-black ${
                                                        alert.severity === "critical"
                                                            ? "bg-rose-500/15 text-rose-600"
                                                            : alert.severity === "warning"
                                                            ? "bg-amber-500/15 text-amber-600"
                                                            : "bg-blue-500/15 text-blue-600"
                                                    }`}
                                                >
                                                    {alert.severity === "critical" ? (
                                                        <AlertTriangle className="h-4 w-4" />
                                                    ) : (
                                                        <Wrench className="h-4 w-4" />
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className="text-[12px] font-black text-gray-900">
                                                            {alert.title}
                                                        </p>
                                                        <span className="shrink-0 rounded bg-white/80 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-gray-600 border border-gray-200/60">
                                                            Maintenance
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-gray-600 mt-0.5 leading-snug">
                                                        {alert.message}
                                                    </p>
                                                    <p className="text-[10px] font-bold text-blue-600 mt-1">
                                                        Open Maintenance Tab →
                                                    </p>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}

                                    {/* Student Registration Alerts */}
                                    {filteredStudents.length > 0 ? (
                                        filteredStudents.map((student) => (
                                            <div key={student.id} className="px-4 py-3 hover:bg-gray-50/50 flex items-start gap-3 min-w-0 transition-colors">
                                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 text-[11px] font-black">
                                                    {student.fullName ? student.fullName[0].toUpperCase() : student.email[0].toUpperCase()}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[13px] font-bold text-gray-900 truncate">
                                                        {student.fullName || "Unregistered"}
                                                    </p>
                                                    <p className="text-[11px] text-gray-400 truncate">
                                                        {student.email}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400 truncate mt-0.5">
                                                        {student.course || "N/A"} {student.yearLevel ? `${student.yearLevel.replace(/[^0-9]/g, '')} Year` : ""} {student.section ? `- ${student.section}` : ""}
                                                    </p>
                                                    <p className="text-[9px] font-bold text-emerald-600 mt-1">
                                                        {timeAgo(student.createdAt)}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        maintenanceAlerts.length === 0 && (
                                            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 mb-2">
                                                    <span className="material-symbols-outlined text-[20px]">done_all</span>
                                                </div>
                                                <p className="text-xs font-bold text-gray-700">No new alerts</p>
                                                <p className="text-[10px] text-gray-400 mt-0.5">You are completely up-to-date.</p>
                                            </div>
                                        )
                                    )}
                                </div>
                                {filteredStudents.length > 0 && (
                                    <div className="border-t border-gray-100 p-2 flex justify-end">
                                        <button
                                            onClick={handleClearNotifications}
                                            className="w-full text-center rounded-xl bg-gray-50 hover:bg-gray-100 py-2 text-xs font-black text-gray-600 transition-colors"
                                        >
                                            Clear Registration Alerts
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

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
