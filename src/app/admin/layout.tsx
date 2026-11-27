"use client";

import { ReactNode } from "react";
import { AdminBottomNav } from "@/components/layout/AdminBottomNav";
import { usePathname } from "next/navigation";

export default function AdminLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const isPublicRoute =
        pathname === "/admin/login" || pathname === "/admin/forgot-password";

    if (isPublicRoute) return <>{children}</>;

    return (
        <div className="bg-background-light dark:bg-background-dark min-h-screen font-display">
            <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-slate-50 dark:bg-zinc-900 pb-16 md:pb-0">
                <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-zinc-950">
                    {children}
                </div>

                {/* Only show bottom nav on dashboard routes if we are on mobile */}
                <div className="block md:hidden">
                    <AdminBottomNav />
                </div>
            </div>
        </div>
    );
}
