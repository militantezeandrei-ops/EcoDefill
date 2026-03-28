const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const result = await prisma.user.updateMany({
            where: { phoneNumber: null },
            data: { phoneNumber: '0917-000-0000' }
        });
        console.log(`Successfully seeded ${result.count} users with a default phone number.`);
    } catch (e) {
        console.error('Error seeding phone numbers:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
