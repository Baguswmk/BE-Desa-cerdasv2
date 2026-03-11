import { logger } from "../utils/logger";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

interface GenerateTextOptions {
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

interface GeminiPart {
  text?: string;
}

interface GeminiCandidate {
  content?: {
    parts?: GeminiPart[];
  };
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
}

export const geminiService = {
  isConfigured() {
    return Boolean(GEMINI_API_KEY);
  },

  getModel() {
    return GEMINI_MODEL;
  },

  async generateText(options: GenerateTextOptions): Promise<string> {
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY belum dikonfigurasi");
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: options.systemInstruction
            ? {
                parts: [{ text: options.systemInstruction }],
              }
            : undefined,
          contents: [
            {
              role: "user",
              parts: [{ text: options.prompt }],
            },
          ],
          generationConfig: {
            temperature: options.temperature ?? 0.7,
            maxOutputTokens: options.maxOutputTokens ?? 700,
          },
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Gemini API error (${response.status}): ${errorText}`);
      throw new Error("Gemini API request failed");
    }

    const data = (await response.json()) as GeminiResponse;
    const text = data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim();

    if (!text) {
      throw new Error("Gemini API returned empty response");
    }

    return text;
  },
};
