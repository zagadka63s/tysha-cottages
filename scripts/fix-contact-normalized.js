// scripts/fix-contact-normalized.js
// Оновлює contactNormalized для всіх існуючих броней

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function normalizePhone(raw) {
  const digits = (raw || "").replace(/\D/g, "");
  if (digits.length < 10) return null;

  if (digits.startsWith("380")) {
    return `+${digits}`;
  }

  if (digits.startsWith("0") && digits.length === 10) {
    return `+380${digits.slice(1)}`;
  }

  return `+380${digits}`;
}

function normalizeEmail(raw) {
  const s = (raw || "").trim().toLowerCase();
  return /\S+@\S+\.\S+/.test(s) ? s : null;
}

function normalizeTelegram(raw) {
  const s = (raw || "").trim();
  if (!s) return null;
  if (/\s/.test(s)) return null;
  if (/\S+@\S+\.\S+/.test(s)) return null;
  const handle = s.startsWith("@") ? s.slice(1) : s;
  return handle ? handle.toLowerCase() : null;
}

function normalizeAnyContact(raw) {
  const email = normalizeEmail(raw);
  if (email) return email;

  const phone = normalizePhone(raw);
  if (phone) return phone;

  const tg = normalizeTelegram(raw);
  if (tg) return tg;

  return (raw || "").trim().toLowerCase();
}

async function main() {
  const bookings = await prisma.booking.findMany({
    where: {
      OR: [
        { contactNormalized: null },
        { contactNormalized: "" },
      ],
      contact: { not: null },
    },
  });

  console.log(`Знайдено броней для оновлення: ${bookings.length}`);

  let updated = 0;
  for (const booking of bookings) {
    const normalized = normalizeAnyContact(booking.contact);
    if (normalized) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { contactNormalized: normalized },
      });
      console.log(`✓ ${booking.id}: ${booking.contact} → ${normalized}`);
      updated++;
    }
  }

  console.log(`\n✅ Оновлено: ${updated} броней`);

  // Тепер прив'язуємо брони до користувачів
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { phoneNormalized: { not: null } },
        { email: { not: null } },
        { telegramHandleNormalized: { not: null } },
      ],
    },
  });

  console.log(`\nЗнайдено користувачів: ${users.length}`);

  let linked = 0;
  for (const user of users) {
    const keys = [
      user.phoneNormalized,
      user.email,
      user.telegramHandleNormalized,
    ].filter(Boolean);

    if (keys.length > 0) {
      const result = await prisma.booking.updateMany({
        where: {
          userId: null,
          contactNormalized: { in: keys },
        },
        data: { userId: user.id },
      });

      if (result.count > 0) {
        console.log(`✓ User ${user.id}: прив'язано ${result.count} броней`);
        linked += result.count;
      }
    }
  }

  console.log(`\n✅ Прив'язано: ${linked} броней до користувачів`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
