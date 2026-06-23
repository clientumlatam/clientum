import { useState, useEffect, useCallback } from "react";

type Tab = "overview" | "diagnostics" | "health" | "logs" | "alerts";

/* ── Brand constants ── */
const P = "#031E43"; // Prussian
const D = "#3B506D"; // Dusk
const A = "#DDDFE2"; // Alabaster
const G = "#10B981"; // Green / active
const Y = "#F59E0B"; // Yellow / warn
const R = "#EF4444"; // Red / error

/* ── Section header — same as Overview SH ── */
function SH({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-0.5 h-4 rounded-full flex-shrink-0" style={{ background: P }} />
      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: D }}>{label}</p>
    </div>
  );
}

/* ── Metric card — same card pattern as Overview KPI cards ── */
function MetricCard({ label, value, sub, icon, accent, percent }: {
  label: string; value: string; sub: string; icon: string; accent: string; percent?: number;
}) {
  const barColor = percent !== undefined ? (percent > 85 ? R : percent > 65 ? Y : accent) : accent;
  return (
    <div className="bg-[#FFFFFF] border rounded-2xl overflow-hidden shadow-sm" style={{ borderColor: A }}>
      <div className="h-1" style={{ background: accent }} />
      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: D }}>{label}</span>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${accent}15` }}>
            <i className={`ti ${icon} text-sm`} style={{ color: accent }} />
          </div>
        </div>
        <div className="text-3xl font-extrabold" style={{ color: P }}>{value}</div>
        <div className="text-xs mt-1" style={{ color: D }}>{sub}</div>
        {percent !== undefined && (
          <div className="mt-3 h-1.5 rounded-full" style={{ background: A }}>
            <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${percent}%`, background: barColor }} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Static demo data ── */
const SERVICES = [
  { name: "clientum-api",   status: "active", pid: "1823", uptime: "14d 6h 22m", cpu: "1.2%",  mem: "312 MB" },
  { name: "clientum-web",   status: "active", pid: "1831", uptime: "14d 6h 22m", cpu: "0.4%",  mem: "128 MB" },
  { name: "postgresql",     status: "active", pid: "712",  uptime: "14d 6h 24m", cpu: "0.8%",  mem: "445 MB" },
  { name: "nginx",          status: "active", pid: "988",  uptime: "14d 6h 24m", cpu: "0.1%",  mem: "18 MB"  },
  { name: "evolution-api",  status: "active", pid: "2104", uptime: "12d 3h 11m", cpu: "2.1%",  mem: "287 MB" },
  { name: "cloudflared",    status: "active", pid: "2234", uptime: "12d 3h 10m", cpu: "0.2%",  mem: "32 MB"  },
];

const PORTS = [
  { port: 80,   service: "nginx (HTTP)",   proto: "TCP" },
  { port: 443,  service: "nginx (HTTPS)",  proto: "TCP" },
  { port: 3001, service: "clientum-api",   proto: "TCP" },
  { port: 5432, service: "postgresql",     proto: "TCP" },
  { port: 8080, service: "evolution-api",  proto: "TCP" },
];

const DIAG_RESULTS = [
  { category: "Entorno (.env)",  status: "ok",   msg: "Todas las variables obligatorias están definidas" },
  { category: "Base de Datos",   status: "ok",   msg: "Conexión PostgreSQL estable — latencia 3ms" },
  { category: "Builds & Node",   status: "ok",   msg: "Node 20.x LTS — dependencias intactas" },
  { category: "AFIP Certs",      status: "warn", msg: "Certificado expira en 8 días — renovar pronto" },
  { category: "Backup DB",       status: "ok",   msg: "Último backup: hace 6h — /var/backups/clientum" },
  { category: "Disco libre",     status: "warn", msg: "74% ocupado — considera expandir almacenamiento" },
  { category: "Nginx config",    status: "ok",   msg: "Configuración válida — proxy_pass OK" },
  { category: "Cloudflare",      status: "ok",   msg: "Túnel activo — UUID verificado" },
];

const HEALTH_CHECKS = [
  { name: "API Health endpoint",   endpoint: "/api/health",          status: "ok",   latency: "12ms",  code: 200 },
  { name: "Auth middleware",        endpoint: "/api/auth/me",         status: "ok",   latency: "8ms",   code: 200 },
  { name: "DB connection pool",     endpoint: "PostgreSQL pool",      status: "ok",   latency: "3ms",   code: null },
  { name: "AFIP WSAA token",        endpoint: "AFIP webservice",      status: "warn", latency: "340ms", code: null },
  { name: "Evolution API gateway",  endpoint: "http://localhost:8080",status: "ok",   latency: "22ms",  code: 200 },
  { name: "OpenRouter proxy",       endpoint: "openrouter.ai",        status: "ok",   latency: "180ms", code: 200 },
  { name: "Cloudflare tunnel",      endpoint: "cloudflared health",   status: "ok",   latency: "5ms",   code: null },
];

const LOG_LINES = [
  { ts: "14:52:01", level: "INFO",  src: "api-server",    msg: "POST /api/chatbot/message → 200 (32ms)" },
  { ts: "14:51:58", level: "INFO",  src: "afip",          msg: "CAE emitido: FC-A 0001-00000312 — $184.500" },
  { ts: "14:51:45", level: "INFO",  src: "evolution-api", msg: "Mensaje WA enviado a +5491144332211" },
  { ts: "14:51:30", level: "WARN",  src: "afip",          msg: "Token WSAA expira en 8 días — renovar certificado" },
  { ts: "14:51:12", level: "INFO",  src: "api-server",    msg: "GET /api/analytics → 200 (18ms)" },
  { ts: "14:50:55", level: "INFO",  src: "auth",          msg: "Login OK — user replit47@clientum.com.ar" },
  { ts: "14:50:33", level: "INFO",  src: "db",            msg: "Query OK — leads.findMany (5ms)" },
  { ts: "14:50:10", level: "ERROR", src: "openrouter",    msg: "Rate limit hit — model fallback activado (gemini-flash)" },
  { ts: "14:49:48", level: "INFO",  src: "api-server",    msg: "POST /api/invoices → 201 (145ms)" },
  { ts: "14:49:22", level: "INFO",  src: "broadcast",     msg: "Batch WA enviado: 48 destinatarios OK / 2 fallidos" },
  { ts: "14:49:01", level: "WARN",  src: "disk",          msg: "Uso de disco: 74% — umbral de alerta: 80%" },
  { ts: "14:48:39", level: "INFO",  src: "scheduler",     msg: "Cron ejecutado: limpiar sesiones expiradas" },
];

const ALERTS = [
  { sev: "critical", icon: "ti-certificate",    title: "Certificado AFIP por vencer",  desc: "El certificado de AFIP expira en 8 días. Renovar antes de producción.", time: "Hace 2 horas",  accent: R },
  { sev: "warn",     icon: "ti-device-floppy",  title: "Disco al 74%",                 desc: "Almacenamiento por encima del 70%. Considera expandir el volumen.",     time: "Hace 4 horas",  accent: Y },
  { sev: "warn",     icon: "ti-alert-triangle", title: "Rate limit OpenRouter",         desc: "Se activó el fallback del modelo de IA. Revisar límites del plan.",      time: "Hace 6 horas",  accent: Y },
  { sev: "info",     icon: "ti-check",          title: "Backup completado",             desc: "Copia de seguridad completada exitosamente en /var/backups/clientum.",    time: "Hace 6h 12m",   accent: G },
  { sev: "info",     icon: "ti-brand-whatsapp", title: "Broadcast ejecutado",          desc: "48 de 50 mensajes entregados correctamente.",                            time: "Hace 7 horas",  accent: G },
];

export default function SystemMonitor() {
  const [tab, setTab] = useState<Tab>("overview");
  const [diagRunning, setDiagRunning] = useState(false);
  const [diagDone, setDiagDone]       = useState(false);
  const [healthRunning, setHealthRunning] = useState(false);
  const [healthDone, setHealthDone]       = useState(false);
  const [logFilter, setLogFilter] = useState<"ALL" | "INFO" | "WARN" | "ERROR">("ALL");
  const [metrics, setMetrics] = useState({ cpu: 23, ram: 68, disk: 74, net: 142 });

  useEffect(() => {
    const id = setInterval(() => {
      setMetrics(m => ({
        cpu:  Math.min(95, Math.max(5,  m.cpu  + (Math.random() - 0.5) * 6)),
        ram:  Math.min(95, Math.max(40, m.ram  + (Math.random() - 0.5) * 2)),
        disk: m.disk,
        net:  Math.min(500, Math.max(20, m.net + (Math.random() - 0.5) * 30)),
      }));
    }, 2500);
    return () => clearInterval(id);
  }, []);

  const runDiag = useCallback(() => {
    setDiagRunning(true); setDiagDone(false);
    setTimeout(() => { setDiagRunning(false); setDiagDone(true); }, 2200);
  }, []);

  const runHealth = useCallback(() => {
    setHealthRunning(true); setHealthDone(false);
    setTimeout(() => { setHealthRunning(false); setHealthDone(true); }, 1800);
  }, []);

  const filteredLogs = logFilter === "ALL" ? LOG_LINES : LOG_LINES.filter(l => l.level === logFilter);
  const warnCount = ALERTS.filter(a => a.sev !== "info").length;

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "overview",    label: "Vista General",   icon: "ti-layout-dashboard" },
    { id: "diagnostics", label: "Diagnósticos",    icon: "ti-shield-check"     },
    { id: "health",      label: "Vitalidad",       icon: "ti-heartbeat"        },
    { id: "logs",        label: "Consola de Logs", icon: "ti-terminal-2"       },
    { id: "alerts",      label: "Alertas",         icon: "ti-bell"             },
  ];

  return (
    <div className="overflow-y-auto h-full flex flex-col">

      {/* ── Sticky status + tab bar ── */}
      <div className="sticky top-0 z-20 flex-shrink-0 border-b" style={{ background: "#FFFFFF", borderColor: A }}>

        {/* Status row */}
        <div className="flex items-center justify-between px-6 pt-3 pb-2 border-b" style={{ borderColor: A }}>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: G }} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: G }} />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: D }}>
              ubuntu-server-prod · Servidor Conectado
            </span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(16,185,129,0.08)", color: G, border: `1px solid rgba(16,185,129,0.2)` }}>
            Admin OS v1.0
          </span>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-6 pt-2">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="relative flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-t-lg transition-all border border-b-0"
              style={tab === t.id
                ? { background: "#FDFDFB", borderColor: A, color: P, borderBottomColor: "#FDFDFB" }
                : { background: "transparent", borderColor: "transparent", color: D }}>
              <i className={`ti ${t.icon} text-sm`} />
              {t.label}
              {t.id === "alerts" && warnCount > 0 && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white ml-0.5" style={{ background: Y }}>
                  {warnCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 space-y-8">

        {/* ══ VISTA GENERAL ══ */}
        {tab === "overview" && (
          <>
            <div>
              <SH label="Métricas del Servidor" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard label="CPU"                value={`${metrics.cpu.toFixed(0)}%`}  sub="8 vCPUs · Intel Xeon E5"    icon="ti-cpu"                         accent={P} percent={metrics.cpu} />
                <MetricCard label="Memoria RAM"        value={`${metrics.ram.toFixed(0)}%`}  sub="10.8 GB libres de 16 GB"    icon="ti-device-desktop-analytics"    accent={Y} percent={metrics.ram} />
                <MetricCard label="Almacenamiento"     value={`${metrics.disk}%`}             sub="12.5 GB libres de SSD"      icon="ti-device-floppy"               accent={R} percent={metrics.disk} />
                <MetricCard label="Red"                value={`${metrics.net.toFixed(0)} KB/s`} sub="↑ 38 KB/s · ↓ rest"      icon="ti-wifi"                        accent={G} />
              </div>
            </div>

            <div>
              <SH label="Servicios del Sistema (Systemd)" />
              <div className="bg-[#FFFFFF] border rounded-2xl overflow-hidden shadow-sm" style={{ borderColor: A }}>
                <div className="h-1 bg-[#031E43]" />
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs" style={{ color: D }}>Verifica y monitorea los procesos del servidor</p>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg" style={{ background: "rgba(16,185,129,0.08)", color: G, border: `1px solid rgba(16,185,129,0.2)` }}>
                      {SERVICES.filter(s => s.status === "active").length} Activos
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b" style={{ borderColor: A }}>
                          {["Servicio", "Estado", "PID", "Uptime", "CPU", "Mem"].map(h => (
                            <th key={h} className="text-left pb-2 pr-4 font-bold text-[10px] uppercase tracking-wider" style={{ color: D }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {SERVICES.map(s => (
                          <tr key={s.name} className="border-b last:border-0 hover:bg-[#FDFDFB] transition-colors" style={{ borderColor: A }}>
                            <td className="py-2.5 pr-4 font-mono font-semibold" style={{ color: P }}>{s.name}</td>
                            <td className="py-2.5 pr-4">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(16,185,129,0.1)", color: G }}>Activo</span>
                            </td>
                            <td className="py-2.5 pr-4 font-mono" style={{ color: D }}>{s.pid}</td>
                            <td className="py-2.5 pr-4" style={{ color: D }}>{s.uptime}</td>
                            <td className="py-2.5 pr-4" style={{ color: D }}>{s.cpu}</td>
                            <td className="py-2.5"    style={{ color: D }}>{s.mem}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <SH label="Puertos Activos en Escucha" />
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {PORTS.map(p => (
                  <div key={p.port} className="bg-[#FFFFFF] border rounded-2xl overflow-hidden shadow-sm" style={{ borderColor: A }}>
                    <div className="h-1 bg-[#031E43]" />
                    <div className="p-4 flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-black font-mono" style={{ color: P }}>:{p.port}</span>
                        <span className="w-2 h-2 rounded-full" style={{ background: G }} />
                      </div>
                      <p className="text-xs font-semibold" style={{ color: P }}>{p.service}</p>
                      <p className="text-[10px] font-mono" style={{ color: D }}>{p.proto} · LISTEN</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ══ DIAGNÓSTICOS ══ */}
        {tab === "diagnostics" && (
          <div>
            <SH label="Auditoría de Integridad del Sistema" />
            <div className="bg-[#FFFFFF] border rounded-2xl overflow-hidden shadow-sm" style={{ borderColor: A }}>
              <div className="h-1 bg-[#031E43]" />
              <div className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                  <div>
                    <h3 className="text-sm font-bold" style={{ color: P }}>Diagnóstico Integral de Clientum</h3>
                    <p className="text-[10px] font-mono mt-0.5" style={{ color: D }}>scripts-ubuntu/monitoreo/diagnostico.sh</p>
                  </div>
                  <button
                    onClick={runDiag}
                    disabled={diagRunning}
                    className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl text-white transition-all disabled:opacity-50"
                    style={{ background: P }}
                  >
                    {diagRunning
                      ? <><i className="ti ti-loader-2 animate-spin text-sm" /> Ejecutando…</>
                      : <><i className="ti ti-shield-search text-sm" /> Ejecutar Auditoría Completa</>
                    }
                  </button>
                </div>

                {/* Result area */}
                <div className="border rounded-xl overflow-hidden" style={{ borderColor: A }}>
                  <div className="px-4 py-2.5 border-b flex justify-between items-center" style={{ background: "#FDFDFB", borderColor: A }}>
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: D }}>Reporte de Auditoría</span>
                    <span className="text-[10px] font-mono" style={{ color: D }}>{diagDone ? new Date().toLocaleTimeString("es-AR") : "–"}</span>
                  </div>
                  <div className="p-4 min-h-[200px]">
                    {!diagDone && !diagRunning && (
                      <p className="text-center py-10 text-sm" style={{ color: D }}>
                        Haga clic en "Ejecutar Auditoría Completa" para auditar el sistema.
                      </p>
                    )}
                    {diagRunning && (
                      <div className="space-y-2">
                        {["Verificando variables de entorno…", "Conectando a PostgreSQL…", "Revisando builds y dependencias…", "Validando certificados AFIP…", "Auditando backups…"].map((l, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs" style={{ color: D }}>
                            <i className="ti ti-loader-2 animate-spin text-sm" style={{ color: P }} />
                            <span className="font-mono">{l}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {diagDone && (
                      <div className="space-y-2">
                        {DIAG_RESULTS.map(r => (
                          <div key={r.category} className="flex items-start gap-3 p-3 rounded-xl border" style={{
                            borderColor: r.status === "ok" ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)",
                            background: r.status === "ok" ? "rgba(16,185,129,0.04)" : "rgba(245,158,11,0.04)",
                          }}>
                            <i className={`ti ${r.status === "ok" ? "ti-circle-check" : "ti-alert-triangle"} text-sm mt-0.5`}
                              style={{ color: r.status === "ok" ? G : Y }} />
                            <div>
                              <p className="text-xs font-bold" style={{ color: P }}>{r.category}</p>
                              <p className="text-[11px]" style={{ color: D }}>{r.msg}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ VITALIDAD ══ */}
        {tab === "health" && (
          <div>
            <SH label="Health Check de Servicios" />
            <div className="bg-[#FFFFFF] border rounded-2xl overflow-hidden shadow-sm" style={{ borderColor: A }}>
              <div className="h-1 bg-[#10B981]" />
              <div className="p-5">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-sm font-bold" style={{ color: P }}>Health Check de Vitalidad</h3>
                    <p className="text-[10px] font-mono mt-0.5" style={{ color: D }}>scripts-ubuntu/monitoreo/health-check.sh</p>
                  </div>
                  <button
                    onClick={runHealth}
                    disabled={healthRunning}
                    className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl text-white transition-all disabled:opacity-50"
                    style={{ background: G }}
                  >
                    {healthRunning
                      ? <><i className="ti ti-loader-2 animate-spin text-sm" /> Verificando…</>
                      : <><i className="ti ti-heartbeat text-sm" /> Ejecutar Test</>
                    }
                  </button>
                </div>

                {!healthDone && !healthRunning && (
                  <p className="text-center py-10 text-sm" style={{ color: D }}>
                    Haga clic en "Ejecutar Test" para verificar el estado de todos los servicios.
                  </p>
                )}
                {healthRunning && (
                  <div className="space-y-2">
                    {HEALTH_CHECKS.slice(0, 4).map(h => (
                      <div key={h.name} className="flex items-center gap-3 p-3 rounded-xl border animate-pulse" style={{ borderColor: A }}>
                        <i className="ti ti-loader-2 animate-spin text-sm" style={{ color: D }} />
                        <span className="text-xs" style={{ color: D }}>{h.name}</span>
                      </div>
                    ))}
                  </div>
                )}
                {healthDone && (
                  <div className="space-y-2">
                    {HEALTH_CHECKS.map(h => (
                      <div key={h.name} className="flex items-center gap-3 p-3 rounded-xl border" style={{
                        borderColor: h.status === "ok" ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)",
                        background: h.status === "ok" ? "rgba(16,185,129,0.04)" : "rgba(245,158,11,0.04)",
                      }}>
                        <i className={`ti ${h.status === "ok" ? "ti-check" : "ti-alert-triangle"} text-sm`}
                          style={{ color: h.status === "ok" ? G : Y }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold" style={{ color: P }}>{h.name}</p>
                          <p className="text-[10px] font-mono" style={{ color: D }}>{h.endpoint}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {h.code && <p className="text-[10px] font-mono" style={{ color: D }}>{h.code}</p>}
                          <p className="text-[10px] font-mono" style={{ color: D }}>{h.latency}</p>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 pt-2 text-xs" style={{ color: D }}>
                      <i className="ti ti-circle-check text-sm" style={{ color: G }} />
                      {HEALTH_CHECKS.filter(h => h.status === "ok").length} / {HEALTH_CHECKS.length} checks pasaron
                      {HEALTH_CHECKS.some(h => h.status !== "ok") && (
                        <span className="font-semibold" style={{ color: Y }}>
                          · {HEALTH_CHECKS.filter(h => h.status !== "ok").length} advertencia(s)
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══ LOGS ══ */}
        {tab === "logs" && (
          <div>
            <SH label="Consola de Logs del Sistema" />
            <div className="bg-[#FFFFFF] border rounded-2xl overflow-hidden shadow-sm" style={{ borderColor: A }}>
              <div className="h-1 bg-[#031E43]" />
              <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: A }}>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "rgba(3,30,67,0.08)" }}>
                    <i className="ti ti-terminal-2 text-xs" style={{ color: P }} />
                  </div>
                  <span className="text-xs font-bold" style={{ color: P }}>Logs en tiempo real</span>
                </div>
                <div className="flex items-center gap-1">
                  {(["ALL", "INFO", "WARN", "ERROR"] as const).map(f => (
                    <button key={f} onClick={() => setLogFilter(f)}
                      className="px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all"
                      style={logFilter === f
                        ? { background: f === "ERROR" ? R : f === "WARN" ? Y : P, color: "#FFF" }
                        : { background: "rgba(3,30,67,0.04)", color: D, border: `1px solid ${A}` }}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              {/* Terminal area — dark code block inside white card, same pattern as Admin debug section */}
              <div className="m-4 rounded-xl overflow-hidden border" style={{ borderColor: A }}>
                <div className="flex items-center gap-2 px-4 py-2.5 border-b" style={{ background: "#031E43", borderColor: "rgba(255,255,255,0.08)" }}>
                  <div className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
                    <span className="w-3 h-3 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
                    <span className="w-3 h-3 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
                  </div>
                  <span className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.4)" }}>clientum-api-server.log</span>
                </div>
                <div className="overflow-y-auto py-2" style={{ background: "#06101f", maxHeight: "360px" }}>
                  {filteredLogs.map((line, i) => {
                    const lc: Record<string, string> = { INFO: "#10B981", WARN: "#F59E0B", ERROR: "#EF4444" };
                    return (
                      <div key={i} className="flex items-start gap-3 px-4 py-1 hover:bg-white/5 transition-colors">
                        <span className="text-[10px] font-mono flex-shrink-0" style={{ color: "rgba(255,255,255,0.3)" }}>{line.ts}</span>
                        <span className="text-[10px] font-bold w-11 text-center flex-shrink-0 font-mono" style={{ color: lc[line.level] ?? "#94a3b8" }}>{line.level}</span>
                        <span className="text-[10px] font-mono w-24 flex-shrink-0" style={{ color: "rgba(255,255,255,0.4)" }}>{line.src}</span>
                        <span className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.8)" }}>{line.msg}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ ALERTAS ══ */}
        {tab === "alerts" && (
          <div>
            <SH label="Alertas Activas del Sistema" />
            <p className="text-[10px] font-bold uppercase tracking-widest mb-4" style={{ color: D }}>
              {ALERTS.length} alertas · {ALERTS.filter(a => a.sev === "critical").length} crítica(s)
            </p>
            <div className="space-y-3">
              {ALERTS.map((a, i) => (
                <div key={i} className="bg-[#FFFFFF] border rounded-2xl overflow-hidden shadow-sm" style={{ borderColor: A }}>
                  <div className="h-1" style={{ background: a.accent }} />
                  <div className="p-5 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${a.accent}12` }}>
                      <i className={`ti ${a.icon} text-sm`} style={{ color: a.accent }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-bold" style={{ color: P }}>{a.title}</h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{
                          background: `${a.accent}12`,
                          color: a.accent,
                          border: `1px solid ${a.accent}30`,
                        }}>
                          {a.sev === "critical" ? "Crítico" : a.sev === "warn" ? "Advertencia" : "Info"}
                        </span>
                      </div>
                      <p className="text-xs" style={{ color: D }}>{a.desc}</p>
                      <p className="text-[10px] font-mono mt-1.5" style={{ color: "rgba(59,80,109,0.6)" }}>{a.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
