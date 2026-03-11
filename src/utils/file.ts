import path from "path";
import crypto from "crypto";

export const generateUniqueFilename = (originalFilename: string): string => {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString("hex");
  const ext = path.extname(originalFilename);
  return `${timestamp}-${randomString}${ext}`;
};

export const getFileExtension = (filename: string): string => {
  return path.extname(filename).toLowerCase();
};

export const isValidImageExtension = (filename: string): boolean => {
  const validExtensions = [".jpg", ".jpeg", ".png"];
  const ext = getFileExtension(filename);
  return validExtensions.includes(ext);
};
