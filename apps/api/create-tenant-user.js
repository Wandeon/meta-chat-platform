const { getPrismaClient } = require('@meta-chat/database');
const bcrypt = require('bcrypt');

const prisma = getPrismaClient();

async function createTenantUser() {
  try {
    const email = 'ux-reviewer@test.com';
    const password = 'TestPassword123!';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if tenant user already exists
    const existing = await prisma.tenantUser.findUnique({
      where: { email }
    });

    if (existing) {
      console.log('TenantUser already exists, updating...');
      await prisma.tenantUser.update({
        where: { email },
        data: {
          password: hashedPassword,
          emailVerified: true
        }
      });
      console.log('✅ Updated existing TenantUser');

      const user = await prisma.tenantUser.findUnique({
        where: { email },
        include: { tenant: true }
      });
      console.log('   User ID:', user.id);
      console.log('   Tenant ID:', user.tenantId);
      console.log('   Tenant Name:', user.tenant.name);
    } else {
      // Create a tenant first
      const tenant = await prisma.tenant.create({
        data: {
          name: 'UX Review Test Company',
          enabled: true,
          subscriptionStatus: 'free',
          currentPlanId: 'free',
          settings: {},
          widgetConfig: {
            initialMessage: 'Hi! How can I help you today?',
            primaryColor: '#4f46e5',
            brandName: 'UX Review Demo'
          }
        }
      });

      // Create tenant user
      const user = await prisma.tenantUser.create({
        data: {
          email,
          password: hashedPassword,
          name: 'UX Reviewer',
          emailVerified: true,
          role: 'OWNER',
          tenantId: tenant.id
        }
      });

      console.log('✅ Created new TenantUser and Tenant');
      console.log('   User ID:', user.id);
      console.log('   Tenant ID:', tenant.id);
    }

    console.log('\n📧 Email: ux-reviewer@test.com');
    console.log('🔑 Password: TestPassword123!');
    console.log('🌐 Login URL: https://chat.genai.hr/login');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createTenantUser();
