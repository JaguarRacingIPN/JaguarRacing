export const prerender = false;
import type { APIRoute } from "astro";
import { redis } from "../../../lib/redis";

export const POST: APIRoute = async ({ request }) => {
  try {
    const { oldName, newName } = await request.json();

    if (!oldName || !newName) return new Response(JSON.stringify({ error: "Faltan datos" }), { status: 400 });

    const nombreRegex = /^[a-zA-Z0-9 _#-]+$/;

    if (!nombreRegex.test(newName) || newName.length < 3 || newName.length > 25) {
      return new Response(JSON.stringify({ error: "Nombre inválido" }), { status: 400 });
    }

    // Check if user metadata exists
    const userExists = await redis.exists(`user:${oldName}`);
    if (!userExists) {
      return new Response(JSON.stringify({ error: "Usuario no encontrado" }), { status: 404 });
    }

    // Check if new name is already taken
    const newNameExists = await redis.exists(`user:${newName}`);
    if (newNameExists) {
      return new Response(JSON.stringify({ error: "Nombre ya existe" }), { status: 409 });
    }

    // Always migrate metadata first (regardless of score)
    const renamed = await redis.renamenx(`user:${oldName}`, `user:${newName}`);
    if (renamed === 0) {
      return new Response(JSON.stringify({ error: "No se pudo renombrar" }), { status: 500 });
    }

    // Only update sorted set if user has a score
    const currentScore = await redis.zscore("leaderboard:feb2026_v5", oldName);

    if (currentScore !== null) {
      const p = redis.pipeline();
      p.zadd("leaderboard:feb2026_v5", { score: currentScore, member: newName });
      p.zrem("leaderboard:feb2026_v5", oldName);
      await p.exec();
    }

    return new Response(JSON.stringify({ status: "success", msg: "Identidad transferida" }), { status: 200 });

  } catch (error) {
    console.error("Error rename:", error);
    return new Response(JSON.stringify({ error: "Error interno" }), { status: 500 });
  }
};