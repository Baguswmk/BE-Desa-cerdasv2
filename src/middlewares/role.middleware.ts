import { Request, Response, NextFunction } from "express";
import { errorResponse } from "../utils/response";

export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json(errorResponse("Authentication required"));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json(errorResponse("Access denied"));
      return;
    }

    next();
  };
};

export const requireAdmin = requireRole(["ADMIN"]);
