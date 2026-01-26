// src/lib/redis.ts
import { Redis } from '@upstash/redis';

// Validamos que las variables existan para no tronar en runtime
const url = import.meta.env.KV_REST_API_URL;
const token = import.meta.env.KV_REST_API_TOKEN;

if (!url || !token) {
    throw new Error("FATAL: Faltan credenciales de Redis (KV_REST_API_URL / TOKEN)");
}

// Exportamos una instancia única (Singleton pattern implícito por módulos de ES6)
export const redis = new Redis({
    url,
    token,
});