"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import Image from "next/image";
import { z } from "zod";
import { showToast } from "@/lib/toast";

const loginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
});

interface FormErrors {
    email?: string;
    password?: string;
    form?: string;
}

const OFFLINE_LOGIN_MESSAGE = "No internet connection. Turn on Wi-Fi or mobile data, then try again.";

export default function Login() {
    const { login } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<FormErrors>({});

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        const result = loginSchema.safeParse({ email, password });
        if (!result.success) {
            const nextErrors: FormErrors = {};
            result.error.issues.forEach((issue) => {
                const field = issue.path[0];
                if (field === "email" || field === "password") {
                    nextErrors[field] = issue.message;
                }
            });
            setErrors(nextErrors);
            return;
        }

        setLoading(true);
        try {
            const data = await apiClient<{ token: string; user: { id: string; email: string; role: "STUDENT" | "ADMIN"; balance: number } }>("/api/auth/login", {
                method: "POST",
                body: JSON.stringify({ email, password }),
                skipAuthRedirect: true,
            });

            if (data.user.role === "ADMIN") {
                setErrors({ form: "Admin accounts cannot log in via the mobile app." });
                return;
            }

            await login(data.token, data.user);
            await showToast({ text: "You have logged in successfully.", type: "success" });
        } catch (err: unknown) {
            const rawMessage = err instanceof Error ? err.message : "Failed to log in";
            setErrors({
                form: rawMessage === "No internet connection. Please reconnect and try again."
                    ? OFFLINE_LOGIN_MESSAGE
                    : rawMessage,
            });
        } finally {
            setLoading(false);
        }
    };

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

    return (
        <div className="relative flex h-[100dvh] w-full items-center justify-center overflow-hidden bg-transparent font-display">
            <div className="relative mx-4 w-full max-w-[420px] overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/40 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-md sm:p-8">
                <div className="absolute left-0 top-0 h-1.5 w-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-green-600" />

                <div className="mb-6 mt-0 flex flex-col items-center text-center">
                    <div className="relative mb-4 h-20 w-20">
                        <Image
                            src="/images/pdm-logo.png"
                            alt="PDM Logo"
                            fill
                            className="object-contain drop-shadow-2xl"
                            priority
                        />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">EcoDefill</h1>
                    <p className="mt-1 text-xs font-medium text-emerald-100/70">Log in to recycle, earn points, and redeem water refills.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="login-email" className="ml-1 mb-2 block text-[12px] font-semibold uppercase tracking-wider text-emerald-50/80">Email Address</label>
                        <div className="group relative">
                            <input
                                id="login-email"
                                name="email"
                                type="email"
                                required
                                className={`block w-full rounded-xl border bg-black/40 px-4 py-3 pl-11 text-sm font-medium text-white placeholder-white/30 shadow-inner transition-all focus:bg-black/60 focus:outline-none focus:ring-1 ${errors.email ? "border-red-500/70 focus:ring-red-500/60" : "border-white/10 focus:border-emerald-500/50 focus:ring-emerald-500/50"}`}
                                placeholder="juan@gmail.com"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    setErrors((prev) => ({ ...prev, email: undefined, form: undefined }));
                                }}
                            />
                            <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[18px] text-white/40 transition-colors group-focus-within:text-emerald-400">mail</span>
                        </div>
                        {errors.email && <p className="ml-1 mt-1 text-xs font-medium text-red-400">{errors.email}</p>}
                    </div>

                    <div>
                        <label htmlFor="login-password" className="ml-1 mb-2 block text-[12px] font-semibold uppercase tracking-wider text-emerald-50/80">Password</label>
                        <div className="group relative">
                            <input
                                id="login-password"
                                name="password"
                                type="password"
                                required
                                className={`block w-full rounded-xl border bg-black/40 px-4 py-3 pl-11 text-sm font-medium text-white placeholder-white/30 shadow-inner transition-all focus:bg-black/60 focus:outline-none focus:ring-1 ${errors.password ? "border-red-500/70 focus:ring-red-500/60" : "border-white/10 focus:border-emerald-500/50 focus:ring-emerald-500/50"}`}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    setErrors((prev) => ({ ...prev, password: undefined, form: undefined }));
                                }}
                            />
                            <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[18px] text-white/40 transition-colors group-focus-within:text-emerald-400">lock</span>
                        </div>
                        {errors.password && <p className="ml-1 mt-1 text-xs font-medium text-red-400">{errors.password}</p>}
                        <div className="mt-2 text-right">
                            <Link href="/forgot-password" title="Forgot Password" className="text-[11px] font-semibold text-emerald-300/80 transition-colors hover:text-emerald-200">
                                Forgot password?
                            </Link>
                        </div>
                    </div>

                    {errors.form && (
                        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-300">
                            {errors.form}
                        </div>
                    )}

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-500 px-4 py-3.5 text-[14px] font-bold text-white shadow-lg shadow-emerald-900/30 transition-all hover:from-emerald-500 hover:to-green-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50"
                        >
                            {loading ? "Authenticating..." : (
                                <>
                                    Log In
                                    <span className="material-symbols-outlined text-[18px]">login</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>

                <div className="mt-8 text-center text-[13px]">
                    <span className="text-white/50">Don&apos;t have an account?</span>
                    <Link href="/register" className="ml-2 font-bold text-emerald-400 transition-all hover:text-emerald-300 hover:underline hover:underline-offset-4">
                        Create Account
                    </Link>
                </div>
            </div>

            <p className="absolute bottom-6 left-0 w-full text-center text-[11px] font-medium tracking-wide text-white/40">
                Pambayang Dalubhasaan ng Marilao &copy; 2026
                <br />
                EcoDefill v1.0
            </p>
        </div>
    );
}
