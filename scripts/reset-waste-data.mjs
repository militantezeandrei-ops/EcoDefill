import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function reset() {
  try {
    console.log('--- Starting Database Reset ---');

    console.log('1. Clearing waste item logs (RecyclingLog)...');
    const logs = await prisma.recyclingLog.deleteMany({});
    console.log(`   Deleted ${logs.count} recycling logs.`);

    console.log('2. Clearing transaction history (Transaction)...');
    const tx = await prisma.transaction.deleteMany({});
    console.log(`   Deleted ${tx.count} transactions.`);

    console.log('3. Clearing active QR tokens (QrToken)...');
    const qr = await prisma.qrToken.deleteMany({});
    console.log(`   Deleted ${qr.count} QR tokens.`);

    console.log('4. Clearing machine sessions (MachineSession)...');
    const sessions = await prisma.machineSession.deleteMany({});
    console.log(`   Deleted ${sessions.count} machine sessions.`);

    console.log('5. Resetting student point balances to 0...');
    const users = await prisma.user.updateMany({
      data: { balance: 0 }
    });
    console.log(`   Updated ${users.count} student point balances.`);

    console.log('\n✅ Database reset successfully! All user accounts were preserved.');
  } catch (error) {
    console.error('❌ Error during reset:', error);
  } finally {
    await prisma.$disconnect();
  }
}

reset();
