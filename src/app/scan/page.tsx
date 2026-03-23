"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { apiClient } from "@/lib/api";

interface VerifyResult {
    userName: string;
    pointsDeducted: number;
    waterAmount: number;
}

export default function ScanPage() {
    const [scanResult, setScanResult] = useState<string | null>(null);
    const [verifying, setVerifying] = useState(false);
    const [message, setMessage] = useState("");
    const [isError, setIsError] = useState(false);
    const [result, setResult] = useState<VerifyResult | null>(null);
    const [scanCount, setScanCount] = useState(0);
    const [cameraReady, setCameraReady] = useState(false);

    const scannerRef = useRef<any>(null);
    const processingRef = useRef(false);
    const isInitializing = useRef(false);

    const stopScanner = useCallback(async () => {
        if (scannerRef.current) {
            try {
                if (scannerRef.current.isScanning) {
                    await scannerRef.current.stop();
                }
                const container = document.getElementById("qr-reader");
                if (container) container.innerHTML = "";
            } catch (err) {
                console.error("Failed to stop scanner", err);
            }
            scannerRef.current = null;
        }
    }, []);

    const initScanner = useCallback(async () => {
        if (isInitializing.current) return;
        isInitializing.current = true;

        await stopScanner();

        try {
            const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");

            const element = document.getElementById("qr-reader");
            if (!element) {
                isInitializing.current = false;
                return;
            }

            const scanner = new Html5Qrcode("qr-reader", {
                formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
                verbose: false
            });
            scannerRef.current = scanner;

            const config = {
                fps: 15,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            };

            await scanner.start(
                { facingMode: "environment" },
                config,
                async (decodedText: string) => {
                    if (processingRef.current) return;
                    processingRef.current = true;

                    try {
                        if (scannerRef.current?.isScanning) {
                            await scannerRef.current.stop();
                        }
                    } catch (e) {
                        console.error("Failed to stop scanner", e);
                    }

                    console.log("QR Decoded:", decodedText);
                    setScanResult(decodedText);
                    setVerifying(true);
                    setMessage("Verifying token...");
                    setIsError(false);
                    setResult(null);

                    try {
                        let tokenToVerify = decodedText;
                        try {
                            const payload = JSON.parse(decodedText);
                            if (payload.token) tokenToVerify = payload.token;
                        } catch (e) { }

                        const data = await apiClient<{
                            userName?: string;
                            pointsDeducted?: number;
                            waterAmount?: number;
                        }>("/api/verify-qr", {
                            method: "POST",
                            body: JSON.stringify({
                                token: tokenToVerify,
                                machineId: "MACHINE_001",
                            }),
                        });

                        setMessage("Verified! Dispensing water...");
                        setIsError(false);
                        setResult({
                            userName: data.userName || "Student",
                            pointsDeducted: data.pointsDeducted || 0,
                            waterAmount: data.waterAmount || 0,
                        });
                        setScanCount((c) => c + 1);

                        // await scanner.stop(); (Already stopped above)
                    } catch (error: any) {
                        console.error("Scan error:", error);
                        setMessage(error.message || "Failed to process QR code");
                        setIsError(true);
                        // Do NOT reset processingRef.current = false here so it doesn't auto-loop
                    } finally {
                        setVerifying(false);
                    }
                },
                () => { } // silent failure
            );
            setCameraReady(true);
        } catch (err) {
            console.error("Camera init error", err);
            setMessage("Could not access camera. Please ensure permissions are granted.");
            setIsError(true);
        } finally {
            isInitializing.current = false;
        }
    }, [stopScanner]);

    useEffect(() => {
        const timer = setTimeout(() => {
            initScanner();
        }, 500);

        return () => {
            clearTimeout(timer);
            stopScanner();
        };
    }, [initScanner, stopScanner]);

    const resetScanner = () => {
        processingRef.current = false;
        setScanResult(null);
        setMessage("");
        setIsError(false);
        setResult(null);
        // Re-initialize the scanner from scratch
        setTimeout(() => initScanner(), 100);
    };

    return (
        <div className="min-h-screen bg-[#0a0e1a] flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
            {/* Animated background grid */}
            <div className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                    backgroundSize: '40px 40px',
                }}
            />

            {/* Glow orbs */}
            <div className="absolute top-[-100px] left-[-100px] w-[400px] h-[400px] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-100px] right-[-100px] w-[400px] h-[400px] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />

            {/* Simulation Badge */}
            <div className="mb-6 flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 backdrop-blur-sm">
                <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                </span>
                <span className="text-amber-400 text-xs font-bold tracking-wider uppercase">Simulation Mode — PC Webcam</span>
            </div>

            {/* Main Scanner Card */}
            <div className="w-full max-w-md relative z-10">
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/30 mb-4">
                        <span className="material-symbols-outlined text-white text-3xl">precision_manufacturing</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">EcoDefill Machine</h1>
                    <p className="text-slate-400 text-sm mt-1">Machine ID: MACHINE_001</p>
                </div>

                {/* Scanner Container */}
                <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
                    {/* Status bar */}
                    <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${scanResult ? (isError ? 'bg-red-500' : 'bg-emerald-500') : 'bg-cyan-500 animate-pulse'}`} />
                            <span className="text-slate-300 text-xs font-medium">
                                {verifying ? 'Verifying...' : scanResult ? (isError ? 'Error' : 'Complete') : 'Awaiting Scan'}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                            <span className="material-symbols-outlined text-sm">check_circle</span>
                            <span>{scanCount} scanned today</span>
                        </div>
                    </div>

                    {/* Camera / Result Area */}
                    {!scanResult ? (
                        <div className="p-5">
                            {/* Scanner with overlay */}
                            <div className="relative rounded-2xl overflow-hidden border-2 border-cyan-500/20">
                                <div
                                    id="qr-reader"
                                    className="mx-auto"
                                    style={{ width: "100%", maxWidth: "350px", minHeight: "300px" }}
                                />
                                {/* Corner brackets overlay */}
                                <div className="absolute inset-0 pointer-events-none">
                                    <div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 border-cyan-400 rounded-tl-lg" />
                                    <div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 border-cyan-400 rounded-tr-lg" />
                                    <div className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 border-cyan-400 rounded-bl-lg" />
                                    <div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 border-cyan-400 rounded-br-lg" />
                                </div>
                            </div>
                            <p className="text-slate-500 text-xs text-center mt-4">
                                Point your webcam at the student&apos;s QR code to verify &amp; dispense water
                            </p>
                        </div>
                    ) : (
                        <div className="p-6">
                            {/* Verifying State */}
                            {verifying && (
                                <div className="flex flex-col items-center py-12">
                                    <div className="relative w-20 h-20 mb-6">
                                        <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20" />
                                        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-cyan-500 animate-spin" />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-cyan-400 text-3xl">qr_code_scanner</span>
                                        </div>
                                    </div>
                                    <p className="text-white font-semibold text-lg">Verifying Token</p>
                                    <p className="text-slate-400 text-sm mt-1">Checking balance and processing...</p>
                                </div>
                            )}

                            {/* Success State */}
                            {!verifying && !isError && result && (
                                <div className="flex flex-col items-center">
                                    <div className="relative w-20 h-20 mb-6">
                                        <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-ping" style={{ animationDuration: '2s' }} />
                                        <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                                            <span className="material-symbols-outlined text-white text-4xl">check</span>
                                        </div>
                                    </div>

                                    <h3 className="text-emerald-400 text-xl font-bold mb-1">Verification Successful</h3>
                                    <p className="text-slate-400 text-sm mb-6">{message}</p>

                                    {/* Transaction Details */}
                                    <div className="w-full space-y-3 mb-6">
                                        <div className="flex items-center justify-between bg-white/5 rounded-xl p-4 border border-white/5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-blue-400 text-lg">person</span>
                                                </div>
                                                <span className="text-slate-400 text-sm">Student</span>
                                            </div>
                                            <span className="text-white font-semibold">{result.userName}</span>
                                        </div>

                                        <div className="flex items-center justify-between bg-white/5 rounded-xl p-4 border border-white/5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-amber-400 text-lg">toll</span>
                                                </div>
                                                <span className="text-slate-400 text-sm">Points Deducted</span>
                                            </div>
                                            <span className="text-white font-semibold">-{result.pointsDeducted} pts</span>
                                        </div>

                                        <div className="flex items-center justify-between bg-white/5 rounded-xl p-4 border border-white/5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-cyan-400 text-lg">water_drop</span>
                                                </div>
                                                <span className="text-slate-400 text-sm">Water Dispensed</span>
                                            </div>
                                            <span className="text-cyan-400 font-bold text-lg">{result.waterAmount}ml</span>
                                        </div>
                                    </div>

                                    {/* Dispensing Progress Bar */}
                                    <div className="w-full mb-6">
                                        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                                            <span>Dispensing water...</span>
                                            <span>{result.waterAmount}ml</span>
                                        </div>
                                        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                                                style={{ animation: 'fillBar 3s ease-out forwards' }}
                                            />
                                        </div>
                                    </div>

                                    <button
                                        onClick={resetScanner}
                                        className="w-full flex items-center justify-center gap-2 h-12 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold transition-all active:scale-[0.98]"
                                    >
                                        <span className="material-symbols-outlined text-lg">qr_code_scanner</span>
                                        Scan Next
                                    </button>
                                </div>
                            )}

                            {/* Error State */}
                            {!verifying && isError && (
                                <div className="flex flex-col items-center">
                                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/30 mb-6">
                                        <span className="material-symbols-outlined text-white text-4xl">close</span>
                                    </div>

                                    <h3 className="text-red-400 text-xl font-bold mb-1">Verification Failed</h3>
                                    <p className="text-slate-400 text-sm mb-6 text-center">{message}</p>

                                    <button
                                        onClick={resetScanner}
                                        className="w-full flex items-center justify-center gap-2 h-12 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-semibold transition-all active:scale-[0.98]"
                                    >
                                        <span className="material-symbols-outlined text-lg">refresh</span>
                                        Try Again
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer info */}
                <div className="mt-6 text-center">
                    <p className="text-slate-600 text-xs">
                        This simulates the ESP32-CAM scanner for testing purposes.
                    </p>
                    <p className="text-slate-700 text-xs mt-1">
                        EcoDefill v1.0 • Water Refilling Station
                    </p>
                </div>
            </div>

            <style jsx>{`
                @keyframes fillBar {
                    from { width: 0%; }
                    to { width: 100%; }
                }
            `}</style>
        </div>
    );
}
