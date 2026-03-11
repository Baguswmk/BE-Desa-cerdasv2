import { Router } from "express";
import { donasiController } from "../controllers/donasi.controller";
import { authenticate, optionalAuthenticate } from "../middlewares/auth.middleware";
import { requireAdmin } from "../middlewares/role.middleware";
import { upload } from "../middlewares/upload.middleware";

const router = Router();

// Public + authenticated routes (optional auth links user_id if logged in)
router.post(
  "/",
  optionalAuthenticate,
  upload.single("bukti_transfer"),
  donasiController.createDonation,
);

// Get approved donations for transparency (public)
router.get("/kegiatan/:kegiatan_id", donasiController.getApprovedDonations);

// Protected routes (warga)
router.get("/my-donations", authenticate, donasiController.getUserDonations);

// Admin only routes
router.get(
  "/pending",
  authenticate,
  requireAdmin,
  donasiController.getPendingDonations,
);
router.put(
  "/:id/approve",
  authenticate,
  requireAdmin,
  donasiController.approveDonation,
);
router.put(
  "/:id/reject",
  authenticate,
  requireAdmin,
  donasiController.rejectDonation,
);

export default router;
