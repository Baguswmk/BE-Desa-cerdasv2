import { Router } from "express";
import { adminController } from "../controllers/admin.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { requireAdmin } from "../middlewares/role.middleware";

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/dashboard", adminController.getDashboardStats);
router.get("/logs", adminController.getActivityLogs);
router.get("/users", adminController.getAllUsers);
router.post("/users", adminController.createUser);
router.put("/users/:id", adminController.updateUser);
router.patch("/users/:id/status", adminController.updateUserStatus);

router.get("/reports/export", adminController.exportDonations);

export default router;