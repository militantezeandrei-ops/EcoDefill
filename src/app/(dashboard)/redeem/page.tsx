"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api";
import Link from "next/link";
import QRCode from "react-qr-code";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";

export default function RedeemWater() {
    const { user, updateUserBalance } = useAuth();
    const router = useRouter();

    const [balance, setBalance] = useState(user?.balance || 0);
    const [dailyRedeemed, setDailyRedeemed] = useState(0);
    const [pointsToRedeem, setPointsToRedeem] = useState("1");

    // QR Generation State
    const [qrToken, setQrToken] = useState("");
    const [expiresAt, setExpiresAt] = useState<Date | null>(null);
    const [timeLeft, setTimeLeft] = useState(0);

    const [isSuccess, setIsSuccess] = useState(false);

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [error, setError] = useState("");

    const MAX_DAILY_REDEEM = 5;

    // Poll for QR scan status
    useEffect(() => {
        if (!qrToken || isSuccess) return;

        const pollInterval = setInterval(async () => {
            try {
                const data = await apiClient<{ used: boolean }>("/api/qr-status?token=" + qrToken);
                if (data.used) {
                    setIsSuccess(true);
                    setQrToken("");
                    setExpiresAt(null);
                    clearInterval(pollInterval);
                    
                    // Trigger balance update
                    const userData = await apiClient<{ balance: number, dailyRedeemed: number }>("/api/user-balance");
                    setBalance(userData.balance);
                    setDailyRedeemed(userData.dailyRedeemed);
                    updateUserBalance(userData.balance);
                    Swal.fire({
                        title: 'Success!',
                        html: 'Your water is being dispensed.<br/>Points deducted successfully.',
                        icon: 'success',
                        confirmButtonText: 'Back to Home',
                        confirmButtonColor: '#2563eb',
                        background: '#18181b',
                        color: '#fff',
                        allowOutsideClick: false,
                    }).then((result) => {
                        if (result.isConfirmed) {
                            router.push('/dashboard');
                        }
                    });
                }
            } catch (err) {
                console.error("Polling error", err);
            }
        }, 2000);

        return () => clearInterval(pollInterval);
    }, [qrToken, isSuccess, updateUserBalance]);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const data = await apiClient<{ balance: number, dailyRedeemed: number }>("/api/user-balance");
                setBalance(data.balance);
                setDailyRedeemed(data.dailyRedeemed);
                updateUserBalance(data.balance);
            } catch (err) {
                console.error("Failed to fetch balance", err);
            } finally {
                setFetching(false);
            }
        };
        fetchUserData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Timer for QR code expiration
    useEffect(() => {
        if (!expiresAt) return;

        const interval = setInterval(() => {
            const now = new Date();
            const diff = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
            setTimeLeft(diff);

            // Give a 10s grace period for verification delay
            if (now.getTime() > expiresAt.getTime() + 10000) {
                setQrToken("");
                setExpiresAt(null);
                clearInterval(interval);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [expiresAt]);

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

        if (points + dailyRedeemed > MAX_DAILY_REDEEM) {
            setError(`Daily limit reached. You can only redeem ${MAX_DAILY_REDEEM - dailyRedeemed} more points today.`);
            return;
        }

        setLoading(true);
        try {
            const data = await apiClient<{ token: string, expiresAt: string }>("/api/redeem-initiate", {
                method: "POST",
                body: JSON.stringify({ amount: points })
            });

            setQrToken(data.token);
            setExpiresAt(new Date(data.expiresAt));
            setTimeLeft(30);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to generate QR code");
        } finally {
            setLoading(false);
        }
    };

    const remainingRedeemable = Math.max(0, MAX_DAILY_REDEEM - dailyRedeemed);
    const parsedPoints = parseInt(pointsToRedeem, 10);
    const isValidInput = !isNaN(parsedPoints) && parsedPoints > 0 && parsedPoints <= balance && parsedPoints <= remainingRedeemable;

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-zinc-900 w-full overflow-hidden relative">
            {/* Header matching ui */}
            <header className="bg-blue-600 text-white flex items-center p-4">
                <Link href="/dashboard" className="flex size-10 items-center justify-center rounded-full hover:bg-white/10 transition-colors">
                    <span className="material-symbols-outlined font-bold">arrow_back</span>
                </Link>
                <h1 className="flex-1 text-center text-lg font-bold pr-10">Redeem Water</h1>
            </header>

            <main className="flex-1 overflow-y-auto px-4 pb-36 pt-6 flex flex-col items-center">
                <div className="w-full max-w-sm mb-6">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Redeem Your Points</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Convert your eco-points into fresh water refills.</p>
                </div>

                {fetching ? (
                    <div className="w-full h-40 flex items-center justify-center">
                        <span className="material-symbols-outlined animate-spin text-primary text-4xl">refresh</span>
                    </div>
                ) : (
                    <>
                        {/* Status Card */}
                        <div className="w-full max-w-sm rounded-[24px] bg-blue-700 text-white p-6 shadow-xl relative overflow-hidden mb-6">
                            <div className="absolute right-[-30px] top-[-10px] size-40 rounded-full bg-white/10 opacity-50 border-[20px] border-white/5"></div>
                            <div className="absolute right-4 top-8 flex size-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm z-10">
                                <span className="material-symbols-outlined text-white text-2xl">savings</span>
                            </div>

                            <div className="relative z-10">
                                <p className="text-blue-100 text-xs font-semibold mb-1 uppercase tracking-wider">Current Balance</p>
                                <div className="flex items-baseline gap-1 mb-6">
                                    <span className="text-5xl font-bold tracking-tighter">{balance}</span>
                                    <span className="text-blue-200 text-sm font-medium">Pts</span>
                                </div>

                                <div className="border-t border-blue-500/50 pt-4 flex items-center justify-between">
                                    <div>
                                        <p className="text-blue-200 uppercase text-[10px] font-bold tracking-widest mb-1">Water Equiv</p>
                                        <p className="text-lg font-bold">{balance * 100}ml</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-blue-200 uppercase text-[10px] font-bold tracking-widest mb-1">Daily Limit</p>
                                        <p className="text-lg font-bold">{dailyRedeemed}/5</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Redemption Form Area */}
                        <div className="w-full max-w-sm space-y-4">
                            <div className="bg-white dark:bg-zinc-800 rounded-[24px] p-6 shadow-sm border border-slate-100 dark:border-zinc-700">
                                {error && <div className="p-3 mb-4 bg-red-100 text-red-700 rounded-lg text-sm text-center font-medium">{error}</div>}

                                <p className="text-slate-900 dark:text-white font-bold mb-3 text-sm ml-1">Points to Redeem</p>
                                <div className="flex items-center justify-between mb-6 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-[12px] p-2">
                                    <button
                                        onClick={() => {
                                            setError("");
                                            const current = parseInt(pointsToRedeem) || 1;
                                            if (current > 1) setPointsToRedeem((current - 1).toString());
                                        }}
                                        disabled={parseInt(pointsToRedeem || "1") <= 1}
                                        className="size-12 rounded-[10px] bg-white dark:bg-zinc-800 flex items-center justify-center text-slate-600 dark:text-slate-300 shadow-sm border border-slate-100 dark:border-zinc-700 active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all font-bold text-xl"
                                    >
                                        -
                                    </button>
                                    <div className="flex-1 text-center">
                                        <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{pointsToRedeem || "0"}</span>
                                        <span className="text-slate-500 text-sm ml-1 font-semibold">PTS</span>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setError("");
                                            const current = parseInt(pointsToRedeem) || 0;
                                            const maxAllowed = Math.min(remainingRedeemable, balance);
                                            if (current < maxAllowed) setPointsToRedeem((current + 1).toString());
                                        }}
                                        disabled={parseInt(pointsToRedeem || "0") >= Math.min(remainingRedeemable, balance)}
                                        className="size-12 rounded-[10px] bg-white dark:bg-zinc-800 flex items-center justify-center text-slate-600 dark:text-slate-300 shadow-sm border border-slate-100 dark:border-zinc-700 active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all font-bold text-xl"
                                    >
                                        +
                                    </button>
                                </div>

                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-[12px] p-4 flex items-center justify-between border border-blue-100 dark:border-blue-800/50">
                                    <div className="flex items-center gap-2">
                                        <div className="size-8 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-blue-700 dark:text-blue-300 text-sm">water_drop</span>
                                        </div>
                                        <span className="text-slate-600 dark:text-slate-300 text-sm">You will receive:</span>
                                    </div>
                                    <span className="text-blue-700 dark:text-blue-400 font-bold text-lg">
                                        {isValidInput ? parsedPoints * 100 : 0} ml
                                    </span>
                                </div>
                            </div>

                            <div className="flex bg-slate-100 dark:bg-zinc-800/80 rounded-xl p-4 items-start gap-3">
                                <span className="material-symbols-outlined text-slate-400 text-xl mt-0.5">info</span>
                                <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                                    Scanning the QR code at the water station will deduct the points immediately. Ensure you have your bottle ready.
                                </p>
                            </div>
                        </div>
                    </>
                )}
            </main>

            {/* Middle QR Modal */}
            {qrToken && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-full max-w-sm bg-white dark:bg-zinc-800 rounded-[32px] p-8 shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
                        <div className="w-full flex justify-end mb-2">
                            <button onClick={() => setQrToken("")} className="size-10 rounded-full bg-slate-100 dark:bg-zinc-700 flex items-center justify-center text-slate-500 transition-colors hover:bg-slate-200">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Scan QR Code</h3>
                        <p className="text-slate-500 text-sm mb-6">Point the machine camera at this code to dispense water.</p>

                        <div className="bg-white p-6 rounded-3xl border-2 border-blue-100 dark:border-zinc-700 shadow-inner mb-6">
                            <QRCode value={qrToken} size={220} level="M" />
                        </div>

                        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-full mb-6 text-red-600 dark:text-red-400 text-sm font-bold animate-pulse">
                            <span className="material-symbols-outlined text-sm">timer</span>
                            <span>{timeLeft > 0 ? `Expires in ${timeLeft}s` : 'Finalizing scan...'}</span>
                        </div>

                        <div className="w-full p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center gap-3">
                            <div className="size-10 rounded-xl bg-blue-500 flex items-center justify-center text-white shrink-0">
                                <span className="material-symbols-outlined">water_drop</span>
                            </div>
                            <div className="text-left">
                                <p className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest">Selected Amount</p>
                                <p className="text-lg font-bold text-slate-900 dark:text-white">{(parseInt(pointsToRedeem) || 0) * 100}ml</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            

            {/* Bottom Generate Action */}
            {!qrToken && !fetching && !isSuccess && (
                <div className="p-4 bg-white dark:bg-zinc-900 border-t border-slate-100 dark:border-zinc-800 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] w-full max-w-sm mx-auto fixed bottom-16 left-1/2 -translate-x-1/2 z-40">
                    <Button
                        onClick={handleGenerateQR}
                        disabled={!isValidInput || loading || dailyRedeemed >= MAX_DAILY_REDEEM}
                        className="w-full shadow-lg shadow-blue-500/30"
                        variant="primary"
                    >
                        {loading ? "Generating..." : "Generate QR Code"}
                    </Button>
                </div>
            )}
        </div>
    );
}
