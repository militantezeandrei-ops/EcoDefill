"use client";

import { useAuth } from "@/hooks/useAuth";
import { useCachedFetch } from "@/hooks/useCachedFetch";

interface UserProfile {
    balance: number;
    fullName: string | null;
    course: string | null;
    yearLevel: string | null;
    section: string | null;
}

export default function ProfilePage() {
    const { user, logout } = useAuth();
    const { data: profile } = useCachedFetch<UserProfile>("/api/user-balance");

    const displayName = profile?.fullName || user?.email?.split("@")[0] || "Student";
    const balance = profile?.balance ?? user?.balance ?? 0;
    const subtitle = [
        profile?.course,
        profile?.yearLevel ? `Year ${profile.yearLevel}` : null,
        profile?.section ? `Sec ${profile.section}` : null,
    ]
        .filter(Boolean)
        .join(" · ") || "Student";

    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=059669&color=fff&size=128&bold=true`;

    return (
        <div className="flex-1 overflow-y-auto pb-32">
            {/* Avatar Hero */}
            <div className="relative flex flex-col items-center pb-4 pt-[calc(var(--safe-top)+44px)]">
                <div className="h-16 w-16 overflow-hidden rounded-2xl shadow-[0_8px_24px_rgba(5,150,105,0.2)] ring-4 ring-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                </div>
                <h1 className="mt-2.5 text-lg font-black text-slate-900">{displayName}</h1>
                <p className="text-[11px] font-bold text-slate-400">{subtitle}</p>
                <p className="text-[10px] text-slate-300">{user?.email}</p>
            </div>

            <div className="px-4 space-y-3">
                {/* Balance Card */}
                <div className="overflow-hidden rounded-[20px] bg-gradient-to-br from-emerald-500 to-teal-700 px-5 py-4 text-white shadow-[0_12px_24px_rgba(5,150,105,0.25)]">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-100/80">Current Points</p>
                    <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-3xl font-black tracking-tight">{balance}</span>
                        <span className="text-xs font-black text-emerald-200">pts</span>
                    </div>
                </div>

                {/* Actions */}
                <div className="app-card p-0 overflow-hidden divide-y divide-slate-50">
                    {[
                        { icon: "person", label: "Edit Profile", action: undefined },
                        { icon: "help", label: "Help & Support", action: undefined },
                    ].map((item) => (
                        <button
                            key={item.label}
                            onClick={item.action}
                            className="tap-target flex w-full items-center justify-between px-4 py-3 text-left transition-colors active:bg-slate-50"
                        >
                            <span className="flex items-center gap-3">
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50">
                                    <span className="material-symbols-outlined text-[16px] text-slate-500">{item.icon}</span>
                                </div>
                                <span className="text-xs font-black text-slate-700">{item.label}</span>
                            </span>
                            <span className="material-symbols-outlined text-[16px] text-slate-300">chevron_right</span>
                        </button>
                    ))}

                    <button
                        onClick={logout}
                        className="tap-target flex w-full items-center justify-between px-4 py-3 text-left transition-colors active:bg-rose-50"
                    >
                        <span className="flex items-center gap-3">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50/70">
                                <span className="material-symbols-outlined text-[16px] text-rose-500">logout</span>
                            </div>
                            <span className="text-xs font-black text-rose-500">Logout</span>
                        </span>
                        <span className="material-symbols-outlined text-[16px] text-rose-300">chevron_right</span>
                    </button>
                </div>

                <p className="pt-2 text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest">Version 1.0.0 · EcoDefill</p>
            </div>
        </div>
    );
}
