import { Request, Response } from "express";
import { kegiatanService } from "../services/kegiatan.service";
import { adminService } from "../services/admin.service";
import {
  createKegiatanSchema,
  createActivityUpdateSchema,
  createExpenseReportSchema,
} from "../validations/kegiatan.schema";
import { successResponse, errorResponse } from "../utils/response";
import path from "path";
import fs from "fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const kegiatanController = {
  async getAll(req: Request, res: Response) {
    try {
      const status = req.query.status as string | undefined;
      const kegiatan = await kegiatanService.getAll(status);

      // Fetch stats for public homepage and donasi page
      const [total_warga, total_kegiatan_active] = await Promise.all([
        prisma.user.count({ where: { role: "WARGA" } }),
        prisma.kegiatan.count({ where: { status: "ACTIVE" } }),
      ]);
      const donationSum = await prisma.donation.aggregate({
        where: { status: "APPROVED" },
        _sum: { amount: true },
      });

      res.json(successResponse("Berhasil mendapatkan data kegiatan", {
        data: kegiatan,
        stats: {
          total_warga,
          total_kegiatan: total_kegiatan_active,
          total_dana: donationSum._sum.amount || 0,
        }
      }));
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Terjadi kesalahan";
      res.status(400).json(errorResponse(message));
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const kegiatan = await kegiatanService.getById(id);
      res.json(
        successResponse("Berhasil mendapatkan detail kegiatan", kegiatan),
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Terjadi kesalahan";
      res.status(404).json(errorResponse(message));
    }
  },

  async create(req: Request, res: Response) {
    try {
      const adminId = req.user!.userId;

      // Parse jadwal from JSON string if provided
      let jadwal;
      if (req.body.jadwal) {
        try {
          jadwal =
            typeof req.body.jadwal === "string"
              ? JSON.parse(req.body.jadwal)
              : req.body.jadwal;
        } catch {
          res.status(400).json(errorResponse("Format jadwal tidak valid"));
          return;
        }
      }

      const validatedData = createKegiatanSchema.parse({
        ...req.body,
        target_amount: Number(req.body.target_amount),
        jadwal,
      });

      // Handle file uploads: "photos" for gallery, "banner" for banner, "qr_image" for QR
      const files = req.files as
        | { [fieldname: string]: Express.Multer.File[] }
        | undefined;
      const photos = files?.photos?.map((f) => f.filename) || [];
      const banner = files?.banner?.[0]?.filename;
      const qr_image = files?.qr_image?.[0]?.filename;

      const kegiatan = await kegiatanService.create(
        validatedData,
        photos,
        banner,
        qr_image,
      );

      await adminService.logActivity(
        adminId,
        "CREATE_KEGIATAN",
        `Kegiatan baru dibuat: "${kegiatan.title}"`,
        { kegiatanId: kegiatan.id },
      );

      res
        .status(201)
        .json(successResponse("Kegiatan berhasil dibuat", kegiatan));
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "ZodError") {
        const zodError = error as Error & { errors?: unknown };
        res.status(400).json(errorResponse("Validasi gagal", zodError.errors));
      } else {
        const message =
          error instanceof Error ? error.message : "Terjadi kesalahan";
        res.status(400).json(errorResponse(message));
      }
    }
  },

  async update(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const adminId = req.user!.userId;

      const data: any = { ...req.body };
      if (data.target_amount) data.target_amount = Number(data.target_amount);

      // Parse jadwal from JSON string if provided
      if (data.jadwal) {
        try {
          data.jadwal =
            typeof data.jadwal === "string"
              ? JSON.parse(data.jadwal)
              : data.jadwal;
        } catch {
          res.status(400).json(errorResponse("Format jadwal tidak valid"));
          return;
        }
      }

      // Handle file uploads
      const files = req.files as
        | { [fieldname: string]: Express.Multer.File[] }
        | undefined;
      const photos = files?.photos?.map((f) => f.filename);
      const banner = files?.banner?.[0]?.filename;
      const qr_image = files?.qr_image?.[0]?.filename;

      const kegiatan = await kegiatanService.update(
        id,
        data,
        photos,
        banner,
        qr_image,
      );

      await adminService.logActivity(
        adminId,
        "UPDATE_KEGIATAN",
        `Kegiatan diupdate: "${kegiatan.title}"`,
        { kegiatanId: id },
      );

      res.json(successResponse("Kegiatan berhasil diupdate", kegiatan));
    } catch (error: any) {
      res.status(400).json(errorResponse(error.message));
    }
  },

  async updateStatus(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const adminId = req.user!.userId;
      const { status } = req.body;

      type KegiatanStatus = "ACTIVE" | "COMPLETED" | "CANCELLED";
      const allowedStatuses: KegiatanStatus[] = [
        "ACTIVE",
        "COMPLETED",
        "CANCELLED",
      ];

      if (!allowedStatuses.includes(status as KegiatanStatus)) {
        res.status(400).json(errorResponse("Status tidak valid"));
        return;
      }

      const validatedStatus = status as KegiatanStatus;
      const kegiatan = await kegiatanService.updateStatus(id, validatedStatus);

      await adminService.logActivity(
        adminId,
        "UPDATE_KEGIATAN_STATUS",
        `Status kegiatan "${kegiatan.title}" diubah menjadi ${validatedStatus}`,
        { kegiatanId: id, newStatus: validatedStatus },
      );

      res.json(successResponse("Status kegiatan berhasil diupdate", kegiatan));
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Terjadi kesalahan";
      res.status(400).json(errorResponse(message));
    }
  },

  // ── NEW: Tambah foto ke kegiatan yang sudah ada ──────────────────────────
  async addPhotos(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const adminId = req.user!.userId;

      if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
        res.status(400).json(errorResponse("Tidak ada foto yang diupload"));
        return;
      }

      const newPhotos = (req.files as Express.Multer.File[]).map(
        (f) => f.filename,
      );
      const kegiatan = await kegiatanService.addPhotos(id, newPhotos);

      await adminService.logActivity(
        adminId,
        "ADD_KEGIATAN_PHOTOS",
        `Menambahkan ${newPhotos.length} foto ke kegiatan "${kegiatan.title}"`,
        { kegiatanId: id, photos: newPhotos },
      );

      res.json(successResponse("Foto berhasil ditambahkan", kegiatan));
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Terjadi kesalahan";
      res.status(400).json(errorResponse(message));
    }
  },

  // ── NEW: Hapus satu foto dari kegiatan ──────────────────────────────────
  async deletePhoto(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const photo = req.params.photo as string;
      const adminId = req.user!.userId;

      const kegiatan = await kegiatanService.deletePhoto(id, photo);

      // Hapus file fisik dari disk
      const filePath = path.join(process.cwd(), "uploads", photo);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      await adminService.logActivity(
        adminId,
        "DELETE_KEGIATAN_PHOTO",
        `Menghapus foto "${photo}" dari kegiatan "${kegiatan.title}"`,
        { kegiatanId: id, photo },
      );

      res.json(successResponse("Foto berhasil dihapus", kegiatan));
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Terjadi kesalahan";
      res.status(400).json(errorResponse(message));
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  //  Activity Updates
  // ═══════════════════════════════════════════════════════════════════

  async getActivityUpdates(req: Request, res: Response) {
    try {
      const kegiatanId = req.params.id as string;
      const updates = await kegiatanService.getActivityUpdates(kegiatanId);
      res.json(
        successResponse("Berhasil mendapatkan perkembangan kegiatan", updates),
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Terjadi kesalahan";
      res.status(400).json(errorResponse(message));
    }
  },

  async createActivityUpdate(req: Request, res: Response) {
    try {
      const kegiatanId = req.params.id as string;
      const adminId = req.user!.userId;

      const validatedData = createActivityUpdateSchema.parse(req.body);
      const photo = req.file?.filename;

      const update = await kegiatanService.createActivityUpdate(
        kegiatanId,
        validatedData,
        photo,
      );

      await adminService.logActivity(
        adminId,
        "CREATE_ACTIVITY_UPDATE",
        `Perkembangan baru ditambahkan ke kegiatan`,
        { kegiatanId, updateId: update.id },
      );

      res
        .status(201)
        .json(successResponse("Perkembangan berhasil ditambahkan", update));
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "ZodError") {
        const zodError = error as Error & { errors?: unknown };
        res.status(400).json(errorResponse("Validasi gagal", zodError.errors));
      } else {
        const message =
          error instanceof Error ? error.message : "Terjadi kesalahan";
        res.status(400).json(errorResponse(message));
      }
    }
  },

  async deleteActivityUpdate(req: Request, res: Response) {
    try {
      const updateId = req.params.updateId as string;
      const adminId = req.user!.userId;

      const result = await kegiatanService.deleteActivityUpdate(updateId);

      await adminService.logActivity(
        adminId,
        "DELETE_ACTIVITY_UPDATE",
        `Perkembangan dihapus`,
        { updateId },
      );

      res.json(successResponse("Perkembangan berhasil dihapus", result));
    } catch (error: any) {
      res.status(400).json(errorResponse(error.message));
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  //  Expense Reports
  // ═══════════════════════════════════════════════════════════════════

  async getExpenseReports(req: Request, res: Response) {
    try {
      const kegiatanId = req.params.id as string;
      const reports = await kegiatanService.getExpenseReports(kegiatanId);
      res.json(
        successResponse("Berhasil mendapatkan laporan pengeluaran", reports),
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Terjadi kesalahan";
      res.status(400).json(errorResponse(message));
    }
  },

  async createExpenseReport(req: Request, res: Response) {
    try {
      const kegiatanId = req.params.id as string;
      const adminId = req.user!.userId;

      const validatedData = createExpenseReportSchema.parse({
        ...req.body,
        amount: Number(req.body.amount),
      });
      const receiptImage = req.file?.filename;

      const report = await kegiatanService.createExpenseReport(
        kegiatanId,
        validatedData,
        receiptImage,
      );

      await adminService.logActivity(
        adminId,
        "CREATE_EXPENSE_REPORT",
        `Laporan pengeluaran ditambahkan`,
        { kegiatanId, reportId: report.id },
      );

      res
        .status(201)
        .json(
          successResponse("Laporan pengeluaran berhasil ditambahkan", report),
        );
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "ZodError") {
        const zodError = error as Error & { errors?: unknown };
        res.status(400).json(errorResponse("Validasi gagal", zodError.errors));
      } else {
        const message =
          error instanceof Error ? error.message : "Terjadi kesalahan";
        res.status(400).json(errorResponse(message));
      }
    }
  },

  async deleteExpenseReport(req: Request, res: Response) {
    try {
      const reportId = req.params.reportId as string;
      const adminId = req.user!.userId;

      const result = await kegiatanService.deleteExpenseReport(reportId);

      await adminService.logActivity(
        adminId,
        "DELETE_EXPENSE_REPORT",
        `Laporan pengeluaran dihapus`,
        { reportId },
      );

      res.json(successResponse("Laporan pengeluaran berhasil dihapus", result));
    } catch (error: any) {
      res.status(400).json(errorResponse(error.message));
    }
  },
};
