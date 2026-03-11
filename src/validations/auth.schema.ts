import { z } from "zod";

export const registerSchema = z.object({
  nama: z
    .string()
    .min(3, "Nama minimal 3 karakter")
    .max(100, "Nama maksimal 100 karakter"),
  email: z.string().email("Format email tidak valid"),
  no_hp: z
    .string()
    .min(10, "No HP minimal 10 digit")
    .max(15, "No HP maksimal 15 digit")
    .regex(/^[0-9+\-\s]+$/, "Format no HP tidak valid")
    .optional(),
  password: z
    .string()
    .min(8, "Password minimal 8 karakter")
    .max(72, "Password maksimal 72 karakter") 
    .regex(/[A-Z]/, "Password harus mengandung minimal 1 huruf besar")
    .regex(/[a-z]/, "Password harus mengandung minimal 1 huruf kecil")
    .regex(/[0-9]/, "Password harus mengandung minimal 1 angka")
    .regex(
      /[^A-Za-z0-9]/,
      "Password harus mengandung minimal 1 karakter spesial (!@#$%^&* dll)",
    ),
});

export const loginSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(1, "Password harus diisi"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;