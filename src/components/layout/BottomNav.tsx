"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Gift, History, User } from "lucide-react";

export function BottomNav() {
    const pathname = usePathname();

    const navItems = [
        { path: "/dashboard", icon: Home, label: "Home" },
        { path: "/rewards", icon: Gift, label: "Rewards" },
        { path: "/history", icon: History, label: "History" },
        { path: "/profile", icon: User, label: "Profile" },
    ];

    return (
        <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[calc(var(--safe-bottom)+8px)]">
            <nav className="mx-auto w-full rounded-full border border-slate-200/70 bg-white/88 px-1.5 py-0.5 shadow-[0_12px_30px_rgba(15,23,42,0.2)] backdrop-blur-xl dark:border-zinc-700/70 dark:bg-zinc-900/88">
                <div className="flex items-center justify-between gap-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.path;
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.path}
                            href={item.path}
                            className={`group relative flex flex-col items-center justify-center outline-none flex-1 rounded-full border px-2 py-1 transition-all active:scale-95 ${isActive ? "border-[#7dcfff] bg-[#8FD8FF]/35 shadow-[0_6px_16px_rgba(143,216,255,0.3)]" : "border-transparent bg-white/40 hover:border-slate-300 hover:bg-white/75 dark:bg-zinc-800/30 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/70"}`}
                            aria-label={item.label}
                        >
                            <div
                                className={`flex size-7 items-center justify-center rounded-full transition-all duration-300 ${isActive
                                    ? 'text-[#36B5F0]'
                                    : 'text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200'
                                    }`}
                            >
                                <Icon
                                    size={18}
                                    strokeWidth={2.5}
                                    className="transition-all duration-300"
                                />
                            </div>
                            <span className={`mt-0.5 text-[9px] font-semibold leading-none transition-all duration-300 ${isActive ? 'text-[#36B5F0]' : 'text-slate-500 dark:text-zinc-500'
                                }`}>
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
                </div>
            </nav>
        </div>
    );
}
