"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Gift, History, Trophy, User } from "lucide-react";

export function BottomNav() {
    const pathname = usePathname();

    const navItems = [
        { path: "/dashboard", icon: Home, label: "Home" },
        { path: "/rewards", icon: Gift, label: "Rewards" },
        { path: "/history", icon: History, label: "History" },
        { path: "/ranking", icon: Trophy, label: "Ranking" },
        { path: "/profile", icon: User, label: "Profile" },
    ];

    return (
        <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(var(--safe-bottom)+4px)]">
            <nav className="mx-auto w-full max-w-sm overflow-hidden rounded-[24px] border border-slate-200/70 bg-white shadow-[0_-4px_14px_rgba(0,0,0,0.05),0_8px_20px_rgba(0,0,0,0.08)] dark:bg-zinc-900">
                <div className="flex h-16 items-center justify-around px-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.path;
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                className={`group relative flex min-w-0 flex-1 flex-col items-center justify-center transition-all duration-300 active:scale-95 ${isActive ? "px-3.5" : "px-2"}`}
                                aria-label={item.label}
                            >
                                {isActive && (
                                    <div className="absolute inset-x-1 inset-y-1 rounded-full bg-emerald-600/10 transition-all duration-300" />
                                )}
                                <div className="relative z-10 flex flex-col items-center gap-0.5 py-1.5 px-1">
                                    <Icon
                                        size={18}
                                        strokeWidth={isActive ? 2.5 : 2}
                                        className={`transition-all ${isActive ? "text-emerald-600" : "text-slate-400 group-hover:text-slate-600"}`}
                                    />
                                    <span
                                        className={`text-[8px] font-black uppercase tracking-[0.18em] transition-all ${isActive ? "text-emerald-600" : "text-slate-400 opacity-80"}`}
                                    >
                                        {item.label}
                                    </span>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}
