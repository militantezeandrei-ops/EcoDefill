"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AutoRefresh({ intervalMs = 30000 }: { intervalMs?: number }) {
    const router = useRouter();

    useEffect(() => {
        const timer = setInterval(() => {
            if (typeof document !== "undefined" && document.visibilityState !== "visible") {
                return;
            }
            router.refresh();
        }, intervalMs);
        return () => clearInterval(timer);
    }, [router, intervalMs]);

    return null;
}
