import { AzureOpenAI } from "openai";
import { Redis } from '@upstash/redis';

// Forzamos a que esta ruta sea dinámica (Serverless) y no estática
export const prerender = false;

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

export const POST = async ({ request }) => {

    // 1. Validamos credenciales usando la forma de Astro: import.meta.env
    const kvUrl = import.meta.env.KV_REST_API_URL;
    const kvToken = import.meta.env.KV_REST_API_TOKEN;
    const azureEndpoint = import.meta.env.AZURE_OPENAI_ENDPOINT;
    const azureKey = import.meta.env.AZURE_OPENAI_API_KEY;
    const azureDeployment = import.meta.env.AZURE_OPENAI_DEPLOYMENT;

    if (!kvUrl || !azureKey) {
        console.error("Faltan variables de entorno");
        return new Response(JSON.stringify({ content: "Error de configuración del servidor (Credenciales)." }), { status: 500 });
    }

    const redis = new Redis({
        url: kvUrl,
        token: kvToken,
    });

    const client = new AzureOpenAI({
        endpoint: azureEndpoint,
        apiKey: azureKey,
        apiVersion: "2024-07-01-preview",
        deployment: azureDeployment
    });

    try {
        const body = await request.json();
        const { messages, mensaje } = body;

        // IP y UserID
        const forwarded = request.headers.get('x-forwarded-for');
        const ip = forwarded ? forwarded.split(',')[0] : '127.0.0.1';
        const userId = request.headers.get('x-user-id') || 'anonimo';

        // --- Rate Limiting (AJUSTADO A 24 HORAS) ---
        const WINDOW_SIZE = 86400; // 24 horas (60 * 60 * 24)
        const LIMIT_IP = 300;      // 300 preguntas por IP (para redes IPN)
        const LIMIT_USER = 50;     // 50 preguntas por Usuario (costo individual)

        // Validación por IP
        const ipKey = `ratelimit:ip:${ip}`;
        const ipCount = await redis.incr(ipKey);
        if (ipCount === 1) await redis.expire(ipKey, WINDOW_SIZE);

        if (ipCount > LIMIT_IP) {
            return new Response(JSON.stringify({ content: "⚠️ Demasiadas peticiones desde esta red. Intenta mañana." }), { status: 429 });
        }

        // Validación por Usuario
        const userKey = `ratelimit:user:${userId}`;
        const userCount = await redis.incr(userKey);
        if (userCount === 1) await redis.expire(userKey, WINDOW_SIZE);

        if (userCount > LIMIT_USER) {
            return new Response(JSON.stringify({ content: "🛑 Has alcanzado tu límite diario de preguntas." }), { status: 429 });
        }

        // --- Preparar Mensajes ---
        let mensajesParaIA = [];
        if (messages && Array.isArray(messages)) {
            mensajesParaIA = messages;
        } else if (mensaje) {
            mensajesParaIA.push({ role: "user", content: mensaje });
        }

        mensajesParaIA.unshift({ role: "system", content: SYSTEM_PROMPT });

        // --- Llamada a Azure ---
        const result = await client.chat.completions.create({
            messages: mensajesParaIA,
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
        return new Response(JSON.stringify({ content: "El sistema está descansando. Intenta más tarde." }), { status: 500 });
    }
};