import { redirect } from "next/navigation";

export default function AdminPage() {
    // Redirect /admin to /admin/dashboard
    // The middleware will handle protecting this route
    redirect("/admin/dashboard");
}
