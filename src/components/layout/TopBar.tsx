"use client";

import { useAuth } from "@/hooks/useAuth";

export function TopBar({ title = "EcoDefill" }: { title?: string }) {
    const { logout } = useAuth();

    return (
        <div className="sticky top-0 z-30 flex items-center justify-between bg-transparent px-4 pb-2 pt-[calc(var(--safe-top)+10px)]">
            {/* Placeholder left icon for symmetry */}
            <div className="size-10 shrink-0" />

            <h2 className="flex-1 text-center text-base font-black tracking-tight text-slate-900 dark:text-white">
                {title}
            </h2>

            <button
                onClick={logout}
                className="flex size-10 cursor-pointer items-center justify-center rounded-full bg-white/70 text-slate-500 shadow-sm backdrop-blur-md transition-colors hover:bg-white active:scale-95 dark:bg-zinc-800/70 dark:text-zinc-300"
                aria-label="Logout"
            >
                <span className="material-symbols-outlined text-[20px]">logout</span>
            </button>
        </div>
    );
}
