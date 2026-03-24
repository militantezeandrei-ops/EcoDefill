import { Settings as SettingsIcon, Bell, Shield, Monitor } from "lucide-react";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
    const settingSections = [
        {
            title: "General",
            desc: "Core preferences for the admin panel.",
            icon: Monitor,
            iconBg: "bg-blue-500/10",
            iconColor: "text-blue-500",
            items: [
                { label: "Require daily report generation", enabled: true },
                { label: "Show eco-tips on transaction page", enabled: true },
                { label: "Auto-refresh dashboard data", enabled: false },
            ],
        },
        {
            title: "Notifications",
            desc: "Control system alerts and reminders.",
            icon: Bell,
            iconBg: "bg-amber-500/10",
            iconColor: "text-amber-500",
            items: [
                { label: "New user registration alerts", enabled: true },
                { label: "Machine offline notifications", enabled: true },
                { label: "Daily recycling summary", enabled: false },
            ],
        },
        {
            title: "Security",
            desc: "Authentication and session management.",
            icon: Shield,
            iconBg: "bg-rose-500/10",
            iconColor: "text-rose-500",
            items: [
                { label: "Two-factor authentication", enabled: false },
                { label: "Session timeout after 30 minutes", enabled: true },
                { label: "Restrict admin IP ranges", enabled: false },
            ],
        },
    ];

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold text-gray-900">Settings</h2>
                <p className="mt-1 text-base text-gray-400">Manage your admin panel preferences and system configuration.</p>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {settingSections.map((section) => {
                    const Icon = section.icon;
                    return (
                        <div key={section.title} className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md">
                            <div className="border-b border-gray-100 px-6 py-5">
                                <div className="flex items-center gap-3">
                                    <div className={`rounded-xl p-2.5 ${section.iconBg} transition-transform duration-300 group-hover:scale-110`}>
                                        <Icon className={`h-5 w-5 ${section.iconColor}`} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">{section.title}</h3>
                                        <p className="text-[13px] text-gray-400">{section.desc}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="divide-y divide-gray-50 px-6">
                                {section.items.map((item) => (
                                    <div key={item.label} className="flex items-center justify-between py-4">
                                        <span className="text-[15px] font-medium text-gray-700">{item.label}</span>
                                        {/* Toggle switch (cosmetic) */}
                                        <div className={`relative h-6 w-11 cursor-pointer rounded-full transition-colors ${item.enabled ? "bg-emerald-500" : "bg-gray-200"}`}>
                                            <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${item.enabled ? "translate-x-5" : "translate-x-0.5"}`} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Admin Account */}
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-5">
                    <div className="rounded-xl bg-purple-500/10 p-2.5">
                        <SettingsIcon className="h-5 w-5 text-purple-500" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Admin Account</h3>
                        <p className="text-[13px] text-gray-400">Manage your administrator profile</p>
                    </div>
                </div>
                <div className="space-y-4 px-6 py-5">
                    <div>
                        <label className="text-[13px] font-bold uppercase tracking-wider text-gray-400">Display Name</label>
                        <input
                            type="text"
                            defaultValue="Admin"
                            className="mt-1.5 block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-base text-gray-900 transition-colors focus:border-emerald-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
                        />
                    </div>
                    <div>
                        <label className="text-[13px] font-bold uppercase tracking-wider text-gray-400">Email Address</label>
                        <input
                            type="email"
                            defaultValue="admin@ecodefill.com"
                            className="mt-1.5 block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-base text-gray-900 transition-colors focus:border-emerald-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
                        />
                    </div>
                    <button className="mt-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-2.5 text-base font-bold text-white shadow-sm shadow-emerald-500/20 transition-all hover:shadow-md hover:-translate-y-0.5">
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
