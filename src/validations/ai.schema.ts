import { z } from "zod";

export const aiQuerySchema = z.object({
  question: z
    .string()
    .min(10, "Pertanyaan minimal 10 karakter")
    .max(500, "Pertanyaan maksimal 500 karakter"),
});

export const smartFarmSchema = z.object({
  plant_name: z.string().min(2, "Nama tanaman minimal 2 karakter"),
  plant_date: z.string().datetime(),
  location: z.string().min(3, "Lokasi minimal 3 karakter"),
});

export const farmChatSchema = z.object({
  question: z
    .string()
    .min(5, "Pertanyaan minimal 5 karakter")
    .max(1000, "Pertanyaan maksimal 1000 karakter"),
});

export type AIQueryInput = z.infer<typeof aiQuerySchema>;
export type SmartFarmInput = z.infer<typeof smartFarmSchema>;
export type FarmChatInput = z.infer<typeof farmChatSchema>;
