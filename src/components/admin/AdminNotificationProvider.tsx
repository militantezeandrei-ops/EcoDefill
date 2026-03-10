"use client";

import { useEffect, useRef } from "react";
import { sileo, Toaster } from "sileo";
import { apiClient } from "@/lib/api";

export default function AdminNotificationProvider({ children }: { children: React.ReactNode }) {
    const lastCheckRef = useRef<string>(new Date().toISOString());
    const seenEventIds = useRef<Set<string>>(new Set());

    useEffect(() => {
        const pollInterval = setInterval(async () => {
            try {
                const queryParam = `?since=${encodeURIComponent(lastCheckRef.current)}`;
                const data = await apiClient(`/api/admin/polling/activities${queryParam}`, {
                    method: "GET"
                });

                if (data && data.events && data.events.length > 0) {
                    data.events.forEach((event: any) => {
                        // Prevent duplicates
                        if (!seenEventIds.current.has(event.id)) {
                            seenEventIds.current.add(event.id);
                            
                            // Show Sileo notification
                            sileo.success(event.description, {
                                title: event.title,
                                duration: 8000, // 8 seconds
                            });
                        }
                    });
                }

                if (data.serverTime) {
                    lastCheckRef.current = data.serverTime;
                }

            } catch (err) {
                // Ignore silent polling errors
            }
        }, 5000); // Poll every 5 seconds

        return () => clearInterval(pollInterval);
    }, []);

    return (
        <>
            <Toaster position="top-right" />
            {children}
        </>
    );
}
