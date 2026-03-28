const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const result = await prisma.user.updateMany({
            where: { 
                course: 'BSIT',
                section: 'C',
                yearLevel: null 
            },
            data: { yearLevel: '3' }
        });
        console.log(`Successfully updated ${result.count} BSIT students in Section C to 3rd Year.`);
    } catch (e) {
        console.error('Error updating BSIT years:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
