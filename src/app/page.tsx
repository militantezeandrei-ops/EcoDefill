"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";

export default function Splash() {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            router.push("/dashboard");
        }
    }, [isAuthenticated, isLoading, router]);

    if (isLoading) return null;

    return (
        <div className="bg-primary min-h-screen flex flex-col relative overflow-hidden font-display">
            <div className="flex-1 flex flex-col items-center justify-center p-8 z-10 text-white pb-32">
                <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-8 shadow-lg p-2">
                    <img
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuC4886IJI5cLdGvZ1dxN8drtEdk_kczOCe4vjZrsyH1c3z-AobOF6j9a-6P_sl8Hmnx47_D_RfabEXrI10P1GOjL81zkncOw0RSt2SndIuZ-tLF6fgeGLAzZfkz5qsbkd1XMSfz5WfPLPQDVo1ijpaQzeRa-iiOXrILMghcC2H507uAKG7bnz_KoYUrveEQVtCvzeu5K9YfQodvfQ2cP8mNtmRjiqmAiHYAKCjWWrZub0rTrTkWo0hYDGal4A5fL5qfdBKtfOw2cCTW"
                        alt="Logo"
                        className="w-full h-full object-contain"
                    />
                </div>

                <h1 className="text-4xl font-bold mb-4 text-center tracking-tight">EcoDefill System</h1>
                <p className="text-primary-100/90 text-center text-lg max-w-sm mb-12">
                    Sustainability meets convenience. Empty your bottles and earn points for fresh refills.
                </p>

                <div className="w-full max-w-sm space-y-4">
                    <Button
                        variant="secondary"
                        onClick={() => router.push("/login")}
                    >
                        Login to Account
                    </Button>

                    <button
                        onClick={() => router.push("/register")}
                        className="w-full bg-transparent border-2 border-white/30 text-white font-bold text-lg h-14 rounded-lg hover:bg-white/10 transition-all"
                    >
                        Create New Account
                    </button>
                </div>
            </div>

            <svg className="absolute bottom-0 w-full text-white pointer-events-none opacity-20 dark:opacity-5" viewBox="0 0 1440 240" fill="currentColor">
                <path d="M0,192L48,176C96,160,192,128,288,128C384,128,480,160,576,170.7C672,181,768,171,864,165.3C960,160,1056,160,1152,149.3C1248,139,1344,117,1392,106.7L1440,96L1440,240L1392,240C1344,240,1248,240,1152,240C1056,240,960,240,864,240C768,240,672,240,576,240C480,240,384,240,288,240C192,240,96,240,48,240L0,240Z"></path>
            </svg>
        </div>
    );
}
