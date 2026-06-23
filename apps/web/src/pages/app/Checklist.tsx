import { useState, useEffect, useMemo } from "react";

interface CheckItem {
  done: boolean;
  text: string;
  priority: "red" | "orange" | "yellow" | "green" | "none";
  raw: string;
}

interface Section {
  id: string;
  title: string;
  items: CheckItem[];
  notes: string[];
}

const PRIORITY_MAP: Record<string, CheckItem["priority"]> = {
  "🔴": "red",
  "🟠": "orange",
  "🟡": "yellow",
  "🟢": "green",
};

const PRIORITY_LABELS: Record<CheckItem["priority"], string> = {
  red: "Bloqueante",
  orange: "Alta",
  yellow: "Media",
  green: "Nice-to-have",
  none: "Hecho",
};

const PRIORITY_CLS: Record<CheckItem["priority"], string> = {
  red: "bg-red-500/15 text-red-400 border-red-500/20",
  orange: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  yellow: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  green: "bg-green-500/15 text-green-400 border-green-500/20",
  none: "bg-cl-accent/10 text-cl-accent border-cl-accent/20",
};

function detectPriority(text: string): CheckItem["priority"] {
  for (const [emoji, p] of Object.entries(PRIORITY_MAP)) {
    if (text.includes(emoji)) return p;
  }
  return "none";
}

function parseChecklist(md: string): Section[] {
  const lines = md.split("\n");
  const sections: Section[] = [];
  let current: Section | null = null;

  for (const line of lines) {
    if (line.startsWith("## ")) {
      current = { id: line.slice(3).trim().replace(/\s+/g, "-").toLowerCase(), title: line.slice(3).trim(), items: [], notes: [] };
      sections.push(current);
    } else if (current && /^- \[[ xX]\]/.test(line)) {
      const done = /^- \[[xX]\]/.test(line);
      const text = line.replace(/^- \[[ xX]\]\s*/, "").trim();
      const priority = done ? "none" : detectPriority(text);
      current.items.push({ done, text, priority, raw: line });
    } else if (current && line.trim() && !line.startsWith("#") && !line.startsWith("|") && !line.startsWith("---")) {
      current.notes.push(line);
    }
  }
  return sections.filter((s) => s.items.length > 0);
}

function renderInline(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code class='bg-silver/10 px-1 py-0.5 rounded text-cl-accent text-[11px] font-mono'>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "<a href='$2' target='_blank' class='text-cl-blue underline'>$1</a>")
    .replace(/🔴|🟠|🟡|🟢/g, "");
}

const COMMANDS_LIST = [
  {
    group: "⚡ Setup Inicial",
    commands: [
      { desc: "Setup completo de una sola vez", cmd: "bash scripts-ubuntu-v10/setup/setup-completo.sh" },
      { desc: "Instalar solo WhatsApp Evolution Lite", cmd: "bash scripts-ubuntu-v10/whatsapp/instalar-evolution-lite.sh" },
      { desc: "Configurar HTTPS con Let's Encrypt (Nginx)", cmd: "bash scripts-ubuntu-v10/setup/setup-nginx.sh clientum.com.ar" },
      { desc: "Invertir un Túnel de Cloudflare nativo", cmd: "bash scripts-ubuntu-v10/setup/setup-tunnel.sh clientum.com.ar" },
    ],
  },
  {
    group: "🔍 Diagnósticos y Estado",
    commands: [
      { desc: "Diagnóstico completo del ecosistema", cmd: "bash scripts-ubuntu-v10/monitoreo/diagnostico.sh" },
      { desc: "Diagnóstico de Variables de Entorno", cmd: "bash scripts-ubuntu-v10/monitoreo/diagnostico.sh --env" },
      { desc: "Diagnóstico de Base de Datos y tablas", cmd: "bash scripts-ubuntu-v10/monitoreo/diagnostico.sh --db" },
      { desc: "Diagnóstico de Conectividad AFIP", cmd: "bash scripts-ubuntu-v10/monitoreo/diagnostico.sh --afip" },
      { desc: "Verificar todos los servicios systemd + HTTP", cmd: "bash scripts-ubuntu-v10/monitoreo/status.sh" },
      { desc: "Health check profundo con alertas", cmd: "bash scripts-ubuntu-v10/monitoreo/health-check.sh" },
    ],
  },
  {
    group: "⏹️ Operaciones & Servicios",
    commands: [
      { desc: "Detener servicios de Clientum enteros", cmd: "bash scripts-ubuntu-v10/ops/stop.sh" },
      { desc: "Detener la API y todos los servicios (WA incl.)", cmd: "bash scripts-ubuntu-v10/ops/stop.sh --all" },
      { desc: "Actualizar código de Producción (Rebuild)", cmd: "bash scripts-ubuntu-v10/ops/update.sh" },
      { desc: "Actualizar sin realizar Git Pull previo", cmd: "bash scripts-ubuntu-v10/ops/update.sh --no-pull" },
    ],
  },
  {
    group: "🔔 Monitoreo & Reporte Diario",
    commands: [
      { desc: "Ver estado actual del monitor local", cmd: "bash scripts-ubuntu-v10/monitoreo/monitoreo.sh --status" },
      { desc: "Instalar monitoreo en crontab cada 5 min", cmd: "bash scripts-ubuntu-v10/monitoreo/monitoreo.sh --setup-cron" },
      { desc: "Lanzar una alerta de prueba por WhatsApp", cmd: "bash scripts-ubuntu-v10/monitoreo/monitoreo.sh --test-alerta" },
      { desc: "Instalar reporte diario por WhatsApp (8:00 AM)", cmd: "bash scripts-ubuntu-v10/monitoreo/reporte-diario.sh --setup-cron" },
      { desc: "Enviar reporte diario manualmente ahora", cmd: "bash scripts-ubuntu-v10/monitoreo/reporte-diario.sh" },
      { desc: "Previsualizar reporte diario en terminal", cmd: "bash scripts-ubuntu-v10/monitoreo/reporte-diario.sh --preview" },
    ],
  },
  {
    group: "📱 WhatsApp & Logs",
    commands: [
      { desc: "Conectar número / ver QR asíncrono", cmd: "bash scripts-ubuntu-v10/whatsapp/conectar-whatsapp.sh" },
      { desc: "Ver logs de la API Express", cmd: "bash scripts-ubuntu-v10/monitoreo/logs.sh api" },
      { desc: "Ver logs de la Evolution API de WhatsApp", cmd: "bash scripts-ubuntu-v10/monitoreo/logs.sh evo" },
      { desc: "Ver logs del Túnel de Cloudflare", cmd: "bash scripts-ubuntu-v10/monitoreo/logs.sh tunnel" },
      { desc: "Ver errores de todos los servicios (última hora)", cmd: "bash scripts-ubuntu-v10/monitoreo/logs.sh --errors" },
    ],
  },
  {
    group: "🗄️ Base de Datos",
    commands: [
      { desc: "Realizar backup manual de Postgres", cmd: "bash scripts-ubuntu-v10/db/backup-db.sh" },
      { desc: "Restaurar base de datos interactivo", cmd: "bash scripts-ubuntu-v10/db/restore-db.sh" },
      { desc: "Restaurar el backup más reciente directamente", cmd: "bash scripts-ubuntu-v10/db/restore-db.sh 1" },
      { desc: "Sync schema mediante Drizzle (Pnpm)", cmd: "pnpm --filter @workspace/db run push" },
    ],
  },
];

const TROUBLES = [
  { symptom: "No sé por dónde empezar", solution: "Ejecutá bash scripts-ubuntu-v10/monitoreo/diagnostico.sh" },
  { symptom: "API no responde / timeout", solution: "Revisá logs: bash scripts-ubuntu-v10/monitoreo/logs.sh api" },
  { symptom: "El chatbot no responde consultas", solution: "Verificá OPENROUTER_API_KEY con: diagnostico.sh --chatbot" },
  { symptom: "WhatsApp desconectado", solution: "Volvé a vincular: bash scripts-ubuntu-v10/whatsapp/conectar-whatsapp.sh" },
  { symptom: "Dominio no abre / no conecta", solution: "Revisá el estado del túnel: bash scripts-ubuntu-v10/monitoreo/logs.sh tunnel" },
  { symptom: "502 Bad Gateway Nginx", solution: "Reiniciá el proxy: sudo systemctl restart clientum-proxy" },
  { symptom: "Error conectando a Postgres", solution: "Reiniciá: sudo systemctl restart postgresql" },
  { symptom: "El servidor falla al arrancar en Prod", solution: "Verificá que NODE_ENV=production y MP_WEBHOOK_SECRET estén en .env" },
  { symptom: "No llegan alertas de WhatsApp", solution: "Probá disparo directo con: monitoreo.sh --test-alerta" },
];

type Mode = "checklist" | "comandos" | "generador";

export default function ChecklistPage() {
  const [mode, setMode] = useState<Mode>("checklist");
  const [raw, setRaw] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "done" | "pending">("all");
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const [dbPassword, setDbPassword] = useState("mi_password_segura");
  const [googleId, setGoogleId] = useState("");
  const [googleSecret, setGoogleSecret] = useState("");
  const [openrouterKey, setOpenrouterKey] = useState("");
  const [monitorPhone, setMonitorPhone] = useState("54911XXXXXXXX");
  const [monitorInstance, setMonitorInstance] = useState("clientum-monitor");
  const [monitorInterval, setMonitorInterval] = useState("5");
  const [sessionSecret] = useState(() => Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2));
  const [webhookSecret] = useState(() => Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2));

  useEffect(() => {
    fetch("/docs/CHECKLIST.md")
      .then((r) => r.text())
      .then((t) => { setRaw(t); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const sections = useMemo(() => (raw ? parseChecklist(raw) : []), [raw]);

  useEffect(() => {
    if (sections.length > 0 && !activeSection) setActiveSection(sections[0].id);
  }, [sections, activeSection]);

  const allItems = sections.flatMap((s) => s.items);
  const totalDone = allItems.filter((i) => i.done).length;
  const pct = allItems.length ? Math.round((totalDone / allItems.length) * 100) : 0;
  const byPriority = (p: string) => allItems.filter((i) => !i.done && i.priority === p).length;

  const currentSection = sections.find((s) => s.id === activeSection);

  const filteredItems = (currentSection?.items ?? []).filter((item) => {
    if (filterStatus === "done" && !item.done) return false;
    if (filterStatus === "pending" && item.done) return false;
    if (filterPriority !== "all" && item.priority !== filterPriority) return false;
    if (search && !item.text.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  function copyCmd(cmd: string) {
    navigator.clipboard.writeText(cmd).catch(() => {});
    setCopied(cmd);
    setTimeout(() => setCopied(null), 2000);
  }

  const envOutput = `# .env — AutoGenerado por Clientum Dashboard
NODE_ENV=production
PORT=8080
API_PORT=8080
VITE_PORT=21496
PROXY_PORT=5000
BASE_PATH=/

REPL_ID=local-dev
SESSION_SECRET=${sessionSecret}
DATABASE_URL=postgresql://clientum:${dbPassword}@localhost:5432/clientum

# Google OAuth
GOOGLE_CLIENT_ID=${googleId || "TU_CLIENT_ID"}
GOOGLE_CLIENT_SECRET=${googleSecret || "TU_CLIENT_SECRET"}

# AI & Chatbot
OPENROUTER_API_KEY=${openrouterKey || "sk-or-..."}

# Mercado Pago (producción)
MP_WEBHOOK_SECRET=${webhookSecret}

# Monitor WhatsApp
MONITOR_WA_NUMBER=${monitorPhone}
MONITOR_WA_INSTANCE=${monitorInstance}
MONITOR_INTERVALO=${monitorInterval}
MONITOR_DISCO_MAX=85
MONITOR_RAM_MAX=90`;

  const modeTabs: { id: Mode; label: string; icon: string }[] = [
    { id: "checklist", label: "Checklist", icon: "ti-checklist" },
    { id: "comandos", label: "Comandos Rápidos", icon: "ti-terminal-2" },
    { id: "generador", label: "Generador .env", icon: "ti-settings" },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 px-4 py-2 bg-navy border-b border-silver/15 flex-shrink-0">
        {modeTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setMode(t.id)}
            className={`flex items-center gap-2 px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
              mode === t.id ? "bg-cl-accent/10 text-cl-accent border border-cl-accent/20" : "text-cool-steel hover:text-white border border-transparent"
            }`}
          >
            <i className={`ti ${t.icon} text-sm`} />
            {t.label}
          </button>
        ))}
        {mode === "checklist" && !loading && allItems.length > 0 && (
          <span className="ml-auto text-xs text-cool-steel/55">
            <span className="font-bold text-cl-accent">{pct}%</span> completado · {totalDone}/{allItems.length} ítems
          </span>
        )}
      </div>

      {mode === "checklist" && (
        loading ? (
          <div className="flex items-center justify-center flex-1">
            <p className="text-cool-steel text-sm">Cargando checklist...</p>
          </div>
        ) : (
          <div className="flex flex-1 min-h-0">
            <aside className="w-72 flex-shrink-0 bg-navy border-r border-silver/15 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-silver/15">
                <h2 className="text-xs font-bold text-cool-steel/55 uppercase tracking-wider mb-3">Progreso Global</h2>
                <div className="relative h-2 bg-silver/10 rounded-full overflow-hidden mb-2">
                  <div className="absolute left-0 top-0 h-full bg-cl-accent rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-cool-steel">{totalDone} completados</span>
                  <span className="font-bold text-cl-accent">{pct}%</span>
                </div>
                <div className="grid grid-cols-4 gap-1 mt-3">
                  {(["red", "orange", "yellow", "green"] as const).map((p) => (
                    <div key={p} className={`text-center px-1 py-1.5 rounded-lg border text-[10px] font-bold ${PRIORITY_CLS[p]}`}>
                      <div className="text-base leading-none">{p === "red" ? "🔴" : p === "orange" ? "🟠" : p === "yellow" ? "🟡" : "🟢"}</div>
                      <div className="mt-0.5">{byPriority(p)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <nav className="flex-1 overflow-y-auto p-2">
                {sections.map((s) => {
                  const done = s.items.filter((i) => i.done).length;
                  const pctS = s.items.length ? Math.round((done / s.items.length) * 100) : 0;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setActiveSection(s.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg transition-all mb-0.5 ${activeSection === s.id ? "bg-cl-accent/10 border border-cl-accent/20" : "hover:bg-silver/10 border border-transparent"}`}
                    >
                      <p className={`text-xs font-semibold truncate ${activeSection === s.id ? "text-cl-accent" : "text-silver"}`}>{s.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1 bg-silver/10 rounded-full overflow-hidden">
                          <div className="h-full bg-cl-accent/60 rounded-full" style={{ width: `${pctS}%` }} />
                        </div>
                        <span className="text-[10px] text-cool-steel/55 flex-shrink-0">{done}/{s.items.length}</span>
                      </div>
                    </button>
                  );
                })}
              </nav>
            </aside>

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-3 bg-navy border-b border-silver/15 flex-shrink-0 flex-wrap">
                <input
                  type="text"
                  placeholder="Buscar en esta sección..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 min-w-[180px] bg-navy-card border border-silver/20 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-cl-accent/50"
                />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as "all" | "done" | "pending")}
                  className="bg-navy-card border border-silver/20 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"
                >
                  <option value="all">Todos</option>
                  <option value="done">✅ Completados</option>
                  <option value="pending">⬜ Pendientes</option>
                </select>
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="bg-navy-card border border-silver/20 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"
                >
                  <option value="all">Todas las prioridades</option>
                  <option value="red">🔴 Bloqueante</option>
                  <option value="orange">🟠 Alta</option>
                  <option value="yellow">🟡 Media</option>
                  <option value="green">🟢 Nice-to-have</option>
                  <option value="none">✅ Hecho</option>
                </select>
                <span className="text-xs text-cool-steel flex-shrink-0">{filteredItems.length} ítems</span>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {currentSection ? (
                  <div className="max-w-4xl">
                    <h2 className="text-lg font-bold text-white mb-1">{currentSection.title}</h2>
                    <p className="text-xs text-cool-steel mb-6">
                      {currentSection.items.filter((i) => i.done).length} de {currentSection.items.length} completados
                      {" · "}
                      {currentSection.items.filter((i) => !i.done && i.priority === "red").length > 0 && (
                        <span className="text-red-400">{currentSection.items.filter((i) => !i.done && i.priority === "red").length} bloqueantes</span>
                      )}
                    </p>

                    {filteredItems.length === 0 ? (
                      <div className="text-center py-12 text-cool-steel/55 text-sm">Sin ítems que coincidan con los filtros.</div>
                    ) : (
                      <div className="space-y-2">
                        {filteredItems.map((item, idx) => (
                          <div
                            key={idx}
                            className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                              item.done
                                ? "bg-deep-space/10 border-silver/15 opacity-60"
                                : "bg-navy-card border-silver/15 hover:border-silver/20"
                            }`}
                          >
                            <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 ${item.done ? "bg-cl-accent/20" : "bg-silver/10"}`}>
                              {item.done ? (
                                <i className="ti ti-check text-cl-accent text-xs" />
                              ) : (
                                <div className="w-2.5 h-2.5 rounded-sm border border-silver/30" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-sm leading-snug ${item.done ? "line-through text-cool-steel" : "text-white/90"}`}
                                dangerouslySetInnerHTML={{ __html: renderInline(item.text) }}
                              />
                            </div>
                            {!item.done && item.priority !== "none" && (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${PRIORITY_CLS[item.priority]}`}>
                                {PRIORITY_LABELS[item.priority]}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-cool-steel/55 text-sm">
                    Seleccioná una sección del panel izquierdo
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      )}

      {mode === "comandos" && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {COMMANDS_LIST.map((group) => (
                <div key={group.group} className="bg-navy-card border border-silver/15 rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-silver/15 bg-deep-space/20">
                    <h3 className="text-xs font-black text-white">{group.group}</h3>
                  </div>
                  <div className="divide-y divide-silver/10">
                    {group.commands.map((c) => (
                      <div key={c.cmd} className="flex items-center gap-3 px-4 py-3 group hover:bg-silver/5 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-cool-steel mb-1">{c.desc}</p>
                          <code className="text-[11px] font-mono text-cl-accent/90 break-all">{c.cmd}</code>
                        </div>
                        <button
                          onClick={() => copyCmd(c.cmd)}
                          title="Copiar comando"
                          className={`w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-lg transition-all ${
                            copied === c.cmd
                              ? "bg-cl-accent/20 text-cl-accent"
                              : "bg-silver/10 text-cool-steel hover:bg-silver/20 hover:text-white opacity-0 group-hover:opacity-100"
                          }`}
                        >
                          <i className={`ti ${copied === c.cmd ? "ti-check" : "ti-copy"} text-xs`} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-navy-card border border-silver/15 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-silver/15 bg-deep-space/20 flex items-center gap-2">
                <i className="ti ti-alert-triangle text-yellow-400 text-sm" />
                <h3 className="text-xs font-black text-white">🚑 Troubleshooting Rápido</h3>
              </div>
              <div className="divide-y divide-silver/10">
                {TROUBLES.map((t) => (
                  <div key={t.symptom} className="grid grid-cols-2 gap-4 px-4 py-3">
                    <p className="text-xs text-red-400/80 font-semibold">{t.symptom}</p>
                    <p className="text-xs text-cool-steel font-mono">{t.solution}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {mode === "generador" && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="bg-navy-card border border-silver/15 rounded-2xl p-5">
                <h3 className="text-sm font-black text-white mb-4 flex items-center gap-2">
                  <i className="ti ti-database text-cl-accent" /> Base de Datos
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-cool-steel/55 uppercase tracking-wider block mb-1">Password de Postgres</label>
                    <input
                      type="text"
                      value={dbPassword}
                      onChange={(e) => setDbPassword(e.target.value)}
                      className="w-full bg-navy border border-silver/20 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-cl-accent/50 font-mono"
                      placeholder="mi_password_segura"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-navy-card border border-silver/15 rounded-2xl p-5">
                <h3 className="text-sm font-black text-white mb-4 flex items-center gap-2">
                  <i className="ti ti-brand-google text-blue-400" /> Google OAuth
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-cool-steel/55 uppercase tracking-wider block mb-1">Client ID</label>
                    <input
                      type="text"
                      value={googleId}
                      onChange={(e) => setGoogleId(e.target.value)}
                      className="w-full bg-navy border border-silver/20 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-cl-accent/50 font-mono"
                      placeholder="xxxxxx.apps.googleusercontent.com"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-cool-steel/55 uppercase tracking-wider block mb-1">Client Secret</label>
                    <input
                      type="password"
                      value={googleSecret}
                      onChange={(e) => setGoogleSecret(e.target.value)}
                      className="w-full bg-navy border border-silver/20 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-cl-accent/50 font-mono"
                      placeholder="GOCSPX-..."
                    />
                  </div>
                </div>
              </div>

              <div className="bg-navy-card border border-silver/15 rounded-2xl p-5">
                <h3 className="text-sm font-black text-white mb-4 flex items-center gap-2">
                  <i className="ti ti-robot text-purple-400" /> AI & Chatbot
                </h3>
                <div>
                  <label className="text-[10px] font-bold text-cool-steel/55 uppercase tracking-wider block mb-1">OpenRouter API Key</label>
                  <input
                    type="password"
                    value={openrouterKey}
                    onChange={(e) => setOpenrouterKey(e.target.value)}
                    className="w-full bg-navy border border-silver/20 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-cl-accent/50 font-mono"
                    placeholder="sk-or-v1-..."
                  />
                </div>
              </div>

              <div className="bg-navy-card border border-silver/15 rounded-2xl p-5">
                <h3 className="text-sm font-black text-white mb-4 flex items-center gap-2">
                  <i className="ti ti-brand-whatsapp text-green-400" /> Monitor WhatsApp
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-cool-steel/55 uppercase tracking-wider block mb-1">Número WhatsApp Alertas</label>
                    <input
                      type="text"
                      value={monitorPhone}
                      onChange={(e) => setMonitorPhone(e.target.value)}
                      className="w-full bg-navy border border-silver/20 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-cl-accent/50 font-mono"
                      placeholder="54911XXXXXXXX"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-cool-steel/55 uppercase tracking-wider block mb-1">Instancia WA</label>
                      <input
                        type="text"
                        value={monitorInstance}
                        onChange={(e) => setMonitorInstance(e.target.value)}
                        className="w-full bg-navy border border-silver/20 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-cl-accent/50 font-mono"
                        placeholder="clientum-monitor"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-cool-steel/55 uppercase tracking-wider block mb-1">Intervalo (min)</label>
                      <input
                        type="number"
                        value={monitorInterval}
                        onChange={(e) => setMonitorInterval(e.target.value)}
                        min={1}
                        max={60}
                        className="w-full bg-navy border border-silver/20 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-cl-accent/50 font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky top-0">
              <div className="bg-deep-space border border-silver/15 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-silver/15">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-400" />
                    <span className="w-3 h-3 rounded-full bg-yellow-400" />
                    <span className="w-3 h-3 rounded-full bg-green-400" />
                    <span className="text-xs text-cool-steel/55 ml-2 font-mono">.env</span>
                  </div>
                  <button
                    onClick={() => copyCmd(envOutput)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      copied === envOutput
                        ? "bg-cl-accent/20 text-cl-accent"
                        : "bg-silver/10 text-cool-steel hover:bg-silver/20 hover:text-white"
                    }`}
                  >
                    <i className={`ti ${copied === envOutput ? "ti-check" : "ti-copy"} text-xs`} />
                    {copied === envOutput ? "Copiado!" : "Copiar"}
                  </button>
                </div>
                <pre className="p-4 text-[11px] font-mono text-cl-accent/90 leading-relaxed overflow-x-auto whitespace-pre-wrap break-all">
                  {envOutput}
                </pre>
              </div>

              <div className="mt-4 bg-amber-400/10 border border-amber-400/20 rounded-xl p-4 flex gap-3">
                <i className="ti ti-lock text-amber-400 text-sm flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-300/80 leading-relaxed">
                  <strong className="text-amber-300">SESSION_SECRET</strong> y <strong className="text-amber-300">MP_WEBHOOK_SECRET</strong> fueron generados aleatoriamente. Guardá este archivo en un lugar seguro — nunca lo subas a un repositorio público.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
