import { Router } from "express";
import { smartFarmController } from "../controllers/smartfarm.controller";
import { authenticate, optionalAuthenticate } from "../middlewares/auth.middleware";

const router = Router();

// Farm Chat — available to all (optional auth links history to user)
router.post("/chat", optionalAuthenticate, smartFarmController.askFarmQuestion);
router.get("/chat/history", authenticate, smartFarmController.getFarmChatHistory);

// SmartFarm CRUD — requires auth
router.use(authenticate);

router.post("/", smartFarmController.createFarmRecord);
router.get("/", smartFarmController.getUserFarms);
router.get("/:id", smartFarmController.getFarmById);
router.delete("/:id", smartFarmController.deleteFarmRecord);

export default router;