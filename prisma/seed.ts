// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  try {
    // Create admin user
    const adminPassword = await bcrypt.hash('AdminPass123!', 12);
    const admin = await prisma.user.upsert({
      where: { emailLower: 'admin@trustbridge.health' },
      update: {},
      create: {
        email: 'admin@trustbridge.health',
        emailLower: 'admin@trustbridge.health',
        name: 'System Administrator',
        hashedPassword: adminPassword,
        role: 'ADMIN',
        loginAttempts: 0,
      },
    });

    // Create provider user
    const providerPassword = await bcrypt.hash('ProviderPass123!', 12);
    const provider = await prisma.user.upsert({
      where: { emailLower: 'dr.smith@trustbridge.health' },
      update: {},
      create: {
        email: 'dr.smith@trustbridge.health',
        emailLower: 'dr.smith@trustbridge.health',
        name: 'Dr. Sarah Smith',
        hashedPassword: providerPassword,
        role: 'PROVIDER',
        loginAttempts: 0,
      },
    });

    // Create patient users
    const patientPassword = await bcrypt.hash('PatientPass123!', 12);
    const patient1 = await prisma.user.upsert({
      where: { emailLower: 'john.doe@example.com' },
      update: {},
      create: {
        email: 'john.doe@example.com',
        emailLower: 'john.doe@example.com',
        name: 'John Doe',
        hashedPassword: patientPassword,
        role: 'PATIENT',
        loginAttempts: 0,
      },
    });

    const patient2 = await prisma.user.upsert({
      where: { emailLower: 'jane.smith@example.com' },
      update: {},
      create: {
        email: 'jane.smith@example.com',
        emailLower: 'jane.smith@example.com',
        name: 'Jane Smith',
        hashedPassword: patientPassword,
        role: 'PATIENT',
        loginAttempts: 0,
      },
    });

    console.log("✅ Seeding completed successfully!");
    console.log("📊 Created users:");
    console.log(`   Admin: ${admin.email}`);
    console.log(`   Provider: ${provider.email}`);
    console.log(`   Patient 1: ${patient1.email}`);
    console.log(`   Patient 2: ${patient2.email}`);
    console.log("");
    console.log("🔐 Default passwords:");
    console.log("   Admin: AdminPass123!");
    console.log("   Provider: ProviderPass123!");
    console.log("   Patients: PatientPass123!");

  } catch (error) {
    console.error("❌ Seeding failed:", error);
    throw error;
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