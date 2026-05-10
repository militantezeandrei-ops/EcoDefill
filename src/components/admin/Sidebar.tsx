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
        <aside className="hidden md:flex h-screen w-64 shrink-0 flex-col bg-white border-r border-gray-200 text-gray-900 shadow-sm z-40">
            {/* Brand */}
            <div className="flex items-center gap-3 px-6 pt-8 pb-8">
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-emerald-500 p-0.5 shadow-lg shadow-blue-500/20">
                    <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-white p-1">
                        <Image 
                            src="/images/pdm-logo.png" 
                            alt="PDM Logo" 
                            width={32} 
                            height={32} 
                            className="object-contain"
                        />
                    </div>
                </div>
                <div>
                    <h1 className="text-[18px] font-black tracking-tight text-gray-900 leading-none">EcoDefill</h1>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Admin Console</p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-6 px-4 overflow-y-auto">
                {navGroups.map((group) => (
                    <div key={group.label}>
                        <p className="mb-2 px-4 text-[11px] font-extrabold uppercase tracking-[0.2em] text-gray-400/80">
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
                                        className={`group relative flex items-center gap-3 rounded-2xl px-4 py-3 text-[14px] font-bold transition-all duration-200 ${
                                            isActive
                                                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                                                : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                                        }`}
                                    >
                                        <Icon className={`h-[18px] w-[18px] transition-colors ${isActive ? "text-white" : "text-gray-400 group-hover:text-gray-700"}`} />
                                        <span className="flex-1">{item.label}</span>
                                        {item.badge && (
                                            <div className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-white" : "bg-emerald-500"} animate-pulse`} />
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Profile & Logout */}
            <div className="mt-auto border-t border-gray-100 px-4 py-6 bg-gray-50/50">
                <div className="mb-4 flex items-center gap-3 px-2">
                    <div className="relative">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white border border-gray-200 text-sm font-black text-blue-600 shadow-sm">
                            AD
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 shadow-sm" />
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-[14px] font-black text-gray-900 truncate">System Admin</p>
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">Marilao Command</p>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-[14px] font-bold text-gray-500 transition-all hover:bg-red-50 hover:text-red-500"
                >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                </button>
            </div>
        </aside>
    );
}

