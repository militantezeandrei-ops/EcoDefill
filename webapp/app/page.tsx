"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function Home() {
    return (
        <main className="min-h-screen flex flex-col items-center justify-center p-6 gradient-bg relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-green-100/50 rounded-full blur-[120px] -mr-48 -mt-48"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-50/50 rounded-full blur-[120px] -ml-48 -mb-48"></div>

            <div className="z-10 max-w-4xl w-full text-center animate-in">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 border border-green-100 text-[#11d452] text-sm font-bold mb-8">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    Live Sustainability Platform
                </div>

                <h1 className="text-6xl md:text-8xl font-black font-display mb-8 tracking-tighter text-gray-900 leading-tight">
                    <span className="text-[#11d452]">Green</span> <br className="hidden md:block" />Campus Solutions.
                </h1>

              

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link href="/register">
                        <Button size="lg" className="h-16 px-12 text-lg font-bold">
                            Start Registration
                        </Button>
                    </Link>
                    <Link href="/login">
                        <Button size="lg" variant="outline" className="h-16 px-12 text-lg font-bold">
                            Student Login
                        </Button>
                    </Link>
                </div>

             
            </div>

            {/* Footer Info */}
            <div className="mt-24 text-gray-400 font-semibold text-sm">
                POWERED BY ECODEFILL SOLUTIONS
            </div>
        </main>
    );
}
