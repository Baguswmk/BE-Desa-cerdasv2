import { Router } from "express";
import { kegiatanController } from "../controllers/kegiatan.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { requireAdmin } from "../middlewares/role.middleware";
import { upload } from "../middlewares/upload.middleware";

const router = Router();

// Multer fields config for create/update kegiatan
const kegiatanUploadFields = upload.fields([
  { name: "photos", maxCount: 10 },
  { name: "banner", maxCount: 1 },
  { name: "qr_image", maxCount: 1 },
]);

// Public routes
router.get("/", kegiatanController.getAll);
router.get("/:id", kegiatanController.getById);

// Admin only routes
router.post(
  "/",
  authenticate,
  requireAdmin,
  kegiatanUploadFields,
  kegiatanController.create,
);
router.put(
  "/:id",
  authenticate,
  requireAdmin,
  kegiatanUploadFields,
  kegiatanController.update,
);
router.patch(
  "/:id/status",
  authenticate,
  requireAdmin,
  kegiatanController.updateStatus,
);

// ── Tambah foto ke kegiatan yang sudah ada ──────────────────────────
router.post(
  "/:id/photos",
  authenticate,
  requireAdmin,
  upload.array("photos", 10),
  kegiatanController.addPhotos,
);

// ── Hapus satu foto dari kegiatan ──────────────────────────────────
router.delete(
  "/:id/photos/:photo",
  authenticate,
  requireAdmin,
  kegiatanController.deletePhoto,
);

// ═══════════════════════════════════════════════════════════════════
//  Activity Updates (Perkembangan Kegiatan)
// ═══════════════════════════════════════════════════════════════════
router.get("/:id/updates", kegiatanController.getActivityUpdates); // public
router.post(
  "/:id/updates",
  authenticate,
  requireAdmin,
  upload.single("photo"),
  kegiatanController.createActivityUpdate,
);
router.delete(
  "/:id/updates/:updateId",
  authenticate,
  requireAdmin,
  kegiatanController.deleteActivityUpdate,
);

// ═══════════════════════════════════════════════════════════════════
//  Expense Reports (Laporan Pengeluaran)
// ═══════════════════════════════════════════════════════════════════
router.get("/:id/expenses", kegiatanController.getExpenseReports); // public
router.post(
  "/:id/expenses",
  authenticate,
  requireAdmin,
  upload.single("receipt_image"),
  kegiatanController.createExpenseReport,
);
router.delete(
  "/:id/expenses/:reportId",
  authenticate,
  requireAdmin,
  kegiatanController.deleteExpenseReport,
);

export default router;
