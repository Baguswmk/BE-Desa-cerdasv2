import { Request, Response } from "express";
import { donasiService } from "../services/donasi.service";
import { adminService } from "../services/admin.service";
import {
  createDonationSchema,
  donationIdParamSchema,
  kegiatanIdParamSchema,
  rejectDonationSchema,
} from "../validations/donasi.schema";
import { successResponse, errorResponse } from "../utils/response";

export const donasiController = {
  async createDonation(req: Request, res: Response) {
    try {
      if (!req.file) {
        res.status(400).json(errorResponse("Bukti transfer harus diupload"));
        return;
      }

      const isGuest = !req.user?.userId;

      const validatedData = createDonationSchema.parse({
        ...req.body,
        amount: Number(req.body.amount),
        is_guest: isGuest,
      });

      const donation = await donasiService.createDonation(
        validatedData,
        req.file.filename,
        req.user?.userId,
      );

      res.status(201).json(
        successResponse(
          "Donasi berhasil dikirim. Menunggu verifikasi admin.",
          donation,
        ),
      );
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "ZodError") {
        const zodError = error as Error & { errors?: unknown };
        res.status(400).json(errorResponse("Validasi gagal", zodError.errors));
      } else {
        const message = error instanceof Error ? error.message : "Terjadi kesalahan";
        res.status(400).json(errorResponse(message));
      }
    }
  },

  async getApprovedDonations(req: Request, res: Response) {
    try {
      const { kegiatan_id } = kegiatanIdParamSchema.parse(req.params);
      const donations = await donasiService.getApprovedDonations(kegiatan_id);
      res.json(successResponse("Berhasil mendapatkan data donasi", donations));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Terjadi kesalahan";
      res.status(400).json(errorResponse(message));
    }
  },

  async getPendingDonations(_req: Request, res: Response) {
    try {
      const donations = await donasiService.getPendingDonations();
      res.json(
        successResponse("Berhasil mendapatkan data donasi pending", donations),
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Terjadi kesalahan";
      res.status(400).json(errorResponse(message));
    }
  },

  async approveDonation(req: Request, res: Response) {
    try {
      const { id } = donationIdParamSchema.parse(req.params);
      const adminId = req.user!.userId;

      const donation = await donasiService.approveDonation(id, adminId);

      await adminService.logActivity(
        adminId,
        "APPROVE_DONATION",
        `Donasi ${id} disetujui`,
        { donationId: id },
      );

      res.json(successResponse("Donasi berhasil disetujui", donation));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Terjadi kesalahan";
      res.status(400).json(errorResponse(message));
    }
  },

  async rejectDonation(req: Request, res: Response) {
    try {
      const { id } = donationIdParamSchema.parse(req.params);
      const adminId = req.user!.userId;
      const { rejected_reason } = rejectDonationSchema.parse(req.body);

      const donation = await donasiService.rejectDonation(id, rejected_reason);

      await adminService.logActivity(
        adminId,
        "REJECT_DONATION",
        `Donasi ${id} ditolak: ${rejected_reason}`,
        { donationId: id, reason: rejected_reason },
      );

      res.json(successResponse("Donasi ditolak", donation));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Terjadi kesalahan";
      res.status(400).json(errorResponse(message));
    }
  },

  async getUserDonations(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const donations = await donasiService.getUserDonations(userId);
      res.json(
        successResponse("Berhasil mendapatkan riwayat donasi", donations),
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Terjadi kesalahan";
      res.status(400).json(errorResponse(message));
    }
  },
};
