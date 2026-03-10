"use client";

import { useState } from "react";
import { Shell } from "@/components/layout/Shell";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";
import { z } from "zod";

const registerSchema = z.object({
    fullName: z.string().min(2, "Full Name is required"),
    email: z.string().email("Invalid email address"),
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
        course: "",
        yearLevel: "",
        section: "",
        password: "",
        confirmPassword: "",
        agreeTerms: false
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);

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
                    password: formData.password,
                    fullName: formData.fullName,
                    course: formData.course,
                    section: formData.section,
                })
            });
            router.push("/login");
        } catch (err: unknown) {
            setErrors({ form: err instanceof Error ? err.message : "Failed to register" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Shell
            title="Create Account"
            subtitle="Join the PDM recycling community to earn water refill rewards for a greener campus."
        >
            <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-6 pb-2 w-full mt-4">
                {errors.form && <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm text-center">{errors.form}</div>}

                <Input
                    name="fullName"
                    label="Full Name"
                    icon="person"
                    placeholder="Juan Dela Cruz"
                    value={formData.fullName}
                    onChange={handleChange}
                    error={errors.fullName}
                />

                <Input
                    name="email"
                    label="Email Address"
                    icon="mail"
                    placeholder="Juan@gmail.com"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    error={errors.email}
                />

                <div className="grid grid-cols-2 gap-4">
                    <label className="flex flex-col w-full">
                        <span className="text-slate-900 dark:text-slate-100 text-sm font-semibold leading-normal pb-2 ml-1">Course</span>
                        <div className="relative group">
                            <select
                                name="course"
                                value={formData.course}
                                onChange={handleChange}
                                className={`form-select flex w-full rounded-lg text-slate-900 dark:text-white border-none bg-slate-50 dark:bg-zinc-800 focus:ring-2 focus:ring-primary/50 shadow-sm h-14 pl-4 pr-10 text-base appearance-none transition-all ${errors.course ? "ring-2 ring-red-500" : ""}`}
                            >
                                <option disabled value="">Select</option>
                                <option value="BSIT">BSIT</option>
                                <option value="BSCS">BSCS</option>
                                <option value="BSHM">BSHM</option>
                                <option value="BSTM">BSTM</option>
                                <option value="BECED">BECED</option>
                                <option value="BTLED">BTLED</option>
                                <option value="BSOAD">BSOAD</option>
                            </select>
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 material-symbols-outlined pointer-events-none">school</span>
                        </div>
                        {errors.course && <span className="text-red-500 text-xs ml-1 font-medium mt-1">{errors.course}</span>}
                    </label>

                    <label className="flex flex-col w-full">
                        <span className="text-slate-900 dark:text-slate-100 text-sm font-semibold leading-normal pb-2 ml-1">Year Level</span>
                        <div className="relative group">
                            <select
                                name="yearLevel"
                                value={formData.yearLevel}
                                onChange={handleChange}
                                className={`form-select flex w-full rounded-lg text-slate-900 dark:text-white border-none bg-slate-50 dark:bg-zinc-800 focus:ring-2 focus:ring-primary/50 shadow-sm h-14 pl-4 pr-10 text-base appearance-none transition-all ${errors.yearLevel ? "ring-2 ring-red-500" : ""}`}
                            >
                                <option disabled value="">Select</option>
                                <option value="1">1st Year</option>
                                <option value="2">2nd Year</option>
                                <option value="3">3rd Year</option>
                                <option value="4">4th Year</option>
                            </select>
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 material-symbols-outlined pointer-events-none">calendar_today</span>
                        </div>
                        {errors.yearLevel && <span className="text-red-500 text-xs ml-1 font-medium mt-1">{errors.yearLevel}</span>}
                    </label>
                </div>

                <Input
                    name="section"
                    label="Section"
                    icon="class"
                    placeholder="e.g 1A"
                    value={formData.section}
                    onChange={handleChange}
                    error={errors.section}
                />

                <Input
                    name="password"
                    label="Password"
                    type="password"
                    icon="lock"
                    placeholder="Min. 8 characters"
                    value={formData.password}
                    onChange={handleChange}
                    error={errors.password}
                />

                <Input
                    name="confirmPassword"
                    label="Confirm Password"
                    type="password"
                    icon="lock"
                    placeholder="Re-enter password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    error={errors.confirmPassword}
                />

                <div className="flex items-start gap-3 mt-2">
                    <div className="relative flex items-center">
                        <input
                            name="agreeTerms"
                            checked={formData.agreeTerms}
                            onChange={handleChange}
                            className={`peer size-5 cursor-pointer appearance-none rounded-md border ${errors.agreeTerms ? "border-red-500 ring-2 ring-red-500/50" : "border-slate-300 dark:border-slate-600"} bg-slate-50 dark:bg-zinc-800 checked:bg-primary checked:border-primary transition-all`}
                            type="checkbox"
                        />
                        <span className="material-symbols-outlined absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 text-[16px] pointer-events-none">check</span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm leading-tight pt-0.5">
                        I agree to the <a className="text-primary font-semibold hover:underline" href="#">Terms of Service</a> and <a className="text-primary font-semibold hover:underline" href="#">Privacy Policy</a>.
                    </p>
                </div>

                <div className="pt-4 pb-8 border-t border-slate-200 dark:border-slate-800/50 mt-4">
                    <Button type="submit" icon="arrow_forward" disabled={loading}>
                        {loading ? "Creating..." : "Create Account"}
                    </Button>
                    <p className="text-center text-slate-500 dark:text-slate-400 text-sm mt-4">
                        Already have an account? <Link href="/login" className="text-primary font-bold hover:underline">Sign In</Link>
                    </p>
                </div>
            </form>
        </Shell>
    );
}
