import Sidebar from "@/components/admin/Sidebar";
import { AdminTopBar } from "@/components/layout/AdminTopBar";

export default function AdminDashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen bg-gray-100">
            <Sidebar />
            <main className="flex-1 overflow-y-auto">
                <AdminTopBar />
                <div className="mx-auto max-w-[1400px] px-6 py-6">
                    {children}
                </div>
            </main>
        </div>
    );
}
