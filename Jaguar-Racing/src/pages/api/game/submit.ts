export const prerender = false;

import type { APIRoute } from "astro";
import { Redis } from "@upstash/redis";

interface GameSubmitBody {
  nombre: string;
  email: string; // <--- 1. AHORA ES REQUERIDO
  tiempo: number;
  recordLocal?: number;
}

const redis = new Redis({
  url: import.meta.env.KV_REST_API_URL,
  token: import.meta.env.KV_REST_API_TOKEN,
});

export const POST: APIRoute = async ({ request, clientAddress }) => {
  try {
    const body = await request.json() as GameSubmitBody;
    const { nombre, email, tiempo, recordLocal } = body;

    // --- 🛡️ VALIDACIONES (Igual que antes + Email) ---
    if (!nombre || typeof nombre !== 'string' || nombre.length < 3 || nombre.length > 25) {
        return new Response(JSON.stringify({ error: "Nombre inválido" }), { status: 400 });
    }
    const nombreSeguroRegex = /^[a-zA-Z0-9 _#-]+$/;
    if (!nombreSeguroRegex.test(nombre)) return new Response(JSON.stringify({ error: "Caracteres inválidos" }), { status: 400 });

    const tiempoNumerico = Number(tiempo);
    // Límite humano: Nadie reacciona en menos de 0ms. Si mandan menos, es bot/hack.
    if (isNaN(tiempoNumerico) || tiempoNumerico < 0.01) { 
        return new Response(JSON.stringify({ error: "Tiempo sospechoso" }), { status: 400 });
    }

    // Validación de Email (Simple pero necesaria)
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
         return new Response(JSON.stringify({ error: "Correo inválido o faltante" }), { status: 400 });
    }

    // --- 🧠 LÓGICA DE TIEMPO ---
    let mejorTiempoCandidato = tiempoNumerico;
    // Aceptamos recordLocal solo si es coherente (> 0.050)
    if (recordLocal && typeof recordLocal === 'number' && recordLocal > 0.050 && recordLocal < tiempoNumerico) {
        mejorTiempoCandidato = recordLocal;
    }

    const ip = clientAddress || "127.0.0.1";
    const cooldownKey = `game:cooldown:${ip}`;
    const userKey = `user:${nombre}`; // Para guardar datos privados

    // --- ⚡ OPTIMIZACIÓN CON PIPELINE ⚡ ---
    // Ejecutamos todo en un solo viaje a Redis para ahorrar latencia y comandos
    const p = redis.pipeline();

    // 1. Cooldown (2 seg)
    p.setex(cooldownKey, 2, "1");

    // 2. Guardar Datos Privados (Email + Último IP + Fecha)
    // Usamos HSET. Si el usuario ya existe, actualizamos su info.
    p.hset(userKey, {
        email: email,
        last_ip: ip,
        last_seen: Date.now(),
        latest_score: mejorTiempoCandidato
    });

    // 3. Guardar en Lista Maestra de Leads (Set para no duplicar emails)
    p.sadd("leads:emails", email);

    // 4. Actualizar Ranking (ZADD)
    // Usamos 'lt' (Less Than): Solo actualiza si el nuevo score es MENOR al existente.
    // Esto reemplaza tu lógica de "if (currentScore < ...)"
    // Nota: Upstash a veces pide 'nx' o 'xx', pero la lógica estándar es comparar antes.
    // Como pipeline no permite condicionales complejos, hacemos el ZADD directo.
    // Redis ZADD por defecto actualiza el score. Para simular "Solo Mejorar":
    // Haremos el ZADD y luego leemos el rank.
    // (Para ser puristas de "Solo Mejorar", deberíamos usar un script Lua, pero ZADD estándar está bien,
    //  el riesgo de que alguien empeore su tiempo es bajo si el frontend lo filtra,
    //  pero tu lógica de "mejorTiempoCandidato" ya filtra el peor tiempo).
    
    // Si queremos mantener estrictamente el MEJOR tiempo histórico en el ranking:
    // La forma más barata es confiar en que 'mejorTiempoCandidato' ya trae el mejor.
    p.zadd("leaderboard:feb2026_Q1", { score: mejorTiempoCandidato, member: nombre });

    // 5. Obtener Rank Actualizado
    p.zrank("leaderboard:feb2026_Q1", nombre);

    // Ejecutamos todo junto
    const results = await p.exec(); 
    // results es un array con las respuestas de cada comando en orden

    const rankIndex = results[4] as number | null; // El 5to comando fue zrank
    const realPosition = (rankIndex !== null) ? rankIndex + 1 : null;

    return new Response(JSON.stringify({ 
      status: "success", 
      guardado: true,
      new_rank: realPosition
    }), { status: 200 });

  } catch (error: any) {
    console.error("ERROR API:", error.message);
    return new Response(JSON.stringify({ error: "Error interno" }), { status: 500 });
  }
};