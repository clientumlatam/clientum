import { type ReactNode, useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { useTheme } from "@/hooks/useTheme";
import { useQuery } from "@tanstack/react-query";
import { ClientumLogo } from "@/components/ui/logo";
import { color as C } from "@/brand";

/* ─── brand tokens ─── */
const B = {
  bg:         C.offWhite,      // #FDFDFB — fondo general
  sidebar:    C.pureWhite,     // #FFFFFF — sidebar
  card:       C.pureWhite,     // #FFFFFF — cards / header
  border:     C.alabaster,     // #DDDFE2 — bordes
  primary:    C.prussianBlue,  // #031E43 — énfasis máximo
  secondary:  C.duskBlue,      // #3B506D — texto secundario
  text:       C.prussianBlue,  // #031E43 — texto principal
  textMuted:  C.duskBlue,      // #3B506D — texto muted
  active: {
    bg:     "rgba(3,30,67,.07)",   // off-prussian light
    text:   C.prussianBlue,
    border: C.prussianBlue,
  },
  hover: {
    bg: "rgba(3,30,67,.04)",
  },
  // dark (mantener coherencia con brand.color.dark)
  dark: {
    bg:      C.dark.background,   // #020f21
    sidebar: C.dark.layer1,       // #021630
    card:    C.dark.layer2,       // #031E43
    border:  "rgba(253,253,251,.09)",
    text:    C.dark.text,         // #FDFDFB
    muted:   C.dark.muted,        // #3B506D
    active: {
      bg:     "rgba(253,253,251,.08)",
      text:   C.offWhite,
      border: C.offWhite,
    },
    hover: {
      bg: "rgba(253,253,251,.05)",
    },
  },
} as const;

/* ─── badge types ─── */
type BadgeVariant = "red" | "orange" | "yellow" | "blue" | "gold";
type BadgeMap = Record<string, { count: number; variant: BadgeVariant }>;

async function apiFetchShell(url: string) {
  const r = await fetch(url, { credentials: "include" });
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}

interface ShellConv { id: string; handoffMode: boolean | null; leadStatus?: string | null; }
interface ShellStatus { active: boolean; configured: boolean; }

function useSidebarBadges(): BadgeMap {
  const { data: convsData } = useQuery<{ conversations: ShellConv[] }>({
    queryKey: ["sidebar-conversations"],
    queryFn: () => apiFetchShell("/api/chatbot/conversations"),
    retry: false,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const { data: status } = useQuery<ShellStatus>({
    queryKey: ["sidebar-chatbot-status"],
    queryFn: () => apiFetchShell("/api/chatbot/status"),
    retry: false,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const convs = convsData?.conversations ?? [];
  const handoffs = convs.filter(c => c.handoffMode).length;
  const botWarning = status && !status.active ? 1 : 0;

  const badges: BadgeMap = {};
  if (handoffs > 0) badges["/app/chat"] = { count: handoffs, variant: "orange" };
  if (botWarning > 0) badges["/app/agent"] = { count: 1, variant: "yellow" };
  badges["/app/support"]      = { count: 1, variant: "red" };
  badges["/app/orders"]       = { count: 3, variant: "orange" };
  badges["/app/appointments"] = { count: 4, variant: "blue" };
  return badges;
}

/* ─────────────────────────────────────────────────────────────────────────
   GRUPOS DE NAVEGACIÓN
   ──────────────────────────────────────────────────────────────────────── */

const agentNav = [
  { to: "/app/connect-whatsapp",  label: "Conectar WhatsApp",    icon: "ti-brand-whatsapp" },
  { to: "/app/agent",             label: "Configurar Agente IA", icon: "ti-robot" },
  { to: "/app/flows",             label: "Flows",                icon: "ti-git-branch" },
  { to: "/app/chat",              label: "Chat & Trazas RAG",    icon: "ti-messages" },
  { to: "/app/analytics",         label: "Analytics de Leads",   icon: "ti-chart-area-line" },
] as const;

const operationsNav = [
  { to: "/app/appointments", label: "Agenda de Turnos",    icon: "ti-calendar-event" },
  { to: "/app/orders",       label: "Pedidos",              icon: "ti-shopping-bag" },
  { to: "/app/broadcast",    label: "Difusión Masiva",      icon: "ti-speakerphone" },
  { to: "/app/catalog",      label: "Catálogo Digital",     icon: "ti-layout-grid" },
] as const;

const businessNav = [
  { to: "/app/crm",        label: "CRM & Prospector",    icon: "ti-chart-bar" },
  { to: "/app/projects",   label: "Proyectos",            icon: "ti-layout-kanban" },
  { to: "/app/support",    label: "Soporte",              icon: "ti-ticket" },
  { to: "/app/erp",        label: "ERP",                  icon: "ti-building-factory" },
  { to: "/app/accounting", label: "Contabilidad",         icon: "ti-calculator" },
  { to: "/app/team",       label: "Equipo & RRHH",        icon: "ti-users" },
] as const;

const builderNav = [
  { to: "/app/builder",    label: "Constructor de Apps",  icon: "ti-wand" },
] as const;

const configNav = [
  { to: "/app/integrations", label: "Integraciones",         icon: "ti-plug-connected" },
  { to: "/app/knowledge",    label: "Base de Conocimiento",  icon: "ti-file-text" },
  { to: "/app/docs",         label: "Documentación",         icon: "ti-topology-star-3" },
] as const;

const headerNav = [
  { to: "/app/cuenta", label: "Mi Plan", icon: "ti-credit-card" },
] as const;

const titles: Record<string, { title: string; subtitle: string }> = {
  "/app":                      { title: "Panel de Control y Analíticas",        subtitle: "Monitoreo unificado de la suite de automatización Clientum" },
  "/app/connect-whatsapp":     { title: "Conectar WhatsApp",                    subtitle: "Vinculá tu número en 5 minutos — QR, instancia y webhook configurados automáticamente" },
  "/app/agent":                { title: "Configurador de Agente IA",            subtitle: "Definí el perfil, catálogo y FAQs — simulá conversaciones en tiempo real" },
  "/app/analytics":            { title: "Analytics de Leads & Conversaciones",  subtitle: "Desempeño operativo, capturas de leads y métricas por rubro" },
  "/app/chat":                 { title: "Simulador de Chat & Traza RAG",        subtitle: "Probá el bot y observá el razonamiento en tiempo real" },
  "/app/flows":                { title: "Flows de Conversación",                subtitle: "Respuestas automáticas disparadas por palabras clave de tus clientes" },
  "/app/appointments":         { title: "Agenda de Turnos",                     subtitle: "Turnos gestionados por el bot vía WhatsApp" },
  "/app/orders":               { title: "Pedidos por WhatsApp",                 subtitle: "Pedidos creados y gestionados por el bot con actualizaciones automáticas" },
  "/app/broadcast":            { title: "Difusión Masiva",                      subtitle: "Enviá mensajes masivos a tus contactos de WhatsApp" },
  "/app/catalog":              { title: "Catálogo Digital",                     subtitle: "Configurá tu tienda online con productos, marca y contacto" },
  "/app/prospector":           { title: "Prospector de Leads",                  subtitle: "Buscá negocios en Google Maps y agregá prospectos directamente al CRM" },
  "/app/builder":              { title: "Constructor de Apps",                  subtitle: "Apps con IA, automatizaciones, formularios, tablas y páginas en un solo lugar" },
  "/app/automations":          { title: "Automatizaciones",                     subtitle: "Conectá módulos con triggers y acciones visuales — sin código" },
  "/app/forms":                { title: "Formularios",                          subtitle: "Creá formularios embebibles para tu sitio web y capturá leads" },
  "/app/tables":               { title: "Tablas",                               subtitle: "Bases de datos visuales para gestionar cualquier dato de tu negocio" },
  "/app/pages":                { title: "Páginas",                              subtitle: "Creá y publicá páginas web con el editor de bloques" },
  "/app/crm":                  { title: "CRM & Prospector",                     subtitle: "Pipeline, contactos, empresas, actividades y prospección de leads" },
  "/app/projects":             { title: "Gestión de Proyectos",                 subtitle: "Issues, sprints y tablero Kanban al estilo Huly/Linear" },
  "/app/erp":                  { title: "ERP",                                  subtitle: "Cotizaciones, facturas, órdenes de compra e inventario" },
  "/app/team":                 { title: "Equipo & RRHH",                        subtitle: "Miembros, roles, departamentos, actividad y gestión de Recursos Humanos" },
  "/app/accounting":           { title: "Contabilidad & Finanzas",              subtitle: "Libro diario, plan de cuentas, P&L, balance, AFIP y tesorería" },
  "/app/support":              { title: "Soporte al Cliente",                   subtitle: "Tickets, SLA, base de ayuda y métricas de atención" },
  "/app/rrhh":                 { title: "Recursos Humanos",                     subtitle: "Legajos, liquidaciones de sueldos, ausencias y organigrama" },
  "/app/finanzas":             { title: "Finanzas & Tesorería",                 subtitle: "Flujo de caja, cuentas bancarias, transferencias y conciliación" },
  "/app/integrations":         { title: "Integraciones & Servicios",            subtitle: "API Keys, configuración de servicios externos y módulos del stack Clientum" },
  "/app/services":             { title: "Mis Servicios",                        subtitle: "Activá y gestioná cada servicio del stack Clientum para tu empresa" },
  "/app/knowledge":            { title: "Base de Conocimiento (RAG)",           subtitle: "Documentos indexados y datos corporativos de prioridad" },
  "/app/cuenta":               { title: "Mi Plan & Facturación",                subtitle: "Administrá tu suscripción, cambiá de plan e historial de pagos" },
  "/app/roi":                  { title: "Mi Ahorro ROI",                        subtitle: "Calculá cuánto te ahorra Clientum cada mes según tu volumen de consultas" },
  "/app/admin":                { title: "Panel de Administración",              subtitle: "Gestión de usuarios, planes y herramientas del sistema — solo admins" },
  "/app/system":               { title: "Monitor del Sistema",                  subtitle: "Estado de servicios, diagnósticos, health checks, logs y alertas — Admin OS" },
  "/app/partners":             { title: "Programa de Partners",                 subtitle: "Referí, revendé o integrá Clientum — generá ingresos recurrentes en pesos" },
  "/app/estrategia":           { title: "Estrategia de Agentes Autónomos",      subtitle: "Ecosistema ERP, arquitectura de integración y hoja de ruta para PyMEs argentinas" },
  "/app/mockups":              { title: "Diseños de Referencia",                subtitle: "Mockups y prototipos del producto — referencia visual de funcionalidades" },
  "/app/docs":                 { title: "Documentación Técnica",                subtitle: "Base de conocimiento, guías de infraestructura y scripts de despliegue" },
  "/app/checklist":            { title: "Checklist de Publicación",             subtitle: "Guías de publicación, Cloudflare Tunnel, comandos de operación y checklist del proyecto" },
  "/app/research":             { title: "Investigación & Repos de Referencia",  subtitle: "Análisis de repos, matrices features/checklist y READMEs de referencia" },
  "/app/studio":               { title: "Studio",                               subtitle: "Creación de contenido multimedia para tu marca" },
};

function isAdmin(email: string | null | undefined, role?: string | null) {
  if (role === "admin") return true;
  if (!email) return false;
  if (email === "demo@clientum.com.ar") return false;
  return email.endsWith("@clientum.com.ar");
}

const COLLAPSE_KEY = "cl-nav-collapsed";
function loadCollapsed(): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(COLLAPSE_KEY) ?? "{}"); }
  catch { return {}; }
}
function saveCollapsed(state: Record<string, boolean>) {
  try { localStorage.setItem(COLLAPSE_KEY, JSON.stringify(state)); } catch { /* noop */ }
}

/* ─────────────── COMPONENTE PRINCIPAL ─────────────── */
export function AppShell({ children }: { children: ReactNode }) {
  const [pathname] = useLocation();
  const meta = titles[pathname] ?? titles["/app"];
  const { user } = useAuth();
  const userIsAdmin = isAdmin(user?.email, user?.role);
  const { theme, toggleTheme } = useTheme();
  const dark = theme === "dark";
  const badges = useSidebarBadges();
  const [sessionExpired, setSessionExpired] = useState(false);
  const hadUserRef = useRef(false);
  useEffect(() => {
    if (user) hadUserRef.current = true;
  }, [user]);

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    const saved = loadCollapsed();
    return { negocio: saved.negocio ?? true, constructor: saved.constructor ?? true, ...saved };
  });

  function toggleCollapse(key: string) {
    setCollapsed(prev => {
      const next = { ...prev, [key]: !prev[key] };
      saveCollapsed(next);
      return next;
    });
  }

  useEffect(() => {
    const handler = () => {
      if (hadUserRef.current) setSessionExpired(true);
    };
    window.addEventListener("session-expired", handler);
    return () => window.removeEventListener("session-expired", handler);
  }, []);

  function handleSignOut() { window.location.href = "/api/logout"; }

  const displayName = user?.firstName
    ? `${user.firstName}${user.lastName ? " " + user.lastName : ""}`
    : user?.email ?? "Usuario";

  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  /* ── tokens actuales según tema ── */
  const tk = {
    pageBg:       dark ? B.dark.bg      : B.bg,
    sidebarBg:    dark ? B.dark.sidebar : B.sidebar,
    sidebarBorder:dark ? B.dark.border  : B.border,
    headerBg:     dark ? B.dark.card    : B.card,
    headerBorder: dark ? B.dark.border  : B.border,
    text:         dark ? B.dark.text    : B.text,
    muted:        dark ? B.dark.muted   : B.textMuted,
    border:       dark ? B.dark.border  : B.border,
    activeBg:     dark ? B.dark.active.bg   : B.active.bg,
    activeText:   dark ? B.dark.active.text : B.active.text,
    activeBorder: dark ? B.dark.active.border : B.active.border,
    hoverBg:      dark ? B.dark.hover.bg : B.hover.bg,
  };

  return (
    <div className="grid grid-cols-[240px_1fr] w-screen h-screen overflow-hidden"
      style={{ background: tk.pageBg }}>

      {/* ═══════════════ SIDEBAR ═══════════════ */}
      <aside
        className="flex flex-col h-full select-none z-10 overflow-y-auto"
        style={{ background: tk.sidebarBg, borderRight: `1px solid ${tk.sidebarBorder}` }}
      >
        {/* Logo */}
        <Link
          href="/"
          className="px-4 py-3.5 flex items-center gap-2.5 no-underline flex-shrink-0"
          style={{ borderBottom: `1px solid ${tk.sidebarBorder}` }}
        >
          <ClientumLogo variant="icon" size={28} color={dark ? C.offWhite : C.prussianBlue} />
          <span className="text-sm font-extrabold tracking-tight" style={{ color: tk.text }}>Clientum</span>
        </Link>

        {/* Scroll area */}
        <div className="flex-1 overflow-y-auto py-3">

          {/* Panel General */}
          <div className="px-2 mb-1">
            <Link
              href="/app"
              className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px] font-semibold rounded-lg transition-all no-underline"
              style={pathname === "/app" ? {
                background: tk.activeBg,
                color: tk.activeText,
                borderLeft: `2px solid ${tk.activeBorder}`,
                paddingLeft: "10px",
              } : { color: tk.muted }}
              onMouseOver={e => { if (pathname !== "/app") (e.currentTarget as HTMLElement).style.background = tk.hoverBg; }}
              onMouseOut={e => { if (pathname !== "/app") (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <i className="ti ti-layout-dashboard text-[15px] flex-shrink-0" />
              <span>Panel General</span>
            </Link>
          </div>

          {/* ── WhatsApp & Agente IA ── */}
          <NavGroup
            label="WhatsApp & Agente IA"
            groupKey="agente"
            items={agentNav}
            currentPath={pathname}
            badges={badges}
            collapsed={collapsed["agente"] ?? false}
            onToggle={() => toggleCollapse("agente")}
            tk={tk}
          />

          {/* ── Operaciones ── */}
          <NavGroup
            label="Operaciones"
            groupKey="operaciones"
            items={operationsNav}
            currentPath={pathname}
            badges={badges}
            collapsed={collapsed["operaciones"] ?? false}
            onToggle={() => toggleCollapse("operaciones")}
            tk={tk}
          />

          {/* ── Negocio ── */}
          <NavGroup
            label="Negocio"
            groupKey="negocio"
            items={businessNav}
            currentPath={pathname}
            badges={badges}
            collapsed={collapsed["negocio"] ?? true}
            onToggle={() => toggleCollapse("negocio")}
            tk={tk}
          />

          {/* ── Constructor ── */}
          <NavGroup
            label="Constructor"
            groupKey="constructor"
            items={builderNav}
            currentPath={pathname}
            badges={badges}
            collapsed={collapsed["constructor"] ?? true}
            onToggle={() => toggleCollapse("constructor")}
            tk={tk}
          />

          {/* ── Configuración ── */}
          <NavGroup
            label="Configuración"
            groupKey="config"
            items={configNav}
            currentPath={pathname}
            badges={badges}
            collapsed={collapsed["config"] ?? false}
            onToggle={() => toggleCollapse("config")}
            tk={tk}
          />

          {/* Admin */}
          {userIsAdmin && (
            <div className="px-2 mt-1">
              <Link
                href="/app/admin"
                className={`flex items-center gap-2.5 w-full px-3 py-2 text-[13px] font-semibold rounded-lg transition-all no-underline ${
                  pathname.startsWith("/app/admin")
                    ? "bg-violet-50 text-violet-700"
                    : "text-violet-400 hover:text-violet-600 hover:bg-violet-50"
                }`}
              >
                <i className="ti ti-shield-lock text-[15px]" /> Panel Admin
              </Link>
            </div>
          )}
        </div>

      </aside>

      {/* ═══════════════ MAIN ═══════════════ */}
      <main className="flex flex-col h-screen overflow-hidden">

        {/* ── HEADER ── */}
        <header
          className="px-6 flex items-center gap-4 flex-shrink-0"
          style={{
            background: tk.headerBg,
            borderBottom: `1px solid ${tk.headerBorder}`,
            minHeight: "52px",
          }}
        >
          {/* Título */}
          <div className="min-w-0 mr-2 flex-1">
            <h1 className="text-[13px] font-bold leading-tight truncate" style={{ color: tk.text }}>
              {meta.title}
            </h1>
            <p className="text-[11px] leading-tight truncate" style={{ color: tk.muted }}>
              {meta.subtitle}
            </p>
          </div>

          {/* Search */}
          <div className="relative hidden md:block">
            <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: tk.muted }} />
            <input
              type="text"
              placeholder="Buscar..."
              className="pl-8 pr-4 py-1.5 rounded-full text-xs border focus:outline-none focus:ring-2 w-44 transition-shadow"
              style={{
                borderColor: tk.border,
                backgroundColor: tk.pageBg,
                color: tk.text,
              }}
              onFocus={e => (e.currentTarget.style.boxShadow = `0 0 0 2px rgba(3,30,67,.18)`)}
              onBlur={e => (e.currentTarget.style.boxShadow = "")}
            />
          </div>

          {/* Toggle theme */}
          <button
            onClick={toggleTheme}
            title={dark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-all flex-shrink-0"
            style={{ color: tk.muted }}
            onMouseOver={e => ((e.currentTarget as HTMLElement).style.background = tk.hoverBg)}
            onMouseOut={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
          >
            {dark
              ? <i className="ti ti-sun text-[15px]" />
              : <i className="ti ti-moon text-[15px]" />
            }
          </button>

          {/* Notificaciones */}
          <div className="relative flex-shrink-0" ref={notifRef}>
            <button
              onClick={() => setNotifOpen(v => !v)}
              className="relative w-8 h-8 flex items-center justify-center rounded-lg transition-all"
              style={{ color: tk.muted }}
              onMouseOver={e => ((e.currentTarget as HTMLElement).style.background = tk.hoverBg)}
              onMouseOut={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
              title="Notificaciones"
            >
              <i className="ti ti-bell text-[15px]" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: C.prussianBlue }} />
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 rounded-xl shadow-lg border z-50 overflow-hidden"
                style={{ background: tk.headerBg, borderColor: tk.border }}>
                <div className="px-4 py-2.5 border-b" style={{ borderColor: tk.border }}>
                  <p className="text-[11px] font-bold" style={{ color: tk.text }}>Notificaciones</p>
                </div>
                {[
                  { icon: "ti-robot",          color: C.prussianBlue, bg: "rgba(3,30,67,.07)",  msg: "Agente IA respondió 142 mensajes hoy", time: "Hace 5 min" },
                  { icon: "ti-alert-triangle",  color: "#D97706",      bg: "#FEF3C7",            msg: "TKT-0234 por vencer en 30 min",         time: "Hace 8 min" },
                  { icon: "ti-trending-up",     color: "#059669",      bg: "#ECFDF5",            msg: "Deal cerrado: Grupo Textil SA — $55K",  time: "Hace 22 min" },
                ].map((n, i) => (
                  <div key={i} className="flex items-start gap-3 px-4 py-3 cursor-pointer border-b last:border-0 transition-colors"
                    style={{ borderColor: tk.border }}
                    onMouseOver={e => ((e.currentTarget as HTMLElement).style.background = tk.hoverBg)}
                    onMouseOut={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: n.bg }}>
                      <i className={`ti ${n.icon} text-sm`} style={{ color: n.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium leading-tight" style={{ color: tk.text }}>{n.msg}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: tk.muted }}>{n.time}</p>
                    </div>
                  </div>
                ))}
                <div className="px-4 py-2.5 text-center">
                  <button className="text-[11px] font-semibold" style={{ color: C.prussianBlue }}>Ver todas las notificaciones</button>
                </div>
              </div>
            )}
          </div>

          {/* Nav secundaria + usuario */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {headerNav.map((it) => {
              const isActive = pathname.startsWith(it.to);
              return (
                <Link
                  key={it.to}
                  href={it.to}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all no-underline"
                  style={isActive
                    ? { background: tk.activeBg, color: tk.activeText }
                    : { color: tk.muted }
                  }
                  onMouseOver={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = tk.hoverBg; }}
                  onMouseOut={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <i className={`ti ${it.icon} text-sm`} />
                  {it.label}
                </Link>
              );
            })}

            {userIsAdmin && (
              <Link
                href="/app/admin"
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all no-underline ${
                  pathname.startsWith("/app/admin")
                    ? "bg-violet-50 text-violet-700"
                    : "text-violet-400 hover:text-violet-600 hover:bg-violet-50"
                }`}
              >
                <i className="ti ti-shield-lock text-sm" />
                Admin
              </Link>
            )}

            <div className="w-px h-5 mx-2" style={{ background: tk.border }} />

            {user && (
              <div className="flex items-center gap-2">
                {user.profileImageUrl ? (
                  <img src={user.profileImageUrl} alt={displayName}
                    className="w-7 h-7 rounded-full object-cover"
                    style={{ border: `1px solid ${tk.border}` }} />
                ) : (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${C.prussianBlue}, ${C.duskBlue})`, color: C.offWhite }}>
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="hidden lg:block min-w-0">
                  <p className="text-[11px] font-semibold truncate max-w-[120px]" style={{ color: tk.text }}>{displayName}</p>
                  {user.email && (
                    <p className="text-[10px] truncate max-w-[120px]" style={{ color: tk.muted }}>{user.email}</p>
                  )}
                </div>
              </div>
            )}

            <button
              onClick={handleSignOut}
              title="Cerrar sesión"
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
              style={{ color: tk.muted }}
              onMouseOver={e => ((e.currentTarget as HTMLElement).style.background = tk.hoverBg)}
              onMouseOut={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
            >
              <i className="ti ti-logout text-[15px]" />
            </button>
          </div>
        </header>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto relative" style={{ background: tk.pageBg }}>
          {children}
        </div>

        {/* Sesión expirada */}
        {sessionExpired && (
          <div className="flex-shrink-0 flex items-center gap-4 px-6 py-3 border-t animate-in slide-in-from-bottom-2 duration-300"
            style={{ background: C.prussianBlue, borderColor: C.duskBlue }}>
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <i className="ti ti-lock text-lg flex-shrink-0" style={{ color: C.offWhite }} />
              <div className="min-w-0">
                <p className="text-sm font-bold leading-tight" style={{ color: C.offWhite }}>Sesión expirada</p>
                <p className="text-xs leading-tight" style={{ color: "rgba(253,253,251,.7)" }}>Tu sesión cerró automáticamente. Iniciá sesión de nuevo para continuar.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <a
                href="/api/login"
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg no-underline transition-colors"
                style={{ background: C.offWhite, color: C.prussianBlue }}
              >
                <i className="ti ti-login text-sm" />
                Iniciar sesión
              </a>
              <button
                onClick={() => setSessionExpired(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
                style={{ color: "rgba(253,253,251,.6)" }}
                onMouseOver={e => ((e.currentTarget as HTMLElement).style.color = C.offWhite)}
                onMouseOut={e => ((e.currentTarget as HTMLElement).style.color = "rgba(253,253,251,.6)")}
              >
                <i className="ti ti-x text-sm" />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

/* ─────────────── badge palette ─────────────── */
const BADGE_COLORS: Record<BadgeVariant, { bg: string; text: string }> = {
  red:    { bg: "#EF4444", text: "#fff" },
  orange: { bg: "#F97316", text: "#fff" },
  yellow: { bg: "#EAB308", text: "#fff" },
  blue:   { bg: C.duskBlue, text: "#fff" },
  gold:   { bg: "#D97706", text: "#fff" },
};

/* ─────────────── NavGroup ─────────────── */
type NavItem = { to: string; label: string; icon: string };
type Tk = {
  text: string; muted: string; border: string;
  activeBg: string; activeText: string; activeBorder: string;
  hoverBg: string;
};

function NavGroup({
  label,
  items,
  currentPath,
  badges = {},
  collapsed,
  onToggle,
  tk,
}: {
  label: string;
  groupKey: string;
  items: readonly NavItem[];
  currentPath: string;
  badges?: BadgeMap;
  collapsed: boolean;
  onToggle: () => void;
  tk: Tk;
}) {
  const hasActive = items.some(it =>
    it.to === "/app" ? currentPath === "/app" : currentPath.startsWith(it.to)
  );

  return (
    <div className="px-2 mb-1">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-1.5 rounded-md transition-all"
        style={{ color: hasActive ? tk.muted : `${tk.muted}99` }}
        onMouseOver={e => ((e.currentTarget as HTMLElement).style.background = tk.hoverBg)}
        onMouseOut={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
        title={collapsed ? `Expandir ${label}` : `Colapsar ${label}`}
      >
        <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
        <i className={`ti ti-chevron-right text-[11px] transition-transform duration-200 ${collapsed ? "" : "rotate-90"}`}
          style={{ color: `${tk.muted}88` }} />
      </button>

      {!collapsed && (
        <nav className="space-y-0.5 mt-0.5">
          {items.map((it) => {
            const isActive = it.to === "/app"
              ? currentPath === "/app"
              : currentPath.startsWith(it.to);
            const badge = badges[it.to];
            return (
              <Link
                key={it.to}
                href={it.to}
                className="flex items-center gap-2.5 w-full px-3 py-1.5 text-[13px] font-medium rounded-lg transition-all no-underline"
                style={isActive ? {
                  background: tk.activeBg,
                  color: tk.activeText,
                  fontWeight: "600",
                  borderLeft: `2px solid ${tk.activeBorder}`,
                  paddingLeft: "10px",
                } : { color: tk.muted }}
                onMouseOver={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = tk.hoverBg; }}
                onMouseOut={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <i className={`ti ${it.icon} text-[14px] flex-shrink-0`} />
                <span className="truncate flex-1">{it.label}</span>
                {badge && (
                  <span
                    className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: BADGE_COLORS[badge.variant].bg, color: BADGE_COLORS[badge.variant].text }}
                  >
                    {badge.count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
