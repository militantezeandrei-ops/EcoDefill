"use client";

import { useEffect } from "react";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { usePathname, useRouter } from "next/navigation";
import { Native } from "@/lib/native";

export function NativeMobileShell() {
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        void Native.init();
    }, []);

    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;

        const attachBackHandler = async () => {
            const listener = await App.addListener("backButton", () => {
                if (pathname === "/" || pathname === "/login" || pathname === "/dashboard") {
                    App.minimizeApp();
                    return;
                }

                router.back();
            });

            return listener;
        };

        let listenerRef: { remove: () => Promise<void> } | undefined;

        void attachBackHandler().then((listener) => {
            listenerRef = listener;
        });

        return () => {
            if (listenerRef) {
                void listenerRef.remove();
            }
        };
    }, [pathname, router]);

    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;

        let listenerRef: { remove: () => Promise<void> } | undefined;

        void App.addListener("appStateChange", ({ isActive }) => {
            if (isActive && (typeof navigator === "undefined" || navigator.onLine)) {
                router.refresh();
            }
        }).then((listener) => {
            listenerRef = listener;
        });

        const handleOnline = () => {
            console.log("App detected online status. Refreshing...");
            router.refresh();
        };

        window.addEventListener("online", handleOnline);

        return () => {
            window.removeEventListener("online", handleOnline);
            if (listenerRef) {
                void listenerRef.remove();
            }
        };
    }, [router]);

    return null;
}
