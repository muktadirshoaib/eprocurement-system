import { Router } from "express";
import {
  db,
  requisitionsTable,
  lineItemsTable,
  approvalRecordsTable,
  usersTable,
  notificationsTable,
} from "@workspace/db";
import { eq, and, or, desc } from "drizzle-orm";
import { requireAuth } from "../lib/session";
import {
  CreateRequisitionBody,
  GetRequisitionParams,
  SubmitRequisitionParams,
  ApproveRequisitionParams,
  ApproveRequisitionBody,
  RejectRequisitionParams,
  RejectRequisitionBody,
  ListRequisitionsQueryParams,
} from "@workspace/api-zod";

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

async function generatePrfNumber(): Promise<string> {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const all = await db.select({ id: requisitionsTable.id }).from(requisitionsTable);
  const seq = String(all.length + 1).padStart(4, "0");
  return `PRF-${dateStr}-${seq}`;
}

type RequisitionRow = typeof requisitionsTable.$inferSelect;

async function toSummary(rows: RequisitionRow[]) {
  if (rows.length === 0) return [];
  const creatorIds = [...new Set(rows.map((r) => r.creatorId))];
  const creators =
    creatorIds.length === 1
      ? await db.select().from(usersTable).where(eq(usersTable.id, creatorIds[0]))
      : await db.select().from(usersTable).where(or(...creatorIds.map((id) => eq(usersTable.id, id))));
  const creatorMap = Object.fromEntries(creators.map((c) => [c.id, c.fullName]));
  return rows.map((r) => ({
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
  }));
}

async function getRequisitionDetail(id: number) {
  const rows = await db.select().from(requisitionsTable).where(eq(requisitionsTable.id, id));
  const req = rows[0];
  if (!req) return null;

  const creatorRows = await db.select().from(usersTable).where(eq(usersTable.id, req.creatorId));
  const creator = creatorRows[0];
  const items = await db.select().from(lineItemsTable).where(eq(lineItemsTable.requisitionId, id));
  const records = await db
    .select({ record: approvalRecordsTable, approver: usersTable })
    .from(approvalRecordsTable)
    .innerJoin(usersTable, eq(approvalRecordsTable.approverId, usersTable.id))
    .where(eq(approvalRecordsTable.requisitionId, id))
    .orderBy(approvalRecordsTable.createdAt);

  return {
    id: req.id,
    prfNumber: req.prfNumber,
    title: req.title,
    description: req.description,
    department: req.department,
    currentStage: req.currentStage,
    status: req.status,
    isUrgent: req.isUrgent,
    justification: req.justification,
    totalAmount: Number(req.totalAmount),
    createdAt: req.createdAt.toISOString(),
    updatedAt: req.updatedAt.toISOString(),
    completedAt: req.completedAt?.toISOString() ?? null,
    creatorId: req.creatorId,
    creatorName: creator?.fullName ?? "Unknown",
    lineItems: items.map((i) => ({
      id: i.id,
      description: i.description,
      quantity: Number(i.quantity),
      unitPrice: Number(i.unitPrice),
      totalPrice: Number(i.totalPrice),
      category: i.category,
    })),
    approvalHistory: records.map((r) => ({
      id: r.record.id,
      approverName: r.approver.fullName,
      stage: r.record.stage,
      action: r.record.action,
      comments: r.record.comments,
      createdAt: r.record.createdAt.toISOString(),
    })),
  };
}

// GET /requisitions
router.get("/requisitions", requireAuth, async (req, res): Promise<void> => {
  const params = ListRequisitionsQueryParams.safeParse(req.query);
  const statusFilter = params.success ? params.data.status : undefined;
  const user = req.user!;

  let rows: RequisitionRow[];
  if (user.role === "admin") {
    rows = await db.select().from(requisitionsTable).orderBy(desc(requisitionsTable.createdAt));
  } else if (user.role === "approver" && user.approvalStage != null) {
    rows = await db
      .select()
      .from(requisitionsTable)
      .where(or(eq(requisitionsTable.currentStage, user.approvalStage), eq(requisitionsTable.creatorId, user.id)))
      .orderBy(desc(requisitionsTable.createdAt));
  } else {
    rows = await db
      .select()
      .from(requisitionsTable)
      .where(eq(requisitionsTable.creatorId, user.id))
      .orderBy(desc(requisitionsTable.createdAt));
  }

  const stageFilter = params.success ? params.data.stage : undefined;

  if (statusFilter) {
    rows = rows.filter((r) => r.status === statusFilter);
  }
  if (stageFilter !== undefined) {
    rows = rows.filter((r) => r.currentStage === stageFilter);
  }

  res.json(await toSummary(rows));
});

// POST /requisitions
router.post("/requisitions", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateRequisitionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = req.user!;
  const { title, description, department, isUrgent, justification, lineItems } = parsed.data;

  const totalAmount = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const prfNumber = await generatePrfNumber();

  const [requisition] = await db
    .insert(requisitionsTable)
    .values({
      prfNumber,
      creatorId: user.id,
      title,
      description,
      department,
      currentStage: null,
      status: "draft",
      isUrgent: isUrgent ?? false,
      justification,
      totalAmount: String(totalAmount),
    })
    .returning();

  if (lineItems.length > 0) {
    await db.insert(lineItemsTable).values(
      lineItems.map((item) => ({
        requisitionId: requisition.id,
        description: item.description,
        quantity: String(item.quantity),
        unitPrice: String(item.unitPrice),
        totalPrice: String(item.quantity * item.unitPrice),
        category: item.category,
      })),
    );
  }

  const detail = await getRequisitionDetail(requisition.id);
  res.status(201).json(detail);
});

// GET /requisitions/:id
router.get("/requisitions/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetRequisitionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const detail = await getRequisitionDetail(params.data.id);
  if (!detail) {
    res.status(404).json({ error: "Requisition not found" });
    return;
  }

  const user = req.user!;
  const isAdmin = user.role === "admin";
  const isCreator = detail.creatorId === user.id;
  // Approvers can view requisitions at their stage, or requisitions they've already acted on
  const isApproverWithAccess =
    user.role === "approver" &&
    (detail.currentStage === user.approvalStage ||
      detail.approvalHistory.some((h) => h.approverName && detail.approvalHistory.find((r) => r.stage === user.approvalStage)));

  if (!isAdmin && !isCreator && !isApproverWithAccess) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  res.json(detail);
});

// POST /requisitions/:id/submit
router.post("/requisitions/:id/submit", requireAuth, async (req, res): Promise<void> => {
  const params = SubmitRequisitionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const user = req.user!;

  const rows = await db.select().from(requisitionsTable).where(eq(requisitionsTable.id, params.data.id));
  const reqRow = rows[0];
  if (!reqRow) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (reqRow.creatorId !== user.id && user.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  if (reqRow.status !== "draft") {
    res.status(400).json({ error: "Only draft requisitions can be submitted" });
    return;
  }

  await db
    .update(requisitionsTable)
    .set({ status: "pending", currentStage: 1 })
    .where(eq(requisitionsTable.id, reqRow.id));

  // Notify stage 1 approvers
  const stage1Approvers = await db
    .select()
    .from(usersTable)
    .where(and(eq(usersTable.approvalStage, 1), eq(usersTable.isActive, true)));

  if (stage1Approvers.length > 0) {
    await db.insert(notificationsTable).values(
      stage1Approvers.map((a) => ({
        userId: a.id,
        title: "New Requisition Pending Approval",
        message: `Requisition ${reqRow.prfNumber} ("${reqRow.title}") requires your approval at Stage 1 (${STAGE_NAMES[1]}).`,
        notificationType: "approval_needed",
        relatedRequisitionId: reqRow.id,
        isRead: false,
      })),
    );
  }

  const detail = await getRequisitionDetail(reqRow.id);
  res.json(detail);
});

// POST /requisitions/:id/approve
router.post("/requisitions/:id/approve", requireAuth, async (req, res): Promise<void> => {
  const params = ApproveRequisitionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const body = ApproveRequisitionBody.safeParse(req.body);
  const user = req.user!;

  const rows = await db.select().from(requisitionsTable).where(eq(requisitionsTable.id, params.data.id));
  const reqRow = rows[0];
  if (!reqRow) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (reqRow.status !== "pending") {
    res.status(400).json({ error: "Only pending requisitions can be approved" });
    return;
  }

  const canApprove =
    user.role === "admin" || (user.role === "approver" && user.approvalStage === reqRow.currentStage);
  if (!canApprove) {
    res.status(403).json({ error: "You are not authorized to approve at this stage" });
    return;
  }

  const currentStage = reqRow.currentStage!;
  const comments = body.success ? (body.data.comments ?? null) : null;

  await db.insert(approvalRecordsTable).values({
    requisitionId: reqRow.id,
    approverId: user.id,
    stage: currentStage,
    action: "approved",
    comments,
  });

  if (currentStage === 7) {
    await db
      .update(requisitionsTable)
      .set({ status: "approved", currentStage: null, completedAt: new Date() })
      .where(eq(requisitionsTable.id, reqRow.id));

    const creatorRows = await db.select().from(usersTable).where(eq(usersTable.id, reqRow.creatorId));
    if (creatorRows[0]) {
      await db.insert(notificationsTable).values({
        userId: creatorRows[0].id,
        title: "Requisition Fully Approved",
        message: `Your requisition ${reqRow.prfNumber} ("${reqRow.title}") has been fully approved through all 7 stages.`,
        notificationType: "approved",
        relatedRequisitionId: reqRow.id,
        isRead: false,
      });
    }
  } else {
    const nextStage = currentStage + 1;
    await db
      .update(requisitionsTable)
      .set({ currentStage: nextStage })
      .where(eq(requisitionsTable.id, reqRow.id));

    const nextApprovers = await db
      .select()
      .from(usersTable)
      .where(and(eq(usersTable.approvalStage, nextStage), eq(usersTable.isActive, true)));

    if (nextApprovers.length > 0) {
      await db.insert(notificationsTable).values(
        nextApprovers.map((a) => ({
          userId: a.id,
          title: `Requisition Awaiting Your Approval (Stage ${nextStage})`,
          message: `Requisition ${reqRow.prfNumber} ("${reqRow.title}") has advanced to Stage ${nextStage} (${STAGE_NAMES[nextStage]}) and requires your approval.`,
          notificationType: "approval_needed",
          relatedRequisitionId: reqRow.id,
          isRead: false,
        })),
      );
    }
  }

  const detail = await getRequisitionDetail(reqRow.id);
  res.json(detail);
});

// POST /requisitions/:id/reject
router.post("/requisitions/:id/reject", requireAuth, async (req, res): Promise<void> => {
  const params = RejectRequisitionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const body = RejectRequisitionBody.safeParse(req.body);
  const user = req.user!;

  const rows = await db.select().from(requisitionsTable).where(eq(requisitionsTable.id, params.data.id));
  const reqRow = rows[0];
  if (!reqRow) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (reqRow.status !== "pending") {
    res.status(400).json({ error: "Only pending requisitions can be rejected" });
    return;
  }

  const canReject =
    user.role === "admin" || (user.role === "approver" && user.approvalStage === reqRow.currentStage);
  if (!canReject) {
    res.status(403).json({ error: "You are not authorized to reject at this stage" });
    return;
  }

  const comments = body.success ? (body.data.comments ?? null) : null;

  await db.insert(approvalRecordsTable).values({
    requisitionId: reqRow.id,
    approverId: user.id,
    stage: reqRow.currentStage!,
    action: "rejected",
    comments,
  });

  await db
    .update(requisitionsTable)
    .set({ status: "rejected", currentStage: null, completedAt: new Date() })
    .where(eq(requisitionsTable.id, reqRow.id));

  const creatorRows = await db.select().from(usersTable).where(eq(usersTable.id, reqRow.creatorId));
  if (creatorRows[0]) {
    await db.insert(notificationsTable).values({
      userId: creatorRows[0].id,
      title: "Requisition Rejected",
      message: `Your requisition ${reqRow.prfNumber} ("${reqRow.title}") was rejected at Stage ${reqRow.currentStage} (${STAGE_NAMES[reqRow.currentStage!]}).${comments ? ` Reason: ${comments}` : ""}`,
      notificationType: "rejected",
      relatedRequisitionId: reqRow.id,
      isRead: false,
    });
  }

  const detail = await getRequisitionDetail(reqRow.id);
  res.json(detail);
});

export default router;
