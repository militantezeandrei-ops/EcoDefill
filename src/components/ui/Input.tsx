import { InputHTMLAttributes, forwardRef, useState } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label: string;
    icon?: string;
    error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, icon, error, type = "text", ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";
    const currentType = isPassword && showPassword ? "text" : type;

    return (
        <label className="flex flex-col gap-1.5 w-full">
            <span className="text-slate-900 dark:text-slate-100 text-sm font-semibold leading-normal ml-1">
                {label}
            </span>
            <div className="relative group">
                {icon && (
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 material-symbols-outlined">
                        {icon}
                    </span>
                )}
                <input
                    ref={ref}
                    type={currentType}
                    className={`form-input flex w-full rounded-lg text-slate-900 dark:text-white border-none bg-slate-50 dark:bg-zinc-800 focus:ring-2 focus:ring-primary/50 shadow-sm h-14 pr-4 text-base placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all ${icon ? "pl-12" : "pl-4"
                        } ${error ? "ring-2 ring-red-500" : ""}`}
                    {...props}
                />
                {isPassword && (
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[20px]">
                            {showPassword ? "visibility" : "visibility_off"}
                        </span>
                    </button>
                )}
            </div>
            {error && <span className="text-red-500 text-xs ml-1 font-medium">{error}</span>}
        </label>
    );
});
Input.displayName = "Input";
