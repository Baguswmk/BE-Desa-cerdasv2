import { PrismaClient } from "@prisma/client";
import { SmartFarmInput } from "../validations/ai.schema";
import { weatherService } from "./weather.service";
import { logger } from "../utils/logger";
import { groqService } from "./groq.service";

const prisma = new PrismaClient();

function sanitizeAIOutput(text: string): string {
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export const smartFarmService = {
  async createFarmRecord(userId: string, data: SmartFarmInput) {
    const weatherResult = await weatherService.getWeatherByLocation(
      data.location,
    );
    const { from_cache, cache_warning, ...weatherData } = weatherResult;
    void from_cache;

    const plantDate = new Date(data.plant_date);
    const today = new Date();
    const ageInDays = Math.floor(
      (today.getTime() - plantDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    const prompt = `Tanaman: ${data.plant_name}
Umur: ${ageInDays} hari (ditanam: ${plantDate.toLocaleDateString("id-ID")})
Lokasi: ${data.location}

Cuaca saat ini:
- Suhu: ${weatherData.temperature}°C
- Kelembaban: ${weatherData.humidity}%
- Kondisi: ${weatherData.description}
- Kecepatan angin: ${weatherData.wind_speed} m/s`;

    const systemPrompt = `Anda adalah ahli pertanian Indonesia. Berikan analisis singkat dan praktis.
Format wajib:
1. Risiko Penyakit: ...
2. Saran Perawatan: ...
3. Pantangan: ...
4. Estimasi Panen: ...
Jawab dalam Bahasa Indonesia, ringkas, spesifik, dan mudah diterapkan petani desa.`;

    let aiAnalysis: string;

    try {
      if (!groqService.isConfigured()) {
        logger.warn("Groq API key not configured, using mock analysis");
        aiAnalysis = `1. Risiko Penyakit: Dengan suhu ${weatherData.temperature}°C dan kelembaban ${weatherData.humidity}%, risiko penyakit jamur sedang. Pantau daun secara rutin.

2. Saran Perawatan:
- Siram secara teratur di pagi hari
- Berikan pupuk organik setiap 2 minggu
- Pastikan drainase baik

3. Pantangan:
- Hindari penyiraman berlebihan
- Jangan gunakan pestisida kimia berlebihan
- Hindari pemupukan saat cuaca sangat panas

4. Estimasi Panen: Berdasarkan umur ${ageInDays} hari, diperkirakan siap panen dalam ${Math.max(0, 90 - ageInDays)} hari lagi.`;
      } else {
        aiAnalysis = await groqService.generateText({
          systemInstruction: systemPrompt,
          prompt,
          temperature: 0.4,
          maxOutputTokens: 800,
        });
      }

      const harvestEstimate = new Date(plantDate);
      harvestEstimate.setDate(harvestEstimate.getDate() + 90);

      const farmRecord = await prisma.smartFarm.create({
        data: {
          user_id: userId,
          plant_name: data.plant_name,
          plant_date: plantDate,
          location: data.location,
          weather_data: weatherData as object,
          ai_analysis: sanitizeAIOutput(aiAnalysis),
          harvest_estimate: harvestEstimate,
        },
        include: {
          user: { select: { nama: true, email: true } },
        },
      });

      logger.info(`Smart farm record created: ${farmRecord.id} using ${groqService.getModel()}`);

      return { ...farmRecord, cache_warning };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      logger.error("Error in smart farm analysis:", message);
      throw new Error("Gagal membuat analisis pertanian");
    }
  },

  async getUserFarms(userId: string) {
    return prisma.smartFarm.findMany({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
    });
  },

  async getFarmById(farmId: string, userId: string) {
    const farm = await prisma.smartFarm.findFirst({
      where: { id: farmId, user_id: userId },
    });

    if (!farm) throw new Error("Data pertanian tidak ditemukan");
    return farm;
  },

  async deleteFarmRecord(farmId: string, userId: string) {
    const farm = await prisma.smartFarm.findFirst({
      where: { id: farmId, user_id: userId },
    });

    if (!farm) throw new Error("Data pertanian tidak ditemukan");

    await prisma.smartFarm.delete({ where: { id: farmId } });

    logger.info(`Smart farm record deleted: ${farmId} by user ${userId}`);
    return { deleted: true, id: farmId };
  },

  async askFarmQuestion(
    question: string,
    userId?: string,
    ipAddress?: string,
  ) {
    const systemPrompt = `Anda adalah ahli pertanian Indonesia yang ramah dan berpengalaman.
Tugas Anda adalah menjawab pertanyaan seputar pertanian, peternakan, perikanan, dan pengelolaan lahan.
Jawab dalam Bahasa Indonesia yang mudah dipahami oleh petani desa.
Berikan saran yang praktis dan bisa langsung diterapkan.
Jika pertanyaan di luar bidang pertanian, arahkan kembali ke topik pertanian.`;

    let answer: string;

    try {
      if (!groqService.isConfigured()) {
        logger.warn("Groq API key not configured, using mock farm chat response");
        answer = `[DEMO MODE] Terima kasih atas pertanyaan Anda tentang "${question.substring(0, 50)}...".

Berdasarkan pengalaman di bidang pertanian Indonesia, berikut saran yang bisa diterapkan:
1. Pastikan tanah dalam kondisi gembur dan memiliki drainase baik
2. Gunakan pupuk organik untuk menjaga kesuburan tanah
3. Lakukan rotasi tanaman untuk mencegah hama

Untuk hasil terbaik, konsultasikan dengan penyuluh pertanian di desa Anda.`;
      } else {
        answer = await groqService.generateText({
          systemInstruction: systemPrompt,
          prompt: question,
          temperature: 0.6,
          maxOutputTokens: 700,
        });
      }

      const sanitizedAnswer = sanitizeAIOutput(answer);

      const chatRecord = await prisma.farmChat.create({
        data: {
          user_id: userId || null,
          ip_address: ipAddress || null,
          question,
          answer: sanitizedAnswer,
        },
      });

      logger.info(`Farm chat created: ${chatRecord.id} using ${groqService.getModel()}`);
      return chatRecord;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      logger.error("Error in farm chat:", message);
      throw new Error("Gagal mendapatkan jawaban dari AI pertanian");
    }
  },

  async getFarmChatHistory(userId: string) {
    return prisma.farmChat.findMany({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
      take: 50,
    });
  },
};
