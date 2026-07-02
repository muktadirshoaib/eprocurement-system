import { Router } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import requisitionsRouter from "./requisitions";
import usersRouter from "./users";
import notificationsRouter from "./notifications";
import dashboardRouter from "./dashboard";

const router = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(requisitionsRouter);
router.use(usersRouter);
router.use(notificationsRouter);
router.use(dashboardRouter);

export default router;
