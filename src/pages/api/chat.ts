// src/pages/api/chat.ts
export const prerender = false;
import type { APIRoute } from "astro";
import { AzureOpenAI } from "openai";
import { redis } from "../../lib/redis"; // <-- Importación modular

// --- CONFIGURACIÓN ---
const SYSTEM_PROMPT = `[ROLE] Eres el Asistente Virtual oficial de 'Jaguar Racing', escudería de la ESIME Azcapotzalco (IPN).
Tu objetivo es reclutar miembros y atraer patrocinadores.
TONO: Profesional, Tecnológico, "Orgullo Politécnico".
IDIOMA: Detecta el idioma del usuario (ES/EN) y responde en el mismo.

[RULES - GATEKEEPER]
1. TEMAS PERMITIDOS: Reclutamiento, requisitos, áreas técnicas, patrocinio, historia del equipo, ubicación.
2. TEMAS SENSIBLES: Si mencionan "UNAM", "F1" o "Checo Pérez", responde cortésmente pero redirige INMEDIATAMENTE a Jaguar Racing.
3. BLOQUEO: Si piden tareas, código ajeno o insultan -> "Soy un asistente exclusivo de Jaguar Racing. ¿Te interesa unirte?"

[KNOWLEDGE BASE - RECRUITMENT]:Link de Registro: https://jaguar-racing.vercel.app/join
A. REQUISITOS GENERALES (OBLIGATORIOS):
- Ser estudiante activo del IPN (Cualquier escuela).
- Tener máximo 1 materia reprobada/dictamen.
- Inglés básico, compromiso y disponibilidad de tiempo.
- Menciona el nombre de las 5 areas con "-".

B. PERFILES POR ÁREA:
1. CHASIS: Requiere mecánica, propiedades de materiales y CAD (SolidWorks).
2. FRENOS: Requiere física, transferencia de calor, mecánica de materiales y CAD.
3. DIRECCIÓN: Requiere sistemas de dirección automotriz, Excel (Macros/Datos) y CAD.
4. INSTRUMENTACIÓN: Requiere programación de microcontroladores, diseño de PCBs y manejo de datos.
5. REDES: Requiere HTML/CSS, Animación 3D, Vectores (Illustrator/Corel) y facilidad de palabra.

[KNOWLEDGE BASE - GENERAL]
- IDENTIDAD: Diseñamos y manufacturamos prototipos para competencias SAE (Baja y Formula).
[MAPS]: https://maps.app.goo.gl/x5cyKqTVajGd2GpPA
- UBICACIÓN: ESIME Unidad Azcapotzalco, CDMX.
- PATROCINIOS: Somos Donataria Autorizada (damos recibos deducibles).

[OUTPUT CONSTRAINTS]
- Respuesta MÁXIMA: 60 palabras.
- Estilo: Usa listas con guiones "-". Sé directo.
- Links: Cualquier link va al final del texto sin parentesis ni puntos, no hagas mas texto abajo del link`;

const azureEndpoint = import.meta.env.AZURE_OPENAI_ENDPOINT;
const azureKey = import.meta.env.AZURE_OPENAI_API_KEY;
const azureDeployment = import.meta.env.AZURE_OPENAI_DEPLOYMENT;

// Instancia de OpenAI (se crea en cada request por ser serverless, es ligero)
const client = new AzureOpenAI({
    endpoint: azureEndpoint,
    apiKey: azureKey,
    apiVersion: "2024-07-01-preview",
    deployment: azureDeployment
});

export const POST: APIRoute = async ({ request }) => {
    if (!azureKey) {
        return new Response(JSON.stringify({ content: "Error de configuración interna." }), { status: 500 });
    }

    try {
        const body = await request.json();
        const { messages, mensaje } = body;

        // --- Rate Limiting (Redis Modular) ---
        const forwarded = request.headers.get('x-forwarded-for');
        const ip = forwarded ? forwarded.split(',')[0] : '127.0.0.1';
        const userId = request.headers.get('x-user-id') || 'anonimo';
        
        const ipKey = `ratelimit:chat:ip:${ip}`;
        const userKey = `ratelimit:chat:user:${userId}`;

        // Usamos Pipeline para hacer 2 consultas a Redis en 1 viaje (Optimización)
        const p = redis.pipeline();
        p.incr(ipKey);
        p.expire(ipKey, 86400); // 24h
        p.incr(userKey);
        p.expire(userKey, 86400); // 24h
        
        const results = await p.exec();
        // results[0] es incr IP, results[2] es incr User
        const ipCount = results[0] as number;
        const userCount = results[2] as number;

        if (ipCount > 300) return new Response(JSON.stringify({ content: "⚠️ Límite de red excedido." }), { status: 429 });
        if (userCount > 50) return new Response(JSON.stringify({ content: "🛑 Límite diario alcanzado." }), { status: 429 });

        // --- Lógica IA ---
        let mensajesParaIA = [{ role: "system", content: SYSTEM_PROMPT }];
        
        if (messages?.length) {
            mensajesParaIA = [...mensajesParaIA, ...messages];
        } else if (mensaje) {
            mensajesParaIA.push({ role: "user", content: mensaje });
        }

        const result = await client.chat.completions.create({
            messages: mensajesParaIA as any, // Cast simple
            model: azureDeployment,
            max_tokens: 150,
            temperature: 0.5,
        });

        return new Response(JSON.stringify({ content: result.choices[0].message.content }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error("❌ Error API Chat:", error);
        return new Response(JSON.stringify({ content: "El sistema está descansando." }), { status: 500 });
    }
};