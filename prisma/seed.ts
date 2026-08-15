import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const password = await bcrypt.hash("password123", 10);

  const employee = await prisma.user.upsert({
    where: { email: "employee@cdf.org" },
    update: {},
    create: {
      name: "Erin Employee",
      email: "employee@cdf.org",
      passwordHash: password,
      role: "employee",
    },
  });

  const employee2 = await prisma.user.upsert({
    where: { email: "employee2@cdf.org" },
    update: {},
    create: {
      name: "Evan Employee",
      email: "employee2@cdf.org",
      passwordHash: password,
      role: "employee",
    },
  });

  const reviewer = await prisma.user.upsert({
    where: { email: "reviewer@cdf.org" },
    update: {},
    create: {
      name: "Rita Reviewer",
      email: "reviewer@cdf.org",
      passwordHash: password,
      role: "reviewer",
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@cdf.org" },
    update: {},
    create: {
      name: "Alex Admin",
      email: "admin@cdf.org",
      passwordHash: password,
      role: "admin",
    },
  });

  console.log("Seeded users:");
  for (const u of [employee, employee2, reviewer, admin]) {
    console.log(`  ${u.role}: ${u.email} / password123`);
  }

  // --- Sample expense requests (Day 2) ------------------------------------
  // Only draft/submitted rows for now -- reviewer decisions (approved/
  // rejected/paid) don't exist until the reviewer workflow lands.
  //
  // receiptUrl below is a Supabase Storage object *path* (matching the real
  // upload model), not an actual uploaded file -- no bytes exist at this
  // path in the bucket yet. The UI resolves receipts to signed URLs at view
  // time and falls back to "Not available" if the object doesn't exist.

  const existingRequests = await prisma.expenseRequest.count();
  if (existingRequests > 0) {
    console.log("Expense requests already seeded, skipping.");
    await prisma.$disconnect();
    return;
  }

  // 1. Valid office-supply request, submitted and awaiting review.
  const officeSupplies = await prisma.expenseRequest.create({
    data: {
      submitterId: employee.id,
      title: "Printer paper and toner",
      description: "Restocked office supplies for the volunteer coordination desk.",
      category: "Office supplies",
      expenseDate: new Date("2026-08-05"),
      totalAmount: "84.50",
      currency: "USD",
      receiptUrl: "seed/office-supplies-receipt.pdf",
      receiptName: "office-supplies-receipt.pdf",
      receiptType: "application/pdf",
      status: "submitted",
    },
  });
  await prisma.reviewAction.create({
    data: {
      requestId: officeSupplies.id,
      action: "submitted",
      previousStatus: "draft",
      newStatus: "submitted",
    },
  });

  // 2. Travel request missing a receipt -- still in draft, not yet
  // submittable (demonstrates the "receipt required to submit" rule).
  await prisma.expenseRequest.create({
    data: {
      submitterId: employee.id,
      title: "Regional volunteer summit travel",
      description: "Round-trip mileage and parking for the Aug volunteer summit.",
      category: "Travel",
      expenseDate: new Date("2026-08-10"),
      totalAmount: "142.00",
      currency: "USD",
      status: "draft",
    },
  });

  console.log("Seeded 2 sample expense requests (draft, submitted).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
