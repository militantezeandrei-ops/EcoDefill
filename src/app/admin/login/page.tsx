"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Swal from "sweetalert2";

export default function AdminLogin() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        document.body.style.backgroundImage = `linear-gradient(to bottom, rgba(0,0,0,0.7), rgba(0,0,0,0.5), rgba(0,0,0,0.8)), url('/images/pdm-building.jpg')`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundAttachment = 'fixed';
        document.body.style.backgroundRepeat = 'no-repeat';

        return () => {
            document.body.style.backgroundImage = '';
            document.body.style.backgroundSize = '';
            document.body.style.backgroundPosition = '';
            document.body.style.backgroundAttachment = '';
            document.body.style.backgroundRepeat = '';
        };
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch("/api/admin/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            if (res.ok) {
                Swal.fire({
                    title: 'Welcome Admin',
                    text: 'Login successful.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false,
                    background: '#18181b',
                    color: '#fff',
                });
                router.push("/admin/dashboard");
            } else {
                const data = await res.json();
                Swal.fire({
                    title: 'Login Failed',
                    text: data.message || "Invalid credentials",
                    icon: 'error',
                    background: '#18181b',
                    color: '#fff',
                    confirmButtonColor: '#10b981',
                });
            }
        } catch (err) {
            Swal.fire({
                title: 'Error',
                text: 'Something went wrong',
                icon: 'error',
                background: '#18181b',
                color: '#fff',
                confirmButtonColor: '#10b981',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-[100dvh] w-full items-center justify-center bg-transparent py-8 font-display overflow-y-auto">
            <div className="relative w-full max-w-[420px] mx-4 rounded-3xl bg-zinc-900/60 backdrop-blur-2xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden">
                {/* Gradient accent top border */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-400 via-emerald-500 to-green-600"></div>

                <div className="mb-8 mt-2 text-center flex flex-col items-center">
                    <div className="w-24 h-24 relative mb-5">
                        <Image
                            src="/images/pdm-logo.png"
                            alt="PDM Logo"
                            fill
                            className="object-contain drop-shadow-2xl"
                            priority
                        />
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">EcoDefill Admin</h1>
                    <p className="mt-2 text-sm text-emerald-100/70 font-medium">Enter your secure credentials</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="block text-[13px] font-semibold text-emerald-50/80 uppercase tracking-wider mb-2 ml-1">Email Address</label>
                        <div className="relative group">
                            <input
                                type="email"
                                required
                                className="block w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3.5 pl-11 shadow-inner focus:border-emerald-500/50 focus:bg-black/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 text-white placeholder-white/30 transition-all font-medium"
                                placeholder="admin@ecodefill.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-emerald-400 material-symbols-outlined text-[20px] pointer-events-none transition-colors">mail</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[13px] font-semibold text-emerald-50/80 uppercase tracking-wider mb-2 ml-1">Password</label>
                        <div className="relative group">
                            <input
                                type="password"
                                required
                                className="block w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3.5 pl-11 shadow-inner focus:border-emerald-500/50 focus:bg-black/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 text-white placeholder-white/30 transition-all font-medium"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-emerald-400 material-symbols-outlined text-[20px] pointer-events-none transition-colors">lock</span>
                        </div>
                    </div>

                    <div className="pt-2 pb-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-green-500 py-4 px-4 text-[15px] font-bold text-white shadow-lg shadow-emerald-900/30 hover:from-emerald-500 hover:to-green-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50 transition-all gap-2"
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
            
            {/* Footer text */}
            <p className="absolute bottom-6 left-0 w-full text-center text-white/40 text-xs font-medium tracking-wide">
                EcoDefill Admin Area &copy; 2026
            </p>
        </div>
    );
}
