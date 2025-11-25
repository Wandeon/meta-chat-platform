const { getPrismaClient } = require('@meta-chat/database');
const prisma = getPrismaClient();

async function listTenants() {
  try {
    const tenants = await prisma.tenant.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        enabled: true,
        widgetConfig: true,
        createdAt: true,
        _count: {
          select: {
            documents: true,
            conversations: true
          }
        }
      }
    });
    
    console.log('Total tenants:', tenants.length);
    for (const t of tenants) {
      console.log();
      console.log();
      console.log();
      console.log();
      console.log(, JSON.stringify(t.widgetConfig).substring(0, 100));
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.();
  }
}

listTenants();
