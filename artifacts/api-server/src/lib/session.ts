import { db, sessionsTable, usersTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";

export type AuthUser = {
  id: number;
  username: string;
  fullName: string;
  role: string;
  department: string;
  approvalStage: number | null;
  isActive: boolean;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.session;
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const now = new Date();
  const rows = await db
    .select({ user: usersTable })
    .from(sessionsTable)
    .innerJoin(usersTable, eq(sessionsTable.userId, usersTable.id))
    .where(and(eq(sessionsTable.token, token), gt(sessionsTable.expiresAt, now)));

  const session = rows[0];
  if (!session || !session.user.isActive) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  req.user = {
    id: session.user.id,
    username: session.user.username,
    fullName: session.user.fullName,
    role: session.user.role,
    department: session.user.department,
    approvalStage: session.user.approvalStage,
    isActive: session.user.isActive,
  };
  next();
}

export function requireRole(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}
