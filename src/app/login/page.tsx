"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import Image from "next/image";
import { z } from "zod";

const loginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
});

export default function Login() {
    const { login } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        const result = loginSchema.safeParse({ email, password });
        if (!result.success) {
            setError(result.error.errors[0].message);
            return;
        }

        setLoading(true);
        try {
            const data = await apiClient<{ token: string, user: { id: string, email: string, role: 'STUDENT' | 'ADMIN', balance: number } }>("/api/auth/login", {
                method: "POST",
                body: JSON.stringify({ email, password })
            });

            login(data.token, data.user);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to log in");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden font-display">
            {/* Background Image */}
            <div className="absolute inset-0 z-0">
                <Image
                    src="/images/pdm-building.jpg"
                    alt="PDM Campus"
                    fill
                    className="object-cover"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
            </div>

            {/* Login Card */}
            <div className="relative z-10 w-full max-w-[420px] mx-4">
                <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-black/30 overflow-hidden">
                    {/* Logo Section */}
                    <div className="flex flex-col items-center pt-8 pb-4 px-6">
                        <div className="w-24 h-24 relative mb-4">
                            <Image
                                src="/images/pdm-logo.png"
                                alt="PDM Logo"
                                fill
                                className="object-contain drop-shadow-lg"
                                priority
                            />
                        </div>
                        <h1 className="text-slate-900 dark:text-white text-2xl font-bold tracking-tight text-center">
                            Welcome to EcoDefill
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm text-center mt-1.5 max-w-[280px]">
                            Log in to recycle, earn points, and redeem water refills.
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-6 pb-8 pt-2">
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm text-center font-medium flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-base">error</span>
                                {error}
                            </div>
                        )}

                        <Input
                            label="Email Address"
                            type="email"
                            icon="mail"
                            placeholder="Juan@gmail.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />

                        <Input
                            label="Password"
                            type="password"
                            icon="lock"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />

                        <div className="pt-2">
                            <Button type="submit" icon="login" disabled={loading}>
                                {loading ? "Logging in..." : "Login"}
                            </Button>
                        </div>

                        <div className="text-center pt-1">
                            <p className="text-slate-500 dark:text-slate-400 text-sm">
                                Don&apos;t have an account?
                                <Link href="/register" className="text-primary font-bold hover:underline ml-1">
                                    Create Account
                                </Link>
                            </p>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <p className="text-center text-white/50 text-xs mt-6 font-medium">
                    Pamantasan ng Dalubhasaan ng Marilao • EcoDefill v1.0
                </p>
            </div>
        </div>
    );
}
