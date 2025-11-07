// scripts/reset-password.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function resetPassword() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log("Usage: npm run reset-password <identifier> <new-password>");
    console.log("Example: npm run reset-password admin@example.com NewPass123");
    console.log("         npm run reset-password +380123456789 NewPass123");
    console.log("         npm run reset-password @username NewPass123");
    process.exit(1);
  }

  const [identifier, newPassword] = args;

  if (newPassword.length < 6) {
    console.error("❌ Пароль должен быть минимум 6 символов");
    process.exit(1);
  }

  // Нормализация идентификатора
  const email = /\S+@\S+\.\S+/.test(identifier)
    ? identifier.toLowerCase()
    : null;

  const phone = identifier.replace(/\D/g, "");
  const phoneNorm = phone.length >= 10 ? phone : null;

  const telegram = identifier.startsWith("@")
    ? identifier.slice(1).toLowerCase()
    : (!email && !phoneNorm ? identifier.toLowerCase() : null);

  console.log("🔍 Ищу пользователя:", { email, phoneNorm, telegram });

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        email ? { email } : undefined,
        phoneNorm ? { phoneNormalized: phoneNorm } : undefined,
        telegram ? { telegramHandleNormalized: telegram } : undefined,
      ].filter(Boolean) as any,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phoneNormalized: true,
      telegramHandleNormalized: true
    },
  });

  if (!user) {
    console.error("❌ Пользователь не найден");
    process.exit(1);
  }

  console.log("\n✅ Найден пользователь:");
  console.log("   ID:", user.id);
  console.log("   Имя:", user.name || "(не указано)");
  console.log("   Email:", user.email || "(не указан)");
  console.log("   Телефон:", user.phoneNormalized || "(не указан)");
  console.log("   Telegram:", user.telegramHandleNormalized || "(не указан)");

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  console.log("\n✅ Пароль успешно изменён!");
  console.log("   Новый пароль:", newPassword);

  await prisma.$disconnect();
}

resetPassword().catch((e) => {
  console.error("❌ Ошибка:", e);
  process.exit(1);
});
