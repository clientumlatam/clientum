import { useState } from "react";

type TicketPriority = "urgente" | "alta" | "media" | "baja";
type TicketStatus = "abierto" | "en_progreso" | "esperando" | "resuelto" | "cerrado";
type TicketChannel = "whatsapp" | "email" | "telefono" | "web";

type Ticket = {
  id: string;
  number: string;
  title: string;
  description: string;
  client: string;
  assignee: string;
  assigneeColor: string;
  priority: TicketPriority;
  status: TicketStatus;
  channel: TicketChannel;
  createdAt: string;
  updatedAt: string;
  slaDeadline: string;
  slaStatus: "ok" | "warning" | "breached";
  tags: string[];
};

type KBArticle = {
  id: string;
  title: string;
  category: string;
  views: number;
  helpful: number;
  updatedAt: string;
};

const PRIORITIES: Record<TicketPriority, { label: string; icon: string; color: string; bg: string }> = {
  urgente: { label: "Urgente", icon: "ti-alert-circle", color: "text-red-400",    bg: "bg-red-400/10" },
  alta:    { label: "Alta",    icon: "ti-arrow-up",     color: "text-orange-400", bg: "bg-orange-400/10" },
  media:   { label: "Media",   icon: "ti-minus",        color: "text-yellow-400", bg: "bg-yellow-400/10" },
  baja:    { label: "Baja",    icon: "ti-arrow-down",   color: "text-blue-400",   bg: "bg-blue-400/10" },
};

const STATUSES: Record<TicketStatus, { label: string; color: string }> = {
  abierto:     { label: "Abierto",       color: "bg-blue-400/20 text-blue-400" },
  en_progreso: { label: "En progreso",   color: "bg-purple-400/20 text-purple-400" },
  esperando:   { label: "Esperando",     color: "bg-yellow-400/20 text-yellow-400" },
  resuelto:    { label: "Resuelto",      color: "bg-cl-accent/20 text-cl-accent" },
  cerrado:     { label: "Cerrado",       color: "bg-silver/15 text-cool-steel/55" },
};

const CHANNELS: Record<TicketChannel, { icon: string; color: string }> = {
  whatsapp: { icon: "ti-brand-whatsapp", color: "text-cl-accent" },
  email:    { icon: "ti-mail",           color: "text-blue-400" },
  telefono: { icon: "ti-phone",          color: "text-purple-400" },
  web:      { icon: "ti-world",          color: "text-orange-400" },
};

const SLA_STYLE = {
  ok:      "text-cl-accent bg-cl-accent/10",
  warning: "text-yellow-400 bg-yellow-400/10",
  breached:"text-red-400 bg-red-400/10",
};

const TICKETS: Ticket[] = [
  { id:"1", number:"TKT-0234", title:"Bot no responde en horario nocturno", description:"El chatbot deja de responder después de las 22hs aunque el horario está configurado como 24/7.", client:"Ferretería Central", assignee:"AR", assigneeColor:"bg-orange-500", priority:"urgente", status:"en_progreso", channel:"whatsapp", createdAt:"Hace 1 hora", updatedAt:"Hace 20 min", slaDeadline:"2026-06-13 21:00", slaStatus:"warning", tags:["chatbot","bug"] },
  { id:"2", number:"TKT-0233", title:"¿Cómo configurar el catálogo con variantes?", description:"El cliente quiere saber cómo agregar variantes de color y talle en el catálogo digital.", client:"Electrónica XYZ", assignee:"CB", assigneeColor:"bg-purple-500", priority:"media", status:"abierto", channel:"email", createdAt:"Hace 3 horas", updatedAt:"Hace 3 horas", slaDeadline:"2026-06-14 12:00", slaStatus:"ok", tags:["catálogo","consulta"] },
  { id:"3", number:"TKT-0232", title:"Error al emitir factura tipo A", description:"Al intentar emitir factura tipo A a Inmobiliaria Palermo aparece error 500 en el módulo ERP.", client:"Inmobiliaria Palermo", assignee:"LF", assigneeColor:"bg-blue-500", priority:"alta", status:"abierto", channel:"telefono", createdAt:"Hace 4 horas", updatedAt:"Hace 4 horas", slaDeadline:"2026-06-13 20:00", slaStatus:"breached", tags:["erp","bug","facturación"] },
  { id:"4", number:"TKT-0231", title:"Integración con MercadoPago no redirige", description:"Después de pagar el plan Pro, la URL de retorno de MP falla con 404.", client:"Academia Fit", assignee:"MA", assigneeColor:"bg-teal-500", priority:"alta", status:"esperando", channel:"web", createdAt:"Hace 6 horas", updatedAt:"Hace 2 horas", slaDeadline:"2026-06-14 09:00", slaStatus:"ok", tags:["pagos","bug"] },
  { id:"5", number:"TKT-0230", title:"Solicitud de demo Enterprise", description:"CEO de Grupo Textil SA solicita demo personalizada del plan Enterprise.", client:"Grupo Textil SA", assignee:"CB", assigneeColor:"bg-purple-500", priority:"alta", status:"en_progreso", channel:"email", createdAt:"Hace 1 día", updatedAt:"Hace 5 horas", slaDeadline:"2026-06-14 14:00", slaStatus:"ok", tags:["ventas","demo"] },
  { id:"6", number:"TKT-0229", title:"Exportar historial de conversaciones", description:"El cliente necesita exportar las conversaciones del mes pasado para auditoría interna.", client:"Estudio Contable Baires", assignee:"AR", assigneeColor:"bg-orange-500", priority:"baja", status:"resuelto", channel:"email", createdAt:"Hace 2 días", updatedAt:"Hace 1 día", slaDeadline:"2026-06-15 12:00", slaStatus:"ok", tags:["datos","export"] },
  { id:"7", number:"TKT-0228", title:"Configurar recordatorios de turnos", description:"¿Cómo activar los recordatorios automáticos de turnos por WhatsApp?", client:"Clínica del Sur", assignee:"VT", assigneeColor:"bg-pink-500", priority:"media", status:"cerrado", channel:"whatsapp", createdAt:"Hace 3 días", updatedAt:"Hace 2 días", slaDeadline:"2026-06-12 17:00", slaStatus:"ok", tags:["turnos","configuración"] },
];

const KB_ARTICLES: KBArticle[] = [
  { id:"1", title:"Cómo configurar el chatbot IA desde cero", category:"Configuración", views: 1247, helpful: 94, updatedAt:"Hace 2 días" },
  { id:"2", title:"Integración con Evolution API — guía paso a paso", category:"Integraciones", views: 892, helpful: 89, updatedAt:"Hace 5 días" },
  { id:"3", title:"Facturación electrónica AFIP — tipos A, B y C", category:"ERP", views: 654, helpful: 87, updatedAt:"Hace 1 semana" },
  { id:"4", title:"Gestión de turnos automáticos con WhatsApp", category:"Operaciones", views: 581, helpful: 92, updatedAt:"Hace 3 días" },
  { id:"5", title:"Human handoff: cómo tomar control de una conversación", category:"Chatbot", views: 498, helpful: 85, updatedAt:"Hace 4 días" },
  { id:"6", title:"Configurar catálogo digital con variantes", category:"Catálogo", views: 423, helpful: 91, updatedAt:"Hace 1 semana" },
  { id:"7", title:"Plan de migracion de datos desde planillas Excel", category:"Datos", views: 312, helpful: 78, updatedAt:"Hace 2 semanas" },
];

const KB_CATEGORIES = ["Todos", "Configuración", "Integraciones", "ERP", "Operaciones", "Chatbot", "Catálogo", "Datos"];

type SupportTab = "tickets" | "sla" | "kb" | "metricas";

export default function SupportPage() {
  const [tab, setTab] = useState<SupportTab>("tickets");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "todos">("todos");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [kbCategory, setKbCategory] = useState("Todos");

  const tabs: { id: SupportTab; label: string; icon: string }[] = [
    { id: "tickets",  label: "Tickets",        icon: "ti-ticket" },
    { id: "sla",      label: "SLA",            icon: "ti-clock" },
    { id: "kb",       label: "Base de ayuda",  icon: "ti-book" },
    { id: "metricas", label: "Métricas",       icon: "ti-chart-bar" },
  ];

  const filtered = TICKETS.filter(t =>
    (statusFilter === "todos" || t.status === statusFilter) &&
    (!search || t.title.toLowerCase().includes(search.toLowerCase()) || t.client.toLowerCase().includes(search.toLowerCase()) || t.number.includes(search))
  );

  const open = TICKETS.filter(t => t.status === "abierto" || t.status === "en_progreso").length;
  const resolved = TICKETS.filter(t => t.status === "resuelto" || t.status === "cerrado").length;
  const breached = TICKETS.filter(t => t.slaStatus === "breached").length;
  const slaCompliance = Math.round((TICKETS.filter(t => t.slaStatus !== "breached").length / TICKETS.length) * 100);

  const filteredKB = KB_ARTICLES.filter(a => kbCategory === "Todos" || a.category === kbCategory);

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-silver/15 px-6 py-3 flex items-center gap-2 bg-navy-2 flex-shrink-0">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${tab === t.id ? "bg-cl-accent/10 text-cl-accent" : "text-cool-steel hover:text-white"}`}>
            <i className={`ti ${t.icon} text-base`} />{t.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          {(tab === "tickets") && (
            <>
              <div className="flex items-center gap-1 bg-silver/10 border border-silver/20 rounded-lg p-1">
                {(["todos","abierto","en_progreso","esperando","resuelto"] as (TicketStatus|"todos")[]).map(s => (
                  <button key={s} onClick={() => setStatusFilter(s)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all capitalize ${statusFilter === s ? "bg-cl-accent/20 text-cl-accent" : "text-cool-steel hover:text-white"}`}>
                    {s === "todos" ? "Todos" : s === "en_progreso" ? "En progreso" : s.charAt(0).toUpperCase()+s.slice(1)}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 bg-silver/10 border border-silver/20 rounded-lg px-3 py-1.5">
                <i className="ti ti-search text-xs text-cool-steel/55" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar ticket..." className="bg-transparent text-xs text-white outline-none w-36 placeholder-white/30" />
              </div>
            </>
          )}
          <button className="flex items-center gap-1.5 text-sm bg-cl-accent text-navy font-bold px-4 py-1.5 rounded-lg hover:bg-cl-accent/90 transition-all">
            <i className="ti ti-plus" /> Nuevo ticket
          </button>
        </div>
      </div>

      {/* Stats bar */}
      {tab === "tickets" && (
        <div className="grid grid-cols-4 gap-4 px-6 py-4 border-b border-silver/15 flex-shrink-0">
          {[
            { label: "Abiertos",       value: open,          icon: "ti-ticket",         color: "text-blue-400",   bg: "bg-blue-400/10" },
            { label: "Resueltos",      value: resolved,      icon: "ti-circle-check",   color: "text-cl-accent",  bg: "bg-cl-accent/10" },
            { label: "SLA incumplido", value: breached,      icon: "ti-alert-triangle", color: "text-red-400",    bg: "bg-red-400/10" },
            { label: "Cumplimiento SLA", value:`${slaCompliance}%`, icon: "ti-clock",   color: "text-yellow-400", bg: "bg-yellow-400/10" },
          ].map(s => (
            <div key={s.label} className="bg-navy-2 border border-silver/20 rounded-xl p-4 flex items-center gap-3">
              <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                <i className={`ti ${s.icon} text-lg ${s.color}`} />
              </div>
              <div>
                <p className="text-lg font-bold text-white">{s.value}</p>
                <p className="text-[10px] text-cool-steel/55">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {tab === "tickets" && (
          <div className="divide-y divide-silver/10">
            {filtered.map(ticket => {
              const p = PRIORITIES[ticket.priority];
              const ch = CHANNELS[ticket.channel];
              return (
                <div key={ticket.id} onClick={() => setSelectedTicket(ticket)}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-deep-space/10 cursor-pointer group transition-colors">
                  <div className={`w-8 h-8 ${p.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <i className={`ti ${p.icon} text-sm ${p.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-mono text-cool-steel/55">{ticket.number}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${STATUSES[ticket.status].color}`}>{STATUSES[ticket.status].label}</span>
                      {ticket.slaStatus !== "ok" && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${SLA_STYLE[ticket.slaStatus]}`}>
                          {ticket.slaStatus === "warning" ? "⚠ SLA" : "✗ SLA vencido"}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-silver truncate group-hover:text-white transition-colors">{ticket.title}</p>
                    <p className="text-xs text-cool-steel mt-0.5">{ticket.client}</p>
                  </div>
                  <div className="hidden lg:flex items-center gap-4 text-xs text-cool-steel/55 flex-shrink-0">
                    <i className={`ti ${ch.icon} text-base ${ch.color}`} title={ticket.channel} />
                    <div className="flex flex-wrap gap-1">
                      {ticket.tags.slice(0, 2).map(t => (
                        <span key={t} className="bg-silver/10 text-cool-steel/55 px-1.5 py-0.5 rounded text-[10px]">{t}</span>
                      ))}
                    </div>
                    <span className="flex items-center gap-1"><i className="ti ti-clock text-xs" />{ticket.updatedAt}</span>
                    <div className={`w-6 h-6 ${ticket.assigneeColor} rounded-full flex items-center justify-center text-[9px] font-bold text-white`}>
                      {ticket.assignee}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "sla" && (
          <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Tiempo promedio de primera respuesta", value: "12 min", target: "< 30 min", ok: true },
                { label: "Tiempo promedio de resolución",        value: "4.2 h",  target: "< 8 h",    ok: true },
                { label: "Tickets resueltos en SLA",             value: `${slaCompliance}%`, target: "> 90%", ok: slaCompliance >= 90 },
              ].map(s => (
                <div key={s.label} className="bg-navy-2 border border-silver/20 rounded-xl p-5">
                  <p className="text-2xl font-black text-white mb-1">{s.value}</p>
                  <p className="text-xs text-cool-steel mb-2">{s.label}</p>
                  <div className="flex items-center gap-1.5">
                    <i className={`ti ${s.ok ? "ti-circle-check text-cl-accent" : "ti-alert-triangle text-red-400"} text-sm`} />
                    <span className="text-xs text-cool-steel/55">Meta: {s.target}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-navy-2 border border-silver/20 rounded-xl overflow-hidden">
              <div className="px-5 py-3 bg-deep-space/10 border-b border-silver/15">
                <h3 className="font-bold text-white text-sm">Estado SLA por ticket</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    {["Ticket", "Cliente", "Prioridad", "Plazo SLA", "Estado SLA", "Asignado a"].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-[10px] font-bold text-cool-steel/45 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TICKETS.filter(t => t.status !== "cerrado").map(ticket => {
                    const p = PRIORITIES[ticket.priority];
                    return (
                      <tr key={ticket.id} className="border-t border-silver/15 hover:bg-deep-space/10 transition-colors">
                        <td className="px-5 py-3">
                          <p className="text-xs font-mono text-cl-accent">{ticket.number}</p>
                          <p className="text-xs text-cool-steel max-w-[180px] truncate">{ticket.title}</p>
                        </td>
                        <td className="px-5 py-3 text-xs text-cool-steel">{ticket.client}</td>
                        <td className="px-5 py-3"><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.bg} ${p.color}`}>{p.label}</span></td>
                        <td className="px-5 py-3 text-xs text-cool-steel font-mono">{ticket.slaDeadline}</td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${SLA_STYLE[ticket.slaStatus]}`}>
                            {ticket.slaStatus === "ok" ? "✓ En tiempo" : ticket.slaStatus === "warning" ? "⚠ Por vencer" : "✗ Vencido"}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <div className={`w-7 h-7 ${ticket.assigneeColor} rounded-full flex items-center justify-center text-xs font-bold text-white`}>
                            {ticket.assignee}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "kb" && (
          <div className="p-6">
            <div className="flex gap-2 flex-wrap mb-5">
              {KB_CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setKbCategory(cat)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${kbCategory === cat ? "bg-cl-accent/20 text-cl-accent" : "bg-silver/10 text-cool-steel hover:text-white"}`}>
                  {cat}
                </button>
              ))}
              <button className="ml-auto flex items-center gap-1.5 text-xs bg-silver/10 hover:bg-silver/15 text-cool-steel hover:text-white px-3 py-1.5 rounded-lg transition-all">
                <i className="ti ti-plus" /> Nuevo artículo
              </button>
            </div>
            <div className="space-y-2">
              {filteredKB.map((art, i) => (
                <div key={art.id} className="bg-navy-2 border border-silver/20 hover:border-cl-accent/20 rounded-xl p-4 flex items-center gap-4 group transition-all cursor-pointer">
                  <div className="w-8 h-8 bg-cl-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <i className="ti ti-article text-base text-cl-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm group-hover:text-cl-accent transition-colors">{art.title}</p>
                    <p className="text-xs text-cool-steel mt-0.5">{art.category} · Actualizado {art.updatedAt}</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-cool-steel/55 flex-shrink-0">
                    <span className="flex items-center gap-1"><i className="ti ti-eye text-xs" />{art.views.toLocaleString()}</span>
                    <span className="flex items-center gap-1 text-cl-accent/60"><i className="ti ti-thumb-up text-xs" />{art.helpful}%</span>
                    <i className="ti ti-chevron-right text-cool-steel/40 group-hover:text-cl-accent transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "metricas" && (
          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
            <div className="bg-navy-2 border border-silver/20 rounded-xl p-5">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2"><i className="ti ti-chart-bar text-cl-accent" /> Tickets por estado</h3>
              {(["abierto","en_progreso","esperando","resuelto","cerrado"] as TicketStatus[]).map(s => {
                const count = TICKETS.filter(t => t.status === s).length;
                const pct = Math.round(count / TICKETS.length * 100);
                return (
                  <div key={s} className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-cool-steel">{STATUSES[s].label}</span>
                      <span className="font-semibold text-white">{count} <span className="text-cool-steel/55">({pct}%)</span></span>
                    </div>
                    <div className="bg-silver/10 rounded-full h-1.5">
                      <div className="h-1.5 bg-cl-accent rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-navy-2 border border-silver/20 rounded-xl p-5">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2"><i className="ti ti-chart-donut text-blue-400" /> Tickets por canal</h3>
              {(["whatsapp","email","telefono","web"] as TicketChannel[]).map(ch => {
                const count = TICKETS.filter(t => t.channel === ch).length;
                const pct = Math.round(count / TICKETS.length * 100);
                const c = CHANNELS[ch];
                return (
                  <div key={ch} className="mb-3">
                    <div className="flex justify-between text-xs mb-1 items-center">
                      <span className="flex items-center gap-1.5 text-cool-steel">
                        <i className={`ti ${c.icon} text-sm ${c.color}`} />
                        {ch.charAt(0).toUpperCase() + ch.slice(1)}
                      </span>
                      <span className="font-semibold text-white">{count} ({pct}%)</span>
                    </div>
                    <div className="bg-silver/10 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: ch === "whatsapp" ? "#2dd8a0" : ch === "email" ? "#60a5fa" : ch === "telefono" ? "#c084fc" : "#fb923c" }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-navy-2 border border-silver/20 rounded-xl p-5">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2"><i className="ti ti-chart-area-line text-purple-400" /> Tickets resueltos — últimos 7 días</h3>
              <div className="flex items-end gap-3 h-32">
                {[
                  { d: "Lun", v: 3 }, { d: "Mar", v: 5 }, { d: "Mié", v: 4 },
                  { d: "Jue", v: 7 }, { d: "Vie", v: 6 }, { d: "Sáb", v: 2 }, { d: "Dom", v: 1 },
                ].map(bar => (
                  <div key={bar.d} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-cool-steel font-bold">{bar.v}</span>
                    <div className="w-full rounded-t-md bg-gradient-to-t from-purple-500/40 to-purple-400" style={{ height: `${bar.v / 7 * 100}%` }} />
                    <span className="text-[10px] text-cool-steel/55">{bar.d}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-navy-2 border border-silver/20 rounded-xl p-5">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2"><i className="ti ti-star text-yellow-400" /> CSAT por agente</h3>
              {[
                { name: "Andrés Romero",  color: "bg-orange-500", score: 4.8, tickets: 24 },
                { name: "Carolina Benítez", color: "bg-purple-500", score: 4.7, tickets: 18 },
                { name: "Valeria Torres", color: "bg-pink-500",   score: 4.6, tickets: 21 },
                { name: "Lucas Fernández", color: "bg-blue-500",  score: 4.5, tickets: 12 },
              ].map(agent => (
                <div key={agent.name} className="flex items-center gap-3 mb-3">
                  <div className={`w-7 h-7 ${agent.color} rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}>
                    {agent.name.split(" ").map(w => w[0]).slice(0,2).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-silver truncate">{agent.name}</span>
                      <span className="flex items-center gap-1 text-yellow-400 font-bold"><i className="ti ti-star-filled text-xs" />{agent.score}</span>
                    </div>
                    <div className="bg-silver/10 rounded-full h-1">
                      <div className="h-1 bg-yellow-400/60 rounded-full" style={{ width: `${(agent.score / 5) * 100}%` }} />
                    </div>
                  </div>
                  <span className="text-[10px] text-cool-steel/45 flex-shrink-0">{agent.tickets} tkts</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {selectedTicket && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedTicket(null)}>
          <div className="bg-navy-2 border border-silver/20 rounded-2xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-mono text-cl-accent">{selectedTicket.number}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUSES[selectedTicket.status].color}`}>{STATUSES[selectedTicket.status].label}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${SLA_STYLE[selectedTicket.slaStatus]}`}>{selectedTicket.slaStatus === "ok" ? "✓ SLA OK" : selectedTicket.slaStatus === "warning" ? "⚠ SLA" : "✗ SLA vencido"}</span>
              <button onClick={() => setSelectedTicket(null)} className="ml-auto text-cool-steel/55 hover:text-white transition-all"><i className="ti ti-x" /></button>
            </div>
            <h3 className="font-bold text-white text-lg mb-1">{selectedTicket.title}</h3>
            <p className="text-sm text-cool-steel mb-4">{selectedTicket.description}</p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: "Cliente", value: selectedTicket.client },
                { label: "Prioridad", value: PRIORITIES[selectedTicket.priority].label },
                { label: "Canal", value: selectedTicket.channel },
                { label: "Plazo SLA", value: selectedTicket.slaDeadline },
              ].map(s => (
                <div key={s.label} className="bg-silver/10 rounded-xl p-3">
                  <p className="text-[10px] text-cool-steel/55 mb-0.5 uppercase tracking-wider">{s.label}</p>
                  <p className="font-semibold text-white text-sm">{s.value}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {selectedTicket.tags.map(t => <span key={t} className="text-xs bg-silver/10 text-cool-steel px-2 py-1 rounded-lg">{t}</span>)}
            </div>
            <div className="flex gap-2">
              <button className="flex-1 py-2 text-sm bg-cl-accent text-navy font-bold rounded-lg hover:bg-cl-accent/90 transition-all"><i className="ti ti-arrow-forward-up mr-1" /> Responder</button>
              <button className="py-2 px-4 text-sm bg-silver/10 hover:bg-silver/15 text-cool-steel rounded-lg transition-all"><i className="ti ti-user-check" /></button>
              <button className="py-2 px-4 text-sm bg-silver/10 hover:bg-silver/15 text-cool-steel rounded-lg transition-all"><i className="ti ti-circle-check" /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
