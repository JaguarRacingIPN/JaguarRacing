export const prerender = false;

import type { APIRoute } from "astro";
import { AzureOpenAI } from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { redis } from "../../lib/redis";

// ============================================
// CONFIGURACIÓN
// ============================================
const CONFIG = {
  SYSTEM_PROMPT: `[ROLE]
Eres el Asistente Virtual oficial de 'Jaguar Racing', escudería de la ESIME Azcapotzalco (IPN).
OBJETIVO: Dirigir tráfico a la Lista de Espera (Agosto 2026) y captar patrocinadores mostrando autoridad técnica.
TONO: Profesional, Tecnológico, Directo y MUY BREVE.
IDIOMA: Responde en el mismo idioma del usuario (ES/EN).

[RULES - GATEKEEPER]
1. TEMAS PERMITIDOS: Reclutamiento (Lista de Espera), Áreas del proyecto, Patrocinios, Historia y Logros.
2. TEMAS SENSIBLES: Si mencionan "UNAM", "F1" o "Checo", redirige cortésmente a los logros de Jaguar Racing.
3. BLOQUEO: No haces tareas ni código. -> "Soy el asistente de Jaguar Racing. ¿Te interesa el proyecto?"
4. REGLA DE UNIÓN: Si preguntan cómo unirse, SIEMPRE aclara que el reclutamiento inicia en AGOSTO 2026. Invita a registrarse en la Lista de Espera.
5. INFORMACIÓN FALTANTE: No inventes. Di: "Escribe a nuestro correo para dudas específicas."

[KNOWLEDGE BASE - CONTACT & LOCATION]
- EMAIL: jaguarteam.ipn@gmail.com
- UBICACIÓN: Av. de las Granjas 682, Azcapotzalco, CDMX.ç
- MAPA: https://maps.app.goo.gl/fLMraKBoP9kASJbZ9

[KNOWLEDGE BASE - RECRUITMENT STATUS]
- ESTADO ACTUAL: Convocatoria cerrada. Lista de Espera abierta para Agosto 2026.
- PERFIL BUSCADO: Estudiantes IPN con iniciativa, autogestión y nociones básicas.
- LINK: https://forms.office.com/Pages/ResponsePage.aspx?id=2fRL-ZeAlEet9qVGbKKFY5aTG26BlHBMh-vtwJX9tNJUMzlLTkEzVlQ1OTVYRjlSSVBUSlBXS0VLUy4u

[KNOWLEDGE BASE - HISTORY & ACHIEVEMENTS]
- 2022: 1er Lugar GENERAL (ATV Design Challenge) y 2do Lugar en Suspensión (Baja SAE Méx).
- 2019: 1er Lugar en Presentación de Marketing (Baja SAE Méx).
- CALIDAD: Equipo con 10 Certificaciones Green Belt y finalistas constantes en Diseño y Costos.

[KNOWLEDGE BASE - COMPETITION CONTEXT]
- QUÉ HACEMOS: Diseño y manufactura de prototipos 4x4 para competencias Baja SAE.
- PRUEBAS DINÁMICAS: Endurance (4 hrs), Arrastre, Aceleración y Maniobrabilidad.
- PRUEBAS ESTÁTICAS: Diseño de Ingeniería, Costos y Business Plan.

[KNOWLEDGE BASE - TEAM STATS]
- FUERZA: +25 Ingenieros en formación (Mecánica, Robótica, Sistemas).
- DEDICACIÓN: +5,000 horas de ingeniería por prototipo.

[KNOWLEDGE BASE - PROJECT AREAS (REFERENCIA)]
(Menciona estas áreas reales para ilustrar la especialización del equipo, NO como vacantes activas hoy)
- INGENIERÍA: Suspensión, Dirección, Frenos, Chasis, Powertrain, Ergonomía, Instrumentación.
- SIMULACIÓN Y MANUFACTURA: CAE, CAM, Manufactura.
- GESTIÓN Y TI: Costos, Redes/Web, Patrocinios.

[KNOWLEDGE BASE - SPONSORSHIP]
BENEFICIOS:
1. Acceso a Talento Politécnico (+25 perfiles).
2. Visibilidad de Marca (Coche, Uniformes, Web).
3. Deducibilidad de impuestos (Donataria Autorizada).

[OUTPUT CONSTRAINTS]
- FORMATO: Texto plano. Usa guiones "-" para listas. NO uses asteriscos.
- LONGITUD: MÁXIMO 50 palabras.
- LINKS: Siempre al final, solo la URL.`,

  RATE_LIMITS: {
    IP: { max: 300, window: 86400 },
    USER: { max: 50, window: 86400 },
    BURST: { max: 5, window: 60 }
  },

  // Azure OpenAI
  MAX_TOKENS: 150,
  TEMPERATURE: 0.5,
  TIMEOUT: 20000, 
  RETRY_ATTEMPTS: 2, 
  RETRY_DELAY: 1000, 

  // Cache
  CACHE_TTL: 3600,
  CACHE_ENABLED: true,

  // Context
  MAX_CONTEXT_MESSAGES: 6,
  MAX_INPUT_LENGTH: 500
} as const;

// ============================================
// ENV VARS (Safe Load)
// ============================================
const ENV = {
  endpoint: import.meta.env.AZURE_OPENAI_ENDPOINT,
  key: import.meta.env.AZURE_OPENAI_API_KEY,
  deployment: import.meta.env.AZURE_OPENAI_DEPLOYMENT
};

// ============================================
// CLIENTE AZURE OPENAI (Safe Init)
// ============================================
// Inicializamos con valores dummy si faltan las variables para evitar crash al inicio
const azureClient = new AzureOpenAI({
  endpoint: ENV.endpoint || "https://placeholder.openai.azure.com", 
  apiKey: ENV.key || "dummy-key",
  apiVersion: "2024-08-01-preview",
  deployment: ENV.deployment || "gpt-35-turbo",
  timeout: CONFIG.TIMEOUT,
  maxRetries: 0 
});

// ============================================
// UTILIDADES
// ============================================
const Utils = {
  getClientIp(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    return forwarded?.split(',')[0]?.trim() || realIp || '127.0.0.1';
  },

  async hashMessages(messages: ChatCompletionMessageParam[]): Promise<string> {
    const str = JSON.stringify(messages);
    const encoder = new TextEncoder();
    const data = encoder.encode(str);

    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
    }

    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  },

  sanitizeInput(content: string): string {
    return content
      .trim()
      .slice(0, CONFIG.MAX_INPUT_LENGTH)
      .replace(/[<>]/g, '');
  },

  sanitizeOutput(content: string): string {
    return content
      .trim()
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/__(.+?)__/g, '$1')
      .replace(/_(.+?)_/g, '$1')
      .replace(/`(.+?)`/g, '$1')
      .replace(/<[^>]*>/g, '')
      .replace(/[ \t]{2,}/g, ' ')  
      .replace(/\n{3,}/g, '\n\n')  
      .trim();
  },

  async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  jsonResponse(data: unknown, status = 200, headers: Record<string, string> = {}) {
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": status === 200 ? "private, max-age=0" : "no-store",
        ...headers
      }
    });
  },

  errorResponse(message: string, status: number) {
    return this.jsonResponse({ content: message }, status);
  }
};

// ============================================
// TIPOS
// ============================================
interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

interface RateLimitCheckResult {
  allowed: boolean;
  reason?: string;
  retryAfter?: number;
}

interface UserMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ============================================
// RATE LIMITING
// ============================================
class RateLimiter {
  static async check(
    key: string,
    limit: number,
    windowSeconds: number
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - (windowSeconds * 1000);

    try {
      const p = redis.pipeline();
      p.zremrangebyscore(key, 0, windowStart);
      p.zadd(key, { score: now, member: `${now}` });
      p.zcard(key);
      p.expire(key, windowSeconds * 2);

      const results = (await p.exec()) as Array<[Error | null, unknown]>;
      const count = (results?.[2]?.[1] as number) || 0;

      return {
        allowed: count <= limit,
        remaining: Math.max(0, limit - count)
      };
    } catch (error) {
      console.error("Redis error:", error);
      return { allowed: true, remaining: limit };
    }
  }

  static async checkAll(ip: string, userId: string): Promise<RateLimitCheckResult> {
    const checks = await Promise.all([
      this.check(`rl:ip:${ip}`, CONFIG.RATE_LIMITS.IP.max, CONFIG.RATE_LIMITS.IP.window),
      this.check(`rl:user:${userId}`, CONFIG.RATE_LIMITS.USER.max, CONFIG.RATE_LIMITS.USER.window),
      this.check(`rl:burst:${userId}`, CONFIG.RATE_LIMITS.BURST.max, CONFIG.RATE_LIMITS.BURST.window)
    ]);

    const [ipCheck, userCheck, burstCheck] = checks;

    if (!ipCheck.allowed) {
      return {
        allowed: false,
        reason: "Límite de red excedido. Intenta mañana.",
        retryAfter: CONFIG.RATE_LIMITS.IP.window
      };
    }

    if (!burstCheck.allowed) {
      return {
        allowed: false,
        reason: "Demasiado rápido. Espera 1 minuto.",
        retryAfter: 60
      };
    }

    if (!userCheck.allowed) {
      return {
        allowed: false,
        reason: "Límite diario alcanzado (50 mensajes).",
        retryAfter: CONFIG.RATE_LIMITS.USER.window
      };
    }

    return { allowed: true };
  }
}

// ============================================
// CACHE LAYER
// ============================================
class ResponseCache {
  static async get(messagesHash: string): Promise<string | null> {
    if (!CONFIG.CACHE_ENABLED) return null;

    try {
      const cached = await redis.get(`cache:chat:${messagesHash}`) as string | null;
      return cached;
    } catch {
      return null;
    }
  }

  static async set(messagesHash: string, content: string): Promise<void> {
    if (!CONFIG.CACHE_ENABLED) return;

    try {
      await redis.setex(
        `cache:chat:${messagesHash}`,
        CONFIG.CACHE_TTL,
        content
      );
    } catch (error) {
      console.error("Cache write failed:", error);
    }
  }
}

// ============================================
// AZURE OPENAI WRAPPER (retry con backoff)
// ============================================
class AzureAI {
  static async complete(
    messages: ChatCompletionMessageParam[],
    options: { useCache?: boolean } = {}
  ): Promise<string> {
    const fullMessages: ChatCompletionMessageParam[] = [
      { role: "system", content: CONFIG.SYSTEM_PROMPT },
      ...messages
    ];

    if (options.useCache) {
      const hash = await Utils.hashMessages(fullMessages);
      const cached = await ResponseCache.get(hash);
      if (cached) {
        console.log('Cache hit:', hash);
        return cached;
      }
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= CONFIG.RETRY_ATTEMPTS; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT);

        const result = await azureClient.chat.completions.create({
          messages: fullMessages,
          model: ENV.deployment || "gpt-35-turbo", // Fallback seguro
          max_tokens: CONFIG.MAX_TOKENS,
          temperature: CONFIG.TEMPERATURE,
          stream: false
        }, {
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        const rawContent = result.choices[0]?.message?.content || "Sin respuesta.";
        const sanitizedContent = Utils.sanitizeOutput(rawContent);

        if (options.useCache) {
          const hash = await Utils.hashMessages(fullMessages);
          await ResponseCache.set(hash, sanitizedContent);
        }

        return sanitizedContent;

      } catch (error: unknown) {
        const err = error as Error & { name?: string; code?: string; status?: number };
        lastError = err;

        if (err.name === 'AbortError') {
          throw new Error("TIMEOUT");
        }

        if (err.status === 401 || err.status === 403) {
          throw new Error("AUTH_ERROR");
        }

        const isRetryable =
          err.code === 'ECONNRESET' ||
          err.code === 'ETIMEDOUT' ||
          err.status === 429 ||
          err.status === 500 ||
          err.status === 502 ||
          err.status === 503;

        if (!isRetryable || attempt === CONFIG.RETRY_ATTEMPTS) {
          throw err;
        }

        const delay = CONFIG.RETRY_DELAY * Math.pow(2, attempt);
        console.log(`Retry attempt ${attempt + 1}/${CONFIG.RETRY_ATTEMPTS} after ${delay}ms`);
        await Utils.delay(delay);
      }
    }

    throw lastError || new Error("All retries failed");
  }
}

// ============================================
// MAIN HANDLER
// ============================================
export const POST: APIRoute = async ({ request }) => {
  const ip = Utils.getClientIp(request);
  const userId = request.headers.get('x-user-id') || 'anonymous';

  try {
    // 0. CHECK DE MANTENIMIENTO (Si faltan las credenciales)
    if (!ENV.key || !ENV.endpoint || !ENV.deployment) {
      console.warn(`[CHAT] Intento de uso sin configuración .env desde ${ip}`);
      return Utils.errorResponse(
        "El chat está en configuración. Intenta más tarde.",
        503
      );
    }

    // 1. Rate Limiting
    const rateLimitResult = await RateLimiter.checkAll(ip, userId);
    if (!rateLimitResult.allowed) {
      return Utils.jsonResponse(
        {
          content: rateLimitResult.reason,
          retryAfter: rateLimitResult.retryAfter
        },
        429,
        {
          "Retry-After": String(rateLimitResult.retryAfter || 60),
          "X-RateLimit-Remaining": "0"
        }
      );
    }

    // 2. Parsear body
    const body = await request.json();
    const { messages = [], mensaje } = body;

    // 3. Construir mensajes
    let userMessages: ChatCompletionMessageParam[] = [];

    if (messages.length > 0) {
      userMessages = messages
        .slice(-CONFIG.MAX_CONTEXT_MESSAGES)
        .map((m: UserMessage) => ({
          role: m.role,
          content: Utils.sanitizeInput(m.content)
        }));
    } else if (mensaje) {
      userMessages = [{
        role: "user" as const,
        content: Utils.sanitizeInput(mensaje)
      }];
    } else {
      return Utils.errorResponse("Mensaje vacío.", 400);
    }

    // 4. Llamar a Azure OpenAI
    const content = await AzureAI.complete(userMessages, {
      useCache: CONFIG.CACHE_ENABLED
    });

    // 5. Retornar
    return Utils.jsonResponse({ content });

  } catch (error: unknown) {
    const err = error as Error & { code?: string };

    console.error("Chat API Error:", {
      message: err.message,
      userId,
      ip,
      timestamp: new Date().toISOString()
    });

    if (err.message === "TIMEOUT") {
      return Utils.errorResponse(
        "La IA está tardando mucho. Intenta con una pregunta más corta.",
        504
      );
    }

    if (err.message === "AUTH_ERROR") {
      return Utils.errorResponse(
        "Error de autenticación con el servicio de IA.",
        503
      );
    }

    if (err.code === 'insufficient_quota') {
      return Utils.errorResponse(
        "Servicio temporalmente no disponible.",
        503
      );
    }

    return Utils.errorResponse(
      "Error técnico. Intenta de nuevo en un momento.",
      500
    );
  }
};