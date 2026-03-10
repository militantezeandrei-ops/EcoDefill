"use client";

import { ReactNode, useEffect } from "react";
import { BottomNav } from "@/components/layout/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

export default function DashboardLayout({ children }: { children: ReactNode }) {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push("/login");
        }
    }, [isAuthenticated, isLoading, router]);

    if (isLoading || !isAuthenticated) return null;

    return (
        <div className="bg-background-light dark:bg-background-dark min-h-screen font-display">
            <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto bg-white dark:bg-zinc-900 shadow-xl pb-16">
                <div className="flex-1 flex flex-col h-full bg-white dark:bg-zinc-900">
                    {children}
                </div>

                <BottomNav />
            </div>
        </div>
    );
}
