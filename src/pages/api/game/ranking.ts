export const prerender = false;

import type { APIRoute } from "astro";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: import.meta.env.KV_REST_API_URL,
  token: import.meta.env.KV_REST_API_TOKEN,
});

export const GET: APIRoute = async () => {
  try {
    // 1. LLAVE CORREGIDA: Debe coincidir con el submit.ts
    // Usamos zrange (0 a 9) porque en tiempos: MENOR ES MEJOR (Ascendente).
    // Si fuera por puntos (Mayor es mejor), usaríamos zrevrange.
    const rawData = await redis.zrange("leaderboard:feb2026_Q1", 0, 9, { withScores: true }); 
    
    // 2. Transformación de datos (Upstash devuelve [user, score, user, score...])
    const formattedRanking = [];
    for (let i = 0; i < rawData.length; i += 2) {
      formattedRanking.push({
        member: rawData[i],       // Nombre (ej. "JuanRacing")
        score: Number(rawData[i + 1]) // Tiempo (ej. 0.254)
      });
    }

    // 3. Respuesta con Caché SWR (Stale-While-Revalidate)
    return new Response(JSON.stringify(formattedRanking), { 
      status: 200,
      headers: {
        // Escudo Anti-Tráfico:
        // Cacheamos 5 segundos en el Edge. Máximo 12 consultas a Redis por minuto.
        // ¡Esto hace que 10,000 usuarios consuman lo mismo que 1!
        "Cache-Control": "public, s-maxage=5, stale-while-revalidate=10",
        "Content-Type": "application/json"
      }
    });

  } catch (error) {
    console.error("Error obteniendo ranking:", error);
    return new Response(JSON.stringify([]), { status: 200 });
  }
};