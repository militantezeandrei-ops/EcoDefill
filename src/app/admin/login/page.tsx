"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { apiClient } from "@/lib/api";
import { showToast } from "@/lib/toast";

const OFFLINE_LOGIN_MESSAGE = "No internet connection. Turn on Wi-Fi or mobile data, then try again.";

export default function AdminLogin() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState<string>("");
    const router = useRouter();

    useEffect(() => {
        document.body.style.backgroundColor = "#f9fafb";

        return () => {
            document.body.style.backgroundColor = "";
        };
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError("");
        setLoading(true);

        try {
            await apiClient("/api/admin/login", {
                method: "POST",
                body: JSON.stringify({ email, password }),
                skipAuthRedirect: true,
            });

            await showToast({ text: "Login successful.", type: "success" });
            router.push("/admin/dashboard");
        } catch (err: unknown) {
            const rawMessage = err instanceof Error ? err.message : "Something went wrong";
            setFormError(
                rawMessage === "No internet connection. Please reconnect and try again."
                    ? OFFLINE_LOGIN_MESSAGE
                    : rawMessage
            );
        } finally {
            setLoading(false);
        }
    };

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

            <div className="relative z-10 w-full max-w-[420px] my-auto overflow-hidden rounded-[32px] border border-gray-200 bg-white p-8 shadow-[0_20px_50px_rgba(0,0,0,0.1)]">
                <div className="absolute left-0 top-0 h-1.5 w-full bg-gradient-to-r from-blue-600 via-emerald-600 to-green-600" />

                <div className="mb-8 mt-2 flex flex-col items-center text-center">
                    <div className="relative mb-5 h-20 w-20">
                        <Image
                            src="/images/pdm-logo.png"
                            alt="PDM Logo"
                            fill
                            className="object-contain drop-shadow-xl"
                            priority
                        />
                    </div>
                    <h1 className="text-2xl font-black tracking-tight text-gray-900 uppercase">EcoDefill Admin</h1>
                    <p className="mt-1.5 text-[13px] font-bold text-gray-400 uppercase tracking-widest">Secure Dashboard Access</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label htmlFor="admin-login-email" className="ml-1 mb-2 block text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Email Address</label>
                        <div className="group relative">
                            <input
                                id="admin-login-email"
                                name="email"
                                type="email"
                                required
                                className="block w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4 pl-12 text-[14px] font-bold text-gray-900 placeholder-gray-400 transition-all focus:border-blue-500/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                                placeholder="ecodefill@gmail.com"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    setFormError("");
                                }}
                            />
                            <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-gray-400 transition-colors group-focus-within:text-blue-600">mail</span>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="admin-login-password" className="ml-1 mb-2 block text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Password</label>
                        <div className="group relative">
                            <input
                                id="admin-login-password"
                                name="password"
                                type="password"
                                required
                                className="block w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4 pl-12 text-[14px] font-bold text-gray-900 placeholder-gray-400 transition-all focus:border-blue-500/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    setFormError("");
                                }}
                            />
                            <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-gray-400 transition-colors group-focus-within:text-blue-600">lock</span>
                        </div>
                        <div className="mt-2 text-right">
                            <Link href="/admin/forgot-password" className="text-[11px] font-bold text-blue-600 hover:text-blue-700 transition-colors uppercase tracking-wider">
                                Forgot Password?
                            </Link>
                        </div>
                    </div>

                    {formError && (
                        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600">
                            {formError}
                        </div>
                    )}

                    <div className="pb-2 pt-2 flex justify-center">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex w-full max-w-[340px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-emerald-600 px-4 py-4 text-[14px] font-black text-white shadow-xl shadow-blue-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                        >
                            {loading ? "Authenticating..." : (
                                <>
                                    <span>Sign In to Dashboard</span>
                                    <span className="material-symbols-outlined text-[20px] transition-transform group-hover:translate-x-1">arrow_forward</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            <p className="mt-10 text-center text-[11px] font-black uppercase tracking-[0.3em] text-gray-400">
                EcoDefill Admin Area &copy; 2026
            </p>
        </div>
    );
}
