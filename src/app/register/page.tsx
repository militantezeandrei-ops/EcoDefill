"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { apiClient } from "@/lib/api";
import { showToast } from "@/lib/toast";
import { z } from "zod";

const registerSchema = z.object({
    fullName: z.string().min(2, "Full Name is required"),
    email: z.string().email("Invalid email address"),
    phoneNumber: z.string().regex(/^\+?[0-9]{10,15}$/, "Enter a valid phone number"),
    verificationCode: z.string().length(6, "Verification code must be 6 digits"),
    course: z.string().min(1, "Please select a course"),
    yearLevel: z.string().min(1, "Please select an year level"),
    section: z.string().min(1, "Section is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    agreeTerms: z.literal(true, { errorMap: () => ({ message: "You must agree to the Terms of Service" }) })
}).refine(data => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"]
});

export default function Register() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        phoneNumber: "",
        verificationCode: "",
        course: "",
        yearLevel: "",
        section: "",
        password: "",
        confirmPassword: "",
        agreeTerms: false
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [sendingCode, setSendingCode] = useState(false);
    const [codeHint, setCodeHint] = useState("");

    useEffect(() => {
        document.body.style.backgroundImage = `linear-gradient(to bottom, rgba(0,0,0,0.6), rgba(0,0,0,0.4), rgba(0,0,0,0.7)), url('/images/pdm-building.jpg')`;
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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
        setFormData(prev => ({ ...prev, [name]: val }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        const result = registerSchema.safeParse(formData);
        if (!result.success) {
            const formattedErrors: Record<string, string> = {};
            result.error.issues.forEach(issue => {
                formattedErrors[issue.path[0] as string] = issue.message;
            });
            setErrors(formattedErrors);
            return;
        }

        setLoading(true);
        try {
            await apiClient("/api/auth/register", {
                method: "POST",
                body: JSON.stringify({
                    email: formData.email,
                    verificationCode: formData.verificationCode,
                    phoneNumber: formData.phoneNumber,
                    password: formData.password,
                    fullName: formData.fullName,
                    course: formData.course,
                    yearLevel: formData.yearLevel,
                    section: formData.section,
                })
            });

            await showToast({ text: "Your account has been created successfully.", type: "success" });
            router.push("/login");
        } catch (err: any) {
            const errorMessage = err instanceof Error ? err.message : "Failed to register";

            await showToast({ text: errorMessage, duration: "long", type: "error" });
            setErrors({ form: errorMessage });
        } finally {
            setLoading(false);
        }
    };

    const handleSendCode = async () => {
        setErrors((prev) => {
            const next = { ...prev };
            delete next.email;
            delete next.verificationCode;
            delete next.form;
            return next;
        });

        const emailCheck = z.string().email().safeParse(formData.email);
        if (!emailCheck.success) {
            setErrors((prev) => ({ ...prev, email: "Enter a valid email before requesting a code" }));
            return;
        }

        setSendingCode(true);
        setCodeHint("");
        try {
            const response = await apiClient<{ message: string }>("/api/auth/request-verification-code", {
                method: "POST",
                body: JSON.stringify({ email: formData.email, purpose: "register" }),
                skipAuthRedirect: true,
            });

            setCodeHint("Verification code sent to your email.");
            await showToast({ text: response.message, type: "success" });
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Failed to send code";
            setErrors((prev) => ({ ...prev, form: errorMessage }));
            await showToast({ text: errorMessage, type: "error" });
        } finally {
            setSendingCode(false);
        }
    };

    return (
        <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-transparent px-4 py-12 font-display -webkit-overflow-scrolling-touch">
            <div className="relative w-full max-w-[420px] my-auto overflow-hidden rounded-[32px] border border-gray-100 bg-white/95 p-8 shadow-[0_20px_50px_rgba(0,0,0,0.3)] backdrop-blur-md">
                <div className="absolute left-0 top-0 h-1.5 w-full bg-gradient-to-r from-blue-600 via-emerald-600 to-green-600" />

                <div className="mb-8 mt-2 flex flex-col items-center text-center">
                    <div className="relative mb-4 h-16 w-16">
                        <Image
                            src="/images/pdm-logo.png"
                            alt="PDM Logo"
                            fill
                            className="object-contain drop-shadow-xl"
                            priority
                        />
                    </div>
                    <h1 className="text-2xl font-black tracking-tight text-gray-900 uppercase">Create Account</h1>
                    <p className="mt-1.5 text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Join the green revolution</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label htmlFor="register-full-name" className="ml-1 mb-2 block text-[11px] font-black uppercase tracking-wider text-gray-400">Full Name</label>
                            <div className="group relative">
                                <input
                                    id="register-full-name"
                                    name="fullName"
                                    type="text"
                                    required
                                    className="block w-full rounded-2xl border border-gray-50 bg-gray-50 px-4 py-3.5 pl-11 text-sm font-bold text-gray-900 placeholder-gray-400 transition-all focus:border-blue-500/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                                    placeholder="Juan Dela Cruz"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                />
                                <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-gray-400 transition-colors group-focus-within:text-blue-600">person</span>
                            </div>
                            {errors.fullName && <p className="ml-1 mt-1 text-[11px] font-bold text-red-500">{errors.fullName}</p>}
                        </div>

                        <div>
                            <label htmlFor="register-email" className="ml-1 mb-2 block text-[11px] font-black uppercase tracking-wider text-gray-400">Email Address</label>
                            <div className="group relative">
                                <input
                                    id="register-email"
                                    name="email"
                                    type="email"
                                    required
                                    className="block w-full rounded-2xl border border-gray-50 bg-gray-50 px-4 py-3.5 pl-11 text-sm font-bold text-gray-900 placeholder-gray-400 transition-all focus:border-blue-500/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                                    placeholder="juan@pdm.edu.ph"
                                    value={formData.email}
                                    onChange={handleChange}
                                />
                                <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-gray-400 transition-colors group-focus-within:text-blue-600">mail</span>
                            </div>
                            {errors.email && <p className="ml-1 mt-1 text-[11px] font-bold text-red-500">{errors.email}</p>}
                        </div>

                        <div>
                            <label htmlFor="register-verification-code" className="ml-1 mb-2 block text-[11px] font-black uppercase tracking-wider text-gray-400">Verification Code</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1 group">
                                    <input
                                        id="register-verification-code"
                                        name="verificationCode"
                                        type="text"
                                        required
                                        maxLength={6}
                                        className="block w-full rounded-2xl border border-gray-50 bg-gray-50 px-4 py-3.5 pl-11 text-sm font-bold text-gray-900 placeholder-gray-400 transition-all focus:border-blue-500/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                                        placeholder="000000"
                                        value={formData.verificationCode}
                                        onChange={handleChange}
                                    />
                                    <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-gray-400 transition-colors group-focus-within:text-blue-600">verified_user</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleSendCode}
                                    disabled={sendingCode}
                                    className="flex h-[48px] items-center justify-center rounded-2xl bg-gradient-to-r from-blue-50 to-emerald-50 px-5 text-[12px] font-black uppercase tracking-wider text-blue-600 border border-blue-100 transition-all hover:bg-white hover:border-blue-300 disabled:opacity-50"
                                >
                                    {sendingCode ? "..." : "Send"}
                                </button>
                            </div>
                            {errors.verificationCode && <p className="ml-1 mt-1 text-[11px] font-bold text-red-500">{errors.verificationCode}</p>}
                            {codeHint && <p className="ml-1 mt-1 text-[11px] font-bold text-emerald-600">{codeHint}</p>}
                        </div>

                        <div>
                            <label htmlFor="register-phone-number" className="ml-1 mb-2 block text-[11px] font-black uppercase tracking-wider text-gray-400">Phone Number</label>
                            <div className="group relative">
                                <input
                                    id="register-phone-number"
                                    name="phoneNumber"
                                    type="tel"
                                    required
                                    className="block w-full rounded-2xl border border-gray-50 bg-gray-50 px-4 py-3.5 pl-11 text-sm font-bold text-gray-900 placeholder-gray-400 transition-all focus:border-blue-500/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                                    placeholder="09123456789"
                                    value={formData.phoneNumber}
                                    onChange={handleChange}
                                />
                                <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-gray-400 transition-colors group-focus-within:text-blue-600">call</span>
                            </div>
                            {errors.phoneNumber && <p className="ml-1 mt-1 text-[11px] font-bold text-red-500">{errors.phoneNumber}</p>}
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-1">
                                <label htmlFor="register-course" className="ml-1 mb-2 block text-[10px] font-black uppercase tracking-wider text-gray-400">Course</label>
                                <select
                                    id="register-course"
                                    name="course"
                                    required
                                    className="block w-full rounded-2xl border border-gray-50 bg-gray-50 px-2 py-3.5 text-xs font-bold text-gray-900 transition-all focus:border-blue-500/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 appearance-none text-center"
                                    value={formData.course}
                                    onChange={handleChange}
                                >
                                    <option disabled value="">-</option>
                                    <option value="BSIT">BSIT</option>
                                    <option value="BSCS">BSCS</option>
                                    <option value="BSHM">BSHM</option>
                                    <option value="BSTM">BSTM</option>
                                    <option value="BECED">BECED</option>
                                    <option value="BTLED">BTLED</option>
                                    <option value="BSOAD">BSOAD</option>
                                </select>
                                {errors.course && <p className="mt-1 text-[9px] font-bold text-red-500 text-center">{errors.course}</p>}
                            </div>

                            <div className="col-span-1">
                                <label htmlFor="register-year-level" className="ml-1 mb-2 block text-[10px] font-black uppercase tracking-wider text-gray-400">Year</label>
                                <select
                                    id="register-year-level"
                                    name="yearLevel"
                                    required
                                    className="block w-full rounded-2xl border border-gray-50 bg-gray-50 px-2 py-3.5 text-xs font-bold text-gray-900 transition-all focus:border-blue-500/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 appearance-none text-center"
                                    value={formData.yearLevel}
                                    onChange={handleChange}
                                >
                                    <option disabled value="">-</option>
                                    <option value="1">1st</option>
                                    <option value="2">2nd</option>
                                    <option value="3">3rd</option>
                                    <option value="4">4th</option>
                                </select>
                            </div>

                            <div className="col-span-1">
                                <label htmlFor="register-section" className="ml-1 mb-2 block text-[10px] font-black uppercase tracking-wider text-gray-400">Sec</label>
                                <select
                                    id="register-section"
                                    name="section"
                                    required
                                    className="block w-full rounded-2xl border border-gray-50 bg-gray-50 px-2 py-3.5 text-xs font-bold text-gray-900 transition-all focus:border-blue-500/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 appearance-none text-center"
                                    value={formData.section}
                                    onChange={handleChange}
                                >
                                    <option disabled value="">-</option>
                                    <option value="A">A</option>
                                    <option value="B">B</option>
                                    <option value="C">C</option>
                                    <option value="D">D</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="register-password" className="ml-1 mb-2 block text-[11px] font-black uppercase tracking-wider text-gray-400">Password</label>
                            <div className="group relative">
                                <input
                                    id="register-password"
                                    name="password"
                                    type="password"
                                    required
                                    className="block w-full rounded-2xl border border-gray-50 bg-gray-50 px-4 py-3.5 pl-11 text-sm font-bold text-gray-900 placeholder-gray-400 transition-all focus:border-blue-500/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={handleChange}
                                />
                                <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-gray-400 transition-colors group-focus-within:text-blue-600">lock</span>
                            </div>
                            {errors.password && <p className="ml-1 mt-1 text-[11px] font-bold text-red-500">{errors.password}</p>}
                        </div>

                        <div>
                            <label htmlFor="register-confirm-password" className="ml-1 mb-2 block text-[11px] font-black uppercase tracking-wider text-gray-400">Confirm Password</label>
                            <div className="group relative">
                                <input
                                    id="register-confirm-password"
                                    name="confirmPassword"
                                    type="password"
                                    required
                                    className="block w-full rounded-2xl border border-gray-50 bg-gray-50 px-4 py-3.5 pl-11 text-sm font-bold text-gray-900 placeholder-gray-400 transition-all focus:border-blue-500/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                                    placeholder="••••••••"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                />
                                <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-gray-400 transition-colors group-focus-within:text-blue-600">lock_reset</span>
                            </div>
                            {errors.confirmPassword && <p className="ml-1 mt-1 text-[11px] font-bold text-red-500">{errors.confirmPassword}</p>}
                        </div>
                    </div>

                    <div className="flex items-start gap-4 py-2">
                        <div className="relative flex items-center pt-1">
                            <input
                                id="register-agree-terms"
                                name="agreeTerms"
                                checked={formData.agreeTerms}
                                onChange={handleChange}
                                className={`peer size-4 cursor-pointer appearance-none rounded border-2 ${errors.agreeTerms ? "border-red-500 bg-red-50" : "border-gray-200 bg-gray-50"} checked:bg-blue-600 checked:border-blue-600 transition-all focus:outline-none`}
                                type="checkbox"
                            />
                            <span className="material-symbols-outlined absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[12px] font-black text-white opacity-0 peer-checked:opacity-100 pointer-events-none">check</span>
                        </div>
                        <label htmlFor="register-agree-terms" className="text-[12px] font-bold text-gray-500 leading-snug cursor-pointer">
                            I agree to the <a href="#" className="text-blue-600 underline underline-offset-2 hover:text-emerald-600 transition-colors">Terms of Service</a> and <a href="#" className="text-blue-600 underline underline-offset-2 hover:text-emerald-600 transition-colors">Privacy Policy</a>.
                        </label>
                    </div>

                    <div className="pt-2">
                        {errors.form && (
                            <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600">
                                {errors.form}
                            </div>
                        )}
                        <div className="flex justify-center">
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex w-full max-w-[340px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-emerald-600 px-4 py-4 text-[14px] font-black text-white shadow-xl shadow-blue-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                            >
                                {loading ? "Creating Account..." : (
                                    <>
                                        <span>Create My Account</span>
                                        <span className="material-symbols-outlined text-[20px] transition-transform group-hover:translate-x-1 font-black">arrow_forward</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-[13px] font-bold text-gray-400">
                        Already have an account? 
                        <Link href="/login" className="ml-2 text-emerald-600 hover:text-blue-600 transition-all uppercase tracking-wider">
                            Sign In
                        </Link>
                    </p>
                </div>
            </div>

            <p className="mt-10 text-[11px] font-black uppercase tracking-[0.3em] text-white/40">
                EcoDefill &copy; 2026 • PDM
            </p>
        </div>


    );
}
