import { z } from "zod";

export const donationIdParamSchema = z.object({
  id: z.string().uuid("ID donasi tidak valid"),
});

export const kegiatanIdParamSchema = z.object({
  kegiatan_id: z.string().uuid("ID kegiatan tidak valid"),
});

export const createDonationSchema = z
  .object({
    kegiatan_id: z.string().uuid("Kegiatan ID tidak valid"),
    amount: z
      .number()
      .finite("Nominal donasi tidak valid")
      .min(1000, "Minimal donasi Rp 1.000")
      .max(999_999_999, "Nominal donasi terlalu besar"),
    donor_name: z
      .string()
      .trim()
      .min(3, "Nama donor minimal 3 karakter")
      .max(100, "Nama donor maksimal 100 karakter")
      .optional(),
    message: z
      .string()
      .trim()
      .max(500, "Pesan maksimal 500 karakter")
      .optional(),
    is_guest: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.is_guest && !data.donor_name) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Nama donor wajib diisi untuk donasi tanpa akun",
        path: ["donor_name"],
      });
    }
  });

export const rejectDonationSchema = z.object({
  rejected_reason: z
    .string()
    .trim()
    .min(10, "Alasan penolakan minimal 10 karakter")
    .max(500, "Alasan penolakan maksimal 500 karakter"),
});

export type CreateDonationInput = z.infer<typeof createDonationSchema>;
