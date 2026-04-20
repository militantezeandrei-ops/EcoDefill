"use client";

import React, { useRef, useEffect } from "react";

interface OtpInputProps {
    value: string;
    onChange: (value: string) => void;
    length?: number;
    disabled?: boolean;
}

export function OtpInput({ value, onChange, length = 6, disabled = false }: OtpInputProps) {
    const inputs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        // Initialize inputs array
        inputs.current = inputs.current.slice(0, length);
    }, [length]);

    const handleInput = (e: React.FormEvent<HTMLInputElement>, index: number) => {
        const target = e.target as HTMLInputElement;
        const val = target.value;

        // Only allow numbers
        if (!/^\d*$/.test(val)) {
            target.value = "";
            return;
        }

        const newOtp = value.split("");
        newOtp[index] = val.slice(-1); // Only keep the last digit
        const updatedValue = newOtp.join("");
        onChange(updatedValue);

        // Move to next input if value is entered
        if (val && index < length - 1) {
            inputs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === "Backspace") {
            if (!value[index] && index > 0) {
                // Focus previous if current is empty
                inputs.current[index - 1]?.focus();
            }
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const data = e.clipboardData.getData("text").slice(0, length);
        if (!/^\d+$/.test(data)) return;
        
        onChange(data);
        // Focus the last input or the next empty one
        const nextIndex = Math.min(data.length, length - 1);
        inputs.current[nextIndex]?.focus();
    };

    return (
        <div className="flex justify-center gap-2" onPaste={handlePaste}>
            {Array.from({ length }).map((_, i) => (
                <input
                    key={i}
                    ref={(el) => { inputs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    pattern="\d*"
                    maxLength={1}
                    value={value[i] || ""}
                    onChange={(e) => handleInput(e, i)}
                    onKeyDown={(e) => handleKeyDown(e, i)}
                    disabled={disabled}
                    className="h-12 w-10 sm:h-14 sm:w-12 rounded-xl border border-gray-200 bg-gray-50 text-center text-lg font-bold text-gray-900 shadow-sm transition-all focus:border-blue-500/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 disabled:opacity-50"
                />
            ))}
        </div>
    );
}
