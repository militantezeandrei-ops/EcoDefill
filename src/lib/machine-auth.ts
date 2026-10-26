import { timingSafeEqual } from "node:crypto";

export function authenticateMachine(req: Request, machineId: unknown): boolean {
    const expected = process.env.MACHINE_SECRET;
    const supplied = req.headers.get("x-machine-secret");
    if (
        !expected ||
        expected.length < 32 ||
        !supplied ||
        machineId !== (process.env.MACHINE_ID || "MACHINE_01")
    )
        return false;
    const a = Buffer.from(expected),
        b = Buffer.from(supplied);
    return a.length === b.length && timingSafeEqual(a, b);
}
