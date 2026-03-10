import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const adminPassword = await bcrypt.hash('admin123', 10);
    const studentPassword = await bcrypt.hash('student123', 10);

    const admin = await prisma.user.upsert({
        where: { email: 'admin@ecodefill.com' },
        update: {},
        create: {
            email: 'admin@ecodefill.com',
            passwordHash: adminPassword,
            role: 'ADMIN',
            balance: 0,
        },
    });

    const student = await prisma.user.upsert({
        where: { email: 'student@example.com' },
        update: {},
        create: {
            email: 'student@example.com',
            passwordHash: studentPassword,
            role: 'STUDENT',
            balance: 10,
        },
    });

    console.log({ admin, student });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
