import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const userCount = await prisma.user.count();
    console.log(`User Count: ${userCount}`);
    
    if (userCount > 0) {
        const users = await prisma.user.findMany({ take: 5, select: { email: true, role: true } });
        console.log('Sample Users:', users);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
