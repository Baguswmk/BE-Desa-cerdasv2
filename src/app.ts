import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { errorHandler } from "./middlewares/error.middleware";
import { generalLimiter } from "./middlewares/rateLimit.middleware";
import authRoutes from "./routes/auth.routes";
import kegiatanRoutes from "./routes/kegiatan.routes";
import donasiRoutes from "./routes/donasi.routes";
import aiRoutes from "./routes/ai.routes";
import smartFarmRoutes from "./routes/smartfarm.routes";
import adminRoutes from "./routes/admin.routes";

// Load environment variables
dotenv.config();

const app: Application = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "https://desa-cerdas.my.id:5858",
    credentials: true,
  }),
);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use(generalLimiter);

// Serve static files (uploads)
app.use("/uploads", express.static("uploads"));

// Health check endpoint
app.get("/health", (_, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/kegiatan", kegiatanRoutes);
app.use("/api/donasi", donasiRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/smartfarm", smartFarmRoutes);
app.use("/api/admin", adminRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;
