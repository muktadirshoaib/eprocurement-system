import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { requisitionsTable } from "./requisitions";
import { usersTable } from "./users";

export const approvalRecordsTable = pgTable("approval_records", {
  id: serial("id").primaryKey(),
  requisitionId: integer("requisition_id").notNull().references(() => requisitionsTable.id),
  approverId: integer("approver_id").notNull().references(() => usersTable.id),
  stage: integer("stage").notNull(),
  action: text("action").notNull(), // approved | rejected
  comments: text("comments"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertApprovalRecordSchema = createInsertSchema(approvalRecordsTable).omit({ id: true, createdAt: true });
export type InsertApprovalRecord = z.infer<typeof insertApprovalRecordSchema>;
export type ApprovalRecord = typeof approvalRecordsTable.$inferSelect;
