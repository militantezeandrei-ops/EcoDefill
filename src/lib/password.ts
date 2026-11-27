import { z } from "zod";

export const PASSWORD_POLICY_HINT =
    "At least 8 characters, 1 uppercase letter, 1 number (no sequential digits like 123 or 321), and 1 symbol.";

/**
 * Detects 3 or more consecutive ascending or descending ASCII digits
 * (e.g., 123, 234, 321, 987, 012, 210).
 */
export function hasSequentialDigits(password: string): boolean {
    for (let i = 0; i <= password.length - 3; i++) {
        const c0 = password.charCodeAt(i);
        const c1 = password.charCodeAt(i + 1);
        const c2 = password.charCodeAt(i + 2);
        const isDigits =
            c0 >= 48 && c0 <= 57 &&
            c1 >= 48 && c1 <= 57 &&
            c2 >= 48 && c2 <= 57;
        if (!isDigits) continue;
        if ((c1 - c0 === 1 && c2 - c1 === 1) || (c1 - c0 === -1 && c2 - c1 === -1)) {
            return true;
        }
    }
    return false;
}

/**
 * Validates a newly created password and returns an error message if invalid,
 * or null when all strong-password requirements are satisfied.
 */
export function validateStrongPassword(password: string): string | null {
    if (password.length < 8) {
        return "Password must be at least 8 characters.";
    }
    if (new TextEncoder().encode(password).length > 72) {
        return "Password must be at most 72 bytes.";
    }
    if (!/[A-Z]/.test(password)) {
        return "Password must include at least 1 uppercase letter.";
    }
    if (!/[0-9]/.test(password)) {
        return "Password must include at least 1 number.";
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
        return "Password must include at least 1 symbol (e.g. !@#$%).";
    }
    if (hasSequentialDigits(password)) {
        return "Password must not contain sequential numbers (e.g. 123, 321).";
    }
    return null;
}

export const strongPasswordSchema = z.string().superRefine((value, ctx) => {
    const error = validateStrongPassword(value);
    if (error) {
        ctx.addIssue({
            code: "custom",
            message: error,
        });
    }
});
