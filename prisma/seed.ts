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

  // --- Sample expense requests ---------------------------------------------
  // Covers every status in the workflow so the reviewer queue, employee
  // list, and dashboard totals all have something real to show on a fresh
  // install. receiptUrl values below are Supabase Storage object *paths*
  // (matching the real upload model), not actual uploaded files -- no bytes
  // exist at these paths in the bucket yet. The UI resolves receipts to
  // signed URLs at view time and falls back to "Not available" if the
  // object doesn't exist.

  const existingRequests = await prisma.expenseRequest.count();
  if (existingRequests > 0) {
    console.log("Expense requests already seeded, skipping.");
    await prisma.$disconnect();
    return;
  }

  // 1. Submitted, awaiting review.
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

  // 2. Draft, missing a receipt -- not yet submittable (demonstrates the
  // "receipt required to submit" rule).
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

  // 3. Approved, awaiting payout.
  const training = await prisma.expenseRequest.create({
    data: {
      submitterId: employee2.id,
      title: "Volunteer coordination training course",
      description: "Online certification course for new volunteer coordinators.",
      category: "Training",
      expenseDate: new Date("2026-07-28"),
      totalAmount: "199.00",
      currency: "USD",
      receiptUrl: "seed/training-receipt.pdf",
      receiptName: "training-receipt.pdf",
      receiptType: "application/pdf",
      status: "approved",
    },
  });
  await prisma.reviewAction.create({
    data: {
      requestId: training.id,
      action: "submitted",
      previousStatus: "draft",
      newStatus: "submitted",
    },
  });
  await prisma.reviewAction.create({
    data: {
      requestId: training.id,
      reviewerId: reviewer.id,
      action: "approved",
      comment: "Approved -- certification is on our approved training list.",
      previousStatus: "submitted",
      newStatus: "approved",
    },
  });
  await prisma.notification.create({
    data: {
      userId: employee2.id,
      requestId: training.id,
      message: `Your request "${training.title}" was approved.`,
    },
  });

  // 4. Rejected.
  const lunch = await prisma.expenseRequest.create({
    data: {
      submitterId: employee2.id,
      title: "Team lunch during planning session",
      description: "Catered lunch for the quarterly planning session.",
      category: "Meals",
      expenseDate: new Date("2026-08-01"),
      totalAmount: "310.00",
      currency: "USD",
      receiptUrl: "seed/lunch-receipt.jpg",
      receiptName: "lunch-receipt.jpg",
      receiptType: "image/jpeg",
      status: "rejected",
    },
  });
  await prisma.reviewAction.create({
    data: {
      requestId: lunch.id,
      action: "submitted",
      previousStatus: "draft",
      newStatus: "submitted",
    },
  });
  await prisma.reviewAction.create({
    data: {
      requestId: lunch.id,
      reviewerId: reviewer.id,
      action: "rejected",
      comment: "Exceeds the per-person meal allowance for this event type.",
      previousStatus: "submitted",
      newStatus: "rejected",
    },
  });
  await prisma.notification.create({
    data: {
      userId: employee2.id,
      requestId: lunch.id,
      message: `Your request "${lunch.title}" was rejected.`,
    },
  });

  // 5. Paid -- full lifecycle.
  const software = await prisma.expenseRequest.create({
    data: {
      submitterId: employee.id,
      title: "Design software subscription",
      description: "Monthly subscription used for volunteer program flyers.",
      category: "Software or subscriptions",
      expenseDate: new Date("2026-07-15"),
      totalAmount: "52.99",
      currency: "USD",
      receiptUrl: "seed/software-receipt.pdf",
      receiptName: "software-receipt.pdf",
      receiptType: "application/pdf",
      status: "paid",
    },
  });
  await prisma.reviewAction.create({
    data: {
      requestId: software.id,
      action: "submitted",
      previousStatus: "draft",
      newStatus: "submitted",
    },
  });
  await prisma.reviewAction.create({
    data: {
      requestId: software.id,
      reviewerId: reviewer.id,
      action: "approved",
      comment: "Approved for the flyer campaign.",
      previousStatus: "submitted",
      newStatus: "approved",
    },
  });
  await prisma.reviewAction.create({
    data: {
      requestId: software.id,
      reviewerId: reviewer.id,
      action: "paid",
      comment: "Reimbursed via bank transfer.",
      previousStatus: "approved",
      newStatus: "paid",
    },
  });
  await prisma.notification.create({
    data: {
      userId: employee.id,
      requestId: software.id,
      message: `Your request "${software.title}" was approved.`,
    },
  });
  await prisma.notification.create({
    data: {
      userId: employee.id,
      requestId: software.id,
      message: `Your request "${software.title}" was marked as paid.`,
    },
  });

  console.log(
    "Seeded 5 sample expense requests (draft, submitted, approved, rejected, paid) with review history and notifications."
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
