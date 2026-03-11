import { Groq } from "groq-sdk";
import { logger } from "../utils/logger";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || "llama3-70b-8192";

let groqClient: Groq | null = null;
if (GROQ_API_KEY) {
  groqClient = new Groq({ apiKey: GROQ_API_KEY });
}

interface GenerateTextOptions {
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export const groqService = {
  isConfigured() {
    return Boolean(groqClient);
  },

  getModel() {
    return GROQ_MODEL;
  },

  async generateText(options: GenerateTextOptions): Promise<string> {
    if (!groqClient) {
      throw new Error("GROQ_API_KEY belum dikonfigurasi");
    }

    try {
      let messages: any[] = [];
      
      // Groq uses system role for instructions
      if (options.systemInstruction) {
        messages.push({
          role: "system",
          content: options.systemInstruction,
        });
      }
      
      messages.push({
        role: "user",
        content: options.prompt,
      });

      const completion = await groqClient.chat.completions.create({
        messages,
        model: GROQ_MODEL,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxOutputTokens ?? 700,
      });

      const text = completion.choices[0]?.message?.content?.trim();

      if (!text) {
        throw new Error("Groq API returned empty response");
      }

      return text;
    } catch (error: any) {
      logger.error(`Groq API error: ${error.message}`);
      throw new Error("Groq API request failed");
    }
  },
};
