const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    console.log('Current Admin User:', admin ? { id: admin.id, email: admin.email, role: admin.role } : 'NOT FOUND');
    process.exit(0);
}

check();
