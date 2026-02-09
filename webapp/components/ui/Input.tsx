import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className = '', label, error, ...props }, ref) => {
        return (
            <div className="w-full space-y-1.5">
                {label && (
                    <label className="ml-1 text-sm font-semibold text-gray-700">
                        {label}
                    </label>
                )}
                <input
                    ref={ref}
                    className={`flex h-12 w-full rounded-xl border-2 border-gray-100 bg-gray-50/50 px-4 py-2 text-sm transition-all focus:bg-white focus:outline-none focus:ring-4 focus:ring-green-500/10 focus:border-[#11d452] placeholder:text-gray-400 disabled:cursor-not-allowed disabled:opacity-50 ${error ? 'border-red-500 focus:ring-red-500/10' : ''
                        } ${className}`}
                    {...props}
                />
                {error && <p className="ml-1 text-xs font-medium text-red-500 animate-in">{error}</p>}
            </div>
        );
    }
);
Input.displayName = 'Input';

export { Input };
