import multer from "multer";
import { Request } from "express";
import { generateUniqueFilename } from "../utils/file";

const uploadPath = process.env.UPLOAD_PATH || "./uploads";
const maxFileSize = Number(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024; // 5MB

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png"];
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png"];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadPath);
  },
  filename: (_req, file, cb) => {
    const uniqueFilename = generateUniqueFilename(file.originalname);
    cb(null, uniqueFilename);
  },
});

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const isMimeValid = ALLOWED_MIME_TYPES.includes(file.mimetype);

  const ext = "." + file.originalname.split(".").pop()?.toLowerCase();
  const isExtValid = ALLOWED_EXTENSIONS.includes(ext);

  if (isMimeValid && isExtValid) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Format file tidak valid. Hanya JPG, JPEG, dan PNG yang diperbolehkan (maks 5MB).",
      ),
    );
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: maxFileSize,
    files: 12,  // photos(10) + banner(1) + qr_image(1)
  },
});