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
  const [scanMode, setScanMode] = useState<ScanMode>("webcam");

  const [scanResult, setScanResult] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [scanCount, setScanCount] = useState(0);
  const [needsReset, setNeedsReset] = useState(false);

  const scannerRef = useRef<any>(null);
  const processingRef = useRef(false);
  const isInitializing = useRef(false);

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

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
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
            } catch {
              // ignore non-json payload
            }

            const data = await apiClient<{
              userName?: string;
              pointsDeducted?: number;
              waterAmount?: number;
            }>("/api/verify-qr", {
              method: "POST",
              body: JSON.stringify({
                token: tokenToVerify,
                machineId: "MACHINE_01",
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

  useEffect(() => {
    if (scanMode !== "webcam") {
      stopScanner();
    }
  }, [scanMode, stopScanner]);

  const panelStateLabel =
    scanMode === "esp32"
      ? "Hardware"
      : status === "idle"
      ? "Ready"
      : status === "loading"
      ? "Busy"
      : status === "success"
      ? "Done"
      : "Error";

  const panelStateDotClass =
    scanMode === "esp32"
      ? "bg-emerald-500"
      : status === "idle"
      ? "bg-emerald-500"
      : status === "loading"
      ? "bg-amber-500 animate-pulse"
      : status === "success"
      ? "bg-emerald-500"
      : "bg-red-500";

  return (
    <div className="flex-1 overflow-y-auto w-full h-full pb-8 flex flex-col items-center">
      <AdminTopBar />

      <div className="px-4 py-6 w-full flex flex-col items-center max-w-lg">
        <div className="text-center mb-5">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">QR Scanner</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Scan student QR codes to dispense water
          </p>
        </div>

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
            <span className="material-symbols-outlined text-base">memory</span>
            ESP32
          </button>
        </div>

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
            <div className={`w-2.5 h-2.5 rounded-full mx-auto mb-1 ${panelStateDotClass}`} />
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{panelStateLabel}</p>
          </div>
        </div>

        {scanMode === "webcam" && (
          <>
            <div className="w-full mb-5 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span className="text-amber-500 text-xs font-semibold">Simulation Mode - Using PC/Phone webcam</span>
            </div>

            {!scanResult ? (
              <div className="w-full">
                <div className="relative rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-zinc-700 bg-black">
                  <div id="admin-reader" className="w-full" style={{ maxWidth: "100%", minHeight: "300px" }} />
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
                    Ask the student to open Redeem Water, select points, and show the generated QR code.
                  </p>
                </div>
              </div>
            ) : (
              <ScanResultCard status={status} message={message} result={result} onReset={resetScanner} />
            )}
          </>
        )}

        {scanMode === "esp32" && (
          <div className="w-full space-y-4">
            <div className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                Hardware Mode - ESP32-CAM scans, verifies, and dispenses directly
              </span>
            </div>

            <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-slate-100 dark:border-zinc-700 p-4 space-y-3">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Admin Scanner (Text Only)</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Live feed is disabled to keep scanning fast and stable. Use hardware serial monitor logs for live scan events.
              </p>
              <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1 font-mono bg-slate-50 dark:bg-zinc-900/60 p-3 rounded-xl border border-slate-100 dark:border-zinc-700">
                <p>[CAM] Single-board scanner running</p>
                <p>[SCAN] Token: ...</p>
                <p>[HTTP] Verify success.</p>
                <p>[POLL] approved=true dispenseTimeMs=...</p>
                <p>[PUMP] Dispense complete.</p>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-slate-100 dark:border-zinc-700 p-4">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-slate-400 text-base">checklist</span>
                Hardware Checklist
              </p>
              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <p>1. Relay IN -&gt; ESP32-CAM GPIO13</p>
                <p>2. Relay VCC/GND to proper supply, common GND with ESP32-CAM</p>
                <p>3. Stable 5V supply for ESP32-CAM (camera needs clean power)</p>
                <p>4. SERVER_BASE_URL points to your running app</p>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-slate-100 dark:border-zinc-700 p-4">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">What Admin Sees</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Transactions and dispense history are visible in the Admin Dashboard Transactions and Reports pages.
                This Scanner tab is now setup-focused for physical hardware mode.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

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
