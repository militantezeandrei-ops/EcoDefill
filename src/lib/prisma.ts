import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

let databaseUrl = process.env.DATABASE_URL || "";
if (databaseUrl && !databaseUrl.includes("connection_limit=")) {
    const separator = databaseUrl.includes("?") ? "&" : "?";
    databaseUrl = `${databaseUrl}${separator}connection_limit=20`;
}

export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        datasources: {
            db: {
                url: databaseUrl || undefined,
            },
        },
    });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
