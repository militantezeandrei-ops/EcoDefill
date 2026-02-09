"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function Dashboard() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [userData, setUserData] = useState<any>(null);
    const [regData, setRegData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let userUnsub: (() => void) | null = null;
        let regUnsub: (() => void) | null = null;

        const authUnsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);

                userUnsub = onSnapshot(doc(db, "users", currentUser.uid), (doc) => {
                    if (doc.exists()) {
                        const data = doc.data();
                        setUserData(data);
                        if (data.role === "admin") {
                            router.push("/admin/dashboard");
                        }
                    }
                    setLoading(false);
                });

                regUnsub = onSnapshot(doc(db, "registrations", currentUser.uid), (doc) => {
                    if (doc.exists()) {
                        setRegData(doc.data());
                    } else {
                        setRegData({ status: 'pending' });
                    }
                });
            } else {
                router.push("/login");
                setLoading(false);
            }
        });

        return () => {
            authUnsubscribe();
            if (userUnsub) userUnsub();
            if (regUnsub) regUnsub();
        };
    }, [router]);

    if (loading || !user || (userData && userData.role === 'admin')) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const statusColors: any = {
        pending: 'text-orange-500',
        approved: 'text-green-500',
        rejected: 'text-red-500'
    };

    const points = 1250; // Mock data
    const growth = "+15%";

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <header className="px-6 py-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                        <span className="text-lg font-bold text-gray-600">{userData?.name?.charAt(0)}</span>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider">ECO-STUDENT</p>
                        <p className="text-lg font-bold text-gray-900">Hello, {userData?.name?.split(' ')[0] || "Student"}!</p>
                    </div>
                </div>
                <button className="w-10 h-10 flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                </button>
            </header>

            {/* Main Content */}
            <main className="px-6 pb-24">
                {/* Points Card with Circular Progress */}
                <Card className="mb-6 p-8 bg-white shadow-lg rounded-3xl relative overflow-hidden">
                    <div className="absolute top-4 right-4 opacity-10">
                        <svg className="w-24 h-24 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
                        </svg>
                    </div>
                    <div className="flex flex-col items-center relative z-10">
                        <div className="relative w-48 h-48 mb-4">
                            {/* Circular Progress */}
                            <svg className="w-48 h-48 transform -rotate-90">
                                <circle cx="96" cy="96" r="88" stroke="#E5E7EB" strokeWidth="12" fill="none" />
                                <circle cx="96" cy="96" r="88" stroke="#10B981" strokeWidth="12" fill="none"
                                    strokeDasharray={`${(75 / 100) * 553} 553`} strokeLinecap="round" />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <p className="text-sm text-gray-500 mb-1">Recycle Points</p>
                                <p className="text-4xl font-black text-gray-900">{points.toLocaleString()}</p>
                                <div className="flex items-center gap-1 mt-1">
                                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                    </svg>
                                    <span className="text-sm font-bold text-green-500">{growth}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Warning Banner */}
                <div className="mb-6 p-4 bg-orange-50 border-l-4 border-orange-400 rounded-xl">
                    <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-orange-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <div className="flex-1">
                            <p className="text-sm font-bold text-orange-900">1-week point expiration</p>
                            <p className="text-xs text-orange-700 mt-1">150 points expiring soon. Use them or lose them!</p>
                        </div>
                        <span className="text-xs font-black text-orange-500">48H REMAINING</span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <Button className="h-24 bg-green-500 hover:bg-green-600 text-white rounded-2xl flex flex-col items-center justify-center gap-2">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                        </svg>
                        <span className="font-bold">Convert to Points</span>
                    </Button>
                    <Button variant="outline" className="h-24 border-2 border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-green-500">
                        <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-bold text-gray-900">Refill History</span>
                    </Button>
                </div>

                {/* Recent Activity */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-900">Recent Activity</h3>
                        <button className="text-sm font-bold text-green-500">View All</button>
                    </div>
                    <div className="space-y-3">
                        {[
                            { icon: "♻️", title: "Recycled Plastic Bottle", time: "Today, 2:45 PM", points: "+10 pts", color: "bg-green-50" },
                            { icon: "💧", title: "Water Refill - Building A", time: "Today, 10:15 AM", points: "+5 pts", color: "bg-blue-50" },
                            { icon: "🥫", title: "Recycled Aluminum Can", time: "Yesterday, 4:20 PM", points: "+15 pts", color: "bg-yellow-50" }
                        ].map((activity, i) => (
                            <div key={i} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                                <div className={`w-12 h-12 ${activity.color} rounded-xl flex items-center justify-center text-xl`}>
                                    {activity.icon}
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-gray-900 text-sm">{activity.title}</p>
                                    <p className="text-xs text-gray-500">{activity.time}</p>
                                </div>
                                <span className="text-sm font-bold text-green-500">{activity.points}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4">
                <div className="flex items-center justify-around max-w-md mx-auto">
                    {[
                        { name: 'Home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', active: true },
                        { name: 'Ranking', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', active: false },
                        { name: 'Rewards', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', active: false },
                        { name: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z', active: false }
                    ].map((item) => (
                        <button key={item.name} className="flex flex-col items-center gap-1" onClick={() => item.name === 'Settings' && auth.signOut()}>
                            <svg className={`w-6 h-6 ${item.active ? 'text-green-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
                            </svg>
                            <span className={`text-xs font-medium ${item.active ? 'text-green-500' : 'text-gray-400'}`}>{item.name}</span>
                        </button>
                    ))}
                </div>
            </nav>
        </div>
    );
}
