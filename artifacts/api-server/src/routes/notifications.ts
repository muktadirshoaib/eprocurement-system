import { Router } from "express";
import { db, notificationsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../lib/session";
import { MarkNotificationReadParams } from "@workspace/api-zod";

const router = Router();

router.get("/notifications", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const notifications = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, user.id))
    .orderBy(desc(notificationsTable.createdAt));

  res.json(
    notifications.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      notificationType: n.notificationType,
      isRead: n.isRead,
      relatedRequisitionId: n.relatedRequisitionId,
      createdAt: n.createdAt.toISOString(),
    })),
  );
});

router.post("/notifications/:id/read", requireAuth, async (req, res): Promise<void> => {
  const params = MarkNotificationReadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const user = req.user!;

  await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(and(eq(notificationsTable.id, params.data.id), eq(notificationsTable.userId, user.id)));

  res.json({ message: "Notification marked as read" });
});

export default router;
