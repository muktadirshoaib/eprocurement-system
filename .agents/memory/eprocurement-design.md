---
name: E-Procurement system design
description: Architecture decisions for the full-stack E-Procurement System artifact
---

## Stack
- Frontend: React + Vite (`artifacts/eprocurement`), wouter routing, @workspace/api-client-react hooks
- Backend: Express (`artifacts/api-server`), HttpOnly session cookie auth, bcryptjs
- DB: PostgreSQL via Drizzle ORM (`lib/db`), schema in `lib/db/src/schema/`
- API contract: OpenAPI spec at `lib/api-spec/openapi.yaml`, codegen to `lib/api-client-react` and `lib/api-zod`

## Key decisions
- Session auth uses UUID tokens in a `sessions` table (not JWT), read via HttpOnly cookie `session_token`
- `requireAuth` middleware in `artifacts/api-server/src/lib/session.ts` attaches `req.user`
- Seed runs on startup in dev only (`NODE_ENV !== "production"` gate) — test accounts: admin/admin123, approver1-7/password123, jsmith/user123, mjones/user123
- 7-stage approval chain: stages 1–7 correspond to approver users with `approvalStage` field

## Access control rules
- `GET /requisitions`: admin sees all, approver sees own stage + own created, basic_user sees own
- `GET /requisitions/:id`: admin or creator or approver at current/past stage — enforced server-side
- `GET /users`: admin only

**Why:** IDOR risk if any authenticated user can read any requisition by ID.
