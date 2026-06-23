import { useState, useRef, useEffect } from "react";
import AutomationsPage from "./Automations";
import FormsPage from "./Forms";
import TablesPage from "./Tables";
import PagesPage from "./Pages";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  ts: number;
};

type AppCard = {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  createdAt: string;
  status: "active" | "draft";
};

const DEMO_APPS: AppCard[] = [
  {
    id: "1",
    name: "Calculadora de Presupuestos",
    description: "Calculá automáticamente presupuestos con impuestos y descuentos",
    icon: "ti-calculator",
    color: "from-emerald-500/20 to-teal-500/10",
    createdAt: "Hace 2 días",
    status: "active",
  },
  {
    id: "2",
    name: "Seguimiento de Entregas",
    description: "Rastreá el estado de tus envíos en tiempo real",
    icon: "ti-truck-delivery",
    color: "from-blue-500/20 to-indigo-500/10",
    createdAt: "Hace 5 días",
    status: "active",
  },
  {
    id: "3",
    name: "Encuesta de Satisfacción",
    description: "Recolectá feedback de clientes con formulario inteligente",
    icon: "ti-star",
    color: "from-yellow-500/20 to-orange-500/10",
    createdAt: "Hace 1 semana",
    status: "draft",
  },
];

const SUGGESTIONS = [
  "Crear una app para gestionar reservas de clientes",
  "Hacer un portal de seguimiento de pedidos",
  "Generar un formulario de cotización automática",
  "Construir un dashboard de métricas de ventas",
  "Crear una agenda para mis empleados",
  "Hacer un catálogo interactivo de productos",
];

const ASSISTANT_REPLIES: Record<string, string> = {
  default: `Perfecto, voy a analizar tu pedido y generar la estructura de la app. Esto incluye:\n\n• **Interfaz de usuario** — pantallas y flujos de navegación\n• **Lógica de negocio** — reglas y validaciones\n• **Base de datos** — tablas y relaciones\n• **Integraciones** — WhatsApp, email, y más\n\n¿Querés que incluya notificaciones automáticas por WhatsApp cuando haya actividad?`,
  reservas: `Generando la app de **Gestión de Reservas** ✓\n\nEstructura creada:\n\n📋 **Pantallas:**\n- Panel de reservas con calendario\n- Formulario de nueva reserva\n- Vista de disponibilidad\n- Confirmaciones automáticas\n\n🗄️ **Datos:**\n- Tabla \`reservas\` (id, cliente, fecha, servicio, estado)\n- Tabla \`clientes\` (id, nombre, teléfono, email)\n\n🔗 **Integraciones:**\n- WhatsApp: confirmación automática al cliente\n- Email: recordatorio 24hs antes\n\n¿Querés personalizar los campos o ajustar algo?`,
  pedidos: `Generando el **Portal de Seguimiento de Pedidos** ✓\n\nEstructura creada:\n\n📋 **Pantallas:**\n- Dashboard con estado de pedidos en tiempo real\n- Vista detalle de pedido\n- Historial del cliente\n- Panel de actualización para el equipo\n\n🗄️ **Datos:**\n- Tabla \`pedidos\` (id, número, cliente, estado, items, total)\n- Estados: Recibido → En preparación → En camino → Entregado\n\n🔗 **Integraciones:**\n- WhatsApp: notificación automática al cambiar estado\n- Link público de seguimiento por cliente\n\n¿Agregamos un mapa de seguimiento de la entrega?`,
};

function getReply(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes("reserva")) return ASSISTANT_REPLIES.reservas;
  if (lower.includes("pedido") || lower.includes("seguimiento") || lower.includes("entrega"))
    return ASSISTANT_REPLIES.pedidos;
  return ASSISTANT_REPLIES.default;
}

export default function BuilderPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "0",
      role: "assistant",
      content: `¡Hola! Soy tu constructor de apps con IA. Describime qué herramienta necesitás para tu negocio y la genero automáticamente.\n\nPuedo crear **dashboards**, **formularios**, **portales de clientes**, **trackers de pedidos**, **agendas**, y mucho más. Todo listo para usar, sin código.`,
      ts: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "apps" | "automatizaciones" | "formularios" | "tablas" | "paginas">("chat");
  const [discussionMode, setDiscussionMode] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: msg, ts: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    setTimeout(() => {
      const reply: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: getReply(msg),
        ts: Date.now(),
      };
      setMessages((prev) => [...prev, reply]);
      setLoading(false);
    }, 1200);
  }

  function renderContent(text: string) {
    const lines = text.split("\n");
    return lines.map((line, i) => {
      const parts = line.split(/\*\*(.*?)\*\*/g);
      return (
        <p key={i} className={line === "" ? "mt-2" : "leading-relaxed"}>
          {parts.map((part, j) =>
            j % 2 === 1 ? <strong key={j} className="text-cl-accent font-semibold">{part}</strong> : part
          )}
        </p>
      );
    });
  }

  return (
    <div className="flex h-full">
      <div className="flex flex-col flex-1 min-w-0">
        <div className="border-b border-silver/15 px-6 py-3 flex items-center gap-4 bg-navy-2 flex-shrink-0">
          <button
            onClick={() => setActiveTab("chat")}
            className={`text-sm font-semibold px-4 py-1.5 rounded-lg transition-all ${
              activeTab === "chat"
                ? "bg-cl-accent/10 text-cl-accent"
                : "text-cool-steel hover:text-white"
            }`}
          >
            <i className="ti ti-message-bolt mr-1.5" />
            Chat Constructor
          </button>
          <button
            onClick={() => setActiveTab("apps")}
            className={`text-sm font-semibold px-4 py-1.5 rounded-lg transition-all ${
              activeTab === "apps"
                ? "bg-cl-accent/10 text-cl-accent"
                : "text-cool-steel hover:text-white"
            }`}
          >
            <i className="ti ti-apps mr-1.5" />
            Mis Apps ({DEMO_APPS.length})
          </button>
          <button
            onClick={() => setActiveTab("automatizaciones")}
            className={`text-sm font-semibold px-4 py-1.5 rounded-lg transition-all ${activeTab === "automatizaciones" ? "bg-cl-accent/10 text-cl-accent" : "text-cool-steel hover:text-white"}`}
          >
            <i className="ti ti-bolt mr-1.5" />Automatizaciones
          </button>
          <button
            onClick={() => setActiveTab("formularios")}
            className={`text-sm font-semibold px-4 py-1.5 rounded-lg transition-all ${activeTab === "formularios" ? "bg-cl-accent/10 text-cl-accent" : "text-cool-steel hover:text-white"}`}
          >
            <i className="ti ti-forms mr-1.5" />Formularios
          </button>
          <button
            onClick={() => setActiveTab("tablas")}
            className={`text-sm font-semibold px-4 py-1.5 rounded-lg transition-all ${activeTab === "tablas" ? "bg-cl-accent/10 text-cl-accent" : "text-cool-steel hover:text-white"}`}
          >
            <i className="ti ti-table mr-1.5" />Tablas
          </button>
          <button
            onClick={() => setActiveTab("paginas")}
            className={`text-sm font-semibold px-4 py-1.5 rounded-lg transition-all ${activeTab === "paginas" ? "bg-cl-accent/10 text-cl-accent" : "text-cool-steel hover:text-white"}`}
          >
            <i className="ti ti-layout-2 mr-1.5" />Páginas
          </button>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-cool-steel">Modo discusión</span>
            <button
              onClick={() => setDiscussionMode((v) => !v)}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                discussionMode ? "bg-cl-accent" : "bg-silver/15"
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${
                  discussionMode ? "left-5.5" : "left-0.5"
                }`}
                style={{ left: discussionMode ? "calc(100% - 18px)" : "2px" }}
              />
            </button>
          </div>
        </div>

        {activeTab === "chat" ? (
          <div className="flex flex-col flex-1 min-h-0">
            {discussionMode && (
              <div className="mx-6 mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-center gap-2 text-xs text-yellow-400 flex-shrink-0">
                <i className="ti ti-bulb text-base" />
                <span>
                  <strong>Modo Discusión activo</strong> — Explorá ideas y conceptos sin que se afecte tu proyecto en producción.
                </span>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${
                      m.role === "assistant"
                        ? "bg-cl-accent/20 text-cl-accent"
                        : "bg-silver/15 text-white"
                    }`}
                  >
                    <i className={m.role === "assistant" ? "ti ti-robot" : "ti ti-user"} />
                  </div>
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm space-y-0.5 ${
                      m.role === "assistant"
                        ? "bg-navy-2 text-white/90 rounded-tl-sm"
                        : "bg-cl-accent/10 text-white border border-cl-accent/20 rounded-tr-sm"
                    }`}
                  >
                    {renderContent(m.content)}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-cl-accent/20 flex items-center justify-center flex-shrink-0">
                    <i className="ti ti-robot text-cl-accent text-sm" />
                  </div>
                  <div className="bg-navy-2 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="w-1.5 h-1.5 bg-cl-accent/60 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {messages.length === 1 && (
              <div className="px-6 pb-4 flex-shrink-0">
                <p className="text-xs text-cool-steel/55 mb-2 font-semibold uppercase tracking-wider">Sugerencias</p>
                <div className="grid grid-cols-2 gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="text-left text-xs text-cool-steel hover:text-white bg-silver/10 hover:bg-silver/15 border border-silver/15 rounded-lg px-3 py-2 transition-all"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="px-6 pb-6 flex-shrink-0">
              <div className="flex gap-2 bg-navy-2 border border-silver/20 rounded-xl p-1">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                  placeholder="Describí la app que necesitás para tu negocio..."
                  className="flex-1 bg-transparent px-3 py-2 text-sm text-white placeholder-white/30 outline-none"
                />
                <button
                  onClick={() => send()}
                  disabled={!input.trim() || loading}
                  className="bg-cl-accent text-navy font-bold px-4 py-2 rounded-lg text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-cl-accent/90 transition-all flex items-center gap-2"
                >
                  <i className="ti ti-send text-base" />
                  Generar
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-white">Mis Aplicaciones</h2>
                <p className="text-sm text-cool-steel">Apps generadas con IA para tu negocio</p>
              </div>
              <button
                onClick={() => setActiveTab("chat")}
                className="flex items-center gap-2 bg-cl-accent text-navy font-bold px-4 py-2 rounded-lg text-sm hover:bg-cl-accent/90 transition-all"
              >
                <i className="ti ti-plus text-base" />
                Nueva App
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {DEMO_APPS.map((app) => (
                <div
                  key={app.id}
                  className={`bg-gradient-to-br ${app.color} border border-silver/20 rounded-xl p-5 group hover:border-cl-accent/30 transition-all cursor-pointer`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 bg-silver/15 rounded-lg flex items-center justify-center">
                      <i className={`ti ${app.icon} text-xl text-silver`} />
                    </div>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        app.status === "active"
                          ? "bg-cl-accent/20 text-cl-accent"
                          : "bg-silver/15 text-cool-steel"
                      }`}
                    >
                      {app.status === "active" ? "Activa" : "Borrador"}
                    </span>
                  </div>
                  <h3 className="font-bold text-white text-sm mb-1">{app.name}</h3>
                  <p className="text-xs text-cool-steel mb-4">{app.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-cool-steel/55">{app.createdAt}</span>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button className="text-xs text-cool-steel hover:text-white bg-silver/10 hover:bg-silver/15 px-2 py-1 rounded-md transition-all">
                        <i className="ti ti-pencil" />
                      </button>
                      <button className="text-xs text-cl-accent hover:text-cl-accent/80 bg-cl-accent/10 hover:bg-cl-accent/20 px-2 py-1 rounded-md transition-all">
                        <i className="ti ti-external-link" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={() => setActiveTab("chat")}
                className="border-2 border-dashed border-silver/20 hover:border-cl-accent/30 rounded-xl p-5 flex flex-col items-center justify-center gap-3 text-cool-steel/55 hover:text-cl-accent transition-all min-h-[160px]"
              >
                <i className="ti ti-plus text-3xl" />
                <span className="text-sm font-semibold">Nueva app con IA</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === "automatizaciones" && (
          <div className="flex-1 overflow-auto">
            <AutomationsPage />
          </div>
        )}
        {activeTab === "formularios" && (
          <div className="flex-1 overflow-auto">
            <FormsPage />
          </div>
        )}
        {activeTab === "tablas" && (
          <div className="flex-1 overflow-auto">
            <TablesPage />
          </div>
        )}
        {activeTab === "paginas" && (
          <div className="flex-1 overflow-auto">
            <PagesPage />
          </div>
        )}
      </div>
    </div>
  );
}
