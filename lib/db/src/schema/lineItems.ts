import { pgTable, text, serial, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { requisitionsTable } from "./requisitions";

export const lineItemsTable = pgTable("line_items", {
  id: serial("id").primaryKey(),
  requisitionId: integer("requisition_id").notNull().references(() => requisitionsTable.id),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(),
  unitPrice: numeric("unit_price", { precision: 15, scale: 2 }).notNull(),
  totalPrice: numeric("total_price", { precision: 15, scale: 2 }).notNull(),
  category: text("category").notNull(),
});

export const insertLineItemSchema = createInsertSchema(lineItemsTable).omit({ id: true });
export type InsertLineItem = z.infer<typeof insertLineItemSchema>;
export type LineItem = typeof lineItemsTable.$inferSelect;
