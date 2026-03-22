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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 w-full max-w-sm">
            <nav className="bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-1.5 flex items-center justify-between shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
                {navItems.map((item) => {
                    const isActive = pathname === item.path;
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.path}
                            href={item.path}
                            className="group relative flex flex-col items-center justify-center outline-none flex-1"
                            aria-label={item.label}
                        >
                            <div 
                                className={`flex items-center justify-center h-12 w-12 transition-all duration-300 rounded-full ${
                                    isActive 
                                        ? 'bg-white shadow-lg scale-100' 
                                        : 'hover:bg-white/10 active:scale-95 scale-90'
                                }`}
                            >
                                <Icon 
                                    size={20} 
                                    className={`transition-colors duration-300 ${
                                        isActive ? 'text-[#2f7f33] stroke-[2.5px]' : 'text-zinc-400 group-hover:text-zinc-200'
                                    }`} 
                                />
                            </div>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
