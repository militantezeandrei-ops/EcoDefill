"use client";

import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { showToast } from "@/lib/toast";

export default function RedeemWater() {
    const { user, updateUserBalance } = useAuth();
    const router = useRouter();

    const [balance, setBalance] = useState(user?.balance || 0);
    const [dailyRedeemed, setDailyRedeemed] = useState(0);
    const [pointsToRedeem, setPointsToRedeem] = useState("1");
    const [qrToken, setQrToken] = useState("");
    const [isSuccess, setIsSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [error, setError] = useState("");

    const formatWater = (ml: number) => {
        if (ml >= 1000) {
            const liters = ml / 1000;
            return `${Number.isInteger(liters) ? liters : liters.toFixed(1)}L`;
        }
        return `${ml}ml`;
    };

    const MAX_TRANSACTION_LIMIT = 5;

    useEffect(() => {
        if (!qrToken || isSuccess) return;

        const pollInterval = setInterval(async () => {
            try {
                const data = await apiClient<{ used: boolean }>("/api/qr-status?token=" + qrToken);
                if (data.used) {
                    setIsSuccess(true);
                    setQrToken("");
                    clearInterval(pollInterval);

                    const userData = await apiClient<{ balance: number; dailyRedeemed: number }>("/api/user-balance");
                    setBalance(userData.balance);
                    setDailyRedeemed(userData.dailyRedeemed);
                    updateUserBalance(userData.balance);
                    await showToast({
                        text: "Your water is being dispensed. Points deducted successfully.",
                        duration: "long",
                        type: "success",
                    });
                    router.push("/dashboard");
                }
            } catch (err) {
                console.error("Polling error", err);
            }
        }, 2000);

        return () => clearInterval(pollInterval);
    }, [qrToken, isSuccess, updateUserBalance, router]);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const data = await apiClient<{ balance: number; dailyRedeemed: number }>("/api/user-balance");
                setBalance(data.balance);
                setDailyRedeemed(data.dailyRedeemed);
                updateUserBalance(data.balance);
            } catch (err) {
                console.error("Failed to fetch balance", err);
            } finally {
                setFetching(false);
            }
        };
        void fetchUserData();
    }, [updateUserBalance]);



    const handleGenerateQR = async () => {
        setError("");
        setIsSuccess(false);
        const points = parseInt(pointsToRedeem, 10);

        if (isNaN(points) || points <= 0) {
            setError("Please enter a valid amount of points.");
            return;
        }
        if (points > balance) {
            setError("Insufficient balance.");
            return;
        }
        if (points > MAX_TRANSACTION_LIMIT) {
            setError(`Maximum dispense limit per transaction is ${MAX_TRANSACTION_LIMIT} points (${MAX_TRANSACTION_LIMIT * 100}ml).`);
            return;
        }

        setLoading(true);
        try {
            const data = await apiClient<{ token: string; expiresAt: string }>("/api/redeem-initiate", {
                method: "POST",
                body: JSON.stringify({ amount: points }),
            });
            setQrToken(data.token);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to generate QR code");
        } finally {
            setLoading(false);
        }
    };

    const remainingRedeemable = MAX_TRANSACTION_LIMIT;
    const parsedPoints = parseInt(pointsToRedeem, 10);
    const isValidInput = !isNaN(parsedPoints) && parsedPoints > 0 && parsedPoints <= balance && parsedPoints <= remainingRedeemable;

    return (
        <div className="relative flex min-h-screen flex-col bg-transparent">
            <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/92 px-4 pb-3 pt-[calc(var(--safe-top)+12px)] backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/92">
                <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Redeem Water</h1>
                <p className="text-sm text-slate-500">Convert points to refill volume</p>
            </header>

            <main className="flex-1 overflow-y-auto px-4 pb-10 pt-5">
                {fetching ? (
                    <div className="space-y-2.5">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-200/60 dark:bg-zinc-800" />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <section className="rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 p-5 text-white shadow-[0_20px_40px_rgba(59,130,246,0.3)]">
                            <p className="text-xs uppercase tracking-[0.14em] text-blue-100">Current Balance</p>
                            <p className="mt-2 text-4xl font-bold leading-none">{balance} <span className="text-lg font-medium text-blue-100">pts</span></p>
                            <div className="mt-5 flex items-center justify-between border-t border-white/20 pt-4 text-sm">
                                <span>{formatWater(balance * 100)} available</span>
                                <span>{dailyRedeemed} pts redeemed today</span>
                            </div>
                        </section>

                        <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/85">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Points to redeem</p>
                            <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 p-2 dark:bg-zinc-800">
                                <button
                                    onClick={() => {
                                        setError("");
                                        const current = parseInt(pointsToRedeem) || 1;
                                        if (current > 1) setPointsToRedeem((current - 1).toString());
                                    }}
                                    disabled={parseInt(pointsToRedeem || "1") <= 1}
                                    className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-500 text-xl font-semibold text-white shadow-sm transition active:scale-95 disabled:opacity-50 dark:bg-red-600"
                                >
                                    -
                                </button>
                                <div className="text-center">
                                    <p className="text-3xl font-bold text-slate-900 dark:text-white">{pointsToRedeem}</p>
                                    <p className="text-xs text-slate-500">{isValidInput ? formatWater(parsedPoints * 100) : "0ml"}</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setError("");
                                        const current = parseInt(pointsToRedeem) || 0;
                                        const maxAllowed = Math.min(remainingRedeemable, balance);
                                        if (current < maxAllowed) setPointsToRedeem((current + 1).toString());
                                    }}
                                    disabled={parseInt(pointsToRedeem || "0") >= Math.min(remainingRedeemable, balance)}
                                    className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500 text-xl font-semibold text-white shadow-sm transition active:scale-95 disabled:opacity-50 dark:bg-emerald-600"
                                >
                                    +
                                </button>
                            </div>
                            {error && <p className="mt-3 text-sm font-medium text-rose-500">{error}</p>}
                        </section>

                        {!qrToken && !isSuccess && (
                            <Button
                                onClick={handleGenerateQR}
                                disabled={!isValidInput || loading}
                                className="h-14 w-full rounded-2xl shadow-[0_16px_35px_rgba(59,130,246,0.35)]"
                                variant="primary"
                            >
                                {loading ? "Generating..." : "Generate QR Code"}
                            </Button>
                        )}
                    </div>
                )}
            </main>

            {qrToken && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-sm rounded-3xl bg-white p-7 text-center shadow-2xl dark:bg-zinc-900">
                        <div className="mb-3 flex justify-end">
                            <button onClick={() => setQrToken("")} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-zinc-800">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Scan QR to Dispense</h2>
                        <p className="mt-1 text-sm text-slate-500">Show this code to the machine camera</p>
                        <div className="mt-5 flex items-center justify-center rounded-2xl border border-slate-200 p-4 dark:border-zinc-700">
                            <QRCode value={qrToken} size={220} level="M" className="mx-auto" />
                        </div>
                        <p className="mt-4 inline-flex rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-500 dark:bg-blue-900/20">
                            QR Code Active
                        </p>
                    </div>
                </div>
            )}

        </div>
    );
}
