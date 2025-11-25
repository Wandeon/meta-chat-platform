const { getPrismaClient } = require("@meta-chat/database");
const prisma = getPrismaClient();

async function verifyAccount() {
  try {
    const user = await prisma.adminUser.findUnique({
      where: { email: "ux-reviewer@test.com" }
    });
    
    if (user) {
      console.log("✅ Account found");
      console.log("Email:", user.email);
      console.log("Email Verified:", user.emailVerified);
      console.log("Has Password:", user.password ? "Yes" : "No");
      console.log("Password Hash Length:", user.password?.length || 0);
      console.log("Role:", user.role);
      console.log("Created:", user.createdAt);
    } else {
      console.log("❌ Account not found");
    }
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyAccount();
