"use client";

import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Area,
    AreaChart,
} from "recharts";

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="rounded-xl border border-gray-100 bg-white/95 px-4 py-3 shadow-xl backdrop-blur-md">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
                <p className="mt-1 text-lg font-black text-gray-900">{payload[0].value} <span className="text-xs font-semibold text-emerald-500">pts</span></p>
            </div>
        );
    }
    return null;
};

export default function DashboardCharts({ chartData }: { chartData: { day: string; amount: number }[] }) {
    return (
        <div className="h-72 w-full mt-2">
            <ResponsiveContainer width="100%" height={280} minWidth={300}>
                <AreaChart data={chartData}>
                    <defs>
                        <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                            <stop offset="50%" stopColor="#10b981" stopOpacity={0.08} />
                            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#9ca3af", fontWeight: 600 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#9ca3af" }} />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#10b981', strokeWidth: 1, strokeDasharray: '4 4' }} />
                    <Area
                        type="monotone"
                        dataKey="amount"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        fill="url(#colorAmount)"
                        dot={{ r: 4, fill: "#10b981", strokeWidth: 3, stroke: "#fff" }}
                        activeDot={{ r: 7, fill: "#10b981", strokeWidth: 3, stroke: "#fff" }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
