"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { apiClient } from "@/lib/api";
import { showToast } from "@/lib/toast";

export default function AdminLogin() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState<string>("");
    const router = useRouter();

    useEffect(() => {
        document.body.style.backgroundImage = "linear-gradient(to bottom, rgba(0,0,0,0.7), rgba(0,0,0,0.5), rgba(0,0,0,0.8)), url('/images/pdm-building.jpg')";
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

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError("");
        setLoading(true);

        try {
            await apiClient("/api/admin/login", {
                method: "POST",
                body: JSON.stringify({ email, password }),
            });

            await showToast({ text: "Login successful.", type: "success" });
            router.push("/admin/dashboard");
        } catch (err: unknown) {
            setFormError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-[100dvh] w-full items-center justify-center overflow-y-auto bg-transparent py-8 font-display">
            <div className="relative mx-4 w-full max-w-[420px] overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/60 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
                <div className="absolute left-0 top-0 h-1.5 w-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-green-600" />

                <div className="mb-8 mt-2 flex flex-col items-center text-center">
                    <div className="relative mb-5 h-24 w-24">
                        <Image
                            src="/images/pdm-logo.png"
                            alt="PDM Logo"
                            fill
                            className="object-contain drop-shadow-2xl"
                            priority
                        />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">EcoDefill Admin</h1>
                    <p className="mt-2 text-sm font-medium text-emerald-100/70">Enter your secure credentials</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="ml-1 mb-2 block text-[13px] font-semibold uppercase tracking-wider text-emerald-50/80">Email Address</label>
                        <div className="group relative">
                            <input
                                type="email"
                                required
                                className="block w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3.5 pl-11 font-medium text-white placeholder-white/30 shadow-inner transition-all focus:border-emerald-500/50 focus:bg-black/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                                placeholder="admin@ecodefill.com"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    setFormError("");
                                }}
                            />
                            <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-white/40 transition-colors group-focus-within:text-emerald-400">mail</span>
                        </div>
                    </div>

                    <div>
                        <label className="ml-1 mb-2 block text-[13px] font-semibold uppercase tracking-wider text-emerald-50/80">Password</label>
                        <div className="group relative">
                            <input
                                type="password"
                                required
                                className="block w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3.5 pl-11 font-medium text-white placeholder-white/30 shadow-inner transition-all focus:border-emerald-500/50 focus:bg-black/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    setFormError("");
                                }}
                            />
                            <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-white/40 transition-colors group-focus-within:text-emerald-400">lock</span>
                        </div>
                    </div>

                    {formError && (
                        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-300">
                            {formError}
                        </div>
                    )}

                    <div className="pb-2 pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-500 px-4 py-4 text-[15px] font-bold text-white shadow-lg shadow-emerald-900/30 transition-all hover:from-emerald-500 hover:to-green-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50"
                        >
                            {loading ? "Authenticating..." : (
                                <>
                                    Sign In to Dashboard
                                    <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            <p className="absolute bottom-6 left-0 w-full text-center text-xs font-medium tracking-wide text-white/40">
                EcoDefill Admin Area &copy; 2026
            </p>
        </div>
    );
}
