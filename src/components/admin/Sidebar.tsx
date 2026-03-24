"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
    LayoutDashboard,
    Users,
    Recycle,
    Receipt,
    BarChart3,
    Settings,
    LogOut,
} from "lucide-react";

const navGroups = [
    {
        label: "Main",
        items: [
            { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard, badge: null },
        ],
    },
    {
        label: "Data",
        items: [
            { label: "Users", href: "/admin/users", icon: Users, badge: "●" },
            { label: "Recycling", href: "/admin/recycling", icon: Recycle, badge: "●" },
            { label: "Transactions", href: "/admin/transactions", icon: Receipt, badge: "●" },
        ],
    },
    {
        label: "System",
        items: [
            { label: "Reports", href: "/admin/reports", icon: BarChart3, badge: null },
            { label: "Settings", href: "/admin/settings", icon: Settings, badge: null },
        ],
    },
];

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = () => {
        document.cookie =
            "adminAuthToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        router.push("/admin/login");
    };

    return (
        <aside className="flex h-screen w-64 shrink-0 flex-col bg-zinc-950 text-white shadow-2xl z-40">
            {/* Brand */}
            <div className="flex items-center gap-3 px-5 pt-6 pb-6">
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white p-1 shadow-md">
                    <Image 
                        src="/images/pdm-logo.png" 
                        alt="PDM Logo" 
                        width={36} 
                        height={36} 
                        className="object-contain"
                    />
                </div>
                <div>
                    <h1 className="text-[18px] font-bold tracking-tight text-white leading-tight">EcoDefill</h1>
                    <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest">Admin Console</p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-5 px-3 overflow-y-auto">
                {navGroups.map((group) => (
                    <div key={group.label}>
                        <p className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-500">
                            {group.label}
                        </p>
                        <div className="space-y-0.5">
                            {group.items.map((item) => {
                                const isActive = pathname === item.href;
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        prefetch={true}
                                        className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-semibold transition-all duration-200 ${
                                            isActive
                                                ? "bg-zinc-900 text-[#F4C430]"
                                                : "text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200"
                                        }`}
                                    >
                                        {isActive && (
                                            <div className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[#F4C430] shadow-[0_0_10px_rgba(244,196,48,0.4)]" />
                                        )}
                                        <Icon className={`h-4 w-4 transition-colors ${isActive ? "text-[#F4C430]" : "text-zinc-500 group-hover:text-zinc-300"}`} />
                                        <span className="flex-1">{item.label}</span>
                                        {item.badge && (
                                            <div className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-[#F4C430]" : "bg-emerald-500"} animate-pulse`} />
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Profile & Logout */}
            <div className="border-t border-zinc-900 px-4 py-4 bg-zinc-950">
                <div className="mb-2.5 flex items-center gap-3 px-1">
                    <div className="relative">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-sm font-bold text-white ring-2 ring-zinc-800">
                            A
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-zinc-950 bg-[#16A34A]" />
                    </div>
                    <div>
                        <p className="text-[14px] font-bold text-white">System Admin</p>
                        <p className="text-[12px] font-medium text-zinc-500">Marilao Command</p>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[14px] font-bold text-red-400/80 transition-all hover:bg-red-500/10 hover:text-red-400"
                >
                    <LogOut className="h-4 w-4" />
                    Logout
                </button>
            </div>
        </aside>
    );
}
