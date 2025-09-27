// prisma/seed.js
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

async function upsertUser({ email, name, role, password }) {
  const emailLower = email.toLowerCase();
  const hashedPassword = await bcrypt.hash(password, 10);

  return prisma.user.upsert({
    where: { emailLower }, // unique constraint
    update: { name, role, hashedPassword },
    create: { email, emailLower, name, role, hashedPassword }
  });
}

(async () => {
  try {
    await upsertUser({
      email: "admin@example.com",
      name: "Admin",
      role: "ADMIN",
      password: "Password123!"
    });

    await upsertUser({
      email: "basic@example.com",
      name: "Basic User",
      role: "USER",
      password: "Password123!"
    });

    console.log("✅ Seeded admin@example.com (ADMIN) and basic@example.com (USER)");
  } catch (e) {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
