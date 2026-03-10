import { ReactNode } from "react";

export function Shell({ children, hideBackButton = false, title, subtitle }: { children: ReactNode, hideBackButton?: boolean, title?: string, subtitle?: string }) {
    return (
        <div className="bg-background-light dark:bg-background-dark font-display min-h-screen flex flex-col items-center justify-center p-4">
            <div className="relative w-full max-w-[480px] bg-white dark:bg-zinc-900 rounded-3xl shadow-xl overflow-hidden flex flex-col pb-8 pt-4">
                {!hideBackButton && (
                    <div className="flex items-center px-4 pb-2 justify-between">
                        <button className="text-slate-900 dark:text-slate-100 flex size-12 shrink-0 items-center justify-center hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors" onClick={() => window.history.back()}>
                            <span className="material-symbols-outlined text-[24px]">arrow_back</span>
                        </button>
                        <div className="flex-1"></div>
                    </div>
                )}

                {(title || subtitle) && (
                    <div className="flex flex-col items-center px-6 pt-2 pb-6">
                        {title && <h1 className="text-slate-900 dark:text-slate-100 tracking-tight text-[32px] font-bold leading-tight text-center">{title}</h1>}
                        {subtitle && <p className="text-slate-500 dark:text-slate-400 text-base font-normal leading-normal pt-2 text-center max-w-xs">{subtitle}</p>}
                    </div>
                )}

                {children}
            </div>
        </div>
    );
}
