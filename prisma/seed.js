// prisma/seed.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // 1) Если нет ни одного сезона — создаём базовый на год
  const seasonCount = await prisma.season.count();
  if (seasonCount === 0) {
    // Диапазон можно поменять в админке позже
    await prisma.season.create({
      data: {
        startDate: new Date("2025-01-01"),
        endDate:   new Date("2025-12-31"),
        weekdayPrice: 6900,
        weekendPrice: 7900,
        currency: "UAH",
        weekendDays: "FRI,SAT,SUN",
      },
    });
    console.log("✓ Created base Season (2025)");
  } else {
    console.log("• Season(s) already exist, skipping");
  }

  // 2) Surcharge: EXTRA_GUEST (+1900/ночь сверх 2 гостей)
  const extraGuest = await prisma.surcharge.findFirst({
    where: { type: "EXTRA_GUEST", active: true },
  });
  if (!extraGuest) {
    await prisma.surcharge.create({
      data: {
        type: "EXTRA_GUEST",
        amount: 1900,
        unit: "PER_NIGHT",
        params: { includedGuests: 2 },
        active: true,
      },
    });
    console.log("✓ Created Surcharge: EXTRA_GUEST");
  } else {
    console.log("• EXTRA_GUEST exists, skipping");
  }

  // 3) Surcharge: PET (+700/період)
  const pet = await prisma.surcharge.findFirst({
    where: { type: "PET", active: true },
  });
  if (!pet) {
    await prisma.surcharge.create({
      data: {
        type: "PET",
        amount: 700,
        unit: "PER_STAY",
        params: {},
        active: true,
      },
    });
    console.log("✓ Created Surcharge: PET");
  } else {
    console.log("• PET exists, skipping");
  }

  // 4) Surcharge: CHILD_OVER_AGE (>6 років +1500/період за кожного)
  const childOver = await prisma.surcharge.findFirst({
    where: { type: "CHILD_OVER_AGE", active: true },
  });
  if (!childOver) {
    await prisma.surcharge.create({
      data: {
        type: "CHILD_OVER_AGE",
        amount: 1500,
        unit: "PER_STAY",
        params: { ageThreshold: 6 },
        active: true,
      },
    });
    console.log("✓ Created Surcharge: CHILD_OVER_AGE");
  } else {
    console.log("• CHILD_OVER_AGE exists, skipping");
  }
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
