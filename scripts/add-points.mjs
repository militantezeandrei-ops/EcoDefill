import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addPoints() {
  try {
    const users = await prisma.user.findMany({
      where: {
        email: {
          contains: 'militantezeandrei',
          mode: 'insensitive',
        },
      },
    });

    if (users.length === 0) {
      console.log('No user found matching "militantezeandrei". Finding all users:');
      const allUsers = await prisma.user.findMany({
        select: { id: true, email: true, fullName: true, balance: true },
      });
      console.log(allUsers);
      return;
    }

    for (const user of users) {
      const currentBalance = Number(user.balance);
      const pointsToAdd = 150;
      const newBalance = currentBalance + pointsToAdd;

      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          balance: newBalance,
        },
      });

      // Record a transaction for demo presentation
      await prisma.transaction.create({
        data: {
          userId: user.id,
          type: 'EARN',
          amount: pointsToAdd,
          materialType: 'BONUS',
          count: 1,
          status: 'SUCCESS',
        },
      });

      console.log(`✅ Added ${pointsToAdd} points to ${user.email} (${user.fullName || 'No Name'}).`);
      console.log(`   Previous balance: ${currentBalance}`);
      console.log(`   New balance: ${updatedUser.balance}`);
    }
  } catch (error) {
    console.error('❌ Error updating points:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addPoints();
