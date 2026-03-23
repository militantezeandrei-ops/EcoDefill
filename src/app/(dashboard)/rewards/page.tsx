"use client";

export default function RewardsGuidePage() {
    const earningItems = [
        { icon: "recycling", color: "emerald", label: "1 Plastic Bottle", rate: 1 },
        { icon: "local_cafe", color: "orange", label: "2 Plastic Cups", rate: 1 },
        { icon: "description", color: "blue", label: "3 Module Papers", rate: 1 },
    ];

    const colorMap: Record<string, { bg: string; text: string }> = {
        emerald: { bg: "bg-emerald-50", text: "text-emerald-600" },
        orange: { bg: "bg-orange-50", text: "text-orange-500" },
        blue: { bg: "bg-blue-50", text: "text-blue-500" },
    };

    return (
        <div className="flex-1 overflow-y-auto pb-32">
            {/* Page Header */}
            <div className="px-4 pb-4 pt-[calc(var(--safe-top)+56px)]">
                <h1 className="text-2xl font-black text-slate-900">Rewards</h1>
                <p className="mt-0.5 text-sm text-slate-400">How to earn and redeem points</p>
            </div>

            <div className="px-4 space-y-4">
                {/* Conversion Rate Card */}
                <div className="overflow-hidden rounded-[24px] bg-gradient-to-br from-blue-500 to-blue-700 p-5 text-white shadow-[0_12px_32px_rgba(37,99,235,0.3)]">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-100/80">Exchange Rate</p>
                    <div className="mt-3 flex items-center justify-between">
                        <div>
                            <p className="text-3xl font-black tracking-tight">1 Point</p>
                            <p className="mt-1 text-lg font-black text-blue-200">= 100 ml Water</p>
                        </div>
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15">
                            <span className="material-symbols-outlined text-4xl">water_drop</span>
                        </div>
                    </div>
                </div>

                {/* How to Earn */}
                <div>
                    <div className="mb-3 flex items-center justify-between">
                        <h2 className="app-section-title mb-0">How to Earn</h2>
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-600">Standard Rates</span>
                    </div>
                    <div className="app-card p-0 overflow-hidden divide-y divide-slate-100">
                        {earningItems.map((item) => {
                            const c = colorMap[item.color];
                            return (
                                <div key={item.label} className="flex items-center gap-4 px-4 py-4 active:bg-slate-50 transition-colors">
                                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${c.bg}`}>
                                        <span className={`material-symbols-outlined text-2xl ${c.text}`}>{item.icon}</span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                                        <p className="mt-0.5 text-[11px] text-slate-400">Clean &amp; dry condition</p>
                                    </div>
                                    <div className="flex items-baseline gap-0.5">
                                        <span className="text-lg font-black text-emerald-600">{item.rate}</span>
                                        <span className="text-[10px] font-bold uppercase text-slate-400">pt</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Tips */}
                <div className="app-card flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50">
                        <span className="material-symbols-outlined text-[20px] text-amber-500">lightbulb</span>
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-800">Pro Tip</p>
                        <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">
                            Drop items at the EcoDefill station and scan the QR code on the kiosk to receive points instantly.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
