"use client";

/**
 * StatusBarBackdrop provides a split-color background for the status bar.
 * Reduced in size and softened with transparency and backdrop blur.
 */
export function StatusBarBackdrop() {
    return (
        <div className="fixed inset-x-0 top-0 z-[100000] flex h-[calc(var(--safe-top,0px)+1px)] pointer-events-none select-none drop-shadow-sm overflow-hidden border-b border-black/5">
            {/* Left side: Softer Green - Semi-transparent with blur */}
            <div className="h-full flex-1 bg-emerald-500/100 backdrop-blur-md rounded-bl-[20px]" />
            
            {/* Right side: Softer Blue - Semi-transparent with blur */}
            <div className="h-full flex-1 bg-blue-500/100 backdrop-blur-md rounded-br-[20px]" />
        </div>
    );
}
