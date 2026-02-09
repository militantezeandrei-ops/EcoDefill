"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs, doc, updateDoc, getDoc, onSnapshot, setDoc, QuerySnapshot, DocumentData } from "firebase/firestore";
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

    useEffect(() => {
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

            // Sort in-memory
            combinedData.sort((a, b) => {
                const dateA = a.createdAt?.seconds || 0;
                const dateB = b.createdAt?.seconds || 0;
                return dateB - dateA;
            });

            setStudents(combinedData);
            setLoading(false);
        };

        // Listen to Users
        const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
            usersList = snapshot.docs.map(doc => ({
                uid: doc.id,
                ...doc.data()
            }));
            updateStudentsState();
        }, (err) => {
            console.error("Users listener error:", err);
            setLoading(false);
        });

        // Listen to Registrations
        const unsubRegs = onSnapshot(regRef, (snapshot) => {
            const newMap = new Map();
            snapshot.forEach(doc => newMap.set(doc.id, doc.data()));
            regsMap = newMap;
            updateStudentsState();
        }, (err) => {
            console.error("Regs listener error:", err);
        });

        // Listen to Machines (IoT Data)
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
        }, (err) => {
            console.error("Machines listener error:", err);
        });

        return () => {
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
            alert("Failed to update status. Check permissions or network.");
        } finally {
            setUpdatingId(null);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    const stats = [
        { label: 'Recycled Bottles', value: machineStats.bottles.toLocaleString(), change: '+12%', color: 'text-green-500', icon: '🗑️' },
        { label: 'Plastic Cups Collected', value: machineStats.cups.toLocaleString(), change: '+5%', color: 'text-blue-500', icon: '🥤' },
        { label: 'Paper Waste (kg)', value: machineStats.waste.toFixed(1), unit: 'kg', change: '-2%', color: 'text-red-500', icon: '📄' }
    ];

    const recentApprovals = students.filter(s => s.status === 'approved').length;
    const pendingCount = students.filter(s => s.status === 'pending').length;
    const rejectedCount = students.filter(s => s.status === 'rejected').length;

    return (
        <div className="p-6 lg:p-10 bg-gray-50 min-h-screen">
            {/* Header */}
            <header className="mb-8">
                <div className="flex items-center justify-between mb-2">
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 mb-2">Main Monitoring Dashboard</h1>
                        <p className="text-gray-500 font-medium">Real-time sustainability metrics for PDM School</p>
                    </div>
                    <div className="flex gap-2">
                        <button className="px-4 py-2 bg-green-500 text-white text-sm font-bold rounded-lg">Day</button>
                        <button className="px-4 py-2 bg-white text-gray-600 text-sm font-bold rounded-lg">Week</button>
                        <button className="px-4 py-2 bg-white text-gray-600 text-sm font-bold rounded-lg">Month</button>
                    </div>
                </div>
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {stats.map((stat, i) => (
                    <Card key={i} className="p-6 bg-white hover:shadow-lg transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                            <div className="text-3xl">{stat.icon}</div>
                            <span className={`text-xs font-bold ${stat.change.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                                {stat.change}
                            </span>
                        </div>
                        <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
                        <p className="text-3xl font-black text-gray-900">
                            {stat.value} {stat.unit && <span className="text-base font-bold text-gray-500">{stat.unit}</span>}
                        </p>
                    </Card>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Waste Collection Trends */}
                <Card className="lg:col-span-2 p-6 bg-white">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Waste Collection Trends</h3>
                            <p className="text-sm text-gray-500">Weekly growth analysis</p>
                        </div>
                        <button className="text-gray-400">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
                            </svg>
                        </button>
                    </div>
                    {/* Placeholder for chart */}
                    <div className="h-48 bg-gradient-to-t from-green-100 to-transparent rounded-lg flex items-end justify-center p-4">
                        <div className="flex items-end gap-2 w-full max-w-md">
                            {[40, 60, 55, 80, 70, 85, 75].map((h, i) => (
                                <div key={i} className="flex-1 bg-green-500 rounded-t-lg" style={{ height: `${h}%`, opacity: 0.8 }}></div>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center justify-between mt-4 text-xs text-gray-400 font-bold">
                        {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(day => (
                            <span key={day}>{day}</span>
                        ))}
                    </div>
                </Card>

                {/* Daily Analytics */}
                <Card className="p-6 bg-white">
                    <div className="mb-6">
                        <h3 className="text-lg font-bold text-gray-900">Daily Analytics</h3>
                        <p className="text-sm text-gray-500">Hourly traffic distribution</p>
                        <span className="text-xs font-bold text-green-500">+8% vs avg</span>
                    </div>
                    <div className="h-48 flex items-end justify-between gap-1">
                        {[50, 70, 90, 80, 95, 60, 70, 55].map((h, i) => (
                            <div key={i} className="flex-1 bg-green-200 rounded-t" style={{ height: `${h}%` }}></div>
                        ))}
                    </div>
                    <div className="flex items-center justify-between mt-4 text-xs text-gray-400 font-bold">
                        {['8AM', '10AM', '12PM', '2PM', '4PM', '6PM', '8PM'].map(time => (
                            <span key={time} className="rotate-0">{time.slice(0, 2)}</span>
                        ))}
                    </div>
                </Card>
            </div>

            {/* Student Registrations Table */}
            <Card className="bg-white overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Student Registrations</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            <span className="text-green-500 font-bold">{recentApprovals} Approved</span> •
                            <span className="text-orange-500 font-bold ml-1">{pendingCount} Pending</span> •
                            <span className="text-red-500 font-bold ml-1">{rejectedCount} Rejected</span>
                        </p>
                    </div>
                    <input
                        type="text"
                        placeholder="Search students..."
                        className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-500"
                    />
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr className="text-xs text-gray-500 uppercase tracking-wider">
                                <th className="px-6 py-4 font-bold">Student</th>
                                <th className="px-6 py-4 font-bold">ID Number</th>
                                <th className="px-6 py-4 font-bold">Course</th>
                                <th className="px-6 py-4 font-bold">Status</th>
                                <th className="px-6 py-4 font-bold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {students.map((student) => (
                                <tr key={student.uid} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${student.status === 'approved' ? 'bg-green-500' :
                                                student.status === 'rejected' ? 'bg-red-500' : 'bg-gray-400'
                                                }`}>
                                                {student.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900">{student.name}</p>
                                                <p className="text-xs text-gray-500">{student.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-sm font-bold text-gray-600">{student.studentId}</td>
                                    <td className="px-6 py-4 font-bold text-gray-900">{student.course}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase ${student.status === 'approved' ? 'bg-green-100 text-green-700' :
                                            student.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                'bg-orange-100 text-orange-700'
                                            }`}>
                                            {student.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            {student.status === 'pending' && (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="text-red-500 border-red-200 hover:bg-red-50"
                                                        onClick={() => handleStatusUpdate(student.uid, 'rejected')}
                                                        disabled={updatingId === student.uid}
                                                    >
                                                        Reject
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        className="bg-green-500 hover:bg-green-600 text-white"
                                                        onClick={() => handleStatusUpdate(student.uid, 'approved')}
                                                        disabled={updatingId === student.uid}
                                                    >
                                                        Approve
                                                    </Button>
                                                </>
                                            )}
                                            {student.status !== 'pending' && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
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
                            {students.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-300">
                                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                                </svg>
                                            </div>
                                            <p className="text-gray-400 font-bold uppercase tracking-wide text-xs">No Students Yet</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
