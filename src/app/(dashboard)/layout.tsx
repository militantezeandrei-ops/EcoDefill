"use client";

import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { BottomNav } from "@/components/layout/BottomNav";
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
        if (!isLoading && !isAuthenticated) {
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
        <div className="relative h-[100dvh] w-full overflow-x-hidden bg-transparent font-display">
            <main className="relative flex h-[100dvh] min-h-0 flex-col overflow-x-hidden pb-[calc(110px+var(--safe-bottom))]">
                <div key={transitionKey} className={`${transitionClass} flex min-h-0 flex-1 flex-col`}>
                    {children}
                </div>
            </main>
            <BottomNav />
        </div>
    );
}
