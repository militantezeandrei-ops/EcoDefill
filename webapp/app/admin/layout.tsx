"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAdminAuth } from "@/lib/hooks/useAdminAuth";
import { Button } from "@/components/ui/Button";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import {
    LayoutDashboard,
    Users,
    History,
    Settings,
    LogOut,
    Menu
} from "lucide-react";

export default function AdminLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { loading, isAdmin } = useAdminAuth();
    const isLoginPage = pathname === "/admin/login";
    const adminEmail = auth.currentUser?.email;

    const handleSignOut = async () => {
        try {
            await signOut(auth);
            router.push("/admin/login");
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    if (loading && !isLoginPage) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-[#f8fafc]">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (isLoginPage) {
        return <>{children}</>;
    }

    if (!isAdmin) {
        return null; // Hook handles redirect
    }

    const navLinks = [
        { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
        { label: "Members", href: "/admin/students", icon: Users },
        { label: "Activity", href: "/admin/logs", icon: History },
        { label: "Settings", href: "/admin/settings", icon: Settings },
    ];

    return (
        <div className="flex h-screen bg-[#f8fafc] admin-gradient-bg text-slate-800 font-medium">
            {/* Sidebar */}
            <aside className="w-80 bg-white border-r border-slate-200 hidden xl:flex flex-col shadow-sm relative z-20">
                <div className="p-10">
                    <div className="flex items-center gap-4 mb-12">
                        <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg shadow-emerald-200">
                            ♻️
                        </div>
                        <h1 className="text-2xl font-black tracking-tighter text-slate-900 italic uppercase">
                            EcoDefill
                        </h1>
                    </div>

                    <nav className="space-y-3">
                        {navLinks.map((link) => {
                            const Icon = link.icon;
                            const isActive = pathname === link.href;
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 ${isActive
                                        ? "bg-slate-100 text-emerald-600 shadow-sm"
                                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                        }`}
                                >
                                    <Icon size={20} className={isActive ? "text-emerald-500" : ""} />
                                    <span className="text-sm font-bold tracking-tight">{link.label}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                <div className="mt-auto p-8">
                    <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-full bg-emerald-100 border-2 border-white flex items-center justify-center text-emerald-600 font-bold overflow-hidden shadow-inner uppercase">
                                {adminEmail?.charAt(0) || 'A'}
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-sm font-black text-slate-900 truncate">Administrator</p>
                                <p className="text-[10px] font-bold text-slate-400 truncate uppercase tracking-widest">{adminEmail || 'Admin Session'}</p>
                            </div>
                        </div>
                        <Button
                            variant="primary"
                            className="w-full h-11 rounded-xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md flex items-center justify-center gap-2"
                            onClick={handleSignOut}
                        >
                            <LogOut size={14} />
                            Sign Out
                        </Button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto relative z-10 p-4 lg:p-0 bg-transparent">
                <div className="max-w-7xl mx-auto xl:px-12 py-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
