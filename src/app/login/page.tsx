"use client";

import { useState } from "react";
import { Shell } from "@/components/layout/Shell";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
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
        <Shell
            title="Welcome Back"
            subtitle="Log in to continue recycling and earning water refill rewards."
        >
            <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-6 pb-8 w-full mt-4">
                {error && <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm text-center">{error}</div>}
                <Input
                    label="Email Address"
                    type="email"
                    icon="mail"
                    placeholder="student@pdm.edu.ph"
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

                <div className="mt-4 text-center">
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                        Don&apos;t have an account?
                        <Link href="/register" className="text-primary font-bold hover:underline ml-1">
                            Create Account
                        </Link>
                    </p>
                </div>
            </form>
        </Shell>
    );
}
