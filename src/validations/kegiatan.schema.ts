import { z } from "zod";

export const jadwalItemSchema = z.object({
  tanggal: z.string().min(1, "Tanggal wajib diisi"),
  waktu: z.string().min(1, "Waktu wajib diisi"),
  nama_kegiatan: z.string().min(3, "Nama kegiatan minimal 3 karakter"),
});

export const createKegiatanSchema = z.object({
  title: z
    .string()
    .min(5, "Judul minimal 5 karakter")
    .max(200, "Judul maksimal 200 karakter"),
  description: z
    .string()
    .min(20, "Deskripsi minimal 20 karakter")
    .max(5000, "Deskripsi maksimal 5000 karakter"),
  target_amount: z
    .number()
    .min(1000, "Target minimal Rp 1.000")
    .max(999_999_999, "Target donasi terlalu besar"),
  start_date: z.string().datetime(),
  end_date: z.string().datetime().optional(),
  jadwal: z.array(jadwalItemSchema).optional(),
  bank_name: z.string().max(100).optional(),
  bank_account_number: z.string().max(50).optional(),
  bank_account_name: z.string().max(100).optional(),
  village_name: z.string().max(200).optional(),
  district: z.string().max(200).optional(),
  province: z.string().max(200).optional(),
  google_maps_link: z.string().max(500).optional(),
});

export const createActivityUpdateSchema = z.object({
  title: z
    .string()
    .min(3, "Judul minimal 3 karakter")
    .max(200, "Judul maksimal 200 karakter"),
  description: z
    .string()
    .min(10, "Deskripsi minimal 10 karakter")
    .max(5000, "Deskripsi maksimal 5000 karakter"),
});

export const createExpenseReportSchema = z.object({
  title: z
    .string()
    .min(3, "Judul minimal 3 karakter")
    .max(200, "Judul maksimal 200 karakter"),
  amount: z
    .number()
    .min(1, "Nominal minimal Rp 1")
    .max(999_999_999, "Nominal terlalu besar"),
});

export type CreateKegiatanInput = z.infer<typeof createKegiatanSchema>;
export type CreateActivityUpdateInput = z.infer<
  typeof createActivityUpdateSchema
>;
export type CreateExpenseReportInput = z.infer<
  typeof createExpenseReportSchema
>;
