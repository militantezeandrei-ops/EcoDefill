"use client";

import { ReactNode, useEffect } from "react";
import { AdminBottomNav } from "@/components/layout/AdminBottomNav";
import { useAuth } from "@/hooks/useAuth";
import { useRouter, usePathname } from "next/navigation";

export default function AdminLayout({ children }: { children: ReactNode }) {
    const { isAuthenticated, isLoading, user } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    const isPublicRoute = pathname === "/admin/login" || pathname === "/admin/forgot-password";

    useEffect(() => {
        if (!isLoading && !isPublicRoute) {
            if (!isAuthenticated) {
                router.push("/admin/login");
            } else if (user?.role !== "ADMIN") {
                router.push("/dashboard");
            }
        }
    }, [isAuthenticated, isLoading, user, router, isPublicRoute]);

    // Don't show protected children while loading or unauthorized
    if (!isPublicRoute && (isLoading || !isAuthenticated || user?.role !== "ADMIN")) {
        return null;
    }

    return (
        <div className="bg-background-light dark:bg-background-dark min-h-screen font-display">
            <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-slate-50 dark:bg-zinc-900">
                <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-zinc-950">
                    {children}
                </div>

                {/* Only show bottom nav on dashboard routes if we are on mobile */}
                {!isPublicRoute && <div className="block md:hidden"><AdminBottomNav /></div>}
            </div>
        </div>
    );
}

