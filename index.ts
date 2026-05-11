import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import listingsRouter from "./listings";
import statsRouter from "./stats";
import ordersRouter from "./orders";
import reviewsRouter from "./reviews";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(listingsRouter);
router.use(statsRouter);
router.use(ordersRouter);
router.use(reviewsRouter);

export default router;
