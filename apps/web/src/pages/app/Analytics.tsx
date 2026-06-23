import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from "recharts";
import { useAuth } from "@workspace/replit-auth-web";
import { useTheme } from "@/hooks/useTheme";

async function apiFetch(url: string) {
  const r = await fetch(url, { credentials: "include" });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error((e as { error?: string }).error ?? `HTTP ${r.status}`);
  }
  return r.json();
}

interface LeadStatus { status: string | null; count: number }
interface ChannelRow  { channel: string | null; count: number }
interface DayRow      { date: string; count: number }
interface FunnelStage { label: string; value: number }
interface AnalyticsData {
  plan: string;
  totalConversations: number;
  totalMessages: number;
  leadsByStatus: LeadStatus[];
  channelBreakdown: ChannelRow[];
  messagesByDay: DayRow[];
  qualifiedLeads: number;
  conversionRate: number;
  avgTurnsPerSession: number;
  outcomeBreakdown: { aiActive: number; resolved: number; escalated: number };
  resolutionRate: number;
  funnelStages: FunnelStage[];
}

interface CsatEntry { score: number; comment: string; ts: string }

const STATUS_LABELS: Record<string, string> = {
  new: "Nuevo", interested: "Interesado", qualified: "Calificado",
  closed: "Cerrado", lost: "Perdido",
};
const STATUS_COLORS: Record<string, string> = {
  new: "#031E43", interested: "#3B506D", qualified: "#2dd8a0",
  closed: "#f59e0b", lost: "#ef4444",
};
const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp", web: "Web widget", api: "API",
};

function fmtDate(d: string) {
  const [, m, day] = d.split("-");
  const months = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  return `${day} ${months[parseInt(m, 10)]}`;
}

function fmtTs(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" }) +
    " " + d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

function DonutChart({ aiActive, resolved, escalated, total, isDark }: {
  aiActive: number; resolved: number; escalated: number; total: number; isDark: boolean;
}) {
  const segments = [
    { label: "IA activa", value: aiActive, color: "#031E43", icon: "ti-robot" },
    { label: "Resueltas", value: resolved, color: "#2dd8a0", icon: "ti-circle-check" },
    { label: "Escaladas", value: escalated, color: "#f59e0b", icon: "ti-user-bolt" },
  ];
  const cx = 80; const cy = 80; const R = 64; const r = 44;

  function describeArc(start: number, end: number, outerR: number, innerR: number) {
    const s = start - Math.PI / 2;
    const e = end - Math.PI / 2;
    const x1 = cx + outerR * Math.cos(s);
    const y1 = cy + outerR * Math.sin(s);
    const x2 = cx + outerR * Math.cos(e);
    const y2 = cy + outerR * Math.sin(e);
    const xi1 = cx + innerR * Math.cos(s);
    const yi1 = cy + innerR * Math.sin(s);
    const xi2 = cx + innerR * Math.cos(e);
    const yi2 = cy + innerR * Math.sin(e);
    const lg = end - start > Math.PI ? 1 : 0;
    return `M${x1},${y1} A${outerR},${outerR} 0 ${lg},1 ${x2},${y2} L${xi2},${yi2} A${innerR},${innerR} 0 ${lg},0 ${xi1},${yi1}Z`;
  }

  let acc = 0;
  const paths = total === 0 ? [] : segments.map(seg => {
    const start = acc * 2 * Math.PI;
    const frac = seg.value / total;
    const end = (acc + frac) * 2 * Math.PI;
    acc += frac;
    return { ...seg, path: frac > 0.001 ? describeArc(start, end, R, r) : "", pct: Math.round(frac * 100) };
  });

  return (
    <div className="flex items-center gap-6">
      <svg width="160" height="160" viewBox="0 0 160 160" className="flex-shrink-0">
        {total === 0 ? (
          <circle cx={cx} cy={cy} r={R} fill="none" stroke={isDark ? "rgba(255,255,255,0.06)" : "#e2e8f0"} strokeWidth={R - r} />
        ) : (
          paths.map((seg, i) => seg.path ? (
            <path key={i} d={seg.path} fill={seg.color} opacity={0.9} />
          ) : null)
        )}
        <circle cx={cx} cy={cy} r={r - 4} fill={isDark ? "#0b1a2e" : "#FDFDFB"} />
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="22" fontWeight="800" fill={isDark ? "#fff" : "#1e293b"}>{total}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize="9" fill={isDark ? "rgba(255,255,255,0.35)" : "#94a3b8"} fontWeight="600" letterSpacing="1">CONVS</text>
      </svg>
      <div className="space-y-3 flex-1">
        {segments.map((seg) => {
          const pct = total > 0 ? Math.round((seg.value / total) * 100) : 0;
          return (
            <div key={seg.label}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
                  <span className={`text-xs font-semibold ${isDark ? "text-cool-steel" : "text-[#3B506D]"}`}>{seg.label}</span>
                </div>
                <span className={`text-xs font-black tabular-nums ${isDark ? "text-white" : "text-[#031E43]"}`}>
                  {seg.value} <span className={`font-normal text-[10px] ${isDark ? "text-cool-steel/55" : "text-[#3B506D]/70"}`}>({pct}%)</span>
                </span>
              </div>
              <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? "bg-silver/10" : "bg-[#DDDFE2]/40"}`}>
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: seg.color }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const { isLight } = useTheme();

  const { data, isLoading, error } = useQuery<AnalyticsData>({
    queryKey: ["analytics"],
    queryFn: () => apiFetch("/api/analytics"),
    enabled: !!user,
    staleTime: 60_000,
    retry: (failCount, err) => {
      const msg = (err as Error)?.message ?? "";
      if (msg.startsWith("401") || msg.startsWith("403") || msg.includes("HTTP 401") || msg.includes("HTTP 403")) return false;
      return failCount < 2;
    },
  });

  const [csatScore, setCsatScore] = useState(0);
  const [csatHover, setCsatHover] = useState(0);
  const [csatComment, setCsatComment] = useState("");
  const [csatEntries, setCsatEntries] = useState<CsatEntry[]>(() => {
    try { return JSON.parse(localStorage.getItem("csat_entries") ?? "[]"); } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem("csat_entries", JSON.stringify(csatEntries));
  }, [csatEntries]);

  function submitCsat() {
    if (!csatScore) return;
    const entry: CsatEntry = { score: csatScore, comment: csatComment, ts: new Date().toISOString() };
    setCsatEntries(prev => [entry, ...prev].slice(0, 100));
    setCsatScore(0);
    setCsatComment("");
  }

  const avgCsat = csatEntries.length > 0
    ? (csatEntries.reduce((s, e) => s + e.score, 0) / csatEntries.length).toFixed(1)
    : null;

  const grid      = isLight ? "rgba(0,0,0,0.06)"    : "rgba(255,255,255,0.04)";
  const axisColor = isLight ? "#94a3b8"              : "rgba(255,255,255,0.3)";
  const cardBg    = isLight ? "#ffffff"              : undefined;
  const cardBorder= isLight ? "#e2e8f0"              : undefined;
  const labelColor= isLight ? "#64748b"              : undefined;
  const textColor = isLight ? "#1e293b"              : "#ffffff";

  const cardClass = isLight
    ? "bg-white border border-[#DDDFE2] rounded-2xl"
    : "bg-navy-card border border-silver/15 rounded-2xl";

  const labelClass = isLight ? "text-[#3B506D]" : "text-cool-steel";
  const valueClass = isLight ? "text-[#031E43]" : "text-white";
  const mutedClass = isLight ? "text-[#3B506D]/70" : "text-cool-steel/55";

  function TooltipContent({ active, payload, label }: { active?: boolean; payload?: Array<{ color: string; name: string; value: number }>; label?: string }) {
    if (!active || !payload?.length) return null;
    const bg = isLight ? "#ffffff" : "#0d1e33";
    const border = isLight ? "#e2e8f0" : "rgba(255,255,255,0.1)";
    return (
      <div style={{ background: bg, border: `1px solid ${border}` }} className="p-3.5 rounded-xl shadow-xl text-left">
        <p style={{ color: labelColor ?? "rgba(255,255,255,0.4)" }} className="text-[10px] font-bold uppercase tracking-widest mb-2">{label}</p>
        {payload.map((item, i) => (
          <div key={i} className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
            <span style={{ color: isLight ? "#64748b" : "rgba(255,255,255,0.6)" }} className="text-xs">{item.name}:</span>
            <strong style={{ color: textColor }} className="text-xs font-mono">{item.value}</strong>
          </div>
        ))}
      </div>
    );
  }

  async function exportPDF() {
    if (!data) return;
    const plan = data.plan ?? "free";
    if (plan === "free" || plan === "starter") {
      alert("El reporte PDF está disponible desde el plan Pro. Actualizá tu plan para descargar.");
      return;
    }
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const now = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });

    doc.setFillColor(7, 16, 42);
    doc.rect(0, 0, 210, 40, "F");
    doc.setTextColor(45, 216, 160);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("Clientum", 15, 18);
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text("Reporte Gerencial — Últimos 30 días", 15, 27);
    doc.setFontSize(9);
    doc.setTextColor(150, 160, 180);
    doc.text(`Generado el ${now}`, 15, 34);

    let y = 50;
    doc.setTextColor(45, 216, 160);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("KPIs PRINCIPALES", 15, y);
    y += 6;
    doc.setDrawColor(45, 216, 160);
    doc.setLineWidth(0.5);
    doc.line(15, y, 195, y);
    y += 6;

    const kpis = [
      ["Conversaciones totales", data.totalConversations.toString()],
      ["Mensajes totales", data.totalMessages.toString()],
      ["Tasa de conversión", `${data.conversionRate}%`],
      ["Tasa de resolución", `${data.resolutionRate}%`],
      ["Leads calificados", data.qualifiedLeads.toString()],
      ["Turnos promedio/conv.", data.avgTurnsPerSession.toString()],
    ];
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    kpis.forEach(([label, value], i) => {
      const col = i % 2 === 0 ? 15 : 110;
      if (i % 2 === 0 && i > 0) y += 8;
      doc.setTextColor(100, 116, 139);
      doc.text(label, col, y);
      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "bold");
      doc.text(value, col + 60, y);
      doc.setFont("helvetica", "normal");
    });
    y += 14;

    doc.setTextColor(45, 216, 160);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("RESULTADO DE CONVERSACIONES", 15, y);
    y += 6;
    doc.setDrawColor(45, 216, 160);
    doc.line(15, y, 195, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const outcomes = [
      ["IA activa", data.outcomeBreakdown.aiActive.toString()],
      ["Resueltas", data.outcomeBreakdown.resolved.toString()],
      ["Escaladas", data.outcomeBreakdown.escalated.toString()],
    ];
    outcomes.forEach(([label, value], i) => {
      const col = 15 + i * 62;
      doc.setTextColor(100, 116, 139);
      doc.text(label, col, y);
      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "bold");
      doc.text(value, col + 28, y);
      doc.setFont("helvetica", "normal");
    });
    y += 14;

    if (csatEntries.length > 0) {
      doc.setTextColor(45, 216, 160);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("CSAT — SATISFACCIÓN DEL CLIENTE", 15, y);
      y += 6;
      doc.setDrawColor(45, 216, 160);
      doc.line(15, y, 195, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Evaluaciones totales: ${csatEntries.length}`, 15, y);
      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "bold");
      doc.text(`Promedio: ${avgCsat ?? "—"} / 5`, 100, y);
      doc.setFont("helvetica", "normal");
      y += 8;
      const recent = csatEntries.slice(0, 8);
      recent.forEach(e => {
        const stars = "★".repeat(e.score) + "☆".repeat(5 - e.score);
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);
        doc.text(`${stars}  ${e.comment || "(sin comentario)"}`, 15, y);
        doc.setTextColor(150, 160, 180);
        doc.text(fmtTs(e.ts), 155, y);
        y += 6;
        if (y > 270) return;
      });
    }

    doc.setFontSize(8);
    doc.setTextColor(150, 160, 180);
    doc.setFont("helvetica", "normal");
    doc.text("Clientum — clientum.com.ar", 15, 287);
    doc.text(`Plan: ${(data.plan ?? "free").toUpperCase()}`, 170, 287);

    doc.save(`reporte-clientum-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  function exportCSV() {
    if (!data) return;
    const bom = "\uFEFF";
    const rows: (string | number)[][] = [
      ["Métrica", "Valor"],
      ["Conversaciones totales", data.totalConversations],
      ["Mensajes totales", data.totalMessages],
      ["Tasa de conversión (%)", data.conversionRate],
      ["Tasa de resolución (%)", data.resolutionRate],
      ["Leads calificados", data.qualifiedLeads],
      ["Turnos promedio/conv.", data.avgTurnsPerSession],
      ["IA activa", data.outcomeBreakdown.aiActive],
      ["Resueltas", data.outcomeBreakdown.resolved],
      ["Escaladas", data.outcomeBreakdown.escalated],
      [],
      ["Estado de leads", "Cantidad"],
      ...data.leadsByStatus.map(l => [STATUS_LABELS[l.status ?? ""] ?? (l.status ?? "Sin estado"), l.count]),
      [],
      ["Canal", "Conversaciones"],
      ...data.channelBreakdown.map(ch => [CHANNEL_LABELS[ch.channel ?? ""] ?? (ch.channel ?? "Otro"), ch.count]),
    ];
    if (csatEntries.length > 0) {
      rows.push([], ["CSAT — Evaluaciones", ""], ["Score", "Comentario", "Fecha"]);
      csatEntries.forEach(e => rows.push([e.score, e.comment || "", fmtTs(e.ts)]));
    }
    const csv = bom + rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte-clientum-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24 gap-4">
        <i className="ti ti-lock text-5xl text-cool-steel/40" />
        <p className={`text-sm ${mutedClass}`}>Iniciá sesión para ver tus analytics</p>
        <a href="/api/auth/login" className="bg-cl-accent text-navy font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-cl-accent-hover transition-all">
          Iniciar sesión →
        </a>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full py-32">
        <i className="ti ti-loader-2 animate-spin text-3xl text-cl-accent" />
      </div>
    );
  }

  if (error || !data) {
    const errStr = error instanceof Error ? error.message : "";
    const isUnauth = errStr.includes("401") || errStr.includes("HTTP 401");
    return (
      <div className="flex flex-col items-center justify-center h-full py-24 gap-3">
        <i className={`ti text-4xl ${isUnauth ? "ti-lock text-white/10" : "ti-alert-circle text-red-400"}`} />
        <p className={`text-sm font-bold ${mutedClass}`}>
          {isUnauth ? "Sesión requerida" : "Error al cargar analytics"}
        </p>
        <p className={`text-xs ${mutedClass} opacity-70`}>
          {isUnauth ? "Iniciá sesión para ver tus métricas y reportes." : errStr}
        </p>
        {isUnauth && (
          <a href="/api/login" className="mt-2 px-5 py-2 bg-cl-accent text-navy text-xs font-bold rounded-lg no-underline hover:bg-cl-accent/90 transition">
            Iniciar sesión →
          </a>
        )}
      </div>
    );
  }

  const totalConvs = data.totalConversations;
  const maxFunnel = data.funnelStages[0]?.value ?? 1;
  const isPro = !["free", "starter"].includes(data.plan ?? "free");

  const kpis = [
    { label: "Conversaciones",     value: data.totalConversations, icon: "ti-messages",         color: "text-cl-blue" },
    { label: "Mensajes totales",   value: data.totalMessages,      icon: "ti-message-2",        color: "text-purple-400" },
    { label: "Tasa de conversión", value: `${data.conversionRate}%`, icon: "ti-trending-up",    color: "text-cl-accent" },
    { label: "Tasa de resolución", value: `${data.resolutionRate}%`, icon: "ti-circle-check",   color: "text-yellow-400" },
  ];

  return (
    <section className="p-8 space-y-6">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ color: textColor }} className="text-lg font-extrabold">Últimos 30 días</h2>
          <p style={{ color: isLight ? "#94a3b8" : "rgba(255,255,255,0.4)" }} className="text-xs mt-0.5">Datos reales del chatbot y CRM</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl border transition-all ${
              isLight
                ? "bg-white border-[#DDDFE2] text-[#3B506D] hover:border-[#DDDFE2]"
                : "bg-navy-3 border-silver/20 text-cool-steel hover:text-white hover:border-silver/30"
            }`}
          >
            <i className="ti ti-table-export" />
            Exportar CSV
          </button>
          <button
            onClick={exportPDF}
            title={isPro ? "Descargar reporte PDF" : "Disponible desde plan Pro"}
            className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl border transition-all ${
              isPro
                ? isLight
                  ? "bg-white border-[#DDDFE2] text-[#3B506D] hover:border-[#DDDFE2]"
                  : "bg-navy-3 border-silver/20 text-cool-steel hover:text-white hover:border-silver/30"
                : isLight
                  ? "bg-[#FDFDFB] border-[#DDDFE2] text-[#3B506D]/70 cursor-not-allowed"
                  : "bg-navy-3/50 border-silver/15 text-cool-steel/45 cursor-not-allowed"
            }`}
          >
            <i className="ti ti-file-download" />
            Exportar PDF
            {!isPro && <i className="ti ti-lock text-xs ml-1 opacity-60" />}
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className={`${cardClass} p-5`} style={cardBg ? { background: cardBg, borderColor: cardBorder } : {}}>
            <div className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${labelClass}`}>{k.label}</div>
            <div className={`text-3xl font-black ${k.color}`}>{k.value}</div>
            <div className={`text-[10px] mt-1 ${mutedClass}`}>Últimos 30 días</div>
          </div>
        ))}
      </div>

      {/* Extra KPIs row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Leads calificados",    value: data.qualifiedLeads,          icon: "ti-user-check",      color: "#2dd8a0" },
          { label: "Turnos promedio/conv", value: data.avgTurnsPerSession,      icon: "ti-repeat",          color: "#3B506D" },
          { label: "IA activa",            value: data.outcomeBreakdown.aiActive, icon: "ti-robot",          color: "#031E43" },
        ].map((k) => (
          <div key={k.label} className={`${cardClass} p-4 flex items-center gap-4`} style={cardBg ? { background: cardBg, borderColor: cardBorder } : {}}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${k.color}18` }}>
              <i className={`ti ${k.icon} text-lg`} style={{ color: k.color }} />
            </div>
            <div>
              <div className={`text-[10px] font-bold uppercase tracking-wider ${labelClass}`}>{k.label}</div>
              <div className={`text-2xl font-black ${valueClass}`}>{k.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Messages per day chart */}
      <div className={`${cardClass} p-6`} style={cardBg ? { background: cardBg, borderColor: cardBorder } : {}}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 style={{ color: textColor }} className="font-extrabold text-sm flex items-center gap-2">
              <i className="ti ti-chart-area-line text-cl-accent" /> Mensajes por día
            </h3>
            <p className={`text-xs mt-0.5 ${labelClass}`}>Volumen de mensajes procesados en los últimos 30 días</p>
          </div>
        </div>
        {data.messagesByDay.length === 0 ? (
          <div className={`text-center py-16 text-sm ${mutedClass}`}>
            <i className="ti ti-chart-off text-3xl block mb-2 opacity-40" />
            Sin datos todavía — activá el chatbot para empezar a registrar mensajes
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.messagesByDay.map(d => ({ ...d, fecha: fmtDate(d.date) }))} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="gMsgs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#2dd8a0" stopOpacity={isLight ? 0.2 : 0.3} />
                    <stop offset="95%" stopColor="#2dd8a0" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={grid} />
                <XAxis dataKey="fecha" stroke={axisColor} fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis stroke={axisColor} fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<TooltipContent />} />
                <Area type="monotone" name="Mensajes" dataKey="count" stroke="#2dd8a0" strokeWidth={2.5} fillOpacity={1} fill="url(#gMsgs)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Lead funnel */}
        <div className={`${cardClass} p-6`} style={cardBg ? { background: cardBg, borderColor: cardBorder } : {}}>
          <h3 style={{ color: textColor }} className="font-extrabold text-sm flex items-center gap-2 mb-5">
            <i className="ti ti-filter text-purple-400" /> Embudo de leads
          </h3>
          <div className="space-y-3">
            {data.funnelStages.map((stage, i) => {
              const pct = maxFunnel > 0 ? Math.round((stage.value / maxFunnel) * 100) : 0;
              const colors = ["#031E43", "#3B506D", "#2dd8a0", "#f59e0b"];
              return (
                <div key={stage.label}>
                  <div className="flex justify-between mb-1">
                    <span className={`text-xs font-semibold ${labelClass}`}>{stage.label}</span>
                    <span className={`text-xs font-black ${valueClass}`}>{stage.value}</span>
                  </div>
                  <div className={`h-2 rounded-full overflow-hidden ${isLight ? "bg-[#DDDFE2]/40" : "bg-silver/10"}`}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: colors[i % colors.length] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lead status breakdown */}
        <div className={`${cardClass} p-6`} style={cardBg ? { background: cardBg, borderColor: cardBorder } : {}}>
          <h3 style={{ color: textColor }} className="font-extrabold text-sm flex items-center gap-2 mb-5">
            <i className="ti ti-users text-cl-blue" /> Estado de leads
          </h3>
          {data.leadsByStatus.length === 0 ? (
            <div className={`text-center py-8 text-sm ${mutedClass}`}>Sin datos de leads aún</div>
          ) : (
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.leadsByStatus.map(l => ({ name: STATUS_LABELS[l.status ?? ""] ?? (l.status ?? "Sin estado"), value: l.count, status: l.status ?? "new" }))} layout="vertical" margin={{ top: 0, right: 5, left: 5, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={grid} horizontal={false} />
                  <XAxis type="number" stroke={axisColor} fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" stroke={axisColor} fontSize={10} tickLine={false} axisLine={false} width={75} />
                  <Tooltip content={<TooltipContent />} />
                  <Bar dataKey="value" name="Leads" radius={[0, 6, 6, 0]} maxBarSize={24}>
                    {data.leadsByStatus.map((entry, index) => (
                      <Cell key={index} fill={STATUS_COLORS[entry.status ?? "new"] ?? "#031E43"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Funnel conversion analysis */}
      {data.funnelStages.length >= 2 && (
        <div className={`${cardClass} p-6`} style={cardBg ? { background: cardBg, borderColor: cardBorder } : {}}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 style={{ color: textColor }} className="font-extrabold text-sm flex items-center gap-2">
                <i className="ti ti-chart-funnel text-cl-accent" /> Análisis de Conversión — Embudo de Ventas
              </h3>
              <p className={`text-xs mt-0.5 ${labelClass}`}>Tasa de avance entre etapas del pipeline</p>
            </div>
            <div className={`text-right px-3 py-1.5 rounded-xl ${isLight ? "bg-[#FDFDFB] border border-[#DDDFE2]" : "bg-deep-space/20 border border-silver/10"}`}>
              <p className={`text-[10px] font-bold uppercase tracking-wider ${labelClass}`}>Conversión global</p>
              <p className="text-xl font-black text-cl-accent">
                {data.funnelStages[0].value > 0
                  ? `${Math.round((data.funnelStages[data.funnelStages.length - 1].value / data.funnelStages[0].value) * 100)}%`
                  : "—"}
              </p>
            </div>
          </div>

          <div className="flex items-end gap-1 mb-6" style={{ height: 120 }}>
            {data.funnelStages.map((stage, i) => {
              const maxVal = data.funnelStages[0].value || 1;
              const heightPct = maxVal > 0 ? (stage.value / maxVal) * 100 : 0;
              const colors = ["#031E43", "#3B506D", "#2dd8a0", "#f59e0b", "#ef4444"];
              return (
                <div key={stage.label} className="flex-1 flex flex-col items-center gap-1">
                  <span className={`text-xs font-black tabular-nums`} style={{ color: colors[i % colors.length] }}>
                    {stage.value}
                  </span>
                  <div className="w-full rounded-t-md transition-all duration-700" style={{
                    height: `${heightPct}%`,
                    minHeight: stage.value > 0 ? 6 : 0,
                    background: `${colors[i % colors.length]}${isLight ? "cc" : "99"}`,
                    borderTop: `2px solid ${colors[i % colors.length]}`,
                  }} />
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {data.funnelStages.map((stage, i) => {
              const prev = i > 0 ? data.funnelStages[i - 1].value : null;
              const stepRate = prev != null && prev > 0 ? Math.round((stage.value / prev) * 100) : null;
              const globalRate = data.funnelStages[0].value > 0
                ? Math.round((stage.value / data.funnelStages[0].value) * 100)
                : 100;
              const colors = ["#031E43", "#3B506D", "#2dd8a0", "#f59e0b", "#ef4444"];
              return (
                <div key={stage.label} className={`rounded-xl p-3 border ${isLight ? "bg-[#FDFDFB] border-[#DDDFE2]" : "bg-deep-space/15 border-silver/10"}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
                    <span className={`text-[10px] font-bold truncate ${labelClass}`}>{stage.label}</span>
                  </div>
                  <p style={{ color: textColor }} className="text-lg font-black tabular-nums">{stage.value}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] font-semibold ${mutedClass}`}>Global: <strong className="text-cl-accent">{globalRate}%</strong></span>
                    {stepRate !== null && (
                      <span className={`text-[10px] font-semibold ${stepRate >= 50 ? "text-cl-accent" : stepRate >= 25 ? "text-yellow-400" : "text-red-400"}`}>
                        ↓ {stepRate}%
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Outcome donut + Channel */}
      <div className="grid grid-cols-3 gap-6">
        {/* Outcome donut chart */}
        <div className={`${cardClass} p-6 col-span-2`} style={cardBg ? { background: cardBg, borderColor: cardBorder } : {}}>
          <h3 style={{ color: textColor }} className="font-extrabold text-sm flex items-center gap-2 mb-5">
            <i className="ti ti-chart-donut text-yellow-400" /> Resultado de conversaciones
          </h3>
          <DonutChart
            aiActive={data.outcomeBreakdown.aiActive}
            resolved={data.outcomeBreakdown.resolved}
            escalated={data.outcomeBreakdown.escalated}
            total={totalConvs}
            isDark={!isLight}
          />
        </div>

        {/* Channel breakdown */}
        <div className={`${cardClass} p-6`} style={cardBg ? { background: cardBg, borderColor: cardBorder } : {}}>
          <h3 style={{ color: textColor }} className="font-extrabold text-sm flex items-center gap-2 mb-5">
            <i className="ti ti-antenna text-cl-accent" /> Canales
          </h3>
          {data.channelBreakdown.length === 0 ? (
            <div className={`text-center py-6 text-sm ${mutedClass}`}>Sin datos</div>
          ) : (
            <div className="space-y-3">
              {data.channelBreakdown.map((ch) => {
                const total = data.channelBreakdown.reduce((s, c) => s + c.count, 0);
                const pct = total > 0 ? Math.round((ch.count / total) * 100) : 0;
                const icons: Record<string, string> = { whatsapp: "📱", web: "🌐", api: "⚡" };
                const icon = icons[ch.channel ?? ""] ?? "💬";
                return (
                  <div key={ch.channel}>
                    <div className="flex justify-between mb-1">
                      <span className={`text-xs font-semibold ${labelClass}`}>{icon} {CHANNEL_LABELS[ch.channel ?? ""] ?? (ch.channel ?? "Otro")}</span>
                      <span className={`text-xs font-black ${valueClass}`}>{ch.count} <span className={mutedClass}>({pct}%)</span></span>
                    </div>
                    <div className={`h-2 rounded-full overflow-hidden ${isLight ? "bg-[#DDDFE2]/40" : "bg-silver/10"}`}>
                      <div className="h-full rounded-full bg-cl-accent transition-all duration-700" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* CSAT Panel */}
      <div className={`${cardClass} p-6`} style={cardBg ? { background: cardBg, borderColor: cardBorder } : {}}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 style={{ color: textColor }} className="font-extrabold text-sm flex items-center gap-2">
              <i className="ti ti-star text-yellow-400" /> CSAT — Satisfacción del cliente
            </h3>
            <p className={`text-xs mt-0.5 ${labelClass}`}>Registrá evaluaciones de tus conversaciones para medir la calidad del servicio</p>
          </div>
          {avgCsat && (
            <div className="text-right">
              <p className="text-3xl font-black text-yellow-400">{avgCsat}</p>
              <p className={`text-[10px] font-bold uppercase tracking-wider ${mutedClass}`}>Promedio / 5</p>
            </div>
          )}
        </div>

        <div className={`rounded-xl p-4 mb-5 ${isLight ? "bg-[#FDFDFB] border border-[#DDDFE2]" : "bg-deep-space/15 border border-silver/15"}`}>
          <p className={`text-xs font-bold mb-3 ${labelClass}`}>Nueva evaluación</p>
          <div className="flex items-center gap-1 mb-3">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                onClick={() => setCsatScore(n)}
                onMouseEnter={() => setCsatHover(n)}
                onMouseLeave={() => setCsatHover(0)}
                className="text-2xl transition-transform hover:scale-110 focus:outline-none"
              >
                <span className={(csatHover || csatScore) >= n ? "text-yellow-400" : isLight ? "text-[#DDDFE2]" : "text-cool-steel/40"}>★</span>
              </button>
            ))}
            {csatScore > 0 && (
              <span className={`ml-2 text-xs font-semibold ${["", "text-red-400", "text-orange-400", "text-yellow-400", "text-lime-400", "text-cl-accent"][csatScore]}`}>
                {["", "Muy malo", "Malo", "Regular", "Bueno", "Excelente"][csatScore]}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <input
              value={csatComment}
              onChange={e => setCsatComment(e.target.value)}
              placeholder="Comentario opcional..."
              className={`flex-1 text-xs rounded-lg px-3 py-2 outline-none ${isLight ? "bg-white border border-[#DDDFE2] text-[#031E43] placeholder-[#3B506D]/50" : "bg-navy border border-silver/20 text-white placeholder-white/30"}`}
            />
            <button
              onClick={submitCsat}
              disabled={!csatScore}
              className="px-4 py-2 bg-cl-accent text-navy text-xs font-bold rounded-lg hover:bg-cl-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Guardar
            </button>
          </div>
        </div>

        {csatEntries.length === 0 ? (
          <p className={`text-center text-sm ${mutedClass} py-4`}>
            <i className="ti ti-star-off block text-2xl mb-2 opacity-30" />
            Todavía no hay evaluaciones. Registrá la primera arriba.
          </p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {csatEntries.map((e, i) => (
              <div key={i} className={`flex items-start gap-3 py-2.5 px-3 rounded-xl ${isLight ? "bg-[#FDFDFB]" : "bg-deep-space/15"}`}>
                <div className="flex gap-0.5 flex-shrink-0 mt-0.5">
                  {[1,2,3,4,5].map(n => (
                    <span key={n} className={`text-sm ${n <= e.score ? "text-yellow-400" : isLight ? "text-[#DDDFE2]" : "text-white/10"}`}>★</span>
                  ))}
                </div>
                <div className="flex-1 min-w-0">
                  {e.comment && <p className={`text-xs truncate ${valueClass}`}>{e.comment}</p>}
                  <p className={`text-[10px] ${mutedClass}`}>{fmtTs(e.ts)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
