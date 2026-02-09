"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import Link from "next/link";

export default function RegisterPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        fullName: "",
        studentId: "",
        email: "",
        password: "",
        course: "",
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                formData.email,
                formData.password
            );
            const user = userCredential.user;

            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                email: user.email,
                name: formData.fullName,
                role: "user",
                studentId: formData.studentId,
                createdAt: serverTimestamp(),
            });

            await setDoc(doc(db, "registrations", user.uid), {
                userId: user.uid,
                studentId: formData.studentId,
                course: formData.course,
                status: "pending",
                registrationDate: serverTimestamp(),
            });

            router.push("/dashboard");
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to register. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col lg:flex-row gradient-bg">
            {/* Visual Side */}
            <div className="hidden lg:flex lg:w-1/2 bg-[#11d452] items-center justify-center p-12 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                <div className="z-10 text-white max-w-lg">
                    <h1 className="text-6xl font-black font-display mb-6 tracking-tight leading-none">
                        Join the <br />EcoDefill Community.
                    </h1>
                    <p className="text-xl font-medium text-green-50 mb-8 leading-relaxed">
                        Step into the future of campus sustainability. Register now to manage your student profile and contribute to a greener campus.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                            <p className="text-3xl font-bold mb-1">10k+</p>
                            <p className="text-sm text-green-100 font-medium">Active Students</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                            <p className="text-3xl font-bold mb-1">24/7</p>
                            <p className="text-sm text-green-100 font-medium">Admin Support</p>
                        </div>
                    </div>
                </div>
                {/* Abstract shapes */}
                <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-black/5 rounded-full blur-3xl"></div>
            </div>

            {/* Form Side */}
            <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
                <Card className="w-full max-w-xl p-8 lg:p-12 bg-white/80 glass-morphism animate-in">
                    <div className="mb-10">
                        <h2 className="text-3xl font-bold text-gray-900 font-display mb-2">Create Account</h2>
                        <p className="text-gray-500 font-medium">Please enter your details to register as a student.</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm font-semibold rounded-xl border-2 border-red-100 animate-in">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Full Name"
                                name="fullName"
                                type="text"
                                required
                                placeholder="John Doe"
                                value={formData.fullName}
                                onChange={handleChange}
                            />
                            <Input
                                label="Student ID"
                                name="studentId"
                                type="text"
                                required
                                placeholder="2024-00123"
                                value={formData.studentId}
                                onChange={handleChange}
                            />
                        </div>

                        <Input
                            label="Email Address"
                            name="email"
                            type="email"
                            required
                            placeholder="john@school.edu"
                            value={formData.email}
                            onChange={handleChange}
                        />

                        <Input
                            label="Password"
                            name="password"
                            type="password"
                            required
                            placeholder="Min. 8 characters"
                            minLength={8}
                            value={formData.password}
                            onChange={handleChange}
                        />

                        <div className="w-full space-y-1.5">
                            <label className="ml-1 text-sm font-semibold text-gray-700">
                                Select Course
                            </label>
                            <select
                                name="course"
                                required
                                className="flex h-12 w-full rounded-xl border-2 border-gray-100 bg-gray-50/50 px-4 py-2 text-sm font-medium transition-all focus:bg-white focus:outline-none focus:ring-4 focus:ring-green-500/10 focus:border-[#11d452]"
                                value={formData.course}
                                onChange={handleChange}
                            >
                                <option value="">Select a course...</option>
                                <option value="BSCS">BS Computer Science</option>
                                <option value="BSIT">BS Information Technology</option>
                                <option value="BSIS">BS Information Systems</option>
                                <option value="BSCE">BS Computer Engineering</option>
                                <option value="OTHER">Other Degrees</option>
                            </select>
                        </div>

                        <Button type="submit" className="w-full h-14 text-base mt-2" disabled={loading} size="lg">
                            {loading ? "Processing..." : "Create Account"}
                        </Button>
                    </form>

                    <p className="mt-8 text-center text-sm font-medium text-gray-500">
                        Already have an account?{" "}
                        <Link href="/login" className="text-[#11d452] hover:underline font-bold transition-all">
                            Sign in here
                        </Link>
                    </p>
                </Card>
            </div>
        </div>
    );
}
