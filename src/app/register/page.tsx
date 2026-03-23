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
        document.body.style.backgroundImage = `linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.2), rgba(0,0,0,0.5)), url('/images/pdm-building.jpg')`;
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
        <div className="fixed inset-0 w-full overflow-y-auto bg-transparent pt-[calc(var(--safe-top)+20px)] pb-20 font-display -webkit-overflow-scrolling-touch">
            <div className="flex min-h-full w-full flex-col items-center justify-start px-4">
                <div className="relative w-full max-w-[480px] rounded-3xl bg-zinc-900/40 backdrop-blur-md p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden mb-8">
                {/* Gradient accent top border */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-400 via-emerald-500 to-green-600"></div>

                <div className="mb-6 mt-2 text-center flex flex-col items-center">
                    <div className="w-20 h-20 relative mb-4">
                        <Image
                            src="/images/pdm-logo.png"
                            alt="PDM Logo"
                            fill
                            className="object-contain drop-shadow-2xl"
                            priority
                        />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Create Account</h1>
                    <p className="mt-2 text-sm text-emerald-100/70 font-medium">Join EcoDefill for a greener campus.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="register-full-name" className="block text-[12px] font-semibold text-emerald-50/80 uppercase tracking-wider mb-1.5 ml-1">Full Name</label>
                        <div className="relative group">
                            <input
                                id="register-full-name"
                                name="fullName"
                                type="text"
                                className="block w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 pl-11 shadow-inner focus:border-emerald-500/50 focus:bg-black/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 text-white placeholder-white/30 transition-all font-medium text-sm"
                                placeholder="Juan Dela Cruz"
                                value={formData.fullName}
                                onChange={handleChange}
                            />
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-emerald-400 material-symbols-outlined text-[20px] pointer-events-none transition-colors">person</span>
                        </div>
                        {errors.fullName && <span className="text-red-400 text-xs ml-1 font-medium mt-1 block">{errors.fullName}</span>}
                    </div>

                    <div>
                        <label htmlFor="register-email" className="block text-[12px] font-semibold text-emerald-50/80 uppercase tracking-wider mb-1.5 ml-1">Email Address</label>
                        <div className="relative group">
                            <input
                                id="register-email"
                                name="email"
                                type="email"
                                className="block w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 pl-11 shadow-inner focus:border-emerald-500/50 focus:bg-black/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 text-white placeholder-white/30 transition-all font-medium text-sm"
                                placeholder="Juan@gmail.com"
                                value={formData.email}
                                onChange={handleChange}
                            />
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-emerald-400 material-symbols-outlined text-[20px] pointer-events-none transition-colors">mail</span>
                        </div>
                        {errors.email && <span className="text-red-400 text-xs ml-1 font-medium mt-1 block">{errors.email}</span>}
                    </div>

                    <div className="grid grid-cols-[1fr_auto] gap-2">
                        <div>
                            <label htmlFor="register-verification-code" className="block text-[12px] font-semibold text-emerald-50/80 uppercase tracking-wider mb-1.5 ml-1">Email Verification Code</label>
                            <input
                                id="register-verification-code"
                                name="verificationCode"
                                inputMode="numeric"
                                maxLength={6}
                                className="block w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 shadow-inner focus:border-emerald-500/50 focus:bg-black/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 text-white placeholder-white/30 transition-all font-medium text-sm"
                                placeholder="6-digit code"
                                value={formData.verificationCode}
                                onChange={handleChange}
                            />
                            {errors.verificationCode && <span className="text-red-400 text-xs ml-1 font-medium mt-1 block">{errors.verificationCode}</span>}
                            {codeHint && <span className="text-emerald-300 text-xs ml-1 font-medium mt-1 block">{codeHint}</span>}
                        </div>
                        <div className="flex items-end">
                            <button
                                type="button"
                                onClick={handleSendCode}
                                disabled={sendingCode}
                                className="h-[46px] rounded-xl border border-emerald-400/40 bg-emerald-500/20 px-3 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/30 disabled:opacity-60"
                            >
                                {sendingCode ? "Sending..." : "Send Code"}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="register-phone-number" className="block text-[12px] font-semibold text-emerald-50/80 uppercase tracking-wider mb-1.5 ml-1">Phone Number</label>
                        <div className="relative group">
                            <input
                                id="register-phone-number"
                                name="phoneNumber"
                                type="tel"
                                className="block w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 pl-11 shadow-inner focus:border-emerald-500/50 focus:bg-black/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 text-white placeholder-white/30 transition-all font-medium text-sm"
                                placeholder="09123456789"
                                value={formData.phoneNumber}
                                onChange={handleChange}
                            />
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-emerald-400 material-symbols-outlined text-[20px] pointer-events-none transition-colors">call</span>
                        </div>
                        {errors.phoneNumber && <span className="text-red-400 text-xs ml-1 font-medium mt-1 block">{errors.phoneNumber}</span>}
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="flex flex-col w-full">
                            <label htmlFor="register-course" className="block text-[12px] font-semibold text-emerald-50/80 uppercase tracking-wider mb-1.5 ml-1">Course</label>
                            <div className="relative group">
                                <select
                                    id="register-course"
                                    name="course"
                                    value={formData.course}
                                    onChange={handleChange}
                                    className="form-select flex w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 shadow-inner focus:border-emerald-500/50 focus:bg-black/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 text-white transition-all font-medium text-sm appearance-none"
                                >
                                    <option disabled value="" className="bg-zinc-800">Select</option>
                                    <option value="BSIT" className="bg-zinc-800">BSIT</option>
                                    <option value="BSCS" className="bg-zinc-800">BSCS</option>
                                    <option value="BSHM" className="bg-zinc-800">BSHM</option>
                                    <option value="BSTM" className="bg-zinc-800">BSTM</option>
                                    <option value="BECED" className="bg-zinc-800">BECED</option>
                                    <option value="BTLED" className="bg-zinc-800">BTLED</option>
                                    <option value="BSOAD" className="bg-zinc-800">BSOAD</option>
                                </select>
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-emerald-400 material-symbols-outlined text-[18px] pointer-events-none transition-colors">school</span>
                            </div>
                            {errors.course && <span className="text-red-400 text-xs ml-1 font-medium mt-1 block">{errors.course}</span>}
                        </div>

                        <div className="flex flex-col w-full">
                            <label htmlFor="register-year-level" className="block text-[12px] font-semibold text-emerald-50/80 uppercase tracking-wider mb-1.5 ml-1">Year</label>
                            <div className="relative group">
                                <select
                                    id="register-year-level"
                                    name="yearLevel"
                                    value={formData.yearLevel}
                                    onChange={handleChange}
                                    className="form-select flex w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 shadow-inner focus:border-emerald-500/50 focus:bg-black/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 text-white transition-all font-medium text-sm appearance-none"
                                >
                                    <option disabled value="" className="bg-zinc-800">Select</option>
                                    <option value="1" className="bg-zinc-800">1st</option>
                                    <option value="2" className="bg-zinc-800">2nd</option>
                                    <option value="3" className="bg-zinc-800">3rd</option>
                                    <option value="4" className="bg-zinc-800">4th</option>
                                </select>
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-emerald-400 material-symbols-outlined text-[18px] pointer-events-none transition-colors">calendar_today</span>
                            </div>
                            {errors.yearLevel && <span className="text-red-400 text-xs ml-1 font-medium mt-1 block">{errors.yearLevel}</span>}
                        </div>

                        <div className="flex flex-col w-full">
                            <label htmlFor="register-section" className="block text-[12px] font-semibold text-emerald-50/80 uppercase tracking-wider mb-1.5 ml-1">Section</label>
                            <div className="relative group">
                                <select
                                    id="register-section"
                                    name="section"
                                    value={formData.section}
                                    onChange={handleChange}
                                    className="form-select flex w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 shadow-inner focus:border-emerald-500/50 focus:bg-black/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 text-white transition-all font-medium text-sm appearance-none"
                                >
                                    <option disabled value="" className="bg-zinc-800">Select</option>
                                    <option value="A" className="bg-zinc-800">A</option>
                                    <option value="B" className="bg-zinc-800">B</option>
                                    <option value="C" className="bg-zinc-800">C</option>
                                    <option value="D" className="bg-zinc-800">D</option>
                                </select>
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-emerald-400 material-symbols-outlined text-[18px] pointer-events-none transition-colors">class</span>
                            </div>
                            {errors.section && <span className="text-red-400 text-xs ml-1 font-medium mt-1 block">{errors.section}</span>}
                        </div>
                    </div>

                    <div>
                        <label htmlFor="register-password" className="block text-[12px] font-semibold text-emerald-50/80 uppercase tracking-wider mb-1.5 ml-1">Password</label>
                        <div className="relative group">
                            <input
                                id="register-password"
                                name="password"
                                type="password"
                                className="block w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 pl-11 shadow-inner focus:border-emerald-500/50 focus:bg-black/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 text-white placeholder-white/30 transition-all font-medium text-sm"
                                placeholder="Min. 8 characters"
                                value={formData.password}
                                onChange={handleChange}
                            />
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-emerald-400 material-symbols-outlined text-[20px] pointer-events-none transition-colors">lock</span>
                        </div>
                        {errors.password && <span className="text-red-400 text-xs ml-1 font-medium mt-1 block">{errors.password}</span>}
                    </div>

                    <div>
                        <label htmlFor="register-confirm-password" className="block text-[12px] font-semibold text-emerald-50/80 uppercase tracking-wider mb-1.5 ml-1">Confirm Password</label>
                        <div className="relative group">
                            <input
                                id="register-confirm-password"
                                name="confirmPassword"
                                type="password"
                                className="block w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 pl-11 shadow-inner focus:border-emerald-500/50 focus:bg-black/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 text-white placeholder-white/30 transition-all font-medium text-sm"
                                placeholder="Re-enter password"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                            />
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-emerald-400 material-symbols-outlined text-[20px] pointer-events-none transition-colors">lock</span>
                        </div>
                        {errors.confirmPassword && <span className="text-red-400 text-xs ml-1 font-medium mt-1 block">{errors.confirmPassword}</span>}
                    </div>

                    <div className="flex items-start gap-3 mt-4 px-1">
                        <div className="relative flex items-center pt-0.5">
                            <input
                                id="register-agree-terms"
                                name="agreeTerms"
                                checked={formData.agreeTerms}
                                onChange={handleChange}
                                className={`peer size-4 cursor-pointer appearance-none rounded border ${errors.agreeTerms ? "border-red-500 ring-1 ring-red-500/50 bg-red-500/10" : "border-white/20 bg-black/40"} checked:bg-emerald-500 checked:border-emerald-500 transition-all`}
                                type="checkbox"
                            />
                            <span className="material-symbols-outlined absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 text-[14px] pointer-events-none">check</span>
                        </div>
                        <div className="flex flex-col">
                            <label htmlFor="register-agree-terms" className="text-white/60 text-xs leading-snug cursor-pointer">
                                I agree to the <a className="text-emerald-400 font-semibold hover:text-emerald-300 transition-colors" href="#">Terms of Service</a> and <a className="text-emerald-400 font-semibold hover:text-emerald-300 transition-colors" href="#">Privacy Policy</a>.
                            </label>
                            {errors.agreeTerms && <span className="text-red-400 text-xs font-medium mt-1 block">{errors.agreeTerms}</span>}
                        </div>
                    </div>

                    <div className="pt-4">
                        {errors.form && (
                            <div className="mb-3 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-300">
                                {errors.form}
                            </div>
                        )}
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-green-500 py-3.5 px-4 text-[14px] font-bold text-white shadow-lg shadow-emerald-900/30 hover:from-emerald-500 hover:to-green-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50 transition-all gap-2"
                        >
                            {loading ? "Creating Account..." : (
                                <>
                                    Create Account
                                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>

                <div className="mt-8 text-center text-[13px]">
                    <p className="text-white/60 text-sm">
                        Already have an account?
                        <Link href="/login" className="text-emerald-400 font-bold hover:text-emerald-300 ml-2 transition-colors">
                            Sign In
                        </Link>
                    </p>
                </div>
            </div>

            {/* Footer text */}
            <p className="fixed bottom-4 left-0 w-full text-center text-white/40 text-[11px] font-medium tracking-wide pointer-events-none hidden md:block">
                Pambayang Dalubhasaan ng Marilao &copy; 2026
            </p>
            </div>
        </div>
    );
}
