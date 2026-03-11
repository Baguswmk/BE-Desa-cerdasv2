import { Request, Response } from "express";
import { ZodError } from "zod";
import { authService } from "../services/auth.service";
import { registerSchema, loginSchema } from "../validations/auth.schema";
import { successResponse, errorResponse } from "../utils/response";
import { logger } from "../utils/logger";

export const authController = {
  async register(req: Request, res: Response) {
    try {
      const validatedData = registerSchema.parse(req.body);
      const result = await authService.register(validatedData);
      res.status(201).json(successResponse("Registrasi berhasil", result));
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        const message = error.issues[0]?.message ?? "Validasi gagal";
        res.status(400).json(errorResponse(message));
      } else {
        const message =
          error instanceof Error ? error.message : "Terjadi kesalahan";
        res.status(400).json(errorResponse(message));
      }
    }
  },

  async login(req: Request, res: Response) {
    try {
      const validatedData = loginSchema.parse(req.body);
      const result = await authService.login(validatedData);
      res.json(successResponse("Login berhasil", result));
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        const message = error.issues[0]?.message ?? "Validasi gagal";
        res.status(400).json(errorResponse(message));
      } else {
        const message =
          error instanceof Error ? error.message : "Terjadi kesalahan";
        res.status(401).json(errorResponse(message));
      }
    }
  },

  async getCurrentUser(req: Request, res: Response) {
    try {
      if (!req.user) {
        res.status(401).json(errorResponse("Tidak terautentikasi"));
        return;
      }
      const user = await authService.getCurrentUser(req.user.userId);
      res.json(successResponse("Berhasil mendapatkan data user", user));
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Terjadi kesalahan";
      res.status(404).json(errorResponse(message));
    }
  },

  async logout(req: Request, res: Response) {
    // For JWT, logout is handled client-side by removing the token.
    // This endpoint exists mainly for server-side logging.
    logger.info(`User logged out: ${req.user?.email || "unknown"}`);
    res.json(successResponse("Logout berhasil"));
  },
};
