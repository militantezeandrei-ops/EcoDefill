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

export default function AdminLoginPage() {
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
            if (userDoc.exists() && userDoc.data().role === "admin") {
                router.push("/admin/dashboard");
            } else {
                setError("Access denied. Admin privileges required.");
                await auth.signOut();
            }
        } catch (err: any) {
            console.error(err);
            setError("Invalid administrative credentials.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-950 p-6 relative overflow-hidden">
            {/* Admin Background Elements */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#13ec5b22] rounded-full blur-[120px]"></div>
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[#11d45211] rounded-full blur-[120px]"></div>

            <div className="w-full max-w-lg z-10 animate-in">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-24 h-24 rounded-[2rem] bg-gray-900 mb-8 border border-white/10 shadow-2xl">
                        <svg className="w-10 h-10 text-[#13ec5b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                    </div>
                    <h1 className="text-4xl font-black font-display text-white tracking-tighter">Admin Portal.</h1>
                    <p className="text-gray-400 font-medium mt-3 text-lg">Secure Access Management Interface</p>
                </div>

                <Card className="p-10 lg:p-12 border-white/10 bg-white/5 backdrop-blur-3xl shadow-2xl shine">
                    {error && (
                        <div className="mb-8 p-4 bg-red-500/10 text-red-400 text-sm font-black rounded-xl border border-red-500/20 animate-in text-center uppercase tracking-widest">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Root Identity</label>
                            <input
                                type="email"
                                required
                                placeholder="admin@ecodefill.io"
                                className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-5 text-white placeholder:text-gray-600 focus:outline-none focus:ring-4 focus:ring-[#13ec5b22] focus:border-[#13ec5b] transition-all font-medium"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Security Key</label>
                            <input
                                type="password"
                                required
                                placeholder="••••••••••••"
                                className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-5 text-white placeholder:text-gray-600 focus:outline-none focus:ring-4 focus:ring-[#13ec5b22] focus:border-[#13ec5b] transition-all font-medium"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <Button type="submit" variant="primary" className="w-full h-16 text-sm font-black uppercase tracking-[0.2em] mt-4" disabled={loading}>
                            {loading ? "Verifying..." : "Initialize Session"}
                        </Button>
                    </form>
                </Card>

                <div className="mt-12 text-center">
                    <Link href="/" className="text-gray-500 hover:text-white text-xs font-bold transition-colors uppercase tracking-widest">
                        Return to Core Platform
                    </Link>
                </div>
            </div>
        </div>
    );
}
