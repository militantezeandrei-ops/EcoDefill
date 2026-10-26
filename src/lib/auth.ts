import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

import { getJwtSecret, JWT_AUDIENCE, JWT_ISSUER } from "./jwt-config";

export interface JwtPayload {
    userId: string;
    role: "STUDENT" | "ADMIN";
    tokenVersion: number;
    iat?: number;
    exp?: number;
}

export const hashPassword = async (password: string): Promise<string> => {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
};

export const verifyPassword = async (
    password: string,
    hash: string,
): Promise<boolean> => {
    return bcrypt.compare(password, hash);
};

export const signToken = (payload: {
    userId: string;
    role: string;
    tokenVersion: number;
}): string => {
    return jwt.sign(payload, getJwtSecret(), {
        algorithm: "HS256",
        expiresIn: "7d",
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
    });
};

export const verifyToken = (token: string): JwtPayload | null => {
    try {
        const payload = jwt.verify(token, getJwtSecret(), {
            algorithms: ["HS256"],
            issuer: JWT_ISSUER,
            audience: JWT_AUDIENCE,
        });
        if (
            typeof payload === "string" ||
            typeof payload.userId !== "string" ||
            !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                payload.userId,
            ) ||
            !["ADMIN", "STUDENT"].includes(payload.role) ||
            !Number.isInteger(payload.tokenVersion) ||
            payload.tokenVersion < 0 ||
            typeof payload.exp !== "number"
        )
            return null;
        return payload as JwtPayload;
    } catch {
        return null;
    }
};
