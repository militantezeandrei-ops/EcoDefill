"use client";

import { useEffect, useState } from "react";
import { collection, query, where, doc, updateDoc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface UserRegistration {
    uid: string;
    name: string;
    email: string;
    studentId: string;
    course: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: any;
}

export default function AdminDashboard() {
    const [students, setStudents] = useState<UserRegistration[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [machineStats, setMachineStats] = useState({
        bottles: 0,
        cups: 0,
        waste: 0
    });

    // Auto-rotating monitor state
    const [activeMonitor, setActiveMonitor] = useState(0);
    const monitors = ['Registrations', 'Waste Metrics', 'System Health'];

    useEffect(() => {
        const rotationInterval = setInterval(() => {
            setActiveMonitor((prev) => (prev + 1) % monitors.length);
        }, 5000); // Rotate every 5 seconds

        const usersRef = collection(db, "users");
        const usersQuery = query(usersRef, where("role", "==", "user"));
        const regRef = collection(db, "registrations");
        const machinesRef = collection(db, "machines");

        let usersList: any[] = [];
        let regsMap: Map<string, any> = new Map();

        const updateStudentsState = () => {
            const combinedData = usersList.map(user => ({
                ...user,
                status: regsMap.get(user.uid)?.status || 'pending'
            }));

            combinedData.sort((a, b) => {
                const dateA = a.createdAt?.seconds || 0;
                const dateB = b.createdAt?.seconds || 0;
                return dateB - dateA;
            });

            setStudents(combinedData);
            setLoading(false);
        };

        const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
            usersList = snapshot.docs.map(doc => ({
                uid: doc.id,
                ...doc.data()
            }));
            updateStudentsState();
        });

        const unsubRegs = onSnapshot(regRef, (snapshot) => {
            const newMap = new Map();
            snapshot.forEach(doc => newMap.set(doc.id, doc.data()));
            regsMap = newMap;
            updateStudentsState();
        });

        const unsubMachines = onSnapshot(machinesRef, (snapshot) => {
            let totalBottles = 0;
            let totalCups = 0;
            let totalWaste = 0;

            snapshot.forEach(doc => {
                const data = doc.data();
                totalBottles += data.bottleCount || 0;
                totalCups += data.cupCount || 0;
                totalWaste += data.wasteWeight || 0;
            });

            setMachineStats({
                bottles: totalBottles,
                cups: totalCups,
                waste: totalWaste
            });
        });

        return () => {
            clearInterval(rotationInterval);
            unsubUsers();
            unsubRegs();
            unsubMachines();
        };
    }, []);

    const handleStatusUpdate = async (uid: string, newStatus: 'approved' | 'rejected' | 'pending') => {
        setUpdatingId(uid);
        try {
            const regRef = doc(db, "registrations", uid);
            const regDoc = await getDoc(regRef);

            if (regDoc.exists()) {
                await updateDoc(regRef, { status: newStatus });
            } else {
                const student = students.find(s => s.uid === uid);
                await setDoc(regRef, {
                    userId: uid,
                    studentId: student?.studentId || "N/A",
                    course: student?.course || "N/A",
                    status: newStatus,
                    registrationDate: new Date()
                });
            }
        } catch (error) {
            console.error("Error updating status:", error);
        } finally {
            setUpdatingId(null);
        }
    };

    if (loading) return (
        <div className="h-full flex items-center justify-center bg-transparent">
            <div className="w-12 h-12 border-4 border-[#a855f7] border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    const stats = [
        { label: 'Recycled Bottles', value: machineStats.bottles.toLocaleString(), icon: '♻️', accent: 'text-[#13ec5b]' },
        { label: 'Plastic Cups', value: machineStats.cups.toLocaleString(), icon: '🥤', accent: 'text-blue-400' },
        { label: 'Waste Reduced', value: machineStats.waste.toFixed(1), unit: 'kg', icon: '🌍', accent: 'text-[#a855f7]' }
    ];

    return (
        <div className="space-y-6 animate-in">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter mb-1 italic uppercase leading-none">System Control</h1>
                    <div className="flex items-center gap-2">
                        <div className="flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]"></div>
                        <p className="text-slate-500 font-bold text-[10px] tracking-widest uppercase">Live Network: Active • PDM School</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="h-10 rounded-xl border-slate-200 bg-white text-slate-700 font-bold text-[10px] uppercase tracking-widest px-6 hover:bg-slate-50 transition-all shadow-sm">Analytics</Button>
                    <Button variant="primary" className="h-10 rounded-xl bg-slate-900 text-white font-bold text-[10px] uppercase tracking-widest px-6 shadow-md hover:bg-slate-800 transition-all">Export Data</Button>
                </div>
            </div>

            {/* Compact Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat, i) => (
                    <Card key={i} className="p-6 bg-white border border-slate-200 shadow-sm rounded-3xl relative overflow-hidden group hover:shadow-md transition-all">
                        <div className="relative z-10 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                                <h3 className="text-3xl font-black text-slate-900 tracking-tighter flex items-end gap-1.5 leading-none">
                                    {stat.value} <span className="text-sm font-bold text-slate-400 mb-0.5">{stat.unit}</span>
                                </h3>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-2xl border border-slate-100">
                                {stat.icon}
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Compact Light Monitoring Section */}
            <Card className="p-8 bg-white border border-slate-200 shadow-sm rounded-[2.5rem] relative overflow-hidden admin-glass">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                    <div className="max-w-md">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-200/50">Live Monitor</span>
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse"></div>
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tighter italic uppercase leading-tight">
                            System Efficiency: <br /> <span className="text-emerald-500">Fully Operational.</span>
                        </h2>
                        <p className="text-slate-500 font-bold text-sm mb-6 opacity-80 leading-relaxed">
                            Synchronization in progress. Current module focus: <br />
                            <span className="text-slate-900 font-black text-base">{monitors[activeMonitor]}</span>
                        </p>
                        <div className="flex gap-2">
                            {monitors.map((m, i) => (
                                <div key={m} className={`h-1.5 rounded-full transition-all duration-500 ${activeMonitor === i ? 'w-10 bg-emerald-500 shadow-lg shadow-emerald-200' : 'w-2.5 bg-slate-100'}`}></div>
                            ))}
                        </div>
                    </div>
                    <div className="w-full lg:w-80 h-44 bg-slate-50 rounded-[2rem] border border-slate-100 p-8 flex items-center justify-center shadow-inner relative overflow-hidden">
                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                        <div className="text-center animate-in relative z-10" key={activeMonitor}>
                            {activeMonitor === 0 && (
                                <div>
                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Member Directory</p>
                                    <div className="flex items-center justify-center gap-2">
                                        <span className="text-4xl font-black text-slate-900 tracking-tighter">{students.length}</span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase mt-2 italic">Active</span>
                                    </div>
                                </div>
                            )}
                            {activeMonitor === 1 && (
                                <div>
                                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">Environmental Progress</p>
                                    <div className="flex items-center justify-center gap-2">
                                        <span className="text-4xl font-black text-slate-900 tracking-tighter">{machineStats.waste.toFixed(1)}</span>
                                        <span className="text-sm font-black text-slate-400 uppercase mt-2">KG</span>
                                    </div>
                                </div>
                            )}
                            {activeMonitor === 2 && (
                                <div>
                                    <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2">Core Integrity</p>
                                    <div className="flex items-center justify-center gap-2">
                                        <span className="text-4xl font-black text-emerald-600 tracking-tighter">100%</span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase mt-2 italic">Stability</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </Card>

            {/* Compact Light Table */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-6 bg-emerald-500 rounded-full"></div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase italic">Member Directory</h2>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Showing {students.length} active entries</p>
                </div>

                <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                <th className="px-8 py-4">Identity</th>
                                <th className="px-8 py-4">Credentials</th>
                                <th className="px-8 py-4">Status</th>
                                <th className="px-8 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {students.map((student) => (
                                <tr key={student.uid} className="group hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-3.5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-slate-600 text-base group-hover:bg-emerald-50 group-hover:text-emerald-600 group-hover:border-emerald-100 transition-all">
                                                {student.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm text-slate-900 tracking-tight leading-none mb-1">{student.name}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase">{student.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-3.5">
                                        <div className="inline-flex gap-2">
                                            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-[9px] font-bold">{student.course}</span>
                                            <span className="px-2 py-1 bg-slate-50 text-slate-400 rounded-md text-[9px] font-mono italic">ID: {student.studentId}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-3.5">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-1.5 h-1.5 rounded-full ${student.status === 'approved' ? 'bg-emerald-500' : student.status === 'rejected' ? 'bg-red-500' : 'bg-slate-300'}`}></div>
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${student.status === 'approved' ? 'text-emerald-600' : student.status === 'rejected' ? 'text-red-500' : 'text-slate-400'}`}>
                                                {student.status}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-3.5 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                            {student.status === 'pending' ? (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 text-red-500 font-bold text-[9px] uppercase tracking-widest hover:bg-red-50 px-4 rounded-lg"
                                                        onClick={() => handleStatusUpdate(student.uid, 'rejected')}
                                                        disabled={updatingId === student.uid}
                                                    >
                                                        Decline
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        className="h-8 bg-emerald-500 text-white font-bold text-[9px] uppercase tracking-widest rounded-lg hover:bg-emerald-600 px-6 shadow-sm"
                                                        onClick={() => handleStatusUpdate(student.uid, 'approved')}
                                                        disabled={updatingId === student.uid}
                                                    >
                                                        Approve
                                                    </Button>
                                                </>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-8 font-bold text-[9px] uppercase tracking-widest hover:bg-slate-100 px-4 rounded-lg text-slate-400 hover:text-slate-900"
                                                    onClick={() => handleStatusUpdate(student.uid, 'pending')}
                                                    disabled={updatingId === student.uid}
                                                >
                                                    Reset
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
