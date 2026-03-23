"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api";
import { showToast } from "@/lib/toast";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loadingCode, setLoadingCode] = useState(false);
    const [loadingReset, setLoadingReset] = useState(false);
    const [message, setMessage] = useState<string>("");

    useEffect(() => {
        document.body.style.backgroundImage = "linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.2), rgba(0,0,0,0.5)), url('/images/pdm-building.jpg')";
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundPosition = "center";
        document.body.style.backgroundAttachment = "fixed";
        document.body.style.backgroundRepeat = "no-repeat";

        return () => {
            document.body.style.backgroundImage = "";
            document.body.style.backgroundSize = "";
            document.body.style.backgroundPosition = "";
            document.body.style.backgroundAttachment = "";
            document.body.style.backgroundRepeat = "";
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
            setMessage("Password updated. You can now sign in.");
            setCode("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Failed to reset password.");
        } finally {
            setLoadingReset(false);
        }
    };

    return (
        <div className="relative flex min-h-[100dvh] items-center justify-center px-4 py-8 font-display">
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-900/60 p-6 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
                <h1 className="text-2xl font-bold text-white">Forgot Password</h1>
                <p className="mt-1 text-sm text-white/60">Request a code, then set a new password.</p>

                <form onSubmit={handleReset} className="mt-6 space-y-4">
                    <div>
                        <label htmlFor="forgot-email" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-emerald-50/80">Email</label>
                        <input
                            id="forgot-email"
                            name="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            required
                        />
                    </div>

                    <button
                        type="button"
                        onClick={handleSendCode}
                        disabled={loadingCode}
                        className="w-full rounded-xl border border-emerald-400/40 bg-emerald-500/20 px-4 py-2.5 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/30 disabled:opacity-60"
                    >
                        {loadingCode ? "Sending Code..." : "Send Verification Code"}
                    </button>

                    <div>
                        <label htmlFor="forgot-code" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-emerald-50/80">Verification Code</label>
                        <input
                            id="forgot-code"
                            name="code"
                            inputMode="numeric"
                            maxLength={6}
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="forgot-new-password" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-emerald-50/80">New Password</label>
                        <input
                            id="forgot-new-password"
                            name="newPassword"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="forgot-confirm-password" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-emerald-50/80">Confirm Password</label>
                        <input
                            id="forgot-confirm-password"
                            name="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            required
                        />
                    </div>

                    {message && <p className="text-sm text-amber-200">{message}</p>}

                    <button
                        type="submit"
                        disabled={loadingReset}
                        className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-green-500 px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
                    >
                        {loadingReset ? "Updating Password..." : "Reset Password"}
                    </button>
                </form>

                <div className="mt-5 text-center">
                    <Link href="/login" className="text-sm font-semibold text-emerald-300 hover:text-emerald-200">
                        Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
}
