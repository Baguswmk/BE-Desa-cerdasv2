import axios from "axios";
import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger";

const prisma = new PrismaClient();
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const OPENWEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5";
const CACHE_DURATION_HOURS = 24;

export interface WeatherData {
  temperature: number;
  humidity: number;
  description: string;
  rainfall: number;
  wind_speed: number;
}

const FALLBACK_WEATHER: WeatherData = {
  temperature: 28,
  humidity: 75,
  description: "Data cuaca tidak tersedia",
  rainfall: 0,
  wind_speed: 5,
};

export const weatherService = {
  async getWeatherByLocation(
    location: string,
  ): Promise<WeatherData & { from_cache?: boolean; cache_warning?: string }> {
    const locationKey = location.toLowerCase().trim();

    const cached = await this.getCachedWeather(locationKey);
    if (cached) {
      logger.info(`Weather cache HIT for: ${location}`);
      return { ...cached, from_cache: true };
    }

    logger.info(`Weather cache MISS for: ${location}, fetching from API...`);

    if (!OPENWEATHER_API_KEY) {
      logger.warn("OpenWeather API key not configured, using mock data");
      const mockData: WeatherData = {
        temperature: 28,
        humidity: 75,
        description: "Partly cloudy (mock)",
        rainfall: 0,
        wind_speed: 5,
      };
      await this.saveToCache(locationKey, mockData);
      return mockData;
    }

    try {
      const geoResponse = await axios.get(`${OPENWEATHER_BASE_URL}/weather`, {
        params: {
          q: location,
          appid: OPENWEATHER_API_KEY,
          units: "metric",
          lang: "id",
        },
        timeout: 5000,
      });

      const data = geoResponse.data;
      const weatherData: WeatherData = {
        temperature: Math.round(data.main.temp),
        humidity: data.main.humidity,
        description: data.weather[0].description,
        rainfall: data.rain?.["1h"] ?? 0,
        wind_speed: data.wind.speed,
      };

      await this.saveToCache(locationKey, weatherData);
      logger.info(`Weather data fetched and cached for: ${location}`);

      return weatherData;
    } catch (apiError: any) {
      logger.error("OpenWeather API error:", apiError.message);

      const staleCache = await this.getStaleCache(locationKey);
      if (staleCache) {
        logger.warn(`Using stale cache for: ${location}`);
        return {
          ...staleCache,
          from_cache: true,
          cache_warning:
            "Data cuaca menggunakan cache lama karena API tidak tersedia saat ini.",
        };
      }

      logger.warn(`No cache available, using fallback for: ${location}`);
      return {
        ...FALLBACK_WEATHER,
        cache_warning: "Data cuaca tidak tersedia. Menggunakan data default.",
      };
    }
  },

  async getCachedWeather(locationKey: string): Promise<WeatherData | null> {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - CACHE_DURATION_HOURS);

    const cache = await prisma.weatherCache.findFirst({
      where: {
        location: locationKey,
        cached_at: { gte: cutoff },
      },
      orderBy: { cached_at: "desc" },
    });

    if (!cache) return null;

    return cache.data as unknown as WeatherData;
  },

  async getStaleCache(locationKey: string): Promise<WeatherData | null> {
    const cache = await prisma.weatherCache.findFirst({
      where: { location: locationKey },
      orderBy: { cached_at: "desc" },
    });

    if (!cache) return null;
    return cache.data as unknown as WeatherData;
  },

  async saveToCache(locationKey: string, data: WeatherData): Promise<void> {
    await prisma.weatherCache.upsert({
      where: { location: locationKey },
      update: {
        data: data as any,
        cached_at: new Date(),
      },
      create: {
        location: locationKey,
        data: data as any,
        cached_at: new Date(),
      },
    });
  },
};
