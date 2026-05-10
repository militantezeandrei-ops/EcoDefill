"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminBottomNav() {
    const pathname = usePathname();

    const navItems = [
        { path: "/admin/dashboard", icon: "dashboard", label: "Dashboard" },
        { path: "/admin/scanner", icon: "qr_code_scanner", label: "Scan QR" },
    ];

    return (
        <div className="fixed bottom-0 w-full max-w-md bg-white dark:bg-zinc-900 border-t border-gray-100 dark:border-zinc-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50 left-1/2 -translate-x-1/2 md:hidden">
            <div className={`grid grid-cols-${navItems.length} h-16`}>
                {navItems.map((item) => {
                    const isActive = pathname === item.path;
                    return (
                        <Link
                            key={item.path}
                            href={item.path}
                            className={`flex flex-col items-center justify-center gap-1 transition-colors ${isActive ? 'text-primary' : 'text-slate-400 dark:text-slate-500 hover:text-primary'}`}
                        >
                            <span className={`material-symbols-outlined text-[24px] ${isActive ? 'font-variation-settings-fill' : ''}`}>
                                {item.icon}
                            </span>
                            <span className={`text-[10px] ${isActive ? 'font-semibold' : 'font-medium'}`}>
                                {item.label}
                            </span>
                        </Link>
                    )
                })}
            </div>
        </div>
    );
}
