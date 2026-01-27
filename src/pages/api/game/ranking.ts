// src/pages/api/game/ranking.ts
export const prerender = false;
import type { APIRoute } from "astro";
import { redis } from "../../../lib/redis";

export const GET: APIRoute = async () => {
  try {
    // Obtenemos el TOP 10 (0 a 9)
    // withScores: true nos da [nombre, tiempo, nombre, tiempo...]
    const rawData = await redis.zrange("leaderboard:feb2026_Q1", 0, 9, { withScores: true }); 
    
    const formattedRanking = [];
    for (let i = 0; i < rawData.length; i += 2) {
      formattedRanking.push({
        // Limpiamos el ID visualmente (quitamos lo que sigue del # si quieres, o lo dejamos para unicidad)
        // Por ahora lo dejamos limpio para la tabla:
        member: String(rawData[i]).split('#')[0], 
        score: Number(rawData[i + 1])
      });
    }

    return new Response(JSON.stringify(formattedRanking), { 
      status: 200,
      headers: {
        // Cache agresivo en Edge (5 seg) + SWR (10 seg)
        "Cache-Control": "public, s-maxage=5, stale-while-revalidate=10",
        "Content-Type": "application/json"
      }
    });

  } catch (error) {
    console.error("Ranking Error:", error);
    return new Response(JSON.stringify([]), { status: 200 });
  }
};