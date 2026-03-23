import { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: ReactNode;
    icon?: string;
    variant?: "primary" | "secondary" | "outline";
    fullWidth?: boolean;
}

export function Button({ children, icon, variant = "primary", fullWidth = true, className = "", ...props }: ButtonProps) {
    let baseStyles = "tap-target font-semibold text-base h-12 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 px-5 ";

    if (variant === "primary") {
        baseStyles += "bg-primary hover:bg-primary/90 text-white ";
    } else if (variant === "secondary") {
        baseStyles += "bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-900 dark:text-white ";
    } else if (variant === "outline") {
        baseStyles += "bg-transparent border border-primary/70 text-primary hover:bg-primary/10 ";
    }

    if (fullWidth) baseStyles += "w-full ";

    return (
        <button className={baseStyles + className} {...props}>
            <span>{children}</span>
            {icon && <span className="material-symbols-outlined text-[20px]">{icon}</span>}
        </button>
    );
}
