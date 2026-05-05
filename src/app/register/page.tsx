"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { apiClient } from "@/lib/api";
import { showToast } from "@/lib/toast";
import { z } from "zod";
import { OtpInput } from "@/components/OtpInput";

type LegalModalType = "terms" | "privacy" | null;

const TERMS_SECTIONS = [
    {
        title: "1. What is EcoDefill?",
        body: "EcoDefill is a project at PDM that lets you trade your plastic bottles and paper for clean drinking water.",
    },
    {
        title: "2. How Points Work",
        body: "Plastic: 1 bottle or cup = 1 point.",
        extra: [
            "Paper: 3 pieces = 1 point.",
            "Water: 1 point gets you 100ml of water.",
            "Limits: You can get up to 1 liter (10 points) per day.",
        ],
    },
    {
        title: "3. Be Kind to the Machine",
        body: "Please only put in PET bottles (like Coke or Nature's Spring), plastic cups, or paper. Don't put trash, metal, or glass inside. If you break the machine on purpose, you won't be allowed to use it anymore.",
    },
    {
        title: "4. About the Water",
        body: "Our water goes through a 3-stage filtration system. While we work hard to keep it clean, use the station at your own risk.",
    },
    {
        title: "5. Need Help?",
        body: "If the machine eats your points or isn't working, email us at ecodefill@gmail.com.",
    },
];

const PRIVACY_SECTIONS = [
    {
        title: "1. What we collect",
        body: "When you sign up, we save your:",
        extra: [
            "Name, course, and year level.",
            "PDM student number.",
            "How many points you've earned and how much water you've taken.",
        ],
    },
    {
        title: "2. Why we collect it",
        body: "We only use this info to make sure your points are saved to your account and to show the school how much the campus is recycling. We don't sell your data to anyone.",
    },
    {
        title: "3. Your Photos",
        body: "The machine has a camera (ESP32-CAM) to check if you're actually putting in a bottle. It does not save photos of your face; it only looks at the trash you are recycling.",
    },
    {
        title: "4. Keeping it Safe",
        body: "We use secure logins (JWT) to make sure nobody else can use your points.",
    },
    {
        title: "5. Asking to Delete Data",
        body: "If you want us to delete your account and all your data, just send an email to ecodefill@gmail.com and we will remove it from our database.",
    },
];

const registerSchema = z.object({
    fullName: z.string().min(2, "Full Name is required"),
    email: z.string().email("Invalid email address"),
    verificationCode: z.string().length(6, "Verification code must be 6 digits"),
    course: z.string().min(1, "Please select a course"),
    yearLevel: z.string().min(1, "Please select an year level"),
    section: z.string().min(1, "Section is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    agreeTerms: z.literal(true, { errorMap: () => ({ message: "You must agree to the Terms of Service" }) }),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});

export default function Register() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        verificationCode: "",
        course: "",
        yearLevel: "",
        section: "",
        password: "",
        confirmPassword: "",
        agreeTerms: false,
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [sendingCode, setSendingCode] = useState(false);
    const [codeHint, setCodeHint] = useState("");
    const [activeModal, setActiveModal] = useState<LegalModalType>(null);
    const [termsRead, setTermsRead] = useState(false);
    const [privacyRead, setPrivacyRead] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const canAgreeTerms = termsRead && privacyRead;

    useEffect(() => {
        document.body.style.backgroundColor = "#f9fafb";
        document.body.style.overflow = activeModal ? "hidden" : "";

        return () => {
            document.body.style.backgroundColor = "";
            document.body.style.overflow = "";
        };
    }, [activeModal]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const val = type === "checkbox" ? (e.target as HTMLInputElement).checked : value;
        setFormData((prev) => ({ ...prev, [name]: val }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        const result = registerSchema.safeParse(formData);
        if (!result.success) {
            const formattedErrors: Record<string, string> = {};
            result.error.issues.forEach((issue) => {
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
                    password: formData.password,
                    fullName: formData.fullName,
                    course: formData.course,
                    yearLevel: formData.yearLevel,
                    section: formData.section,
                }),
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
        <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-gray-50 px-4 py-12 font-display">
            <div className="absolute inset-0 z-0">
                <Image src="/images/pdm-building.jpg" alt="Background" fill className="object-cover" priority />
                <div className="absolute inset-0 bg-white/30" />
            </div>

            <div className="relative z-10 my-auto w-full max-w-[420px] overflow-hidden rounded-[32px] border border-gray-100 bg-white p-8 shadow-[0_20px_50px_rgba(0,0,0,0.1)]">
                <div className="absolute left-0 top-0 h-1.5 w-full bg-gradient-to-r from-blue-600 via-emerald-600 to-green-600" />

                <div className="mb-8 mt-2 flex flex-col items-center text-center">
                    <div className="relative mb-4 h-16 w-16">
                        <Image src="/images/pdm-logo.png" alt="PDM Logo" fill className="object-contain drop-shadow-xl" priority />
                    </div>
                    <h1 className="text-2xl font-black tracking-tight text-gray-900 uppercase">Create Account</h1>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label htmlFor="register-full-name" className="ml-1 mb-2 block text-[11px] font-black uppercase tracking-wider text-gray-400">
                                Full Name
                            </label>
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
                                <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-gray-400 transition-colors group-focus-within:text-blue-600">
                                    person
                                </span>
                            </div>
                            {errors.fullName && <p className="ml-1 mt-1 text-[11px] font-bold text-red-500">{errors.fullName}</p>}
                        </div>

                        <div>
                            <label htmlFor="register-email" className="ml-1 mb-2 block text-[11px] font-black uppercase tracking-wider text-gray-400">
                                Email Address
                            </label>
                            <div className="group relative">
                                <input
                                    id="register-email"
                                    name="email"
                                    type="email"
                                    required
                                    className="block w-full rounded-2xl border border-gray-50 bg-gray-50 px-4 py-3.5 pl-11 text-sm font-bold text-gray-900 placeholder-gray-400 transition-all focus:border-blue-500/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                                    placeholder="juan@gmail.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                />
                                <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-gray-400 transition-colors group-focus-within:text-blue-600">
                                    mail
                                </span>
                            </div>
                            {errors.email && <p className="ml-1 mt-1 text-[11px] font-bold text-red-500">{errors.email}</p>}
                        </div>

                        <div>
                            <label className="ml-1 mb-3 block text-center text-[11px] font-black uppercase tracking-wider text-gray-400">
                                Verification Code
                            </label>
                            <div className="flex flex-col items-center gap-3">
                                <OtpInput
                                    value={formData.verificationCode}
                                    onChange={(val) => setFormData((prev) => ({ ...prev, verificationCode: val }))}
                                    disabled={sendingCode}
                                />
                                <button
                                    type="button"
                                    onClick={handleSendCode}
                                    disabled={sendingCode}
                                    className="w-full max-w-[200px] rounded-2xl border border-blue-100 bg-blue-50 px-4 py-2 text-[11px] font-black uppercase tracking-wider text-blue-600 transition-all hover:border-blue-300 hover:bg-white disabled:opacity-50"
                                >
                                    {sendingCode ? "Sending..." : "Request Code"}
                                </button>
                            </div>
                            {errors.verificationCode && <p className="ml-1 mt-1 text-center text-[11px] font-bold text-red-500">{errors.verificationCode}</p>}
                            {codeHint && <p className="ml-1 mt-1 text-center text-[11px] font-bold text-emerald-600">{codeHint}</p>}
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-1">
                                <label htmlFor="register-course" className="ml-1 mb-2 block text-[10px] font-black uppercase tracking-wider text-gray-400">
                                    Course
                                </label>
                                <select
                                    id="register-course"
                                    name="course"
                                    required
                                    className="block w-full appearance-none rounded-2xl border border-gray-50 bg-gray-50 px-2 py-3.5 text-center text-xs font-bold text-gray-900 transition-all focus:border-blue-500/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                                    value={formData.course}
                                    onChange={handleChange}
                                >
                                    <option disabled value="">
                                        -
                                    </option>
                                    <option value="BSIT">BSIT</option>
                                    <option value="BSCS">BSCS</option>
                                    <option value="BSHM">BSHM</option>
                                    <option value="BSTM">BSTM</option>
                                    <option value="BECED">BECED</option>
                                    <option value="BTLED">BTLED</option>
                                    <option value="BSOAD">BSOAD</option>
                                </select>
                                {errors.course && <p className="mt-1 text-center text-[9px] font-bold text-red-500">{errors.course}</p>}
                            </div>

                            <div className="col-span-1">
                                <label htmlFor="register-year-level" className="ml-1 mb-2 block text-[10px] font-black uppercase tracking-wider text-gray-400">
                                    Year
                                </label>
                                <select
                                    id="register-year-level"
                                    name="yearLevel"
                                    required
                                    className="block w-full appearance-none rounded-2xl border border-gray-50 bg-gray-50 px-2 py-3.5 text-center text-xs font-bold text-gray-900 transition-all focus:border-blue-500/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                                    value={formData.yearLevel}
                                    onChange={handleChange}
                                >
                                    <option disabled value="">
                                        -
                                    </option>
                                    <option value="1">1st</option>
                                    <option value="2">2nd</option>
                                    <option value="3">3rd</option>
                                    <option value="4">4th</option>
                                </select>
                            </div>

                            <div className="col-span-1">
                                <label htmlFor="register-section" className="ml-1 mb-2 block text-[10px] font-black uppercase tracking-wider text-gray-400">
                                    Sec
                                </label>
                                <select
                                    id="register-section"
                                    name="section"
                                    required
                                    className="block w-full appearance-none rounded-2xl border border-gray-50 bg-gray-50 px-2 py-3.5 text-center text-xs font-bold text-gray-900 transition-all focus:border-blue-500/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                                    value={formData.section}
                                    onChange={handleChange}
                                >
                                    <option disabled value="">
                                        -
                                    </option>
                                    <option value="A">A</option>
                                    <option value="B">B</option>
                                    <option value="C">C</option>
                                    <option value="D">D</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="register-password" className="ml-1 mb-2 block text-[11px] font-black uppercase tracking-wider text-gray-400">
                                Password
                            </label>
                            <div className="group relative">
                                <input
                                    id="register-password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    className="block w-full rounded-2xl border border-gray-50 bg-gray-50 px-4 py-3.5 pl-11 pr-11 text-sm font-bold text-gray-900 placeholder-gray-400 transition-all focus:border-blue-500/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                                    placeholder="********"
                                    value={formData.password}
                                    onChange={handleChange}
                                />
                                <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-gray-400 transition-colors group-focus-within:text-blue-600">
                                    lock
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((prev) => !prev)}
                                    className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full p-1 text-gray-400 transition-colors hover:text-blue-600"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    <span className="material-symbols-outlined text-[20px]">
                                        {showPassword ? "visibility_off" : "visibility"}
                                    </span>
                                </button>
                            </div>
                            {errors.password && <p className="ml-1 mt-1 text-[11px] font-bold text-red-500">{errors.password}</p>}
                        </div>

                        <div>
                            <label htmlFor="register-confirm-password" className="ml-1 mb-2 block text-[11px] font-black uppercase tracking-wider text-gray-400">
                                Confirm Password
                            </label>
                            <div className="group relative">
                                <input
                                    id="register-confirm-password"
                                    name="confirmPassword"
                                    type={showConfirmPassword ? "text" : "password"}
                                    required
                                    className="block w-full rounded-2xl border border-gray-50 bg-gray-50 px-4 py-3.5 pl-11 pr-11 text-sm font-bold text-gray-900 placeholder-gray-400 transition-all focus:border-blue-500/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                                    placeholder="********"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                />
                                <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-gray-400 transition-colors group-focus-within:text-blue-600">
                                    lock_reset
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                                    className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full p-1 text-gray-400 transition-colors hover:text-blue-600"
                                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                                >
                                    <span className="material-symbols-outlined text-[20px]">
                                        {showConfirmPassword ? "visibility_off" : "visibility"}
                                    </span>
                                </button>
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
                                disabled={!canAgreeTerms}
                                className={`peer size-4 appearance-none rounded border-2 ${
                                    errors.agreeTerms ? "border-red-500 bg-red-50" : "border-gray-200 bg-gray-50"
                                } ${canAgreeTerms ? "cursor-pointer" : "cursor-not-allowed opacity-60"} checked:border-blue-600 checked:bg-blue-600 transition-all focus:outline-none`}
                                type="checkbox"
                            />
                            <span className="material-symbols-outlined pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[12px] font-black text-white opacity-0 peer-checked:opacity-100">
                                check
                            </span>
                        </div>
                        <label htmlFor="register-agree-terms" className="cursor-pointer text-[12px] font-bold leading-snug text-gray-500">
                            I agree to the{" "}
                            <button
                                type="button"
                                onClick={() => setActiveModal("terms")}
                                className="text-blue-600 underline underline-offset-2 transition-colors hover:text-emerald-600"
                            >
                                Terms of Service
                            </button>{" "}
                            and{" "}
                            <button
                                type="button"
                                onClick={() => setActiveModal("privacy")}
                                className="text-blue-600 underline underline-offset-2 transition-colors hover:text-emerald-600"
                            >
                                Privacy Policy
                            </button>
                            .
                        </label>
                    </div>
                    <p className={`-mt-1 text-[11px] font-bold ${canAgreeTerms ? "text-emerald-600" : "text-gray-400"}`}>
                        {canAgreeTerms
                            ? "You may now check the agreement box."
                            : "Read and scroll both documents to the bottom to enable agreement."}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        {termsRead ? "Terms complete" : "Terms pending"} | {privacyRead ? "Privacy complete" : "Privacy pending"}
                    </p>

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
                                {loading ? (
                                    "Creating Account..."
                                ) : (
                                    <>
                                        <span>Create My Account</span>
                                        <span className="material-symbols-outlined text-[20px] font-black transition-transform group-hover:translate-x-1">
                                            arrow_forward
                                        </span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-[13px] font-bold text-gray-400">
                        Already have an account?
                        <Link href="/login" className="ml-2 uppercase tracking-wider text-emerald-600 transition-all hover:text-blue-600">
                            Sign In
                        </Link>
                    </p>
                </div>
            </div>

            <p className="mt-10 text-[11px] font-black uppercase tracking-[0.3em] text-gray-400">EcoDefill © 2026 • PDM</p>

            <LegalModal
                title="Terms of Service"
                open={activeModal === "terms"}
                sections={TERMS_SECTIONS}
                onClose={() => setActiveModal(null)}
                onReachBottom={() => setTermsRead(true)}
                completed={termsRead}
            />

            <LegalModal
                title="Privacy Policy"
                open={activeModal === "privacy"}
                sections={PRIVACY_SECTIONS}
                onClose={() => setActiveModal(null)}
                onReachBottom={() => setPrivacyRead(true)}
                completed={privacyRead}
            />
        </div>
    );
}

function LegalModal({
    title,
    open,
    sections,
    onClose,
    onReachBottom,
    completed,
}: {
    title: string;
    open: boolean;
    sections: { title: string; body: string; extra?: string[] }[];
    onClose: () => void;
    onReachBottom: () => void;
    completed: boolean;
}) {
    if (!open) return null;

    const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
        if (completed) return;
        const element = event.currentTarget;
        const reachedBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - 8;
        if (reachedBottom) {
            onReachBottom();
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md overflow-hidden rounded-[30px] bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-gray-400">EcoDefill</p>
                        <h2 className="mt-1 text-lg font-black text-gray-900">{title}</h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200"
                        aria-label={`Close ${title}`}
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div onScroll={handleScroll} className="max-h-[60vh] space-y-5 overflow-y-auto px-5 py-5">
                    {sections.map((section) => (
                        <section key={section.title}>
                            <h3 className="text-[14px] font-black text-gray-900">{section.title}</h3>
                            <p className="mt-2 text-[13px] leading-relaxed text-gray-600">{section.body}</p>
                            {section.extra ? (
                                <div className="mt-2 space-y-1.5">
                                    {section.extra.map((line) => (
                                        <p key={line} className="text-[13px] leading-relaxed text-gray-600">
                                            {line}
                                        </p>
                                    ))}
                                </div>
                            ) : null}
                        </section>
                    ))}
                </div>

                <div className="border-t border-gray-100 px-5 py-4">
                    <p className={`text-center text-[11px] font-bold ${completed ? "text-emerald-600" : "text-gray-400"}`}>
                        {completed ? "You have finished reading this document." : "Scroll to the bottom to mark this document as read."}
                    </p>
                </div>
            </div>
        </div>
    );
}
