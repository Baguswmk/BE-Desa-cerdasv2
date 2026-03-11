import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { loginLimiter } from "../middlewares/rateLimit.middleware";

const router = Router();

// Public routes
router.post("/register", authController.register);
router.post("/login", loginLimiter, authController.login);

// Protected routes
router.get("/me", authenticate, authController.getCurrentUser);
router.post("/logout", authenticate, authController.logout);

export default router;
