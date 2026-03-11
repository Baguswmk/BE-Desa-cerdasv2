import { Request, Response } from "express";
import { aiService } from "../services/ai.service";
import { aiQuerySchema } from "../validations/ai.schema";
import { successResponse, errorResponse } from "../utils/response";

export const aiController = {
  async askQuestion(req: Request, res: Response) {
    try {
      const validatedData = aiQuerySchema.parse(req.body);

      const userId = req.user?.userId;
      const ipAddress = !userId ? req.ip : undefined;

      const result = await aiService.askLegalQuestion(
        validatedData.question,
        userId,
        ipAddress,
      );

      res.json(successResponse("Berhasil mendapatkan jawaban", result));
    } catch (error: any) {
      if (error.name === "ZodError") {
        res.status(400).json(errorResponse("Validasi gagal", error.errors));
      } else {
        res.status(400).json(errorResponse(error.message));
      }
    }
  },

  async getQuota(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      const ipAddress = !userId ? req.ip : undefined;

      const quota = await aiService.checkQuota(userId, ipAddress);

      res.json(
        successResponse("Berhasil mendapatkan kuota", {
          remaining_quota: quota,
        }),
      );
    } catch (error: any) {
      res.status(400).json(errorResponse(error.message));
    }
  },
};
