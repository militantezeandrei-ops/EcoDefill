import prisma from "@/lib/prisma";

const CONFIG_EMAIL_KEY = "system@maintenance.ecodefill";
const CONFIG_PURPOSE_KEY = "MAINTENANCE_CONFIG";
const FILTER_LIFESPAN_DAYS = 180; // 6 months

export interface MaintenanceConfig {
    semesterStartDate: string | null;
    semesterEndDate: string | null;
    semesterResetDone: boolean;
    lastPointsResetAt: string | null;
    filterStartDate: string | null;
    filterReplacedCount: number;
    updatedAt: string;
    updatedByEmail?: string;
}

export interface MaintenanceAlert {
    id: string;
    severity: "critical" | "warning" | "info";
    title: string;
    message: string;
    createdAt: string;
}

export interface MaintenanceStatus extends MaintenanceConfig {
    serverTime: string;
    daysUntilReset: number | null;
    semesterActive: boolean;
    filterDueDate: string | null;
    filterDaysRemaining: number | null;
    filterHealthPercent: number | null;
    filterStatus:
        "UNCONFIGURED" | "HEALTHY" | "DUE_SOON" | "REPLACEMENT_REQUIRED";
    alerts: MaintenanceAlert[];
}

const DEFAULT_CONFIG: MaintenanceConfig = {
    semesterStartDate: null,
    semesterEndDate: null,
    semesterResetDone: false,
    lastPointsResetAt: null,
    filterStartDate: null,
    filterReplacedCount: 0,
    updatedAt: new Date(0).toISOString(),
};

async function loadConfigFromDb(): Promise<MaintenanceConfig> {
    const record = await prisma.verificationCode.findFirst({
        where: {
            email: CONFIG_EMAIL_KEY,
            purpose: CONFIG_PURPOSE_KEY,
        },
        orderBy: { createdAt: "desc" },
    });

    if (!record) {
        return { ...DEFAULT_CONFIG };
    }

    try {
        const parsed = JSON.parse(
            record.codeHash,
        ) as Partial<MaintenanceConfig>;
        return {
            semesterStartDate: parsed.semesterStartDate ?? null,
            semesterEndDate: parsed.semesterEndDate ?? null,
            semesterResetDone: Boolean(parsed.semesterResetDone),
            lastPointsResetAt: parsed.lastPointsResetAt ?? null,
            filterStartDate: parsed.filterStartDate ?? null,
            filterReplacedCount: Number(parsed.filterReplacedCount ?? 0),
            updatedAt: parsed.updatedAt ?? record.createdAt.toISOString(),
            updatedByEmail: parsed.updatedByEmail,
        };
    } catch {
        throw new Error("Invalid maintenance configuration");
    }
}

export async function saveMaintenanceConfig(
    newConfig: MaintenanceConfig,
): Promise<MaintenanceConfig> {
    const saved = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended('ecodefill-maintenance', 0))`;
        const existing = await tx.verificationCode.findFirst({
            where: { email: CONFIG_EMAIL_KEY, purpose: CONFIG_PURPOSE_KEY },
            orderBy: { createdAt: "desc" },
        });
        const config = { ...newConfig };
        if (existing) {
            const current = JSON.parse(existing.codeHash) as MaintenanceConfig;
            // A concurrent filter edit must never undo a completed balance reset.
            if (
                current.semesterStartDate === config.semesterStartDate &&
                current.semesterEndDate === config.semesterEndDate &&
                current.semesterResetDone
            ) {
                config.semesterResetDone = true;
                config.lastPointsResetAt = current.lastPointsResetAt;
            }
            await tx.verificationCode.update({
                where: { id: existing.id },
                data: { codeHash: JSON.stringify(config) },
            });
        } else {
            await tx.verificationCode.create({
                data: {
                    email: CONFIG_EMAIL_KEY,
                    purpose: CONFIG_PURPOSE_KEY,
                    codeHash: JSON.stringify(config),
                    expiresAt: new Date("2099-12-31T23:59:59Z"),
                },
            });
        }
        return config;
    });
    return saved;
}

/**
 * Computes the current maintenance status using authoritative Server Time
 * and automatically executes the tamper-proof student points reset if the
 * semester end date has been reached.
 */
export async function getAndEnforceMaintenanceStatus(): Promise<MaintenanceStatus> {
    let config = await loadConfigFromDb();
    const now = new Date();
    const nowMs = now.getTime();

    // Recheck under a shared database lock: each semester reset commits exactly once.
    if (
        config.semesterEndDate &&
        !config.semesterResetDone &&
        nowMs >= new Date(config.semesterEndDate).getTime()
    ) {
        config = await prisma.$transaction(
            async (tx) => {
                await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended('ecodefill-maintenance', 0))`;
                const record = await tx.verificationCode.findFirst({
                    where: {
                        email: CONFIG_EMAIL_KEY,
                        purpose: CONFIG_PURPOSE_KEY,
                    },
                    orderBy: { createdAt: "desc" },
                });
                if (!record) return config;
                const current = JSON.parse(
                    record.codeHash,
                ) as MaintenanceConfig;
                if (
                    !current.semesterEndDate ||
                    current.semesterResetDone ||
                    nowMs < new Date(current.semesterEndDate).getTime()
                )
                    return current;
                await tx.user.updateMany({
                    where: { role: "STUDENT" },
                    data: { balance: 0 },
                });
                const updated = {
                    ...current,
                    semesterResetDone: true,
                    lastPointsResetAt: now.toISOString(),
                    updatedAt: now.toISOString(),
                };
                await tx.verificationCode.update({
                    where: { id: record.id },
                    data: { codeHash: JSON.stringify(updated) },
                });
                return updated;
            },
            { timeout: 30_000 },
        );
    }

    // Compute Semester Countdown
    let daysUntilReset: number | null = null;
    let semesterActive = false;

    if (config.semesterEndDate) {
        const endMs = new Date(config.semesterEndDate).getTime();
        if (!Number.isNaN(endMs)) {
            if (config.semesterResetDone || nowMs >= endMs) {
                daysUntilReset = 0;
                semesterActive = false;
            } else {
                const diffMs = endMs - nowMs;
                daysUntilReset = Math.max(
                    0,
                    Math.ceil(diffMs / (1000 * 60 * 60 * 24)),
                );
                semesterActive = true;
            }
        }
    }

    // Compute 6-Month (180-Day) Water Filter Maintenance Status
    const effectiveFilterStart =
        config.filterStartDate || config.semesterStartDate;
    let filterDueDate: string | null = null;
    let filterDaysRemaining: number | null = null;
    let filterHealthPercent: number | null = null;
    let filterStatus: MaintenanceStatus["filterStatus"] = "UNCONFIGURED";

    if (effectiveFilterStart) {
        const startMs = new Date(effectiveFilterStart).getTime();
        if (!Number.isNaN(startMs)) {
            const totalLifespanMs = FILTER_LIFESPAN_DAYS * 24 * 60 * 60 * 1000;
            const dueMs = startMs + totalLifespanMs;
            filterDueDate = new Date(dueMs).toISOString();

            const remainingMs = dueMs - nowMs;
            filterDaysRemaining = Math.max(
                0,
                Math.ceil(remainingMs / (1000 * 60 * 60 * 24)),
            );
            filterHealthPercent = Math.max(
                0,
                Math.min(
                    100,
                    Math.round((remainingMs / totalLifespanMs) * 100),
                ),
            );

            if (filterDaysRemaining <= 0) {
                filterStatus = "REPLACEMENT_REQUIRED";
            } else if (filterDaysRemaining <= 14) {
                filterStatus = "DUE_SOON";
            } else {
                filterStatus = "HEALTHY";
            }
        }
    }

    // Build Admin Maintenance Alerts
    const alerts: MaintenanceAlert[] = [];

    if (filterStatus === "REPLACEMENT_REQUIRED" && filterDueDate) {
        alerts.push({
            id: `filter-expired-${effectiveFilterStart}`,
            severity: "critical",
            title: "Water Filter Replacement Required",
            message:
                "The 6-month water filter lifespan has reached 0 days. Replace the filter and reset the timer in Maintenance.",
            createdAt: filterDueDate,
        });
    } else if (filterStatus === "DUE_SOON" && filterDaysRemaining !== null) {
        alerts.push({
            id: `filter-due-soon-${effectiveFilterStart}`,
            severity: "warning",
            title: "Water Filter Maintenance Due Soon",
            message: `6-month water filter replacement is due in ${filterDaysRemaining} day${filterDaysRemaining === 1 ? "" : "s"} (${filterHealthPercent}% life remaining).`,
            createdAt: config.updatedAt,
        });
    }

    if (config.semesterEndDate) {
        if (config.semesterResetDone && config.lastPointsResetAt) {
            alerts.push({
                id: `sem-reset-completed-${config.semesterEndDate}`,
                severity: "info",
                title: "Semester Points Auto-Reset Executed",
                message:
                    "Semester ended and all student point balances were automatically reset to 0.",
                createdAt: config.lastPointsResetAt,
            });
        } else if (daysUntilReset !== null && daysUntilReset <= 7) {
            alerts.push({
                id: `sem-ending-soon-${config.semesterEndDate}`,
                severity: "warning",
                title: "Semester Points Expiry Approaching",
                message: `Student points will automatically reset to 0 in ${daysUntilReset} day${daysUntilReset === 1 ? "" : "s"}.`,
                createdAt: config.updatedAt,
            });
        }
    }

    return {
        ...config,
        filterStartDate: effectiveFilterStart,
        serverTime: now.toISOString(),
        daysUntilReset,
        semesterActive,
        filterDueDate,
        filterDaysRemaining,
        filterHealthPercent,
        filterStatus,
        alerts,
    };
}
