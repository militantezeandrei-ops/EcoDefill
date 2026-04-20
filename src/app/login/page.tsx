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
        document.body.style.backgroundColor = "#f9fafb"; // Light gray background for the body

        return () => {
            document.body.style.backgroundColor = "";
        };
    }, []);

    return (
        <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-gray-50 px-4 py-12 font-display overflow-hidden">
            {/* Background Image with White Overlay */}
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

            <div className="relative z-10 mx-4 w-full max-w-[400px] my-auto overflow-hidden rounded-[32px] border border-gray-200 bg-white px-6 py-8 shadow-[0_20px_50px_rgba(0,0,0,0.1)]">
                <div className="absolute left-0 top-0 h-1.5 w-full bg-gradient-to-r from-blue-500 via-emerald-500 to-green-500" />

                <div className="mb-4 mt-0 flex flex-col items-center text-center">
                    <div className="relative mb-3 h-16 w-16">
                        <Image
                            src="/images/pdm-logo.png"
                            alt="PDM Logo"
                            fill
                            className="object-contain drop-shadow-xl"
                            priority
                        />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">EcoDefill</h1>
                    <p className="mt-1 text-xs font-medium text-gray-500">Log in to recycle, earn points, and redeem water refills.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label htmlFor="login-email" className="ml-1 mb-2 block text-[12px] font-bold uppercase tracking-wider text-gray-400">Email Address</label>
                        <div className="group relative">
                            <input
                                id="login-email"
                                name="email"
                                type="email"
                                required
                                className={`block w-full rounded-2xl border bg-gray-50 px-4 py-3 pl-11 text-sm font-medium text-gray-900 placeholder-gray-400 transition-all focus:bg-white focus:outline-none focus:ring-2 ${errors.email ? "border-red-500/70 focus:ring-red-500/20" : "border-gray-200 focus:border-blue-500/50 focus:ring-blue-500/20"}`}
                                placeholder="juan@gmail.com"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    setErrors((prev) => ({ ...prev, email: undefined, form: undefined }));
                                }}
                            />
                            <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[18px] text-gray-400 transition-colors group-focus-within:text-blue-500">mail</span>
                        </div>
                        {errors.email && <p className="ml-1 mt-1 text-xs font-medium text-red-500">{errors.email}</p>}
                    </div>

                    <div>
                        <label htmlFor="login-password" className="ml-1 mb-2 block text-[12px] font-bold uppercase tracking-wider text-gray-400">Password</label>
                        <div className="group relative">
                            <input
                                id="login-password"
                                name="password"
                                type="password"
                                required
                                className={`block w-full rounded-xl border bg-gray-50 px-4 py-3 pl-11 text-sm font-medium text-gray-900 placeholder-gray-400 transition-all focus:bg-white focus:outline-none focus:ring-2 ${errors.password ? "border-red-500/70 focus:ring-red-500/20" : "border-gray-200 focus:border-blue-500/50 focus:ring-blue-500/20"}`}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    setErrors((prev) => ({ ...prev, password: undefined, form: undefined }));
                                }}
                            />
                            <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[18px] text-gray-400 transition-colors group-focus-within:text-blue-500">lock</span>
                        </div>
                        {errors.password && <p className="ml-1 mt-1 text-xs font-medium text-red-500">{errors.password}</p>}
                        <div className="mt-2 text-right">
                            <Link href="/forgot-password" title="Forgot Password" className="text-[11px] font-bold text-blue-600 transition-colors hover:text-blue-700">
                                Forgot password?
                            </Link>
                        </div>
                    </div>

                    {errors.form && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
                            {errors.form}
                        </div>
                    )}

                    <div className="pt-2 flex justify-center">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex w-full max-w-[340px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-emerald-600 px-4 py-4 text-[14px] font-black text-white shadow-xl shadow-blue-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
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

                <div className="mt-5 text-center text-[13px]">
                    <span className="text-gray-500 font-medium">Don&apos;t have an account?</span>
                    <Link href="/register" className="ml-2 font-bold text-emerald-600 transition-all hover:text-emerald-700 hover:underline hover:underline-offset-4">
                        Create Account
                    </Link>
                </div>
            </div>

            <p className="mt-10 text-center text-[11px] font-black uppercase tracking-[0.3em] text-gray-400">
                EcoDefill &copy; 2026 • PDM
            </p>
        </div>

    );
}
