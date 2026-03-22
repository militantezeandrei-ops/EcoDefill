"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import Image from "next/image";
import { z } from "zod";
import Swal from "sweetalert2";

const loginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
});

export default function Login() {
    const { login } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const result = loginSchema.safeParse({ email, password });
        if (!result.success) {
            Swal.fire({
                title: 'Validation Error',
                text: result.error.errors[0].message,
                icon: 'warning',
                background: '#18181b',
                color: '#fff',
                confirmButtonColor: '#10b981',
            });
            return;
        }

        setLoading(true);
        try {
            const data = await apiClient<{ token: string, user: { id: string, email: string, role: 'STUDENT' | 'ADMIN', balance: number } }>("/api/auth/login", {
                method: "POST",
                body: JSON.stringify({ email, password })
            });

            if (data.user.role === 'ADMIN') {
                Swal.fire({
                    title: 'Access Denied',
                    text: 'Admin accounts cannot log in via the mobile app.',
                    icon: 'error',
                    background: '#18181b',
                    color: '#fff',
                    confirmButtonColor: '#10b981',
                });
                return;
            }

            login(data.token, data.user);
            
            Swal.fire({
                title: 'Welcome back!',
                text: 'You have logged in successfully.',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false,
                background: '#18181b',
                color: '#fff',
            });
        } catch (err: any) {
            Swal.fire({
                title: 'Login Failed',
                text: err instanceof Error ? err.message : "Failed to log in",
                icon: 'error',
                background: '#18181b',
                color: '#fff',
                confirmButtonColor: '#10b981',
            });
        } finally {
            setLoading(false);
        }
    };

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

    return (
        <div 
            className="flex h-[100dvh] w-full items-center justify-center bg-transparent font-display overflow-hidden relative"
        >
            <div className="relative w-full max-w-[420px] mx-4 rounded-3xl bg-zinc-900/60 backdrop-blur-2xl p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden">
                {/* Gradient accent top border */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-400 via-emerald-500 to-green-600"></div>

                <div className="mb-6 mt-0 text-center flex flex-col items-center">
                    <div className="w-20 h-20 relative mb-4">
                        <Image
                            src="/images/pdm-logo.png"
                            alt="PDM Logo"
                            fill
                            className="object-contain drop-shadow-2xl"
                            priority
                        />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">EcoDefill</h1>
                    <p className="mt-1 text-xs text-emerald-100/70 font-medium">Log in to recycle, earn points, and redeem water refills.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-[12px] font-semibold text-emerald-50/80 uppercase tracking-wider mb-2 ml-1">Email Address</label>
                        <div className="relative group">
                            <input
                                type="email"
                                required
                                className="block w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 pl-11 shadow-inner focus:border-emerald-500/50 focus:bg-black/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 text-white placeholder-white/30 transition-all font-medium text-sm"
                                placeholder="Juan@gmail.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-emerald-400 material-symbols-outlined text-[18px] pointer-events-none transition-colors">mail</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[12px] font-semibold text-emerald-50/80 uppercase tracking-wider mb-2 ml-1">Password</label>
                        <div className="relative group">
                            <input
                                type="password"
                                required
                                className="block w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 pl-11 shadow-inner focus:border-emerald-500/50 focus:bg-black/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 text-white placeholder-white/30 transition-all font-medium text-sm"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-emerald-400 material-symbols-outlined text-[18px] pointer-events-none transition-colors">lock</span>
                        </div>
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-green-500 py-3.5 px-4 text-[14px] font-bold text-white shadow-lg shadow-emerald-900/30 hover:from-emerald-500 hover:to-green-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50 transition-all gap-2"
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

                <div className="mt-6 text-center">
                    <p className="text-white/60 text-sm">
                        Don&apos;t have an account?
                        <Link href="/register" className="text-emerald-400 font-bold hover:text-emerald-300 ml-2 transition-colors">
                            Create Account
                        </Link>
                    </p>
                </div>
            </div>
            
            {/* Footer text */}
            <p className="absolute bottom-6 left-0 w-full text-center text-white/40 text-[11px] font-medium tracking-wide">
                Pambayang Dalubhasaan ng Marilao &copy; 2026<br/>EcoDefill v1.0
            </p>
        </div>
    );
}
