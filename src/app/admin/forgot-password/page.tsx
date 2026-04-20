"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";
import { showToast } from "@/lib/toast";
import { OtpInput } from "@/components/OtpInput";

export default function AdminForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loadingCode, setLoadingCode] = useState(false);
    const [loadingReset, setLoadingReset] = useState(false);
    const [message, setMessage] = useState<string>("");
    const router = useRouter();

    useEffect(() => {
        document.body.style.backgroundColor = "#f9fafb";

        return () => {
            document.body.style.backgroundColor = "";
        };
    }, []);

    const handleSendCode = async () => {
        if (!email) {
            setMessage("Enter your email first.");
            return;
        }

        setLoadingCode(true);
        setMessage("");
        try {
            const response = await apiClient<{ message: string }>(
                "/api/auth/request-verification-code",
                {
                    method: "POST",
                    body: JSON.stringify({ email, purpose: "reset_password" }),
                    skipAuthRedirect: true,
                }
            );

            setMessage(response.message);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Failed to send code.");
        } finally {
            setLoadingCode(false);
        }
    };

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage("");

        if (code.length < 6) {
            setMessage("Enter the 6-digit verification code.");
            return;
        }
        if (newPassword.length < 8) {
            setMessage("New password must be at least 8 characters.");
            return;
        }
        if (newPassword !== confirmPassword) {
            setMessage("Passwords do not match.");
            return;
        }

        setLoadingReset(true);
        try {
            const response = await apiClient<{ message: string }>("/api/auth/reset-password", {
                method: "POST",
                body: JSON.stringify({ email, code, newPassword }),
                skipAuthRedirect: true,
            });

            await showToast({ text: response.message, type: "success" });
            setMessage("Password updated. Redirecting to admin login...");
            
            // Redirect after a short delay
            setTimeout(() => {
                router.push("/admin/login");
            }, 1000);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Failed to reset password.");
        } finally {
            setLoadingReset(false);
        }
    };

    return (
        <div className="relative flex min-h-[100dvh] items-center justify-center bg-gray-50 px-4 py-8 font-display overflow-hidden">
            <div className="absolute inset-0 z-0">
                <Image
                    src="/images/pdm-building.jpg"
                    alt="Background"
                    fill
                    className="object-cover"
                    priority
                />
                <div className="absolute inset-0 bg-white/30" />
            </div>

            <div className="relative z-10 w-full max-w-md rounded-[32px] border border-gray-100 bg-white p-8 shadow-[0_20px_50px_rgba(0,0,0,0.1)]">
                <div className="mb-6 flex flex-col items-center text-center">
                    <h1 className="text-2xl font-black tracking-tight text-gray-900 uppercase">Admin Recovery</h1>
                    <p className="mt-1.5 text-[13px] font-bold text-gray-400 uppercase tracking-widest">Secure Password Reset</p>
                </div>

                <form onSubmit={handleReset} className="mt-6 space-y-5">
                    <div>
                        <label htmlFor="admin-forgot-email" className="ml-1 mb-2 block text-[11px] font-black uppercase tracking-wider text-gray-400">Admin Email</label>
                        <input
                            id="admin-forgot-email"
                            name="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="block w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3.5 text-sm font-bold text-gray-900 placeholder-gray-400 transition-all focus:border-blue-500/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                            placeholder="your@email.com"
                            required
                        />
                    </div>

                    <button
                        type="button"
                        onClick={handleSendCode}
                        disabled={loadingCode}
                        className="w-full rounded-2xl bg-blue-50 px-4 py-3 text-xs font-black uppercase tracking-widest text-blue-600 transition hover:bg-blue-100 disabled:opacity-60"
                    >
                        {loadingCode ? "Sending..." : "Send Verification Code"}
                    </button>

                    <div>
                        <label className="ml-1 mb-3 block text-[11px] font-black uppercase tracking-wider text-gray-400 text-center">Verification Code</label>
                        <OtpInput value={code} onChange={setCode} disabled={loadingCode} />
                    </div>

                    <div>
                        <label htmlFor="admin-forgot-new-password" className="ml-1 mb-2 block text-[11px] font-black uppercase tracking-wider text-gray-400">New Password</label>
                        <input
                            id="admin-forgot-new-password"
                            name="newPassword"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="block w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3.5 text-sm font-bold text-gray-900 placeholder-gray-400 transition-all focus:border-blue-500/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="admin-forgot-confirm-password" className="ml-1 mb-2 block text-[11px] font-black uppercase tracking-wider text-gray-400">Confirm Password</label>
                        <input
                            id="admin-forgot-confirm-password"
                            name="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="block w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3.5 text-sm font-bold text-gray-900 placeholder-gray-400 transition-all focus:border-blue-500/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    {message && (
                        <div className={`rounded-xl px-4 py-3 text-[13px] font-bold ${message.includes("updated") || message.includes("sent") ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-red-50 text-red-600 border border-red-100"}`}>
                            {message}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loadingReset}
                        className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-emerald-600 px-4 py-4 text-[14px] font-black text-white shadow-xl shadow-blue-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                    >
                        {loadingReset ? "Updating..." : "Update Password"}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <Link href="/admin/login" className="text-xs font-black uppercase tracking-widest text-emerald-600 hover:text-blue-600 transition-all">
                        Back to Admin Login
                    </Link>
                </div>
            </div>

            <p className="fixed bottom-8 text-center text-[11px] font-black uppercase tracking-[0.3em] text-gray-400">
                EcoDefill Admin area &copy; 2026
            </p>
        </div>
    );
}
