"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";

export default function QRGeneration() {
    const router = useRouter();
    const [qrData, setQrData] = useState<{ token: string, expiresAt: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const generateQR = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await apiClient<{ token: string, expiresAt: string }>("/api/qr-generate", {
                method: "POST"
            });
            setQrData(data);
        } catch (err: any) {
            let message = "Failed to generate QR code";
            if (err instanceof Error) {
                message = err.message;
            } else if (err.message) {
                message = err.message;
            }
            // Enhance the message if it's the 403 limit
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
        generateQR();
    }, []);

    useEffect(() => {
        if (!qrData) return;

        const pollInterval = setInterval(async () => {
            try {
                const data = await apiClient<{ used: boolean }>("/api/qr-status?token=" + qrData.token);
                if (data.used) {
                    clearInterval(pollInterval);
                    Swal.fire({
                        title: 'Success!',
                        html: 'Points added successfully.',
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
    }, [qrData, router]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center">
            {error ? (
                <div className="bg-white p-8 rounded-3xl shadow-lg border border-red-100 flex flex-col items-center justify-center max-w-sm w-full mx-auto mt-10">
                    <span className="material-symbols-outlined text-red-500 text-6xl mb-4">cancel</span>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">
                        {error.includes("10 points") ? "Daily Limit Reached" : "Attention"}
                    </h2>
                    <p className="text-slate-500 text-center">{error}</p>
                </div>
            ) : (
                <>
                    <h1 className="text-2xl font-bold mb-2">Your Personal QR Code</h1>
                    <p className="text-slate-500 mb-8">Scan this code at the EcoDefill station to receive points.</p>

                    <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100 flex flex-col items-center justify-center mb-6">
                        {loading ? (
                            <div className="w-64 h-64 flex items-center justify-center bg-gray-50 rounded-xl">
                                <span className="material-symbols-outlined animate-spin text-4xl text-primary">autorenew</span>
                            </div>
                        ) : (
                            <div className="w-64 h-64 flex items-center justify-center bg-gray-50 rounded-xl border-4 border-primary/20 relative overflow-hidden group">
                                {/* Placeholder for actual QR code rendering, e.g. using qrcode.react */}
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrData?.token}`}
                                    alt="QR Code"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
