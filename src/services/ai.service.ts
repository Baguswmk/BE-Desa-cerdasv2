import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger";
import { groqService } from "./groq.service";

const prisma = new PrismaClient();

const AI_QUOTA_LOGGED_IN = Number(process.env.AI_QUOTA_LOGGED_IN) || 15;
const AI_QUOTA_GUEST = Number(process.env.AI_QUOTA_GUEST) || 3;

function sanitizeAIOutput(text: string): string {
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export const aiService = {
  async checkQuota(userId?: string, ipAddress?: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const where: { created_at: { gte: Date }; user_id?: string | null; ip_address?: string } = {
      created_at: { gte: today },
    };

    if (userId) {
      where.user_id = userId;
    } else if (ipAddress) {
      where.ip_address = ipAddress;
      where.user_id = null;
    }

    const count = await prisma.aIQuery.count({ where });
    const maxQuota = userId ? AI_QUOTA_LOGGED_IN : AI_QUOTA_GUEST;
    return maxQuota - count;
  },

  async askLegalQuestion(
    question: string,
    userId?: string,
    ipAddress?: string,
  ) {
    const remainingQuota = await this.checkQuota(userId, ipAddress);
    if (remainingQuota <= 0) {
      throw new Error("Kuota harian Anda sudah habis");
    }

    const bannedKeywords = ["bunuh", "bom", "teror", "narkoba", "senjata"];
    if (bannedKeywords.some((k) => question.toLowerCase().includes(k))) {
      throw new Error("Pertanyaan mengandung konten yang tidak diperbolehkan");
    }

    const systemPrompt = `Anda adalah asisten hukum AI untuk desa di Indonesia.
Tugas Anda adalah memberikan informasi edukasi hukum yang mudah dipahami.
PENTING: Anda BUKAN pengacara resmi. Selalu sertakan disclaimer bahwa ini hanya informasi umum dan bukan nasihat hukum resmi.
Jawab dalam Bahasa Indonesia dengan sederhana dan jelas.`;

    let answer: string;

    try {
      if (!groqService.isConfigured()) {
        logger.warn("Groq API key not configured, using mock response");
        answer = `[DEMO MODE] Terima kasih atas pertanyaan Anda tentang "${question.substring(0, 50)}...".

Berdasarkan hukum Indonesia, hal ini diatur dalam peraturan perundang-undangan yang relevan. Untuk informasi lebih detail, disarankan berkonsultasi dengan ahli hukum.

Disclaimer: Ini adalah informasi umum untuk tujuan edukasi saja dan bukan merupakan nasihat hukum resmi.`;
      } else {
        answer = await groqService.generateText({
          systemInstruction: systemPrompt,
          prompt: question,
          temperature: 0.5,
          maxOutputTokens: 700,
        });
      }

      const sanitizedAnswer = sanitizeAIOutput(answer);

      const aiQuery = await prisma.aIQuery.create({
        data: {
          user_id: userId,
          ip_address: ipAddress,
          question,
          answer: sanitizedAnswer,
        },
      });

      logger.info(`AI query created: ${aiQuery.id} using ${groqService.getModel()}`);

      return {
        question,
        answer: sanitizedAnswer,
        remaining_quota: remainingQuota - 1,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      if (message.includes("Kuota") || message.includes("konten")) {
        throw new Error(message);
      }
      logger.error("Error calling Groq API:", message);
      throw new Error("Gagal mendapatkan jawaban dari AI. Silakan coba lagi.");
    }
  },
};
