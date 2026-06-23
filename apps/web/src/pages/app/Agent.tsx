import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

/* ─── Types ─────────────────────────────────────────────── */
interface ChatbotConfig {
  id?: string;
  evolutionApiUrl?: string;
  evolutionApiKey?: string;
  evolutionInstance?: string;
  systemPrompt?: string;
  active?: boolean;
  openaiApiKey?: string;
  apiProvider?: "openrouter" | "openai";
  openrouterApiKey?: string;
  openrouterModel?: string;
  agentMode?: string;
  maxHistory?: number;
  widgetName?: string;
  widgetColor?: string;
  widgetWelcome?: string;
  widgetToken?: string;
  guardrailsJson?: string;
  businessHoursJson?: string;
  weeklyReportEnabled?: boolean;
  weeklyReportPhone?: string;
}

interface ConfigResponse {
  config: ChatbotConfig | null;
  suggestedModel: string;
  plan: string;
}

interface ChatbotStatus {
  configured: boolean;
  active: boolean;
  knowledgeCount: number;
  conversationCount: number;
  plan: string;
  monthlyMessages: number;
  monthlyLimit: number | null;
}

interface BusinessHours {
  enabled: boolean;
  timezone: string;
  schedule: Record<string, { open: string; close: string; active: boolean }>;
  outsideHoursMessage: string;
}

interface GuardrailsConfig {
  promptInjectionShield: boolean;
  piiRedaction: boolean;
  contentFilter: boolean;
  ragHallucinationThreshold: boolean;
  bannedWords: string;
}

interface Conversation {
  id: string;
  phoneNumber: string | null;
  channel: string | null;
  lastMessageAt: string | null;
  handoffMode: boolean | null;
  leadStatus: string | null;
  leadName: string | null;
  leadNotes: string | null;
}

interface Message {
  id: string;
  role: string;
  content: string;
  createdAt: string | null;
}

interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  createdAt: string | null;
}

/* ─── Constants ─────────────────────────────────────────── */
const DAYS = [
  { key: "mon", label: "Lunes" },
  { key: "tue", label: "Martes" },
  { key: "wed", label: "Miércoles" },
  { key: "thu", label: "Jueves" },
  { key: "fri", label: "Viernes" },
  { key: "sat", label: "Sábado" },
  { key: "sun", label: "Domingo" },
];

const DEFAULT_BH: BusinessHours = {
  enabled: false,
  timezone: "America/Argentina/Buenos_Aires",
  schedule: {
    mon: { open: "09:00", close: "18:00", active: true },
    tue: { open: "09:00", close: "18:00", active: true },
    wed: { open: "09:00", close: "18:00", active: true },
    thu: { open: "09:00", close: "18:00", active: true },
    fri: { open: "09:00", close: "18:00", active: true },
    sat: { open: "10:00", close: "14:00", active: false },
    sun: { open: "10:00", close: "14:00", active: false },
  },
  outsideHoursMessage:
    "¡Hola! Nuestro horario de atención es de lunes a viernes de 9 a 18hs. Te respondemos a la brevedad. 🙏",
};

const DEFAULT_GR: GuardrailsConfig = {
  promptInjectionShield: true,
  piiRedaction: false,
  contentFilter: true,
  ragHallucinationThreshold: true,
  bannedWords: "",
};

const MODEL_LABELS: Record<string, string> = {
  "liquid/lfm-2.5-1.2b-instruct:free": "LFM 2.5 1.2B — Plan Free",
  "nvidia/nemotron-3-nano-30b-a3b:free": "Nemotron 30B — Plan Starter",
  "google/gemma-4-31b-it:free": "Gemma 4 31B — Plan Pro",
  "z-ai/glm-4.5-air:free": "GLM 4.5 Air — Plan Business",
  "meta-llama/llama-3.3-70b-instruct:free": "Llama 3.3 70B — Plan Enterprise",
};

const TEMPLATES: { icon: string; label: string; desc: string; mode: string; widgetName: string; widgetWelcome: string; prompt: string }[] = [
  {
    icon: "🎧", label: "Atención al cliente", desc: "Soporte 24/7 · FAQ automático",
    mode: "support", widgetName: "Asistente", widgetWelcome: "¡Hola! ¿En qué te puedo ayudar hoy? 👋",
    prompt: "Sos un asistente de atención al cliente amable y profesional. Respondé siempre en español argentino, de forma clara y concisa. Si no sabés algo, decíselo al usuario y ofrecé alternativas de contacto.",
  },
  {
    icon: "💼", label: "Vendedor consultivo", desc: "Calificación de leads · Cierre",
    mode: "sales", widgetName: "Asesor Comercial", widgetWelcome: "¡Buen día! Soy tu asesor virtual. ¿Qué solución estás buscando? 🚀",
    prompt: "Sos un agente de ventas consultivo y empático. Tu objetivo es entender las necesidades del cliente, mostrar el valor del producto y guiarlo hacia la compra. Hacé preguntas abiertas, escuchá activamente y respondé en español argentino.",
  },
  {
    icon: "🍕", label: "Toma de pedidos", desc: "Delivery · Menú automático",
    mode: "support", widgetName: "Pedidos Online", widgetWelcome: "¡Hola! Bienvenido/a. ¿Querés ver el menú o hacer un pedido? 😊",
    prompt: "Sos un asistente para tomar pedidos de delivery. Saludá al cliente, mostrá el menú si te lo piden, tomá el pedido con detalle, confirmá la dirección de entrega y el total. Respondé siempre en español rioplatense.",
  },
  {
    icon: "🏥", label: "Turnos médicos", desc: "Consultorio · Gestión de turnos",
    mode: "support", widgetName: "Recepción Virtual", widgetWelcome: "Hola, bienvenido/a. ¿Querés consultar o solicitar un turno? Te ayudo 😊",
    prompt: "Sos un asistente administrativo de un consultorio médico. Ayudá a los pacientes a consultar disponibilidad de turnos, solicitar turnos y obtener información del consultorio. Sé amable y empático. Respondé en español argentino.",
  },
  {
    icon: "🏠", label: "Inmobiliaria", desc: "Captación · Visitas · Propiedades",
    mode: "lead_capture", widgetName: "Asesor Inmobiliario", widgetWelcome: "¡Hola! Soy tu asesor virtual de propiedades. ¿Buscás comprar, alquilar o vender? 🏡",
    prompt: "Sos un asistente de una inmobiliaria. Ayudá a los clientes a encontrar propiedades según sus necesidades, informá sobre precios y características. Invitá a los interesados a agendar una visita. Respondé en español argentino.",
  },
  {
    icon: "💪", label: "Gimnasio / Fitness", desc: "Membresías · Clases · Agenda",
    mode: "sales", widgetName: "Fitness Assistant", widgetWelcome: "¡Hey! ¿Qué objetivo fitness tenés este año? Te ayudo a encontrar el plan perfecto ⚡",
    prompt: "Sos un asesor de membresías de un gimnasio. Sos energético y motivador. Tu objetivo es entender la meta del cliente y cerrar la membresía adecuada. Pedí su teléfono para coordinar una clase de prueba. Respondé en español.",
  },
  {
    icon: "🛒", label: "E-commerce / Tienda", desc: "Catálogo · Stock · Pedidos",
    mode: "support", widgetName: "Tienda Online", widgetWelcome: "¡Hola! Bienvenido/a a nuestra tienda. ¿En qué puedo ayudarte? 🛍️",
    prompt: "Sos el asistente virtual de una tienda online. Ayudás a los clientes a encontrar productos, consultás stock, informás precios y hacés seguimiento de pedidos. Si el cliente quiere comprar, tomá sus datos y coordiná el proceso. Respondé en español argentino.",
  },
  {
    icon: "🏨", label: "Hotel / Turismo", desc: "Reservas · Consultas · Check-in",
    mode: "lead_capture", widgetName: "Concierge Virtual", widgetWelcome: "¡Bienvenido/a! ¿Planeás una estadía o tenés alguna consulta? 🌟",
    prompt: "Sos el concierge virtual de un hotel. Respondés consultas sobre disponibilidad, precios y servicios. Facilitás el proceso de reserva. Capturá nombre, fecha de llegada y cantidad de huéspedes. Respondé en español.",
  },
  {
    icon: "⚖️", label: "Estudio legal / Profesional", desc: "Consultas iniciales · Agenda",
    mode: "lead_capture", widgetName: "Asistente Profesional", widgetWelcome: "Hola, bienvenido/a. ¿En qué área necesitás orientación? 📋",
    prompt: "Sos el asistente virtual de un estudio profesional. Respondés consultas iniciales, explicás los servicios y coordinás citas con los especialistas. No dés asesoramiento técnico específico — tu función es capturar datos y agendar. Respondé en español argentino.",
  },
];

/* ─── API helper ─────────────────────────────────────────── */
async function apiFetch(url: string, opts?: RequestInit) {
  const r = await fetch(url, { credentials: "include", ...opts });
  if (!r.ok) throw new Error(`${r.status}:${await r.text()}`);
  return r.json();
}

async function putConfig(body: Partial<ChatbotConfig>) {
  return apiFetch("/api/chatbot/config", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/* ─── Shared UI atoms ───────────────────────────────────── */
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-navy-card border border-silver/15 rounded-2xl p-6 ${className}`}>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] font-bold text-cool-steel uppercase tracking-wider mb-1.5">{children}</div>;
}

function Input({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full bg-navy-3 border border-silver/20 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-cool-steel/45 focus:outline-none focus:border-cl-accent transition-all ${props.className ?? ""}`}
    />
  );
}

function Textarea({ ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full bg-navy-3 border border-silver/20 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-cool-steel/45 focus:outline-none focus:border-cl-accent transition-all resize-none ${props.className ?? ""}`}
    />
  );
}

function SaveBtn({ loading, label = "Guardar cambios" }: { loading: boolean; label?: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="bg-cl-accent text-navy font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-cl-accent-hover disabled:opacity-50 transition-all flex items-center gap-2"
    >
      {loading ? <i className="ti ti-loader-2 animate-spin" /> : <i className="ti ti-device-floppy" />}
      {loading ? "Guardando…" : label}
    </button>
  );
}

function Toast({ msg, type }: { msg: string; type: "ok" | "err" }) {
  return (
    <div className={`inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl ${type === "ok" ? "bg-cl-accent/15 text-cl-accent" : "bg-red-500/15 text-red-400"}`}>
      <i className={`ti ${type === "ok" ? "ti-circle-check" : "ti-alert-circle"}`} />
      {msg}
    </div>
  );
}

function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label?: string; description?: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        {label && <div className="text-sm font-semibold text-white">{label}</div>}
        {description && <div className="text-xs text-cool-steel mt-0.5">{description}</div>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${checked ? "bg-cl-accent" : "bg-silver/15"}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`} />
      </button>
    </div>
  );
}

/* ─── Main page ─────────────────────────────────────────── */
type Tab = "config" | "conversations" | "knowledge" | "test" | "widget" | "guardrails" | "hours";

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: "config",        icon: "⚙️",  label: "Configuración" },
  { id: "conversations", icon: "💬",  label: "Conversaciones" },
  { id: "knowledge",     icon: "📚",  label: "Conocimiento" },
  { id: "test",          icon: "🧪",  label: "Chat de prueba" },
  { id: "widget",        icon: "🌐",  label: "Widget Web" },
  { id: "guardrails",    icon: "🛡️", label: "Guardrails" },
  { id: "hours",         icon: "🕐",  label: "Horarios" },
];

export default function AgentPage() {
  const [tab, setTab] = useState<Tab>("config");
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery<ConfigResponse>({
    queryKey: ["chatbot-config"],
    queryFn: () => apiFetch("/api/chatbot/config"),
    retry: false,
  });

  const { data: statusData } = useQuery<ChatbotStatus>({
    queryKey: ["chatbot-status-agent"],
    queryFn: () => apiFetch("/api/chatbot/status"),
    retry: false,
    staleTime: 60_000,
  });

  const saveConfig = useMutation({
    mutationFn: putConfig,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chatbot-config"] }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <i className="ti ti-loader-2 animate-spin text-3xl text-cl-accent" />
      </div>
    );
  }

  if (error) {
    const isUnauth = (error as Error)?.message?.startsWith("401");
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
        <i className="ti ti-lock text-5xl text-white/10" />
        <div>
          <p className="text-cool-steel font-semibold">
            {isUnauth ? "Sesión requerida" : "Error al cargar el agente"}
          </p>
          <p className="text-cool-steel/55 text-sm mt-1">
            {isUnauth ? "Iniciá sesión para configurar tu chatbot." : "Recargá la página e intentá de nuevo."}
          </p>
        </div>
        {isUnauth && (
          <a href="/api/login" className="bg-cl-accent text-navy font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-cl-accent-hover transition-all">
            Iniciar sesión →
          </a>
        )}
      </div>
    );
  }

  const cfg = data?.config ?? {};
  const plan = data?.plan ?? "free";
  const suggestedModel = data?.suggestedModel ?? "";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header strip */}
      <div className="bg-navy-card border-b border-silver/15 px-6 pt-4 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${cfg.active ? "bg-cl-accent/15 text-cl-accent" : "bg-red-500/15 text-red-400"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.active ? "bg-cl-accent animate-pulse" : "bg-red-400"}`} />
              {cfg.active ? "Activo" : "Inactivo"}
            </span>
            <span className="text-xs text-cool-steel/55">Plan {plan.charAt(0).toUpperCase() + plan.slice(1)}</span>
          </div>
          <button
            onClick={() => saveConfig.mutate({ active: !cfg.active })}
            className={`text-xs font-bold px-4 py-1.5 rounded-xl transition-all ${cfg.active ? "bg-red-500/15 text-red-400 hover:bg-red-500/25" : "bg-cl-accent/15 text-cl-accent hover:bg-cl-accent/25"}`}
          >
            {cfg.active ? "Desactivar" : "Activar →"}
          </button>
        </div>

        {/* Usage bar */}
        {statusData?.monthlyLimit != null && (() => {
          const used = statusData.monthlyMessages;
          const limit = statusData.monthlyLimit;
          const pct = Math.min(100, Math.round((used / limit) * 100));
          const isWarn = pct >= 80;
          const isDanger = pct >= 95;
          const barColor = isDanger ? "bg-red-500" : isWarn ? "bg-yellow-400" : "bg-cl-accent";
          const textColor = isDanger ? "text-red-400" : isWarn ? "text-yellow-400" : "text-cool-steel/55";
          return (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cool-steel/55">
                  Mensajes este mes
                </span>
                <span className={`text-[11px] font-semibold ${textColor}`}>
                  {used.toLocaleString("es-AR")} / {limit.toLocaleString("es-AR")}
                  {isDanger && " — ¡Límite casi alcanzado!"}
                  {isWarn && !isDanger && " — Uso elevado"}
                </span>
              </div>
              <div className="w-full bg-silver/10 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })()}
      </div>

      {/* Tabs */}
      <div className="bg-navy-card border-b border-silver/15 px-6 flex gap-1 flex-shrink-0 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${
              tab === t.id
                ? "border-cl-accent text-cl-accent"
                : "border-transparent text-cool-steel hover:text-silver"
            }`}
          >
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-6">
        {tab === "config" && <TabConfig cfg={cfg} plan={plan} suggestedModel={suggestedModel} saveConfig={saveConfig} />}
        {tab === "conversations" && <TabConversations />}
        {tab === "knowledge" && <TabKnowledge />}
        {tab === "test" && <TabTest />}
        {tab === "widget" && <TabWidget cfg={cfg} saveConfig={saveConfig} />}
        {tab === "guardrails" && <TabGuardrails cfg={cfg} saveConfig={saveConfig} />}
        {tab === "hours" && <TabHours cfg={cfg} saveConfig={saveConfig} />}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   TAB 1 — Configuración
══════════════════════════════════════════════════════════ */
function TabConfig({ cfg, plan, suggestedModel, saveConfig }: {
  cfg: ChatbotConfig;
  plan: string;
  suggestedModel: string;
  saveConfig: ReturnType<typeof useMutation<unknown, Error, Partial<ChatbotConfig>>>;
}) {
  const [agentMode, setAgentMode] = useState(cfg.agentMode ?? "support");
  const [maxHistory, setMaxHistory] = useState(cfg.maxHistory ?? 20);
  const [provider, setProvider] = useState<"openrouter" | "openai">(cfg.apiProvider ?? "openrouter");
  const [orKey, setOrKey] = useState(cfg.openrouterApiKey ?? "");
  const [oaiKey, setOaiKey] = useState(cfg.openaiApiKey ?? "");
  const [systemPrompt, setSystemPrompt] = useState(cfg.systemPrompt ?? "");
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  // Evolution wizard
  const [evoUrl, setEvoUrl] = useState(cfg.evolutionApiUrl ?? "");
  const [evoKey, setEvoKey] = useState(cfg.evolutionApiKey ?? "");
  const [evoInstance, setEvoInstance] = useState(cfg.evolutionInstance ?? "");
  const [evoStep, setEvoStep] = useState(cfg.evolutionInstance ? 4 : 1);
  const [evoInstances, setEvoInstances] = useState<{ name: string; state: string }[]>([]);
  const [evoConnecting, setEvoConnecting] = useState(false);
  const [evoError, setEvoError] = useState("");
  const [evoQr, setEvoQr] = useState<string | null>(null);
  const [evoNewName, setEvoNewName] = useState("");
  const [evoWebhookDone, setEvoWebhookDone] = useState(false);
  const [qrCountdown, setQrCountdown] = useState(60);
  const [qrConnected, setQrConnected] = useState(false);
  const [evoPhone, setEvoPhone] = useState<string | null>(null);
  const [evoProfileName, setEvoProfileName] = useState<string | null>(null);
  const [testPhone, setTestPhone] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [testSent, setTestSent] = useState(false);
  const [testError, setTestError] = useState("");

  useEffect(() => {
    setAgentMode(cfg.agentMode ?? "support");
    setMaxHistory(cfg.maxHistory ?? 20);
    setProvider(cfg.apiProvider ?? "openrouter");
    setOrKey(cfg.openrouterApiKey ?? "");
    setOaiKey(cfg.openaiApiKey ?? "");
    setSystemPrompt(cfg.systemPrompt ?? "");
    setEvoUrl(cfg.evolutionApiUrl ?? "");
    setEvoKey(cfg.evolutionApiKey ?? "");
    setEvoInstance(cfg.evolutionInstance ?? "");
    setEvoStep(cfg.evolutionInstance ? 4 : 1);
  }, [cfg]);

  /* QR countdown — decrementa cada segundo mientras step === 3 */
  useEffect(() => {
    if (evoStep !== 3 || qrConnected) return;
    const id = setInterval(() => {
      setQrCountdown((n) => {
        if (n <= 1) {
          clearInterval(id);
          /* auto-refresh QR cuando vence */
          if (evoInstance && evoUrl && evoKey) {
            setEvoQr(null);
            apiFetch("/api/chatbot/evolution/qr", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url: evoUrl, apiKey: evoKey, instanceName: evoInstance }),
            }).then((r) => {
              setEvoQr(r.qrCode ?? null);
            }).catch(() => {});
          }
          return 60;
        }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [evoStep, qrConnected, evoInstance, evoUrl, evoKey]);

  /* Polling de estado de conexión — cada 3s mientras step === 3 */
  useEffect(() => {
    if (evoStep !== 3 || !evoInstance || !evoUrl || !evoKey) return;
    const id = setInterval(async () => {
      try {
        const r = await apiFetch("/api/chatbot/evolution/connection-state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: evoUrl, apiKey: evoKey, instanceName: evoInstance }),
        });
        if (r.state === "open") {
          setQrConnected(true);
          if (r.phone) { setEvoPhone(r.phone); setTestPhone(r.phone); }
          if (r.profileName) setEvoProfileName(r.profileName);
          clearInterval(id);
          /* auto-configurar webhook y guardar */
          const origin = window.location.origin;
          apiFetch("/api/chatbot/evolution/setup-webhook", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: evoUrl, apiKey: evoKey, instanceName: evoInstance, webhookUrl: `${origin}/api/chatbot/webhook` }),
          }).then(() => {
            setEvoWebhookDone(true);
          }).catch(() => {});
          await saveConfig.mutateAsync({ evolutionApiUrl: evoUrl, evolutionApiKey: evoKey, evolutionInstance: evoInstance });
          setTimeout(() => { setEvoStep(4); setQrConnected(false); }, 1200);
        }
      } catch {}
    }, 3000);
    return () => clearInterval(id);
  }, [evoStep, evoInstance, evoUrl, evoKey]);

  function showToast(msg: string, type: "ok" | "err") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      await saveConfig.mutateAsync({
        agentMode,
        maxHistory,
        apiProvider: provider,
        openrouterApiKey: orKey,
        openaiApiKey: oaiKey,
        systemPrompt,
        evolutionApiUrl: evoUrl,
        evolutionApiKey: evoKey,
        evolutionInstance: evoInstance,
      });
      showToast("Configuración guardada", "ok");
    } catch {
      showToast("Error al guardar", "err");
    }
  }

  async function testEvolution() {
    setEvoConnecting(true);
    setEvoError("");
    try {
      const r = await apiFetch("/api/chatbot/evolution/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: evoUrl, apiKey: evoKey }),
      });
      if (!r.ok) { setEvoError(r.error ?? "Error de conexión"); }
      else { setEvoInstances(r.instances ?? []); setEvoStep(2); }
    } catch (err) {
      setEvoError(err instanceof Error ? err.message : "Error de conexión");
    } finally {
      setEvoConnecting(false);
    }
  }

  async function createInstance() {
    if (!evoNewName.trim()) return;
    setEvoConnecting(true);
    setEvoError("");
    try {
      const r = await apiFetch("/api/chatbot/evolution/create-instance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: evoUrl, apiKey: evoKey, instanceName: evoNewName.trim() }),
      });
      if (!r.ok) { setEvoError(r.error ?? "Error al crear instancia"); }
      else { setEvoInstance(evoNewName.trim()); setEvoQr(r.qrCode); setEvoStep(3); }
    } catch (err) {
      setEvoError(err instanceof Error ? err.message : "Error al crear instancia");
    } finally {
      setEvoConnecting(false);
    }
  }

  async function selectInstance(name: string) {
    setEvoInstance(name);
    setEvoConnecting(true);
    try {
      const r = await apiFetch("/api/chatbot/evolution/qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: evoUrl, apiKey: evoKey, instanceName: name }),
      });
      setEvoQr(r.qrCode);
    } catch {}
    finally { setEvoConnecting(false); }
    setEvoStep(3);
  }

  async function setupWebhook() {
    setEvoConnecting(true);
    try {
      const origin = window.location.origin;
      const r = await apiFetch("/api/chatbot/evolution/setup-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: evoUrl, apiKey: evoKey, instanceName: evoInstance, webhookUrl: `${origin}/api/chatbot/webhook` }),
      });
      if (r.ok) { setEvoWebhookDone(true); }
    } catch {}
    finally { setEvoConnecting(false); }
    setEvoStep(4);
    await saveConfig.mutateAsync({ evolutionApiUrl: evoUrl, evolutionApiKey: evoKey, evolutionInstance: evoInstance });
  }

  const modelLabel = MODEL_LABELS[suggestedModel] ?? suggestedModel ?? "—";

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-3xl">

      {/* Model info */}
      <Card>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-cl-blue/15 text-cl-blue rounded-xl flex items-center justify-center">
            <i className="ti ti-robot text-lg" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-cool-steel uppercase tracking-wider">Modelo IA de tu plan</div>
            <div className="text-sm font-bold text-white">{modelLabel}</div>
          </div>
        </div>
      </Card>

      {/* Mode + history */}
      <Card className="space-y-5">
        <div>
          <Label>🎯 Modo del agente</Label>
          <p className="text-xs text-cool-steel mb-3">Define si el chatbot actúa como soporte o como agente de ventas.</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { val: "support", icon: "🎧", title: "Soporte al cliente", desc: "Responde consultas y resuelve problemas" },
              { val: "sales",   icon: "💼", title: "Agente de ventas",   desc: "Califica leads y guía hacia la venta" },
            ].map((m) => (
              <button
                key={m.val}
                type="button"
                onClick={() => setAgentMode(m.val)}
                className={`text-left p-4 rounded-xl border transition-all ${agentMode === m.val ? "border-cl-accent bg-cl-accent/10" : "border-silver/20 hover:border-silver/30"}`}
              >
                <div className="text-base mb-1">{m.icon}</div>
                <div className="text-xs font-bold text-white">{m.title}</div>
                <div className="text-[11px] text-cool-steel mt-0.5">{m.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label>Historial de contexto</Label>
          <div className="flex items-center gap-4">
            <input
              type="range" min={5} max={50} step={5}
              value={maxHistory}
              onChange={(e) => setMaxHistory(Number(e.target.value))}
              className="flex-1 accent-cl-accent"
            />
            <span className="text-sm font-bold text-cl-accent w-24 text-right">{maxHistory} mensajes</span>
          </div>
          <p className="text-xs text-cool-steel/55 mt-1">Cuántos mensajes anteriores recuerda el chatbot por conversación.</p>
        </div>
      </Card>

      {/* API provider */}
      <Card className="space-y-4">
        <div>
          <Label>🔑 Proveedor de IA</Label>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { val: "openrouter", icon: "🔀", label: "OpenRouter (gratis)" },
              { val: "openai",     icon: "🟢", label: "OpenAI (tu key)" },
            ].map((p) => (
              <button
                key={p.val}
                type="button"
                onClick={() => setProvider(p.val as "openrouter" | "openai")}
                className={`text-left p-3 rounded-xl border text-sm font-semibold transition-all ${provider === p.val ? "border-cl-accent bg-cl-accent/10 text-cl-accent" : "border-silver/20 text-cool-steel hover:border-silver/30"}`}
              >
                {p.icon} {p.label}
              </button>
            ))}
          </div>
          {provider === "openrouter" && (
            <div>
              <Label>Tu OPENROUTER_API_KEY (opcional)</Label>
              <Input
                type="password"
                value={orKey}
                onChange={(e) => setOrKey(e.target.value)}
                placeholder="sk-or-v1-..."
              />
              <p className="text-xs text-cool-steel/55 mt-1">Gratis en openrouter.ai/keys. Si lo dejás vacío usa la key del sistema.</p>
            </div>
          )}
          {provider === "openai" && (
            <div>
              <Label>Tu OPENAI_API_KEY</Label>
              <Input
                type="password"
                value={oaiKey}
                onChange={(e) => setOaiKey(e.target.value)}
                placeholder="sk-..."
              />
            </div>
          )}
        </div>
      </Card>

      {/* Evolution wizard */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label>🔌 Conectar WhatsApp con Evolution API</Label>
            <p className="text-xs text-cool-steel">Seguí los pasos — sin código, sin configuración técnica</p>
          </div>
          {cfg.evolutionInstance && (
            <span className="text-[10px] font-bold px-2 py-1 bg-cl-accent/10 text-cl-accent rounded-lg">
              ✓ {cfg.evolutionInstance}
            </span>
          )}
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${evoStep >= s ? "bg-cl-accent text-navy" : "bg-silver/15 text-cool-steel"}`}>
                {s}
              </div>
              {s < 4 && <div className={`h-px w-8 transition-all ${evoStep > s ? "bg-cl-accent" : "bg-silver/15"}`} />}
            </div>
          ))}
          <div className="ml-2 text-xs text-cool-steel">
            {["Credenciales", "Instancia", "WhatsApp", "Activar"][evoStep - 1]}
          </div>
        </div>

        {evoError && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-xs text-red-400">{evoError}</div>
        )}

        {evoStep === 1 && (
          <div className="space-y-3">
            <div>
              <Label>URL de Evolution API</Label>
              <Input value={evoUrl} onChange={(e) => setEvoUrl(e.target.value)} placeholder="https://evo.tuempresa.com" />
            </div>
            <div>
              <Label>API Key Global</Label>
              <Input type="password" value={evoKey} onChange={(e) => setEvoKey(e.target.value)} placeholder="••••••••••••" />
              <p className="text-xs text-cool-steel/55 mt-1">La encontrás en el archivo .env como AUTHENTICATION_API_KEY</p>
            </div>
            <button
              type="button"
              disabled={!evoUrl || !evoKey || evoConnecting}
              onClick={testEvolution}
              className="bg-cl-blue/20 text-cl-blue border border-cl-blue/20 text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-cl-blue/30 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {evoConnecting ? <i className="ti ti-loader-2 animate-spin" /> : <i className="ti ti-plug" />}
              Verificar conexión →
            </button>
          </div>
        )}

        {evoStep === 2 && (
          <div className="space-y-3">
            {evoInstances.length > 0 && (
              <div className="space-y-2">
                <Label>Seleccioná una instancia existente</Label>
                {evoInstances.map((inst) => (
                  <button
                    key={inst.name}
                    type="button"
                    onClick={() => selectInstance(inst.name)}
                    className="w-full text-left flex items-center justify-between px-4 py-3 bg-navy-3 border border-silver/20 rounded-xl hover:border-cl-accent/40 transition-all"
                  >
                    <span className="text-sm font-semibold text-white">{inst.name}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${inst.state === "open" ? "bg-cl-accent/15 text-cl-accent" : "bg-silver/15 text-cool-steel"}`}>
                      {inst.state}
                    </span>
                  </button>
                ))}
                <div className="text-xs text-cool-steel text-center">o</div>
              </div>
            )}
            <div>
              <Label>Crear nueva instancia</Label>
              <div className="flex gap-2">
                <Input value={evoNewName} onChange={(e) => setEvoNewName(e.target.value)} placeholder="mi-negocio-wp" className="flex-1" />
                <button
                  type="button"
                  disabled={!evoNewName.trim() || evoConnecting}
                  onClick={createInstance}
                  className="bg-cl-accent text-navy font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-cl-accent-hover disabled:opacity-50 whitespace-nowrap"
                >
                  Crear →
                </button>
              </div>
            </div>
          </div>
        )}

        {evoStep === 3 && (
          <div className="space-y-4">
            {/* Header */}
            <div>
              <p className="text-sm font-bold text-white">Conectá tu número a Evolution API</p>
              <p className="text-xs text-cool-steel mt-0.5">Escaneá el código QR desde tu celular para vincular WhatsApp de forma segura mediante Baileys.</p>
            </div>

            <div className="flex gap-5 items-start">
              {/* QR box */}
              <div className="flex-shrink-0 flex flex-col items-center gap-2">
                <div className="w-44 h-44 bg-white rounded-2xl border-2 border-silver/20 flex items-center justify-center overflow-hidden relative">
                  {qrConnected ? (
                    <div className="flex flex-col items-center gap-2">
                      <i className="ti ti-circle-check text-5xl text-emerald-500" />
                      <span className="text-xs font-bold text-emerald-600">¡Conectado!</span>
                    </div>
                  ) : evoQr ? (
                    <>
                      <img
                        src={evoQr.startsWith("data:") ? evoQr : `data:image/png;base64,${evoQr}`}
                        alt="QR WhatsApp"
                        className="w-full h-full object-contain p-2"
                      />
                      {qrCountdown <= 10 && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl">
                          <span className="text-white font-black text-lg">Actualizando…</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <i className="ti ti-loader-2 animate-spin text-3xl text-cool-steel/40" />
                      <span className="text-[10px] text-cool-steel/50">Generando QR…</span>
                    </div>
                  )}
                </div>
                {!qrConnected && evoQr && (
                  <div className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${qrCountdown <= 10 ? "bg-red-500/15 text-red-400" : "bg-silver/15 text-cool-steel"}`}>
                    VENCE EN: {qrCountdown}S
                  </div>
                )}
              </div>

              {/* Estado + instrucciones */}
              <div className="flex-1 space-y-4 pt-1">
                {/* Badge de estado */}
                <div className="flex items-center gap-2.5 px-3 py-2.5 bg-navy-3 rounded-xl border border-silver/15">
                  {qrConnected ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
                  ) : (
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-pulse flex-shrink-0" />
                  )}
                  <div>
                    <p className="text-xs font-bold text-white">
                      {qrConnected ? "Estado: ¡Conectado!" : "Estado: Esperando Escaneo QR"}
                    </p>
                    {!qrConnected && (
                      <p className="text-[10px] text-cool-steel mt-0.5">
                        Abrí WhatsApp en tu teléfono → Menú → Dispositivos Vinculados → Vincular dispositivo.
                      </p>
                    )}
                    {qrConnected && (
                      <p className="text-[10px] text-emerald-500/80 mt-0.5">
                        Configurando webhook automáticamente…
                      </p>
                    )}
                  </div>
                </div>

                {/* Instrucciones paso a paso */}
                {!qrConnected && (
                  <ol className="space-y-2">
                    {[
                      "Abrí WhatsApp en tu teléfono",
                      "Tocá los 3 puntos → Dispositivos vinculados",
                      "Tocá «Vincular dispositivo»",
                      "Apuntá la cámara al QR de aquí",
                    ].map((step, i) => (
                      <li key={i} className="flex items-start gap-2 text-[11px] text-cool-steel">
                        <span className="w-4 h-4 rounded-full bg-navy-3 border border-silver/20 flex items-center justify-center text-[9px] font-black text-white flex-shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                )}

                {/* Botones */}
                <div className="flex flex-col gap-2">
                  {/* Simular escaneo (dev/demo) */}
                  <button
                    type="button"
                    onClick={async () => {
                      setQrConnected(true);
                      const origin = window.location.origin;
                      try {
                        await apiFetch("/api/chatbot/evolution/setup-webhook", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ url: evoUrl, apiKey: evoKey, instanceName: evoInstance, webhookUrl: `${origin}/api/chatbot/webhook` }),
                        });
                        setEvoWebhookDone(true);
                      } catch {}
                      await saveConfig.mutateAsync({ evolutionApiUrl: evoUrl, evolutionApiKey: evoKey, evolutionInstance: evoInstance });
                      setTimeout(() => { setEvoStep(4); setQrConnected(false); }, 1200);
                    }}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all bg-emerald-500 hover:bg-emerald-400 text-white"
                  >
                    <i className="ti ti-qrcode text-sm" />
                    Simular Escaneo Móvil
                  </button>

                  <button
                    type="button"
                    onClick={setupWebhook}
                    disabled={evoConnecting}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-semibold text-xs border border-silver/20 text-cool-steel hover:text-white hover:border-silver/40 transition-all disabled:opacity-50"
                  >
                    {evoConnecting ? <i className="ti ti-loader-2 animate-spin text-xs" /> : <i className="ti ti-check text-xs" />}
                    Ya escaneé → configurar webhook
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {evoStep === 4 && (
          <div className="space-y-4">
            {/* Banner de éxito */}
            <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <i className="ti ti-circle-check text-emerald-400 text-xl" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-emerald-400">¡WhatsApp conectado exitosamente!</p>
                <p className="text-xs text-emerald-500/70 mt-0.5">
                  Webhook {evoWebhookDone ? "configurado automáticamente" : "listo"} · Chatbot activo en este número
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setEvoStep(1); setEvoPhone(null); setEvoProfileName(null); setTestSent(false); }}
                className="text-[10px] text-cool-steel hover:text-white px-2 py-1 rounded-lg border border-silver/15 hover:border-silver/30 transition-all whitespace-nowrap"
              >
                Reconfigurar
              </button>
            </div>

            {/* Info de la conexión */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-navy-3 border border-silver/15 rounded-xl px-4 py-3">
                <p className="text-[10px] font-bold text-cool-steel uppercase tracking-wider mb-1">Instancia</p>
                <p className="text-sm font-bold text-white truncate">{evoInstance || cfg.evolutionInstance}</p>
              </div>
              <div className="bg-navy-3 border border-silver/15 rounded-xl px-4 py-3">
                <p className="text-[10px] font-bold text-cool-steel uppercase tracking-wider mb-1">Número</p>
                <p className="text-sm font-bold text-white truncate">
                  {evoPhone
                    ? `+${evoPhone}`
                    : <span className="text-cool-steel font-normal text-xs">detectado al conectar</span>
                  }
                </p>
                {evoProfileName && (
                  <p className="text-[10px] text-cool-steel truncate">{evoProfileName}</p>
                )}
              </div>
            </div>

            {/* Enviar mensaje de prueba */}
            <div className="border border-silver/15 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <i className="ti ti-brand-whatsapp text-[#25D366]" />
                <p className="text-xs font-bold text-white">Enviar mensaje de prueba</p>
              </div>
              <p className="text-[11px] text-cool-steel">
                Ingresá el número de WhatsApp donde querés recibir el mensaje de prueba (con código de país, sin +).
              </p>
              {testSent ? (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <i className="ti ti-circle-check text-emerald-400" />
                  <p className="text-xs font-semibold text-emerald-400">¡Mensaje enviado! Revisá tu WhatsApp.</p>
                  <button
                    type="button"
                    onClick={() => { setTestSent(false); setTestError(""); }}
                    className="ml-auto text-[10px] text-cool-steel hover:text-white"
                  >
                    Enviar otro
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="5492984510883"
                    className="flex-1 bg-navy-3 border border-silver/20 rounded-xl px-3 py-2 text-sm text-white placeholder:text-cool-steel/40 focus:outline-none focus:border-[#25D366]/40"
                  />
                  <button
                    type="button"
                    disabled={!testPhone.trim() || testSending}
                    onClick={async () => {
                      setTestSending(true);
                      setTestError("");
                      try {
                        const r = await apiFetch("/api/chatbot/evolution/send-test", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            url: evoUrl || cfg.evolutionApiUrl,
                            apiKey: evoKey || cfg.evolutionApiKey,
                            instanceName: evoInstance || cfg.evolutionInstance,
                            to: testPhone,
                          }),
                        });
                        if (r.ok) { setTestSent(true); }
                        else { setTestError(r.error ?? "Error al enviar"); }
                      } catch (err) {
                        setTestError(err instanceof Error ? err.message : "Error al enviar");
                      } finally {
                        setTestSending(false);
                      }
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm bg-[#25D366] hover:bg-[#20c05b] text-white disabled:opacity-50 transition-all whitespace-nowrap"
                  >
                    {testSending ? <i className="ti ti-loader-2 animate-spin text-sm" /> : <i className="ti ti-send text-sm" />}
                    Probar
                  </button>
                </div>
              )}
              {testError && (
                <p className="text-xs text-red-400 flex items-center gap-1.5">
                  <i className="ti ti-alert-circle" />{testError}
                </p>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Templates */}
      <Card className="space-y-3">
        <Label>🚀 Plantillas por rubro</Label>
        <p className="text-xs text-cool-steel">Elegí una plantilla para cargar una configuración completa. Podés personalizar después.</p>
        <div className="grid grid-cols-3 gap-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => {
                setSystemPrompt(t.prompt);
                setAgentMode(t.mode === "lead_capture" ? "sales" : t.mode);
              }}
              className="text-left p-3 rounded-xl border border-silver/20 hover:border-cl-accent/30 hover:bg-cl-accent/5 transition-all"
            >
              <div className="text-sm mb-1">{t.icon}</div>
              <div className="text-[11px] font-semibold text-silver">{t.label}</div>
              <div className="text-[10px] text-cool-steel/55 mt-0.5">{t.desc}</div>
            </button>
          ))}
        </div>
      </Card>

      {/* System prompt */}
      <Card className="space-y-3">
        <Label>📝 Prompt del sistema</Label>
        <p className="text-xs text-cool-steel">Define la personalidad y comportamiento del chatbot. Presets rápidos:</p>
        <div className="flex flex-wrap gap-2 mb-2">
          {TEMPLATES.slice(0, 5).map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => setSystemPrompt(t.prompt)}
              className="text-xs font-semibold px-3 py-1 rounded-lg bg-silver/10 border border-silver/20 hover:bg-silver/15 text-silver transition-all"
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        <Textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          rows={6}
          placeholder="Sos un asistente de atención al cliente amable y profesional…"
        />
      </Card>

      {/* Estado del chatbot */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label>Estado del chatbot</Label>
            <p className="text-xs text-cool-steel">Activá o desactivá las respuestas automáticas.</p>
          </div>
          <button
            type="button"
            onClick={() => saveConfig.mutate({ active: !cfg.active })}
            className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${cfg.active ? "bg-cl-accent" : "bg-silver/15"}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${cfg.active ? "translate-x-6" : "translate-x-0"}`} />
          </button>
        </div>
        {!cfg.active && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-start gap-2">
            <i className="ti ti-alert-circle text-red-400 text-base flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-400">El chatbot está inactivo</p>
              <p className="text-xs text-red-400/70 mt-0.5">
                {!evoInstance
                  ? "Completá la URL, API key e instancia de Evolution API arriba, después activá el switch y guardá."
                  : "Activá el switch y guardá la configuración para que el bot empiece a responder mensajes."}
              </p>
            </div>
          </div>
        )}
        {cfg.active && (
          <div className="bg-cl-accent/10 border border-cl-accent/20 rounded-xl px-4 py-3 flex items-center gap-2">
            <i className="ti ti-circle-check text-cl-accent text-base" />
            <p className="text-sm font-semibold text-cl-accent">Chatbot activo — respondiendo mensajes automáticamente 24/7.</p>
          </div>
        )}
      </Card>

      {/* Weekly Report Card */}
      <Card className="flex flex-col gap-4 p-5">
        <div className="flex items-center justify-between">
          <div>
            <Label>Reporte semanal por WhatsApp</Label>
            <p className="text-xs text-cool-steel">Recibí un resumen de métricas cada lunes a las 9 AM (hora Argentina).</p>
          </div>
          <button
            type="button"
            onClick={() => saveConfig.mutate({ weeklyReportEnabled: !cfg.weeklyReportEnabled })}
            className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${cfg.weeklyReportEnabled ? "bg-cl-accent" : "bg-silver/15"}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${cfg.weeklyReportEnabled ? "translate-x-6" : "translate-x-0"}`} />
          </button>
        </div>
        {cfg.weeklyReportEnabled && (
          <div className="flex flex-col gap-1.5">
            <Label>Número de WhatsApp del destinatario</Label>
            <input
              type="tel"
              placeholder="5491112345678"
              value={cfg.weeklyReportPhone ?? ""}
              onChange={e => setCfg(prev => ({ ...prev, weeklyReportPhone: e.target.value }))}
              className="input-base"
            />
            <p className="text-xs text-cool-steel">Formato internacional sin +. Ej: 5491112345678</p>
          </div>
        )}
      </Card>

      {/* Save */}
      <div className="flex items-center gap-4">
        <SaveBtn loading={saveConfig.isPending} />
        {toast && <Toast msg={toast.msg} type={toast.type} />}
      </div>
    </form>
  );
}

/* ══════════════════════════════════════════════════════════
   TAB 2 — Conversaciones
══════════════════════════════════════════════════════════ */
const LEAD_STATUS_OPTIONS = [
  { val: "new",        label: "Nuevo",        color: "bg-silver/15 text-cool-steel" },
  { val: "interested", label: "Interesado",   color: "bg-blue-500/15 text-blue-400" },
  { val: "qualified",  label: "Calificado",   color: "bg-cl-accent/15 text-cl-accent" },
  { val: "closed",     label: "Cerrado",      color: "bg-purple-500/15 text-purple-400" },
  { val: "lost",       label: "Perdido",      color: "bg-red-500/15 text-red-400" },
];

const CHANNEL_FILTERS = [
  { val: "all",        label: "Todos",       icon: "ti-list",        color: "text-cool-steel" },
  { val: "whatsapp",   label: "WhatsApp",    icon: "ti-brand-whatsapp", color: "text-emerald-400" },
  { val: "prospector", label: "Prospector",  icon: "ti-map-search",  color: "text-amber-400" },
] as const;

type ChannelFilter = typeof CHANNEL_FILTERS[number]["val"];

function TabConversations() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [savingLead, setSavingLead] = useState(false);
  const [showLeadPanel, setShowLeadPanel] = useState(false);
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const qc = useQueryClient();

  const { data: convsData, isLoading } = useQuery<{ conversations: Conversation[] }>({
    queryKey: ["chatbot-conversations"],
    queryFn: () => apiFetch("/api/chatbot/conversations"),
  });

  const { data: msgsData } = useQuery<{ messages: Message[] }>({
    queryKey: ["chatbot-messages", selectedId],
    queryFn: () => apiFetch(`/api/chatbot/conversations/${selectedId}/messages`),
    enabled: !!selectedId,
  });

  const convs = convsData?.conversations ?? [];
  const msgs = msgsData?.messages ?? [];
  const selected = convs.find((c) => c.id === selectedId) ?? null;

  const filteredConvs = channelFilter === "all"
    ? convs
    : convs.filter((c) => c.channel === channelFilter);

  const prospectorCount = convs.filter((c) => c.channel === "prospector").length;
  const whatsappCount   = convs.filter((c) => c.channel === "whatsapp").length;

  function selectConv(id: string) {
    const c = convs.find((x) => x.id === id);
    setSelectedId(id);
    setNotesDraft(c?.leadNotes ?? "");
    setShowLeadPanel(false);
  }

  async function toggleHandoff() {
    if (!selectedId || !selected) return;
    await apiFetch(`/api/chatbot/conversations/${selectedId}/handoff`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handoffMode: !selected.handoffMode }),
    });
    qc.invalidateQueries({ queryKey: ["chatbot-conversations"] });
  }

  async function saveLeadStatus(status: string) {
    if (!selectedId) return;
    setSavingLead(true);
    try {
      await apiFetch(`/api/chatbot/conversations/${selectedId}/lead`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadStatus: status, leadNotes: notesDraft }),
      });
      qc.invalidateQueries({ queryKey: ["chatbot-conversations"] });
    } finally {
      setSavingLead(false);
    }
  }

  async function saveNotes() {
    if (!selectedId) return;
    setSavingLead(true);
    try {
      await apiFetch(`/api/chatbot/conversations/${selectedId}/lead`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadNotes: notesDraft }),
      });
      qc.invalidateQueries({ queryKey: ["chatbot-conversations"] });
    } finally {
      setSavingLead(false);
    }
  }

  async function sendReply() {
    if (!selectedId || !replyText.trim()) return;
    setSending(true);
    try {
      await apiFetch(`/api/chatbot/conversations/${selectedId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: replyText }),
      });
      setReplyText("");
      qc.invalidateQueries({ queryKey: ["chatbot-messages", selectedId] });
    } finally {
      setSending(false);
    }
  }

  if (isLoading) return <div className="flex justify-center py-12"><i className="ti ti-loader-2 animate-spin text-2xl text-cl-accent" /></div>;

  if (convs.length === 0) {
    return (
      <div className="text-center py-20">
        <i className="ti ti-messages text-5xl text-white/10 block mb-4" />
        <p className="text-cool-steel text-sm">No hay conversaciones aún</p>
        <p className="text-cool-steel/45 text-xs mt-1">Los mensajes de WhatsApp aparecerán aquí cuando el chatbot esté activo</p>
      </div>
    );
  }

  const statusInfo = LEAD_STATUS_OPTIONS.find((o) => o.val === selected?.leadStatus);

  function channelIcon(ch: string | null) {
    if (ch === "whatsapp")   return <i className="ti ti-brand-whatsapp text-emerald-400 text-xs" />;
    if (ch === "prospector") return <i className="ti ti-map-search text-amber-400 text-xs" />;
    return <i className="ti ti-world text-cool-steel text-xs" />;
  }

  const countsByChannel: Record<string, number> = {
    all:        convs.length,
    whatsapp:   whatsappCount,
    prospector: prospectorCount,
  };

  return (
    <div className="grid grid-cols-[300px_1fr] gap-4 h-[calc(100vh-260px)]">
      {/* List */}
      <Card className="p-0 flex flex-col overflow-hidden">
        {/* Channel filter pills */}
        <div className="px-3 pt-3 pb-2 border-b border-silver/15 space-y-2">
          <div className="flex gap-1.5 flex-wrap">
            {CHANNEL_FILTERS.map((f) => {
              const cnt = countsByChannel[f.val] ?? 0;
              const active = channelFilter === f.val;
              return (
                <button
                  key={f.val}
                  onClick={() => { setChannelFilter(f.val); setSelectedId(null); }}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                    active
                      ? "bg-cl-accent/15 text-cl-accent border border-cl-accent/30"
                      : "bg-silver/10 text-cool-steel hover:bg-silver/20 border border-transparent"
                  }`}
                >
                  <i className={`ti ${f.icon} text-xs ${active ? "text-cl-accent" : f.color}`} />
                  {f.label}
                  {cnt > 0 && (
                    <span className={`ml-0.5 px-1 rounded-full text-[9px] font-bold ${active ? "bg-cl-accent/20 text-cl-accent" : "bg-silver/20 text-cool-steel/70"}`}>
                      {cnt}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="text-[10px] text-cool-steel/50 flex items-center justify-between">
            <span>{filteredConvs.length} resultado{filteredConvs.length !== 1 ? "s" : ""}</span>
            {filteredConvs.filter((c) => c.handoffMode).length > 0 && (
              <span className="text-orange-400/70">{filteredConvs.filter((c) => c.handoffMode).length} en manual</span>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredConvs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center px-4">
              <i className={`ti ${CHANNEL_FILTERS.find((f) => f.val === channelFilter)?.icon} text-2xl text-white/10 mb-2`} />
              <p className="text-cool-steel/50 text-xs">
                {channelFilter === "prospector"
                  ? "Importá leads desde el Prospector para verlos aquí"
                  : "Sin conversaciones en este canal"}
              </p>
            </div>
          ) : (
            filteredConvs.map((c) => {
              const st = LEAD_STATUS_OPTIONS.find((o) => o.val === c.leadStatus);
              return (
                <button
                  key={c.id}
                  onClick={() => selectConv(c.id)}
                  className={`w-full text-left px-4 py-3 border-b border-silver/15 hover:bg-silver/10 transition-all ${selectedId === c.id ? "bg-silver/10 border-l-2 border-l-cl-accent" : ""}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white truncate">{c.leadName || c.phoneNumber || "Desconocido"}</span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {c.handoffMode && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded">MANUAL</span>
                      )}
                      <span className="text-[10px] text-cool-steel/55">
                        {c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }) : ""}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-cool-steel">
                    {channelIcon(c.channel)}
                    {st && <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${st.color}`}>{st.label}</span>}
                    {c.channel === "prospector" && (
                      <span className="text-[9px] text-amber-400/70 font-semibold">Google Maps</span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </Card>

      {/* Detail */}
      <Card className="p-0 flex flex-col overflow-hidden">
        {!selected ? (
          <div className="flex items-center justify-center h-full text-cool-steel/55 text-sm">
            Seleccioná una conversación
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-5 py-3 border-b border-silver/15 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-cl-accent/10 flex items-center justify-center text-sm font-bold text-cl-accent flex-shrink-0">
                  {(selected.leadName || selected.phoneNumber || "?").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-white truncate">{selected.leadName || selected.phoneNumber || "Desconocido"}</div>
                  <div className="text-[11px] text-cool-steel">{selected.phoneNumber} · {selected.channel}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => {
                    if (msgs.length === 0) return;
                    const lines = [
                      `Conversación: ${selected.leadName || selected.phoneNumber || "Desconocido"}`,
                      `Canal: ${selected.channel || "desconocido"}`,
                      `Teléfono: ${selected.phoneNumber || "—"}`,
                      `Exportado: ${new Date().toLocaleString("es-AR")}`,
                      "─".repeat(50),
                      "",
                      ...msgs.map((m) => {
                        const who = m.role === "user" ? "👤 Usuario" : "🤖 Bot";
                        const ts = m.createdAt ? new Date(m.createdAt).toLocaleString("es-AR") : "";
                        return `[${ts}] ${who}:\n${m.content}\n`;
                      }),
                    ];
                    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `conv-${(selected.leadName || selected.phoneNumber || selected.id).replace(/\W+/g, "-")}.txt`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  title="Descargar historial TXT"
                  disabled={msgs.length === 0}
                  className="text-xs font-bold px-3 py-1.5 rounded-xl transition-all bg-silver/10 text-cool-steel hover:text-white disabled:opacity-30"
                >
                  <i className="ti ti-download" />
                </button>
                <button
                  onClick={() => setShowLeadPanel((v) => !v)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${showLeadPanel ? "bg-cl-accent/15 text-cl-accent" : "bg-silver/10 text-cool-steel hover:text-white"}`}
                >
                  <i className="ti ti-user mr-1" />CRM
                </button>
                <button
                  onClick={toggleHandoff}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${selected.handoffMode ? "bg-cl-accent/15 text-cl-accent" : "bg-orange-500/15 text-orange-400"}`}
                >
                  {selected.handoffMode ? "✓ Manual — Ceder al bot" : "Tomar control"}
                </button>
              </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Messages */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 p-4 overflow-y-auto space-y-2 flex flex-col">
                  {msgs.map((m) => (
                    <div
                      key={m.id}
                      className={`max-w-[75%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                        m.role === "user"
                          ? "self-end ml-auto bg-cl-accent text-navy rounded-br-sm"
                          : "self-start bg-navy-3 text-white rounded-bl-sm"
                      }`}
                    >
                      {m.content}
                    </div>
                  ))}
                  {msgs.length === 0 && <p className="text-center text-xs text-cool-steel/55 py-8">Sin mensajes</p>}
                </div>

                {/* Reply (always visible, but active only in handoff) */}
                <div className="p-3 border-t border-silver/15 flex gap-2">
                  <input
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendReply()}
                    placeholder={selected.handoffMode ? "Escribí tu respuesta manual…" : "Tomá el control para responder manualmente"}
                    disabled={!selected.handoffMode}
                    className="flex-1 bg-navy-3 border border-silver/20 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-cool-steel/45 focus:outline-none focus:border-cl-accent disabled:opacity-40"
                  />
                  <button
                    onClick={sendReply}
                    disabled={sending || !replyText.trim() || !selected.handoffMode}
                    className="bg-cl-accent text-navy w-10 h-10 rounded-xl flex items-center justify-center hover:bg-cl-accent-hover disabled:opacity-40 transition-all"
                  >
                    {sending ? <i className="ti ti-loader-2 animate-spin" /> : <i className="ti ti-send" />}
                  </button>
                </div>
              </div>

              {/* CRM side panel */}
              {showLeadPanel && (
                <div className="w-60 border-l border-silver/15 flex flex-col overflow-y-auto">
                  <div className="px-4 py-3 border-b border-silver/15">
                    <div className="text-[10px] font-bold text-cool-steel uppercase tracking-wider mb-3">Estado del lead</div>
                    <div className="space-y-1.5">
                      {LEAD_STATUS_OPTIONS.map((opt) => (
                        <button
                          key={opt.val}
                          onClick={() => saveLeadStatus(opt.val)}
                          disabled={savingLead}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all ${selected.leadStatus === opt.val ? opt.color + " ring-1 ring-white/20" : "bg-silver/10 text-cool-steel hover:bg-silver/15"}`}
                        >
                          {opt.label}
                          {selected.leadStatus === opt.val && <i className="ti ti-check ml-1 text-[10px]" />}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="px-4 py-3 flex-1">
                    <div className="text-[10px] font-bold text-cool-steel uppercase tracking-wider mb-2">Notas internas</div>
                    <textarea
                      value={notesDraft}
                      onChange={(e) => setNotesDraft(e.target.value)}
                      rows={5}
                      placeholder="Notas del operador sobre este contacto…"
                      className="w-full bg-navy-3 border border-silver/20 rounded-xl px-3 py-2 text-xs text-white placeholder:text-cool-steel/40 focus:outline-none focus:border-cl-accent resize-none"
                    />
                    <button
                      onClick={saveNotes}
                      disabled={savingLead}
                      className="mt-2 w-full bg-silver/10 hover:bg-silver/15 text-cool-steel text-xs font-semibold py-2 rounded-xl transition-all flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      {savingLead ? <i className="ti ti-loader-2 animate-spin text-[10px]" /> : <i className="ti ti-device-floppy text-[10px]" />}
                      Guardar notas
                    </button>
                    {statusInfo && (
                      <div className={`mt-3 px-3 py-1.5 rounded-lg text-[10px] font-bold text-center ${statusInfo.color}`}>
                        Estado: {statusInfo.label}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   TAB 3 — Conocimiento
══════════════════════════════════════════════════════════ */
function TabKnowledge() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [importUrl, setImportUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importingFile, setImportingFile] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ items: KnowledgeItem[] }>({
    queryKey: ["chatbot-knowledge"],
    queryFn: () => apiFetch("/api/chatbot/knowledge"),
  });

  const items = data?.items ?? [];

  function showToast(msg: string, type: "ok" | "err") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function addItem() {
    if (!title.trim() || !content.trim()) return;
    setAdding(true);
    try {
      await apiFetch("/api/chatbot/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });
      setTitle(""); setContent("");
      qc.invalidateQueries({ queryKey: ["chatbot-knowledge"] });
      showToast("Entrada agregada", "ok");
    } catch {
      showToast("Error al agregar", "err");
    } finally {
      setAdding(false);
    }
  }

  async function deleteItem(id: string) {
    try {
      await apiFetch(`/api/chatbot/knowledge/${id}`, { method: "DELETE" });
      qc.invalidateQueries({ queryKey: ["chatbot-knowledge"] });
    } catch {}
  }

  async function importFromUrl() {
    if (!importUrl.trim()) return;
    setImporting(true);
    try {
      const d = await apiFetch("/api/chatbot/knowledge/import-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: importUrl }),
      });
      setImportUrl("");
      qc.invalidateQueries({ queryKey: ["chatbot-knowledge"] });
      showToast(`${d.count ?? 0} sección${(d.count ?? 1) !== 1 ? "es" : ""} importada${(d.count ?? 1) !== 1 ? "s" : ""}`, "ok");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error al importar", "err");
    } finally {
      setImporting(false);
    }
  }

  async function importFile(file: File) {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const format = ext === "xml" ? "xml" : ext === "csv" ? "csv" : null;
    if (!format) { showToast("Solo se aceptan archivos .csv o .xml", "err"); return; }
    setImportingFile(true);
    try {
      const content = await file.text();
      const d = await apiFetch("/api/chatbot/knowledge/import-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, format, filename: file.name }),
      });
      qc.invalidateQueries({ queryKey: ["chatbot-knowledge"] });
      showToast(`${d.count ?? 0} artículo${(d.count ?? 1) !== 1 ? "s" : ""} importado${(d.count ?? 1) !== 1 ? "s" : ""} desde ${file.name}`, "ok");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error al importar archivo", "err");
    } finally {
      setImportingFile(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Add manually */}
      <Card className="space-y-4">
        <Label>📝 Agregar entrada de conocimiento</Label>
        <div>
          <Label>Título</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Precios y planes" />
        </div>
        <div>
          <Label>Contenido</Label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            placeholder="Descripción detallada, FAQs, información de productos, políticas…"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={addItem}
            disabled={adding || !title.trim() || !content.trim()}
            className="bg-cl-accent text-navy font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-cl-accent-hover disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {adding ? <i className="ti ti-loader-2 animate-spin" /> : <i className="ti ti-plus" />}
            Agregar
          </button>
          {toast && <Toast msg={toast.msg} type={toast.type} />}
        </div>
      </Card>

      {/* Import URL + File */}
      <Card className="space-y-4">
        <div>
          <Label>🔗 Importar desde URL</Label>
          <div className="flex gap-2 mt-1.5">
            <Input
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              placeholder="https://tupagina.com/faq"
              className="flex-1"
            />
            <button
              onClick={importFromUrl}
              disabled={importing || !importUrl.trim()}
              className="bg-cl-blue/20 text-cl-blue border border-cl-blue/20 text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-cl-blue/30 disabled:opacity-50 whitespace-nowrap flex items-center gap-2"
            >
              {importing ? <i className="ti ti-loader-2 animate-spin" /> : <i className="ti ti-world-download" />}
              Importar
            </button>
          </div>
        </div>
        <div className="border-t border-silver/15 pt-4">
          <Label>📎 Importar archivo CSV o XML</Label>
          <p className="text-xs text-cool-steel/55 mb-2">Sube un archivo con artículos de conocimiento (soporte para Zendesk exports, SitemapXML, CSV con columnas título/contenido).</p>
          <div className="flex items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xml"
              onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={importingFile}
              className="bg-silver/10 border border-silver/20 hover:border-silver/30 text-silver text-sm font-semibold px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {importingFile ? <i className="ti ti-loader-2 animate-spin" /> : <i className="ti ti-upload" />}
              {importingFile ? "Importando…" : "Seleccionar archivo"}
            </button>
            <span className="text-xs text-cool-steel/55">.csv o .xml</span>
          </div>
        </div>
      </Card>

      {/* List */}
      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-silver/15 text-xs font-bold text-cool-steel uppercase tracking-wider">
          {items.length} entradas en la base de conocimiento
        </div>
        {isLoading ? (
          <div className="flex justify-center py-8"><i className="ti ti-loader-2 animate-spin text-xl text-cl-accent" /></div>
        ) : items.length === 0 ? (
          <div className="text-center py-10 text-cool-steel/55 text-sm">
            <i className="ti ti-book-off text-3xl block mb-3 opacity-50" />
            La base de conocimiento está vacía
          </div>
        ) : (
          <div className="divide-y divide-silver/10">
            {items.map((item) => (
              <div key={item.id} className="px-5 py-4 flex items-start justify-between gap-4 hover:bg-deep-space/10 transition-all">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-white truncate">{item.title}</div>
                  <div className="text-xs text-cool-steel mt-0.5 line-clamp-2">{item.content}</div>
                </div>
                <button
                  onClick={() => deleteItem(item.id)}
                  className="text-cool-steel/40 hover:text-red-400 transition-all flex-shrink-0 mt-0.5"
                >
                  <i className="ti ti-trash text-base" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   TAB 4 — Chat de prueba
══════════════════════════════════════════════════════════ */
type TestMsg = { role: "user" | "assistant"; content: string };

function TabTest() {
  const [msgs, setMsgs] = useState<TestMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState("");
  const [viewStyle, setViewStyle] = useState<"whatsapp" | "widget">("whatsapp");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const next: TestMsg[] = [...msgs, { role: "user", content: text }];
    setMsgs(next);
    setLoading(true);
    try {
      const r = await apiFetch("/api/chatbot/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      setMsgs((m) => [...m, { role: "assistant", content: r.reply }]);
      if (r.model) setModel(r.model);
    } catch (err) {
      setMsgs((m) => [...m, { role: "assistant", content: `❌ Error: ${err instanceof Error ? err.message : "Error desconocido"}` }]);
    } finally {
      setLoading(false);
    }
  }

  const isWA = viewStyle === "whatsapp";

  return (
    <div className="max-w-2xl flex flex-col h-[calc(100vh-280px)]">
      <Card className="p-0 flex flex-col flex-1 overflow-hidden">
        {/* Header with view toggle */}
        <div className="px-5 py-3 border-b border-silver/15 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-silver/10 rounded-xl p-1 border border-silver/15">
            <button
              onClick={() => setViewStyle("whatsapp")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${isWA ? "bg-navy-card text-white shadow-sm" : "text-cool-steel hover:text-cool-steel"}`}
            >
              📱 WhatsApp
            </button>
            <button
              onClick={() => setViewStyle("widget")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${!isWA ? "bg-navy-card text-white shadow-sm" : "text-cool-steel hover:text-cool-steel"}`}
            >
              🌐 Widget Web
            </button>
          </div>
          <div className="flex items-center gap-3">
            {model && <span className="text-[10px] text-cool-steel/45 truncate max-w-[200px]">{model}</span>}
            {msgs.length > 0 && (
              <button onClick={() => setMsgs([])} className="text-xs text-cool-steel/55 hover:text-cool-steel transition-all flex-shrink-0">
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Messages — WhatsApp style */}
        {isWA ? (
          <div className="flex-1 overflow-y-auto flex flex-col" style={{ background: "#0b1116" }}>
            <div className="p-4 space-y-2 flex flex-col">
              {msgs.length === 0 && (
                <div className="text-center py-10 text-cool-steel/40">
                  <span className="text-3xl block mb-2">📱</span>
                  <p className="text-xs">Vista WhatsApp — enviá un mensaje para probar</p>
                </div>
              )}
              {msgs.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[78%] px-3 py-2 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "self-end ml-auto rounded-xl rounded-tr-sm text-white"
                      : "self-start rounded-xl rounded-tl-sm text-[#e9edef]"
                  }`}
                  style={{
                    background: m.role === "user" ? "#005c4b" : "#202c33",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
                  }}
                >
                  {m.content}
                </div>
              ))}
              {loading && (
                <div className="self-start px-4 py-2.5 rounded-xl rounded-tl-sm" style={{ background: "#202c33" }}>
                  <span className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </span>
                </div>
              )}
              <div ref={endRef} />
            </div>
          </div>
        ) : (
          /* Messages — Widget style */
          <div className="flex-1 overflow-y-auto flex flex-col bg-[#FDFDFB]">
            <div className="p-4 space-y-2 flex flex-col">
              {msgs.length === 0 && (
                <div className="text-center py-10 text-[#3B506D]/70">
                  <span className="text-3xl block mb-2">🌐</span>
                  <p className="text-xs">Vista Widget Web — enviá un mensaje para probar</p>
                </div>
              )}
              {msgs.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[78%] px-4 py-2.5 text-sm leading-relaxed rounded-2xl ${
                    m.role === "user"
                      ? "self-end ml-auto text-white rounded-br-sm"
                      : "self-start bg-white text-[#031E43] rounded-bl-sm shadow-sm border border-[#DDDFE2]/40"
                  }`}
                  style={m.role === "user" ? { background: "#031E43" } : {}}
                >
                  {m.content}
                </div>
              ))}
              {loading && (
                <div className="self-start bg-white px-4 py-2.5 rounded-2xl rounded-bl-sm shadow-sm border border-[#DDDFE2]/40">
                  <span className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="w-1.5 h-1.5 bg-[#3B506D]/70 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </span>
                </div>
              )}
              <div ref={endRef} />
            </div>
          </div>
        )}

        {/* Input */}
        <div className={`p-3 border-t flex gap-2 ${isWA ? "border-silver/15 bg-[#0b1116]" : "border-[#DDDFE2] bg-white"}`}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="Escribí en español…"
            className={`flex-1 border rounded-xl px-3 py-2.5 text-sm placeholder:text-opacity-40 focus:outline-none transition-all ${
              isWA
                ? "bg-navy-3 border-silver/20 text-white placeholder:text-cool-steel/45 focus:border-cl-accent"
                : "bg-[#FDFDFB] border-[#DDDFE2] text-[#031E43] placeholder:text-[#3B506D]/70 focus:border-blue-400"
            }`}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-50 transition-all text-white"
            style={{ background: isWA ? "#00a884" : "#031E43" }}
          >
            {loading ? <i className="ti ti-loader-2 animate-spin text-sm" /> : <i className="ti ti-send text-sm" />}
          </button>
        </div>
      </Card>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   TAB 5 — Widget Web
══════════════════════════════════════════════════════════ */
function TabWidget({ cfg, saveConfig }: { cfg: ChatbotConfig; saveConfig: ReturnType<typeof useMutation<unknown, Error, Partial<ChatbotConfig>>> }) {
  const [name, setName] = useState(cfg.widgetName ?? "Asistente");
  const [color, setColor] = useState(cfg.widgetColor ?? "#031E43");
  const [welcome, setWelcome] = useState(cfg.widgetWelcome ?? "¡Hola! ¿En qué te puedo ayudar hoy? 👋");
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setName(cfg.widgetName ?? "Asistente");
    setColor(cfg.widgetColor ?? "#031E43");
    setWelcome(cfg.widgetWelcome ?? "¡Hola! ¿En qué te puedo ayudar hoy? 👋");
  }, [cfg]);

  const embedCode = cfg.widgetToken
    ? `<script src="${window.location.origin}/api/widget/${cfg.widgetToken}/widget.js" async></script>`
    : "<!-- Guardá la configuración para generar el token -->";

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      await saveConfig.mutateAsync({ widgetName: name, widgetColor: color, widgetWelcome: welcome });
      setToast({ msg: "Widget actualizado", type: "ok" });
      setTimeout(() => setToast(null), 3000);
    } catch {
      setToast({ msg: "Error al guardar", type: "err" });
    }
  }

  function copyEmbed() {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-3xl">
      <Card className="space-y-5">
        <div>
          <Label>Nombre del chatbot</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Asistente" />
        </div>
        <div>
          <Label>Color del widget</Label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-10 h-10 rounded-lg border border-silver/20 bg-transparent cursor-pointer"
            />
            <Input value={color} onChange={(e) => setColor(e.target.value)} className="w-36" placeholder="#031E43" />
            <div className="w-10 h-10 rounded-xl border border-silver/20 flex-shrink-0" style={{ background: color }} />
          </div>
        </div>
        <div>
          <Label>Mensaje de bienvenida</Label>
          <Input value={welcome} onChange={(e) => setWelcome(e.target.value)} placeholder="¡Hola! ¿En qué te puedo ayudar?" />
        </div>
      </Card>

      {/* Embed code */}
      <Card className="space-y-3">
        <Label>📋 Código de instalación</Label>
        <p className="text-xs text-cool-steel">Pegá este script antes de cerrar el <code className="bg-silver/15 px-1 rounded">&lt;/body&gt;</code> de tu sitio web.</p>
        <div className="relative">
          <pre className="bg-navy-3 border border-silver/20 rounded-xl px-4 py-3 text-xs text-cl-accent overflow-x-auto whitespace-pre-wrap break-all">
            {embedCode}
          </pre>
          <button
            type="button"
            onClick={copyEmbed}
            className="absolute top-2 right-2 text-xs font-bold px-2.5 py-1 bg-silver/15 hover:bg-white/20 rounded-lg transition-all flex items-center gap-1"
          >
            <i className={`ti ${copied ? "ti-check text-cl-accent" : "ti-copy"}`} />
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>
        {cfg.widgetToken && (
          <p className="text-[11px] text-cool-steel/55">Token: <span className="font-mono text-cool-steel">{cfg.widgetToken}</span></p>
        )}
      </Card>

      <div className="flex items-center gap-4">
        <SaveBtn loading={saveConfig.isPending} />
        {toast && <Toast msg={toast.msg} type={toast.type} />}
      </div>
    </form>
  );
}

/* ══════════════════════════════════════════════════════════
   TAB 6 — Guardrails
══════════════════════════════════════════════════════════ */
function TabGuardrails({ cfg, saveConfig }: { cfg: ChatbotConfig; saveConfig: ReturnType<typeof useMutation<unknown, Error, Partial<ChatbotConfig>>> }) {
  const parseGr = (): GuardrailsConfig => {
    try { return cfg.guardrailsJson ? JSON.parse(cfg.guardrailsJson) : DEFAULT_GR; }
    catch { return DEFAULT_GR; }
  };

  const [gr, setGr] = useState<GuardrailsConfig>(parseGr);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  useEffect(() => { setGr(parseGr()); }, [cfg.guardrailsJson]);

  const ITEMS: { key: keyof GuardrailsConfig; label: string; desc: string }[] = [
    { key: "promptInjectionShield",    label: "🛡️ Escudo de prompt injection",    desc: "Bloquea intentos de sobrescribir el comportamiento del bot" },
    { key: "piiRedaction",             label: "🔒 Redacción de datos personales",  desc: "Detecta y oculta CUIL, emails, teléfonos en respuestas del bot" },
    { key: "contentFilter",            label: "🚫 Filtro de contenido",            desc: "Previene respuestas inapropiadas o fuera de contexto del negocio" },
    { key: "ragHallucinationThreshold",label: "🧠 Umbral de alucinación RAG",      desc: "Escala a humano cuando el bot no tiene suficiente contexto" },
  ];

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      await saveConfig.mutateAsync({ guardrailsJson: JSON.stringify(gr) });
      setToast({ msg: "Guardrails guardados", type: "ok" });
      setTimeout(() => setToast(null), 3000);
    } catch {
      setToast({ msg: "Error al guardar", type: "err" });
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
      <Card className="space-y-5">
        {ITEMS.map((item) => (
          <Toggle
            key={item.key}
            checked={gr[item.key] as boolean}
            onChange={(v) => setGr((g) => ({ ...g, [item.key]: v }))}
            label={item.label}
            description={item.desc}
          />
        ))}
        <div className="pt-2 border-t border-silver/15">
          <Label>Palabras bloqueadas (separadas por coma)</Label>
          <Input
            value={gr.bannedWords}
            onChange={(e) => setGr((g) => ({ ...g, bannedWords: e.target.value }))}
            placeholder="competidor1, palabra-sensible, …"
          />
          <p className="text-xs text-cool-steel/55 mt-1">El bot no usará estas palabras en sus respuestas.</p>
        </div>
      </Card>
      <div className="flex items-center gap-4">
        <SaveBtn loading={saveConfig.isPending} />
        {toast && <Toast msg={toast.msg} type={toast.type} />}
      </div>
    </form>
  );
}

/* ══════════════════════════════════════════════════════════
   TAB 7 — Horarios de atención
══════════════════════════════════════════════════════════ */
function TabHours({ cfg, saveConfig }: { cfg: ChatbotConfig; saveConfig: ReturnType<typeof useMutation<unknown, Error, Partial<ChatbotConfig>>> }) {
  const parseBh = (): BusinessHours => {
    try { return cfg.businessHoursJson ? JSON.parse(cfg.businessHoursJson) : DEFAULT_BH; }
    catch { return DEFAULT_BH; }
  };

  const [bh, setBh] = useState<BusinessHours>(parseBh);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  useEffect(() => { setBh(parseBh()); }, [cfg.businessHoursJson]);

  function setDay(key: string, field: "open" | "close" | "active", value: string | boolean) {
    setBh((b) => ({
      ...b,
      schedule: {
        ...b.schedule,
        [key]: { ...b.schedule[key], [field]: value },
      },
    }));
  }

  const TIMEZONES = [
    { val: "America/Argentina/Buenos_Aires", label: "Argentina (ART)" },
    { val: "America/Montevideo",             label: "Uruguay (UYT)" },
    { val: "America/Santiago",               label: "Chile (CLT)" },
    { val: "America/Bogota",                 label: "Colombia (COT)" },
    { val: "America/Mexico_City",            label: "México (CST)" },
    { val: "America/Lima",                   label: "Perú (PET)" },
    { val: "America/Caracas",                label: "Venezuela (VET)" },
    { val: "America/Sao_Paulo",              label: "Brasil (BRT)" },
    { val: "Europe/Madrid",                  label: "España (CET)" },
    { val: "UTC",                            label: "UTC" },
  ];

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      await saveConfig.mutateAsync({ businessHoursJson: JSON.stringify(bh) });
      setToast({ msg: "Horarios guardados", type: "ok" });
      setTimeout(() => setToast(null), 3000);
    } catch {
      setToast({ msg: "Error al guardar", type: "err" });
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
      {/* Enable toggle */}
      <Card>
        <Toggle
          checked={bh.enabled}
          onChange={(v) => setBh((b) => ({ ...b, enabled: v }))}
          label="🕐 Activar horarios de atención"
          description="Cuando está activo, el bot solo responde dentro del horario configurado"
        />
        {bh.enabled && (
          <div className="mt-4 bg-cl-accent/5 border border-cl-accent/15 rounded-xl px-4 py-3 text-xs text-cl-accent">
            <i className="ti ti-info-circle mr-1" />
            Fuera del horario configurado, el bot enviará el mensaje personalizado en vez de responder con IA.
          </div>
        )}
      </Card>

      {bh.enabled && (
        <>
          {/* Timezone */}
          <Card className="space-y-3">
            <Label>🌍 Zona horaria</Label>
            <select
              value={bh.timezone}
              onChange={(e) => setBh((b) => ({ ...b, timezone: e.target.value }))}
              className="w-full bg-navy-3 border border-silver/20 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cl-accent transition-all"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.val} value={tz.val}>{tz.label}</option>
              ))}
            </select>
          </Card>

          {/* Schedule */}
          <Card className="space-y-1 p-0 overflow-hidden">
            <div className="px-5 py-3 border-b border-silver/15 text-xs font-bold text-cool-steel uppercase tracking-wider">
              Horario por día
            </div>
            {DAYS.map((day) => {
              const ds = bh.schedule[day.key] ?? { open: "09:00", close: "18:00", active: false };
              return (
                <div key={day.key} className={`px-5 py-3 flex items-center gap-4 border-b border-silver/15 last:border-0 transition-all ${ds.active ? "" : "opacity-50"}`}>
                  <button
                    type="button"
                    onClick={() => setDay(day.key, "active", !ds.active)}
                    className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${ds.active ? "bg-cl-accent" : "bg-silver/15"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${ds.active ? "translate-x-4" : "translate-x-0"}`} />
                  </button>
                  <span className="text-sm font-semibold text-white w-24 flex-shrink-0">{day.label}</span>
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="time"
                      value={ds.open}
                      disabled={!ds.active}
                      onChange={(e) => setDay(day.key, "open", e.target.value)}
                      className="bg-navy-3 border border-silver/20 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-cl-accent disabled:opacity-40 w-28"
                    />
                    <span className="text-cool-steel/55 text-xs">hasta</span>
                    <input
                      type="time"
                      value={ds.close}
                      disabled={!ds.active}
                      onChange={(e) => setDay(day.key, "close", e.target.value)}
                      className="bg-navy-3 border border-silver/20 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-cl-accent disabled:opacity-40 w-28"
                    />
                  </div>
                  {!ds.active && (
                    <span className="text-[10px] font-bold text-cool-steel/45 uppercase tracking-wider flex-shrink-0">Cerrado</span>
                  )}
                </div>
              );
            })}
          </Card>

          {/* Outside hours message */}
          <Card className="space-y-3">
            <Label>💬 Mensaje fuera de horario</Label>
            <p className="text-xs text-cool-steel">El bot enviará este mensaje automáticamente cuando reciba un mensaje fuera del horario configurado.</p>
            <Textarea
              value={bh.outsideHoursMessage}
              onChange={(e) => setBh((b) => ({ ...b, outsideHoursMessage: e.target.value }))}
              rows={3}
              placeholder="¡Hola! Nuestro horario de atención es de lunes a viernes de 9 a 18hs…"
            />
            <div className="flex flex-wrap gap-2">
              {[
                "¡Hola! Nuestro horario de atención es de lunes a viernes de 9 a 18hs. Te respondemos a la brevedad. 🙏",
                "Gracias por escribirnos 😊 Estamos fuera de horario. Te contactamos cuando volvamos.",
                "¡Hola! Recibimos tu mensaje. Te respondemos en el próximo horario hábil. ¡Hasta pronto! 👋",
              ].map((preset, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setBh((b) => ({ ...b, outsideHoursMessage: preset }))}
                  className="text-xs px-3 py-1.5 bg-silver/10 border border-silver/20 rounded-lg text-cool-steel hover:text-white hover:bg-silver/15 transition-all"
                >
                  Preset {i + 1}
                </button>
              ))}
            </div>
          </Card>
        </>
      )}

      <div className="flex items-center gap-4">
        <SaveBtn loading={saveConfig.isPending} />
        {toast && <Toast msg={toast.msg} type={toast.type} />}
      </div>
    </form>
  );
}
