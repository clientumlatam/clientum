import { useState } from "react";

const MOCKUPS = [
  {
    id: "whatsapp-ai-hub",
    label: "WhatsApp AI Hub",
    desc: "Panel de control y analíticas de WhatsApp",
    icon: "ti-brand-whatsapp",
    file: "whatsapp-ai-hub.html",
    color: "#06B6D4",
  },
  {
    id: "whatsapp-dashboard",
    label: "Dashboard WA v1",
    desc: "Vista de conversaciones, inbox y métricas de agente",
    icon: "ti-layout-dashboard",
    file: "whatsapp-dashboard.html",
    color: "#3B506D",
  },
  {
    id: "whatsapp-dashboard-v2",
    label: "Dashboard WA v2",
    desc: "Admin dashboard con sidebar, métricas y flow analytics",
    icon: "ti-chart-area-line",
    file: "whatsapp-dashboard-v2.html",
    color: "#a78bfa",
  },
  {
    id: "dashboard-completo",
    label: "Dashboard Completo",
    desc: "Mockup completo del dashboard Clientum con sidebar",
    icon: "ti-columns",
    file: "clientum-dashboard-completo.html",
    color: "#facc15",
  },
  {
    id: "dashboard-features",
    label: "Funcionalidades",
    desc: "Nuevas features: flows, agendas, pedidos, broadcast",
    icon: "ti-sparkles",
    file: "clientum-dashboard-features.html",
    color: "#fb923c",
  },
  {
    id: "flow-builder",
    label: "Flow Builder",
    desc: "Constructor de flujos, simulador de chat y configuración",
    icon: "ti-git-branch",
    file: "flow-builder-chat-sim.html",
    color: "#06B6D4",
  },
  {
    id: "analytics-pricing",
    label: "Analytics & Precios",
    desc: "Analíticas avanzadas, tabla de precios y onboarding",
    icon: "ti-chart-pie",
    file: "analytics-pricing-onboarding.html",
    color: "#3B506D",
  },
  {
    id: "planes-partners",
    label: "Planes & Partners",
    desc: "Planes de suscripción y programa de partners",
    icon: "ti-gift",
    file: "clientum-planes-partners.html",
    color: "#f472b6",
  },
];

export default function MockupsPage() {
  const [active, setActive] = useState(MOCKUPS[0]);
  const [fullscreen, setFullscreen] = useState(false);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Tab bar */}
      <div className="flex-shrink-0 border-b border-[#DDDFE2]/20 bg-[#031E43]">
        <div className="flex items-end gap-0 overflow-x-auto px-4 pt-3 scrollbar-none">
          {MOCKUPS.map((m) => {
            const isActive = active.id === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setActive(m)}
                title={m.desc}
                className={`
                  group relative flex items-center gap-2 px-4 py-2.5 text-xs font-semibold
                  whitespace-nowrap transition-all rounded-t-lg border border-b-0 mr-1
                  ${isActive
                    ? "bg-[#FDFDFB] text-[#031E43] border-[#DDDFE2]/30 z-10"
                    : "bg-transparent text-white/50 border-transparent hover:text-white/80 hover:bg-white/5"
                  }
                `}
              >
                <i
                  className={`ti ${m.icon} text-sm`}
                  style={{ color: isActive ? m.color : undefined }}
                />
                {m.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-px bg-[#FDFDFB]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-[#FDFDFB] border-b border-[#DDDFE2]">
        <div className="flex items-center gap-2">
          <i
            className={`ti ${active.icon} text-sm`}
            style={{ color: active.color }}
          />
          <span className="text-xs text-[#3B506D]">{active.desc}</span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/mockups/${active.file}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#3B506D] hover:text-[#031E43] bg-[#DDDFE2]/40 hover:bg-[#DDDFE2]/70 rounded-lg transition-all no-underline"
          >
            <i className="ti ti-external-link text-sm" /> Abrir en pestaña
          </a>
          <button
            onClick={() => setFullscreen(!fullscreen)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#3B506D] hover:text-[#031E43] bg-[#DDDFE2]/40 hover:bg-[#DDDFE2]/70 rounded-lg transition-all"
          >
            <i className={`ti ${fullscreen ? "ti-minimize" : "ti-maximize"} text-sm`} />
            {fullscreen ? "Reducir" : "Pantalla completa"}
          </button>
        </div>
      </div>

      {/* Iframe area */}
      {fullscreen ? (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 bg-[#031E43] border-b border-white/10 flex-shrink-0">
            <div className="flex items-center gap-2">
              <i className={`ti ${active.icon} text-sm text-white/70`} />
              <span className="text-sm font-semibold text-white">{active.label}</span>
            </div>
            <button
              onClick={() => setFullscreen(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white/60 hover:text-white bg-white/10 rounded-lg transition-all"
            >
              <i className="ti ti-x text-sm" /> Cerrar
            </button>
          </div>
          <iframe
            key={`fs-${active.id}`}
            src={`/mockups/${active.file}`}
            className="flex-1 w-full border-0"
            title={active.label}
          />
        </div>
      ) : (
        <div className="flex-1 min-h-0 bg-white overflow-hidden">
          <iframe
            key={active.id}
            src={`/mockups/${active.file}`}
            className="w-full h-full border-0"
            title={active.label}
          />
        </div>
      )}
    </div>
  );
}
