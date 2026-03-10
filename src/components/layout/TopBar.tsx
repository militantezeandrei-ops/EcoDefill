"use client";

import { useAuth } from "@/hooks/useAuth";

export function TopBar({ title = "PDM Eco-Rewards" }: { title?: string }) {
    const { logout } = useAuth();

    return (
        <div className="flex items-center bg-white dark:bg-zinc-900 p-4 pb-2 justify-between sticky top-0 z-10 border-b border-gray-100 dark:border-zinc-800">
            <div className="text-slate-900 dark:text-white flex size-12 shrink-0 items-center justify-center rounded-full bg-gray-50 dark:bg-zinc-800">
                <span className="material-symbols-outlined text-2xl">menu</span>
            </div>

            <h2 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">
                {title}
            </h2>

            <div className="flex w-12 items-center justify-end">
                <button
                    onClick={logout}
                    className="flex size-10 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-gray-50 dark:bg-zinc-800 text-slate-900 dark:text-white hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
                >
                    <span className="material-symbols-outlined text-2xl" title="Logout">logout</span>
                </button>
            </div>
        </div>
    );
}
