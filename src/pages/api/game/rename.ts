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

    const currentScore = await redis.zscore("leaderboard:feb2026_v2", oldName);

    if (currentScore === null) {
      return new Response(JSON.stringify({ status: "ok", msg: "Nombre local actualizado" }), { status: 200 });
    }

    const p = redis.pipeline();

    p.zadd("leaderboard:feb2026_v2", { score: currentScore, member: newName });

    p.zrem("leaderboard:feb2026_v2", oldName);

    p.renamenx(`user:${oldName}`, `user:${newName}`);

    await p.exec();

    return new Response(JSON.stringify({ status: "success", msg: "Identidad transferida" }), { status: 200 });

  } catch (error) {
    console.error("Error rename:", error);
    return new Response(JSON.stringify({ error: "Error interno" }), { status: 500 });
  }
};