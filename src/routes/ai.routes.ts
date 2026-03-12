import { Router } from "express";
import { aiController } from "../controllers/ai.controller";
import { aiQueryLimiter } from "../middlewares/rateLimit.middleware";
import {
  optionalAuthenticate,
  authenticate,
} from "../middlewares/auth.middleware";

const router = Router();

router.post(
  "/tanya-hukum",
  optionalAuthenticate,
  aiQueryLimiter,
  aiController.askQuestion,
);
router.get("/tanya-hukum/history", authenticate, aiController.getHistory);
router.delete("/tanya-hukum/history/:sessionId", authenticate, aiController.deleteHistorySession);
router.get("/quota", optionalAuthenticate, aiController.getQuota);

export default router;
