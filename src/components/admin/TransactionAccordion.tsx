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
        <div className="space-y-3">
            {groups.map((group) => {
                const isOpen = openDates.has(group.date);
                return (
                    <div key={group.date} className={`overflow-hidden rounded-xl border ${isOpen ? "border-emerald-200/60" : "border-gray-200"} bg-white shadow-sm transition-all duration-300`}>
                        {/* Date Header — compact & clickable */}
                        <button
                            onClick={() => toggle(group.date)}
                            className={`flex w-full items-center justify-between px-5 py-3 transition-all group hover:bg-gray-50 ${isOpen ? "bg-emerald-50/20" : ""}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${isOpen ? "bg-emerald-500/15" : "bg-gray-100"}`}>
                                    <Calendar className={`h-4 w-4 ${isOpen ? "text-emerald-500" : "text-gray-400"}`} />
                                </div>
                                <div className="text-left">
                                    <p className="text-[14px] font-bold text-gray-900">{group.label}</p>
                                    <p className="text-[12px] font-medium text-gray-400">
                                        {group.count} transaction{group.count !== 1 ? "s" : ""}
                                        {group.totalEarned > 0 && <span className="ml-2 font-bold text-emerald-500">+{group.totalEarned} earned</span>}
                                        {group.totalRedeemed > 0 && <span className="ml-2 font-bold text-cyan-500">−{group.totalRedeemed} redeemed</span>}
                                    </p>
                                </div>
                            </div>
                            <div className={`rounded-lg p-1 transition-colors ${isOpen ? "bg-emerald-100/50" : "group-hover:bg-gray-100"}`}>
                                {isOpen ? (
                                    <ChevronDown className={`h-4 w-4 ${isOpen ? "text-emerald-500" : "text-gray-400"}`} />
                                ) : (
                                    <ChevronRight className="h-4 w-4 text-gray-300" />
                                )}
                            </div>
                        </button>

                        {/* Expanded rows */}
                        {isOpen && (
                            <div className="max-h-[380px] overflow-y-auto border-t border-gray-100">
                                <table className="min-w-full">
                                    <thead className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur-sm">
                                        <tr>
                                            <th className="px-5 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">Time</th>
                                            <th className="px-5 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">User</th>
                                            <th className="px-5 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">Type</th>
                                            <th className="px-5 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">Material</th>
                                            <th className="px-5 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">Points</th>
                                            <th className="px-5 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {group.transactions.map((tx, rowIdx) => (
                                            <tr key={tx.id} className={`transition-colors hover:bg-blue-50/20 ${rowIdx % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}>
                                                <td className="px-5 py-2.5 text-[13px] font-medium text-gray-500">
                                                    {new Date(tx.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                </td>
                                                <td className="px-5 py-2.5">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500/10 text-[11px] font-black text-indigo-600">
                                                            {tx.user?.email?.[0]?.toUpperCase() || "?"}
                                                        </div>
                                                        <span className="text-[13px] font-bold text-gray-800">{tx.user?.email || "—"}</span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-2.5">
                                                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                                                        tx.type === "EARN"
                                                            ? "bg-[#16A34A] text-white"
                                                            : "bg-[#3B82F6] text-white"
                                                    }`}>{tx.type}</span>
                                                </td>
                                                <td className="px-5 py-2.5 text-[13px] font-medium text-gray-500">{tx.materialType || "—"}</td>
                                                <td className="px-5 py-2.5">
                                                    <span className={`text-[14px] font-black ${tx.type === "EARN" ? "text-emerald-500" : "text-red-500"}`}>
                                                        {tx.type === "EARN" ? "+" : "−"}{tx.amount}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-2.5">
                                                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${
                                                        tx.status === "SUCCESS"
                                                            ? "bg-[#16A34A] text-white"
                                                            : "bg-[#DC2626] text-white"
                                                    }`}>
                                                        <div className="h-1 w-1 rounded-full bg-white/80" />
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
                <div className="rounded-xl border border-gray-200 bg-white px-6 py-10 text-center shadow-sm">
                    <p className="text-base text-gray-400">No transactions found.</p>
                </div>
            )}
        </div>
    );
}
