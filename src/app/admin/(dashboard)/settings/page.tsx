"use client";

import { Bell, ShieldCheck, LogOut, Cpu, Radio } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { showToast } from "@/lib/toast";

export default function SettingsPage() {
    const { user, logout } = useAuth();
    const router = useRouter();

    const [newUserAlerts, setNewUserAlerts] = useState(true);

    // Load initial settings
    useEffect(() => {
        const savedSettings = localStorage.getItem("admin_settings");
        if (savedSettings) {
            try {
                const parsed = JSON.parse(savedSettings);
                if (typeof parsed.newUserAlerts === "boolean") {
                    setNewUserAlerts(parsed.newUserAlerts);
                }
            } catch (e) {
                console.error("Failed to load settings:", e);
            }
        }
    }, []);

    const handleToggleAlerts = () => {
        const nextState = !newUserAlerts;
        setNewUserAlerts(nextState);

        const currentSettings = (() => {
            try {
                return JSON.parse(localStorage.getItem("admin_settings") || "{}");
            } catch {
                return {};
            }
        })();

        const updated = { ...currentSettings, newUserAlerts: nextState };
        localStorage.setItem("admin_settings", JSON.stringify(updated));

        // Trigger storage event so AdminTopBar immediately updates
        window.dispatchEvent(new Event("storage"));

        showToast({
            text: nextState
                ? "Registration alerts enabled."
                : "Registration alerts disabled.",
            type: "success",
        });
    };

    const handleLogout = async () => {
        document.cookie =
            "adminAuthToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        await logout();
        router.push("/admin/login");
    };

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold text-gray-900">Settings</h2>
                <p className="mt-1 text-base text-gray-400">
                    Manage active admin preferences, live notification controls, and session status.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Real-time Notifications Configuration */}
                <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md">
                    <div className="border-b border-gray-100 px-6 py-5">
                        <div className="flex items-center gap-3">
                            <div className="rounded-xl bg-amber-500/10 p-2.5">
                                <Bell className="h-5 w-5 text-amber-500" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Live Notifications</h3>
                                <p className="text-[13px] text-gray-400">Control real-time system alerts</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6">
                        <div className="flex items-center justify-between gap-4 rounded-xl bg-gray-50/80 p-4 border border-gray-100">
                            <div>
                                <p className="text-[15px] font-bold text-gray-800">
                                    New Student Registration Alerts
                                </p>
                                <p className="text-[13px] text-gray-400 mt-0.5">
                                    Displays the top-bar notification bell and real-time popover when students register.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={handleToggleAlerts}
                                aria-label="Toggle new student registration alerts"
                                className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/25 ${
                                    newUserAlerts ? "bg-emerald-500" : "bg-gray-200"
                                }`}
                            >
                                <div
                                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                                        newUserAlerts ? "translate-x-5" : "translate-x-0.5"
                                    }`}
                                />
                            </button>
                        </div>
                    </div>
                </div>

                {/* System & Hardware Environment */}
                <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md">
                    <div className="border-b border-gray-100 px-6 py-5">
                        <div className="flex items-center gap-3">
                            <div className="rounded-xl bg-blue-500/10 p-2.5">
                                <Cpu className="h-5 w-5 text-blue-500" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">System Environment</h3>
                                <p className="text-[13px] text-gray-400">EcoDefill deployment details</p>
                            </div>
                        </div>
                    </div>

                    <div className="divide-y divide-gray-50 px-6">
                        <div className="flex items-center justify-between py-3.5">
                            <span className="text-[14px] font-medium text-gray-500">Institution</span>
                            <span className="text-[14px] font-bold text-gray-800">
                                Pambayang Dalubhasaan ng Marilao
                            </span>
                        </div>
                        <div className="flex items-center justify-between py-3.5">
                            <span className="text-[14px] font-medium text-gray-500">Hardware Integration</span>
                            <span className="text-[14px] font-bold text-gray-800">
                                ESP32 DevKit + Arduino Mega
                            </span>
                        </div>
                        <div className="flex items-center justify-between py-3.5">
                            <span className="text-[14px] font-medium text-gray-500">Cloud Sync Status</span>
                            <div className="flex items-center gap-2">
                                <Radio className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
                                <span className="text-[13px] font-bold text-emerald-600 uppercase tracking-wider">
                                    Connected
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Active Administrator Account */}
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-5">
                    <div className="rounded-xl bg-purple-500/10 p-2.5">
                        <ShieldCheck className="h-5 w-5 text-purple-500" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Active Administrator Account</h3>
                        <p className="text-[13px] text-gray-400">Current authenticated admin session</p>
                    </div>
                </div>

                <div className="p-6">
                    <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-emerald-500 text-lg font-black text-white shadow-md shadow-blue-500/20">
                                AD
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h4 className="text-[16px] font-bold text-gray-900">
                                        {user?.email || "System Administrator"}
                                    </h4>
                                    <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700">
                                        ADMIN
                                    </span>
                                </div>
                                <p className="text-[13px] text-gray-400 mt-0.5">
                                    Session authenticated via HttpOnly security token
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleLogout}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50/50 px-4 py-2.5 text-[14px] font-bold text-red-600 transition-all hover:bg-red-500 hover:text-white"
                        >
                            <LogOut className="h-4 w-4" />
                            Sign Out of Admin Console
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
