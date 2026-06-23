import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import FiscalReceipt, { FiscalInvoice } from "@/components/FiscalReceipt";
import ProspectorPage from "./Prospector";

type LeadStage = "nuevo" | "contactado" | "calificado" | "propuesta" | "negociacion" | "cerrado_ganado";

interface Lead {
  id: string;
  phoneNumber: string;
  contactName: string | null;
  channel: string;
  leadStatus: string;
  leadNotes: string;
  handoffMode: boolean;
  lastMessageAt: string;
  createdAt: string;
}

type Contact = {
  id: string; name: string; email: string; phone: string; company: string;
  role: string; status: "activo" | "prospecto" | "inactivo"; lastContact: string;
  avatar: string; deals: number;
};

type Company = {
  id: string; name: string; industry: string; size: string; revenue: string;
  contacts: number; deals: number; status: "cliente" | "prospecto" | "socio"; location: string;
};

type Activity = {
  id: string; type: "call" | "email" | "meeting" | "note" | "deal"; title: string;
  description: string; contact: string; ts: string; icon: string; color: string;
};

const STAGES: { id: LeadStage; label: string; color: string; bg: string }[] = [
  { id: "nuevo",        label: "Nuevo",       color: "text-cool-steel",  bg: "bg-silver/10" },
  { id: "contactado",   label: "Contactado",  color: "text-blue-400",    bg: "bg-blue-400/10" },
  { id: "calificado",   label: "Calificado",  color: "text-purple-400",  bg: "bg-purple-400/10" },
  { id: "propuesta",    label: "Propuesta",   color: "text-yellow-400",  bg: "bg-yellow-400/10" },
  { id: "negociacion",  label: "Negociación", color: "text-orange-400",  bg: "bg-orange-400/10" },
  { id: "cerrado_ganado", label: "Cerrado ✓", color: "text-cl-accent",   bg: "bg-cl-accent/10" },
];

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp", prospector: "Prospector", manual: "Manual",
  web_widget: "Widget", chatbot: "Chatbot",
};

const CHANNEL_COLORS: Record<string, string> = {
  whatsapp: "text-green-400 bg-green-400/10",
  prospector: "text-blue-400 bg-blue-400/10",
  manual: "text-cool-steel bg-silver/10",
  web_widget: "text-purple-400 bg-purple-400/10",
  chatbot: "text-yellow-400 bg-yellow-400/10",
};

function normalizeStage(s: string): LeadStage {
  const map: Record<string, LeadStage> = {
    new: "nuevo", nuevo: "nuevo",
    contacted: "contactado", contactado: "contactado",
    qualified: "calificado", calificado: "calificado",
    proposal: "propuesta", propuesta: "propuesta",
    negotiation: "negociacion", negociacion: "negociacion",
    won: "cerrado_ganado", cerrado_ganado: "cerrado_ganado",
  };
  return map[s] ?? "nuevo";
}

const AVATAR_COLORS = ["bg-blue-500", "bg-purple-500", "bg-orange-500", "bg-pink-500", "bg-teal-500", "bg-indigo-500"];

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

function ScoreBadge({ stage }: { stage: LeadStage }) {
  if (stage === "negociacion" || stage === "cerrado_ganado")
    return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400">🔥 Hot</span>;
  if (stage === "calificado" || stage === "propuesta")
    return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-400/15 text-orange-400">🌡️ Warm</span>;
  return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-400/15 text-blue-400">❄️ Cold</span>;
}

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Hace un momento";
  if (m < 60) return `Hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Ayer";
  return `Hace ${d} días`;
}

async function apiFetch(url: string, opts?: RequestInit) {
  const r = await fetch(url, { credentials: "include", ...opts });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

const DEMO_CONTACTS: Contact[] = [
  { id: "1", name: "Dr. Roberto López", email: "rlopez@clinicasur.com", phone: "11-4567-8901", company: "Clínica del Sur", role: "Director Médico", status: "prospecto", lastContact: "Hace 2 días", avatar: "RL", deals: 1 },
  { id: "2", name: "Sandra Gil", email: "s.gil@palermo.com.ar", phone: "11-2345-6789", company: "Inmobiliaria Palermo", role: "Socia Gerente", status: "activo", lastContact: "Hoy", avatar: "SG", deals: 2 },
  { id: "3", name: "Juan Pérez", email: "jperez@ferretcentral.com", phone: "351-234-5678", company: "Ferretería Central", role: "Dueño", status: "activo", lastContact: "Hace 1 día", avatar: "JP", deals: 1 },
  { id: "4", name: "Paula Ruiz", email: "pruiz@electroxyz.com.ar", phone: "2984-789012", company: "Electrónica XYZ", role: "Gerente Comercial", status: "activo", lastContact: "Hace 3 días", avatar: "PR", deals: 1 },
  { id: "5", name: "Roberto Vega", email: "rvega@grupotextil.com", phone: "11-5678-9012", company: "Grupo Textil SA", role: "CEO", status: "prospecto", lastContact: "Hace 1 semana", avatar: "RV", deals: 1 },
];

const DEMO_COMPANIES: Company[] = [
  { id: "1", name: "Clínica del Sur", industry: "Salud", size: "50-200", revenue: "$500M+", contacts: 3, deals: 2, status: "prospecto", location: "Buenos Aires" },
  { id: "2", name: "Ferretería Central", industry: "Retail", size: "10-50", revenue: "$50-200M", contacts: 2, deals: 1, status: "cliente", location: "Córdoba" },
  { id: "3", name: "Inmobiliaria Palermo", industry: "Real Estate", size: "10-50", revenue: "$100-500M", contacts: 4, deals: 2, status: "cliente", location: "Buenos Aires" },
  { id: "4", name: "Grupo Textil SA", industry: "Manufactura", size: "200+", revenue: "$500M+", contacts: 2, deals: 1, status: "prospecto", location: "Rosario" },
  { id: "5", name: "Academia Fit", industry: "Fitness", size: "1-10", revenue: "$1-10M", contacts: 1, deals: 1, status: "cliente", location: "Bariloche" },
];

const DEMO_ACTIVITIES: Activity[] = [
  { id: "1", type: "deal", title: "Deal cerrado: Catálogo digital", description: "Paula Ruiz firmó el contrato por $55.000", contact: "Paula Ruiz", ts: "Hace 30 min", icon: "ti-trophy", color: "text-cl-accent bg-cl-accent/10" },
  { id: "2", type: "call", title: "Llamada con Sandra Gil", description: "Negociaron términos del contrato Enterprise.", contact: "Sandra Gil", ts: "Hace 2 horas", icon: "ti-phone-call", color: "text-blue-400 bg-blue-400/10" },
  { id: "3", type: "email", title: "Propuesta enviada a Dr. López", description: "Se envió presupuesto detallado del sistema de turnos.", contact: "Dr. Roberto López", ts: "Hace 5 horas", icon: "ti-mail", color: "text-purple-400 bg-purple-400/10" },
  { id: "4", type: "meeting", title: "Reunión con Roberto Vega", description: "Primera reunión de descubrimiento. Muy interesado en el plan Enterprise.", contact: "Roberto Vega", ts: "Hace 1 día", icon: "ti-users", color: "text-yellow-400 bg-yellow-400/10" },
  { id: "5", type: "note", title: "Nota: Ferretería Central", description: "Juan Pérez confirmó que ya tienen Evolution API instalado.", contact: "Juan Pérez", ts: "Hace 2 días", icon: "ti-note", color: "text-orange-400 bg-orange-400/10" },
];

type Tab = "pipeline" | "contactos" | "empresas" | "actividades" | "prospector";

function leadToFiscal(lead: Lead): FiscalInvoice {
  return {
    invoiceType: "B",
    invoiceNumber: `FB-${lead.id.padStart(5, "0")}`,
    date: new Date().toISOString().slice(0, 10),
    pointOfSale: "0001",
    cuitEmisor: "30-71234567-8",
    contactName: lead.contactName ?? "Sin nombre",
    cuitReceptor: "00-00000000-0",
    amount: 180000,
    cae: `74444${lead.id.padStart(9, "4")}`,
    caeVencimiento: new Date(Date.now() + 10 * 24 * 3600000).toISOString().slice(0, 10),
  };
}

export default function CRMPage() {
  const [tab, setTab] = useState<Tab>("pipeline");
  const [search, setSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [afipReceipt, setAfipReceipt] = useState<FiscalInvoice | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editName, setEditName] = useState("");
  const [editStage, setEditStage] = useState<LeadStage>("nuevo");
  const [newForm, setNewForm] = useState({ contactName: "", phoneNumber: "", channel: "manual", leadStatus: "nuevo", leadNotes: "" });

  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ leads: Lead[] }>({
    queryKey: ["leads"],
    queryFn: () => apiFetch("/api/leads"),
  });

  const leads = data?.leads ?? [];

  const updateLead = useMutation({
    mutationFn: (vars: { id: string; leadStatus?: string; leadNotes?: string; contactName?: string }) => {
      const { id, ...body } = vars;
      return apiFetch(`/api/leads/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["leads"] }); },
  });

  const createLead = useMutation({
    mutationFn: (body: typeof newForm) =>
      apiFetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["leads"] });
      setShowCreate(false);
      setNewForm({ contactName: "", phoneNumber: "", channel: "manual", leadStatus: "nuevo", leadNotes: "" });
    },
  });

  const deleteLead = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/leads/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["leads"] });
      setSelectedLead(null);
    },
  });

  function openDetail(lead: Lead) {
    setSelectedLead(lead);
    setEditNotes(lead.leadNotes);
    setEditName(lead.contactName ?? "");
    setEditStage(normalizeStage(lead.leadStatus));
  }

  function saveDetail() {
    if (!selectedLead) return;
    updateLead.mutate({ id: selectedLead.id, leadStatus: editStage, leadNotes: editNotes, contactName: editName });
    setSelectedLead(null);
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "pipeline",    label: "Pipeline",    icon: "ti-layout-kanban" },
    { id: "contactos",   label: "Contactos",   icon: "ti-users" },
    { id: "empresas",    label: "Empresas",    icon: "ti-building" },
    { id: "actividades", label: "Actividades", icon: "ti-activity" },
    { id: "prospector",  label: "Prospector",  icon: "ti-map-search" },
  ];

  const filteredLeads = leads.filter(l =>
    !search ||
    (l.contactName ?? "").toLowerCase().includes(search.toLowerCase()) ||
    l.phoneNumber.includes(search)
  );

  const activeLeads = leads.filter(l => normalizeStage(l.leadStatus) !== "cerrado_ganado");
  const wonLeads = leads.filter(l => normalizeStage(l.leadStatus) === "cerrado_ganado");

  return (
    <div className="flex flex-col h-full">
      {afipReceipt && <FiscalReceipt invoice={afipReceipt} onClose={() => setAfipReceipt(null)} />}

      <div className="border-b border-silver/15 px-6 py-3 flex items-center gap-2 bg-navy-2 flex-shrink-0">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${tab === t.id ? "bg-cl-accent/10 text-cl-accent" : "text-cool-steel hover:text-white"}`}>
            <i className={`ti ${t.icon} text-base`} />{t.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-2 bg-silver/10 border border-silver/20 rounded-lg px-3 py-1.5">
            <i className="ti ti-search text-sm text-cool-steel/55" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..."
              className="bg-transparent text-sm text-white outline-none w-36 placeholder-white/30" />
          </div>
          <button
            onClick={() => {
              const a = document.createElement("a");
              a.href = "/api/leads/export";
              a.download = "";
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            }}
            className="flex items-center gap-2 text-sm border border-silver/20 text-cool-steel hover:text-white hover:border-silver/40 px-4 py-1.5 rounded-lg transition-all">
            <i className="ti ti-file-spreadsheet" /> Exportar CSV
          </button>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 text-sm bg-cl-accent text-navy font-bold px-4 py-1.5 rounded-lg hover:bg-cl-accent/90 transition-all">
            <i className="ti ti-plus" /> Nuevo lead
          </button>
        </div>
      </div>

      {tab === "pipeline" && (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="grid grid-cols-3 gap-4 px-6 py-4 border-b border-silver/15 flex-shrink-0">
            {[
              { label: "Leads activos",  value: activeLeads.length.toString(), sub: "en el pipeline", icon: "ti-users", color: "text-blue-400", bg: "bg-blue-400/10" },
              { label: "Total leads",    value: leads.length.toString(), sub: "registrados", icon: "ti-chart-area-line", color: "text-yellow-400", bg: "bg-yellow-400/10" },
              { label: "Convertidos",   value: wonLeads.length.toString(), sub: `${leads.length > 0 ? Math.round(wonLeads.length / leads.length * 100) : 0}% tasa conversión`, icon: "ti-trophy", color: "text-cl-accent", bg: "bg-cl-accent/10" },
            ].map(s => (
              <div key={s.label} className="bg-navy-2 border border-silver/20 rounded-xl p-4 flex items-center gap-3">
                <div className={`w-10 h-10 ${s.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <i className={`ti ${s.icon} text-xl ${s.color}`} />
                </div>
                <div>
                  <p className="text-xl font-bold text-white">{s.value}</p>
                  <p className="text-xs text-cool-steel">{s.label}</p>
                  <p className="text-[10px] text-cool-steel/45">{s.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {isLoading ? (
            <div className="flex-1 flex items-center justify-center text-cool-steel/55">
              <i className="ti ti-loader-2 animate-spin text-2xl mr-2" /> Cargando leads...
            </div>
          ) : leads.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="w-16 h-16 bg-cl-accent/10 rounded-2xl flex items-center justify-center">
                <i className="ti ti-users text-3xl text-cl-accent/60" />
              </div>
              <div>
                <p className="font-bold text-white text-lg mb-1">Tu pipeline está vacío</p>
                <p className="text-sm text-cool-steel/70 max-w-xs">
                  Creá tu primer lead manualmente o usá el Prospector para encontrar negocios reales por rubro y ciudad.
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowCreate(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-cl-accent text-navy font-bold rounded-lg hover:bg-cl-accent/90 transition-all">
                  <i className="ti ti-plus" /> Nuevo lead
                </button>
                <a href="/app/prospector"
                  className="flex items-center gap-2 px-4 py-2 text-sm border border-silver/20 text-cool-steel hover:text-white hover:border-silver/40 rounded-lg transition-all">
                  <i className="ti ti-map-search" /> Ir al Prospector
                </a>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-x-auto overflow-y-hidden">
              <div className="flex gap-4 p-6 h-full" style={{ minWidth: `${STAGES.length * 260}px` }}>
                {STAGES.map(stage => {
                  const stageLeads = filteredLeads.filter(l => normalizeStage(l.leadStatus) === stage.id);
                  return (
                    <div key={stage.id} className="flex flex-col w-56 flex-shrink-0">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold uppercase tracking-wider ${stage.color}`}>{stage.label}</span>
                          <span className="w-5 h-5 rounded-full bg-silver/15 flex items-center justify-center text-[10px] text-cool-steel font-bold">{stageLeads.length}</span>
                        </div>
                      </div>
                      <div className="flex-1 space-y-2 overflow-y-auto">
                        {stageLeads.map((lead, i) => (
                          <div key={lead.id} onClick={() => openDetail(lead)}
                            className="bg-navy-2 border border-silver/20 hover:border-cl-accent/30 rounded-xl p-3 cursor-pointer transition-all group">
                            <div className="flex items-start justify-between gap-1 mb-1">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div className={`w-6 h-6 ${AVATAR_COLORS[i % AVATAR_COLORS.length]} rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0`}>
                                  {getInitials(lead.contactName)}
                                </div>
                                <p className="text-xs font-bold text-white leading-tight truncate">{lead.contactName ?? "Sin nombre"}</p>
                              </div>
                              <ScoreBadge stage={stage.id} />
                            </div>
                            <p className="text-[10px] text-cool-steel mb-2 truncate">{lead.phoneNumber}</p>
                            {lead.leadNotes && (
                              <p className="text-[10px] text-cool-steel/55 mb-2 line-clamp-2">{lead.leadNotes}</p>
                            )}
                            {stage.id === "cerrado_ganado" && (
                              <button
                                onClick={e => { e.stopPropagation(); setAfipReceipt(leadToFiscal(lead)); }}
                                className="w-full mb-2 flex items-center justify-center gap-1.5 py-1 px-2 bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 rounded-lg text-[10px] font-bold transition-all border border-amber-400/20"
                              >
                                <i className="ti ti-receipt-2 text-xs" /> Emitir Factura AFIP
                              </button>
                            )}
                            <div className="flex items-center justify-between gap-1 mt-1">
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${CHANNEL_COLORS[lead.channel] ?? "text-cool-steel bg-silver/10"}`}>
                                {CHANNEL_LABELS[lead.channel] ?? lead.channel}
                              </span>
                              <span className="text-[9px] text-cool-steel/40">{formatRelative(lead.lastMessageAt)}</span>
                            </div>
                          </div>
                        ))}
                        {stageLeads.length === 0 && (
                          <div className="border border-dashed border-silver/10 rounded-xl py-6 flex items-center justify-center text-[10px] text-cool-steel/30">
                            Sin leads
                          </div>
                        )}
                        <button onClick={() => { setShowCreate(true); setNewForm(f => ({ ...f, leadStatus: stage.id })); }}
                          className="w-full border border-dashed border-silver/20 hover:border-cl-accent/20 rounded-xl py-2 text-xs text-cool-steel/40 hover:text-cl-accent/50 transition-all">
                          + Agregar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "contactos" && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-2">
            {DEMO_CONTACTS.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase())).map((c, i) => (
              <div key={c.id} className="bg-navy-2 border border-silver/20 hover:border-cl-accent/20 rounded-xl p-4 flex items-center gap-4 group transition-all">
                <div className={`w-10 h-10 ${AVATAR_COLORS[i % AVATAR_COLORS.length]} rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0`}>
                  {getInitials(c.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-bold text-white text-sm">{c.name}</p>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${c.status === "activo" ? "bg-cl-accent/20 text-cl-accent" : c.status === "prospecto" ? "bg-blue-400/20 text-blue-400" : "bg-silver/15 text-cool-steel/55"}`}>
                      {c.status}
                    </span>
                  </div>
                  <p className="text-xs text-cool-steel">{c.role} · {c.company}</p>
                </div>
                <div className="hidden md:flex items-center gap-6 text-xs text-cool-steel">
                  <span className="flex items-center gap-1"><i className="ti ti-mail" />{c.email}</span>
                  <span className="flex items-center gap-1"><i className="ti ti-phone" />{c.phone}</span>
                  <span className="flex items-center gap-1"><i className="ti ti-chart-bar" />{c.deals} deals</span>
                  <span className="flex items-center gap-1"><i className="ti ti-clock" />{c.lastContact}</span>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                  <button className="w-7 h-7 text-cool-steel hover:text-white bg-silver/10 hover:bg-silver/15 rounded-lg flex items-center justify-center transition-all"><i className="ti ti-mail text-sm" /></button>
                  <button className="w-7 h-7 text-cool-steel hover:text-white bg-silver/10 hover:bg-silver/15 rounded-lg flex items-center justify-center transition-all"><i className="ti ti-phone text-sm" /></button>
                  <button className="w-7 h-7 text-cl-accent/60 hover:text-cl-accent bg-cl-accent/5 hover:bg-cl-accent/10 rounded-lg flex items-center justify-center transition-all"><i className="ti ti-external-link text-sm" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "empresas" && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {DEMO_COMPANIES.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase())).map((co, i) => (
              <div key={co.id} className="bg-navy-2 border border-silver/20 hover:border-cl-accent/20 rounded-xl p-5 transition-all group">
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-10 h-10 ${AVATAR_COLORS[i % AVATAR_COLORS.length]} rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0`}>
                    {co.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-white text-sm">{co.name}</p>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${co.status === "cliente" ? "bg-cl-accent/20 text-cl-accent" : co.status === "prospecto" ? "bg-blue-400/20 text-blue-400" : "bg-purple-400/20 text-purple-400"}`}>
                        {co.status}
                      </span>
                    </div>
                    <p className="text-xs text-cool-steel">{co.industry} · {co.location}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[{ label: "Tamaño", value: co.size }, { label: "Contactos", value: co.contacts }, { label: "Deals", value: co.deals }].map(s => (
                    <div key={s.label} className="bg-silver/10 rounded-lg py-2">
                      <p className="text-sm font-bold text-white">{s.value}</p>
                      <p className="text-[10px] text-cool-steel/55">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "actividades" && (
        <div className="flex-1 overflow-y-auto p-6 max-w-3xl mx-auto w-full">
          <div className="relative">
            <div className="absolute left-5 top-0 bottom-0 w-px bg-silver/10" />
            <div className="space-y-4">
              {DEMO_ACTIVITIES.map(act => (
                <div key={act.id} className="flex gap-4 items-start pl-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${act.color}`}>
                    <i className={`ti ${act.icon} text-base`} />
                  </div>
                  <div className="bg-navy-2 border border-silver/20 rounded-xl p-4 flex-1">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-bold text-white text-sm">{act.title}</p>
                      <span className="text-[10px] text-cool-steel/45 flex-shrink-0">{act.ts}</span>
                    </div>
                    <p className="text-xs text-cool-steel mb-2">{act.description}</p>
                    <span className="text-[10px] text-cool-steel/55 flex items-center gap-1"><i className="ti ti-user text-xs" />{act.contact}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "prospector" && (
        <div className="flex-1 overflow-auto">
          <ProspectorPage />
        </div>
      )}

      {selectedLead && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedLead(null)}>
          <div className="bg-[#0c1a2e] border border-silver/20 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${AVATAR_COLORS[0]} rounded-full flex items-center justify-center text-sm font-bold text-white`}>
                  {getInitials(selectedLead.contactName)}
                </div>
                <div>
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="font-bold text-white text-base bg-transparent outline-none border-b border-transparent hover:border-silver/20 focus:border-cl-accent/50 transition-all w-full"
                    placeholder="Nombre del lead"
                  />
                  <p className="text-xs text-cool-steel">{selectedLead.phoneNumber}</p>
                </div>
              </div>
              <button onClick={() => setSelectedLead(null)} className="text-cool-steel/55 hover:text-white transition-all flex-shrink-0">
                <i className="ti ti-x text-lg" />
              </button>
            </div>

            <div className="mb-4">
              <label className="text-[10px] text-cool-steel/55 uppercase tracking-wider mb-2 block">Etapa del pipeline</label>
              <div className="grid grid-cols-3 gap-1.5">
                {STAGES.map(s => (
                  <button key={s.id} onClick={() => setEditStage(s.id)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${editStage === s.id ? `${s.bg} ${s.color} ring-1 ring-current` : "bg-silver/10 text-cool-steel/55 hover:bg-silver/20"}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="text-[10px] text-cool-steel/55 uppercase tracking-wider mb-1.5 block">Notas</label>
              <textarea
                value={editNotes}
                onChange={e => setEditNotes(e.target.value)}
                rows={3}
                placeholder="Anotaciones sobre este lead..."
                className="w-full bg-silver/10 border border-silver/20 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-cl-accent/40 resize-none placeholder-white/20 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 mb-5">
              <div className="bg-silver/10 rounded-xl p-3">
                <p className="text-[10px] text-cool-steel/55 mb-0.5 uppercase tracking-wider">Canal</p>
                <p className="font-bold text-white text-sm">{CHANNEL_LABELS[selectedLead.channel] ?? selectedLead.channel}</p>
              </div>
              <div className="bg-silver/10 rounded-xl p-3">
                <p className="text-[10px] text-cool-steel/55 mb-0.5 uppercase tracking-wider">Último contacto</p>
                <p className="font-bold text-white text-sm">{formatRelative(selectedLead.lastMessageAt)}</p>
              </div>
            </div>

            {normalizeStage(selectedLead.leadStatus) === "cerrado_ganado" && (
              <button
                onClick={() => { setAfipReceipt(leadToFiscal(selectedLead)); setSelectedLead(null); }}
                className="w-full mb-2 flex items-center justify-center gap-2 py-2 bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 rounded-xl text-sm font-bold transition-all border border-amber-400/25"
              >
                <i className="ti ti-receipt-2" /> Emitir Factura AFIP
              </button>
            )}

            <div className="flex gap-2">
              <button onClick={saveDetail} disabled={updateLead.isPending}
                className="flex-1 py-2 text-sm bg-cl-accent text-navy font-bold rounded-lg hover:bg-cl-accent/90 transition-all disabled:opacity-60 flex items-center justify-center gap-1">
                {updateLead.isPending ? <><i className="ti ti-loader-2 animate-spin" /> Guardando...</> : <><i className="ti ti-check" /> Guardar</>}
              </button>
              <button onClick={() => { if (confirm("¿Eliminar este lead?")) deleteLead.mutate(selectedLead.id); }}
                disabled={deleteLead.isPending}
                className="py-2 px-4 text-sm text-red-400/70 hover:text-red-400 bg-red-400/5 hover:bg-red-400/10 rounded-lg transition-all disabled:opacity-60">
                <i className="ti ti-trash" />
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-[#0c1a2e] border border-silver/20 rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-white text-base">Nuevo lead</h3>
              <button onClick={() => setShowCreate(false)} className="text-cool-steel/55 hover:text-white transition-all"><i className="ti ti-x text-lg" /></button>
            </div>

            <div className="space-y-3 mb-5">
              <div>
                <label className="text-[10px] text-cool-steel/55 uppercase tracking-wider mb-1 block">Nombre</label>
                <input value={newForm.contactName} onChange={e => setNewForm(f => ({ ...f, contactName: e.target.value }))}
                  placeholder="Nombre del contacto"
                  className="w-full bg-silver/10 border border-silver/20 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-cl-accent/40 placeholder-white/20 transition-all" />
              </div>
              <div>
                <label className="text-[10px] text-cool-steel/55 uppercase tracking-wider mb-1 block">Teléfono</label>
                <input value={newForm.phoneNumber} onChange={e => setNewForm(f => ({ ...f, phoneNumber: e.target.value }))}
                  placeholder="Ej: 5491112345678"
                  className="w-full bg-silver/10 border border-silver/20 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-cl-accent/40 placeholder-white/20 transition-all" />
              </div>
              <div>
                <label className="text-[10px] text-cool-steel/55 uppercase tracking-wider mb-1 block">Etapa inicial</label>
                <select value={newForm.leadStatus} onChange={e => setNewForm(f => ({ ...f, leadStatus: e.target.value }))}
                  className="w-full bg-silver/10 border border-silver/20 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-cl-accent/40 transition-all">
                  {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-cool-steel/55 uppercase tracking-wider mb-1 block">Notas (opcional)</label>
                <textarea value={newForm.leadNotes} onChange={e => setNewForm(f => ({ ...f, leadNotes: e.target.value }))}
                  rows={2} placeholder="Información adicional..."
                  className="w-full bg-silver/10 border border-silver/20 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-cl-accent/40 resize-none placeholder-white/20 transition-all" />
              </div>
            </div>

            <button onClick={() => createLead.mutate(newForm)} disabled={createLead.isPending || !newForm.contactName.trim()}
              className="w-full py-2.5 text-sm bg-cl-accent text-navy font-bold rounded-lg hover:bg-cl-accent/90 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
              {createLead.isPending ? <><i className="ti ti-loader-2 animate-spin" /> Creando...</> : <><i className="ti ti-plus" /> Crear lead</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
