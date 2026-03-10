"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";

export default function QRGeneration() {
    const [qrData, setQrData] = useState<{ token: string, expiresAt: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [timeLeft, setTimeLeft] = useState(60);

    const generateQR = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await apiClient<{ token: string, expiresAt: string }>("/api/qr-generate", {
                method: "POST"
            });
            setQrData(data);
            setTimeLeft(60);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to generate QR code");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        generateQR();
    }, []);

    useEffect(() => {
        if (!qrData) return;

        const interval = setInterval(() => {
            const now = new Date().getTime();
            const expires = new Date(qrData.expiresAt).getTime();
            const diff = Math.max(0, Math.floor((expires - now) / 1000));

            setTimeLeft(diff);

            if (diff === 0) {
                clearInterval(interval);
                // Optionally auto-refresh: generateQR();
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [qrData]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center">
            <h1 className="text-2xl font-bold mb-2">Your Personal QR Code</h1>
            <p className="text-slate-500 mb-8">Scan this code at the EcoDefill station to receive points.</p>

            <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100 flex flex-col items-center justify-center mb-6">
                {loading ? (
                    <div className="w-64 h-64 flex items-center justify-center bg-gray-50 rounded-xl">
                        <span className="material-symbols-outlined animate-spin text-4xl text-primary">autorenew</span>
                    </div>
                ) : error ? (
                    <div className="w-64 h-64 flex flex-col items-center justify-center bg-red-50 text-red-500 rounded-xl p-4">
                        <span className="material-symbols-outlined text-4xl mb-2">error</span>
                        <p>{error}</p>
                    </div>
                ) : (
                    <div className="w-64 h-64 flex items-center justify-center bg-gray-50 rounded-xl border-4 border-primary/20 relative overflow-hidden group">
                        {/* Placeholder for actual QR code rendering, e.g. using qrcode.react */}
                        <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrData?.token}`}
                            alt="QR Code"
                            className={`w-full h-full object-cover ${timeLeft === 0 ? 'opacity-20 grayscale' : ''}`}
                        />
                        {timeLeft === 0 && (
                            <div className="absolute inset-0 flex items-center justify-center flex-col">
                                <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">timer_off</span>
                                <p className="text-slate-600 font-bold">Expired</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="flex flex-col items-center">
                <p className="font-mono text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">
                    {timeLeft > 0 ? `Expires in ${timeLeft}s` : "Code Expired"}
                </p>

                <button
                    onClick={generateQR}
                    disabled={loading || timeLeft > 0 && timeLeft < 55}
                    className="flex items-center gap-2 px-6 py-3 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-full font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <span className="material-symbols-outlined">refresh</span>
                    Refresh Code
                </button>
            </div>
        </div>
    );
}
