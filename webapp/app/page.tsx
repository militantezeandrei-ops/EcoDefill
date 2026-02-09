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
                    Pioneering <span className="text-[#11d452]">Green</span> <br className="hidden md:block" />Campus Solutions.
                </h1>

                <p className="text-xl md:text-2xl font-medium text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed">
                    The unified hub for student registration and administrative oversight.
                    Empowering educational institutions with modern data management.
                </p>

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

                <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="p-8 text-left glass-morphism border-white/50 hover:border-green-200 transition-all hover:translate-y-[-4px]">
                        <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center mb-6">
                            <svg className="w-6 h-6 text-[#11d452]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09a10.116 10.116 0 001.28-3.517 10.117 10.117 0 011.5-3.518 10.118 10.118 0 001.28-3.517 10.117 10.117 0 011.5-3.517M12 11c0-3.517 1.009-6.799 2.753-9.571m3.44 2.04l-.054.09a10.116 10.116 0 00-1.28 3.517 10.117 10.117 0 01-1.5 3.517 10.118 10.118 0 00-1.28 3.517 10.117 10.117 0 01-1.5 3.517" /></svg>
                        </div>
                        <h3 className="text-xl font-bold mb-2">Secure Hub</h3>
                        <p className="text-gray-500 font-medium">Enterprise-grade security using Firebase Authentication.</p>
                    </Card>
                    <Card className="p-8 text-left glass-morphism border-white/50 hover:border-green-200 transition-all hover:translate-y-[-4px]">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-6">
                            <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                        </div>
                        <h3 className="text-xl font-bold mb-2">Real-time Dashboard</h3>
                        <p className="text-gray-500 font-medium">Monitor registrations and system health with live data.</p>
                    </Card>
                    <Card className="p-8 text-left glass-morphism border-white/50 hover:border-green-200 transition-all hover:translate-y-[-4px]">
                        <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center mb-6">
                            <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        </div>
                        <h3 className="text-xl font-bold mb-2">Modern Stack</h3>
                        <p className="text-gray-500 font-medium">Built with Next.js 14 and Tailwind for maximum performance.</p>
                    </Card>
                </div>
            </div>

            {/* Footer Info */}
            <div className="mt-24 text-gray-400 font-semibold text-sm">
                POWERED BY ECODEFILL SOLUTIONS
            </div>
        </main>
    );
}
