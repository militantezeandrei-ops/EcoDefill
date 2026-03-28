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

const CustomTooltip = ({ active, payload, label, unit = "pts" }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="rounded-xl border border-gray-100 bg-white/95 px-4 py-3 shadow-xl backdrop-blur-md">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
                <p className="mt-1 text-lg font-black text-gray-900">
                    {payload[0].value.toLocaleString()} <span className="text-xs font-semibold" style={{ color: payload[0].stroke }}>{unit}</span>
                </p>
            </div>
        );
    }
    return null;
};

interface DashboardChartsProps {
    chartData: any[];
    color?: string;
    dataKey?: string;
    unit?: string;
}

export default function DashboardCharts({ 
    chartData, 
    color = "#10b981", 
    dataKey = "amount",
    unit = "pts"
}: DashboardChartsProps) {
    const gradientId = `color${dataKey}`;

    return (
        <div className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                            <stop offset="50%" stopColor={color} stopOpacity={0.08} />
                            <stop offset="100%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9ca3af", fontWeight: 700 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9ca3af" }} />
                    <Tooltip content={<CustomTooltip unit={unit} />} cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '4 4' }} />
                    <Area
                        type="monotone"
                        dataKey={dataKey}
                        stroke={color}
                        strokeWidth={2.5}
                        fill={`url(#${gradientId})`}
                        dot={{ r: 3, fill: color, strokeWidth: 2, stroke: "#fff" }}
                        activeDot={{ r: 5, fill: color, strokeWidth: 2, stroke: "#fff" }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
