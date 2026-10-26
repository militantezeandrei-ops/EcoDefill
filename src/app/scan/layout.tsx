import { requireAdmin } from '@/lib/admin-auth';

export default async function ScanLayout({ children }: { children: React.ReactNode }) {
    await requireAdmin();
    return children;
}
