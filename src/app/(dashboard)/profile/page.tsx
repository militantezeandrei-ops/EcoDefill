"use client";

import { useAuth } from "@/hooks/useAuth";

export default function ProfilePage() {
    const { user, logout } = useAuth();

    return (
        <div className="flex-1 overflow-y-auto pb-8 w-full h-full">
            <div className="flex items-center justify-center px-6 pt-12 pb-4 sticky top-0 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md z-10">
                <h1 className="text-xl font-bold tracking-tight text-center">Profile</h1>
            </div>

            <div className="flex flex-col items-center px-6 pt-6 pb-8">
                <div className="relative mb-6">
                    <div className="p-1 rounded-full bg-gradient-to-tr from-primary to-green-300">
                        <div
                            className="w-32 h-32 rounded-full bg-cover bg-center border-4 border-white dark:border-zinc-900"
                            style={{ backgroundImage: "url('https://ui-avatars.com/api/?name=" + (user?.email || "Student") + "&background=random')" }}
                        ></div>
                    </div>
                    <button className="absolute bottom-1 right-1 bg-primary text-white p-2 rounded-full shadow-lg border-2 border-white dark:border-zinc-900 hover:bg-primary/90 transition-colors">
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                    </button>
                </div>

                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Student Account</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">{user?.email}</p>

                <div className="flex gap-2 mt-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary dark:bg-primary/20 dark:text-green-300">
                        ECO-WARRIOR
                    </span>
                </div>
            </div>

            <div className="px-6 mb-8">
                <div className="bg-white dark:bg-zinc-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-zinc-700 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Total Lifetime Points</p>
                        <p className="text-3xl font-bold text-primary dark:text-green-400">{user?.balance || 0} <span className="text-sm font-normal text-slate-400">pts</span></p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center text-primary dark:text-green-400">
                        <span className="material-symbols-outlined text-2xl">eco</span>
                    </div>
                </div>
            </div>

            <div className="px-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Settings</h3>
                <div className="flex flex-col gap-3">
                    <button className="flex items-center w-full p-4 bg-white dark:bg-zinc-800 rounded-xl border border-slate-100 dark:border-zinc-700 hover:border-primary/30 transition-colors group">
                        <div className="h-10 w-10 rounded-full bg-slate-50 dark:bg-zinc-700 flex items-center justify-center text-slate-600 dark:text-slate-300 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                            <span className="material-symbols-outlined">person</span>
                        </div>
                        <span className="ml-4 text-base font-medium text-slate-700 dark:text-slate-200 flex-1 text-left">Edit Profile</span>
                        <span className="material-symbols-outlined text-slate-400">chevron_right</span>
                    </button>

                    <button className="flex items-center w-full p-4 bg-white dark:bg-zinc-800 rounded-xl border border-slate-100 dark:border-zinc-700 hover:border-primary/30 transition-colors group">
                        <div className="h-10 w-10 rounded-full bg-slate-50 dark:bg-zinc-700 flex items-center justify-center text-slate-600 dark:text-slate-300 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                            <span className="material-symbols-outlined">help</span>
                        </div>
                        <span className="ml-4 text-base font-medium text-slate-700 dark:text-slate-200 flex-1 text-left">Help & Support</span>
                        <span className="material-symbols-outlined text-slate-400">chevron_right</span>
                    </button>

                    <button
                        onClick={logout}
                        className="w-full mt-4 p-4 rounded-xl border border-red-100 bg-red-50 dark:bg-red-900/20 dark:border-red-900/30 text-red-600 dark:text-red-400 font-semibold hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center justify-center gap-2"
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
