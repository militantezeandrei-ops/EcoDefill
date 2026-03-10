"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Calendar } from "lucide-react";

interface Transaction {
    id: string;
    type: string;
    amount: number;
    materialType: string | null;
    status: string | null;
    createdAt: string;
    user: { email: string } | null;
}

interface DayGroup {
    date: string;
    label: string;
    transactions: Transaction[];
    totalEarned: number;
    totalRedeemed: number;
    count: number;
}

export default function TransactionAccordion({ groups }: { groups: DayGroup[] }) {
    const [openDates, setOpenDates] = useState<Set<string>>(new Set([groups[0]?.date]));

    const toggle = (date: string) => {
        setOpenDates((prev) => {
            const next = new Set(prev);
            if (next.has(date)) next.delete(date);
            else next.add(date);
            return next;
        });
    };

    return (
        <div className="space-y-4">
            {groups.map((group) => {
                const isOpen = openDates.has(group.date);
                return (
                    <div key={group.date} className={`overflow-hidden rounded-2xl border ${isOpen ? "border-emerald-200/60" : "border-gray-100"} bg-white shadow-sm transition-all duration-300`}>
                        {/* Date Header — clickable */}
                        <button
                            onClick={() => toggle(group.date)}
                            className={`flex w-full items-center justify-between px-6 py-4 transition-all group hover:bg-gray-50/60 ${isOpen ? "bg-emerald-50/20" : ""}`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${isOpen ? "bg-emerald-500/15" : "bg-gray-100"}`}>
                                    <Calendar className={`h-5 w-5 ${isOpen ? "text-emerald-500" : "text-gray-400"}`} />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-bold text-gray-900">{group.label}</p>
                                    <p className="text-[11px] font-medium text-gray-400">
                                        {group.count} transaction{group.count !== 1 ? "s" : ""}
                                        {group.totalEarned > 0 && <span className="ml-2 font-bold text-emerald-500">+{group.totalEarned} earned</span>}
                                        {group.totalRedeemed > 0 && <span className="ml-2 font-bold text-cyan-500">−{group.totalRedeemed} redeemed</span>}
                                    </p>
                                </div>
                            </div>
                            <div className={`rounded-lg p-1.5 transition-colors ${isOpen ? "bg-emerald-100/50" : "group-hover:bg-gray-100"}`}>
                                {isOpen ? (
                                    <ChevronDown className={`h-5 w-5 ${isOpen ? "text-emerald-500" : "text-gray-400"}`} />
                                ) : (
                                    <ChevronRight className="h-5 w-5 text-gray-300" />
                                )}
                            </div>
                        </button>

                        {/* Expanded rows — scrollable */}
                        {isOpen && (
                            <div className="max-h-[400px] overflow-y-auto border-t border-gray-100">
                                <table className="min-w-full">
                                    <thead className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur-sm">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Time</th>
                                            <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">User</th>
                                            <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Type</th>
                                            <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Material</th>
                                            <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Points</th>
                                            <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {group.transactions.map((tx) => (
                                            <tr key={tx.id} className="transition-colors hover:bg-blue-50/20">
                                                <td className="px-6 py-3.5 text-[13px] font-medium text-gray-500">
                                                    {new Date(tx.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                </td>
                                                <td className="px-6 py-3.5">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-[10px] font-black text-indigo-600">
                                                            {tx.user?.email?.[0]?.toUpperCase() || "?"}
                                                        </div>
                                                        <span className="text-[13px] font-bold text-gray-800">{tx.user?.email || "—"}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3.5">
                                                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                                                        tx.type === "EARN"
                                                            ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                                            : "bg-cyan-50 text-cyan-600 border border-cyan-100"
                                                    }`}>{tx.type}</span>
                                                </td>
                                                <td className="px-6 py-3.5 text-[13px] font-medium text-gray-500">{tx.materialType || "—"}</td>
                                                <td className="px-6 py-3.5">
                                                    <span className={`text-[13px] font-black ${tx.type === "EARN" ? "text-emerald-500" : "text-red-500"}`}>
                                                        {tx.type === "EARN" ? "+" : "−"}{tx.amount}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3.5">
                                                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-widest shadow-sm ${
                                                        tx.status === "SUCCESS"
                                                            ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                                            : "bg-red-50 text-red-500 border border-red-100"
                                                    }`}>
                                                        <div className={`h-1 w-1 rounded-full ${tx.status === "SUCCESS" ? "bg-emerald-500" : "bg-red-500"}`} />
                                                        {tx.status || "OK"}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                );
            })}

            {groups.length === 0 && (
                <div className="rounded-2xl border border-gray-100 bg-white px-6 py-12 text-center shadow-sm">
                    <p className="text-sm text-gray-400">No transactions found.</p>
                </div>
            )}
        </div>
    );
}
