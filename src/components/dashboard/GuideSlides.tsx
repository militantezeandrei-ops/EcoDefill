"use client";

import { useState, useEffect } from "react";
import { X, ChevronRight, ChevronLeft, Recycle, Droplet, Trophy, Sparkles } from "lucide-react";
import { apiClient } from "@/lib/api";

export default function GuideSlides({ onFinish }: { onFinish: () => void }) {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isVisible, setIsVisible] = useState(true);

    const slides = [
        {
            title: "Welcome to EcoDefill!",
            description: "Your journey to a greener campus starts here. Let's show you how to use the system.",
            icon: Sparkles,
            color: "text-blue-600",
            bg: "bg-blue-50"
        },
        {
            title: "Step 1: Earn Points",
            description: "Go to any EcoDefill Machine. Drop your plastic bottles, cups, or module papers into the slot to receive points.",
            icon: Recycle,
            color: "text-emerald-600",
            bg: "bg-emerald-50"
        },
        {
            title: "Step 2: Redeem Water",
            description: "Use your points to get clean water from our dispensers. 1 point is typically equal to 100ml of water.",
            icon: Droplet,
            color: "text-blue-500",
            bg: "bg-blue-50"
        },
        {
            title: "Rise in the Ranking",
            description: "Represent your course! Every item you recycle adds to your Academic Ranking. Let's make your course #1!",
            icon: Trophy,
            color: "text-amber-500",
            bg: "bg-amber-50"
        }
    ];

    const next = () => {
        if (currentSlide < slides.length - 1) {
            setCurrentSlide(prev => prev + 1);
        } else {
            handleFinish();
        }
    };

    const prev = () => {
        if (currentSlide > 0) {
            setCurrentSlide(prev => prev - 1);
        }
    };

    const handleFinish = async () => {
        setIsVisible(false);
        try {
            await apiClient("/api/user/guide-seen", { method: "POST" });
            onFinish();
        } catch (e) {
            console.error(e);
        }
    };

    if (!isVisible) return null;

    const SlideIcon = slides[currentSlide].icon;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 text-gray-900">
            <div className="relative w-full max-w-md overflow-hidden rounded-[32px] bg-white shadow-2xl animate-in fade-in zoom-in duration-300">
                {/* Progress Bar */}
                <div className="absolute top-0 left-0 right-0 h-1.5 flex gap-1 p-0.5 px-4 mt-6">
                    {slides.map((_, i) => (
                        <div 
                            key={i} 
                            className={`h-full flex-1 rounded-full transition-all duration-500 ${i <= currentSlide ? "bg-blue-600" : "bg-gray-100"}`} 
                        />
                    ))}
                </div>

                {/* Close Button Header */}
                <div className="flex justify-end p-4 pt-8">
                    <button 
                        onClick={handleFinish}
                        className="rounded-full p-2 text-gray-400 hover:bg-gray-100 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Slide Content */}
                <div className="px-8 pb-8 text-center">
                    <div className={`mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-[24px] ${slides[currentSlide].bg} animate-in slide-in-from-bottom duration-500`}>
                        <SlideIcon className={`h-12 w-12 ${slides[currentSlide].color}`} />
                    </div>
                    
                    <h3 className="mb-3 text-2xl font-black tracking-tight text-gray-900 leading-tight">
                        {slides[currentSlide].title}
                    </h3>
                    <p className="mb-10 text-[15px] font-medium leading-relaxed text-gray-500 px-2">
                        {slides[currentSlide].description}
                    </p>

                    {/* Navigation */}
                    <div className="flex items-center justify-between gap-4">
                        <button
                            onClick={prev}
                            disabled={currentSlide === 0}
                            className={`flex h-12 w-12 items-center justify-center rounded-2xl border border-gray-100 transition-all ${currentSlide === 0 ? "opacity-0 invisible" : "hover:bg-gray-50 active:scale-95"}`}
                        >
                            <ChevronLeft className="h-5 w-5 text-gray-600" />
                        </button>

                        <button
                            onClick={next}
                            className="flex-1 flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 font-black text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-700 active:scale-[0.98]"
                        >
                            {currentSlide === slides.length - 1 ? "Get Started" : "Next Step"}
                            {currentSlide < slides.length - 1 && <ChevronRight className="h-4 w-4" />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
