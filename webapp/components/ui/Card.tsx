import { HTMLAttributes, forwardRef } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    glass?: boolean;
    shine?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
    ({ className = '', glass, shine, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={`rounded-2xl border border-gray-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 ${glass ? 'glass-morphism' : ''
                    } ${shine ? 'card-shine' : ''} ${className}`}
                {...props}
            />
        );
    }
);
Card.displayName = 'Card';

export { Card };
