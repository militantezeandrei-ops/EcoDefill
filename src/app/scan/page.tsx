"use client";

import { useEffect, useState, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { Button } from "@/components/ui/Button";

export default function ScanPage() {
    const [scanResult, setScanResult] = useState<string | null>(null);
    const [verifying, setVerifying] = useState(false);
    const [message, setMessage] = useState("");
    const [isError, setIsError] = useState(false);

    // We only want to render the scanner once.
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    useEffect(() => {
        // Initialize Scanner
        if (!scannerRef.current) {
            scannerRef.current = new Html5QrcodeScanner(
                "qr-reader",
                { fps: 10, qrbox: { width: 250, height: 250 } },
                false
            );

            scannerRef.current.render(onScanSuccess, onScanFailure);
        }

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
                scannerRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const onScanSuccess = async (decodedText: string, decodedResult: any) => {
        if (verifying || scanResult) return;

        try {
            // Pause scanning while we verify
            if (scannerRef.current) {
                scannerRef.current.pause(true);
            }

            setScanResult(decodedText);
            setVerifying(true);
            setMessage("Verifying token...");
            setIsError(false);

            // Expecting our decoded text to be a JSON string like: {"token":"<jwt>","type":"REDEEM"}
            const payload = JSON.parse(decodedText);

            if (!payload.token || payload.type !== "REDEEM") {
                throw new Error("Invalid QR Code format.");
            }

            // Call verify API
            // Note: Normally, this scanner would be on the ESP32-CAM and it would send the token 
            // along with its own machineId. For this webcam simulation, we simulate being Machine 1.
            const response = await fetch("/api/verify-qr", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    token: payload.token,
                    machineId: "MACHINE_001"
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Verification failed");
            }

            setMessage("Success! Dispensing water...");
            setIsError(false);

        } catch (error: any) {
            console.error("Scan error:", error);
            setMessage(error.message || "Failed to process QR code");
            setIsError(true);
        } finally {
            setVerifying(false);
        }
    };

    const onScanFailure = (error: any) => {
        // We typically ignore failures here as it just means no QR code was found in the frame yet.
    };

    const resetScanner = () => {
        setScanResult(null);
        setMessage("");
        setIsError(false);
        if (scannerRef.current) {
            scannerRef.current.resume();
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden p-6 text-center">
                <h1 className="text-2xl font-bold text-slate-800 mb-2">Machine Scanner</h1>
                <p className="text-slate-500 mb-6 text-sm">Simulating ESP32-CAM functionality</p>

                {/* Container for the HTML5 Scanner */}
                <div
                    id="qr-reader"
                    className="mx-auto border-2 border-slate-200 rounded-lg overflow-hidden flex items-center justify-center"
                    style={{ width: "100%", maxWidth: "300px", minHeight: "300px" }}
                ></div>

                {/* Status / Message Display */}
                {message && (
                    <div className={`mt-6 p-4 rounded-xl border ${isError ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <span className="material-symbols-outlined font-bold">
                                {isError ? 'error' : 'check_circle'}
                            </span>
                            <span className="font-bold">{isError ? 'Error' : 'Verified'}</span>
                        </div>
                        <p className="text-sm">{message}</p>
                    </div>
                )}

                {/* Actions */}
                {scanResult && !verifying && (
                    <div className="mt-6">
                        <Button onClick={resetScanner} className="w-full" icon="refresh">
                            Scan Another
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
