import { useState, useEffect, useRef } from "react";

type ServiceStatus = "live" | "provisioning" | "pending" | "soon";

type Service = {
  id: string;
  icon: string;
  name: string;
  description: string;
  status: ServiceStatus;
  url?: string;
  eta?: string;
  variant: "accent" | "blue" | "purple" | "orange" | "pink";
};

type ProvisionStage = {
  id: string;
  label: string;
  detail: string;
  logs: string[];
  durationMs: number;
};

const PROVISION_STAGES: ProvisionStage[] = [
  {
    id: "queued",
    label: "Solicitud recibida",
    detail: "Tu pedido fue encolado en el motor de provisioning.",
    durationMs: 1800,
    logs: [
      "[queue] Job enqueued: frappe-provision-gaman",
      "[queue] Priority: normal | Worker: provisioner-1",
      "[queue] Status → queued",
    ],
  },
  {
    id: "docker",
    label: "Creando contenedor Docker",
    detail: "Generando docker-compose y levantando la instancia Frappe.",
    durationMs: 3500,
    logs: [
      "[docker] Pulling frappe/frappe-docker:v15...",
      "[docker] Creating volume: frappe-sites",
      "[docker] Creating volume: frappe-assets",
      "[docker] Network: frappe_default created",
      "[docker] Container mariadb-1 ... started",
      "[docker] Container redis-cache-1 ... started",
      "[docker] Container frappe-1 ... started",
      "[docker] Container nginx-1 ... started",
    ],
  },
  {
    id: "bench",
    label: "Creando site ERPNext",
    detail: "bench new-site con base de datos y admin inicial.",
    durationMs: 4000,
    logs: [
      "[bench] bench new-site gaman.clientum.com.ar",
      "[bench] Installing erpnext...",
      "[bench] Running patches...",
      "[bench] Setting up default fixtures...",
      "[bench] Site gaman.clientum.com.ar created ✓",
    ],
  },
  {
    id: "apps",
    label: "Instalando apps adicionales",
    detail: "argentina_compliance (AFIP) y Frappe CRM.",
    durationMs: 3200,
    logs: [
      "[bench] bench get-app argentina_compliance --branch v15",
      "[bench] Installing argentina_compliance...",
      "[bench] Creating Tax Templates IVA 21% / 10.5% / 0%",
      "[bench] bench get-app crm --branch main",
      "[bench] Installing frappe-crm...",
      "[bench] Apps installed: 3/3 ✓",
    ],
  },
  {
    id: "dns",
    label: "Configurando subdominio",
    detail: "Cloudflare Tunnel → gaman.clientum.com.ar",
    durationMs: 2000,
    logs: [
      "[cloudflare] Creating CNAME: gaman.clientum.com.ar",
      "[cloudflare] Tunnel route registered",
      "[cloudflare] SSL certificate: active ✓",
      "[cloudflare] DNS propagation: ~30s",
    ],
  },
  {
    id: "ready",
    label: "Instancia lista",
    detail: "Tu ERPNext está operativo. Credenciales enviadas por email.",
    durationMs: 0,
    logs: [
      "[system] Health check: HTTP 200 ✓",
      "[system] Admin user created",
      "[system] Email con credenciales enviado ✓",
      "[system] Status → ready",
    ],
  },
];

const SERVICES: Service[] = [
  {
    id: "whatsapp",
    icon: "ti-brand-whatsapp",
    name: "WhatsApp Bot",
    description: "Agente IA 24/7 con RAG, guardrails y traza en tiempo real.",
    status: "live",
    url: "/app/chat",
    variant: "accent",
  },
  {
    id: "frappe",
    icon: "ti-building-store",
    name: "Kit Frappe (ERPNext)",
    description: "Instancia ERPNext dedicada con CRM, stock, compras y RRHH.",
    status: "pending",
    variant: "blue",
  },
  {
    id: "afip",
    icon: "ti-file-invoice",
    name: "Facturación AFIP",
    description: "CAE automático, QR de verificación y templates de IVA. Requiere Kit Frappe.",
    status: "pending",
    variant: "purple",
  },
  {
    id: "crm",
    icon: "ti-users-group",
    name: "CRM / Pipeline de Ventas",
    description: "Frappe CRM standalone — pipeline, deals, contactos y seguimiento.",
    status: "pending",
    variant: "orange",
  },
  {
    id: "assist",
    icon: "ti-brand-instagram",
    name: "Assist+ (FB / Instagram Bot)",
    description: "Agente IA para Facebook Messenger e Instagram DM.",
    status: "soon",
    eta: "~60% desarrollado",
    variant: "pink",
  },
];

const statusConfig: Record<ServiceStatus, { label: string; classes: string; dot?: string }> = {
  live: {
    label: "Activo",
    classes: "bg-cl-accent/10 text-cl-accent border border-cl-accent/20",
    dot: "bg-cl-accent animate-pulse",
  },
  provisioning: {
    label: "Aprovisionando…",
    classes: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
    dot: "bg-yellow-400 animate-pulse",
  },
  pending: {
    label: "No activado",
    classes: "bg-silver/10 text-cool-steel border border-silver/20",
  },
  soon: {
    label: "Próximamente",
    classes: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
  },
};

const variantIcon: Record<Service["variant"], string> = {
  accent: "bg-cl-accent/10 text-cl-accent",
  blue:   "bg-cl-blue/10 text-cl-blue",
  purple: "bg-purple-500/10 text-purple-400",
  orange: "bg-orange-400/10 text-orange-400",
  pink:   "bg-pink-500/10 text-pink-400",
};

const variantBtn: Record<Service["variant"], string> = {
  accent: "bg-cl-accent text-navy hover:bg-cl-accent-hover",
  blue:   "bg-cl-blue text-white hover:bg-cl-blue/80",
  purple: "bg-purple-500 text-white hover:bg-purple-400",
  orange: "bg-orange-400 text-white hover:bg-orange-300",
  pink:   "bg-pink-500 text-white hover:bg-pink-400",
};

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>(SERVICES);
  const [provisioning, setProvisioning] = useState<string | null>(null);

  function handleActivate(id: string) {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "provisioning" as ServiceStatus } : s))
    );
    setProvisioning(id);
  }

  function handleProvisionDone(id: string) {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "live" as ServiceStatus, url: `https://${id}.clientum.com.ar` } : s))
    );
    setProvisioning(null);
  }

  const live = services.filter((s) => s.status === "live");
  const provisioningService = services.find((s) => s.status === "provisioning");
  const inactive = services.filter((s) => s.status !== "live" && s.status !== "provisioning");

  return (
    <section className="p-8 space-y-8">
      <div className="flex items-start justify-between">
        <p className="text-cool-steel text-sm mt-1">
          Activá y gestioná cada servicio del stack Clientum para tu empresa.
        </p>
        <div className="bg-navy-card border border-silver/15 rounded-xl px-4 py-3 text-center">
          <div className="text-2xl font-black text-cl-accent">{live.length}</div>
          <div className="text-[10px] text-cool-steel uppercase tracking-wider font-bold">Activos</div>
        </div>
      </div>

      {live.length > 0 && (
        <div>
          <h2 className="text-[10px] font-bold text-cool-steel/55 uppercase tracking-widest mb-3">Servicios en uso</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {live.map((s) => (
              <ServiceCard key={s.id} service={s} onActivate={handleActivate} />
            ))}
          </div>
        </div>
      )}

      {provisioningService && (
        <ProvisioningTracker
          service={provisioningService}
          onDone={() => handleProvisionDone(provisioningService.id)}
        />
      )}

      {inactive.length > 0 && (
        <div>
          <h2 className="text-[10px] font-bold text-cool-steel/55 uppercase tracking-widest mb-3">Disponibles para activar</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {inactive.map((s) => (
              <ServiceCard key={s.id} service={s} onActivate={handleActivate} />
            ))}
          </div>
        </div>
      )}

      <div className="bg-navy-card border border-silver/15 rounded-2xl p-6 flex items-center gap-6">
        <div className="w-12 h-12 bg-cl-blue/10 text-cl-blue rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
          <i className="ti ti-server-2" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-white text-sm">¿Necesitás un servicio custom?</h3>
          <p className="text-xs text-cool-steel mt-0.5">
            Integraciones con MercadoPago, WooCommerce, Shopify, HRMS y más están disponibles bajo solicitud.
          </p>
        </div>
        <a
          href="mailto:hola@clientum.com.ar"
          className="flex-shrink-0 px-4 py-2 bg-silver/10 hover:bg-silver/15 border border-silver/20 text-xs font-bold text-white rounded-xl transition-all no-underline"
        >
          Contactar
        </a>
      </div>
    </section>
  );
}

function ProvisioningTracker({ service, onDone }: { service: Service; onDone: () => void }) {
  const [stageIndex, setStageIndex] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  const totalStages = PROVISION_STAGES.length;

  useEffect(() => {
    if (done) return;
    if (stageIndex >= totalStages) {
      setDone(true);
      setTimeout(onDone, 2000);
      return;
    }

    const stage = PROVISION_STAGES[stageIndex];
    let logIdx = 0;

    const logInterval = setInterval(() => {
      logIdx++;
      if (logIdx <= stage.logs.length) {
        setLogs((l) => [...l, stage.logs[logIdx - 1]]);
      }
    }, Math.max(200, stage.durationMs / (stage.logs.length + 1)));

    const stageTimer = setTimeout(() => {
      clearInterval(logInterval);
      setStageIndex((i) => i + 1);
    }, stage.durationMs);

    return () => {
      clearInterval(logInterval);
      clearTimeout(stageTimer);
    };
  }, [stageIndex, done, totalStages, onDone]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  const pct = Math.round((stageIndex / (totalStages - 1)) * 100);
  const currentStage = PROVISION_STAGES[stageIndex];

  return (
    <div className="bg-navy-card border border-yellow-500/20 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-silver/15 bg-yellow-500/5">
        <div className="w-9 h-9 bg-yellow-500/10 text-yellow-400 rounded-xl flex items-center justify-center text-lg flex-shrink-0">
          <i className={`ti ${service.icon}`} />
        </div>
        <div className="flex-1">
          <h3 className="font-black text-white text-sm">Aprovisionando {service.name}</h3>
          <p className="text-[11px] text-cool-steel">
            {done ? "Instancia lista — redirigiendo…" : currentStage?.label}
          </p>
        </div>
        <span className="text-xl font-black text-yellow-400">{done ? "100" : pct}%</span>
      </div>

      <div className="px-6 py-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="text-[10px] font-bold text-cool-steel/55 uppercase tracking-widest mb-4">Etapas</div>
          {PROVISION_STAGES.map((stage, i) => {
            const isCompleted = i < stageIndex || done;
            const isActive = i === stageIndex && !done;
            const isPending = i > stageIndex && !done;
            return (
              <div key={stage.id} className="flex items-start gap-3">
                <div className="flex flex-col items-center gap-0 mt-0.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black flex-shrink-0 transition-all duration-500 ${
                    isCompleted ? "bg-cl-accent text-navy" : isActive ? "bg-yellow-500/20 text-yellow-400 ring-2 ring-yellow-400/40" : "bg-silver/10 text-cool-steel/40"
                  }`}>
                    {isCompleted ? <i className="ti ti-check text-[11px]" /> : i + 1}
                  </div>
                  {i < PROVISION_STAGES.length - 1 && (
                    <div className={`w-px flex-1 mt-1 transition-all duration-700 ${isCompleted ? "bg-cl-accent/40 h-6" : "bg-silver/15 h-6"}`} />
                  )}
                </div>
                <div className="pb-3">
                  <p className={`text-xs font-bold transition-colors ${isCompleted ? "text-cl-accent" : isActive ? "text-yellow-400" : "text-cool-steel/55"}`}>
                    {stage.label}
                    {isActive && (
                      <span className="ml-2 inline-flex gap-0.5">
                        {[0, 150, 300].map((d) => (
                          <span key={d} className="w-1 h-1 rounded-full bg-yellow-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                        ))}
                      </span>
                    )}
                  </p>
                  <p className={`text-[11px] mt-0.5 ${isPending ? "text-cool-steel/40" : "text-cool-steel"}`}>{stage.detail}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col">
          <div className="text-[10px] font-bold text-cool-steel/55 uppercase tracking-widest mb-3">Log en tiempo real</div>
          <div
            ref={logRef}
            className="flex-1 min-h-[220px] max-h-[280px] bg-navy-3 border border-silver/15 rounded-xl p-4 overflow-y-auto font-mono text-[11px] leading-relaxed space-y-0.5 scroll-smooth"
          >
            {logs.length === 0 && <span className="text-cool-steel/40">Esperando primer evento…</span>}
            {logs.map((line, i) => {
              const color = line.startsWith("[docker]") ? "text-cl-blue" : line.startsWith("[bench]") ? "text-purple-400" : line.startsWith("[cloudflare]") ? "text-orange-400" : line.startsWith("[system]") ? "text-cl-accent" : line.startsWith("[queue]") ? "text-yellow-400" : "text-cool-steel";
              return (
                <div key={i} className={`${color} ${i === logs.length - 1 ? "opacity-100" : "opacity-70"}`}>
                  <span className="text-cool-steel/40 select-none mr-2">›</span>{line}
                </div>
              );
            })}
            {!done && logs.length > 0 && <span className="inline-block w-2 h-3 bg-cl-accent/80 animate-pulse ml-1" />}
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-[10px] text-cool-steel/55 mb-1">
              <span>Progreso total</span><span>{done ? "100" : pct}%</span>
            </div>
            <div className="w-full bg-navy-3 h-1.5 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-yellow-500 to-cl-accent rounded-full transition-all duration-700" style={{ width: `${done ? 100 : pct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {done && (
        <div className="mx-6 mb-5 p-4 bg-cl-accent/10 border border-cl-accent/20 rounded-xl flex items-center gap-3">
          <i className="ti ti-circle-check text-cl-accent text-2xl" />
          <div>
            <p className="text-sm font-black text-white">Instancia lista</p>
            <p className="text-xs text-cool-steel">Credenciales enviadas por email · Accedé en <span className="text-cl-accent font-semibold">gaman.clientum.com.ar</span></p>
          </div>
        </div>
      )}
    </div>
  );
}

function ServiceCard({ service, onActivate }: { service: Service; onActivate: (id: string) => void }) {
  const status = statusConfig[service.status];
  const isLive = service.status === "live";
  const isSoon = service.status === "soon";

  return (
    <div className="bg-navy-card border border-silver/15 rounded-2xl p-5 flex flex-col gap-4 hover:border-silver/20 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${variantIcon[service.variant]}`}>
          <i className={`ti ${service.icon}`} />
        </div>
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${status.classes}`}>
          {status.dot && <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />}
          {status.label}
        </span>
      </div>
      <div className="flex-1">
        <h3 className="font-black text-white text-sm">{service.name}</h3>
        <p className="text-[12px] text-cool-steel mt-1 leading-relaxed">{service.description}</p>
        {service.eta && <p className="text-[11px] text-purple-400/70 mt-1.5 font-semibold">{service.eta}</p>}
      </div>
      <div>
        {isLive && service.url && (
          <a href={service.url} className={`w-full h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all no-underline ${variantBtn[service.variant]}`}>
            <i className="ti ti-external-link" /> Abrir consola
          </a>
        )}
        {service.status === "pending" && (
          <button onClick={() => onActivate(service.id)} className={`w-full h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${variantBtn[service.variant]}`}>
            <i className="ti ti-bolt" /> Solicitar activación
          </button>
        )}
        {isSoon && (
          <div className="w-full h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-2 bg-silver/10 text-cool-steel/55 border border-silver/20 cursor-not-allowed">
            <i className="ti ti-lock" /> En desarrollo
          </div>
        )}
      </div>
    </div>
  );
}
