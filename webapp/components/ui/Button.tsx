import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'admin';
    size?: 'sm' | 'md' | 'lg';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className = '', variant = 'primary', size = 'md', ...props }, ref) => {
        const baseStyles = 'inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-sm';

        const variants = {
            primary: 'bg-[#11d452] text-white hover:bg-[#0fb345] hover:shadow-lg hover:shadow-green-200',
            secondary: 'bg-[#13ec5b] text-white hover:bg-[#11d452] hover:shadow-lg',
            admin: 'bg-gray-900 text-white hover:bg-black hover:shadow-xl',
            outline: 'border-2 border-gray-200 bg-white text-gray-700 hover:border-[#11d452] hover:text-[#11d452]',
            ghost: 'hover:bg-gray-100 text-gray-600',
        };

        const sizes = {
            sm: 'h-9 px-4 text-xs',
            md: 'h-11 px-6 text-sm',
            lg: 'h-14 px-10 text-lg',
        };

        return (
            <button
                ref={ref}
                className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
                {...props}
            />
        );
    }
);
Button.displayName = 'Button';

export { Button };
