import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";

/* ─── Types ─────────────────────────────────────────────── */
interface ChatbotStatus {
  configured: boolean;
  active: boolean;
  knowledgeCount: number;
  conversationCount: number;
  plan: string;
  monthlyMessages: number;
  monthlyLimit: number | null;
}

interface Conversation {
  id: string;
  phoneNumber: string | null;
  channel: string | null;
  lastMessageAt: string | null;
  handoffMode: boolean | null;
  leadName: string | null;
  leadStatus: string | null;
}

interface CatalogConfig {
  token?: string;
  active?: boolean;
  brandName?: string;
  productsUrl?: string;
}

interface Analytics {
  totalConversations: number;
  totalMessages: number;
  messagesByDay: { date: string; count: number }[];
  conversionRate: number;
  resolutionRate: number;
  outcomeBreakdown: { aiActive: number; resolved: number; escalated: number };
}

interface OrdersStats {
  stats: { total: number; pending: number; confirmed: number; preparing: number; shipped: number; delivered: number; cancelled: number; revenue: number };
}

interface AppointmentsStats {
  stats: { total: number; pending: number; confirmed: number; completed: number; cancelled: number };
}

interface AfipDashStatus {
  hasAccess: boolean;
  configured: boolean;
  tokenVivo: boolean;
  environment: string;
  cuit: string | null;
  razonSocial: string | null;
  tokenHorasRestantes: number | null;
  certDiasRestantes: number | null;
  ultimoComprobante: { numero: number; tipo: number; fecha: string; impTotal: string } | null;
  totalComprobantes: number;
}

async function apiFetch(url: string) {
  const r = await fetch(url, { credentials: "include" });
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}

function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Ahora";
  if (m < 60) return `Hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Hace ${h}h`;
  return `Hace ${Math.floor(h / 24)}d`;
}

/* ══════════════════════════════════════════════════════════
   STATIC DEMO DATA — módulos sin backend propio todavía
══════════════════════════════════════════════════════════ */
const msgDays = [
  { d:"Lu", v:60 },{ d:"Ma", v:72 },{ d:"Mi", v:55 },
  { d:"Ju", v:88 },{ d:"Vi", v:95 },{ d:"Sa", v:40 },{ d:"Do", v:30 },
];

const funnel = [
  { label:"Mensajes recibidos",          val:"8.412",  pct:100, color:"bg-cl-blue" },
  { label:"Coincidencia de intenciones", val:"7.318",  pct:87,  color:"bg-purple-500" },
  { label:"Resueltos por KB",            val:"6.561",  pct:78,  color:"bg-cl-accent" },
  { label:"Fallback RAG/IA",             val:"757",    pct:9,   color:"bg-yellow-500" },
  { label:"Escalados a humanos",         val:"589",    pct:7,   color:"bg-red-500" },
];

const staticActivity = [
  { icon:"ti-ticket",         color:"text-yellow-400", bg:"bg-yellow-400/10", msg:"TKT-0234: SLA por vencer en 30 min",          time:"Hace 8 min",  module:"Soporte" },
  { icon:"ti-trending-up",    color:"text-blue-400",   bg:"bg-blue-400/10",   msg:"Deal cerrado: Grupo Textil SA — $55K",         time:"Hace 22 min", module:"CRM" },
  { icon:"ti-cash",           color:"text-cl-accent",  bg:"bg-cl-accent/10",  msg:"Cobro confirmado: Plan Pro — Academia Fit",    time:"Hace 35 min", module:"Finanzas" },
  { icon:"ti-user-plus",      color:"text-pink-400",   bg:"bg-pink-400/10",   msg:"Pablo Gómez incorporado al equipo de Soporte", time:"Hace 1 hora", module:"RRHH" },
  { icon:"ti-git-branch",     color:"text-teal-400",   bg:"bg-teal-400/10",   msg:"Issue #47 cerrado en Clientum v2",             time:"Hace 2 horas",module:"Proyectos" },
  { icon:"ti-shopping-bag",   color:"text-orange-400", bg:"bg-orange-400/10", msg:"Pedido #PED-0089 marcado como entregado",      time:"Hace 3 horas",module:"Pedidos" },
];

/* ══════════════════════════════════════════════════════════
   OVERVIEW
══════════════════════════════════════════════════════════ */
export default function Overview() {
  const { data: status } = useQuery<ChatbotStatus>({
    queryKey: ["chatbot-status"],
    queryFn: () => apiFetch("/api/chatbot/status"),
    retry: false,
    staleTime: 30_000,
  });

  const { data: convsData } = useQuery<{ conversations: Conversation[] }>({
    queryKey: ["chatbot-conversations-overview"],
    queryFn: () => apiFetch("/api/chatbot/conversations"),
    retry: false,
    staleTime: 30_000,
  });

  const { data: catalogData } = useQuery<{ config: CatalogConfig | null }>({
    queryKey: ["catalog-config-overview"],
    queryFn: () => apiFetch("/api/catalog/config"),
    retry: false,
    staleTime: 60_000,
  });

  const { data: analyticsData } = useQuery<Analytics>({
    queryKey: ["analytics-overview"],
    queryFn: () => apiFetch("/api/analytics"),
    retry: false,
    staleTime: 60_000,
  });

  const { data: ordersStatsData } = useQuery<OrdersStats>({
    queryKey: ["orders-stats-overview"],
    queryFn: () => apiFetch("/api/orders/stats"),
    retry: false,
    staleTime: 30_000,
  });

  const { data: apptStatsData } = useQuery<AppointmentsStats>({
    queryKey: ["appointments-stats-overview"],
    queryFn: () => apiFetch("/api/appointments/stats"),
    retry: false,
    staleTime: 30_000,
  });

  const { data: afipData } = useQuery<AfipDashStatus>({
    queryKey: ["afip-status-overview"],
    queryFn: () => apiFetch("/api/afip/status"),
    retry: false,
    staleTime: 60_000,
  });

  const convs = convsData?.conversations ?? [];
  const isAuthed = status !== undefined;
  const catalog = catalogData?.config ?? null;
  const catalogPublicUrl = catalog?.token
    ? `${window.location.origin}/catalogo/${catalog.token}`
    : null;
  const catalogConfigured = !!(catalog?.brandName);
  const catalogActive = catalog?.active ?? false;
  const catalogHasProducts = !!(catalog?.productsUrl);

  /* ── Chart real data: últimos 7 días desde analytics ── */
  const DAY_LABELS = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"];
  const chartDays = analyticsData?.messagesByDay?.length
    ? (() => {
        const today = new Date();
        return Array.from({ length: 7 }, (_, i) => {
          const d = new Date(today);
          d.setDate(today.getDate() - (6 - i));
          const dateStr = d.toISOString().slice(0, 10);
          const found = analyticsData.messagesByDay.find((m) => m.date === dateStr);
          return { d: DAY_LABELS[d.getDay()], v: found?.count ?? 0, isToday: i === 6 };
        });
      })()
    : msgDays.map((d, i) => ({ ...d, isToday: i === 4 }));

  /* ── Mensajes hoy: dato real desde analytics, no del chart fallback ── */
  const msgsToday = analyticsData
    ? (() => {
        const todayStr = new Date().toISOString().slice(0, 10);
        return analyticsData.messagesByDay.find((m) => m.date === todayStr)?.count ?? 0;
      })()
    : chartDays[chartDays.length - 1]?.v ?? 0;

  /* Onboarding: mostrar si el usuario está autenticado pero sin configurar */
  const showOnboarding = isAuthed && (!status.configured || !status.active || status.knowledgeCount === 0);

  return (
    <section className="overflow-y-auto h-full flex flex-col">

      {/* ━━ QUICK-ACTION BAR — acciones más comunes siempre visibles (OverviewB) ━━ */}
      <div className="sticky top-0 z-20 flex items-center gap-3 px-6 py-2.5 border-b flex-shrink-0" style={{ background: "#FFFFFF", borderColor: "#DDDFE2" }}>
        <span className="text-[10px] font-bold uppercase tracking-widest mr-1" style={{ color: "#3B506D" }}>Acciones rápidas:</span>
        {[
          { icon: "ti-user-plus",    label: "Nuevo lead",       color: "#031E43", href: "/app/crm" },
          { icon: "ti-calendar-plus",label: "Agendar turno",    color: "#A855F7", href: "/app/appointments" },
          { icon: "ti-speakerphone", label: "Enviar broadcast", color: "#EC4899", href: "/app/broadcast" },
          { icon: "ti-git-branch",   label: "Nuevo flow",       color: "#F59E0B", href: "/app/flows" },
        ].map((a) => (
          <Link key={a.href} href={a.href}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all hover:scale-105 no-underline"
            style={{ borderColor: `${a.color}30`, color: a.color, backgroundColor: `${a.color}08` }}>
            <i className={`ti ${a.icon} text-xs`} />
            {a.label}
          </Link>
        ))}
      </div>

      <div className="p-6 space-y-8">

      {/* ━━ ONBOARDING CHECKLIST (solo si hay algo pendiente) ━━ */}
      {showOnboarding && (
        <OnboardingPanel status={status} />
      )}

      {/* ━━ 1. KPIs Chatbot IA ━━ */}
      <div>
        <SH label="Agente IA & WhatsApp" />

        {/* Overline "MÉTRICAS DEL DÍA" — patrón jerarquía Dashboard A */}
        <p className="text-[10px] font-bold uppercase tracking-widest text-cool-steel/55 mb-3">Métricas del día</p>

        {/* 4 KPI cards — full-card button con affordance explícito (OverviewB) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">

          {/* Card 1: Estado real del bot — actionable si inactivo */}
          <Link href="/app/agent" className="no-underline group">
            <div className="bg-[#FFFFFF] border rounded-2xl overflow-hidden shadow-sm transition-all group-hover:-translate-y-0.5 group-hover:shadow-md" style={{ borderColor: isAuthed && !status.active ? "rgba(239,68,68,0.2)" : "#DDDFE2" }}>
              <div className="h-1 bg-[#031E43]" />
              <div className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#3B506D" }}>Estado del bot</span>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(3,30,67,0.12)" }}>
                    <i className="ti ti-robot text-sm text-[#031E43]" />
                  </div>
                </div>
                {isAuthed ? (
                  <>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${status.active ? "bg-cl-accent animate-pulse" : "bg-red-400"}`} />
                      <span className={`text-2xl font-extrabold ${status.active ? "text-cl-accent" : "text-red-400"}`}>
                        {status.active ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                    <div className={`text-xs mt-2 flex items-center gap-1 ${status.active ? "text-cl-accent/70" : "text-[#031E43]"}`}>
                      <i className={`ti ${status.active ? "ti-circle-check" : "ti-arrow-right"}`} />
                      {status.active ? "Respondiendo mensajes" : "Clic para activar →"}
                    </div>
                  </>
                ) : (
                  <div className="text-2xl font-extrabold text-cool-steel/40">—</div>
                )}
              </div>
            </div>
          </Link>

          {/* Card 2: Conversaciones reales */}
          <Link href="/app/chat" className="no-underline group">
            <div className="bg-[#FFFFFF] border rounded-2xl overflow-hidden shadow-sm transition-all group-hover:-translate-y-0.5 group-hover:shadow-md" style={{ borderColor: "#DDDFE2" }}>
              <div className="h-1 bg-[#3B506D]" />
              <div className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#3B506D" }}>Conversaciones</span>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(59,80,109,0.12)" }}>
                    <i className="ti ti-messages text-sm text-[#3B506D]" />
                  </div>
                </div>
                {isAuthed ? (
                  <>
                    <div className="text-3xl font-extrabold" style={{ color: "#031E43" }}>
                      {status.conversationCount.toLocaleString("es-AR")}
                    </div>
                    <div className="text-xs mt-2 flex items-center gap-1" style={{ color: "#3B506D" }}>
                      <i className="ti ti-arrows-up text-[#3B506D]" /> total acumulado
                    </div>
                  </>
                ) : (
                  <div className="text-3xl font-extrabold" style={{ color: "#DDDFE2" }}>—</div>
                )}
              </div>
            </div>
          </Link>

          {/* Card 3: Knowledge base — actionable si vacía */}
          <Link href="/app/agent" className="no-underline group">
            <div className="bg-[#FFFFFF] border rounded-2xl overflow-hidden shadow-sm transition-all group-hover:-translate-y-0.5 group-hover:shadow-md" style={{ borderColor: isAuthed && status.knowledgeCount === 0 ? "rgba(251,191,36,0.25)" : "#DDDFE2" }}>
              <div className="h-1 bg-[#10B981]" />
              <div className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#3B506D" }}>Base de conocimiento</span>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(16,185,129,0.12)" }}>
                    <i className="ti ti-book text-sm text-[#10B981]" />
                  </div>
                </div>
                {isAuthed ? (
                  <>
                    <div className="text-3xl font-extrabold" style={{ color: "#031E43" }}>
                      {status.knowledgeCount}
                    </div>
                    <div className="text-xs mt-2 flex items-center gap-1" style={{ color: status.knowledgeCount > 0 ? "#10B981" : "#F59E0B" }}>
                      <i className={`ti ${status.knowledgeCount > 0 ? "ti-circle-check" : "ti-arrow-right"}`} />
                      {status.knowledgeCount > 0 ? "entradas indexadas" : "Agregar contenido →"}
                    </div>
                  </>
                ) : (
                  <div className="text-3xl font-extrabold" style={{ color: "#DDDFE2" }}>—</div>
                )}
              </div>
            </div>
          </Link>

          {/* Card 4: Handoffs pendientes — actionable si hay alguno */}
          <Link href="/app/chat" className="no-underline group">
            <div className="bg-[#FFFFFF] border rounded-2xl overflow-hidden shadow-sm transition-all group-hover:-translate-y-0.5 group-hover:shadow-md" style={{ borderColor: convs.some((c) => c.handoffMode) ? "rgba(245,158,11,0.25)" : "#DDDFE2" }}>
              <div className="h-1 bg-[#F59E0B]" />
              <div className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#3B506D" }}>Handoffs activos</span>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(245,158,11,0.12)" }}>
                    <i className="ti ti-alert-triangle text-sm text-[#F59E0B]" />
                  </div>
                </div>
                {isAuthed ? (
                  <>
                    <div className="text-3xl font-extrabold" style={{ color: "#031E43" }}>
                      {convs.filter((c) => c.handoffMode).length}
                    </div>
                    <div className="text-xs mt-2 flex items-center gap-1" style={{ color: convs.some((c) => c.handoffMode) ? "#F59E0B" : "#3B506D" }}>
                      <i className={`ti ${convs.some((c) => c.handoffMode) ? "ti-arrow-right" : "ti-robot"}`} />
                      {convs.some((c) => c.handoffMode) ? "Ver conversaciones →" : "bot respondiendo todo"}
                    </div>
                  </>
                ) : (
                  <div className="text-3xl font-extrabold" style={{ color: "#DDDFE2" }}>—</div>
                )}
              </div>
            </div>
          </Link>
        </div>

        {/* ── Usage bar mensual ── */}
        {isAuthed && status.monthlyLimit != null && (() => {
          const used = status.monthlyMessages;
          const limit = status.monthlyLimit;
          const pct = Math.min(100, Math.round((used / limit) * 100));
          const isDanger = pct >= 95;
          const isWarn = pct >= 80;
          const barColor = isDanger ? "#EF4444" : isWarn ? "#F59E0B" : "#2DD8A0";
          const textColor = isDanger ? "#EF4444" : isWarn ? "#F59E0B" : "#3B506D";
          return (
            <div className="bg-[#FFFFFF] border rounded-2xl p-4 shadow-sm mb-1" style={{ borderColor: isDanger ? "rgba(239,68,68,0.2)" : isWarn ? "rgba(245,158,11,0.2)" : "#DDDFE2" }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <i className="ti ti-messages text-sm" style={{ color: barColor }} />
                  <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "#3B506D" }}>
                    Mensajes IA este mes
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold uppercase" style={{ background: `${barColor}15`, color: barColor }}>
                    {status.plan}
                  </span>
                </div>
                <span className="text-xs font-semibold" style={{ color: textColor }}>
                  {used.toLocaleString("es-AR")} / {limit.toLocaleString("es-AR")}
                  {isDanger && " — ¡Límite casi alcanzado!"}
                  {isWarn && !isDanger && " — Uso elevado"}
                </span>
              </div>
              <div className="w-full rounded-full h-2 overflow-hidden" style={{ background: "rgba(59,80,109,0.1)" }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: barColor }} />
              </div>
              {isDanger && (
                <p className="text-[11px] mt-2" style={{ color: "#EF4444" }}>
                  Al alcanzar el límite el bot deja de responder.{" "}
                  <a href="/app/cuenta" className="font-bold underline">Actualizá tu plan →</a>
                </p>
              )}
            </div>
          );
        })()}

        {/* ── Métricas de impacto en tiempo real ── */}
        {analyticsData && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                label: "Mensajes totales",
                value: analyticsData.totalMessages.toLocaleString("es-AR"),
                sub: "histórico acumulado",
                icon: "ti-messages",
                color: "#031E43",
                bg: "rgba(3,30,67,0.08)",
              },
              {
                label: "Mensajes hoy",
                value: msgsToday.toLocaleString("es-AR"),
                sub: "últimas 24 horas",
                icon: "ti-clock-hour-4",
                color: "#10B981",
                bg: "rgba(16,185,129,0.10)",
              },
              {
                label: "Tasa de resolución",
                value: `${analyticsData.resolutionRate}%`,
                sub: `${analyticsData.outcomeBreakdown.resolved} conv. cerradas`,
                icon: "ti-circle-check",
                color: "#8B5CF6",
                bg: "rgba(139,92,246,0.10)",
              },
              {
                label: "Tasa de conversión",
                value: `${analyticsData.conversionRate}%`,
                sub: "leads calificados",
                icon: "ti-trending-up",
                color: "#F59E0B",
                bg: "rgba(245,158,11,0.10)",
              },
            ].map((m) => (
              <div key={m.label} className="bg-[#FFFFFF] border rounded-2xl p-4 shadow-sm flex items-center gap-3" style={{ borderColor: "#DDDFE2" }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: m.bg }}>
                  <i className={`ti ${m.icon} text-sm`} style={{ color: m.color }} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wide truncate" style={{ color: "#3B506D" }}>{m.label}</p>
                  <p className="text-xl font-extrabold leading-tight" style={{ color: m.color }}>{m.value}</p>
                  <p className="text-[10px] truncate" style={{ color: "#3B506D" }}>{m.sub}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Grid: Chart + Tabla (2/3) | Activity feed (1/3) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Columna izquierda: chart + tabla (ocupa 2/3) */}
          <div className="lg:col-span-2 space-y-4">

            {/* Gráfico mensajes */}
            <div className="bg-[#FFFFFF] border rounded-2xl p-5 shadow-sm" style={{ borderColor: "#DDDFE2" }}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#3B506D" }}>Actividad</p>
                <Link href="/app/analytics" className="text-[10px] text-[#031E43] no-underline hover:underline">Esta semana</Link>
              </div>
              <h3 className="text-sm font-bold mb-4" style={{ color: "#031E43" }}>Mensajes por día</h3>
              <div className="h-36 flex items-end gap-2 px-1">
                {chartDays.map((d) => {
                  const maxV = Math.max(...chartDays.map(x => x.v), 1);
                  const pct = Math.round((d.v / maxV) * 100);
                  return (
                    <div key={d.d + d.isToday} className="flex-1 flex flex-col items-center gap-1.5 h-full">
                      <div className="flex-1 w-full flex items-end">
                        <div
                          className="w-full rounded-t-md transition-all duration-300"
                          style={{
                            height: `${Math.max(pct, d.v > 0 ? 4 : 0)}%`,
                            backgroundColor: d.isToday ? "#031E43" : "#DDDFE2",
                          }}
                          title={`${d.v} mensajes`}
                        />
                      </div>
                      <span className={`text-[9px] font-medium ${d.isToday ? "text-[#031E43] font-bold" : "text-cool-steel/50"}`}>{d.d}</span>
                    </div>
                  );
                })}
              </div>
              {analyticsData && (
                <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: "#DDDFE2" }}>
                  <span className="text-[10px]" style={{ color: "#3B506D" }}>
                    Total últimos 7 días: <span className="font-bold" style={{ color: "#031E43" }}>{chartDays.reduce((s, d) => s + d.v, 0).toLocaleString("es-AR")}</span>
                  </span>
                  <span className="text-[10px]" style={{ color: "#3B506D" }}>
                    Hoy: <span className="font-bold" style={{ color: "#031E43" }}>{msgsToday.toLocaleString("es-AR")}</span>
                  </span>
                </div>
              )}
            </div>

            {/* Conversaciones recientes reales O embudo demo */}
            {isAuthed && convs.length > 0 ? (
              <div className="bg-[#FFFFFF] border rounded-2xl overflow-hidden shadow-sm" style={{ borderColor: "#DDDFE2" }}>
                <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "#DDDFE2" }}>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#3B506D" }}>CRM</p>
                    <h3 className="text-sm font-bold" style={{ color: "#031E43" }}>Conversaciones recientes</h3>
                  </div>
                  <Link href="/app/agent" className="text-[10px] font-semibold text-[#031E43] no-underline hover:underline">Ver todas →</Link>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ backgroundColor: "#FDFDFB" }}>
                      <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: "#3B506D" }}>Contacto</th>
                      <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: "#3B506D" }}>Canal</th>
                      <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: "#3B506D" }}>Estado</th>
                      <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: "#3B506D" }}>Última actividad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {convs.slice(0, 5).map((c) => {
                      const statusCfg = c.handoffMode
                        ? { label: "Manual", cls: "bg-orange-400/15 text-orange-400" }
                        : c.leadStatus === "closed"
                          ? { label: "Cerrado", cls: "bg-emerald-500/15 text-emerald-600" }
                          : c.leadStatus === "pending"
                            ? { label: "Pendiente", cls: "bg-purple-400/15 text-purple-600" }
                            : { label: "Activo", cls: "bg-blue-400/15 text-blue-600" };
                      return (
                        <tr key={c.id} className="border-t hover:bg-[#FDFDFB] transition-colors" style={{ borderColor: "#DDDFE2" }}>
                          <td className="px-5 py-3 font-semibold" style={{ color: "#031E43" }}>{c.leadName || c.phoneNumber || "Desconocido"}</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-1.5" style={{ color: "#3B506D" }}>
                              <i className="ti ti-brand-whatsapp text-xs text-[#25D366]" />
                              {c.channel || "WhatsApp"}
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusCfg.cls}`}>
                              {statusCfg.label}
                            </span>
                          </td>
                          <td className="px-5 py-3" style={{ color: "#3B506D" }}>{relativeTime(c.lastMessageAt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-[#FFFFFF] border rounded-2xl p-5 shadow-sm" style={{ borderColor: "#DDDFE2" }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "#3B506D" }}>Embudo RAG</h3>
                  <Link href="/app/agent" className="text-[10px] text-[#031E43] no-underline hover:underline">Configurar →</Link>
                </div>
                <div className="space-y-2.5">
                  {funnel.map(f => (
                    <div key={f.label}>
                      <div className="flex justify-between text-[10px] mb-0.5" style={{ color: "#3B506D" }}>
                        <span>{f.label}</span><span className="font-semibold" style={{ color: "#031E43" }}>{f.val}</span>
                      </div>
                      <div className="bg-[#DDDFE2] h-1.5 rounded-full overflow-hidden">
                        <div className={`${f.color} h-full rounded-full`} style={{ width: `${f.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Columna derecha: Activity feed (1/3) */}
          <div className="lg:col-span-1">
            <div className="bg-[#FFFFFF] border rounded-2xl p-5 h-full shadow-sm" style={{ borderColor: "#DDDFE2" }}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#3B506D" }}>Tiempo real</p>
                  <h3 className="text-sm font-bold" style={{ color: "#031E43" }}>Actividad reciente</h3>
                </div>
              </div>
              <div className="space-y-4">
                {[
                  ...convs.slice(0, 2).map(c => ({
                    icon: "ti-brand-whatsapp", color: "#031E43", bg: "rgba(3,30,67,0.12)",
                    title: `Mensaje de ${c.leadName || c.phoneNumber || "contacto"}`,
                    desc: c.handoffMode ? "Handoff activo" : "Respondido por bot",
                    time: relativeTime(c.lastMessageAt),
                  })),
                  ...staticActivity.slice(0, 4).map(a => ({
                    icon: a.icon, color: a.color.replace("text-", ""), bg: a.bg,
                    title: a.msg.split(": ")[0] || a.msg,
                    desc: a.msg.split(": ").slice(1).join(": ") || a.module,
                    time: a.time,
                  })),
                ].slice(0, 6).map((item, i) => (
                  <div key={i} className="flex gap-3">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: item.bg }}
                    >
                      <i className={`ti ${item.icon} text-xs`} style={{ color: item.color.startsWith("#") ? item.color : undefined }} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold leading-tight truncate" style={{ color: "#031E43" }}>{item.title}</span>
                      <span className="text-[11px] truncate" style={{ color: "#3B506D" }}>{item.desc}</span>
                      <span className="text-[10px] mt-0.5" style={{ color: "#DDDFE2" }}>{item.time}</span>
                    </div>
                  </div>
                ))}
              </div>
              <button className="w-full mt-5 py-2 rounded-lg text-xs font-semibold border transition-colors hover:bg-[#FDFDFB]" style={{ borderColor: "#DDDFE2", color: "#3B506D" }}>
                Ver toda la actividad
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ━━ 2. NEGOCIO ━━ */}
      <div>
        <SH label="Negocio" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <MC href="/app/crm"        icon="ti-chart-bar"          ic="text-blue-400"   ib="bg-blue-400/10"   title="CRM & Ventas"
            rows={[{l:"Pipeline total",v:"$1.743K"},{l:"Deals activos",v:"7"},{l:"Ganado este mes",v:"$55K",a:true}]}/>
          <MC href="/app/erp"        icon="ti-building-factory"   ic="text-orange-400" ib="bg-orange-400/10" title="ERP"
            rows={[{l:"Por cobrar",v:"$338K"},{l:"Cobrado mes",v:"$150K",a:true},{l:"Alertas stock",v:"2",w:true}]}/>
          <MC href="/app/accounting" icon="ti-calculator"         ic="text-purple-400" ib="bg-purple-400/10" title="Contabilidad"
            rows={[{l:"Ingresos junio",v:"$1.285K"},{l:"Gastos junio",v:"$719K"},{l:"Resultado neto",v:"$565K",a:true}]}/>
          <MC href="/app/finanzas"   icon="ti-trending-up"        ic="text-green-400"  ib="bg-green-400/10"  title="Finanzas"
            rows={[{l:"Saldo total ARS",v:"$8.16M"},{l:"Saldo USD",v:"U$D 12.840",a:true},{l:"Por conciliar",v:"2",w:true}]}/>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <MC href="/app/support"    icon="ti-ticket"             ic="text-yellow-400" ib="bg-yellow-400/10" title="Soporte"
            rows={[{l:"Tickets abiertos",v:"5"},{l:"SLA incumplido",v:"1",w:true},{l:"Cumplimiento SLA",v:"86%",a:true}]}/>
          <MC href="/app/rrhh"       icon="ti-id-badge"           ic="text-pink-400"   ib="bg-pink-400/10"   title="RRHH"
            rows={[{l:"Empleados activos",v:"7"},{l:"Masa salarial",v:"$2.75M"},{l:"Ausencias hoy",v:"2",w:true}]}/>
          <MC href="/app/projects"   icon="ti-layout-kanban"      ic="text-teal-400"   ib="bg-teal-400/10"   title="Proyectos"
            rows={[{l:"Proyectos activos",v:"3"},{l:"Issues abiertos",v:"47"},{l:"Completados",v:"23",a:true}]}/>
          <MC href="/app/team"       icon="ti-shield-check"       ic="text-indigo-400" ib="bg-indigo-400/10" title="Equipo"
            rows={[{l:"Miembros",v:"8"},{l:"Roles activos",v:"5"},{l:"Administradores",v:"2",a:true}]}/>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MC href="/app/appointments" icon="ti-calendar-event"  ic="text-purple-400" ib="bg-purple-400/10" title="Agenda de Turnos"
            rows={[
              {l:"Total turnos",    v: apptStatsData ? String(apptStatsData.stats.total)     : "—"},
              {l:"Pendientes",      v: apptStatsData ? String(apptStatsData.stats.pending)   : "—", w: !!(apptStatsData && apptStatsData.stats.pending > 0)},
              {l:"Confirmados",     v: apptStatsData ? String(apptStatsData.stats.confirmed) : "—", a:true},
            ]}/>
          <MC href="/app/orders"       icon="ti-shopping-bag"    ic="text-orange-400" ib="bg-orange-400/10" title="Pedidos"
            rows={[
              {l:"Pedidos activos", v: ordersStatsData ? String(ordersStatsData.stats.pending + ordersStatsData.stats.confirmed + ordersStatsData.stats.preparing) : "—"},
              {l:"Entregados",      v: ordersStatsData ? String(ordersStatsData.stats.delivered) : "—", a:true},
              {l:"Cancelados",      v: ordersStatsData ? String(ordersStatsData.stats.cancelled) : "—", w: !!(ordersStatsData && ordersStatsData.stats.cancelled > 0)},
            ]}/>
          <MC href="/app/broadcast"    icon="ti-speakerphone"    ic="text-pink-400"   ib="bg-pink-400/10"   title="Difusión Masiva"
            rows={[{l:"Campaña activa",v:"1"},{l:"Destinatarios",v:"1.240"},{l:"Tasa apertura",v:"68%",a:true}]}/>
          <MC href="/app/flows"        icon="ti-git-branch"      ic="text-violet-400" ib="bg-violet-400/10" title="Flows"
            rows={[{l:"Flows activos",v:"4"},{l:"Ejecuciones hoy",v:"382"},{l:"Tasa éxito",v:"94%",a:true}]}/>
        </div>
      </div>

      {/* ━━ 3. Proyectos + Equipo ━━ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#FFFFFF] border rounded-2xl p-5 shadow-sm" style={{ borderColor: "#DDDFE2" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "#031E43" }}>
              <i className="ti ti-layout-kanban text-teal-500"/> Proyectos activos
            </h3>
            <Link href="/app/projects" className="text-xs text-[#031E43] no-underline hover:underline">Ver todo →</Link>
          </div>
          <div className="space-y-3">
            {[
              {name:"Clientum v2",      pct:49, color:"bg-[#031E43]",  issues:47, done:23, sprint:"Sprint 4"},
              {name:"App Mobile",       pct:18, color:"bg-blue-400",   issues:28, done:5,  sprint:"Sprint 1"},
              {name:"Rediseño Landing", pct:25, color:"bg-orange-400", issues:8,  done:2,  sprint:"Discovery"},
            ].map(p=>(
              <div key={p.name}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold" style={{ color: "#031E43" }}>{p.name}
                    <span className="ml-2 text-[10px] font-normal" style={{ color: "#3B506D" }}>{p.sprint}</span>
                  </span>
                  <span style={{ color: "#3B506D" }}>{p.done}/{p.issues} · {p.pct}%</span>
                </div>
                <div className="bg-[#DDDFE2] rounded-full h-1.5">
                  <div className={`h-1.5 ${p.color} rounded-full`} style={{width:`${p.pct}%`}}/>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#FFFFFF] border rounded-2xl p-5 shadow-sm" style={{ borderColor: "#DDDFE2" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "#031E43" }}>
              <i className="ti ti-users text-indigo-500"/> Equipo online
            </h3>
            <Link href="/app/team" className="text-xs text-[#031E43] no-underline hover:underline">Gestionar →</Link>
          </div>
          <div className="space-y-2">
            {[
              {name:"Martín Álvarez",   av:"MA", color:"bg-teal-500",   active:true,  dept:"Dirección"},
              {name:"Carolina Benítez", av:"CB", color:"bg-purple-500", active:true,  dept:"Ventas"},
              {name:"Lucas Fernández",  av:"LF", color:"bg-blue-500",   active:true,  dept:"Tecnología"},
              {name:"Valeria Torres",   av:"VT", color:"bg-pink-500",   active:true,  dept:"Operaciones"},
              {name:"Andrés Romero",    av:"AR", color:"bg-orange-500", active:false, dept:"Soporte"},
            ].map(m=>(
              <div key={m.name} className="flex items-center gap-3">
                <div className={`w-7 h-7 ${m.color} rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0`}>{m.av}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color: "#031E43" }}>{m.name}</p>
                  <p className="text-[10px]" style={{ color: "#3B506D" }}>{m.dept}</p>
                </div>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${m.active ? "bg-emerald-400" : "bg-[#DDDFE2]"}`}/>
              </div>
            ))}
          </div>
        </div>
      </div>


      {/* ━━ 5. Accesos rápidos ━━ */}
      <div>
        <SH label="Accesos rápidos" />
        <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-9 gap-2">
          {[
            {href:"/app/agent",       icon:"ti-robot",           label:"Agente IA",    color:"text-cl-accent",  bg:"bg-cl-accent/10"},
            {href:"/app/analytics",   icon:"ti-chart-area-line", label:"Analytics",    color:"text-blue-400",   bg:"bg-blue-400/10"},
            {href:"/app/flows",       icon:"ti-git-branch",      label:"Flows",        color:"text-violet-400", bg:"bg-violet-400/10"},
            {href:"/app/crm",         icon:"ti-chart-bar",       label:"CRM",          color:"text-blue-400",   bg:"bg-blue-400/10"},
            {href:"/app/erp",         icon:"ti-building-factory",label:"ERP",          color:"text-orange-400", bg:"bg-orange-400/10"},
            {href:"/app/accounting",  icon:"ti-calculator",      label:"Contabilidad", color:"text-purple-400", bg:"bg-purple-400/10"},
            {href:"/app/finanzas",    icon:"ti-trending-up",     label:"Finanzas",     color:"text-green-400",  bg:"bg-green-400/10"},
            {href:"/app/support",     icon:"ti-ticket",          label:"Soporte",      color:"text-yellow-400", bg:"bg-yellow-400/10"},
            {href:"/app/rrhh",        icon:"ti-id-badge",        label:"RRHH",         color:"text-pink-400",   bg:"bg-pink-400/10"},
            {href:"/app/projects",    icon:"ti-layout-kanban",   label:"Proyectos",    color:"text-teal-400",   bg:"bg-teal-400/10"},
            {href:"/app/team",        icon:"ti-shield-check",    label:"Equipo",       color:"text-indigo-400", bg:"bg-indigo-400/10"},
            {href:"/app/appointments",icon:"ti-calendar-event",  label:"Agenda",       color:"text-purple-400", bg:"bg-purple-400/10"},
            {href:"/app/orders",      icon:"ti-shopping-bag",    label:"Pedidos",      color:"text-orange-400", bg:"bg-orange-400/10"},
            {href:"/app/broadcast",   icon:"ti-speakerphone",    label:"Difusión",     color:"text-pink-400",   bg:"bg-pink-400/10"},
            {href:"/app/builder",     icon:"ti-wand",            label:"Constructor",  color:"text-cl-accent",  bg:"bg-cl-accent/10"},
            {href:"/app/automations", icon:"ti-bolt",            label:"Automations",  color:"text-yellow-400", bg:"bg-yellow-400/10"},
            {href:"/app/knowledge",   icon:"ti-file-text",       label:"Knowledge",    color:"text-cool-steel",   bg:"bg-silver/10"},
          ].map(item=>(
            <Link key={item.href} href={item.href}
              className="group bg-[#FFFFFF] border hover:border-[#031E43]/20 hover:shadow-sm rounded-xl p-3 flex flex-col items-center gap-2 transition-all no-underline"
              style={{ borderColor: "#DDDFE2" }}>
              <div className={`w-8 h-8 ${item.bg} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <i className={`ti ${item.icon} text-base ${item.color}`}/>
              </div>
              <span className="text-[10px] font-semibold transition-colors text-center leading-tight" style={{ color: "#3B506D" }}>{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ━━ 6. Canales e integraciones ━━ */}
      <div className="bg-[#FFFFFF] border rounded-2xl p-5 shadow-sm" style={{ borderColor: "#DDDFE2" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: "#3B506D" }}>Canales e integraciones</h3>
          {isAuthed && (
            <span className="text-[10px]" style={{ color: "#3B506D" }}>
              {[status.configured, catalogActive].filter(Boolean).length} de 4 activos
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">

          {/* WhatsApp — datos reales */}
          <Link href="/app/agent" className="no-underline">
            <div className={`bg-[#FDFDFB] border rounded-xl p-4 flex flex-col gap-3 transition-all hover:shadow-sm ${isAuthed && status.configured ? "border-[#DDDFE2]" : "border-[#DDDFE2]"}`}>
              <div className="flex items-center justify-between">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg ${isAuthed && status.configured ? "bg-emerald-50 text-emerald-500" : "bg-[#DDDFE2] text-[#DDDFE2]"}`}>
                  <i className="ti ti-brand-whatsapp"/>
                </div>
                <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full ${isAuthed && status.configured ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
                  {isAuthed && status.configured ? "Activo" : "Inactivo"}
                </span>
              </div>
              <div>
                <p className="text-xs font-bold" style={{ color: "#031E43" }}>WhatsApp Business</p>
                <p className="text-[11px]" style={{ color: "#3B506D" }}>
                  {isAuthed && status.configured ? "Evolution API activa" : "Sin configurar — clic para configurar"}
                </p>
              </div>
            </div>
          </Link>

          {/* Catálogo Digital — datos reales */}
          <Link href="/app/catalog" className="no-underline">
            <div className={`bg-[#FDFDFB] border rounded-xl p-4 flex flex-col gap-3 transition-all hover:shadow-sm ${catalogConfigured && catalogActive ? "border-[#DDDFE2]" : "border-[#DDDFE2]"}`}>
              <div className="flex items-center justify-between">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg ${catalogConfigured ? "bg-blue-50 text-blue-500" : "bg-[#DDDFE2] text-[#DDDFE2]"}`}>
                  <i className="ti ti-layout-grid"/>
                </div>
                <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full ${catalogActive && catalogConfigured ? "bg-blue-50 text-blue-600" : catalogConfigured ? "bg-amber-50 text-amber-600" : "bg-[#DDDFE2] text-[#3B506D]/70"}`}>
                  {catalogActive && catalogConfigured ? "Publicado" : catalogConfigured ? "Sin publicar" : "Sin configurar"}
                </span>
              </div>
              <div>
                <p className="text-xs font-bold" style={{ color: "#031E43" }}>Catálogo Digital</p>
                {catalogPublicUrl && catalogActive ? (
                  <p className="text-[11px] text-blue-500 truncate">{catalogPublicUrl.replace(window.location.origin, "")}</p>
                ) : (
                  <p className="text-[11px]" style={{ color: "#3B506D" }}>
                    {catalogHasProducts ? "Productos cargados · no publicado" : "Clic para configurar"}
                  </p>
                )}
              </div>
            </div>
          </Link>

          {/* Gmail — demo */}
          <div className="bg-[#FDFDFB] border rounded-xl p-4 flex flex-col gap-3" style={{ borderColor: "#DDDFE2" }}>
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center text-lg">
                <i className="ti ti-mail"/>
              </div>
              <span className="px-2 py-1 bg-amber-50 text-amber-600 text-[10px] font-bold uppercase rounded-full">Escaneando</span>
            </div>
            <div>
              <p className="text-xs font-bold" style={{ color: "#031E43" }}>Gmail Webhook</p>
              <p className="text-[11px]" style={{ color: "#3B506D" }}>info@clientum.com.ar</p>
            </div>
          </div>

          {/* PostgreSQL — demo */}
          <div className="bg-[#FDFDFB] border rounded-xl p-4 flex flex-col gap-3" style={{ borderColor: "#DDDFE2" }}>
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 bg-amber-50 text-amber-500 rounded-lg flex items-center justify-center text-lg">
                <i className="ti ti-database"/>
              </div>
              <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase rounded-full">100% OK</span>
            </div>
            <div>
              <p className="text-xs font-bold" style={{ color: "#031E43" }}>PostgreSQL</p>
              <p className="text-[11px]" style={{ color: "#3B506D" }}>Base de datos activa</p>
            </div>
          </div>

        </div>

        {/* CTA inline si el catálogo no está publicado */}
        {isAuthed && catalogConfigured && !catalogActive && (
          <div className="mt-3 flex items-center gap-3 bg-[#031E43]/5 border border-[#031E43]/10 rounded-xl px-4 py-3">
            <i className="ti ti-layout-grid text-blue-400 text-lg flex-shrink-0"/>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-silver">Tu catálogo está configurado pero inactivo</p>
              <p className="text-[10px] text-cool-steel/55">Activalo para que tus clientes puedan verlo</p>
            </div>
            <Link href="/app/catalog" className="text-[10px] font-bold text-blue-400 hover:text-blue-300 no-underline flex-shrink-0 transition-colors">
              Activar →
            </Link>
          </div>
        )}

        {/* CTA si el catálogo tiene URL pública y está activo */}
        {isAuthed && catalogPublicUrl && catalogActive && (
          <div className="mt-3 flex items-center gap-3 bg-[#031E43]/5 border border-[#031E43]/10 rounded-xl px-4 py-3">
            <i className="ti ti-external-link text-blue-400 text-base flex-shrink-0"/>
            <p className="flex-1 min-w-0 text-[11px] text-cool-steel truncate">{catalogPublicUrl}</p>
            <button
              onClick={() => navigator.clipboard.writeText(catalogPublicUrl)}
              className="text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors flex-shrink-0">
              Copiar
            </button>
            <a href={catalogPublicUrl} target="_blank" rel="noreferrer"
              className="text-[10px] font-bold text-cl-accent hover:text-cl-accent-hover no-underline flex-shrink-0 transition-colors">
              Ver tienda →
            </a>
          </div>
        )}
      </div>

      {/* ━━ 7. Estado AFIP ━━ */}
      {afipData?.hasAccess && (
        <div>
          <SH label="Facturación electrónica AFIP" />
          <AfipStatusWidget data={afipData} />
        </div>
      )}

      {/* ━━ 8. Estado del Servidor ━━ */}
      <div>
        <SH label="Estado del Sistema" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
          {[
            { name: "clientum-api",  icon: "ti-api",              color: "#10B981", status: "Activo", pid: "1823", uptime: "14d 6h" },
            { name: "clientum-web",  icon: "ti-world",            color: "#10B981", status: "Activo", pid: "1831", uptime: "14d 6h" },
            { name: "postgresql",    icon: "ti-database",         color: "#10B981", status: "Activo", pid: "712",  uptime: "14d 6h" },
            { name: "nginx",         icon: "ti-server",           color: "#10B981", status: "Activo", pid: "988",  uptime: "14d 6h" },
            { name: "evolution-api", icon: "ti-brand-whatsapp",   color: "#10B981", status: "Activo", pid: "2104", uptime: "12d 3h" },
            { name: "cloudflared",   icon: "ti-cloud",            color: "#10B981", status: "Activo", pid: "2234", uptime: "12d 3h" },
          ].map((svc) => (
            <div key={svc.name} className="bg-[#FFFFFF] border rounded-xl p-3 flex flex-col gap-2 shadow-sm" style={{ borderColor: "#DDDFE2" }}>
              <div className="flex items-center justify-between">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${svc.color}15` }}>
                  <i className={`ti ${svc.icon} text-sm`} style={{ color: svc.color }} />
                </div>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: svc.color }} />
              </div>
              <div>
                <p className="text-[10px] font-bold truncate" style={{ color: "#031E43" }}>{svc.name}</p>
                <p className="text-[9px] font-mono" style={{ color: "#3B506D" }}>PID {svc.pid} · {svc.uptime}</p>
              </div>
            </div>
          ))}
        </div>
        <Link href="/app/system" className="no-underline">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border bg-[#FFFFFF] hover:shadow-sm transition-all text-xs font-semibold inline-flex" style={{ borderColor: "#DDDFE2", color: "#031E43" }}>
            <i className="ti ti-activity-heartbeat text-sm" style={{ color: "#10B981" }} />
            Ver diagnósticos completos, logs y alertas
            <i className="ti ti-chevron-right text-xs ml-auto" style={{ color: "#DDDFE2" }} />
          </div>
        </Link>
      </div>

      {/* ━━ 9. Programa de Alianzas ━━ */}
      <div>
        <SH label="Programa de Partners" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { nivel: "01", icon: "ti-link", title: "Referidor", stat: "15%", statLabel: "comisión mensual recurrente", color: "#3B506D" },
            { nivel: "02", icon: "ti-star", title: "Reseller",  stat: "30%", statLabel: "descuento sobre lista oficial", color: "#031E43" },
            { nivel: "03", icon: "ti-award", title: "White Label", stat: "WL", statLabel: "dominio y marca propios",   color: "#10B981" },
          ].map((p) => (
            <div key={p.title} className="bg-[#FFFFFF] border rounded-2xl overflow-hidden shadow-sm" style={{ borderColor: "#DDDFE2" }}>
              <div className="h-1" style={{ background: p.color }} />
              <div className="p-5 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${p.color}12` }}>
                    <i className={`ti ${p.icon} text-sm`} style={{ color: p.color }} />
                  </div>
                  <div>
                    <p className="text-[9px] font-mono uppercase tracking-widest" style={{ color: "#3B506D" }}>Nivel {p.nivel}</p>
                    <p className="text-xs font-bold" style={{ color: "#031E43" }}>{p.title}</p>
                  </div>
                </div>
                <div className="bg-[#FAFAFA] border rounded-xl p-3 text-center" style={{ borderColor: "#DDDFE2" }}>
                  <span className="block text-2xl font-mono font-bold" style={{ color: p.color }}>{p.stat}</span>
                  <span className="text-[10px] uppercase tracking-wider block mt-0.5" style={{ color: "#3B506D" }}>{p.statLabel}</span>
                </div>
                <a href="https://wa.me/5492984510883" target="_blank" rel="noreferrer"
                  className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-semibold border transition-all hover:opacity-80 no-underline"
                  style={{ borderColor: `${p.color}30`, color: p.color, background: `${p.color}08` }}>
                  Ser {p.title} →
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ━━ DEV TOOLS (solo development) ━━ */}
      {import.meta.env.DEV && (
        <div>
          <SH label="Dev Tools" />
          <div className="bg-navy-card border border-dashed border-white/15 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <i className="ti ti-terminal text-sm text-cool-steel/60" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-cool-steel/60">Entorno de desarrollo</span>
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { label: "Dev Login (admin)", icon: "ti-user-bolt", href: "/api/auth/dev-login", color: "text-cl-accent" },
                { label: "Seed Admin", icon: "ti-database-import", href: "#", color: "text-blue-400", note: "CLI: seed:admin" },
                { label: "Studio Público", icon: "ti-video", href: "/studio", color: "text-purple-400" },
                { label: "Auth Page", icon: "ti-login", href: "/auth", color: "text-yellow-400" },
              ].map(item => (
                <a
                  key={item.label}
                  href={item.href}
                  target={item.href.startsWith("/api") || item.href === "#" ? undefined : "_self"}
                  onClick={item.href === "#" ? (e) => e.preventDefault() : undefined}
                  className="flex flex-col gap-2 p-3 rounded-xl border border-white/10 hover:border-white/25 bg-navy-3/50 transition-all no-underline group"
                >
                  <i className={`ti ${item.icon} text-base ${item.color}`} />
                  <span className="text-[10px] font-bold text-silver/80 group-hover:text-silver leading-tight">{item.label}</span>
                  {item.note && <span className="text-[9px] text-cool-steel/50 font-mono">{item.note}</span>}
                </a>
              ))}
            </div>

            {/* Estado del entorno */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-2 border-t border-white/5">
              {[
                { label: "NODE_ENV", value: "development" },
                { label: "API", value: ":8080" },
                { label: "Vite", value: ":21496" },
                { label: "Proxy", value: ":5000" },
                { label: "Admin ID", value: "admin_clientum" },
                { label: "Widget Token", value: "…adminwidgettoken…" },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-navy-3/40">
                  <span className="text-[9px] text-cool-steel/50 font-mono uppercase">{item.label}</span>
                  <span className="text-[9px] font-bold font-mono text-cool-steel/80">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════
   ONBOARDING PANEL
══════════════════════════════════════════════════════════ */
function OnboardingPanel({ status }: { status: ChatbotStatus }) {
  const steps = [
    {
      done: true,
      icon: "ti-user-check",
      label: "Cuenta creada",
      desc: "Tu cuenta está activa",
      href: null,
    },
    {
      done: status.knowledgeCount > 0,
      icon: "ti-book",
      label: "Base de conocimiento",
      desc: status.knowledgeCount > 0 ? `${status.knowledgeCount} entradas` : "Agregá info de tu negocio",
      href: "/app/agent",
    },
    {
      done: status.configured,
      icon: "ti-brand-whatsapp",
      label: "Conectar WhatsApp",
      desc: status.configured ? "Evolution API configurada" : "Configurá Evolution API",
      href: "/app/connect-whatsapp",
    },
    {
      done: status.active,
      icon: "ti-toggle-right",
      label: "Activar el chatbot",
      desc: status.active ? "Bot respondiendo mensajes" : "Activá el bot en configuración",
      href: "/app/agent",
    },
    {
      done: status.conversationCount > 0,
      icon: "ti-messages",
      label: "Primera conversación",
      desc: status.conversationCount > 0 ? `${status.conversationCount} conversaciones` : "Enviá un mensaje de prueba",
      href: "/app/agent",
    },
  ];

  const completed = steps.filter((s) => s.done).length;
  const allDone = completed === steps.length;
  if (allDone) return null;

  const nextStep = steps.find((s) => !s.done);

  return (
    <div className="rounded-2xl p-5 border" style={{ background: "linear-gradient(135deg, rgba(3,30,67,0.06) 0%, rgba(16,185,129,0.04) 100%)", borderColor: "rgba(16,185,129,0.18)" }}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold flex items-center gap-2 mb-1" style={{ color: "#031E43" }}>
            <i className="ti ti-rocket text-[#10B981]" /> Configuración inicial · {Math.round((completed / steps.length) * 100)}% completado
          </h3>
          {/* Pill list of steps — done = green, pending = muted */}
          <div className="flex flex-wrap gap-2 mt-3">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold" style={{
                backgroundColor: step.done ? "rgba(16,185,129,0.12)" : "rgba(100,116,139,0.10)",
                color: step.done ? "#10B981" : "#3B506D",
              }}>
                <i className={`ti ${step.done ? "ti-circle-check" : "ti-circle"} text-[10px]`} />
                {step.label}
              </div>
            ))}
          </div>
        </div>
        {/* Prominent CTA for next step — unmissable affordance (OverviewB) */}
        {nextStep?.href && (
          <Link href={nextStep.href}
            className="flex-shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all hover:-translate-y-0.5 hover:shadow-md no-underline whitespace-nowrap"
            style={{ backgroundColor: "#10B981", color: "#031E43" }}>
            <i className={`ti ${nextStep.icon} text-sm`} />
            {nextStep.label}
            <i className="ti ti-arrow-right text-xs" />
          </Link>
        )}
      </div>
      <div className="mt-4 h-1.5 rounded-full" style={{ backgroundColor: "rgba(100,116,139,0.12)" }}>
        <div className="h-full rounded-full transition-all" style={{ backgroundColor: "#10B981", width: `${(completed / steps.length) * 100}%` }} />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   AFIP STATUS WIDGET
══════════════════════════════════════════════════════════ */
const TIPO_LABELS: Record<number, string> = {
  1:"Factura A", 2:"N.Déb A", 3:"N.Cré A",
  6:"Factura B", 7:"N.Déb B", 8:"N.Cré B",
  11:"Factura C",12:"N.Déb C",13:"N.Cré C",
};

function fmtArs(n: number) {
  return new Intl.NumberFormat("es-AR", { style:"currency", currency:"ARS", maximumFractionDigits:0 }).format(n);
}

function AfipStatusWidget({ data }: { data: AfipDashStatus }) {
  const tokenColor  = !data.configured ? "#3B506D"
    : data.tokenVivo  ? "#10B981" : "#EF4444";
  const tokenBg     = !data.configured ? "rgba(59,80,109,0.10)"
    : data.tokenVivo  ? "rgba(16,185,129,0.10)" : "rgba(239,68,68,0.10)";
  const tokenLabel  = !data.configured ? "Sin configurar"
    : data.tokenVivo  ? (data.tokenHorasRestantes !== null ? `Activo · vence en ${data.tokenHorasRestantes}h` : "Activo")
    : "Expirado";

  const certColor = data.certDiasRestantes === null ? "#3B506D"
    : data.certDiasRestantes > 90 ? "#10B981"
    : data.certDiasRestantes > 30 ? "#F59E0B"
    : "#EF4444";
  const certBg = data.certDiasRestantes === null ? "rgba(59,80,109,0.10)"
    : data.certDiasRestantes > 90 ? "rgba(16,185,129,0.10)"
    : data.certDiasRestantes > 30 ? "rgba(245,158,11,0.10)"
    : "rgba(239,68,68,0.10)";
  const certLabel = data.certDiasRestantes === null ? "Sin certificado"
    : data.certDiasRestantes > 0 ? `Vence en ${data.certDiasRestantes} días`
    : "Expirado";

  const uc = data.ultimoComprobante;

  return (
    <Link href="/app/accounting" className="no-underline block group">
      <div className="bg-[#FFFFFF] border rounded-2xl p-5 hover:shadow-md hover:border-[#031E43]/20 transition-all" style={{ borderColor: "#DDDFE2" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
              <i className="ti ti-building-government text-base text-amber-500" />
            </div>
            <div>
              <p className="text-xs font-bold" style={{ color: "#031E43" }}>
                AFIP — {data.environment === "produccion" ? "Producción" : "Homologación"}
              </p>
              {data.cuit && <p className="text-[10px]" style={{ color: "#3B506D" }}>CUIT {data.cuit}{data.razonSocial ? ` · ${data.razonSocial}` : ""}</p>}
            </div>
          </div>
          <span className="text-[10px] font-bold transition-colors group-hover:text-[#031E43]" style={{ color: "#3B506D" }}>
            Ver módulo <i className="ti ti-chevron-right text-[9px]" />
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

          {/* Token WSAA */}
          <div className="rounded-xl p-3 flex flex-col gap-1.5" style={{ backgroundColor: tokenBg }}>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: tokenColor }} />
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#3B506D" }}>Token WSAA</span>
            </div>
            <p className="text-xs font-bold leading-tight" style={{ color: tokenColor }}>{tokenLabel}</p>
          </div>

          {/* Certificado X.509 */}
          <div className="rounded-xl p-3 flex flex-col gap-1.5" style={{ backgroundColor: certBg }}>
            <div className="flex items-center gap-1.5">
              <i className="ti ti-certificate text-[10px]" style={{ color: "#3B506D" }} />
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#3B506D" }}>Certificado</span>
            </div>
            <p className="text-xs font-bold leading-tight" style={{ color: certColor }}>{certLabel}</p>
          </div>

          {/* Último comprobante */}
          <div className="rounded-xl p-3 flex flex-col gap-1.5" style={{ backgroundColor: "rgba(139,92,246,0.08)" }}>
            <div className="flex items-center gap-1.5">
              <i className="ti ti-file-invoice text-[10px]" style={{ color: "#3B506D" }} />
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#3B506D" }}>Último comprobante</span>
            </div>
            {uc ? (
              <>
                <p className="text-xs font-bold" style={{ color: "#031E43" }}>{TIPO_LABELS[uc.tipo] ?? `Tipo ${uc.tipo}`} · N° {uc.numero}</p>
                <p className="text-[10px]" style={{ color: "#3B506D" }}>{uc.fecha} · {fmtArs(Number(uc.impTotal))}</p>
              </>
            ) : (
              <p className="text-xs font-bold" style={{ color: "#3B506D" }}>Sin comprobantes</p>
            )}
          </div>

          {/* Total emitidos */}
          <div className="rounded-xl p-3 flex flex-col gap-1.5" style={{ backgroundColor: "rgba(59,80,109,0.06)" }}>
            <div className="flex items-center gap-1.5">
              <i className="ti ti-stack text-[10px]" style={{ color: "#3B506D" }} />
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#3B506D" }}>Total emitidos</span>
            </div>
            <p className="text-2xl font-black leading-none" style={{ color: "#031E43" }}>{data.totalComprobantes}</p>
            <p className="text-[10px]" style={{ color: "#3B506D" }}>en {data.environment === "produccion" ? "producción" : "homologación"}</p>
          </div>

        </div>

        {/* Alerta cert por vencer */}
        {data.certDiasRestantes !== null && data.certDiasRestantes <= 30 && data.certDiasRestantes > 0 && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl" style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.20)" }}>
            <i className="ti ti-alert-triangle text-sm text-red-500 flex-shrink-0" />
            <p className="text-[11px] font-semibold text-red-500">El certificado X.509 vence en {data.certDiasRestantes} días. Renovalo en el portal de AFIP antes de que expire.</p>
          </div>
        )}
        {data.certDiasRestantes !== null && data.certDiasRestantes <= 0 && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl" style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.20)" }}>
            <i className="ti ti-alert-octagon text-sm text-red-500 flex-shrink-0" />
            <p className="text-[11px] font-semibold text-red-500">El certificado X.509 está vencido. La facturación electrónica no funcionará hasta que lo renueves.</p>
          </div>
        )}
      </div>
    </Link>
  );
}

/* ── helpers ── */
function SH({label}:{label:string}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-0.5 h-4 bg-[#031E43] rounded-full flex-shrink-0" />
      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#3B506D" }}>{label}</p>
    </div>
  );
}

function MC({href, icon, ic, ib, title, rows}: {
  href:string; icon:string; ic:string; ib:string; title:string;
  rows:{l:string; v:string; a?:boolean; w?:boolean}[];
}) {
  return (
    <Link href={href} className="group bg-[#FFFFFF] border hover:border-[#031E43]/20 hover:shadow-md rounded-2xl p-4 flex flex-col gap-3 transition-all no-underline relative overflow-hidden" style={{ borderColor: "#DDDFE2" }}>
      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 ${ib} rounded-lg flex items-center justify-center flex-shrink-0`}>
          <i className={`ti ${icon} text-sm ${ic}`}/>
        </div>
        <span className="text-xs font-bold transition-colors leading-tight group-hover:text-[#031E43]" style={{ color: "#031E43" }}>{title}</span>
        <i className="ti ti-chevron-right ml-auto text-xs transition-colors group-hover:text-[#031E43]" style={{ color: "#DDDFE2" }}/>
      </div>
      <div className="space-y-1.5">
        {rows.map(r=>(
          <div key={r.l} className="flex items-center justify-between">
            <span className="text-[10px]" style={{ color: "#3B506D" }}>{r.l}</span>
            <span className={`text-xs font-bold ${r.a ? "text-[#031E43]" : r.w ? "text-red-500" : ""}`} style={!r.a && !r.w ? { color: "#031E43" } : {}}>{r.v}</span>
          </div>
        ))}
      </div>
      <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-200 border-t py-2 px-4" style={{ background: "rgba(3,30,67,0.06)", borderColor: "rgba(3,30,67,0.15)" }}>
        <span className="text-[10px] font-bold text-[#031E43]">Abrir módulo →</span>
      </div>
    </Link>
  );
}
