import { Router } from "express";
import { db, requisitionsTable, notificationsTable, usersTable } from "@workspace/db";
import { eq, and, or, count, desc } from "drizzle-orm";
import { requireAuth } from "../lib/session";

const router = Router();

const STAGE_NAMES: Record<number, string> = {
  1: "Department Head",
  2: "Budget Review",
  3: "Procurement",
  4: "Compliance",
  5: "Finance",
  6: "Director",
  7: "Final Sign-off",
};

router.get("/dashboard/stats", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;

  let allReqs: (typeof requisitionsTable.$inferSelect)[];
  if (user.role === "admin") {
    allReqs = await db.select().from(requisitionsTable);
  } else if (user.role === "approver" && user.approvalStage != null) {
    allReqs = await db
      .select()
      .from(requisitionsTable)
      .where(or(eq(requisitionsTable.currentStage, user.approvalStage), eq(requisitionsTable.creatorId, user.id)));
  } else {
    allReqs = await db.select().from(requisitionsTable).where(eq(requisitionsTable.creatorId, user.id));
  }

  const total = allReqs.length;
  const draft = allReqs.filter((r) => r.status === "draft").length;
  const pending = allReqs.filter((r) => r.status === "pending").length;
  const approved = allReqs.filter((r) => r.status === "approved").length;
  const rejected = allReqs.filter((r) => r.status === "rejected").length;
  const totalAmount = allReqs.reduce((sum, r) => sum + Number(r.totalAmount), 0);

  const unreadRows = await db
    .select({ cnt: count() })
    .from(notificationsTable)
    .where(and(eq(notificationsTable.userId, user.id), eq(notificationsTable.isRead, false)));

  res.json({
    total,
    draft,
    pending,
    approved,
    rejected,
    totalAmount,
    unreadNotifications: Number(unreadRows[0]?.cnt ?? 0),
  });
});

router.get("/dashboard/recent", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;

  let rows: (typeof requisitionsTable.$inferSelect)[];
  if (user.role === "admin") {
    rows = await db.select().from(requisitionsTable).orderBy(desc(requisitionsTable.createdAt)).limit(6);
  } else if (user.role === "approver" && user.approvalStage != null) {
    rows = await db
      .select()
      .from(requisitionsTable)
      .where(or(eq(requisitionsTable.currentStage, user.approvalStage), eq(requisitionsTable.creatorId, user.id)))
      .orderBy(desc(requisitionsTable.createdAt))
      .limit(6);
  } else {
    rows = await db
      .select()
      .from(requisitionsTable)
      .where(eq(requisitionsTable.creatorId, user.id))
      .orderBy(desc(requisitionsTable.createdAt))
      .limit(6);
  }

  if (rows.length === 0) {
    res.json([]);
    return;
  }
  const creatorIds = [...new Set(rows.map((r) => r.creatorId))];
  const creators =
    creatorIds.length === 1
      ? await db.select().from(usersTable).where(eq(usersTable.id, creatorIds[0]))
      : await db.select().from(usersTable).where(or(...creatorIds.map((id) => eq(usersTable.id, id))));
  const creatorMap = Object.fromEntries(creators.map((c) => [c.id, c.fullName]));

  res.json(
    rows.map((r) => ({
      id: r.id,
      prfNumber: r.prfNumber,
      title: r.title,
      department: r.department,
      currentStage: r.currentStage,
      status: r.status,
      isUrgent: r.isUrgent,
      totalAmount: Number(r.totalAmount),
      createdAt: r.createdAt.toISOString(),
      creatorName: creatorMap[r.creatorId] ?? "Unknown",
    })),
  );
});

router.get("/dashboard/pending-approvals", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;

  let rows: (typeof requisitionsTable.$inferSelect)[];
  if (user.role === "admin") {
    rows = await db
      .select()
      .from(requisitionsTable)
      .where(eq(requisitionsTable.status, "pending"))
      .orderBy(desc(requisitionsTable.createdAt))
      .limit(10);
  } else if (user.role === "approver" && user.approvalStage != null) {
    rows = await db
      .select()
      .from(requisitionsTable)
      .where(and(eq(requisitionsTable.currentStage, user.approvalStage), eq(requisitionsTable.status, "pending")))
      .orderBy(desc(requisitionsTable.createdAt))
      .limit(10);
  } else {
    res.json([]);
    return;
  }

  if (rows.length === 0) {
    res.json([]);
    return;
  }
  const creatorIds = [...new Set(rows.map((r) => r.creatorId))];
  const creators =
    creatorIds.length === 1
      ? await db.select().from(usersTable).where(eq(usersTable.id, creatorIds[0]))
      : await db.select().from(usersTable).where(or(...creatorIds.map((id) => eq(usersTable.id, id))));
  const creatorMap = Object.fromEntries(creators.map((c) => [c.id, c.fullName]));

  res.json(
    rows.map((r) => ({
      id: r.id,
      prfNumber: r.prfNumber,
      title: r.title,
      department: r.department,
      currentStage: r.currentStage,
      status: r.status,
      isUrgent: r.isUrgent,
      totalAmount: Number(r.totalAmount),
      createdAt: r.createdAt.toISOString(),
      creatorName: creatorMap[r.creatorId] ?? "Unknown",
    })),
  );
});

router.get("/dashboard/stage-breakdown", requireAuth, async (_req, res): Promise<void> => {
  const pendingReqs = await db
    .select()
    .from(requisitionsTable)
    .where(eq(requisitionsTable.status, "pending"));

  const counts: Record<number, number> = {};
  for (const r of pendingReqs) {
    if (r.currentStage) {
      counts[r.currentStage] = (counts[r.currentStage] ?? 0) + 1;
    }
  }

  res.json(
    Object.entries(STAGE_NAMES).map(([stage, name]) => ({
      stage: Number(stage),
      stageName: name,
      count: counts[Number(stage)] ?? 0,
    })),
  );
});

export default router;
