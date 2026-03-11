import { Request, Response } from "express";
import { adminService } from "../services/admin.service";
import { successResponse, errorResponse } from "../utils/response";

export const adminController = {
  async getDashboardStats(_req: Request, res: Response) {
    try {
      const stats = await adminService.getDashboardStats();
      res.json(
        successResponse("Berhasil mendapatkan statistik dashboard", stats),
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Terjadi kesalahan";
      res.status(400).json(errorResponse(message));
    }
  },

  async getActivityLogs(req: Request, res: Response) {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const logs = await adminService.getActivityLogs(limit);
      res.json(successResponse("Berhasil mendapatkan activity logs", logs));
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Terjadi kesalahan";
      res.status(400).json(errorResponse(message));
    }
  },

  async getAllUsers(_req: Request, res: Response) {
    try {
      const users = await adminService.getAllUsers();
      res.json(successResponse("Berhasil mendapatkan data pengguna", users));
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Terjadi kesalahan";
      res.status(400).json(errorResponse(message));
    }
  },

  async updateUserStatus(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const { status } = req.body;
      const adminId = req.user!.userId;

      if (!["ACTIVE", "BANNED"].includes(status as string)) {
        res.status(400).json(errorResponse("Status tidak valid"));
        return;
      }

      const user = await adminService.updateUserStatus(
        id,
        status as "ACTIVE" | "BANNED",
        adminId,
      );
      res.json(successResponse("Status pengguna berhasil diupdate", user));
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Terjadi kesalahan";
      res.status(400).json(errorResponse(message));
    }
  },

  // GAP 6: Export laporan donasi ke Excel atau PDF
  async exportDonations(req: Request, res: Response) {
    try {
      const format = (req.query.format as string) || "excel";
      const status = (req.query.status as string) || "APPROVED";

      if (!["excel", "pdf"].includes(format)) {
        res
          .status(400)
          .json(
            errorResponse("Format tidak valid. Gunakan 'excel' atau 'pdf'"),
          );
        return;
      }

      if (!["APPROVED", "PENDING", "REJECTED", "ALL"].includes(status)) {
        res.status(400).json(errorResponse("Status tidak valid"));
        return;
      }

      if (format === "excel") {
        const buffer = await adminService.exportDonationsToExcel(status);
        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        );
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=laporan-donasi-${status.toLowerCase()}-${Date.now()}.xlsx`,
        );
        res.send(buffer);
      } else {
        const buffer = await adminService.exportDonationsToPDF(status);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=laporan-donasi-${status.toLowerCase()}-${Date.now()}.pdf`,
        );
        res.send(buffer);
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Terjadi kesalahan";
      res.status(400).json(errorResponse(message));
    }
  },
};
