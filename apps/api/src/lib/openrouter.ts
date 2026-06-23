const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

// OpenRouter free models — verified available June 2026 via /api/v1/models
const MODEL_BY_PLAN: Record<string, string> = {
  free:       "liquid/lfm-2.5-1.2b-instruct:free",
  starter:    "nvidia/nemotron-3-nano-30b-a3b:free",
  pro:        "google/gemma-4-26b-a4b-it:free",
  business:   "google/gemma-4-31b-it:free",
  enterprise: "meta-llama/llama-3.3-70b-instruct:free",
};

const OPENAI_MODEL_BY_PLAN: Record<string, string> = {
  free:       "gpt-4o-mini",
  starter:    "gpt-4o-mini",
  pro:        "gpt-4o",
  business:   "gpt-4o",
  enterprise: "gpt-4o",
};

// Fallback chain — verified free models, tried in order on 4xx/5xx/rate-limit
const FALLBACK_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "openai/gpt-oss-120b:free",
  "google/gemma-4-31b-it:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "google/gemma-4-26b-a4b-it:free",
  "nvidia/nemotron-3-nano-30b-a3b:free",
  "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
  "liquid/lfm-2.5-1.2b-instruct:free",
];

export function modelForPlan(plan: string): string {
  return MODEL_BY_PLAN[plan] ?? MODEL_BY_PLAN.free;
}

export function openaiModelForPlan(plan: string): string {
  return OPENAI_MODEL_BY_PLAN[plan] ?? OPENAI_MODEL_BY_PLAN.free;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

async function callOpenRouter(model: string, messages: ChatMessage[], key: string): Promise<string> {
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://clientum.ai",
      "X-Title": "Clientum",
    },
    body: JSON.stringify({ model, messages }),
  });
  if (!res.ok) throw new Error(`OpenRouter error ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  return data.choices[0]?.message?.content ?? "";
}

async function callOpenAI(model: string, messages: ChatMessage[], key: string): Promise<string> {
  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages }),
  });
  if (!res.ok) throw new Error(`OpenAI error ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  return data.choices[0]?.message?.content ?? "";
}

export async function chatCompletion(opts: {
  model: string;
  messages: ChatMessage[];
  apiKey: string;
  provider?: "openrouter" | "openai";
  openaiApiKey?: string;
  plan?: string;
}): Promise<string> {
  const provider = opts.provider ?? "openrouter";

  if (provider === "openai") {
    const key = opts.openaiApiKey || opts.apiKey;
    if (!key) throw new Error("OPENAI_API_KEY no configurado");
    const model = opts.plan ? openaiModelForPlan(opts.plan) : "gpt-4o-mini";
    return await callOpenAI(model, opts.messages, key);
  }

  const key = opts.apiKey || process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY no configurado");

  // Build the full list of models to try: primary first, then all fallbacks
  const toTry = [opts.model, ...FALLBACK_MODELS.filter((m) => m !== opts.model)];

  let lastError: Error | null = null;
  for (const model of toTry) {
    try {
      const result = await callOpenRouter(model, opts.messages, key);
      if (result) return result;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // Continue on rate limit, model unavailable (404), provider error, or server-side errors (5xx)
      const isRetryable = /404|429|5\d\d|Provider returned error|overloaded|rate.?limit|unavailable/i.test(lastError.message);
      if (!isRetryable) throw lastError;
    }
  }

  throw lastError ?? new Error("Todos los modelos de IA están temporalmente ocupados. Intentá de nuevo en unos segundos.");
}

const WA_RETRY_DELAYS_MS = [1_000, 2_000]; // 3 intentos: inmediato → +1s → +2s

export async function sendWhatsAppTyping(opts: {
  evolutionApiUrl: string;
  evolutionApiKey: string;
  instance: string;
  to: string;
  durationMs?: number;
}): Promise<void> {
  try {
    const baseUrl = opts.evolutionApiUrl.replace(/\/$/, "");
    const headers = { apikey: opts.evolutionApiKey, "Content-Type": "application/json" };
    const durationMs = opts.durationMs ?? 3000;

    await fetch(`${baseUrl}/message/sendPresence/${opts.instance}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ number: opts.to, presence: "composing", delay: durationMs }),
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    // Non-fatal: typing indicator is best-effort
  }
}

export async function sendWhatsAppReply(opts: {
  evolutionApiUrl: string;
  evolutionApiKey: string;
  instance: string;
  to: string;
  text: string;
}): Promise<void> {
  const url = `${opts.evolutionApiUrl.replace(/\/$/, "")}/message/sendText/${opts.instance}`;
  const body = JSON.stringify({ number: opts.to, text: opts.text });
  const headers = { apikey: opts.evolutionApiKey, "Content-Type": "application/json" };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= WA_RETRY_DELAYS_MS.length; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, WA_RETRY_DELAYS_MS[attempt - 1]));
    }
    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body,
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) return;
      const resBody = await res.text().catch(() => "");
      const err = new Error(`Evolution API error ${res.status}: ${resBody}`);
      // 4xx = configuración incorrecta, no tiene sentido reintentar
      if (res.status >= 400 && res.status < 500) throw err;
      lastError = err;
    } catch (err) {
      if (err instanceof Error && /4\d\d/.test(err.message)) throw err;
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError ?? new Error("Evolution API no respondió después de 3 intentos");
}
