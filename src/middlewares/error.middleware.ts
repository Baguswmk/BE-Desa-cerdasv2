import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";
import { errorResponse } from "../utils/response";

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  logger.error("Error:", err);

  // Zod validation errors
  if (err.name === "ZodError") {
    res.status(400).json(errorResponse("Validation error", err.errors));
    return;
  }

  // Prisma errors
  if (err.code === "P2002") {
    res
      .status(409)
      .json(errorResponse("Duplicate entry. Record already exists."));
    return;
  }

  // Default error
  res
    .status(err.status || 500)
    .json(errorResponse(err.message || "Internal server error"));
};
