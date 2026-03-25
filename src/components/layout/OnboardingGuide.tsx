"use client";

import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import { ChevronRight, ChevronLeft, Recycle, Droplet, QrCode, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

const ONBOARDING_KEY = "has_seen_onboarding_v1";

export function OnboardingGuide() {
    const [isVisible, setIsVisible] = useState(false);
    const [step, setStep] = useState(0);

    useEffect(() => {
        const checkSeen = async () => {
            console.log("Checking onboarding status...");
            let seen = false;
            try {
                if (Capacitor.isNativePlatform()) {
                    const { value } = await Preferences.get({ key: ONBOARDING_KEY });
                    seen = value === "true";
                } else {
                    seen = localStorage.getItem(ONBOARDING_KEY) === "true";
                }
            } catch (e) {
                console.error("Failed to check onboarding", e);
            }
            console.log("Onboarding seen:", seen);
            if (!seen) {
                // Small delay to ensure layout is ready
                setTimeout(() => setIsVisible(true), 500);
            }
        };
        void checkSeen();

        // Listen for manual trigger (for testing/help)
        const handleTrigger = () => {
            console.log("Onboarding triggered manually");
            setIsVisible(true);
            setStep(0);
        };
        window.addEventListener("show-onboarding" as any, handleTrigger);
        return () => window.removeEventListener("show-onboarding" as any, handleTrigger);
    }, []);

    const dismiss = async () => {
        setIsVisible(false);
        if (Capacitor.isNativePlatform()) {
            await Preferences.set({ key: ONBOARDING_KEY, value: "true" });
        } else {
            localStorage.setItem(ONBOARDING_KEY, "true");
        }
    };

    const next = () => {
        if (step < onboardingSteps.length - 1) setStep(step + 1);
        else void dismiss();
    };

    const prev = () => {
        if (step > 0) setStep(step - 1);
    };

    if (!isVisible) return null;

    const onboardingSteps = [
        {
            title: "Welcome to EcoDefill!",
            description: "Convert your recyclable waste into purified water. Start your green journey today!",
            icon: Recycle,
            color: "text-emerald-500",
            bg: "bg-emerald-50",
            image: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?q=80&w=300&h=300&auto=format&fit=crop"
        },
        {
            title: "Step 1: Earn Points",
            description: "Deposit your plastic bottles, cups, or paper modules into the EcoDefill machine and scan your QR to getting points.",
            icon: QrCode,
            color: "text-emerald-600",
            bg: "bg-emerald-100/50",
            image: "https://images.unsplash.com/photo-1621451537084-482c73073a0f?q=80&w=300&h=300&auto=format&fit=crop"
        },
        {
            title: "Step 2: Redeem Water",
            description: "Use your earned points to get water. Just select the amount, generate a QR, and scan it at the dispenser!",
            icon: Droplet,
            color: "text-blue-600",
            bg: "bg-blue-50",
            image: "https://images.unsplash.com/photo-1548919973-5dea58593comp?q=80&w=300&h=300&auto=format&fit=crop"
        }
    ];

    const currentStep = onboardingSteps[step];
    const Icon = currentStep.icon;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm transition-opacity duration-500">
            <div className="relative w-full max-w-sm overflow-hidden rounded-[32px] bg-white shadow-2xl dark:bg-zinc-900 border border-white/20">
                {/* Close btn */}
                <button
                    onClick={() => void dismiss()}
                    className="absolute right-4 top-4 z-10 p-2 rounded-full bg-slate-100 text-slate-500 active:scale-90 dark:bg-zinc-800 dark:text-zinc-400"
                >
                    <X size={18} />
                </button>

                {/* Progress bar */}
                <div className="absolute top-0 left-0 right-0 flex gap-1 p-2 px-4">
                    {onboardingSteps.map((_, i) => (
                        <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= step ? "bg-emerald-500" : "bg-slate-100 dark:bg-zinc-800"}`}
                        />
                    ))}
                </div>

                <div className="px-6 pb-8 pt-12 text-center">
                    <div className={`mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-[28%] ${currentStep.bg} ${currentStep.color} shadow-inner`}>
                        <Icon size={48} strokeWidth={1.5} />
                    </div>

                    <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                        {currentStep.title}
                    </h2>

                    <p className="mt-4 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                        {currentStep.description}
                    </p>

                    <div className="mt-10 flex gap-3">
                        {step > 0 && (
                            <Button
                                variant="outline"
                                onClick={prev}
                                className="h-12 w-12 rounded-2xl border-slate-200"
                            >
                                <ChevronLeft size={20} />
                            </Button>
                        )}
                        <Button
                            onClick={next}
                            className={`h-12 flex-1 rounded-2xl text-sm font-bold transition-all active:scale-[0.98] ${step === onboardingSteps.length - 1 ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
                        >
                            {step === onboardingSteps.length - 1 ? "Get Started" : "Next"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
