import { Router } from "express";
import { aiController } from "../controllers/ai.controller";
import { aiQueryLimiter } from "../middlewares/rateLimit.middleware";
import { optionalAuthenticate } from "../middlewares/auth.middleware";

const router = Router();

router.post(
  "/tanya-hukum",
  optionalAuthenticate,
  aiQueryLimiter,
  aiController.askQuestion,
);
router.get("/quota", optionalAuthenticate, aiController.getQuota);

export default router;
