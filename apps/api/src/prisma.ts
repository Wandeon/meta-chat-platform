import { getPrismaClient } from '@meta-chat/database';

export const prisma = getPrismaClient();

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}
