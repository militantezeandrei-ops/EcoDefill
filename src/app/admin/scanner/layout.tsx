import { requireAdmin } from '@/lib/admin-auth';
export default async function ScannerLayout({ children }: { children: React.ReactNode }) {
    await requireAdmin();
    return children;
}
