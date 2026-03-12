import Sidebar from "@/components/admin/Sidebar";
import AdminNotificationProvider from "@/components/admin/AdminNotificationProvider";

export default function AdminDashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-gray-100/80">
            <Sidebar />
            <AdminNotificationProvider>
                <main className="flex-1 overflow-y-auto">
                    {/* Top Bar */}
                    <div className="sticky top-0 z-20 border-b border-gray-200/60 bg-white/70 px-8 py-4 backdrop-blur-xl">
                        <div className="mx-auto flex max-w-[1400px] items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
                                <span className="text-[13px] font-medium text-gray-400">EcoDefill Admin</span>
                            </div>
                            <p className="text-[13px] font-medium text-gray-400">
                                Welcome back, <span className="text-gray-700">Admin</span>
                            </p>
                        </div>
                    </div>
                    <div className="mx-auto max-w-[1400px] px-8 py-8">
                        {children}
                    </div>
                </main>
            </AdminNotificationProvider>
        </div>
    );
}
