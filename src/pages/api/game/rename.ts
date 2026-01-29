export const prerender = false;
import type { APIRoute } from "astro";
import { redis } from "../../../lib/redis"; // Usamos la misma instancia que en submit

export const POST: APIRoute = async ({ request }) => {
  try {
    const { oldName, newName } = await request.json();

    // 1. Validaciones Básicas
    if (!oldName || !newName) return new Response(JSON.stringify({ error: "Faltan datos" }), { status: 400 });

    // Misma regex que en submit.ts para consistencia
    const nombreRegex = /^[a-zA-Z0-9 _#-]+$/;
    
    if (!nombreRegex.test(newName) || newName.length < 3 || newName.length > 25) {
        return new Response(JSON.stringify({ error: "Nombre inválido" }), { status: 400 });
    }

    // 2. Verificar si el usuario realmente tiene un récord
    const currentScore = await redis.zscore("leaderboard:feb2026_v2", oldName);

    if (currentScore === null) {
        // Si no tiene récord en el server, le decimos que todo OK para que 
        // actualice su localStorage y sea feliz. No gastamos recursos de Redis.
        return new Response(JSON.stringify({ status: "ok", msg: "Nombre local actualizado" }), { status: 200 });
    }

    // 3. Migración Atómica
    const p = redis.pipeline();

    // A) Crear la entrada nueva con el mismo puntaje
    p.zadd("leaderboard:feb2026_v2", { score: currentScore, member: newName });
    
    // B) Borrar la entrada vieja
    p.zrem("leaderboard:feb2026_v2", oldName);

    // C) Migrar metadatos técnicos (IP, Last Seen)
    // Usamos RENAMENX para mover el hash "user:old" a "user:new".
    // Si "user:old" no existe (raro, pero posible), esto no fallará el pipeline, solo retornará 0.
    p.renamenx(`user:${oldName}`, `user:${newName}`);

    await p.exec();

    return new Response(JSON.stringify({ status: "success", msg: "Identidad transferida" }), { status: 200 });

  } catch (error) {
    // Error silencioso en producción
    console.error("Error rename:", error);
    return new Response(JSON.stringify({ error: "Error interno" }), { status: 500 });
  }
};