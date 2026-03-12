import prisma from "@/lib/prisma";
import { Lightbulb, TrendingUp, ArrowDownRight } from "lucide-react";
import TransactionAccordion from "@/components/admin/TransactionAccordion";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
    const transactions = await prisma.transaction.findMany({
        orderBy: { createdAt: "desc" },
        include: { user: { select: { email: true } } },
    });

    const totalEarned = transactions.filter(t => t.type === "EARN").reduce((s, t) => s + t.amount, 0);
    const totalRedeemed = transactions.filter(t => t.type === "REDEEM").reduce((s, t) => s + t.amount, 0);

    // Group by date
    const groupMap = new Map<string, {
        date: string;
        label: string;
        transactions: typeof transactions;
        totalEarned: number;
        totalRedeemed: number;
        count: number;
    }>();

    for (const tx of transactions) {
        const dateKey = tx.createdAt.toISOString().split("T")[0];
        const label = tx.createdAt.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        });

        if (!groupMap.has(dateKey)) {
            groupMap.set(dateKey, {
                date: dateKey,
                label,
                transactions: [],
                totalEarned: 0,
                totalRedeemed: 0,
                count: 0,
            });
        }

        const group = groupMap.get(dateKey)!;
        group.transactions.push(tx);
        group.count++;
        if (tx.type === "EARN") group.totalEarned += tx.amount;
        if (tx.type === "REDEEM") group.totalRedeemed += tx.amount;
    }

    const groups = Array.from(groupMap.values());

    // Serialize dates for client component
    const serializedGroups = groups.map(g => ({
        ...g,
        transactions: g.transactions.map(tx => ({
            ...tx,
            createdAt: tx.createdAt.toISOString(),
        })),
    }));

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Transaction Logs</h2>
                <p className="mt-1 text-sm text-gray-400">
                    Review recent ecological contributions and rewards. Click a date to expand.
                </p>
            </div>

            {/* Quick Summary */}
            <div className="grid grid-cols-2 gap-4">
                <div className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-gradient-to-br from-emerald-500/10 to-green-500/5 p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
                    <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gray-200/10 transition-transform duration-500 group-hover:scale-125" />
                    <div className="relative flex items-start justify-between">
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Total Earned</p>
                            <p className="mt-2 text-2xl font-black text-gray-900">{totalEarned} <span className="text-sm font-bold text-emerald-500">pts</span></p>
                            <p className="mt-1 text-[11px] font-medium text-gray-400">From recycling activities</p>
                        </div>
                        <div className="rounded-xl bg-emerald-500/10 p-2.5 transition-transform duration-300 group-hover:scale-110">
                            <TrendingUp className="h-5 w-5 text-emerald-500" />
                        </div>
                    </div>
                </div>
                <div className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-gradient-to-br from-cyan-500/10 to-sky-500/5 p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
                    <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gray-200/10 transition-transform duration-500 group-hover:scale-125" />
                    <div className="relative flex items-start justify-between">
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Total Redeemed</p>
                            <p className="mt-2 text-2xl font-black text-gray-900">{totalRedeemed} <span className="text-sm font-bold text-cyan-500">pts</span></p>
                            <p className="mt-1 text-[11px] font-medium text-gray-400">{(totalRedeemed * 100).toLocaleString()} ml dispensed</p>
                        </div>
                        <div className="rounded-xl bg-cyan-500/10 p-2.5 transition-transform duration-300 group-hover:scale-110">
                            <ArrowDownRight className="h-5 w-5 text-cyan-500" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Eco Tip */}
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50/80 to-green-50/50 px-5 py-4">
                <div className="rounded-lg bg-emerald-500/10 p-2">
                    <Lightbulb className="h-5 w-5 text-emerald-500" />
                </div>
                <p className="text-sm text-emerald-700">
                    <span className="font-bold">Eco Fact:</span> Every 500ml bottle recycled saves enough energy to light a 100-watt bulb for four hours!
                </p>
            </div>

            {/* Date-grouped Accordion */}
            <TransactionAccordion groups={serializedGroups} />
        </div>
    );
}
