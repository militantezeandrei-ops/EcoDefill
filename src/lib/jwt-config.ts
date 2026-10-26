export const JWT_ISSUER = "ecodefill";
export const JWT_AUDIENCE = "ecodefill-session";

export function getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
        throw new Error("JWT_SECRET must contain at least 32 characters");
    }
    return secret;
}
