const { PrismaClient } = require('@prisma/client');

require('dotenv').config({ path: '/home/deploy/meta-chat-platform/apps/api/.env.production' });

const prisma = new PrismaClient();

async function deleteUser() {
  try {
    // Delete verification tokens first
    await prisma.verificationToken.deleteMany({
      where: { admin: { email: 'mislav@metrica.hr' } }
    });
    
    // Delete the user
    const deleted = await prisma.adminUser.delete({
      where: { email: 'mislav@metrica.hr' }
    });
    
    console.log('✅ User deleted:', deleted.email);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

deleteUser();
