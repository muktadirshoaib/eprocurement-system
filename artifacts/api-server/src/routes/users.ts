import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/session";
import { CreateUserBody, UpdateUserParams, UpdateUserBody, DeactivateUserParams } from "@workspace/api-zod";

const router = Router();

router.get("/users", requireAuth, requireRole("admin"), async (_req, res): Promise<void> => {
  const users = await db.select().from(usersTable).orderBy(usersTable.createdAt);
  res.json(
    users.map((u) => ({
      id: u.id,
      username: u.username,
      fullName: u.fullName,
      role: u.role,
      department: u.department,
      approvalStage: u.approvalStage,
      isActive: u.isActive,
      createdAt: u.createdAt.toISOString(),
    })),
  );
});

router.post("/users", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { username, password, fullName, role, department, approvalStage } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 10);

  const [user] = await db
    .insert(usersTable)
    .values({
      username,
      passwordHash,
      fullName,
      role,
      department,
      approvalStage: approvalStage ?? null,
    })
    .returning();

  res.status(201).json({
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    department: user.department,
    approvalStage: user.approvalStage,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
  });
});

router.put("/users/:id", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const params = UpdateUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.fullName !== undefined) updates.fullName = parsed.data.fullName;
  if (parsed.data.role !== undefined) updates.role = parsed.data.role;
  if (parsed.data.department !== undefined) updates.department = parsed.data.department;
  if (parsed.data.approvalStage !== undefined) updates.approvalStage = parsed.data.approvalStage;
  if (parsed.data.isActive !== undefined) updates.isActive = parsed.data.isActive;
  if (parsed.data.password) updates.passwordHash = await bcrypt.hash(parsed.data.password, 10);

  const [user] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, params.data.id))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    department: user.department,
    approvalStage: user.approvalStage,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
  });
});

router.delete("/users/:id", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const params = DeactivateUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [user] = await db
    .update(usersTable)
    .set({ isActive: false })
    .where(eq(usersTable.id, params.data.id))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({ message: "User deactivated" });
});

export default router;
