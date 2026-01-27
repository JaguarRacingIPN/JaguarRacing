// src/lib/redis.ts
import { Redis } from "@upstash/redis";

if (!import.meta.env.KV_REST_API_URL || !import.meta.env.KV_REST_API_TOKEN) {
  throw new Error("FALTAN VARIABLES DE ENTORNO DE UPSTASH (KV_REST_API_...)");
}

export const redis = new Redis({
  url: import.meta.env.KV_REST_API_URL,
  token: import.meta.env.KV_REST_API_TOKEN,
});