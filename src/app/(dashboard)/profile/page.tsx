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

    return (
        <div className="flex-1 overflow-y-auto bg-transparent pb-8">
            <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/92 px-5 py-4 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/92">
                <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Profile</h1>
                <p className="text-sm text-slate-500">{user?.email}</p>
            </header>

            <main className="space-y-4 px-4 py-5">
                <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/85">
                    <div className="flex items-center gap-4">
                        <div
                            className="h-16 w-16 rounded-2xl bg-cover bg-center ring-2 ring-primary/30"
                            style={{ backgroundImage: "url('https://ui-avatars.com/api/?name=" + encodeURIComponent(displayName) + "&background=2f7f33&color=fff&size=128')" }}
                        />
                        <div>
                            <p className="text-lg font-semibold text-slate-900 dark:text-white">{displayName}</p>
                            <p className="text-sm text-slate-500">
                                {[profile?.course, profile?.yearLevel ? `Year ${profile.yearLevel}` : null, profile?.section ? `Sec ${profile.section}` : null]
                                    .filter(Boolean)
                                    .join(" • ") || "Student"}
                            </p>
                        </div>
                    </div>
                </section>

                <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/85">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Total Points</p>
                    <p className="mt-2 text-4xl font-bold text-primary">{balance} <span className="text-lg font-medium text-slate-500">pts</span></p>
                </section>

                <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/85">
                    <button className="flex w-full items-center justify-between px-4 py-4 text-left text-sm font-medium text-slate-800 transition hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-zinc-800">
                        <span className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-slate-500">person</span>
                            Edit Profile
                        </span>
                        <span className="material-symbols-outlined text-slate-400">chevron_right</span>
                    </button>
                    <button className="flex w-full items-center justify-between border-t border-slate-100 px-4 py-4 text-left text-sm font-medium text-slate-800 transition hover:bg-slate-50 dark:border-zinc-800 dark:text-slate-100 dark:hover:bg-zinc-800">
                        <span className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-slate-500">help</span>
                            Help & Support
                        </span>
                        <span className="material-symbols-outlined text-slate-400">chevron_right</span>
                    </button>
                    <button
                        onClick={logout}
                        className="flex w-full items-center justify-between border-t border-slate-100 px-4 py-4 text-left text-sm font-semibold text-rose-500 transition hover:bg-rose-50 dark:border-zinc-800 dark:hover:bg-rose-900/20"
                    >
                        <span className="flex items-center gap-3">
                            <span className="material-symbols-outlined">logout</span>
                            Logout
                        </span>
                        <span className="material-symbols-outlined">chevron_right</span>
                    </button>
                </section>

                <p className="pt-2 text-center text-xs text-slate-400">Version 1.0.0 • EcoDefill App</p>
            </main>
        </div>
    );
}
