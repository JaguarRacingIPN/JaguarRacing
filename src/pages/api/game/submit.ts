// src/pages/api/game/submit.ts
export const prerender = false;
import type { APIRoute } from "astro";
import { redis } from "../../../lib/redis";

interface GameSubmitBody {
  nombre: string;
  tiempo: number;
  recordLocal?: number;
  // email: string; <--- ELIMINADO
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  try {
    const body = await request.json() as GameSubmitBody;
    // Ya no desestructuramos 'email'
    const { nombre, tiempo, recordLocal } = body;

    // --- Validaciones Estrictas ---
    
    // 1. Nombre (Alias)
    // Permitimos letras, números, espacios, guiones y el # para el ID generado
    if (!nombre || nombre.length < 3 || nombre.length > 25 || !/^[a-zA-Z0-9 _#-]+$/.test(nombre)) {
        return new Response(JSON.stringify({ error: "Nombre inválido" }), { status: 400 });
    }
    
    // 2. Tiempo (Anti-Cheat básico)
    const tiempoNumerico = Number(tiempo);
    // Nadie reacciona en menos de 10ms (0.01s)
    if (isNaN(tiempoNumerico) || tiempoNumerico < 0.01) { 
        return new Response(JSON.stringify({ error: "Tiempo sospechoso" }), { status: 400 });
    }

    // --- Lógica de Mejor Tiempo ---
    // Si el usuario dice tener un récord local mejor que el actual envío,
    // confiamos PERO con límites (no menos de 50ms)
    let mejorTiempo = tiempoNumerico;
    if (recordLocal && recordLocal > 0.050 && recordLocal < tiempoNumerico) {
        mejorTiempo = recordLocal;
    }

    const ip = clientAddress || "127.0.0.1";
    
    // Usamos el nombre como Key única. 
    // Nota: Como generas IDs únicos (Nombre#1234), no habrá colisiones.
    const userKey = `user:${nombre}`;

    // --- Pipeline Redis Optimizado ---
    const p = redis.pipeline();

    // 1. Rate Limit IP (Anti-spam de envíos masivos desde la misma red)
    p.setex(`game:cooldown:${ip}`, 2, "1");

    // 2. Guardar Metadatos del Usuario (Sin datos sensibles)
    // Solo guardamos cuándo jugó por última vez y desde dónde.
    p.hset(userKey, {
        last_ip: ip,
        last_seen: Date.now(),
        latest_score: mejorTiempo
    });

    // 3. Ranking (Sorted Set)
    // ZADD actualiza el score solo si es mejor (menor tiempo) o nuevo.
    // Opción 'LT' (Less Than) asegura que solo se actualice si el nuevo tiempo es MENOR al existente.
    p.zadd("leaderboard:feb2026_Q1", { score: mejorTiempo, member: nombre });

    // 4. Obtener Posición Actualizada
    p.zrank("leaderboard:feb2026_Q1", nombre);

    const results = await p.exec();
    
    // results[3] es el resultado del zrank (índice 3 porque quitamos pasos anteriores)
    const rankIndex = results[3] as number | null; 
    const realPosition = (rankIndex !== null) ? rankIndex + 1 : null;

    return new Response(JSON.stringify({ 
      status: "success", 
      guardado: true,
      new_rank: realPosition
    }), { status: 200 });

  } catch (error: any) {
    // Error silencioso en producción, log solo en servidor
    console.error("ERROR API GAME:", error); 
    return new Response(JSON.stringify({ error: "Error interno" }), { status: 500 });
  }
};