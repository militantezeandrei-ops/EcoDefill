"use client";

import { useEffect, useState, useCallback } from "react";

export function OfflineOverlay() {
    const [isOffline, setIsOffline] = useState(false);
    const [isRetrying, setIsRetrying] = useState(false);

    useEffect(() => {
        // Set initial state - check if actually offline
        if (typeof navigator !== "undefined") {
            setIsOffline(!navigator.onLine);
        }

        const handleOffline = () => setIsOffline(true);
        const handleOnline = () => {
            setIsOffline(false);
            setIsRetrying(false);
        };

        window.addEventListener("offline", handleOffline);
        window.addEventListener("online", handleOnline);

        return () => {
            window.removeEventListener("offline", handleOffline);
            window.removeEventListener("online", handleOnline);
        };
    }, []);

    const handleRetry = useCallback(async () => {
        setIsRetrying(true);
        try {
            // Ping a lightweight endpoint to test real connectivity
            const res = await fetch("https://eco-defill.vercel.app/api/ping", {
                method: "HEAD",
                cache: "no-cache",
                signal: AbortSignal.timeout(5000),
            });
            if (res.ok || res.status < 500) {
                setIsOffline(false);
                setIsRetrying(false);
                // Reload the app page
                window.location.reload();
            } else {
                setIsRetrying(false);
            }
        } catch {
            setIsRetrying(false);
        }
    }, []);

    if (!isOffline) return null;

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 99999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "24px",
                backgroundImage:
                    "linear-gradient(to bottom, rgba(0,0,0,0.6), rgba(0,0,0,0.8)), url('/images/pdm-building.jpg')",
                backgroundSize: "cover",
                backgroundPosition: "center",
                fontFamily:
                    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
            }}
        >
            <div
                style={{
                    width: "100%",
                    maxWidth: 380,
                    background: "rgba(24,24,27,0.5)",
                    backdropFilter: "blur(16px)",
                    WebkitBackdropFilter: "blur(16px)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 24,
                    padding: "36px 24px",
                    textAlign: "center",
                    boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
                    position: "relative",
                    overflow: "hidden",
                }}
            >
                {/* Green top bar */}
                <div
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 4,
                        background: "linear-gradient(to right, #34d399, #10b981, #059669)",
                        borderRadius: "4px 4px 0 0",
                    }}
                />

                {/* Wifi icon */}
                <div
                    style={{
                        width: 72,
                        height: 72,
                        margin: "0 auto 20px",
                        borderRadius: "50%",
                        background: "rgba(239,68,68,0.15)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <span
                        className="material-symbols-outlined"
                        style={{ fontSize: 36, color: "#f87171" }}
                    >
                        wifi_off
                    </span>
                </div>

                <h1
                    style={{
                        fontSize: 22,
                        fontWeight: 800,
                        color: "#fff",
                        margin: "0 0 10px",
                        letterSpacing: "-0.5px",
                    }}
                >
                    You&apos;re Offline
                </h1>
                <p
                    style={{
                        fontSize: 13,
                        color: "rgba(255,255,255,0.65)",
                        lineHeight: 1.6,
                        margin: "0 0 28px",
                    }}
                >
                    Please check your internet connection and try again to access EcoDefill.
                </p>

                <button
                    onClick={handleRetry}
                    disabled={isRetrying}
                    style={{
                        width: "100%",
                        padding: "14px 24px",
                        background: isRetrying
                            ? "rgba(16,185,129,0.5)"
                            : "linear-gradient(to right, #059669, #10b981)",
                        color: "#fff",
                        border: "none",
                        borderRadius: 12,
                        fontSize: 15,
                        fontWeight: 700,
                        cursor: isRetrying ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        boxShadow: "0 4px 16px rgba(16,185,129,0.3)",
                        transition: "opacity 0.2s, transform 0.1s",
                        transform: "scale(1)",
                    }}
                    onMouseDown={(e) =>
                        ((e.currentTarget as HTMLButtonElement).style.transform = "scale(0.97)")
                    }
                    onMouseUp={(e) =>
                        ((e.currentTarget as HTMLButtonElement).style.transform = "scale(1)")
                    }
                >
                    {isRetrying ? (
                        <>
                            <div
                                style={{
                                    width: 16,
                                    height: 16,
                                    border: "2px solid rgba(255,255,255,0.3)",
                                    borderTopColor: "#fff",
                                    borderRadius: "50%",
                                    animation: "spin 0.8s linear infinite",
                                }}
                            />
                            Checking connection...
                        </>
                    ) : (
                        <>
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                                refresh
                            </span>
                            Try Reconnecting
                        </>
                    )}
                </button>

                <style>{`
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        </div>
    );
}
