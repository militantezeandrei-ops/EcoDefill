import Sidebar from "@/components/admin/Sidebar";
import { AdminTopBar } from "@/components/layout/AdminTopBar";

export default function AdminDashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
            <Sidebar />
            <div className="flex flex-1 flex-col overflow-hidden">
                <AdminTopBar />
                <main className="flex-1 overflow-y-auto px-6 py-6 lg:px-8">
                    <div className="mx-auto max-w-[1600px] animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {children}
                    </div>
                </main>
            </div>
        </div>

    );
}
