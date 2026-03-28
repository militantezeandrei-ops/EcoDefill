const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const u = await prisma.user.groupBy({
            by: ['yearLevel'],
            where: { course: 'BSIT' },
            _count: { id: true }
        });
        console.log(JSON.stringify(u, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
