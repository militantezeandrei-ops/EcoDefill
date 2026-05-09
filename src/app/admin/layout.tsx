"use client";

import { ReactNode, useEffect } from "react";
import { AdminBottomNav } from "@/components/layout/AdminBottomNav";
import { useAuth } from "@/hooks/useAuth";
import { useRouter, usePathname } from "next/navigation";

export default function AdminLayout({ children }: { children: ReactNode }) {
    const { isAuthenticated, isLoading, user } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const isPublicRoute = pathname === "/admin/login" || pathname === "/admin/forgot-password";

        if (!isLoading && !isPublicRoute) {
            if (!isAuthenticated) {
                router.push("/admin/login");
            } else if (user?.role !== "ADMIN") {
                router.push("/dashboard");
            }
        }
    }, [isAuthenticated, isLoading, user, router, pathname]);

    const isPublicRoute = pathname === "/admin/login" || pathname === "/admin/forgot-password";

    if (isLoading) return null;
    if (!isPublicRoute && (!isAuthenticated || user?.role !== "ADMIN")) return null;

    if (isPublicRoute) return <>{children}</>;

    return (
        <div className="bg-background-light dark:bg-background-dark min-h-screen font-display">
            <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto bg-slate-50 dark:bg-zinc-900 shadow-xl pb-16">
                <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-zinc-950">
                    {children}
                </div>

                <AdminBottomNav />
            </div>
        </div>
    );
}
