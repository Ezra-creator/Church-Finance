import { PrismaClient, DenominationKind, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const seedEmail = process.env.SEED_ADMIN_EMAIL || "secretary@puca.local";
  const seedPassword = process.env.SEED_ADMIN_PASSWORD || "SeedPassword2026#";

  const notes = [
    { value: new Prisma.Decimal("200.00"), sortOrder: 1 },
    { value: new Prisma.Decimal("100.00"), sortOrder: 2 },
    { value: new Prisma.Decimal("50.00"), sortOrder: 3 },
    { value: new Prisma.Decimal("20.00"), sortOrder: 4 },
    { value: new Prisma.Decimal("10.00"), sortOrder: 5 },
    { value: new Prisma.Decimal("5.00"), sortOrder: 6 },
    { value: new Prisma.Decimal("2.00"), sortOrder: 7 },
    { value: new Prisma.Decimal("1.00"), sortOrder: 8 },
  ];

  for (const note of notes) {
    await prisma.denomination.upsert({
      where: { value: note.value },
      update: { kind: DenominationKind.NOTE, sortOrder: note.sortOrder, active: true },
      create: {
        value: note.value,
        kind: DenominationKind.NOTE,
        sortOrder: note.sortOrder,
        active: true,
      },
    });
  }

  const coins = [
    { value: new Prisma.Decimal("0.50"), sortOrder: 9 },
    { value: new Prisma.Decimal("0.20"), sortOrder: 10 },
    { value: new Prisma.Decimal("0.10"), sortOrder: 11 },
    { value: new Prisma.Decimal("0.05"), sortOrder: 12 },
    { value: new Prisma.Decimal("0.01"), sortOrder: 13 },
  ];

  for (const coin of coins) {
    await prisma.denomination.upsert({
      where: { value: coin.value },
      update: { kind: DenominationKind.COIN, sortOrder: coin.sortOrder, active: true },
      create: {
        value: coin.value,
        kind: DenominationKind.COIN,
        sortOrder: coin.sortOrder,
        active: true,
      },
    });
  }

  const categories = [
    { code: "TITHE", name: "Tithe", sortOrder: 1 },
    { code: "FREEWILL_OFFERING", name: "Freewill offering", sortOrder: 2 },
    { code: "SPECIAL_OFFERING", name: "Special offering", sortOrder: 3 },
  ];

  for (const category of categories) {
    await prisma.givingCategory.upsert({
      where: { code: category.code },
      update: { name: category.name, sortOrder: category.sortOrder, active: true },
      create: {
        code: category.code,
        name: category.name,
        sortOrder: category.sortOrder,
        active: true,
      },
    });
  }

  const passwordHash = await bcrypt.hash(seedPassword, 12);

  const existingSecretary = await prisma.user.findUnique({
    where: { email: seedEmail },
  });

  if (!existingSecretary) {
    await prisma.user.create({
      data: {
        name: "Finance Secretary",
        email: seedEmail,
        passwordHash,
        role: Role.FINANCE_SECRETARY,
        active: true,
        mustChangePassword: true,
        failedLogins: 0,
      },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
