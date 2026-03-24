"use client";

/**
 * StatusBarBackdrop provides a split-color background for the status bar.
 * Reduced in size and softened with transparency and backdrop blur.
 */
export function StatusBarBackdrop() {
    return (
        <div className="fixed inset-x-0 top-0 z-[100000] flex h-[calc(var(--safe-top,0px)+1px)] pointer-events-none select-none drop-shadow-sm overflow-hidden border-b border-black/5">
            {/* Soft Gray Glass Effect */}
            <div className="h-full w-full bg-zinc-400/100 backdrop-blur-md" />
        </div>
    );
}
