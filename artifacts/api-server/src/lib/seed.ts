import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

const STAGE_NAMES: Record<number, string> = {
  1: "Department Head",
  2: "Budget Review",
  3: "Procurement",
  4: "Compliance",
  5: "Finance",
  6: "Director",
  7: "Final Sign-off",
};

const DEPARTMENTS = ["Engineering", "Finance", "Operations", "HR", "Marketing", "Legal", "IT"];

export async function seedDatabase(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    logger.info("Skipping seed in production environment");
    return;
  }

  const existing = await db.select().from(usersTable).where(eq(usersTable.username, "admin"));
  if (existing.length > 0) {
    logger.info("Database already seeded, skipping");
    return;
  }

  logger.info("Seeding database with initial users...");

  const adminHash = await bcrypt.hash("admin123", 10);
  await db.insert(usersTable).values({
    username: "admin",
    passwordHash: adminHash,
    fullName: "System Administrator",
    role: "admin",
    department: "Administration",
    approvalStage: null,
    isActive: true,
  });

  const approverHash = await bcrypt.hash("password123", 10);
  for (let stage = 1; stage <= 7; stage++) {
    await db.insert(usersTable).values({
      username: `approver${stage}`,
      passwordHash: approverHash,
      fullName: `${STAGE_NAMES[stage]} Approver`,
      role: "approver",
      department: DEPARTMENTS[stage - 1] ?? "Administration",
      approvalStage: stage,
      isActive: true,
    });
  }

  const userHash = await bcrypt.hash("user123", 10);
  await db.insert(usersTable).values([
    {
      username: "jsmith",
      passwordHash: userHash,
      fullName: "John Smith",
      role: "basic_user",
      department: "Engineering",
      approvalStage: null,
      isActive: true,
    },
    {
      username: "mjones",
      passwordHash: userHash,
      fullName: "Mary Jones",
      role: "basic_user",
      department: "Marketing",
      approvalStage: null,
      isActive: true,
    },
  ]);

  logger.info("Database seeded successfully with development test accounts");
}
