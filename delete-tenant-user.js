const { PrismaClient } = require('@prisma/client');

require('dotenv').config({ path: '/home/deploy/meta-chat-platform/apps/api/.env.production' });

const prisma = new PrismaClient();

async function deleteUser() {
  try {
    // Find the user
    const user = await prisma.tenantUser.findUnique({
      where: { email: 'mislav@metrica.hr' }
    });

    if (!user) {
      console.log('✅ User not found');
      process.exit(0);
    }

    console.log('Found user:', user.id, user.email);

    // Delete verification tokens
    const deletedTokens = await prisma.verificationToken.deleteMany({
      where: { tenantUserId: user.id }
    });
    console.log('Deleted tokens:', deletedTokens.count);

    // Delete the tenant user
    const deleted = await prisma.tenantUser.delete({
      where: { email: 'mislav@metrica.hr' }
    });
    
    console.log('✅ TenantUser deleted:', deleted.email);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

deleteUser();
