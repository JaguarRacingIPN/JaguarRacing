// src/pages/api/game/submit.ts
export const prerender = false;
import type { APIRoute } from "astro";
import { redis } from "../../../lib/redis"; // <-- Importación modular

interface GameSubmitBody {
  nombre: string;
  email: string;
  tiempo: number;
  recordLocal?: number;
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  try {
    const body = await request.json() as GameSubmitBody;
    const { nombre, email, tiempo, recordLocal } = body;

    // --- Validaciones (Simplificadas) ---
    if (!nombre || nombre.length < 3 || nombre.length > 25 || !/^[a-zA-Z0-9 _#-]+$/.test(nombre)) {
        return new Response(JSON.stringify({ error: "Nombre inválido" }), { status: 400 });
    }
    
    // Validación Email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
         return new Response(JSON.stringify({ error: "Correo inválido" }), { status: 400 });
    }

    const tiempoNumerico = Number(tiempo);
    if (isNaN(tiempoNumerico) || tiempoNumerico < 0.01) { 
        return new Response(JSON.stringify({ error: "Tiempo sospechoso" }), { status: 400 });
    }

    // --- Lógica ---
    let mejorTiempo = tiempoNumerico;
    if (recordLocal && recordLocal > 0.050 && recordLocal < tiempoNumerico) {
        mejorTiempo = recordLocal;
    }

    const ip = clientAddress || "127.0.0.1";
    const userKey = `user:${nombre}`;

    // --- Pipeline Redis (Ya lo tenías bien, solo ajustamos la instancia) ---
    const p = redis.pipeline();

    // 1. Rate Limit IP (Anti-spam simple)
    p.setex(`game:cooldown:${ip}`, 2, "1");

    // 2. Guardar Datos Privados (CRM Lead)
    p.hset(userKey, {
        email: email,
        last_ip: ip,
        last_seen: Date.now(),
        latest_score: mejorTiempo
    });

    // 3. Lista de Emails
    p.sadd("leads:emails", email);

    // 4. Ranking
    p.zadd("leaderboard:feb2026_Q1", { score: mejorTiempo, member: nombre });

    // 5. Obtener Posición
    p.zrank("leaderboard:feb2026_Q1", nombre);

    const results = await p.exec();
    
    // results[4] es zrank
    const rankIndex = results[4] as number | null; 
    const realPosition = (rankIndex !== null) ? rankIndex + 1 : null;

    return new Response(JSON.stringify({ 
      status: "success", 
      guardado: true,
      new_rank: realPosition
    }), { status: 200 });

  } catch (error: any) {
    console.error("ERROR API GAME:", error);
    return new Response(JSON.stringify({ error: "Error interno" }), { status: 500 });
  }
};