export default function AdminSettingsPage() {
    return (
        <div className="p-8 lg:p-12 animate-in">
            <h1 className="text-5xl font-black text-gray-900 tracking-tighter mb-2 italic uppercase">System Control</h1>
            <p className="text-gray-500 font-bold text-sm tracking-widest uppercase opacity-60">Configuration Panel Coming Soon</p>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8 opacity-30">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-32 border border-gray-100 rounded-[2rem] bg-gray-50/50"></div>
                ))}
            </div>
        </div>
    );
}
