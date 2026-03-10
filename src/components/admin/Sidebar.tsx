"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    LayoutDashboard,
    Users,
    Recycle,
    Receipt,
    BarChart3,
    Settings,
    LogOut,
    Leaf,
} from "lucide-react";

const navGroups = [
    {
        label: "Main",
        items: [
            { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
        ],
    },
    {
        label: "Data",
        items: [
            { label: "Users", href: "/admin/users", icon: Users },
            { label: "Recycling", href: "/admin/recycling", icon: Recycle },
            { label: "Transactions", href: "/admin/transactions", icon: Receipt },
        ],
    },
    {
        label: "System",
        items: [
            { label: "Reports", href: "/admin/reports", icon: BarChart3 },
            { label: "Settings", href: "/admin/settings", icon: Settings },
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
        <aside className="flex h-screen w-[272px] shrink-0 flex-col bg-gradient-to-b from-[#0f1117] via-[#13151d] to-[#1a1d25] text-white">
            {/* Brand */}
            <div className="flex items-center gap-4 px-7 pt-8 pb-8">
                <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/20">
                    <Leaf className="h-5 w-5 text-white" />
                    <div className="absolute -inset-1 rounded-2xl bg-emerald-500/20 blur-md" />
                </div>
                <div>
                    <h1 className="text-lg font-bold tracking-tight text-white">EcoDefill</h1>
                    <p className="text-[11px] font-medium text-gray-500">Admin Console</p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-6 px-4 mt-1 overflow-y-auto">
                {navGroups.map((group) => (
                    <div key={group.label}>
                        <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-gray-600">
                            {group.label}
                        </p>
                        <div className="space-y-1">
                            {group.items.map((item) => {
                                const isActive = pathname === item.href;
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        prefetch={true}
                                        className={`group relative flex items-center gap-3 rounded-xl px-4 py-2.5 text-[13px] font-medium transition-all duration-200 ${
                                            isActive
                                                ? "bg-emerald-500/12 text-emerald-400 shadow-sm shadow-emerald-500/5"
                                                : "text-gray-400 hover:bg-white/[0.04] hover:text-gray-200"
                                        }`}
                                    >
                                        {/* Active indicator bar */}
                                        {isActive && (
                                            <div className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
                                        )}
                                        <Icon className={`h-[18px] w-[18px] transition-colors ${isActive ? "text-emerald-400" : "text-gray-500 group-hover:text-gray-300"}`} />
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Profile & Logout */}
            <div className="border-t border-white/[0.06] px-5 py-5">
                <div className="mb-3 flex items-center gap-3 px-1">
                    <div className="relative">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400/20 to-emerald-600/20 text-sm font-bold text-emerald-400 ring-2 ring-emerald-500/20">
                            A
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#13151d] bg-emerald-400" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-200">Admin</p>
                        <p className="text-[11px] text-gray-500">System Manager</p>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-red-400/80 transition-all hover:bg-red-500/8 hover:text-red-400"
                >
                    <LogOut className="h-4 w-4" />
                    Logout
                </button>
            </div>
        </aside>
    );
}
