"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import Link from "next/link";

export default function StudentLoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                const data = userDoc.data();
                if (data.role === "admin") {
                    // Sign out if it's an admin trying to login via student portal
                    await auth.signOut();
                    setError("This portal is for students only. Admins please use the administrative portal.");
                } else {
                    router.push("/dashboard");
                }
            } else {
                setError("User profile not found. Please register as a student.");
            }
        } catch (err: any) {
            console.error(err);
            setError("Invalid email or password.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center gradient-bg p-6">
            <div className="w-full max-w-md animate-in">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-[#11d452]/10 mb-6 drop-shadow-sm">
                        <svg className="w-10 h-10 text-[#11d452]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09a10.116 10.116 0 001.28-3.517 10.117 10.117 0 011.5-3.518 10.118 10.118 0 001.28-3.517 10.117 10.117 0 011.5-3.517M12 11c0-3.517 1.009-6.799 2.753-9.571m3.44 2.04l-.054.09a10.116 10.116 0 00-1.28 3.517 10.117 10.117 0 01-1.5 3.517 10.118 10.118 0 00-1.28 3.517 10.117 10.117 0 01-1.5 3.517" />
                        </svg>
                    </div>
                    <h1 className="text-4xl font-black font-display text-gray-900 tracking-tight">EcoDefill.</h1>
                    <p className="text-gray-500 font-medium mt-2 text-lg">Sign in to your student hub</p>
                </div>

                <Card className="p-8 lg:p-10 shadow-2xl shadow-green-100/50 border-white/50 bg-white/90 glass-morphism shine">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm font-bold rounded-xl border-2 border-red-100 animate-in">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <Input
                            label="Email Address"
                            type="email"
                            required
                            placeholder="Email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />

                        <Input
                            label="Password"
                            type="password"
                            required
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />

                        <Button type="submit" className="w-full text-base font-bold" disabled={loading} size="lg">
                            {loading ? "Authenticating..." : "Sign In"}
                        </Button>
                    </form>

                    <div className="mt-10 pt-8 border-t border-gray-100 text-center">
                        <p className="text-sm font-medium text-gray-500">
                            New to EcoDefill?{" "}
                            <Link href="/register" className="text-[#11d452] hover:underline font-bold transition-all">
                                Create a student profile
                            </Link>
                        </p>
                    </div>
                </Card>

                <p className="mt-8 text-center text-xs text-gray-400 font-medium">
                    &copy; 2024 EcoDefill Sustainability Platform. <br />All rights reserved.
                </p>
            </div>
        </div>
    );
}
