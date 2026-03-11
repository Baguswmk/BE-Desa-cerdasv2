import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { verifyToken } from "../utils/jwt";
import { errorResponse } from "../utils/response";

const prisma = new PrismaClient();

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json(errorResponse("No token provided"));
      return;
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded) {
      res.status(401).json(errorResponse("Invalid or expired token"));
      return;
    }

    // Check if user is still active (not banned) on every protected request.
    // This ensures banned users lose access immediately without waiting for
    // token expiry.
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { status: true },
    });

    if (!user) {
      res.status(401).json(errorResponse("User not found"));
      return;
    }

    if (user.status === "BANNED") {
      res.status(403).json(errorResponse("Akun Anda telah diblokir"));
      return;
    }

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json(errorResponse("Authentication failed"));
  }
};

/**
 * Optional authentication — parses JWT if present, but does NOT reject
 * unauthenticated requests. Use for routes that work for both guests and
 * logged-in users (e.g. donation creation).
 */
export const optionalAuthenticate = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      if (decoded) {
        req.user = decoded;
      }
    }
  } catch {
    // Silently ignore — treat as guest
  }
  next();
};
