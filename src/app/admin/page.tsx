import { requireAdmin } from "@/lib/admin-auth";
import { redirect } from "next/navigation";

export default async function AdminPage() {
    await requireAdmin();
    // Redirect /admin to /admin/dashboard
    // The middleware will handle protecting this route
    redirect("/admin/dashboard");
}
