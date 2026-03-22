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

    // Show immediately with cached data, update when API responds
    const displayName = profile?.fullName || user?.email?.split('@')[0] || 'Student';
    const balance = profile?.balance ?? user?.balance ?? 0;

    return (
        <div className="flex-1 overflow-y-auto pb-8 w-full h-full">
            <div className="flex items-center justify-center px-6 pt-12 pb-4 sticky top-0 bg-white/90 dark:bg-[#0a0c10]/90 backdrop-blur-md z-10">
                <h1 className="text-xl font-bold tracking-tight text-center">Profile</h1>
            </div>

            <div className="flex flex-col items-center px-6 pt-6 pb-6">
                <div className="relative mb-5">
                    <div className="p-1 rounded-full bg-gradient-to-tr from-primary to-green-300">
                        <div
                            className="w-28 h-28 rounded-full bg-cover bg-center border-4 border-white dark:border-zinc-900"
                            style={{ backgroundImage: "url('https://ui-avatars.com/api/?name=" + encodeURIComponent(displayName) + "&background=2f7f33&color=fff&size=128')" }}
                        />
                    </div>
                    <button className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full shadow-lg border-2 border-white dark:border-zinc-900 hover:bg-primary/90 transition-colors">
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                </div>

                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{displayName}</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">{user?.email}</p>

                {/* Course / Year / Section Badges */}
                <div className="flex flex-wrap gap-2 mt-1 justify-center">
                    {profile?.course ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                            <span className="material-symbols-outlined text-[14px]">school</span>
                            {profile.course}
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-zinc-700 text-gray-400 animate-pulse w-16 h-6" />
                    )}
                    {profile?.yearLevel ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                            <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                            Year {profile.yearLevel}
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-zinc-700 text-gray-400 animate-pulse w-20 h-6" />
                    )}
                    {profile?.section ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                            <span className="material-symbols-outlined text-[14px]">group</span>
                            Section {profile.section}
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-zinc-700 text-gray-400 animate-pulse w-24 h-6" />
                    )}
                </div>
            </div>

            <div className="px-6 mb-6">
                <div className="bg-white dark:bg-[#111827] rounded-2xl p-5 shadow-[0_2px_15px_rgb(0,0,0,0.03)] dark:shadow-none border border-slate-100 dark:border-zinc-800/80 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Total Points</p>
                        <p className="text-3xl font-bold text-primary dark:text-green-400">{balance} <span className="text-sm font-normal text-slate-400">pts</span></p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center text-primary dark:text-green-400">
                        <span className="material-symbols-outlined text-2xl">eco</span>
                    </div>
                </div>
            </div>

            <div className="px-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Settings</h3>
                <div className="flex flex-col gap-3">
                    <button className="flex items-center w-full p-4 bg-white dark:bg-[#111827] rounded-2xl shadow-[0_2px_15px_rgb(0,0,0,0.03)] dark:shadow-none border border-slate-100 dark:border-zinc-800/80 hover:border-slate-200 dark:hover:border-zinc-700 transition-colors group">
                        <div className="h-10 w-10 rounded-full bg-slate-50 dark:bg-zinc-700 flex items-center justify-center text-slate-600 dark:text-slate-300 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                            <span className="material-symbols-outlined">person</span>
                        </div>
                        <span className="ml-4 text-base font-medium text-slate-700 dark:text-slate-200 flex-1 text-left">Edit Profile</span>
                        <span className="material-symbols-outlined text-slate-400">chevron_right</span>
                    </button>

                    <button className="flex items-center w-full p-4 bg-white dark:bg-[#111827] rounded-2xl shadow-[0_2px_15px_rgb(0,0,0,0.03)] dark:shadow-none border border-slate-100 dark:border-zinc-800/80 hover:border-slate-200 dark:hover:border-zinc-700 transition-colors group">
                        <div className="h-10 w-10 rounded-full bg-slate-50 dark:bg-zinc-700 flex items-center justify-center text-slate-600 dark:text-slate-300 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                            <span className="material-symbols-outlined">help</span>
                        </div>
                        <span className="ml-4 text-base font-medium text-slate-700 dark:text-slate-200 flex-1 text-left">Help & Support</span>
                        <span className="material-symbols-outlined text-slate-400">chevron_right</span>
                    </button>

                    <button
                        onClick={logout}
                        className="w-full mt-4 p-4 rounded-2xl border border-red-100 bg-red-50 dark:bg-red-900/10 dark:border-red-900/30 text-red-600 dark:text-red-400 font-bold hover:bg-red-100 dark:hover:bg-red-900/20 shadow-[0_2px_15px_rgb(0,0,0,0.03)] dark:shadow-none transition-colors flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined">logout</span>
                        Logout
                    </button>
                </div>
                <p className="text-center text-xs text-slate-400 mt-6 mb-4">Version 1.0.0 • EcoDefill App</p>
            </div>
        </div>
    );
}
