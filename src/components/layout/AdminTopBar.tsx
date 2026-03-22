"use client";

import { useAuth } from "@/hooks/useAuth";

export function AdminTopBar({ title = "Admin Panel" }: { title?: string }) {
    const { logout } = useAuth();

    return (
        <div className="sticky top-0 z-30 flex items-center justify-between bg-zinc-900 px-4 pb-2 pt-[calc(var(--safe-top)+12px)] text-white shadow-md">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-zinc-800">
                <span className="material-symbols-outlined text-2xl">admin_panel_settings</span>
            </div>

            <h2 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center">
                {title}
            </h2>

            <div className="flex w-12 items-center justify-end">
                <button
                    onClick={logout}
                    className="flex size-10 items-center justify-center overflow-hidden rounded-full bg-zinc-800 hover:bg-red-600 transition-colors"
                >
                    <span className="material-symbols-outlined text-2xl" title="Logout">logout</span>
                </button>
            </div>
        </div>
    );
}
