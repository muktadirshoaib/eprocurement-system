import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, sessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/session";
import { LoginBody } from "@workspace/api-zod";

const router = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { username, password } = parsed.data;

  const rows = await db.select().from(usersTable).where(eq(usersTable.username, username));
  const user = rows[0];
  if (!user || !user.isActive) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await db.insert(sessionsTable).values({ token, userId: user.id, expiresAt });

  res.cookie("session", token, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    expires: expiresAt,
  });

  res.json({
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    department: user.department,
    approvalStage: user.approvalStage,
    isActive: user.isActive,
  });
});

router.post("/auth/logout", requireAuth, async (req, res): Promise<void> => {
  const token = req.cookies?.session as string | undefined;
  if (token) {
    await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
  }
  res.clearCookie("session");
  res.json({ message: "Logged out" });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  res.json(req.user);
});

export default router;
