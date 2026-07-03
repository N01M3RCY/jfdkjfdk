import { Router, type IRouter } from "express";
import healthRouter from "./health";
import casesRouter from "./cases";
import stepsRouter from "./steps";
import progressRouter from "./progress";
import submissionsRouter from "./submissions";
import adminRouter from "./admin";
import citiesRouter from "./cities";
import authRouter from "./auth";
import stepsGoalsRouter from "./steps_goals";
import socialRouter from "./social";

const router: IRouter = Router();

router.use(authRouter);
router.use(healthRouter);
router.use(casesRouter);
router.use(stepsRouter);
router.use(progressRouter);
router.use(submissionsRouter);
router.use(adminRouter);
router.use(citiesRouter);
router.use(stepsGoalsRouter);
router.use(socialRouter);

export default router;
