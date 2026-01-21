export const prerender = false;
import type { APIRoute } from "astro";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: import.meta.env.KV_REST_API_URL,
  token: import.meta.env.KV_REST_API_TOKEN,
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const { oldName, newName } = await request.json();

    // 1. VALIDACIONES (Idénticas a submit.ts para consistencia)
    if (!oldName || !newName) return new Response(JSON.stringify({ error: "Faltan datos" }), { status: 400 });

    const nombreRegex = /^[a-zA-Z0-9 _#-]+$/;
    
    // Validamos longitud y caracteres
    if (!nombreRegex.test(newName) || newName.length < 3 || newName.length > 25) {
        return new Response(JSON.stringify({ error: "Nombre inválido" }), { status: 400 });
    }

    // 2. VERIFICAR SI EXISTE (Usando la llave de la campaña)
    const currentScore = await redis.zscore("leaderboard:feb2026_Q1", oldName);

    if (currentScore === null) {
        // El usuario no tiene récord en el servidor todavía.
        // Respondemos OK para que el frontend actualice el nombre localmente sin dar error.
        return new Response(JSON.stringify({ status: "ok", msg: "Nombre local actualizado" }), { status: 200 });
    }

    // 3. MIGRACIÓN ATÓMICA (Pipeline)
    const p = redis.pipeline();

    // A) Copiar Récord al Nuevo Nombre
    p.zadd("leaderboard:feb2026_Q1", { score: currentScore, member: newName });
    
    // B) Borrar Récord del Viejo Nombre
    p.zrem("leaderboard:feb2026_Q1", oldName);

    // C) MIGRAR DATOS PRIVADOS (Email/IP)
    // Renombramos la llave "user:Viejo" a "user:Nuevo" para no perder el email del ganador
    // RENAMENX: "Renombrar solo si el nuevo no existe" (para evitar sobreescribir otro usuario por error)
    p.renamenx(`user:${oldName}`, `user:${newName}`);

    await p.exec();

    return new Response(JSON.stringify({ status: "success", msg: "Identidad transferida" }), { status: 200 });

  } catch (error) {
    console.error("Error rename:", error);
    return new Response(JSON.stringify({ error: "Error interno" }), { status: 500 });
  }
};