export const prerender = false;
import type { APIRoute } from "astro";
import { redis } from "../../../lib/redis";

interface GameSubmitBody {
  nombre: string;
  tiempo: number;
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  try {
    const body = await request.json() as GameSubmitBody;
    const { nombre, tiempo } = body;

    // --- 1. Validaciones ---
    if (!nombre || nombre.length < 3 || !/^[a-zA-Z0-9 _#-]+$/.test(nombre)) {
        return new Response(JSON.stringify({ error: "Nombre inválido" }), { status: 400 });
    }
    
    const tiempoNumerico = Number(tiempo);
    if (isNaN(tiempoNumerico) || tiempoNumerico < 0.08) { 
        return new Response(JSON.stringify({ error: "Error de integridad" }), { status: 400 });
    }

    const ip = clientAddress || "127.0.0.1";
    const userKey = `user:${nombre}`;

    // --- 2. Ejecución Secuencial (Safe Mode) ---
    
    // A) Rate Limit
    await redis.setex(`game:cooldown:${ip}`, 2, "1");

    // B) Metadatos
    await redis.hset(userKey, {
        last_ip: ip,
        last_seen: Date.now(),
        last_attempt: tiempoNumerico
    });

    // C) Guardar Score
    await redis.zadd("leaderboard:feb2026_v4", { 
        lt: true 
    }, { 
        score: tiempoNumerico, 
        member: nombre 
    });

    // D) Obtener Posición
    const rankIndex = await redis.zrank("leaderboard:feb2026_v4", nombre);
    
    const realPosition = (rankIndex !== null) ? rankIndex + 1 : null;

    console.log(`Récord procesado: ${nombre} -> Rank #${realPosition}`);

    return new Response(JSON.stringify({ 
      status: "success", 
      new_rank: realPosition 
    }), { status: 200 });

  } catch (error: any) {
    console.error("ERROR API SUBMIT:", error); 
    return new Response(JSON.stringify({ error: "Error interno", details: error.message }), { status: 500 });
  }
};