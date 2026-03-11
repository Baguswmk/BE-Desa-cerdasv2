import { Request, Response } from "express";
import { smartFarmService } from "../services/smartfarm.service";
import { smartFarmSchema, farmChatSchema } from "../validations/ai.schema";
import { successResponse, errorResponse } from "../utils/response";

export const smartFarmController = {
  async createFarmRecord(req: Request, res: Response) {
    try {
      const validatedData = smartFarmSchema.parse(req.body);
      const userId = req.user!.userId;

      const farmRecord = await smartFarmService.createFarmRecord(userId, validatedData);

      const { cache_warning, ...data } = farmRecord as any;
      const message = cache_warning
        ? `Analisis pertanian berhasil dibuat. Catatan: ${cache_warning}`
        : "Analisis pertanian berhasil dibuat";

      res.status(201).json(successResponse(message, data));
    } catch (error: any) {
      if (error.name === "ZodError") {
        res.status(400).json(errorResponse("Validasi gagal", error.errors));
      } else {
        res.status(400).json(errorResponse(error.message));
      }
    }
  },

  async getUserFarms(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const farms = await smartFarmService.getUserFarms(userId);
      res.json(successResponse("Berhasil mendapatkan data pertanian", farms));
    } catch (error: any) {
      res.status(400).json(errorResponse(error.message));
    }
  },

  async getFarmById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const userId = req.user!.userId;
      const farm = await smartFarmService.getFarmById(id, userId);
      res.json(successResponse("Berhasil mendapatkan detail pertanian", farm));
    } catch (error: any) {
      res.status(404).json(errorResponse(error.message));
    }
  },

  async deleteFarmRecord(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const userId = req.user!.userId;

      const result = await smartFarmService.deleteFarmRecord(id, userId);
      res.json(successResponse("Data pertanian berhasil dihapus", result));
    } catch (error: any) {
      res.status(404).json(errorResponse(error.message));
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  //  Farm Chat (Tanya Jawab Pertanian)
  // ═══════════════════════════════════════════════════════════════════

  async askFarmQuestion(req: Request, res: Response) {
    try {
      const validatedData = farmChatSchema.parse(req.body);
      const userId = req.user?.userId;
      const ipAddress = req.ip || req.socket.remoteAddress || "unknown";

      const chatRecord = await smartFarmService.askFarmQuestion(
        validatedData.question,
        userId,
        ipAddress,
      );

      res.status(201).json(successResponse("Berhasil mendapatkan jawaban", chatRecord));
    } catch (error: any) {
      if (error.name === "ZodError") {
        res.status(400).json(errorResponse("Validasi gagal", error.errors));
      } else {
        res.status(400).json(errorResponse(error.message));
      }
    }
  },

  async getFarmChatHistory(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const history = await smartFarmService.getFarmChatHistory(userId);
      res.json(successResponse("Berhasil mendapatkan riwayat chat", history));
    } catch (error: any) {
      res.status(400).json(errorResponse(error.message));
    }
  },
};