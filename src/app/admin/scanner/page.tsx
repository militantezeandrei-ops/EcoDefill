"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { apiClient } from "@/lib/api";

interface VerifyResult {
    userName: string;
    pointsDeducted: number;
    waterAmount: number;
}

type ScanMode = "webcam" | "esp32";

export default function QRScanner() {
    // ─── Mode ─────────────────────────────────────────────────────────────────
    const [scanMode, setScanMode] = useState<ScanMode>("webcam");

    // ─── Webcam Scanner State ─────────────────────────────────────────────────
    const [scanResult, setScanResult] = useState<string | null>(null);
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [message, setMessage] = useState("");
    const [result, setResult] = useState<VerifyResult | null>(null);
    const [scanCount, setScanCount] = useState(0);
    const [cameraReady, setCameraReady] = useState(false);
    const [needsReset, setNeedsReset] = useState(false);

    const scannerRef = useRef<any>(null);
    const processingRef = useRef(false);
    const isInitializing = useRef(false);

    // ─── ESP32-CAM State ───────────────────────────────────────────────────────
    const [esp32Ip, setEsp32Ip] = useState("192.168.0.");
    const [streamUrl, setStreamUrl] = useState("");
    const [streamConnected, setStreamConnected] = useState(false);
    const [streamError, setStreamError] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

    // ─── Webcam: stop scanner ─────────────────────────────────────────────────
    const stopScanner = useCallback(async () => {
        if (scannerRef.current) {
            try {
                if (scannerRef.current.isScanning) {
                    await scannerRef.current.stop();
                }
                const container = document.getElementById("admin-reader");
                if (container) container.innerHTML = "";
            } catch (err) {
                console.error("Failed to stop scanner", err);
            }
            scannerRef.current = null;
        }
    }, []);

    // ─── Webcam: init scanner ─────────────────────────────────────────────────
    const initScanner = useCallback(async () => {
        if (isInitializing.current) return;
        isInitializing.current = true;

        await stopScanner();

        try {
            const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");

            const element = document.getElementById("admin-reader");
            if (!element) {
                isInitializing.current = false;
                return;
            }

            const scanner = new Html5Qrcode("admin-reader", {
                formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
                verbose: false,
            });
            scannerRef.current = scanner;

            const config = {
                fps: 15,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
            };

            await scanner.start(
                { facingMode: "environment" },
                config,
                async (decodedText: string) => {
                    if (processingRef.current) return;
                    processingRef.current = true;

                    setScanResult(decodedText);
                    setStatus("loading");
                    setMessage("Verifying QR code...");
                    setResult(null);

                    try {
                        let tokenToVerify = decodedText;
                        try {
                            const payload = JSON.parse(decodedText);
                            if (payload.token) tokenToVerify = payload.token;
                        } catch (e) {}

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

                        setStatus("success");
                        setMessage("Verified successfully!");
                        setResult({
                            userName: data.userName || "Student",
                            pointsDeducted: data.pointsDeducted || 0,
                            waterAmount: data.waterAmount || 0,
                        });
                        setScanCount((c) => c + 1);

                        await scanner.stop();
                        setTimeout(() => setNeedsReset(true), 5000);
                    } catch (err: any) {
                        setStatus("error");
                        setMessage(err.message || "Failed to verify QR code");
                        processingRef.current = false;
                    }
                },
                () => {}
            );
            setCameraReady(true);
        } catch (err) {
            console.error("Camera init error", err);
            setStatus("error");
            setMessage("Could not access camera. Please ensure permissions are granted.");
        } finally {
            isInitializing.current = false;
        }
    }, [stopScanner]);

    useEffect(() => {
        if (scanMode !== "webcam") return;
        const timer = setTimeout(() => initScanner(), 500);
        return () => {
            clearTimeout(timer);
            stopScanner();
        };
    }, [initScanner, stopScanner, scanMode]);

    const resetScanner = useCallback(() => {
        processingRef.current = false;
        setScanResult(null);
        setStatus("idle");
        setMessage("");
        setResult(null);
        setTimeout(() => initScanner(), 100);
    }, [initScanner]);

    useEffect(() => {
        if (needsReset) {
            setNeedsReset(false);
            resetScanner();
        }
    }, [needsReset, resetScanner]);

    // Stop webcam when switching away from webcam mode
    useEffect(() => {
        if (scanMode !== "webcam") {
            stopScanner();
        }
    }, [scanMode, stopScanner]);

    // ─── ESP32-CAM: Connect to stream ─────────────────────────────────────────
    const connectStream = () => {
        const trimmedIp = esp32Ip.trim();
        if (!trimmedIp) return;
        const url = `http://${trimmedIp}:81`;
        setStreamUrl(url);
        setStreamConnected(false);
        setStreamError(false);
    };

    const handleStreamLoad = () => {
        setStreamConnected(true);
        setStreamError(false);
    };

    const handleStreamError = () => {
        setStreamError(true);
        setStreamConnected(false);
    };

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="flex-1 overflow-y-auto w-full h-full pb-8 flex flex-col items-center">
            <AdminTopBar />

            <div className="px-4 py-6 w-full flex flex-col items-center max-w-lg">

                {/* Header */}
                <div className="text-center mb-5">
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">QR Scanner</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        Scan student QR codes to dispense water
                    </p>
                </div>

                {/* Mode Tabs */}
                <div className="w-full flex gap-2 mb-5 p-1 bg-slate-100 dark:bg-zinc-800 rounded-xl">
                    <button
                        onClick={() => setScanMode("webcam")}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
                            scanMode === "webcam"
                                ? "bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-sm"
                                : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
                        }`}
                    >
                        <span className="material-symbols-outlined text-base">laptop</span>
                        Webcam
                    </button>
                    <button
                        onClick={() => setScanMode("esp32")}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
                            scanMode === "esp32"
                                ? "bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-sm"
                                : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
                        }`}
                    >
                        <span className="material-symbols-outlined text-base">videocam</span>
                        ESP32-CAM
                    </button>
                </div>

                {/* Stats Bar */}
                <div className="w-full grid grid-cols-3 gap-3 mb-5">
                    <div className="bg-white dark:bg-zinc-800/80 rounded-xl p-3 text-center border border-slate-100 dark:border-zinc-700">
                        <p className="text-lg font-bold text-slate-900 dark:text-white">{scanCount}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Scanned</p>
                    </div>
                    <div className="bg-white dark:bg-zinc-800/80 rounded-xl p-3 text-center border border-slate-100 dark:border-zinc-700">
                        <p className="text-lg font-bold text-emerald-600">MACHINE_01</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Machine</p>
                    </div>
                    <div className="bg-white dark:bg-zinc-800/80 rounded-xl p-3 text-center border border-slate-100 dark:border-zinc-700">
                        <div
                            className={`w-2.5 h-2.5 rounded-full mx-auto mb-1 ${
                                scanMode === "esp32"
                                    ? streamConnected
                                        ? "bg-emerald-500 animate-pulse"
                                        : streamError
                                        ? "bg-red-500"
                                        : "bg-slate-400"
                                    : status === "idle"
                                    ? "bg-emerald-500"
                                    : status === "loading"
                                    ? "bg-amber-500 animate-pulse"
                                    : status === "success"
                                    ? "bg-emerald-500"
                                    : "bg-red-500"
                            }`}
                        />
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                            {scanMode === "esp32"
                                ? streamConnected
                                    ? "Live"
                                    : streamError
                                    ? "Error"
                                    : "Offline"
                                : status === "idle"
                                ? "Ready"
                                : status === "loading"
                                ? "Busy"
                                : status === "success"
                                ? "Done"
                                : "Error"}
                        </p>
                    </div>
                </div>

                {/* ══════════════════════════════════════════════
                    WEBCAM MODE
                ══════════════════════════════════════════════ */}
                {scanMode === "webcam" && (
                    <>
                        {/* Simulation Banner */}
                        <div className="w-full mb-5 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                            <span className="relative flex h-2 w-2 shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                            </span>
                            <span className="text-amber-500 text-xs font-semibold">Simulation Mode — Using PC/Phone webcam</span>
                        </div>

                        {/* Scanner or Result */}
                        {!scanResult ? (
                            <div className="w-full">
                                <div className="relative rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-zinc-700 bg-black">
                                    <div
                                        id="admin-reader"
                                        className="w-full"
                                        style={{ maxWidth: "100%", minHeight: "300px" }}
                                    />
                                    {/* Corner brackets */}
                                    <div className="absolute inset-0 pointer-events-none z-10">
                                        <div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 border-emerald-400 rounded-tl-lg" />
                                        <div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 border-emerald-400 rounded-tr-lg" />
                                        <div className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 border-emerald-400 rounded-bl-lg" />
                                        <div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 border-emerald-400 rounded-br-lg" />
                                    </div>
                                </div>

                                <div className="flex items-start gap-2.5 mt-4 bg-slate-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-slate-100 dark:border-zinc-700">
                                    <span className="material-symbols-outlined text-slate-400 text-lg mt-0.5">info</span>
                                    <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                                        Ask the student to open their Redeem Water page, select points, and show the generated QR code to this camera.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <ScanResultCard
                                status={status}
                                message={message}
                                result={result}
                                onReset={resetScanner}
                            />
                        )}
                    </>
                )}

                {/* ══════════════════════════════════════════════
                    ESP32-CAM MODE
                ══════════════════════════════════════════════ */}
                {scanMode === "esp32" && (
                    <div className="w-full space-y-4">
                        {/* Live Banner */}
                        <div className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                            <span className="relative flex h-2 w-2 shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                                Physical Hardware Mode — ESP32-CAM handles scanning automatically
                            </span>
                        </div>

                        {/* IP Input */}
                        <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-slate-100 dark:border-zinc-700 p-4">
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                ESP32-CAM IP Address
                            </p>
                            <p className="text-xs text-slate-400 mb-3">
                                After flashing the CAM, check the Arduino Serial Monitor for the IP. Both devices must be on the same WiFi.
                            </p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={esp32Ip}
                                    onChange={(e) => setEsp32Ip(e.target.value)}
                                    placeholder="e.g. 192.168.0.105"
                                    className="flex-1 h-10 px-3 rounded-xl border border-slate-200 dark:border-zinc-600 bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-white text-sm outline-none focus:border-emerald-400 transition"
                                />
                                <button
                                    onClick={connectStream}
                                    className="h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-colors flex items-center gap-1.5"
                                >
                                    <span className="material-symbols-outlined text-base">play_arrow</span>
                                    Connect
                                </button>
                            </div>
                        </div>

                        {/* Live Stream Viewer */}
                        {streamUrl && (
                            <div className="w-full">
                                <div className="relative rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-zinc-700 bg-black">
                                    {/* Status overlay */}
                                    {!streamConnected && !streamError && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black/80">
                                            <div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-3" />
                                            <p className="text-white text-sm font-semibold">Connecting to camera...</p>
                                            <p className="text-slate-400 text-xs mt-1">{streamUrl}</p>
                                        </div>
                                    )}

                                    {streamError && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black/90 p-6 text-center">
                                            <span className="material-symbols-outlined text-red-500 text-4xl mb-3">videocam_off</span>
                                            <p className="text-white font-bold mb-1">Cannot reach camera</p>
                                            <p className="text-slate-400 text-xs mb-4">
                                                Make sure the ESP32-CAM is powered on, connected to WiFi, and you have the correct IP address.
                                            </p>
                                            <button
                                                onClick={connectStream}
                                                className="px-4 py-2 bg-white/10 text-white rounded-xl text-sm font-semibold hover:bg-white/20 transition"
                                            >
                                                Retry
                                            </button>
                                        </div>
                                    )}

                                    {/* MJPEG Stream */}
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        ref={imgRef}
                                        src={streamUrl}
                                        alt="ESP32-CAM Live Stream"
                                        className="w-full"
                                        style={{ minHeight: "280px", display: "block" }}
                                        onLoad={handleStreamLoad}
                                        onError={handleStreamError}
                                    />

                                    {/* Connected indicator + corner brackets */}
                                    {streamConnected && (
                                        <div className="absolute inset-0 pointer-events-none z-10">
                                            {/* LIVE badge */}
                                            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-1">
                                                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                                                <span className="text-white text-[10px] font-bold tracking-wider">LIVE</span>
                                            </div>
                                            {/* ESP32 badge */}
                                            <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-1">
                                                <span className="text-emerald-400 text-[10px] font-bold">ESP32-CAM</span>
                                            </div>
                                            {/* Corner brackets */}
                                            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-48 h-48">
                                                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-emerald-400 rounded-tl-lg" />
                                                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-emerald-400 rounded-tr-lg" />
                                                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-emerald-400 rounded-bl-lg" />
                                                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-emerald-400 rounded-br-lg" />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Info box */}
                                <div className="mt-3 flex items-start gap-2.5 bg-slate-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-slate-100 dark:border-zinc-700">
                                    <span className="material-symbols-outlined text-emerald-500 text-lg mt-0.5">info</span>
                                    <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                                        The ESP32-CAM automatically detects QR codes and sends the token to the Main Controller, which then contacts the server.
                                        This live view is for monitoring only — scanning happens on the hardware itself.
                                    </p>
                                </div>

                                {/* Open in browser */}
                                <a
                                    href={`http://${esp32Ip.trim()}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-3 w-full flex items-center justify-center gap-2 h-10 rounded-xl border border-slate-200 dark:border-zinc-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition"
                                >
                                    <span className="material-symbols-outlined text-base">open_in_new</span>
                                    Open camera status page in browser
                                </a>
                            </div>
                        )}

                        {/* Wiring Quick Reference */}
                        <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-slate-100 dark:border-zinc-700 p-4">
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-slate-400 text-base">cable</span>
                                Quick Wiring Reference
                            </p>
                            <div className="space-y-2 text-xs">
                                {[
                                    { from: "ESP32-CAM 5V", to: "DevKit VIN/5V", note: "Power" },
                                    { from: "ESP32-CAM GND", to: "DevKit GND", note: "Ground" },
                                    { from: "ESP32-CAM TX (GPIO1)", to: "DevKit RX2 (GPIO16)", note: "QR Data" },
                                    { from: "Relay IN", to: "DevKit GPIO 23", note: "Pump trigger" },
                                ].map((row, i) => (
                                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-zinc-900/50">
                                        <span className="font-mono text-slate-600 dark:text-slate-300 flex-1">{row.from}</span>
                                        <span className="material-symbols-outlined text-slate-300 text-sm">arrow_forward</span>
                                        <span className="font-mono text-slate-600 dark:text-slate-300 flex-1">{row.to}</span>
                                        <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wide">{row.note}</span>
                                    </div>
                                ))}
                            </div>
                            <p className="mt-3 text-[10px] text-red-500 font-semibold flex items-start gap-1">
                                <span className="material-symbols-outlined text-xs">warning</span>
                                GPIO0 → GND only during flashing. Remove the jumper before running.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Shared Result Card Component ─────────────────────────────────────────────
function ScanResultCard({
    status,
    message,
    result,
    onReset,
}: {
    status: "idle" | "loading" | "success" | "error";
    message: string;
    result: VerifyResult | null;
    onReset: () => void;
}) {
    return (
        <div className="w-full bg-white dark:bg-zinc-800 rounded-2xl shadow-lg border border-slate-100 dark:border-zinc-700 overflow-hidden">
            {/* Loading */}
            {status === "loading" && (
                <div className="p-8 flex flex-col items-center text-center">
                    <div className="relative w-16 h-16 mb-4">
                        <div className="absolute inset-0 rounded-full border-4 border-blue-500/20" />
                        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="material-symbols-outlined text-blue-500 text-2xl">qr_code_scanner</span>
                        </div>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Processing...</h3>
                    <p className="text-slate-500 text-sm mt-1">{message}</p>
                </div>
            )}

            {/* Success */}
            {status === "success" && result && (
                <div className="p-6 flex flex-col items-center">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 mb-4">
                        <span className="material-symbols-outlined text-white text-3xl">check</span>
                    </div>
                    <h3 className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mb-1">Verification OK</h3>
                    <p className="text-slate-500 text-sm mb-5">{message}</p>

                    <div className="w-full space-y-2 mb-5">
                        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-zinc-900/50 rounded-xl">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-blue-500 text-lg">person</span>
                                <span className="text-slate-500 text-sm">Student</span>
                            </div>
                            <span className="text-slate-900 dark:text-white font-semibold text-sm">{result.userName}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-zinc-900/50 rounded-xl">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-amber-500 text-lg">toll</span>
                                <span className="text-slate-500 text-sm">Points</span>
                            </div>
                            <span className="text-red-500 font-bold text-sm">-{result.pointsDeducted} pts</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-zinc-900/50 rounded-xl">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-cyan-500 text-lg">water_drop</span>
                                <span className="text-slate-500 text-sm">Water</span>
                            </div>
                            <span className="text-cyan-600 font-bold">{result.waterAmount}ml</span>
                        </div>
                    </div>

                    <p className="text-slate-400 text-xs mb-3">Auto-resetting in 5 seconds...</p>
                    <button
                        onClick={onReset}
                        className="w-full h-11 bg-slate-900 dark:bg-white/10 text-white font-bold rounded-xl hover:bg-slate-800 dark:hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined text-lg">qr_code_scanner</span>
                        Scan Next
                    </button>
                </div>
            )}

            {/* Error */}
            {status === "error" && (
                <div className="p-6 flex flex-col items-center text-center">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/30 mb-4">
                        <span className="material-symbols-outlined text-white text-3xl">close</span>
                    </div>
                    <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-1">Invalid QR</h3>
                    <p className="text-slate-500 text-sm mb-5">{message}</p>

                    <button
                        onClick={onReset}
                        className="w-full h-11 bg-slate-900 dark:bg-white/10 text-white font-bold rounded-xl hover:bg-slate-800 dark:hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined text-lg">refresh</span>
                        Try Again
                    </button>
                </div>
            )}
        </div>
    );
}
