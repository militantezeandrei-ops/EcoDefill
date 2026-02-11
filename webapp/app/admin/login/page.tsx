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
        <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] admin-gradient-bg p-6 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-100/30 rounded-full blur-[100px]"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-slate-200/20 rounded-full blur-[100px]"></div>

            <div className="w-full max-w-lg z-10 animate-in">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-white mb-8 border border-slate-100 shadow-xl">
                        <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">Admin Portal</h1>
                    <p className="text-slate-500 font-bold mt-2 text-sm uppercase tracking-widest">Secure Access Interface</p>
                </div>

                <Card className="p-10 lg:p-12 border-slate-200 bg-white/80 backdrop-blur-xl shadow-2xl rounded-[2.5rem]">
                    {error && (
                        <div className="mb-8 p-4 bg-red-50 text-red-600 text-xs font-black rounded-xl border border-red-100 animate-in text-center uppercase tracking-widest">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Identity</label>
                            <input
                                type="email"
                                required
                                placeholder="Email Address"
                                className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-5 text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Security Key</label>
                            <input
                                type="password"
                                required
                                placeholder="Password"
                                className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-5 text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <Button type="submit" variant="primary" className="w-full h-16 text-xs font-black bg-slate-900 text-white uppercase tracking-widest mt-4 rounded-2xl shadow-lg hover:bg-slate-800 transition-all" disabled={loading}>
                            {loading ? "Verifying..." : "Initialize Session"}
                        </Button>
                    </form>
                </Card>

                <div className="mt-12 text-center">
                    <Link href="/" className="text-slate-400 hover:text-slate-900 text-xs font-bold transition-colors uppercase tracking-widest">
                        Return to Platform
                    </Link>
                </div>
            </div>
        </div>
    );
}
