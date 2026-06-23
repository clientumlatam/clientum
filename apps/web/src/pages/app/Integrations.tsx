import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ServicesPage from "./Services";

interface IntegrationsData {
  evolutionApiUrl:   string;
  evolutionApiKey:   string;
  evolutionInstance: string;
  openrouterApiKey:  string;
  openaiApiKey:      string;
  googleMapsApiKey:  string;
  groqApiKey:        string;
  mpAccessToken:     string;
  mpWebhookSecret:   string;
  resendApiKey:      string;
  resendFrom:        string;
  smtpHost:          string;
  smtpPort:          string;
  smtpUser:          string;
  smtpPass:          string;
  smtpFrom:          string;
}

async function apiFetch(url: string, opts?: RequestInit) {
  const r = await fetch(url, { credentials: "include", ...opts });
  if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`);
  return r.json();
}

function maskKey(val: string) {
  if (!val) return "";
  if (val.length <= 8) return "•".repeat(val.length);
  return val.slice(0, 4) + "•".repeat(Math.min(val.length - 8, 24)) + val.slice(-4);
}

interface IntegrationField {
  key: keyof IntegrationsData;
  label: string;
  placeholder: string;
  hint?: string;
  isUrl?: boolean;
}

interface IntegrationCard {
  id: string;
  name: string;
  icon: string;
  iconColor: string;
  badge?: string;
  badgeColor?: string;
  description: string;
  docsUrl?: string;
  fields: IntegrationField[];
}

const INTEGRATIONS: IntegrationCard[] = [
  {
    id: "evolution",
    name: "Evolution API",
    icon: "ti-brand-whatsapp",
    iconColor: "text-emerald-400 bg-emerald-400/10",
    badge: "WhatsApp Gateway",
    badgeColor: "bg-emerald-500/15 text-emerald-400",
    description: "Conecta tu instancia de WhatsApp para que el bot pueda enviar y recibir mensajes.",
    docsUrl: "https://doc.evolution-api.com",
    fields: [
      { key: "evolutionApiUrl",   label: "URL de la API",     placeholder: "https://api.tudominio.com",    isUrl: true },
      { key: "evolutionApiKey",   label: "API Key",           placeholder: "tu-evolution-api-key" },
      { key: "evolutionInstance", label: "Nombre de instancia", placeholder: "mi-instancia" },
    ],
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    icon: "ti-circuit-diode",
    iconColor: "text-violet-400 bg-violet-400/10",
    badge: "IA principal",
    badgeColor: "bg-violet-500/15 text-violet-400",
    description: "Acceso a modelos de IA (Llama, Gemma, Nemotron…). Si no configurás una key propia, se usa la clave global de Clientum.",
    docsUrl: "https://openrouter.ai/keys",
    fields: [
      { key: "openrouterApiKey", label: "API Key", placeholder: "sk-or-v1-…", hint: "Opcional — si se deja vacío, usa la key global de Clientum" },
    ],
  },
  {
    id: "openai",
    name: "OpenAI",
    icon: "ti-brand-openai",
    iconColor: "text-emerald-300 bg-emerald-300/10",
    badge: "IA alternativa",
    badgeColor: "bg-[#3B506D]/15 text-[#3B506D]/70",
    description: "Provider alternativo. Requiere plan con OpenAI y seleccionar el provider en la configuración del agente.",
    docsUrl: "https://platform.openai.com/api-keys",
    fields: [
      { key: "openaiApiKey", label: "API Key", placeholder: "sk-…" },
    ],
  },
  {
    id: "googlemaps",
    name: "Google Maps / Places",
    icon: "ti-map-search",
    iconColor: "text-amber-400 bg-amber-400/10",
    badge: "Prospector",
    badgeColor: "bg-amber-500/15 text-amber-400",
    description: "Opcional: el Prospector ya funciona gratis con OpenStreetMap sin ninguna key. Con esta key de Google Maps obtenés resultados más ricos (ratings, reseñas, estado del local).",
    docsUrl: "https://console.cloud.google.com/apis/credentials",
    fields: [
      { key: "googleMapsApiKey", label: "API Key (Places New)", placeholder: "AIza…", hint: "Activar: Places API (New) en Google Cloud Console" },
    ],
  },
  {
    id: "groq",
    name: "Groq (Whisper)",
    icon: "ti-microphone",
    iconColor: "text-orange-400 bg-orange-400/10",
    badge: "Transcripción de audio",
    badgeColor: "bg-orange-500/15 text-orange-400",
    description: "Transcripción de notas de voz de WhatsApp vía Whisper Large v3. Sin esta key, el bot pide que el usuario escriba en texto.",
    docsUrl: "https://console.groq.com/keys",
    fields: [
      { key: "groqApiKey", label: "API Key", placeholder: "gsk_…" },
    ],
  },
  {
    id: "mercadopago",
    name: "MercadoPago",
    icon: "ti-credit-card",
    iconColor: "text-sky-400 bg-sky-400/10",
    badge: "Pagos",
    badgeColor: "bg-sky-500/15 text-sky-400",
    description: "Recibí pagos de tus clientes a través de tu propia cuenta de MercadoPago. Usada para el catálogo digital y el bot de ventas.",
    docsUrl: "https://www.mercadopago.com.ar/developers/panel/app",
    fields: [
      {
        key: "mpAccessToken",
        label: "Access Token",
        placeholder: "APP_USR-… (prod) o TEST-… (sandbox)",
        hint: "Obtener en: MercadoPago Developers → Credenciales de producción",
      },
      {
        key: "mpWebhookSecret",
        label: "Webhook Secret",
        placeholder: "openssl rand -hex 32",
        hint: "Generá uno con: openssl rand -hex 32 — necesario para verificar pagos reales",
      },
    ],
  },
  {
    id: "resend",
    name: "Resend",
    icon: "ti-mail",
    iconColor: "text-indigo-400 bg-indigo-400/10",
    badge: "Email transaccional",
    badgeColor: "bg-indigo-500/15 text-indigo-400",
    description: "Enviá emails desde tu propia cuenta Resend (confirmaciones de turno, bienvenida, etc.). Gratis hasta 3.000 mails/mes.",
    docsUrl: "https://resend.com",
    fields: [
      {
        key: "resendApiKey",
        label: "API Key",
        placeholder: "re_…",
        hint: "Obtener en: resend.com → API Keys",
      },
      {
        key: "resendFrom",
        label: "Remitente (From)",
        placeholder: "Tu Negocio <hola@tudominio.com>",
        hint: "El dominio debe estar verificado en Resend",
        isUrl: false,
      },
    ],
  },
  {
    id: "smtp",
    name: "SMTP propio",
    icon: "ti-server",
    iconColor: "text-[#3B506D]/70 bg-[#3B506D]/70/10",
    badge: "Email alternativo",
    badgeColor: "bg-[#3B506D]/15 text-[#3B506D]/70",
    description: "Alternativa a Resend. Usá tu propio servidor SMTP (Gmail, Brevo, Hostinger, etc.) para enviar emails desde tu cuenta.",
    docsUrl: "https://support.google.com/mail/answer/185833",
    fields: [
      { key: "smtpHost", label: "Host SMTP", placeholder: "smtp.gmail.com", isUrl: false },
      { key: "smtpPort", label: "Puerto", placeholder: "587" },
      { key: "smtpUser", label: "Usuario", placeholder: "tunegocio@gmail.com" },
      { key: "smtpPass", label: "Contraseña / App password", placeholder: "xxxx xxxx xxxx xxxx" },
      { key: "smtpFrom", label: "Remitente (From)", placeholder: "Tu Negocio <tunegocio@gmail.com>", hint: "Dejalo vacío para usar el mismo usuario" },
    ],
  },
];

function StatusDot({ hasValue }: { hasValue: boolean }) {
  return (
    <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${hasValue ? "bg-emerald-400" : "bg-silver/30"}`} />
  );
}

function IntegrationCardComponent({
  card,
  values,
  onSave,
  isSaving,
}: {
  card: IntegrationCard;
  values: IntegrationsData;
  onSave: (fields: Partial<IntegrationsData>) => void;
  isSaving: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<IntegrationsData>>({});
  const [showKeys, setShowKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (editing) {
      const initial: Partial<IntegrationsData> = {};
      for (const f of card.fields) initial[f.key] = values[f.key] ?? "";
      setDraft(initial);
    }
  }, [editing]);

  const allConfigured = card.fields.every((f) => !!values[f.key]);
  const anyConfigured = card.fields.some((f) => !!values[f.key]);

  function toggleShow(key: string) {
    setShowKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  async function handleSave() {
    onSave(draft);
    setEditing(false);
  }

  return (
    <div className="bg-white border border-[#DDDFE2] rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-[#DDDFE2] bg-[#FDFDFB]">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${card.iconColor}`}>
            <i className={`ti ${card.icon} text-xl`} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-[#031E43]">{card.name}</h3>
              {card.badge && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${card.badgeColor}`}>{card.badge}</span>
              )}
              <StatusDot hasValue={anyConfigured} />
              {allConfigured && (
                <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
                  <i className="ti ti-check text-xs" /> Configurado
                </span>
              )}
            </div>
            <p className="text-xs text-[#3B506D] mt-0.5 leading-snug max-w-lg">{card.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {card.docsUrl && (
            <a
              href={card.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#3B506D] hover:text-[#031E43] text-xs flex items-center gap-1"
              title="Documentación"
            >
              <i className="ti ti-external-link text-sm" />
            </a>
          )}
          <button
            onClick={() => setEditing((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              editing
                ? "bg-[#DDDFE2]/40 text-[#3B506D] hover:bg-[#DDDFE2]"
                : "bg-[#031E43] text-white hover:bg-[#3B506D]"
            }`}
          >
            <i className={`ti ${editing ? "ti-x" : "ti-edit"} text-sm`} />
            {editing ? "Cancelar" : "Configurar"}
          </button>
        </div>
      </div>

      {/* Fields — display mode */}
      {!editing && (
        <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {card.fields.map((f) => {
            const val = values[f.key] ?? "";
            const visible = showKeys.has(f.key);
            return (
              <div key={f.key} className="space-y-1">
                <div className="text-[10px] font-bold text-[#3B506D] uppercase tracking-wider">{f.label}</div>
                {val ? (
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-[#031E43] bg-[#FDFDFB] border border-[#DDDFE2] rounded px-2 py-1 flex-1 truncate">
                      {visible ? val : maskKey(val)}
                    </span>
                    <button
                      onClick={() => toggleShow(f.key)}
                      className="text-[#3B506D] hover:text-[#031E43] flex-shrink-0"
                      title={visible ? "Ocultar" : "Mostrar"}
                    >
                      <i className={`ti ${visible ? "ti-eye-off" : "ti-eye"} text-sm`} />
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-[#3B506D]/70 italic">No configurado</span>
                )}
                {f.hint && !val && (
                  <p className="text-[10px] text-amber-600">{f.hint}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Fields — edit mode */}
      {editing && (
        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {card.fields.map((f) => (
              <div key={f.key} className="space-y-1">
                <label className="text-xs font-bold text-[#031E43]">{f.label}</label>
                <input
                  type={f.isUrl ? "url" : "text"}
                  value={draft[f.key] ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  autoComplete="off"
                  className="w-full font-mono text-xs border border-[#DDDFE2] rounded-lg px-3 py-2 text-[#031E43] bg-white focus:outline-none focus:border-[#031E43] placeholder:text-[#DDDFE2] transition-colors"
                />
                {f.hint && (
                  <p className="text-[10px] text-[#3B506D]">{f.hint}</p>
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#031E43] text-white text-xs font-bold rounded-lg hover:bg-[#3B506D] transition-colors disabled:opacity-50"
            >
              {isSaving ? <><i className="ti ti-loader-2 animate-spin text-sm" /> Guardando…</> : <><i className="ti ti-device-floppy text-sm" /> Guardar</>}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="px-4 py-2 text-xs font-semibold text-[#3B506D] border border-[#DDDFE2] rounded-lg hover:bg-[#FDFDFB] transition-colors"
            >
              Cancelar
            </button>
            {card.fields.every((f) => !!values[f.key]) && (
              <button
                onClick={() => {
                  const clear: Partial<IntegrationsData> = {};
                  for (const f of card.fields) clear[f.key] = "";
                  onSave(clear);
                  setEditing(false);
                }}
                className="ml-auto text-[10px] text-red-400 hover:text-red-600 flex items-center gap-1"
              >
                <i className="ti ti-trash text-xs" /> Limpiar keys
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function IntegrationsPage() {
  const qc = useQueryClient();
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [mainTab, setMainTab] = useState<"apikeys" | "servicios">("apikeys");

  const { data, isLoading } = useQuery<IntegrationsData>({
    queryKey: ["integrations"],
    queryFn: () => apiFetch("/api/integrations"),
  });

  const saveMutation = useMutation<{ ok: boolean }, Error, Partial<IntegrationsData>>({
    mutationFn: (fields) =>
      apiFetch("/api/integrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      }),
    onSuccess: (_, fields) => {
      qc.invalidateQueries({ queryKey: ["integrations"] });
      const names = INTEGRATIONS
        .filter((c) => c.fields.some((f) => f.key in fields))
        .map((c) => c.name)
        .join(", ");
      setSavedMsg(`${names} actualizado correctamente`);
      setTimeout(() => setSavedMsg(null), 4000);
    },
  });

  const values: IntegrationsData = data ?? {
    evolutionApiUrl: "", evolutionApiKey: "", evolutionInstance: "",
    openrouterApiKey: "", openaiApiKey: "", googleMapsApiKey: "", groqApiKey: "",
    mpAccessToken: "", mpWebhookSecret: "",
    resendApiKey: "", resendFrom: "",
    smtpHost: "", smtpPort: "", smtpUser: "", smtpPass: "", smtpFrom: "",
  };

  const configuredCount = INTEGRATIONS.filter((c) =>
    c.fields.some((f) => !!values[f.key])
  ).length;

  const TAB_BTN = (id: "apikeys" | "servicios", label: string, icon: string) => (
    <button
      onClick={() => setMainTab(id)}
      className={`flex items-center gap-2 px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${mainTab === id ? "bg-[#031E43]/10 text-[#031E43]" : "text-[#3B506D] hover:text-[#031E43]"}`}
    >
      <i className={`ti ${icon} text-base`} />{label}
    </button>
  );

  if (mainTab === "servicios") {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b border-[#DDDFE2] bg-white px-6 py-2.5 flex items-center gap-2 flex-shrink-0">
          {TAB_BTN("apikeys", "API Keys", "ti-plug-connected")}
          {TAB_BTN("servicios", "Mis Servicios", "ti-apps")}
        </div>
        <div className="flex-1 overflow-auto">
          <ServicesPage />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <i className="ti ti-loader-2 animate-spin text-2xl text-[#031E43]/30" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Tab switcher */}
      <div className="flex items-center gap-2 pb-4 border-b border-[#DDDFE2]">
        {TAB_BTN("apikeys", "API Keys", "ti-plug-connected")}
        {TAB_BTN("servicios", "Mis Servicios", "ti-apps")}
      </div>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-[#031E43]">Integraciones & API Keys</h2>
          <p className="text-sm text-[#3B506D] mt-0.5">
            Configurá las claves de cada servicio que usa Clientum para tu cuenta
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-[#DDDFE2] rounded-xl px-4 py-2.5 text-sm shadow-sm">
          <i className="ti ti-plug-connected text-[#031E43]" />
          <span className="font-bold text-[#031E43]">{configuredCount}</span>
          <span className="text-[#3B506D]">/ {INTEGRATIONS.length} configuradas</span>
        </div>
      </div>

      {/* Banner de guardado */}
      {savedMsg && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-4 py-3 text-sm">
          <i className="ti ti-circle-check text-emerald-500 text-lg flex-shrink-0" />
          <span className="flex-1">{savedMsg}</span>
          <button onClick={() => setSavedMsg(null)} className="text-emerald-400 hover:text-emerald-600">
            <i className="ti ti-x text-sm" />
          </button>
        </div>
      )}

      {saveMutation.error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <i className="ti ti-alert-triangle text-base flex-shrink-0" />
          Error al guardar: {(saveMutation.error as Error).message}
        </div>
      )}

      {/* Info banner */}
      <div className="bg-[#031E43]/4 border border-[#031E43]/10 rounded-xl px-4 py-3 text-xs text-[#3B506D] flex items-start gap-2">
        <i className="ti ti-shield-lock text-[#031E43]/50 text-sm flex-shrink-0 mt-0.5" />
        <span>
          Las API keys se almacenan encriptadas en tu cuenta y <strong>nunca se comparten entre usuarios</strong>.
          Podés limpiar cualquier key en cualquier momento. Las claves de OpenRouter y Evolution API también se pueden configurar desde el{" "}
          <a href="/app/agent" className="text-[#031E43] font-semibold hover:underline">Configurador de Agente IA</a>.
        </span>
      </div>

      {/* Cards */}
      <div className="space-y-4">
        {INTEGRATIONS.map((card) => (
          <IntegrationCardComponent
            key={card.id}
            card={card}
            values={values}
            onSave={(fields) => saveMutation.mutate(fields)}
            isSaving={saveMutation.isPending}
          />
        ))}
      </div>

      {/* MCP Server Section */}
      <div className="mt-8">
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-lg font-bold text-[#031E43]">Servidor MCP — Agentes IA externos</h3>
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-violet-100 text-violet-700">Model Context Protocol</span>
        </div>
        <p className="text-sm text-[#3B506D] mb-4">
          Clientum expone un servidor MCP compatible con Claude Desktop, Cursor, y cualquier cliente MCP. Los agentes externos pueden leer y escribir datos de tu cuenta (leads, turnos, contactos) en lenguaje natural.
        </p>

        <div className="bg-white border border-[#DDDFE2] rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-start gap-4 px-5 py-4 border-b border-[#DDDFE2] bg-[#FDFDFB]">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
              <i className="ti ti-robot text-xl text-violet-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-bold text-[#031E43]">Clientum MCP Server</h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">Activo</span>
              </div>
              <p className="text-xs text-[#3B506D] mt-0.5">Protocolo: MCP 2025-03-26 (StreamableHTTP) · Autenticación: Bearer token o sesión activa</p>
            </div>
          </div>

          <div className="p-5 space-y-5">
            {/* Endpoint */}
            <div>
              <p className="text-xs font-bold text-[#031E43] mb-2">Endpoint del servidor</p>
              <div className="flex items-center gap-2 bg-[#FDFDFB] border border-[#DDDFE2] rounded-lg px-3 py-2">
                <code className="text-xs font-mono text-[#031E43] flex-1 select-all">{window.location.origin}/mcp</code>
                <button
                  onClick={() => navigator.clipboard.writeText(`${window.location.origin}/mcp`)}
                  className="text-[#3B506D] hover:text-[#031E43] flex-shrink-0"
                  title="Copiar URL"
                >
                  <i className="ti ti-copy text-sm" />
                </button>
              </div>
            </div>

            {/* Tools */}
            <div>
              <p className="text-xs font-bold text-[#031E43] mb-2">Tools disponibles</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {[
                  { name: "list_leads",              icon: "ti-users",           desc: "Listar leads con filtros" },
                  { name: "create_lead",             icon: "ti-user-plus",       desc: "Crear lead en CRM" },
                  { name: "update_lead_stage",       icon: "ti-arrows-exchange", desc: "Mover lead de etapa" },
                  { name: "list_appointments",       icon: "ti-calendar",        desc: "Ver turnos agendados" },
                  { name: "create_appointment",      icon: "ti-calendar-plus",   desc: "Agendar nuevo turno" },
                  { name: "get_crm_summary",         icon: "ti-chart-bar",       desc: "Resumen del pipeline" },
                  { name: "get_appointments_summary", icon: "ti-clock",          desc: "Próximos turnos" },
                ].map(t => (
                  <div key={t.name} className="bg-[#FDFDFB] border border-[#DDDFE2] rounded-lg p-2.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <i className={`ti ${t.icon} text-sm text-violet-600`} />
                      <code className="text-[10px] font-mono font-bold text-[#031E43]">{t.name}</code>
                    </div>
                    <p className="text-[10px] text-[#3B506D]">{t.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Claude Desktop config */}
            <div>
              <p className="text-xs font-bold text-[#031E43] mb-2">Configurar en Claude Desktop</p>
              <div className="bg-[#031E43] rounded-lg p-4 overflow-x-auto">
                <pre className="text-xs text-emerald-300 font-mono whitespace-pre">{JSON.stringify({
                  mcpServers: {
                    clientum: {
                      type: "http",
                      url: `${window.location.origin}/mcp`,
                      headers: { Authorization: "Bearer TU_MCP_API_KEY" },
                    },
                  },
                }, null, 2)}</pre>
              </div>
              <p className="text-[10px] text-[#3B506D] mt-1.5">
                Reemplazá <code className="font-mono bg-[#DDDFE2]/40 px-1 rounded">TU_MCP_API_KEY</code> con el valor del secret <strong>MCP_API_KEY</strong> configurado en tu entorno. Sin esa key, también podés conectarte directamente si tenés sesión activa.
              </p>
            </div>

            {/* Links */}
            <div className="flex items-center gap-3 pt-1 border-t border-[#DDDFE2]">
              <a href="/api/mcp/tools" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-violet-700 hover:text-violet-900 font-semibold">
                <i className="ti ti-list text-sm" /> Ver tools completas
              </a>
              <a href="https://modelcontextprotocol.io/docs" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-[#3B506D] hover:text-[#031E43]">
                <i className="ti ti-external-link text-sm" /> Documentación MCP
              </a>
              <a href="https://wa.me/5492984510883?text=Quiero%20configurar%20el%20servidor%20MCP%20de%20Clientum" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-900">
                <i className="ti ti-brand-whatsapp text-sm" /> Soporte
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
