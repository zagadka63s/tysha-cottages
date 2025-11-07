const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fix() {
  const count = await prisma.$executeRaw`
    UPDATE "User"
    SET "passwordHash" = REPLACE("passwordHash", '$2b$', '$2a$')
    WHERE "passwordHash" LIKE '$2b$%'
  `;

  console.log('✅ Обновлено пользователей:', count);
  await prisma.$disconnect();
}

fix().catch(e => {
  console.error('❌ Ошибка:', e);
  process.exit(1);
});
