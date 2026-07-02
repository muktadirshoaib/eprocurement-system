import { pgTable, text, serial, integer, boolean, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const requisitionsTable = pgTable("requisitions", {
  id: serial("id").primaryKey(),
  prfNumber: text("prf_number").notNull().unique(),
  creatorId: integer("creator_id").notNull().references(() => usersTable.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  department: text("department").notNull(),
  currentStage: integer("current_stage"), // 1-7, null = draft or completed
  status: text("status").notNull().default("draft"), // draft | pending | approved | rejected
  isUrgent: boolean("is_urgent").notNull().default(false),
  justification: text("justification").notNull(),
  totalAmount: numeric("total_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const insertRequisitionSchema = createInsertSchema(requisitionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRequisition = z.infer<typeof insertRequisitionSchema>;
export type Requisition = typeof requisitionsTable.$inferSelect;
