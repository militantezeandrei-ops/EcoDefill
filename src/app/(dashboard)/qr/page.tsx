"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import { useRouter } from "next/navigation";
import { showToast } from "@/lib/toast";

import Image from "next/image";

export default function QRGeneration() {
    const router = useRouter();
    const [qrData, setQrData] = useState<{ token: string; expiresAt: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const generateQR = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await apiClient<{ token: string; expiresAt: string }>("/api/qr-generate", {
                method: "POST",
            });
            setQrData(data);
        } catch (err: any) {
            let message = "Failed to generate QR code";
            if (err instanceof Error) {
                message = err.message;
            } else if (err?.message) {
                message = err.message;
            }
            if (message.includes("Daily earning limit")) {
                message = "You have reached your daily earning limit of 10 points. Come back tomorrow!";
            }
            if (message.includes("Rate limit exceeded")) {
                message = "Please wait a moment before trying to generate the QR code again.";
            }

            setError(message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void generateQR();
    }, []);

    useEffect(() => {
        if (!qrData) return;

        const pollInterval = setInterval(async () => {
            try {
                const data = await apiClient<{ used: boolean }>("/api/qr-status?token=" + qrData.token);
                if (data.used) {
                    clearInterval(pollInterval);
                    await showToast({ text: "Points added successfully.", type: "success" });
                    router.push("/dashboard");
                }
            } catch (err) {
                console.error("Polling error", err);
            }
        }, 2000);

        return () => clearInterval(pollInterval);
    }, [qrData, router]);

    return (
        <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 pb-4 pt-[calc(var(--safe-top)+14px)] text-center">
            {error ? (
                <div className="mx-auto mt-6 flex w-full max-w-sm flex-col items-center justify-center rounded-3xl border border-red-100 bg-white p-6 shadow-lg">
                    <span className="material-symbols-outlined text-red-500 text-6xl mb-4">cancel</span>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">{error.includes("10 points") ? "Daily Limit Reached" : "Attention"}</h2>
                    <p className="text-slate-500 text-center">{error}</p>
                </div>
            ) : (
                <>
                    <h1 className="mb-2 text-2xl font-bold">Your Personal QR Code</h1>
                    <p className="mb-6 text-sm leading-relaxed text-slate-500">Scan this code at the EcoDefill station to receive points.</p>

                    <div className="mb-4 flex flex-col items-center justify-center rounded-3xl border border-gray-100 bg-white p-5 shadow-lg">
                        {loading ? (
                            <div className="flex h-64 w-64 items-center justify-center rounded-xl bg-gray-50">
                                <span className="material-symbols-outlined animate-spin text-4xl text-primary">autorenew</span>
                            </div>
                        ) : (
                            <div className="relative flex h-64 w-64 items-center justify-center overflow-hidden rounded-xl border-4 border-primary/20 bg-gray-50">
                                <Image
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrData?.token}`}
                                    alt="QR Code"
                                    fill
                                    className="object-cover"
                                />
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
