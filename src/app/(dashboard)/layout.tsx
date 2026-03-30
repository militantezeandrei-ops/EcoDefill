"use client";

import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { BottomNav } from "@/components/layout/BottomNav";
import { StatusBarBackdrop } from "@/components/layout/StatusBarBackdrop";
import { useAuth } from "@/hooks/useAuth";
import { usePathname, useRouter } from "next/navigation";

const TAB_ORDER = ["/dashboard", "/rewards", "/history", "/profile"];

function getTabIndex(pathname: string): number {
    return TAB_ORDER.findIndex((tabPath) => pathname.startsWith(tabPath));
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const previousPathRef = useRef(pathname);
    const [transitionClass, setTransitionClass] = useState("tab-slide-none");

    const transitionKey = useMemo(() => pathname, [pathname]);

    useEffect(() => {
        // Prevent redirecting to login when offline to avoid kicking users out due to transient network issues
        const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
        
        if (!isLoading && !isAuthenticated && !isOffline) {
            router.push("/login");
        }
    }, [isAuthenticated, isLoading, router]);

    useEffect(() => {
        const previousPath = previousPathRef.current;
        if (previousPath === pathname) return;

        const previousTab = getTabIndex(previousPath);
        const currentTab = getTabIndex(pathname);

        if (previousTab !== -1 && currentTab !== -1) {
            setTransitionClass(currentTab > previousTab ? "tab-slide-left" : "tab-slide-right");
        } else {
            setTransitionClass("tab-fade");
        }

        previousPathRef.current = pathname;
    }, [pathname]);

    if (isLoading || !isAuthenticated) return null;

    return (
        <div className="relative h-[100dvh] w-full overflow-hidden bg-[#f6f6f6] font-display">
            <main className="h-full w-full overflow-y-auto pb-[calc(110px+var(--safe-bottom))]">
                <div key={transitionKey} className={`${transitionClass} min-h-full flex flex-col`}>
                    {children}
                </div>
            </main>
            <BottomNav />
            <StatusBarBackdrop />
        </div>
    );
}
