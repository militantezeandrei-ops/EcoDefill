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
        <div className="fixed bottom-2 left-1/2 -translate-x-1/2 z-50 px-4 w-full max-w-sm">
            <nav className="bg-zinc-900/90 backdrop-blur-2xl border border-black/10 rounded-[1.5rem] p-1 flex items-center justify-between shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                {navItems.map((item) => {
                    const isActive = pathname === item.path;
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.path}
                            href={item.path}
                            className="group relative flex flex-col items-center justify-center outline-none flex-1 py-1"
                            aria-label={item.label}
                        >
                            <div
                                className={`flex items-center justify-center px-4 py-1.5 transition-all duration-300 rounded-2xl ${isActive
                                        ? 'bg-emerald-500/20 text-emerald-400 shadow-sm'
                                        : 'text-zinc-500 hover:text-zinc-300'
                                    }`}
                            >
                                <Icon
                                    size={22}
                                    className="transition-all duration-300"
                                />
                            </div>
                            <span className={`text-[10px] uppercase tracking-tighter font-black mt-0.5 transition-all duration-300 ${isActive ? 'text-emerald-400' : 'text-zinc-600'
                                }`}>
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
