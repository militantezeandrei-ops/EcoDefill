import { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function AdminLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex h-screen bg-[#f9fafb] admin-gradient-bg">
            {/* Sidebar */}
            <aside className="w-80 bg-white border-r border-gray-100 hidden xl:flex flex-col shadow-2xl shadow-gray-200/50 relative z-20">
                <div className="p-10 mb-4">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center">
                            <div className="w-4 h-4 rounded-sm bg-[#13ec5b]"></div>
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 font-display tracking-tighter">EcoDefill.</h2>
                    </div>

                    <div className="space-y-1">
                        <p className="px-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Navigation Hub</p>
                        <nav className="space-y-2">
                            {[
                                { name: 'Dashboard', path: '/admin/dashboard', icon: 'M4 6h16M4 12h16M4 18h16' },
                                { name: 'Students', path: '/admin/students', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
                                { name: 'System Logs', path: '/admin/logs', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
                                { name: 'Settings', path: '/admin/settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
                            ].map((item) => (
                                <Link key={item.name} href={item.path} className="flex items-center gap-4 px-4 py-3 text-gray-500 hover:bg-gray-50 rounded-2xl group transition-all">
                                    <svg className="w-5 h-5 text-gray-400 group-hover:text-[#13ec5b] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} /></svg>
                                    <span className="font-bold group-hover:text-gray-900 transition-colors">{item.name}</span>
                                </Link>
                            ))}
                        </nav>
                    </div>
                </div>

                <div className="mt-auto p-8">
                    <Card className="p-6 bg-gray-50 border-none shadow-none rounded-3xl">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">System Status</p>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-[#13ec5b] animate-pulse"></div>
                            <p className="text-sm font-bold text-gray-900">Encrypted Session</p>
                        </div>
                    </Card>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto relative z-10">
                {children}
            </main>
        </div>
    );
}
