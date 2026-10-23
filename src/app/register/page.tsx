"use client";

import Link from "next/link";
import Image from "next/image";

export default function Register() {
    return (
        <div className="relative flex min-h-[100dvh] items-center justify-center bg-gray-50 px-4 py-12 font-display overflow-hidden">
            {/* Background Image with Soft Overlay */}
            <div className="absolute inset-0 z-0">
                <Image
                    src="/images/pdm-building.jpg"
                    alt="Background"
                    fill
                    className="object-cover"
                    priority
                />
                <div className="absolute inset-0 bg-white/85 backdrop-blur-[4px]" />
            </div>

            <div className="relative z-10 w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl border border-gray-100 text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-100 shadow-sm">
                    <Image
                        src="/images/logo-icon.png"
                        alt="EcoDefill Logo"
                        width={56}
                        height={56}
                        className="object-contain"
                    />
                </div>

                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-emerald-700 border border-emerald-200/60">
                    Security Protected
                </span>

                <h1 className="mt-4 text-2xl font-black tracking-tight text-gray-900">
                    Mobile App Registration Only
                </h1>

                <p className="mt-3 text-[13px] font-medium leading-relaxed text-gray-600">
                    To protect campus sustainability rewards and prevent automated bot accounts, student registration is exclusively available through the official <strong className="font-bold text-gray-900">EcoDefill Mobile App</strong>.
                </p>

                <div className="mt-6 rounded-2xl bg-gray-50 p-4 text-left border border-gray-100 space-y-2.5">
                    <p className="text-[11px] font-black uppercase tracking-wider text-gray-500">
                        Registration Requirements:
                    </p>
                    <ul className="space-y-2 text-[12px] font-semibold text-gray-700">
                        <li className="flex items-start gap-2">
                            <span className="text-emerald-600 font-black">•</span>
                            <span>Official PDM School Email (<code className="text-emerald-700 font-bold">@pdmeduph.onmicrosoft.com</code>)</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-emerald-600 font-black">•</span>
                            <span>Valid Student Number (<code className="text-emerald-700 font-bold">PDM-20XX-XXXXXX</code>)</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-emerald-600 font-black">•</span>
                            <span>6-Digit Email OTP Verification via the Mobile App</span>
                        </li>
                    </ul>
                </div>

                <div className="mt-7">
                    <Link
                        href="/login"
                        className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-700 active:scale-[0.99]"
                    >
                        Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
}
