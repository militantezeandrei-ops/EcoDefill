import { z } from "zod";

export const redeemAmountSchema = z.number().int().min(1).max(5);
export const itemCountSchema = z.number().int().min(0).max(30);

export function manilaDayStart(now = new Date()): Date {
    const offset = 8 * 60 * 60 * 1000;
    const local = new Date(now.getTime() + offset);
    return new Date(
        Date.UTC(
            local.getUTCFullYear(),
            local.getUTCMonth(),
            local.getUTCDate(),
        ) - offset,
    );
}

export function pointsForItems(bottles: number, cups: number, papers: number) {
    return bottles + cups + Math.floor(papers / 3);
}
